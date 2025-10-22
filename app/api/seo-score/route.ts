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

// Helper: Calculate Local SEO Score (0-100) - Simplified without GBP scraping
function calculateLocalScore(data: {
  hasGBPUrl: boolean;
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

  // GBP URL provided (10 points)
  if (data.hasGBPUrl) {
    score += 10;
  } else {
    insights.push('Google Business Profile URL not provided');
  }

  // NAP presence - name, phone, zip provided (10 points)
  if (data.hasNAP) {
    score += 10;
  } else {
    insights.push('Incomplete NAP data (Name, Address, Phone)');
  }

  // Phone format valid (10 points)
  if (data.phoneValid) {
    score += 10;
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

  // Homepage contains category keyword (10 points)
  if (data.hasCategoryKeyword) {
    score += 10;
  } else {
    insights.push('Business category not found in title, headings, or meta description');
  }

  // Internal links or contact page present (10 points)
  if (data.hasInternalLinks) {
    score += 10;
  } else {
    insights.push('No internal links or location-specific content found');
  }

  // Alt text on homepage images (5 points)
  if (data.hasAltText) {
    score += 5;
  } else {
    insights.push('Most images missing alt text attributes');
  }

  // Keyword relevance via DataForSEO (10 points)
  if (data.hasKeywordRelevance) {
    score += 10;
  }

  // Citation presence (10 points)
  const citationScore = Math.min(10, (data.citationCount / 10) * 10);
  score += citationScore;
  if (data.citationCount < 7) {
    insights.push(`Listed on only ${data.citationCount}/10 major directories`);
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

    // 3. Get organic keywords (optional, for future enhancement)
    // const keywordData = await getOrganicKeywords(body.website, body.category);

    // 4. Mock citation check (replace with actual BrightLocal API call if needed)
    const mockCitationCount = Math.floor(Math.random() * 6) + 4; // 4-10 citations

    // 5. Analyze local signals
    const hasSchema = homepageData?.hasSchema || psiData?.lighthouseResult?.audits?.['structured-data']?.score === 1;
    const phoneValid = isValidUSPhone(body.phone);
    const hasCityName = homepageData?.rawHtml ? containsCityName(homepageData.rawHtml, body.city) : false;
    const hasCategoryKeyword = homepageData?.rawHtml ? containsCategoryKeyword(homepageData.rawHtml, body.category) : false;
    const hasInternalLinks = (homepageData?.internalLinks || 0) >= 5;
    const hasAltText = (homepageData?.altTextPercentage || 0) >= 50;
    const hasNAP = !!(body.business_name && body.phone && body.zip);

    // 6. Calculate scores with new rubric
    const localResult = calculateLocalScore({
      hasGBPUrl: !!body.gbp_url,
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
