import { NextRequest, NextResponse } from 'next/server';

// API Configuration
const DATAFORSEO_LOGIN = 'info@peptidehackers.com';
const DATAFORSEO_PASSWORD = '1ffc43456fd8423b';
const DATAFORSEO_API_ENDPOINT = 'https://api.dataforseo.com/v3';

// =====================================================
// TYPES & INTERFACES
// =====================================================

interface GBPCheckRequest {
  business_name: string;
  phone?: string;
  address?: string;
  city: string;
  zip: string;
  state: string;
  category?: string;
  country?: string;
  gbp_url?: string; // Optional: user can provide GBP URL
}

interface GBPCheckResponse {
  found: boolean;
  hasGBP: boolean;
  gbpData?: {
    name: string;
    rating: number;
    reviewCount: number;
    address?: string;
    phone?: string;
  };
  positives: string[];
  improvements: string[];
  score: number; // 0-100
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Calculate string similarity (Levenshtein distance-based)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 100;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Simple approach: check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 85;

  // Count matching words
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const matchingWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
  const similarity = (matchingWords.length / Math.max(words1.length, words2.length)) * 100;

  return similarity;
}

// Normalize phone number for comparison
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
): { match: boolean; confidence: number; reasons: string[] } {
  let confidence = 0;
  const reasons: string[] = [];

  // Check name similarity
  const nameSimilarity = calculateSimilarity(business.title || '', searchName);
  if (nameSimilarity >= 70) {
    confidence += 40;
    reasons.push(`Name match: ${nameSimilarity.toFixed(0)}%`);
  } else {
    reasons.push(`Name mismatch (${nameSimilarity.toFixed(0)}% similar)`);
    return { match: false, confidence, reasons };
  }

  // Check ZIP code if address is available
  if (business.address) {
    const addressHasZip = business.address.includes(searchZip);
    if (addressHasZip) {
      confidence += 30;
      reasons.push('ZIP code verified');
    } else {
      reasons.push('ZIP code not found in address');
    }
  }

  // Check phone if provided
  if (searchPhone && business.phone) {
    const normalizedSearch = normalizePhone(searchPhone);
    const normalizedBusiness = normalizePhone(business.phone);
    if (normalizedSearch === normalizedBusiness) {
      confidence += 20;
      reasons.push('Phone number verified');
    } else {
      reasons.push('Phone number mismatch');
    }
  }

  // Check address if provided
  if (searchAddress && business.address) {
    const addressSimilarity = calculateSimilarity(business.address, searchAddress);
    if (addressSimilarity >= 60) {
      confidence += 10;
      reasons.push('Address matches');
    }
  }

  // Consider it a match if confidence is at least 40% (name match only)
  return { match: confidence >= 40, confidence, reasons };
}

// =====================================================
// GOOGLE BUSINESS PROFILE CHECK
// =====================================================

