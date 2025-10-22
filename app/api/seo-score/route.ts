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
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(cleanUrl)}&key=${GOOGLE_PSI_API_KEY}&strategy=desktop&category=performance&category=seo`
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

// Helper: Extract Place ID from GBP URL
function extractPlaceId(gbpUrl: string): string | null {
  try {
    // GBP URLs can be in various formats:
    // https://maps.google.com/maps?cid=12345678901234567890
    // https://www.google.com/maps/place/Business+Name/@lat,lng,zoom/data=!4m5!3m4!1s0x...:0xabc123
    // https://g.page/business-name

    const cidMatch = gbpUrl.match(/cid=(\d+)/);
    if (cidMatch) return cidMatch[1];

    const placeIdMatch = gbpUrl.match(/!1s([^!]+)/);
    if (placeIdMatch) return placeIdMatch[1];

    // For g.page links, we'd need to resolve the redirect, but return null for now
    return null;
  } catch (error) {
    console.error('Error extracting place ID:', error);
    return null;
  }
}

// Helper: Get GBP data from DataForSEO
async function getGBPDataFromDataForSEO(gbpUrl: string): Promise<any> {
  try {
    const placeId = extractPlaceId(gbpUrl);
    if (!placeId) {
      console.log('Could not extract place ID from URL');
      return null;
    }

    const auth = Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64');

    const response = await fetch(
      'https://api.dataforseo.com/v3/business_data/google/reviews/task_post',
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{
          place_id: placeId,
          limit: 100,
          sort_by: "newest"
        }])
      }
    );

    if (!response.ok) {
      console.error('DataForSEO API error:', response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data.tasks || !data.tasks[0] || !data.tasks[0].result || !data.tasks[0].result[0]) {
      console.log('No results from DataForSEO');
      return null;
    }

    const result = data.tasks[0].result[0];

    // Check for recent posts (reviews from last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentReviews = result.reviews?.filter((review: any) =>
      new Date(review.timestamp).getTime() > thirtyDaysAgo
    ) || [];

    return {
      rating: result.rating?.value || null,
      reviewCount: result.reviews_count || 0,
      photoCount: result.photos_count || 0,
      hasRecentActivity: recentReviews.length > 0,
      reviews: result.reviews || []
    };
  } catch (error) {
    console.error('DataForSEO GBP fetch failed:', error);
    return null;
  }
}

// Helper: Calculate Local SEO Score (0-100) - With real GBP data from DataForSEO
function calculateLocalScore(data: {
  hasGBPUrl: boolean;
  gbpData?: any;
  hasNAP: boolean;
  phoneValid: boolean;
  hasSchema: boolean;
  hasCityName: boolean;
  hasCategoryKeyword: boolean;
  hasInternalLinks: boolean;
  hasAltText: boolean;
  hasKeywordRelevance: boolean;
  citationCount: number;
}): { score: number; insights: string[] } {
  let score = 0;
  const insights: string[] = [];

  // GBP Presence & Quality (35 points total)
  if (data.hasGBPUrl && data.gbpData) {
    score += 5; // Base for having GBP URL

    // Review count (15 points)
    if (data.gbpData.reviewCount >= 50) {
      score += 15;
    } else if (data.gbpData.reviewCount >= 25) {
      score += 12;
      insights.push(`GBP has ${data.gbpData.reviewCount} reviews (aim for 50+ for maximum impact)`);
    } else if (data.gbpData.reviewCount >= 10) {
      score += 8;
      insights.push(`GBP has only ${data.gbpData.reviewCount} reviews (aim for 50+)`);
    } else if (data.gbpData.reviewCount > 0) {
      score += 4;
      insights.push(`GBP has only ${data.gbpData.reviewCount} reviews (critical: aim for 10+ minimum)`);
    } else {
      insights.push('No reviews found on Google Business Profile');
    }

    // Rating quality (10 points)
    if (data.gbpData.rating) {
      if (data.gbpData.rating >= 4.5) {
        score += 10;
      } else if (data.gbpData.rating >= 4.0) {
        score += 7;
        insights.push(`GBP rating is ${data.gbpData.rating.toFixed(1)}/5.0 (aim for 4.5+)`);
      } else if (data.gbpData.rating >= 3.5) {
        score += 4;
        insights.push(`Low GBP rating of ${data.gbpData.rating.toFixed(1)}/5.0 (critical issue)`);
      } else {
        score += 2;
        insights.push(`Very low GBP rating of ${data.gbpData.rating.toFixed(1)}/5.0 (urgent: address negative reviews)`);
      }
    } else {
      insights.push('No rating data found on Google Business Profile');
    }

    // Recent activity (5 points)
    if (data.gbpData.hasRecentActivity) {
      score += 5;
    } else {
      insights.push('No recent review activity in last 30 days');
    }
  } else if (data.hasGBPUrl) {
    score += 5;
    insights.push('Could not fetch GBP data (may be invalid URL or API issue)');
  } else {
    insights.push('Google Business Profile URL not provided');
  }

  // NAP presence - name, phone, zip provided (10 points)
  if (data.hasNAP) {
    score += 10;
  } else {
    insights.push('Incomplete NAP data (Name, Address, Phone)');
  }

  // Phone format valid (8 points)
  if (data.phoneValid) {
    score += 8;
  } else {
    insights.push('Phone number not in valid US format');
  }

  // LocalBusiness schema present (15 points)
  if (data.hasSchema) {
    score += 15;
  } else {
    insights.push('No LocalBusiness schema found on homepage');
  }

  // Homepage contains city name (10 points)
  if (data.hasCityName) {
    score += 10;
  } else {
    insights.push('City name not mentioned on homepage');
  }

  // Homepage contains category keyword (8 points)
  if (data.hasCategoryKeyword) {
    score += 8;
  } else {
    insights.push('Business category not found in title, headings, or meta description');
  }

  // Internal links or contact page present (7 points)
  if (data.hasInternalLinks) {
    score += 7;
  } else {
    insights.push('No internal links or location-specific content found');
  }

  // Alt text on homepage images (5 points)
  if (data.hasAltText) {
    score += 5;
  } else {
    insights.push('Most images missing alt text attributes');
  }

  // Citation presence (2 points - reduced since GBP is primary signal)
  const citationScore = Math.min(2, (data.citationCount / 10) * 2);
  score += citationScore;

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
    // Performance score - LIMITED to 30% weight
    if (psiData) {
      const performanceScore = psiData.lighthouseResult?.categories?.performance?.score || 0;
      score += performanceScore * 30; // Reduced from 40 to 30

      if (performanceScore < 0.7) {
        insights.push(`Page speed score is ${Math.round(performanceScore * 100)}/100 (aim for 70+)`);
      }
    }

    // HTML Structure & Tags (35 points)
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

      // Schema markup (7 points)
      if (homepageData.hasSchema) {
        score += 7;
      } else {
        insights.push('Missing LocalBusiness schema markup');
      }

      // Mobile viewport (5 points)
      const hasViewport = psiData?.lighthouseResult?.audits?.['viewport']?.score === 1;
      if (hasViewport) {
        score += 5;
      } else {
        insights.push('Not mobile-friendly (no viewport meta tag)');
      }
    }

    // Content Quality (20 points)
    if (homepageData) {
      // Word count (10 points)
      if (homepageData.wordCount >= 500) {
        score += 10;
      } else if (homepageData.wordCount >= 250) {
        score += 6;
      } else {
        score += 2;
        insights.push(`Homepage has only ${homepageData.wordCount} words (aim for 500+)`);
      }

      // Internal links (5 points)
      if (homepageData.internalLinks >= 10) {
        score += 5;
      } else if (homepageData.internalLinks >= 5) {
        score += 3;
      } else {
        insights.push(`Only ${homepageData.internalLinks} internal links found (aim for 10+)`);
      }

      // Alt text on images (5 points)
      if (homepageData.altTextPercentage >= 80) {
        score += 5;
      } else if (homepageData.altTextPercentage >= 50) {
        score += 3;
      } else {
        insights.push(`Only ${Math.round(homepageData.altTextPercentage)}% of images have alt text`);
      }
    }

    // SEO audit score (15 points)
    if (psiData) {
      const seoScore = psiData.lighthouseResult?.categories?.seo?.score || 0;
      score += seoScore * 15;
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

    // 1. Get PageSpeed Insights data
    const psiData = await getPageSpeedData(body.website);

    // 2. Scrape homepage content
    const homepageData = await scrapeHomepage(body.website);

    // 3. Get real GBP data from DataForSEO if URL provided
    let gbpData = null;
    if (body.gbp_url) {
      gbpData = await getGBPDataFromDataForSEO(body.gbp_url);
    }

    // 4. Get organic keywords (optional, for future enhancement)
    // const keywordData = await getOrganicKeywords(body.website, body.category);

    // 5. Mock citation check (replace with actual BrightLocal API call if needed)
    const mockCitationCount = Math.floor(Math.random() * 6) + 4; // 4-10 citations

    // 6. Analyze local signals
    const hasSchema = homepageData?.hasSchema || psiData?.lighthouseResult?.audits?.['structured-data']?.score === 1;
    const phoneValid = isValidUSPhone(body.phone);
    const hasCityName = homepageData?.rawHtml ? containsCityName(homepageData.rawHtml, body.city) : false;
    const hasCategoryKeyword = homepageData?.rawHtml ? containsCategoryKeyword(homepageData.rawHtml, body.category) : false;
    const hasInternalLinks = (homepageData?.internalLinks || 0) >= 5;
    const hasAltText = (homepageData?.altTextPercentage || 0) >= 50;
    const hasNAP = !!(body.business_name && body.phone && body.zip);

    // 7. Calculate scores with real GBP data
    const localResult = calculateLocalScore({
      hasGBPUrl: !!body.gbp_url,
      gbpData,
      hasNAP,
      phoneValid,
      hasSchema,
      hasCityName,
      hasCategoryKeyword,
      hasInternalLinks,
      hasAltText,
      hasKeywordRelevance: false, // TODO: Implement DataForSEO keyword matching
      citationCount: mockCitationCount
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
