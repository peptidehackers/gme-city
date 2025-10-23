import { NextRequest, NextResponse } from 'next/server';

// API Configuration
const DATAFORSEO_LOGIN = 'info@peptidehackers.com';
const DATAFORSEO_PASSWORD = '1ffc43456fd8423b';
const DATAFORSEO_API_ENDPOINT = 'https://api.dataforseo.com/v3';

// =====================================================
// TYPES & INTERFACES
// =====================================================

interface GBPAuditRequest {
  business_name: string;
  city: string;
  state: string;
  zip: string;
  address?: string;
  phone?: string;
}

interface GBPAuditResponse {
  success: boolean;
  found: boolean;
  auditData?: {
    businessName: string;
    city: string;
    primaryCategory: string;
    reviewCount: number;
    rating: number;
    photosLast30d: number;
    hasQA: boolean;
    postsPerMonth: number;
    hasWebsite: boolean;
    hasHours: boolean;
    hasServices: boolean;
    hasBookingLink: boolean;
    hasDuplicateListing: boolean;
    napConsistent: boolean;
  };
  error?: string;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Calculate string similarity
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 100;
  if (s1.length === 0 || s2.length === 0) return 0;
  if (s1.includes(s2) || s2.includes(s1)) return 85;

  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const matchingWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
  const similarity = (matchingWords.length / Math.max(words1.length, words2.length)) * 100;

  return similarity;
}

// Normalize phone number
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Check if business matches search criteria
function isBusinessMatch(
  business: any,
  searchName: string,
  searchZip: string,
  searchPhone?: string,
  searchAddress?: string
): { match: boolean; confidence: number } {
  let confidence = 0;

  // Check name similarity
  const nameSimilarity = calculateSimilarity(business.title || '', searchName);
  if (nameSimilarity >= 70) {
    confidence += 40;
  } else {
    return { match: false, confidence };
  }

  // Check ZIP code
  if (business.address && business.address.includes(searchZip)) {
    confidence += 30;
  }

  // Check phone
  if (searchPhone && business.phone) {
    const normalizedSearch = normalizePhone(searchPhone);
    const normalizedBusiness = normalizePhone(business.phone);
    if (normalizedSearch === normalizedBusiness) {
      confidence += 20;
    }
  }

  // Check address
  if (searchAddress && business.address) {
    const addressSimilarity = calculateSimilarity(business.address, searchAddress);
    if (addressSimilarity >= 60) {
      confidence += 10;
    }
  }

  return { match: confidence >= 40, confidence };
}

// =====================================================
// GOOGLE BUSINESS PROFILE AUDIT
// =====================================================

