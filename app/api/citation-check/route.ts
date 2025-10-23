import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// =====================================================
// TYPES & INTERFACES
// =====================================================

interface NAPData {
  businessName: string;
  phone: string;
  address: string;
  city: string;
  state?: string;
  zip: string;
}

interface CitationResult {
  directory: string;
  found: boolean;
  confidence: 'high' | 'medium' | 'low' | 'none';
  confidenceScore: number; // 0-100
  nap?: {
    name?: string;
    phone?: string;
    address?: string;
  };
  url?: string;
  error?: string;
}

interface CitationCheckResponse {
  totalChecked: number;
  totalFound: number;
  foundPercentage: number;
  napConsistent: boolean;
  napInconsistencies: string[];
  citations: CitationResult[];
  overallScore: number; // 0-100
  insights: string[];
}

// =====================================================
// NAP NORMALIZATION UTILITIES
// =====================================================

function normalizePhone(phone: string): string {
  if (!phone) return '';
  // Remove all non-digit characters
  return phone.replace(/\D/g, '');
}

function normalizeAddress(address: string): string {
  if (!address) return '';

  return address
    .toLowerCase()
    .trim()
    // Standardize common abbreviations
    .replace(/\bstreet\b/gi, 'st')
    .replace(/\bavenue\b/gi, 'ave')
    .replace(/\bboulevard\b/gi, 'blvd')
    .replace(/\bdrive\b/gi, 'dr')
    .replace(/\broad\b/gi, 'rd')
    .replace(/\blane\b/gi, 'ln')
    .replace(/\bsuite\b/gi, 'ste')
    .replace(/\bapartment\b/gi, 'apt')
    .replace(/\bfloor\b/gi, 'fl')
    .replace(/\bbuilding\b/gi, 'bldg')
    // Remove punctuation
    .replace(/[.,#]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeName(name: string): string {
  if (!name) return '';

  return name
    .toLowerCase()
    .trim()
    // Remove common business suffixes
    .replace(/\b(llc|inc|corp|corporation|ltd|limited|co|company)\b\.?/gi, '')
    .replace(/\bthe\b/gi, '')
    .replace(/[&]/g, 'and')
    // Remove punctuation
    .replace(/[.,]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Simple Levenshtein distance for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = str1.toLowerCase().trim();
  const normalized2 = str2.toLowerCase().trim();

  if (normalized1 === normalized2) return 100;
  if (!normalized1 || !normalized2) return 0;

  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLen = Math.max(normalized1.length, normalized2.length);

  return Math.round(((maxLen - distance) / maxLen) * 100);
}

// =====================================================
// FETCH WITH RETRY LOGIC
// =====================================================

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
];

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response | null> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

      const response = await fetch(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      if (response.status === 200) {
        return response;
      }

      // Rate limited or server error - retry with exponential backoff
      if (response.status === 429 || response.status >= 500) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Client error - don't retry
      return null;
    } catch (error) {
      console.error(`Fetch attempt ${i + 1} failed for ${url}:`, error);

      if (i === maxRetries - 1) {
        return null;
      }

      // Wait before retrying
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return null;
}

// =====================================================
// DIRECTORY SCRAPERS
// =====================================================

async function checkYelp(napData: NAPData): Promise<CitationResult> {
  try {
    const searchQuery = encodeURIComponent(`${napData.businessName} ${napData.city}`);
    const searchUrl = `https://www.yelp.com/search?find_desc=${searchQuery}&find_loc=${napData.city}%2C+${napData.state || ''}+${napData.zip}`;

    const response = await fetchWithRetry(searchUrl);
    if (!response) {
      return {
        directory: 'Yelp',
        found: false,
        confidence: 'none',
        confidenceScore: 0,
        error: 'Failed to fetch Yelp page'
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Try multiple selectors for business name
    const nameSelectors = [
      'h3.css-1agk4wl a',
      'a[data-testid="business-name"]',
      'h4 a[href*="/biz/"]',
      'a.css-1m051bw'
    ];

    let foundMatch = false;
    let businessName = '';
    let businessUrl = '';
    let confidence = 0;

    for (const selector of nameSelectors) {
      $(selector).each((_, el) => {
        const name = $(el).text().trim();
        const similarity = calculateSimilarity(normalizeName(name), normalizeName(napData.businessName));

        if (similarity > confidence) {
          confidence = similarity;
          businessName = name;
          businessUrl = 'https://www.yelp.com' + $(el).attr('href');

          if (similarity >= 85) {
            foundMatch = true;
          }
        }
      });

      if (foundMatch) break;
    }

    if (!foundMatch || confidence < 70) {
      return {
        directory: 'Yelp',
        found: false,
        confidence: 'none',
        confidenceScore: 0
      };
    }

    // If we found a match, try to get more details from the business page
    let phone = '';
    let address = '';

    if (businessUrl) {
      const detailResponse = await fetchWithRetry(businessUrl);
      if (detailResponse) {
        const detailHtml = await detailResponse.text();
        const $detail = cheerio.load(detailHtml);

        // Try to find phone
        const phoneSelectors = [
          'p[data-testid="phone-number"]',
          'a[href^="tel:"]',
          '.biz-phone'
        ];

        for (const selector of phoneSelectors) {
          const phoneText = $detail(selector).first().text().trim();
          if (phoneText) {
            phone = phoneText;
            break;
          }
        }

        // Try to find address
        const addressSelectors = [
          'address',
          '[data-testid="address"]',
          '.css-1p9ibgf'
        ];

        for (const selector of addressSelectors) {
          const addressText = $detail(selector).first().text().trim();
          if (addressText) {
            address = addressText;
            break;
          }
        }
      }
    }

    // Calculate confidence based on matches
    let finalConfidence = confidence;
    if (phone && normalizePhone(phone) === normalizePhone(napData.phone)) {
      finalConfidence = Math.min(100, finalConfidence + 10);
    }
    if (address && calculateSimilarity(normalizeAddress(address), normalizeAddress(napData.address)) > 80) {
      finalConfidence = Math.min(100, finalConfidence + 10);
    }

    const confidenceLevel: 'high' | 'medium' | 'low' =
      finalConfidence >= 90 ? 'high' : finalConfidence >= 70 ? 'medium' : 'low';

    return {
      directory: 'Yelp',
      found: true,
      confidence: confidenceLevel,
      confidenceScore: finalConfidence,
      nap: {
        name: businessName,
        phone: phone || undefined,
        address: address || undefined
      },
      url: businessUrl
    };
  } catch (error) {
    console.error('Yelp check error:', error);
    return {
      directory: 'Yelp',
      found: false,
      confidence: 'none',
      confidenceScore: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkFacebook(napData: NAPData): Promise<CitationResult> {
  try {
    // Facebook requires authenticated access for most data
    // For MVP, we'll do a basic search check
    const searchQuery = encodeURIComponent(`${napData.businessName} ${napData.city}`);
    const searchUrl = `https://www.facebook.com/search/pages/?q=${searchQuery}`;

    const response = await fetchWithRetry(searchUrl);
    if (!response) {
      return {
        directory: 'Facebook',
        found: false,
        confidence: 'none',
        confidenceScore: 0,
        error: 'Failed to fetch Facebook page'
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Facebook's structure is heavily client-side rendered
    // Look for structured data instead
    let foundMatch = false;
    let businessName = '';
    let confidence = 0;

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || '{}');
        if (data['@type'] === 'Organization' || data['@type'] === 'LocalBusiness') {
          const name = data.name || '';
          const similarity = calculateSimilarity(normalizeName(name), normalizeName(napData.businessName));

          if (similarity > confidence) {
            confidence = similarity;
            businessName = name;

            if (similarity >= 85) {
              foundMatch = true;
            }
          }
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    });

    if (!foundMatch || confidence < 70) {
      return {
        directory: 'Facebook',
        found: false,
        confidence: 'low',
        confidenceScore: confidence,
        nap: confidence > 0 ? { name: businessName } : undefined
      };
    }

    const confidenceLevel: 'high' | 'medium' | 'low' =
      confidence >= 90 ? 'high' : confidence >= 70 ? 'medium' : 'low';

    return {
      directory: 'Facebook',
      found: true,
      confidence: confidenceLevel,
      confidenceScore: confidence,
      nap: {
        name: businessName
      }
    };
  } catch (error) {
    console.error('Facebook check error:', error);
    return {
      directory: 'Facebook',
      found: false,
      confidence: 'none',
      confidenceScore: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkYellowPages(napData: NAPData): Promise<CitationResult> {
  try {
    const searchQuery = encodeURIComponent(napData.businessName);
    const location = encodeURIComponent(`${napData.city}, ${napData.state || ''} ${napData.zip}`);
    const searchUrl = `https://www.yellowpages.com/search?search_terms=${searchQuery}&geo_location_terms=${location}`;

    const response = await fetchWithRetry(searchUrl);
    if (!response) {
      return {
        directory: 'YellowPages',
        found: false,
        confidence: 'none',
        confidenceScore: 0,
        error: 'Failed to fetch YellowPages'
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let foundMatch = false;
    let businessName = '';
    let phone = '';
    let address = '';
    let businessUrl = '';
    let confidence = 0;

    // YellowPages has a consistent structure
    $('.result').each((_, result) => {
      const $result = $(result);

      const name = $result.find('.business-name span').text().trim();
      const similarity = calculateSimilarity(normalizeName(name), normalizeName(napData.businessName));

      if (similarity > confidence) {
        confidence = similarity;
        businessName = name;
        phone = $result.find('.phones').text().trim();
        address = $result.find('.street-address').text().trim();
        const href = $result.find('.business-name').attr('href');
        businessUrl = href ? `https://www.yellowpages.com${href}` : '';

        if (similarity >= 85) {
          foundMatch = true;
        }
      }
    });

    if (!foundMatch || confidence < 70) {
      return {
        directory: 'YellowPages',
        found: false,
        confidence: 'none',
        confidenceScore: 0
      };
    }

    // Calculate confidence based on matches
    let finalConfidence = confidence;
    if (phone && normalizePhone(phone) === normalizePhone(napData.phone)) {
      finalConfidence = Math.min(100, finalConfidence + 15);
    }
    if (address && calculateSimilarity(normalizeAddress(address), normalizeAddress(napData.address)) > 80) {
      finalConfidence = Math.min(100, finalConfidence + 15);
    }

    const confidenceLevel: 'high' | 'medium' | 'low' =
      finalConfidence >= 90 ? 'high' : finalConfidence >= 70 ? 'medium' : 'low';

    return {
      directory: 'YellowPages',
      found: true,
      confidence: confidenceLevel,
      confidenceScore: finalConfidence,
      nap: {
        name: businessName,
        phone: phone || undefined,
        address: address || undefined
      },
      url: businessUrl
    };
  } catch (error) {
    console.error('YellowPages check error:', error);
    return {
      directory: 'YellowPages',
      found: false,
      confidence: 'none',
      confidenceScore: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkBBB(napData: NAPData): Promise<CitationResult> {
  try {
    const searchQuery = encodeURIComponent(napData.businessName);
    const location = encodeURIComponent(`${napData.city}, ${napData.state || ''} ${napData.zip}`);
    const searchUrl = `https://www.bbb.org/search?find_text=${searchQuery}&find_loc=${location}&find_type=Business`;

    const response = await fetchWithRetry(searchUrl);
    if (!response) {
      return {
        directory: 'Better Business Bureau',
        found: false,
        confidence: 'none',
        confidenceScore: 0,
        error: 'Failed to fetch BBB'
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let foundMatch = false;
    let businessName = '';
    let phone = '';
    let address = '';
    let businessUrl = '';
    let confidence = 0;

    // BBB search results
    $('.result-item, .search-result-item').each((_, result) => {
      const $result = $(result);

      const name = $result.find('.business-name, h3 a').text().trim();
      const similarity = calculateSimilarity(normalizeName(name), normalizeName(napData.businessName));

      if (similarity > confidence) {
        confidence = similarity;
        businessName = name;
        phone = $result.find('.phone, [itemprop="telephone"]').text().trim();
        address = $result.find('.address, [itemprop="address"]').text().trim();
        const href = $result.find('h3 a, .business-name').attr('href');
        businessUrl = href ? (href.startsWith('http') ? href : `https://www.bbb.org${href}`) : '';

        if (similarity >= 85) {
          foundMatch = true;
        }
      }
    });

    if (!foundMatch || confidence < 70) {
      return {
        directory: 'Better Business Bureau',
        found: false,
        confidence: 'none',
        confidenceScore: 0
      };
    }

    // Calculate confidence based on matches
    let finalConfidence = confidence;
    if (phone && normalizePhone(phone) === normalizePhone(napData.phone)) {
      finalConfidence = Math.min(100, finalConfidence + 15);
    }
    if (address && calculateSimilarity(normalizeAddress(address), normalizeAddress(napData.address)) > 80) {
      finalConfidence = Math.min(100, finalConfidence + 15);
    }

    const confidenceLevel: 'high' | 'medium' | 'low' =
      finalConfidence >= 90 ? 'high' : finalConfidence >= 70 ? 'medium' : 'low';

    return {
      directory: 'Better Business Bureau',
      found: true,
      confidence: confidenceLevel,
      confidenceScore: finalConfidence,
      nap: {
        name: businessName,
        phone: phone || undefined,
        address: address || undefined
      },
      url: businessUrl
    };
  } catch (error) {
    console.error('BBB check error:', error);
    return {
      directory: 'Better Business Bureau',
      found: false,
      confidence: 'none',
      confidenceScore: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkBingPlaces(napData: NAPData): Promise<CitationResult> {
  try {
    const searchQuery = encodeURIComponent(`${napData.businessName} ${napData.city} ${napData.zip}`);
    const searchUrl = `https://www.bing.com/maps?q=${searchQuery}`;

    const response = await fetchWithRetry(searchUrl);
    if (!response) {
      return {
        directory: 'Bing Places',
        found: false,
        confidence: 'none',
        confidenceScore: 0,
        error: 'Failed to fetch Bing Places'
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Bing Maps is heavily JavaScript-rendered, look for structured data
    let foundMatch = false;
    let businessName = '';
    let confidence = 0;

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || '{}');
        if (data['@type'] === 'Place' || data['@type'] === 'LocalBusiness') {
          const name = data.name || '';
          const similarity = calculateSimilarity(normalizeName(name), normalizeName(napData.businessName));

          if (similarity > confidence) {
            confidence = similarity;
            businessName = name;

            if (similarity >= 85) {
              foundMatch = true;
            }
          }
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    });

    // Also try meta tags
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    if (ogTitle) {
      const similarity = calculateSimilarity(normalizeName(ogTitle), normalizeName(napData.businessName));
      if (similarity > confidence) {
        confidence = similarity;
        businessName = ogTitle;
        if (similarity >= 85) {
          foundMatch = true;
        }
      }
    }

    if (!foundMatch || confidence < 70) {
      return {
        directory: 'Bing Places',
        found: false,
        confidence: 'low',
        confidenceScore: confidence
      };
    }

    const confidenceLevel: 'high' | 'medium' | 'low' =
      confidence >= 90 ? 'high' : confidence >= 70 ? 'medium' : 'low';

    return {
      directory: 'Bing Places',
      found: true,
      confidence: confidenceLevel,
      confidenceScore: confidence,
      nap: {
        name: businessName
      }
    };
  } catch (error) {
    console.error('Bing Places check error:', error);
    return {
      directory: 'Bing Places',
      found: false,
      confidence: 'none',
      confidenceScore: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkManta(napData: NAPData): Promise<CitationResult> {
  try {
    const searchQuery = encodeURIComponent(napData.businessName);
    const location = encodeURIComponent(`${napData.city}, ${napData.state || ''}`);
    const searchUrl = `https://www.manta.com/search?search=${searchQuery}&searchLocation=${location}`;

    const response = await fetchWithRetry(searchUrl);
    if (!response) {
      return {
        directory: 'Manta',
        found: false,
        confidence: 'none',
        confidenceScore: 0,
        error: 'Failed to fetch Manta'
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let foundMatch = false;
    let businessName = '';
    let phone = '';
    let address = '';
    let businessUrl = '';
    let confidence = 0;

    // Manta search results
    $('.row.result-item, .company-result').each((_, result) => {
      const $result = $(result);

      const name = $result.find('.name a, h3 a').text().trim();
      const similarity = calculateSimilarity(normalizeName(name), normalizeName(napData.businessName));

      if (similarity > confidence) {
        confidence = similarity;
        businessName = name;
        phone = $result.find('.phone').text().trim();
        address = $result.find('.address').text().trim();
        const href = $result.find('.name a, h3 a').attr('href');
        businessUrl = href ? (href.startsWith('http') ? href : `https://www.manta.com${href}`) : '';

        if (similarity >= 85) {
          foundMatch = true;
        }
      }
    });

    if (!foundMatch || confidence < 70) {
      return {
        directory: 'Manta',
        found: false,
        confidence: 'none',
        confidenceScore: 0
      };
    }

    // Calculate confidence based on matches
    let finalConfidence = confidence;
    if (phone && normalizePhone(phone) === normalizePhone(napData.phone)) {
      finalConfidence = Math.min(100, finalConfidence + 15);
    }
    if (address && calculateSimilarity(normalizeAddress(address), normalizeAddress(napData.address)) > 80) {
      finalConfidence = Math.min(100, finalConfidence + 15);
    }

    const confidenceLevel: 'high' | 'medium' | 'low' =
      finalConfidence >= 90 ? 'high' : finalConfidence >= 70 ? 'medium' : 'low';

    return {
      directory: 'Manta',
      found: true,
      confidence: confidenceLevel,
      confidenceScore: finalConfidence,
      nap: {
        name: businessName,
        phone: phone || undefined,
        address: address || undefined
      },
      url: businessUrl
    };
  } catch (error) {
    console.error('Manta check error:', error);
    return {
      directory: 'Manta',
      found: false,
      confidence: 'none',
      confidenceScore: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =====================================================
// MAIN CITATION CHECK FUNCTION
// =====================================================

async function checkCitations(napData: NAPData): Promise<CitationCheckResponse> {
  const DIRECTORY_TIMEOUT = 8000; // 8 seconds per directory

  // Run all checks in parallel with timeout
  const checkPromises = [
    checkYelp(napData),
    checkFacebook(napData),
    checkYellowPages(napData),
    checkBBB(napData),
    checkBingPlaces(napData),
    checkManta(napData),
  ].map(promise =>
    Promise.race([
      promise,
      new Promise<CitationResult>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), DIRECTORY_TIMEOUT)
      )
    ]).catch((error): CitationResult => ({
      directory: 'Unknown',
      found: false,
      confidence: 'none',
      confidenceScore: 0,
      error: error instanceof Error ? error.message : 'Timeout'
    }))
  );

  const results = await Promise.allSettled(checkPromises);

  const citations: CitationResult[] = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      const directories = ['Yelp', 'Facebook', 'YellowPages', 'Better Business Bureau', 'Bing Places', 'Manta'];
      return {
        directory: directories[index],
        found: false,
        confidence: 'none',
        confidenceScore: 0,
        error: 'Request failed'
      };
    }
  });

  // Calculate statistics
  const totalChecked = citations.length;
  const foundCitations = citations.filter(c => c.found && c.confidence !== 'none');
  const totalFound = foundCitations.length;
  const foundPercentage = Math.round((totalFound / totalChecked) * 100);

  // Check NAP consistency across found citations
  const napInconsistencies: string[] = [];
  let napConsistent = true;

  if (foundCitations.length > 1) {
    // Check phone consistency
    const phones = foundCitations
      .filter(c => c.nap?.phone)
      .map(c => normalizePhone(c.nap!.phone!));
    const uniquePhones = new Set(phones);

    if (uniquePhones.size > 1) {
      napConsistent = false;
      napInconsistencies.push(`Phone number inconsistency detected across ${uniquePhones.size} directories`);
    }

    // Check address consistency
    const addresses = foundCitations
      .filter(c => c.nap?.address)
      .map(c => normalizeAddress(c.nap!.address!));

    // Compare each address with input address
    const addressSimilarities = addresses.map(addr =>
      calculateSimilarity(addr, normalizeAddress(napData.address))
    );

    const lowSimilarity = addressSimilarities.filter(sim => sim < 80);
    if (lowSimilarity.length > 0) {
      napConsistent = false;
      napInconsistencies.push(`Address variations detected across directories (may hurt local SEO)`);
    }

    // Check name consistency
    const names = foundCitations
      .filter(c => c.nap?.name)
      .map(c => normalizeName(c.nap!.name!));

    const nameSimilarities = names.map(name =>
      calculateSimilarity(name, normalizeName(napData.businessName))
    );

    const lowNameSim = nameSimilarities.filter(sim => sim < 90);
    if (lowNameSim.length > 0) {
      napConsistent = false;
      napInconsistencies.push(`Business name variations detected across directories`);
    }
  }

  // Calculate overall score (0-100)
  const directoryScore = (totalFound / totalChecked) * 70; // 70 points for coverage
  const consistencyScore = napConsistent ? 30 : Math.max(0, 30 - (napInconsistencies.length * 10)); // 30 points for consistency
  const overallScore = Math.round(directoryScore + consistencyScore);

  // Generate insights
  const insights: string[] = [];

  if (totalFound === 0) {
    insights.push('No citations found across any directories - critical issue for local SEO');
  } else if (totalFound < 3) {
    insights.push(`Only found on ${totalFound} out of ${totalChecked} directories - aim for at least 5`);
  } else if (totalFound < 5) {
    insights.push(`Found on ${totalFound} directories - good start, aim for broader coverage`);
  } else {
    insights.push(`Strong citation presence across ${totalFound} directories`);
  }

  // Add confidence-based insights
  const lowConfidence = foundCitations.filter(c => c.confidence === 'low');
  if (lowConfidence.length > 0) {
    insights.push(`${lowConfidence.length} citations have low confidence matches - verify accuracy`);
  }

  // Add directory-specific insights
  const notFound = citations.filter(c => !c.found);
  if (notFound.length > 0 && notFound.length <= 3) {
    insights.push(`Missing from: ${notFound.map(c => c.directory).join(', ')}`);
  }

  // Add NAP inconsistency insights
  insights.push(...napInconsistencies);

  // Weight by directory reliability
  const weightedScore = calculateWeightedScore(citations);

  return {
    totalChecked,
    totalFound,
    foundPercentage,
    napConsistent,
    napInconsistencies,
    citations,
    overallScore: Math.round((overallScore + weightedScore) / 2), // Average of raw and weighted
    insights
  };
}

function calculateWeightedScore(citations: CitationResult[]): number {
  const weights: Record<string, number> = {
    'Yelp': 0.9,
    'Facebook': 0.85,
    'YellowPages': 0.7,
    'Better Business Bureau': 0.8,
    'Bing Places': 0.75,
    'Manta': 0.65
  };

  let totalWeight = 0;
  let earnedWeight = 0;

  citations.forEach(citation => {
    const weight = weights[citation.directory] || 0.5;
    totalWeight += weight;

    if (citation.found && citation.confidence !== 'none') {
      const confidenceMultiplier =
        citation.confidence === 'high' ? 1.0 :
        citation.confidence === 'medium' ? 0.7 :
        0.4;

      earnedWeight += weight * confidenceMultiplier;
    }
  });

  return Math.round((earnedWeight / totalWeight) * 100);
}

// =====================================================
// API ROUTE HANDLER
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { business_name, phone, address, city, zip, state } = body;

    if (!business_name || !phone || !address || !city || !zip) {
      return NextResponse.json(
        { error: 'Missing required fields: business_name, phone, address, city, zip' },
        { status: 400 }
      );
    }

    const napData: NAPData = {
      businessName: business_name,
      phone,
      address,
      city,
      state: state || '',
      zip
    };

    console.log('Starting citation check for:', napData.businessName);

    const startTime = Date.now();
    const result = await checkCitations(napData);
    const duration = Date.now() - startTime;

    console.log(`Citation check completed in ${duration}ms`);
    console.log(`Found: ${result.totalFound}/${result.totalChecked} citations`);
    console.log(`Overall score: ${result.overallScore}/100`);

    return NextResponse.json({
      success: true,
      duration,
      ...result
    });
  } catch (error) {
    console.error('Citation check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        totalChecked: 0,
        totalFound: 0,
        foundPercentage: 0,
        napConsistent: false,
        napInconsistencies: [],
        citations: [],
        overallScore: 0,
        insights: ['Citation check failed due to an error']
      },
      { status: 500 }
    );
  }
}
