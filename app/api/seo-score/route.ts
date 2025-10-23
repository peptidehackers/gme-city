import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// API Configuration
const GOOGLE_PSI_API_KEY = process.env.GOOGLE_PAGESPEED_API_KEY || 'AIzaSyA4yUwFSgL_cY7Sb_A1jo3VbXkppdORdno';
const DATAFORSEO_LOGIN = 'info@peptidehackers.com';
const DATAFORSEO_PASSWORD = '1ffc43456fd8423b';
const BRIGHTLOCAL_API_KEY = '138b39fdba6971a39e2c2ba2c88403804089e63b';

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type SEOSnapshotInput = {
  business_name: string;
  website: string;
  address: string;
  city: string;
  zip: string;
  phone?: string;
  category: string;
  gbp_url?: string;
  email?: string;
};

type ScoreResult = {
  local: {
    score: number;
    insights: string[];
  };
  onsite: {
    score: number;
    insights: string[];
  };
  combined: number;
};

// Helper: Call Google PageSpeed Insights
async function getPageSpeedData(url: string): Promise<any> {
  try {
    const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
    const response = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(cleanUrl)}&key=${GOOGLE_PSI_API_KEY}&strategy=desktop&category=performance&category=seo&category=accessibility&category=best-practices`
    );

    if (!response.ok) {
      console.error('PageSpeed API error:', response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('PageSpeed API failed:', error);
    return null;
  }
}

// Helper: Call DataForSEO for organic keywords
async function getOrganicKeywords(domain: string, category: string): Promise<any> {
  try {
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const auth = Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64');

    const response = await fetch(
      'https://api.dataforseo.com/v3/dataforseo_labs/google/organic_keywords/live',
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{
          target: cleanDomain,
          location_code: 2840, // USA
          language_code: "en",
          limit: 5
        }])
      }
    );

    if (!response.ok) {
      console.error('DataForSEO API error:', response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('DataForSEO API failed:', error);
    return null;
  }
}

// Helper: Scrape homepage HTML content
async function scrapeHomepage(url: string): Promise<any> {
  try {
    const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SEO-Analyzer/1.0)'
      }
    });

    if (!response.ok) {
      console.error('Homepage fetch error:', response.statusText);
      return null;
    }

    const html = await response.text();

    // Parse HTML content
    const wordCount = html.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
    const hasH1 = /<h1/i.test(html);
    const hasMetaDescription = /<meta\s+name=["']description["']/i.test(html);
    const hasTitle = /<title[^>]*>([^<]+)<\/title>/i.test(html);
    const hasSchema = /application\/ld\+json/i.test(html) && /"@type"\s*:\s*["']LocalBusiness["']/i.test(html);
    const imageCount = (html.match(/<img/gi) || []).length;
    const imagesWithAlt = (html.match(/<img[^>]+alt=/gi) || []).length;
    const internalLinks = (html.match(/<a\s+[^>]*href=["'][^"']*["']/gi) || []).length;

    return {
      wordCount,
      hasH1,
      hasMetaDescription,
      hasTitle,
      hasSchema,
      imageCount,
      imagesWithAlt,
      altTextPercentage: imageCount > 0 ? (imagesWithAlt / imageCount) * 100 : 0,
      internalLinks,
      rawHtml: html // Include raw HTML for city/category detection
    };
  } catch (error) {
    console.error('Homepage scraping failed:', error);
    return null;
  }
}

// Helper: Validate US phone format
function isValidUSPhone(phone?: string): boolean {
  if (!phone) return false;
  // Match formats: (123) 456-7890, 123-456-7890, 1234567890
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

// Helper: Check if homepage contains city name
function containsCityName(html: string, city: string): boolean {
  const cityRegex = new RegExp(city, 'i');
  return cityRegex.test(html);
}

// Helper: Check if homepage contains category keyword
function containsCategoryKeyword(html: string, category: string): boolean {
  // Check in title, meta description, and H1 tags
  const relevantContent = html.match(/<title[^>]*>([^<]+)<\/title>|<meta\s+name=["']description["'][^>]+content=["']([^"']+)["']|<h1[^>]*>([^<]+)<\/h1>/gi);
  if (!relevantContent) return false;

  const categoryRegex = new RegExp(category, 'i');
  return relevantContent.some(match => categoryRegex.test(match));
}

// Helper: Search for business using Google Maps Search (Live API - fast, instant results)
async function searchBusinessOnGoogleMaps(businessName: string, city: string, zip: string): Promise<any> {
  try {
    const auth = Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64');

    // Primary search query (most specific)
    let searchQuery = `${businessName} ${city}`;
    console.log('Searching Google Maps (live API):', searchQuery);

    let result = await tryGoogleMapsSearchLive(auth, searchQuery);
    if (result) {
      return result;
    }

    // Fallback: try with ZIP if city search failed
    searchQuery = `${businessName} ${zip}`;
    console.log('Trying ZIP fallback:', searchQuery);
    result = await tryGoogleMapsSearchLive(auth, searchQuery);
    if (result) {
      return result;
    }

    console.log('No results found with any search variation');
    return null;
  } catch (error) {
    console.error('Maps search failed:', error);
    return null;
  }
}

// Helper: Try a single Google Maps search with Live API (instant results)
async function tryGoogleMapsSearchLive(auth: string, searchQuery: string): Promise<any> {
  try {
    // Use live/advanced endpoint for instant results (no polling needed)
    const response = await fetch(
      'https://api.dataforseo.com/v3/serp/google/maps/live/advanced',
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{
          keyword: searchQuery,
          location_code: 2840, // USA
          language_code: "en",
          depth: 3 // Get top 3 results
        }])
      }
    );

    if (!response.ok) {
      console.error('Maps Live API error:', response.statusText);
      return null;
    }

    const data = await response.json();
    console.log('Maps response:', data.status_code, data.status_message);

    if (data.status_code !== 20000 || !data.tasks || !data.tasks[0]) {
      console.log('Maps API failed:', data.status_message);
      return null;
    }

    const task = data.tasks[0];
    if (task.status_code !== 20000 || !task.result || task.result.length === 0) {
      console.log('No results in task');
      return null;
    }

    const items = task.result[0]?.items || [];
    console.log('Items found:', items.length);

    if (items.length === 0) {
      return null;
    }

    // Get the first result (most relevant)
    const business = items[0];
    console.log('Found business:', business.title, 'Rating:', business.rating?.value, 'Reviews:', business.rating?.votes_count);

    return {
      rating: business.rating?.value || null,
      reviewCount: business.rating?.votes_count || 0,
      photos_count: business.photos_count || 0,
      cid: business.cid || null,
      place_id: business.place_id || null,
      title: business.title || null
    };
  } catch (error) {
    console.error('Maps Live API search failed:', error);
    return null;
  }
}

// Helper: Get GBP data from DataForSEO using Google Maps search
async function getGBPDataFromDataForSEO(gbpUrl: string | null, businessName: string, city: string, zip: string): Promise<any> {
  try {
    // Always search by business name to get accurate GBP metrics
    const mapsData = await searchBusinessOnGoogleMaps(businessName, city, zip);

    if (!mapsData) {
      console.log('Could not find business on Google Maps');
      return null;
    }

    console.log('GBP data found:', {
      rating: mapsData.rating,
      reviewCount: mapsData.reviewCount,
      title: mapsData.title
    });

    return {
      rating: mapsData.rating,
      reviewCount: mapsData.reviewCount,
      hasRecentActivity: mapsData.reviewCount > 0, // Assume active if has reviews
      found: true
    };
  } catch (error) {
    console.error('getGBPDataFromDataForSEO failed:', error);
    return null;
  }
}

// Helper: Calculate Local SEO Score (0-100) - Local ranking signals only
function calculateLocalScore(data: {
  gbpData?: any;
  hasNAP: boolean;
  phoneValid: boolean;
  hasCityName: boolean;
  hasCategoryKeyword: boolean;
}): { score: number; insights: string[] } {
  let score = 0;
  const insights: string[] = [];

  // ========================================
  // GOOGLE BUSINESS PROFILE (56 points)
  // ========================================

  if (data.gbpData && data.gbpData.found) {
    // Rating quality (31 points - increased from 20 to redistribute the 11 from removed URL field)
    if (data.gbpData.rating) {
      if (data.gbpData.rating >= 4.5) {
        score += 31;
      } else if (data.gbpData.rating >= 4.0) {
        score += 23;
        insights.push(`GBP rating is ${data.gbpData.rating.toFixed(1)}/5.0 (aim for 4.5+)`);
      } else if (data.gbpData.rating >= 3.5) {
        score += 12;
        insights.push(`Low GBP rating of ${data.gbpData.rating.toFixed(1)}/5.0 (critical issue)`);
      } else if (data.gbpData.rating > 0) {
        score += 6;
        insights.push(`Very low GBP rating of ${data.gbpData.rating.toFixed(1)}/5.0 (urgent: address negative reviews)`);
      }
    } else {
      insights.push('No rating data found on Google Business Profile');
    }

    // Review count (25 points)
    if (data.gbpData.reviewCount >= 100) {
      score += 25;
    } else if (data.gbpData.reviewCount >= 50) {
      score += 21;
    } else if (data.gbpData.reviewCount >= 25) {
      score += 16;
      insights.push(`GBP has ${data.gbpData.reviewCount} reviews (aim for 50+ for maximum impact)`);
    } else if (data.gbpData.reviewCount >= 10) {
      score += 10;
      insights.push(`GBP has only ${data.gbpData.reviewCount} reviews (aim for 50+)`);
    } else if (data.gbpData.reviewCount > 0) {
      score += 5;
      insights.push(`GBP has only ${data.gbpData.reviewCount} reviews (critical: aim for 10+ minimum)`);
    } else {
      insights.push('No reviews found on Google Business Profile');
    }
  } else {
    insights.push('Google Business Profile not found or could not be accessed');
  }

  // ========================================
  // NAP CONSISTENCY (22 points)
  // ========================================

  // NAP presence - name, phone, zip provided (12 points)
  if (data.hasNAP) {
    score += 12;
  } else {
    insights.push('Incomplete NAP data (Name, Address, Phone)');
  }

  // Phone format valid (10 points)
  if (data.phoneValid) {
    score += 10;
  } else {
    insights.push('Phone number not in valid US format');
  }

  // ========================================
  // LOCAL CONTENT SIGNALS (22 points)
  // ========================================

  // Homepage contains city name (12 points)
  if (data.hasCityName) {
    score += 12;
  } else {
    insights.push('City name not mentioned on homepage - critical for local SEO');
  }

  // Homepage contains category keyword (10 points)
  if (data.hasCategoryKeyword) {
    score += 10;
  } else {
    insights.push('Business category not found in title, headings, or meta description');
  }

  return { score: Math.round(score), insights };
}

// Helper: Calculate Onsite SEO Score (0-100)
function calculateOnsiteScore(psiData: any, homepageData: any): { score: number; insights: string[] } {
  let score = 0;
  const insights: string[] = [];

  if (!psiData && !homepageData) {
    return {
      score: 50,
      insights: ['Unable to analyze website performance']
    };
  }

  try {
    // ========================================
    // GOOGLE PAGESPEED INSIGHTS (48 points)
    // ========================================

    if (psiData) {
      // Performance (17 points)
      const performanceScore = psiData.lighthouseResult?.categories?.performance?.score || 0;
      score += performanceScore * 17;

      if (performanceScore < 0.7) {
        insights.push(`Page speed score is ${Math.round(performanceScore * 100)}/100 (aim for 70+)`);
      }

      // SEO Audit (17 points)
      const seoScore = psiData.lighthouseResult?.categories?.seo?.score || 0;
      score += seoScore * 17;

      if (seoScore < 0.9) {
        insights.push(`Google SEO audit score is ${Math.round(seoScore * 100)}/100 (aim for 90+)`);
      }

      // Accessibility (9 points)
      const accessibilityScore = psiData.lighthouseResult?.categories?.accessibility?.score || 0;
      score += accessibilityScore * 9;

      if (accessibilityScore < 0.9) {
        insights.push(`Accessibility score is ${Math.round(accessibilityScore * 100)}/100 (impacts SEO & UX)`);
      }

      // Best Practices (5 points)
      const bestPracticesScore = psiData.lighthouseResult?.categories?.['best-practices']?.score || 0;
      score += bestPracticesScore * 5;

      if (bestPracticesScore < 0.9) {
        insights.push(`Best practices score is ${Math.round(bestPracticesScore * 100)}/100 (includes HTTPS, security)`);
      }
    }

    // ========================================
    // HTML STRUCTURE (32 points)
    // ========================================

    if (homepageData) {
      // H1 tag (8 points)
      if (homepageData.hasH1) {
        score += 8;
      } else {
        insights.push('No H1 tag found on homepage');
      }

      // Meta description (8 points)
      if (homepageData.hasMetaDescription) {
        score += 8;
      } else {
        insights.push('Missing meta description tag');
      }

      // Title tag (7 points)
      if (homepageData.hasTitle) {
        score += 7;
      } else {
        insights.push('Missing or empty title tag');
      }

      // Schema markup (7 points) - moved from Local SEO
      const hasSchema = homepageData.hasSchema || psiData?.lighthouseResult?.audits?.['structured-data']?.score === 1;
      if (hasSchema) {
        score += 7;
      } else {
        insights.push('No LocalBusiness schema markup found (critical for local SEO)');
      }
    }

    // Viewport meta tag (3 points) - re-added
    if (psiData) {
      const hasViewport = psiData.lighthouseResult?.audits?.['viewport']?.score === 1;
      if (hasViewport) {
        score += 3;
      } else {
        insights.push('Missing viewport meta tag (required for mobile-friendliness)');
      }
    }

    // ========================================
    // CONTENT QUALITY (20 points)
    // ========================================

    if (homepageData) {
      // Word count (10 points) - updated thresholds for modern SEO
      if (homepageData.wordCount >= 1000) {
        score += 10;
      } else if (homepageData.wordCount >= 500) {
        score += 7;
        insights.push(`Homepage has ${homepageData.wordCount} words (aim for 1000+ for best SEO)`);
      } else if (homepageData.wordCount >= 250) {
        score += 4;
        insights.push(`Homepage has only ${homepageData.wordCount} words (aim for 1000+)`);
      } else {
        insights.push(`Homepage has only ${homepageData.wordCount} words (critical: aim for 1000+)`);
      }

      // Internal links (5 points) - increased threshold for better site structure
      if (homepageData.internalLinks >= 20) {
        score += 5;
      } else if (homepageData.internalLinks >= 10) {
        score += 3;
        insights.push(`Only ${homepageData.internalLinks} internal links found (aim for 20+)`);
      } else {
        score += 1;
        insights.push(`Only ${homepageData.internalLinks} internal links found (critical: aim for 20+)`);
      }

      // Alt text on images (4 points)
      if (homepageData.altTextPercentage >= 80) {
        score += 4;
      } else if (homepageData.altTextPercentage >= 50) {
        score += 2;
        insights.push(`Only ${Math.round(homepageData.altTextPercentage)}% of images have alt text (aim for 80%+)`);
      } else {
        insights.push(`Only ${Math.round(homepageData.altTextPercentage)}% of images have alt text (critical for accessibility & SEO)`);
      }
    }

  } catch (error) {
    console.error('Error calculating onsite score:', error);
  }

  return { score: Math.round(score), insights };
}

export async function POST(request: NextRequest) {
  try {
    const body: SEOSnapshotInput = await request.json();

    // Validate required fields
    if (!body.business_name || !body.website || !body.address || !body.city || !body.zip || !body.category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Run API calls in parallel for faster performance
    const [psiData, homepageData, gbpData] = await Promise.all([
      getPageSpeedData(body.website),
      scrapeHomepage(body.website),
      getGBPDataFromDataForSEO(
        body.gbp_url || null,
        body.business_name,
        body.city,
        body.zip
      )
    ]);

    // 4. Get organic keywords (optional, for future enhancement)
    // const keywordData = await getOrganicKeywords(body.website, body.category);

    // 5. Analyze local signals (Note: Citation checking removed - GBP is primary signal)
    const phoneValid = isValidUSPhone(body.phone);
    const hasCityName = homepageData?.rawHtml ? containsCityName(homepageData.rawHtml, body.city) : false;
    const hasCategoryKeyword = homepageData?.rawHtml ? containsCategoryKeyword(homepageData.rawHtml, body.category) : false;
    const hasNAP = !!(body.business_name && body.phone && body.zip);

    // 7. Calculate scores with real GBP data
    const localResult = calculateLocalScore({
      gbpData,
      hasNAP,
      phoneValid,
      hasCityName,
      hasCategoryKeyword
    });

    const onsiteResult = calculateOnsiteScore(psiData, homepageData);

    const combined = Math.round((localResult.score + onsiteResult.score) / 2);

    const result: ScoreResult = {
      local: localResult,
      onsite: onsiteResult,
      combined
    };

    // 6. Save to Supabase
    try {
      const { error: dbError } = await supabase
        .from('seo_snapshots')
        .insert({
          business_name: body.business_name,
          website: body.website,
          address: body.address,
          city: body.city,
          zip: body.zip,
          phone: body.phone,
          category: body.category,
          gbp_url: body.gbp_url,
          email: body.email,
          local_score: localResult.score,
          onsite_score: onsiteResult.score,
          insights: {
            local: localResult.insights,
            onsite: onsiteResult.insights
          }
        });

      if (dbError) {
        console.error('Supabase insert error:', dbError);
        // Don't fail the request if DB write fails
      }
    } catch (dbError) {
      console.error('Database save failed:', dbError);
      // Continue even if DB save fails
    }

    // 7. Return result
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('SEO Score API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate SEO score', message: error.message },
      { status: 500 }
    );
  }
}
