import { NextRequest, NextResponse } from 'next/server';

// API Configuration
const DATAFORSEO_LOGIN = 'info@peptidehackers.com';
const DATAFORSEO_PASSWORD = '1ffc43456fd8423b';
const DATAFORSEO_API_ENDPOINT = 'https://api.dataforseo.com/v3';

// =====================================================
// TYPES & INTERFACES
// =====================================================

interface KeywordRequest {
  website: string;
  category: string;
  city: string;
  competitorUrl?: string;
}

interface KeywordResult {
  keyword: string;
  volume: number;
  ranking?: number;
  opportunity: 'ranking' | 'improve' | 'gap';
}

interface KeywordResponse {
  success: boolean;
  keywords: KeywordResult[];
  duration?: number;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Get ranked keywords for a domain using DataForSEO
async function getRankedKeywords(domain: string, city: string, category: string): Promise<any> {
  try {
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const auth = Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64');

    console.log(`Fetching ranked keywords for: ${cleanDomain}`);

    const response = await fetch(
      `${DATAFORSEO_API_ENDPOINT}/dataforseo_labs/google/ranked_keywords/live`,
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
          limit: 100 // Get top 100 keywords (sorted by search volume by default)
        }])
      }
    );

    if (!response.ok) {
      console.error('DataForSEO API error:', response.statusText);
      return null;
    }

    const data = await response.json();
    console.log('Ranked keywords response:', data.status_code, data.status_message);

    if (data.status_code === 20000 && data.tasks && data.tasks[0]) {
      const task = data.tasks[0];
      console.log('Task status:', task.status_code, task.status_message);

      if (task.status_code === 20000 && task.result && task.result.length > 0) {
        const result = task.result[0];
        console.log('Keywords found:', result.items?.length || 0);
        console.log('Result keys:', Object.keys(result));
        return result;
      } else {
        console.log('No results found in task. Task result:', JSON.stringify(task.result).substring(0, 200));
      }
    }

    return null;
  } catch (error) {
    console.error('getRankedKeywords failed:', error);
    return null;
  }
}

// Get competitor keywords using DataForSEO
async function getCompetitorKeywords(userDomain: string, competitorDomain: string): Promise<any> {
  try {
    const cleanUserDomain = userDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const cleanCompetitorDomain = competitorDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const auth = Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64');

    console.log(`Comparing ${cleanUserDomain} vs ${cleanCompetitorDomain}`);

    const response = await fetch(
      `${DATAFORSEO_API_ENDPOINT}/dataforseo_labs/google/competitors_domain/live`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{
          target: cleanUserDomain,
          location_code: 2840, // USA
          language_code: "en",
          intersecting_domains: [cleanCompetitorDomain],
          limit: 50
        }])
      }
    );

    if (!response.ok) {
      console.error('DataForSEO Competitors API error:', response.statusText);
      return null;
    }

    const data = await response.json();
    console.log('Competitor keywords response:', data.status_code, data.status_message);

    if (data.status_code === 20000 && data.tasks && data.tasks[0]) {
      const task = data.tasks[0];
      if (task.status_code === 20000 && task.result && task.result.length > 0) {
        return task.result[0];
      }
    }

    return null;
  } catch (error) {
    console.error('getCompetitorKeywords failed:', error);
    return null;
  }
}

// Filter and categorize keywords based on ranking and relevance
function processKeywords(
  rankedData: any,
  city: string,
  category: string
): KeywordResult[] {
  if (!rankedData || !rankedData.items) {
    return [];
  }

  const keywords: KeywordResult[] = [];
  const cityLower = city.toLowerCase();
  const categoryLower = category.toLowerCase();

  for (const item of rankedData.items) {
    if (!item.keyword_data || !item.ranked_serp_element) continue;

    const keyword = item.keyword_data.keyword || '';
    const keywordLower = keyword.toLowerCase();
    const volume = item.keyword_data.keyword_info?.search_volume || 0;
    const ranking = item.ranked_serp_element.serp_item?.rank_absolute || null;

    // Skip very low volume keywords
    if (volume < 10) continue;

    // Prioritize local keywords (containing city or category)
    const isLocal = keywordLower.includes(cityLower) || keywordLower.includes(categoryLower);

    // Categorize opportunity type
    let opportunity: 'ranking' | 'improve' | 'gap';
    if (ranking && ranking <= 3) {
      opportunity = 'ranking'; // Already ranking well
    } else if (ranking && ranking <= 20) {
      opportunity = 'improve'; // Ranking but can improve
    } else {
      opportunity = 'gap'; // Not ranking or ranking very low
    }

    // Boost local keywords in priority
    if (isLocal || ranking) {
      keywords.push({
        keyword,
        volume,
        ranking: ranking || undefined,
        opportunity
      });
    }
  }

  // Sort by volume descending, then by ranking ascending
  keywords.sort((a, b) => {
    // Prioritize local keywords
    const aLocal = a.keyword.toLowerCase().includes(cityLower) || a.keyword.toLowerCase().includes(categoryLower);
    const bLocal = b.keyword.toLowerCase().includes(cityLower) || b.keyword.toLowerCase().includes(categoryLower);

    if (aLocal && !bLocal) return -1;
    if (!aLocal && bLocal) return 1;

    // Then sort by volume
    if (b.volume !== a.volume) {
      return b.volume - a.volume;
    }

    // Then by ranking (lower is better)
    if (a.ranking && b.ranking) {
      return a.ranking - b.ranking;
    }
    if (a.ranking) return -1;
    if (b.ranking) return 1;

    return 0;
  });

  // Return top 15 keywords
  return keywords.slice(0, 15);
}

// =====================================================
// API ROUTE HANDLER
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const body: KeywordRequest = await request.json();

    // Validate required fields
    const { website, category, city } = body;

    if (!website || !category || !city) {
      return NextResponse.json(
        { error: 'Missing required fields: website, category, city' },
        { status: 400 }
      );
    }

    console.log('Starting keyword research for:', website, `- ${category} in ${city}`);

    const startTime = Date.now();

    // Get ranked keywords for the user's website
    const rankedData = await getRankedKeywords(website, city, category);

    if (!rankedData) {
      return NextResponse.json(
        {
          success: true,
          keywords: [],
          noDataReason: 'insufficient_traffic'
        },
        { status: 200 }
      );
    }

    // Process and categorize keywords
    const keywords = processKeywords(rankedData, city, category);

    const duration = Date.now() - startTime;

    console.log(`Keyword research completed in ${duration}ms - Found ${keywords.length} keywords`);

    return NextResponse.json({
      success: true,
      keywords,
      duration
    });

  } catch (error) {
    console.error('Keywords API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        keywords: []
      },
      { status: 500 }
    );
  }
}
