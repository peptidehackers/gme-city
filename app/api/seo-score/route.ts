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

// Helper: Search for business using Google Maps Search (SERP API POST-then-GET method)
async function searchBusinessOnGoogleMaps(businessName: string, city: string, zip: string): Promise<any> {
  try {
    const auth = Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64');

    // Try multiple search query formats
    const searchQueries = [
      `${businessName} ${city}`, // Just name and city
      `${businessName} ${zip}`, // Name and ZIP
      `${businessName} ${city} ${zip}`, // All three
      `${businessName}` // Just the name
    ];

    for (const searchQuery of searchQueries) {
      console.log('Searching Google Maps for:', searchQuery);

      const result = await tryGoogleMapsSearch(auth, searchQuery);
      if (result) {
        return result;
      }

      console.log(`No results with query "${searchQuery}", trying next variation...`);
    }

    console.log('No results found with any search variation');
    return null;
  } catch (error) {
    console.error('Maps search failed:', error);
    return null;
  }
}

// Helper: Try a single Google Maps search with a specific query
async function tryGoogleMapsSearch(auth: string, searchQuery: string): Promise<any> {
  try {

    // Step 1: POST to create task using SERP API (not Business Data API)
    const postResponse = await fetch(
      'https://api.dataforseo.com/v3/serp/google/maps/task_post',
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{
          keyword: searchQuery,
          location_code: 2840, // USA
          language_code: "en"
        }])
      }
    );

    if (!postResponse.ok) {
      const errorText = await postResponse.text();
      console.error('DataForSEO Maps POST error:', postResponse.statusText, errorText);
      return null;
    }

    const postData = await postResponse.json();
    console.log('Maps POST response:', postData.status_code, postData.status_message);

    if (!postData.tasks || !postData.tasks[0] || postData.tasks[0].status_code !== 20100) {
      console.log('Maps POST task failed:', postData.tasks?.[0]?.status_message || 'No tasks');
      return null;
    }

    const taskId = postData.tasks[0].id;
    console.log('Task created with ID:', taskId);

    // Step 2: Poll for results (retry up to 5 times with increasing delays)
    let getData: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      // Wait progressively longer (5s, 6s, 7s, 8s, 9s)
      const delayMs = 5000 + (attempt * 1000);
      console.log(`Waiting ${delayMs}ms before attempt ${attempt + 1}...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));

      const getResponse = await fetch(
        `https://api.dataforseo.com/v3/serp/google/maps/task_get/advanced/${taskId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`
          }
        }
      );

      if (!getResponse.ok) {
        const errorText = await getResponse.text();
        console.error('DataForSEO Maps GET error:', getResponse.statusText, errorText);
        continue; // Try again
      }

      getData = await getResponse.json();
      console.log(`Maps GET attempt ${attempt + 1}:`, getData.status_code, getData.tasks?.[0]?.status_message);

      // Check if task is complete
      if (getData.tasks?.[0]?.status_code === 20000) {
        console.log('Task completed successfully');
        break;
      }

      // If still in queue or processing, continue retrying
      if (getData.tasks?.[0]?.status_code === 20100 || getData.tasks?.[0]?.status_message?.includes('Queue')) {
        console.log('Task still processing, retrying...');
        continue;
      }

      // If other error, break
      console.log('Task failed with unexpected status');
      break;
    }

    if (!getData || !getData.tasks || !getData.tasks[0] || getData.tasks[0].status_code !== 20000) {
      console.log('Maps GET task failed after retries:', getData?.tasks?.[0]?.status_message || 'No tasks');
      return null;
    }

    const items = getData.tasks[0].result?.[0]?.items;
    console.log('Items found:', items?.length || 0);

    if (!items || items.length === 0) {
      console.log('No business found in Maps search');
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
    console.error('Maps search failed:', error);
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
}): { score: number; insights: string[] } {
  let score = 0;
  const insights: string[] = [];

  // GBP Presence & Quality (35 points total)
  if (data.gbpData && data.gbpData.found) {
    // Rating quality (15 points - increased from 10)
    if (data.gbpData.rating) {
      if (data.gbpData.rating >= 4.5) {
        score += 15;
      } else if (data.gbpData.rating >= 4.0) {
        score += 11;
        insights.push(`GBP rating is ${data.gbpData.rating.toFixed(1)}/5.0 (aim for 4.5+)`);
      } else if (data.gbpData.rating >= 3.5) {
        score += 6;
        insights.push(`Low GBP rating of ${data.gbpData.rating.toFixed(1)}/5.0 (critical issue)`);
      } else if (data.gbpData.rating > 0) {
        score += 3;
        insights.push(`Very low GBP rating of ${data.gbpData.rating.toFixed(1)}/5.0 (urgent: address negative reviews)`);
      }
    } else {
      insights.push('No rating data found on Google Business Profile');
    }

    // Review count (20 points - increased from 15)
    if (data.gbpData.reviewCount >= 100) {
      score += 20;
    } else if (data.gbpData.reviewCount >= 50) {
      score += 17;
    } else if (data.gbpData.reviewCount >= 25) {
      score += 13;
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

    // Note: Photo count removed due to DataForSEO API limitations
    // Points redistributed to rating (10→15) and reviews (15→20)
  } else {
    insights.push('Google Business Profile not found or could not be accessed');
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

  // Alt text on homepage images (7 points - increased from 5, absorbed citation points)
  if (data.hasAltText) {
    score += 7;
  } else {
    insights.push('Most images missing alt text attributes');
  }

  // Note: Citation checking removed. GBP (Google Business Profile) is the primary
  // local citation signal and is already weighted heavily in the score above.
  // Additional citations across directories like Yelp, YellowPages, etc. would
  // require API integration or advanced scraping tools (Puppeteer).

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
    // GOOGLE PAGESPEED INSIGHTS (55 points)
    // ========================================

    if (psiData) {
      // Performance (20 points)
      const performanceScore = psiData.lighthouseResult?.categories?.performance?.score || 0;
      score += performanceScore * 20;

      if (performanceScore < 0.7) {
        insights.push(`Page speed score is ${Math.round(performanceScore * 100)}/100 (aim for 70+)`);
      }

      // SEO Audit (20 points)
      const seoScore = psiData.lighthouseResult?.categories?.seo?.score || 0;
      score += seoScore * 20;

      if (seoScore < 0.9) {
        insights.push(`Google SEO audit score is ${Math.round(seoScore * 100)}/100 (aim for 90+)`);
      }

      // Accessibility (10 points)
      const accessibilityScore = psiData.lighthouseResult?.categories?.accessibility?.score || 0;
      score += accessibilityScore * 10;

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
    // HTML STRUCTURE (25 points)
    // ========================================

    if (homepageData) {
      // H1 tag (9 points)
      if (homepageData.hasH1) {
        score += 9;
      } else {
        insights.push('No H1 tag found on homepage');
      }

      // Meta description (8 points)
      if (homepageData.hasMetaDescription) {
        score += 8;
      } else {
        insights.push('Missing meta description tag');
      }

      // Title tag (8 points)
      if (homepageData.hasTitle) {
        score += 8;
      } else {
        insights.push('Missing or empty title tag');
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

      // Alt text on images (5 points)
      if (homepageData.altTextPercentage >= 80) {
        score += 5;
      } else if (homepageData.altTextPercentage >= 50) {
        score += 3;
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

    // 1. Get PageSpeed Insights data
    const psiData = await getPageSpeedData(body.website);

    // 2. Scrape homepage content
    const homepageData = await scrapeHomepage(body.website);

    // 3. Get real GBP data from DataForSEO (URL or search)
    const gbpData = await getGBPDataFromDataForSEO(
      body.gbp_url || null,
      body.business_name,
      body.city,
      body.zip
    );

    // 4. Get organic keywords (optional, for future enhancement)
    // const keywordData = await getOrganicKeywords(body.website, body.category);

    // 5. Analyze local signals (Note: Citation checking removed - GBP is primary signal)
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
      hasKeywordRelevance: false // TODO: Implement DataForSEO keyword matching
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
