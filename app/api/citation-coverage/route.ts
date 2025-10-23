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
  state?: string;
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
  insights: string[];
  score: number; // 0-100
}

// =====================================================
// GOOGLE BUSINESS PROFILE CHECK
// =====================================================

async function checkGoogleBusinessProfile(
  businessName: string,
  city: string,
  zip: string,
  state?: string,
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
      insights: [
        'Google Business Profile URL provided',
        'Your business has a verified Google Business Profile',
        'Schedule a call with GMB City to optimize your GBP for better local rankings'
      ],
      score: 100
    };
  }

  // Otherwise, search for GBP via DataForSEO
  try {
    console.log(`Searching Google Maps for: ${businessName} ${city}`);

    const searchQuery = `${businessName} ${city}`;

    const response = await fetch(`${DATAFORSEO_API_ENDPOINT}/serp/google/maps/live/advanced`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{
        keyword: searchQuery,
        location_code: 2840, // USA
        language_code: 'en'
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
          const business = items[0];
          console.log('Found business:', business.title, 'Rating:', business.rating?.value, 'Reviews:', business.rating?.votes_count);

          return {
            found: true,
            hasGBP: true,
            gbpData: {
              name: business.title || businessName,
              rating: business.rating?.value || 0,
              reviewCount: business.rating?.votes_count || 0,
              address: business.address || '',
              phone: business.phone || ''
            },
            insights: [
              `Found Google Business Profile: ${business.title}`,
              `Rating: ${business.rating?.value || 0}/5 with ${business.rating?.votes_count || 0} reviews`,
              business.rating?.votes_count < 10 ? 'Get more reviews to improve local rankings' : 'Strong review count',
              'Schedule a call with GMB City for a complete 40-citation audit'
            ],
            score: 100
          };
        }
      }
    }

    // No GBP found
    return {
      found: false,
      hasGBP: false,
      insights: [
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
      insights: [
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
    const { business_name, city, zip } = body;

    if (!business_name || !city || !zip) {
      return NextResponse.json(
        { error: 'Missing required fields: business_name, city, zip' },
        { status: 400 }
      );
    }

    console.log('Starting GBP check for:', business_name);

    const startTime = Date.now();
    const result = await checkGoogleBusinessProfile(
      business_name,
      city,
      zip,
      body.state,
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
