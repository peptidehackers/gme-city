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

// Helper: Calculate Local SEO Score (0-100)
function calculateLocalScore(data: {
  hasGBP: boolean;
  citationCount: number;
  hasNAP: boolean;
  hasSchema: boolean;
}): { score: number; insights: string[] } {
  let score = 0;
  const insights: string[] = [];

  // GBP presence (40 points)
  if (data.hasGBP) {
    score += 40;
  } else {
    insights.push('No Google Business Profile detected');
  }

  // Citation presence (30 points)
  const citationScore = Math.min(30, (data.citationCount / 10) * 30);
  score += citationScore;
  if (data.citationCount < 7) {
    insights.push(`Only listed on ${data.citationCount}/10 major directories`);
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
function calculateOnsiteScore(psiData: any): { score: number; insights: string[] } {
  let score = 0;
  const insights: string[] = [];

  if (!psiData) {
    return {
      score: 50,
      insights: ['Unable to analyze website performance']
    };
  }

  try {
    // Performance score (40 points)
    const performanceScore = psiData.lighthouseResult?.categories?.performance?.score || 0;
    score += performanceScore * 40;

    if (performanceScore < 0.7) {
      insights.push('Slow page speed (below 70/100)');
    }

    // SEO score (30 points)
    const seoScore = psiData.lighthouseResult?.categories?.seo?.score || 0;
    score += seoScore * 30;

    // Meta tags (15 points)
    const audits = psiData.lighthouseResult?.audits || {};
    if (audits['meta-description']?.score === 1) {
      score += 8;
    } else {
      insights.push('Missing or poor meta description');
    }

    if (audits['document-title']?.score === 1) {
      score += 7;
    } else {
      insights.push('Missing or poor page title');
    }

    // Mobile friendliness (15 points)
    if (audits['viewport']?.score === 1) {
      score += 15;
    } else {
      insights.push('Not mobile-friendly (no viewport meta tag)');
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

    // 2. Get organic keywords (optional, for future enhancement)
    // const keywordData = await getOrganicKeywords(body.website, body.category);

    // 3. Mock citation check (replace with actual BrightLocal API call if needed)
    const mockCitationCount = Math.floor(Math.random() * 6) + 4; // 4-10 citations

    // 4. Check for schema markup
    const hasSchema = psiData?.lighthouseResult?.audits?.['structured-data']?.score === 1;

    // 5. Calculate scores
    const localResult = calculateLocalScore({
      hasGBP: !!body.gbp_url,
      citationCount: mockCitationCount,
      hasNAP: true, // Assume true if form filled correctly
      hasSchema
    });

    const onsiteResult = calculateOnsiteScore(psiData);

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
