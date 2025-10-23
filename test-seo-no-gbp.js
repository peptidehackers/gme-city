#!/usr/bin/env node

/**
 * Test script for SEO Snapshot API WITHOUT GBP URL
 * Verifies that GBP URL field is truly optional
 */

const testBusiness = {
  business_name: "Smile Boutique Beverly Hills",
  website: "smileboutique.com",
  address: "8500 Wilshire Blvd # 505",
  city: "Beverly Hills",
  zip: "90211",
  phone: "(424) 453-3495",
  category: "dentist"
  // NOTE: gbp_url is intentionally omitted to test optional behavior
};

async function testSEOSnapshotWithoutGBP() {
  console.log('\n🧪 Testing SEO Snapshot API WITHOUT GBP URL');
  console.log('==============================================\n');
  console.log('Business:', testBusiness.business_name);
  console.log('Website:', testBusiness.website);
  console.log('GBP URL provided: NO (testing optional behavior)\n');
  console.log('⏱️  Starting timer...\n');

  try {
    const startTime = Date.now();

    const response = await fetch('http://localhost:3000/api/seo-score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testBusiness)
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, response.statusText);
      console.error('Error details:', errorText);
      return;
    }

    const result = await response.json();

    console.log(`\n✅ API Response received in ${duration}ms (${(duration/1000).toFixed(1)}s)\n`);
    console.log('📊 RESULTS');
    console.log('==========');
    console.log(`Combined Score: ${result.combined}/100`);
    console.log(`Local SEO Score: ${result.local.score}/100`);
    console.log(`Onsite SEO Score: ${result.onsite.score}/100\n`);

    console.log('🌍 LOCAL SEO INSIGHTS');
    console.log('=====================');
    if (result.local.insights && result.local.insights.length > 0) {
      result.local.insights.forEach((insight, i) => {
        console.log(`${i + 1}. ${insight}`);
      });
    } else {
      console.log('No local issues found!');
    }

    console.log('\n🌐 ONSITE SEO INSIGHTS');
    console.log('======================');
    if (result.onsite.insights && result.onsite.insights.length > 0) {
      result.onsite.insights.forEach((insight, i) => {
        console.log(`${i + 1}. ${insight}`);
      });
    } else {
      console.log('No onsite issues found!');
    }

    console.log('\n✅ SUCCESS: GBP URL field is working as optional!');
    console.log('The API correctly handled the request without gbp_url field.\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
console.log('⏳ Starting test without GBP URL...\n');
testSEOSnapshotWithoutGBP();