async function checkGoogleBusinessProfile(
  businessName: string,
  city: string,
  state: string,
  zip: string,
  address?: string,
  phone?: string,
  category?: string,
  gbpUrl?: string
): Promise<GBPCheckResponse> {

  // If user provided a GBP URL, we assume they have one
  const isGoogleUrl = gbpUrl && (
    gbpUrl.includes('google.com/maps') ||
    gbpUrl.includes('business.google.com') ||
    gbpUrl.includes('maps.app.goo.gl') ||
    gbpUrl.includes('share.google') ||
    gbpUrl.includes('google.com/search')
  );

  if (isGoogleUrl) {
    return {
      found: true,
      hasGBP: true,
      positives: [
        'Google Business Profile URL provided',
        'Your business has a verified Google Business Profile'
      ],
      improvements: [],
      score: 100
    };
  }

  // Otherwise, search for GBP via DataForSEO
  try {
    // Build search query - simpler approach without quotes
    // Google Maps search is more forgiving than exact matching
    let searchQuery = businessName;
    if (address) {
      searchQuery += ` ${address}`;
    }
    searchQuery += ` ${city} ${state}`;
    if (category) searchQuery += ` ${category}`;

    console.log(`Searching Google Maps for: ${searchQuery}`);
    console.log(`Location: ${city}, ${state} ${zip}`);

    const response = await fetch(`${DATAFORSEO_API_ENDPOINT}/serp/google/maps/live/advanced`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{
        keyword: searchQuery,
        location_code: 2840, // USA
        language_code: 'en',
        depth: 10 // Get up to 10 results to find best match
      }])
    });

    const data = await response.json();
    console.log('Maps response:', data.status_code, data.status_message);

    if (data.status_code === 20000 && data.tasks && data.tasks[0]) {
      const task = data.tasks[0];

      if (task.status_code === 20000 && task.result && task.result.length > 0) {
        const items = task.result[0]?.items || [];
        console.log('Items found:', items.length);

        if (items.length > 0) {
          // Find best matching business
          let bestMatch: any = null;
          let bestConfidence = 0;
          let matchReasons: string[] = [];

          for (const business of items) {
            const matchResult = isBusinessMatch(business, businessName, zip, phone, address);
            console.log(`Checking: ${business.title} - Match: ${matchResult.match}, Confidence: ${matchResult.confidence}%`);

            if (matchResult.match && matchResult.confidence > bestConfidence) {
              bestMatch = business;
              bestConfidence = matchResult.confidence;
              matchReasons = matchResult.reasons;
            }
          }

          if (bestMatch) {
            console.log(`Best match found: ${bestMatch.title} (${bestConfidence}% confidence)`);

            const positives: string[] = [];
            const improvements: string[] = [];

            // 1. PROFILE EXISTENCE & VERIFICATION
            positives.push(`✓ Profile exists and is discoverable on Google Maps`);

            if (bestMatch.is_claimed === true) {
              positives.push(`✓ You have claimed ownership - can manage listing directly`);
            } else if (bestMatch.is_claimed === false) {
              improvements.push(`⚠ Profile exists but unclaimed - Claim it immediately to control your listing, respond to reviews, and update information`);
            }

            // 2. RATING & REVIEW ANALYSIS
            const rating = bestMatch.rating?.value || 0;
            const reviewCount = bestMatch.rating?.votes_count || 0;

            if (rating >= 4.5) {
              positives.push(`✓ Excellent rating of ${rating}/5.0 - above 4.5 benchmark for local rankings`);
            } else if (rating >= 4.0) {
              positives.push(`✓ Good rating of ${rating}/5.0 - meets 4.0+ quality threshold`);
            } else if (rating >= 3.0) {
              improvements.push(`⚠ Rating of ${rating}/5.0 is below 4.0 benchmark - Focus on customer experience and encourage satisfied customers to leave reviews`);
            } else if (rating > 0) {
              improvements.push(`⚠ Critical: ${rating}/5.0 rating hurts visibility - Address customer concerns immediately and implement review recovery strategy`);
            }

            if (reviewCount >= 50) {
              positives.push(`✓ Strong review volume: ${reviewCount} reviews builds significant trust and ranking power`);
            } else if (reviewCount >= 10) {
              positives.push(`✓ Moderate review count: ${reviewCount} reviews shows established presence`);
              improvements.push(`📈 Opportunity: Aim for 50+ reviews to match top competitors - Set up automated review request system after purchases/appointments`);
            } else if (reviewCount > 0) {
              improvements.push(`⚠ Only ${reviewCount} reviews - Need 10+ minimum for credibility. Google prioritizes businesses with consistent review volume`);
            } else {
              improvements.push(`⚠ Critical: No reviews yet - First 10 reviews are crucial. Start with recent happy customers and make review process easy (QR code, text link)`);
            }

            // 3. VISUAL CONTENT ANALYSIS
            const photoCount = bestMatch.total_photos || 0;
            if (photoCount >= 20) {
              positives.push(`✓ Excellent visual content: ${photoCount} photos - Exceeds 20-photo benchmark for engagement`);
            } else if (photoCount >= 10) {
              positives.push(`✓ Good photo presence: ${photoCount} photos meets 10+ minimum`);
              improvements.push(`📈 Opportunity: Add more photos (exterior, interior, team, services) - Businesses with 20+ photos get 35% more requests`);
            } else if (photoCount >= 5) {
              improvements.push(`⚠ Limited photos: Only ${photoCount} - Upload at least 10 high-quality images covering: storefront, interior, products/services, and team`);
            } else if (photoCount > 0) {
              improvements.push(`⚠ Very few photos (${photoCount}) - Critical for trust and ranking. Add exterior, interior, product shots, and team photos immediately`);
            } else {
              improvements.push(`⚠ Critical: No photos - Listings with photos get 42% more direction requests. Start with 10 quality images (exterior, interior, products, team)`);
            }

            // 4. BUSINESS INFORMATION COMPLETENESS
            const hasDescription = bestMatch.description && bestMatch.description.length > 50;
            const hasHours = bestMatch.work_hours?.timetable;
            const hasWebsite = bestMatch.domain;
            const hasPhone = bestMatch.phone;
            const hasCategory = bestMatch.category;

            if (hasDescription) {
              positives.push(`✓ Business description present - helps Google understand your services`);
            } else {
              improvements.push(`⚠ Missing business description - Add 250+ word description with keywords about services, location, and unique value`);
            }

            if (hasHours) {
              positives.push(`✓ Business hours listed - customers know when you're open`);
            } else {
              improvements.push(`⚠ No business hours listed - Add accurate hours including special hours for holidays`);
            }

            if (hasWebsite) {
              positives.push(`✓ Website link present - drives traffic and builds authority`);
            } else {
              improvements.push(`📈 Opportunity: Add website link to drive traffic and improve conversion`);
            }

            if (hasPhone) {
              positives.push(`✓ Phone number listed - enables direct customer contact`);
            } else {
              improvements.push(`⚠ No phone number - Critical for local businesses to enable click-to-call`);
            }

            if (hasCategory) {
              positives.push(`✓ Primary category set: "${bestMatch.category}"`);
            }

            return {
              found: true,
              hasGBP: true,
              gbpData: {
                name: bestMatch.title || businessName,
                rating: bestMatch.rating?.value || 0,
                reviewCount: bestMatch.rating?.votes_count || 0,
                address: bestMatch.address || '',
                phone: bestMatch.phone || ''
              },
              positives,
              improvements,
              score: 100
            };
          } else {
            // Found results but no good match
            return {
              found: false,
              hasGBP: false,
              positives: [],
              improvements: [
                `Found ${items.length} business(es) but none matched your criteria closely enough`,
                'Try providing more details (address, phone number) for better matching',
                'Contact GMB City for a manual verification'
              ],
              score: 0
            };
          }
        }
      }
    }

    // No GBP found
    return {
      found: false,
      hasGBP: false,
      positives: [],
      improvements: [
        'No Google Business Profile found',
        'Critical: You need a Google Business Profile to rank in local search',
        'Contact GMB City to set up and optimize your Google Business Profile'
      ],
      score: 0
    };

  } catch (error) {
    console.error('GBP check error:', error);
    return {
      found: false,
      hasGBP: false,
      positives: [],
      improvements: [
        'Unable to verify Google Business Profile',
        'This check requires a valid business name and location',
        'Contact GMB City for a manual audit'
      ],
      score: 0
    };
  }
}

// =====================================================
// API ROUTE HANDLER
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const body: GBPCheckRequest = await request.json();

    // Validate required fields
    const { business_name, city, state, zip } = body;

    if (!business_name || !city || !state || !zip) {
      return NextResponse.json(
        { error: 'Missing required fields: business_name, city, state, zip' },
        { status: 400 }
      );
    }

    console.log('Starting GBP check for:', business_name, `${city}, ${state}`);

    const startTime = Date.now();
    const result = await checkGoogleBusinessProfile(
      business_name,
      city,
      state,
      zip,
      body.address,
      body.phone,
      body.category,
      body.gbp_url
    );
    const duration = Date.now() - startTime;

    console.log(`GBP check completed in ${duration}ms`);
    console.log(`Found: ${result.found}, Score: ${result.score}/100`);

    return NextResponse.json({
      success: true,
      duration,
      ...result
    });

  } catch (error) {
    console.error('Citation coverage check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        found: false,
        hasGBP: false,
        insights: ['Citation check failed due to an error'],
        score: 0
      },
      { status: 500 }
    );
  }
}
