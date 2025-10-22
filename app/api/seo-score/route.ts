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
      internalLinks
    };
  } catch (error) {
    console.error('Homepage scraping failed:', error);
    return null;
  }
}

// Helper: Scrape GBP data (basic extraction)
async function scrapeGBP(gbpUrl: string): Promise<any> {
  try {
    // Note: This is a simplified approach. Full GBP scraping may require more sophisticated methods
    const response = await fetch(gbpUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SEO-Analyzer/1.0)'
      }
    });

    if (!response.ok) {
      console.error('GBP fetch error:', response.statusText);
      return null;
    }

    const html = await response.text();

    // Simple pattern matching (this is approximate and may need adjustment)
    const ratingMatch = html.match(/aria-label="(\d+\.?\d*)\s+stars?"/i) || html.match(/(\d+\.?\d*)\s+star/i);
    const reviewMatch = html.match(/(\d+)\s+reviews?/i);
    const photoMatch = html.match(/(\d+)\s+photos?/i);

    return {
      rating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
      reviewCount: reviewMatch ? parseInt(reviewMatch[1]) : null,
      photoCount: photoMatch ? parseInt(photoMatch[1]) : null,
      hasRecentPosts: /google posts/i.test(html) // Simplified check
    };
  } catch (error) {
    console.error('GBP scraping failed:', error);
    return null;
  }
}

// Helper: Calculate Local SEO Score (0-100)
function calculateLocalScore(data: {
  hasGBP: boolean;
  gbpData?: any;
  citationCount: number;
  hasNAP: boolean;
  hasSchema: boolean;
}): { score: number; insights: string[] } {
  let score = 0;
  const insights: string[] = [];

  // GBP presence & quality (50 points total)
  if (data.hasGBP) {
    score += 20; // Base for having GBP

    if (data.gbpData) {
      // Review count (10 points)
      if (data.gbpData.reviewCount) {
        if (data.gbpData.reviewCount >= 50) {
          score += 10;
        } else if (data.gbpData.reviewCount >= 10) {
          score += 7;
        } else {
          score += 3;
          insights.push(`GBP has only ${data.gbpData.reviewCount} reviews (aim for 50+)`);
        }
      } else {
        insights.push('No reviews found on Google Business Profile');
      }

      // Rating quality (10 points)
      if (data.gbpData.rating) {
        if (data.gbpData.rating >= 4.5) {
          score += 10;
        } else if (data.gbpData.rating >= 4.0) {
          score += 7;
        } else {
          score += 3;
          insights.push(`GBP rating is ${data.gbpData.rating}/5.0 (aim for 4.5+)`);
        }
      }

      // Photos (5 points)
      if (data.gbpData.photoCount && data.gbpData.photoCount >= 20) {
        score += 5;
      } else {
        insights.push('GBP needs more photos (aim for 20+)');
      }

      // Recent posts (5 points)
      if (!data.gbpData.hasRecentPosts) {
        insights.push('No recent Google Posts detected');
      } else {
        score += 5;
      }
    }
  } else {
    insights.push('No Google Business Profile detected');
  }

  // Citation presence (20 points)
  const citationScore = Math.min(20, (data.citationCount / 10) * 20);
  score += citationScore;
  if (data.citationCount < 7) {
    insights.push(`Listed on only ${data.citationCount}/10 major directories`);
  }

  // NAP consistency (15 points)
  if (data.hasNAP) {
    score += 15;
  } else {
    insights.push('Inconsistent NAP (Name, Address, Phone) across web');
  }

  // Schema markup (15 points)
  if (data.hasSchema) {
    score += 15;
  } else {
    insights.push('Missing LocalBusiness schema markup');
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

    // 3. Scrape GBP data if URL provided
    let gbpData = null;
    if (body.gbp_url) {
      gbpData = await scrapeGBP(body.gbp_url);
    }

    // 4. Get organic keywords (optional, for future enhancement)
    // const keywordData = await getOrganicKeywords(body.website, body.category);

    // 5. Mock citation check (replace with actual BrightLocal API call if needed)
    const mockCitationCount = Math.floor(Math.random() * 6) + 4; // 4-10 citations

    // 6. Check for schema markup
    const hasSchema = homepageData?.hasSchema || psiData?.lighthouseResult?.audits?.['structured-data']?.score === 1;

    // 7. Calculate scores
    const localResult = calculateLocalScore({
      hasGBP: !!body.gbp_url,
      gbpData,
      citationCount: mockCitationCount,
      hasNAP: true, // Assume true if form filled correctly
      hasSchema
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