async function performGBPAudit(
  businessName: string,
  city: string,
  state: string,
  zip: string,
  address?: string,
  phone?: string
): Promise<GBPAuditResponse> {
  try {
    // Step 1: Search Google Maps for the business
    let searchQuery = businessName;
    if (address) searchQuery += ` ${address}`;
    searchQuery += ` ${city} ${state}`;

    console.log(`[GBP Audit] Searching for: ${searchQuery}`);

    const mapsResponse = await fetch(`${DATAFORSEO_API_ENDPOINT}/serp/google/maps/live/advanced`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{
        keyword: searchQuery,
        location_code: 2840, // USA
        language_code: 'en',
        depth: 10
      }])
    });

    const mapsData = await mapsResponse.json();

    if (mapsData.status_code !== 20000 || !mapsData.tasks?.[0]) {
      return {
        success: false,
        found: false,
        error: 'Failed to search Google Maps'
      };
    }

    const task = mapsData.tasks[0];
    if (task.status_code !== 20000 || !task.result?.[0]?.items?.length) {
      return {
        success: false,
        found: false,
        error: 'No business found matching your criteria'
      };
    }

    // Find best matching business
    const items = task.result[0].items;
    let bestMatch: any = null;
    let bestConfidence = 0;

    for (const business of items) {
      const matchResult = isBusinessMatch(business, businessName, zip, phone, address);
      if (matchResult.match && matchResult.confidence > bestConfidence) {
        bestMatch = business;
        bestConfidence = matchResult.confidence;
      }
    }

    if (!bestMatch) {
      return {
        success: false,
        found: false,
        error: `Found ${items.length} business(es) but none matched closely enough. Try providing address or phone number.`
      };
    }

    console.log(`[GBP Audit] Found match: ${bestMatch.title} (${bestConfidence}% confidence)`);

    // Step 2: Get additional data from Business Data API (Q&A and Posts)
    let hasQA = false;
    let postsPerMonth = 0;

    if (bestMatch.place_id) {
      try {
        // Get Q&A data
        const qaResponse = await fetch(`${DATAFORSEO_API_ENDPOINT}/business_data/google/questions_and_answers/live`, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64'),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([{
            place_id: bestMatch.place_id,
            language_code: 'en'
          }])
        });

        const qaData = await qaResponse.json();
        if (qaData.status_code === 20000 && qaData.tasks?.[0]?.result?.[0]?.items?.length > 0) {
          hasQA = true;
          console.log(`[GBP Audit] Found ${qaData.tasks[0].result[0].items.length} Q&A items`);
        }
      } catch (error) {
        console.log('[GBP Audit] Q&A check failed, continuing...', error);
      }

      try {
        // Get Posts/Updates data
        const updatesResponse = await fetch(`${DATAFORSEO_API_ENDPOINT}/business_data/google/business_updates/live`, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64'),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([{
            place_id: bestMatch.place_id,
            language_code: 'en'
          }])
        });

        const updatesData = await updatesResponse.json();
        if (updatesData.status_code === 20000 && updatesData.tasks?.[0]?.result?.[0]?.items?.length > 0) {
          const posts = updatesData.tasks[0].result[0].items;

          // Calculate posts per month from last 90 days
          const now = Date.now();
          const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);
          const recentPosts = posts.filter((post: any) => {
            if (post.timestamp) {
              const postDate = new Date(post.timestamp).getTime();
              return postDate >= ninetyDaysAgo;
            }
            return false;
          });

          postsPerMonth = Math.round((recentPosts.length / 3)); // 3 months = 90 days
          console.log(`[GBP Audit] Found ${recentPosts.length} posts in last 90 days (${postsPerMonth}/month)`);
        }
      } catch (error) {
        console.log('[GBP Audit] Updates check failed, continuing...', error);
      }
    }

    // Step 3: Build audit data from API response
    const auditData = {
      businessName: bestMatch.title || businessName,
      city: bestMatch.address_info?.city || city,
      primaryCategory: bestMatch.category || 'Unknown',
      reviewCount: bestMatch.rating?.votes_count || 0,
      rating: bestMatch.rating?.value || 0,
      photosLast30d: bestMatch.total_photos || 0, // Note: This is total photos, not last 30 days
      hasQA,
      postsPerMonth,
      hasWebsite: !!(bestMatch.domain || bestMatch.url),
      hasHours: !!(bestMatch.work_hours?.timetable),
      hasServices: false, // Default to false - assume needs improvement
      hasBookingLink: !!bestMatch.book_online_url,
      hasDuplicateListing: false, // Default to false - rare issue
      napConsistent: false // Default to false - should be verified across citations, not assumed
    };

    console.log('[GBP Audit] Audit data compiled:', auditData);

    return {
      success: true,
      found: true,
      auditData
    };

  } catch (error) {
    console.error('[GBP Audit] Error:', error);
    return {
      success: false,
      found: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// =====================================================
// API ROUTE HANDLER
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const body: GBPAuditRequest = await request.json();

    // Validate required fields
    const { business_name, city, state, zip } = body;

    if (!business_name || !city || !state || !zip) {
      return NextResponse.json(
        {
          success: false,
          found: false,
          error: 'Missing required fields: business_name, city, state, zip'
        },
        { status: 400 }
      );
    }

    console.log(`[GBP Audit] Starting audit for: ${business_name}, ${city}, ${state}`);

    const startTime = Date.now();
    const result = await performGBPAudit(
      business_name,
      city,
      state,
      zip,
      body.address,
      body.phone
    );
    const duration = Date.now() - startTime;

    console.log(`[GBP Audit] Completed in ${duration}ms - Found: ${result.found}`);

    return NextResponse.json({
      ...result,
      duration
    });

  } catch (error) {
    console.error('[GBP Audit] API error:', error);
    return NextResponse.json(
      {
        success: false,
        found: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
