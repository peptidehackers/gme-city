#!/usr/bin/env node

/**
 * Test script for Citation Coverage API (GBP Check Only)
 * Tests Google Business Profile detection
 */

// Test 1: With all details (may have wrong address)
const testBusiness1 = {
  business_name: "Smile Boutique Beverly Hills",
  address: "8500 Wilshire Blvd",
  city: "Beverly Hills",
  state: "CA",
  zip: "90211",
  phone: "424-453-3495",
  category: "dentist"
};

// Test 2: Minimal info (just required fields)
const testBusiness2 = {
  business_name: "Starbucks",
  city: "Seattle",
  state: "WA",
  zip: "98101"
};

// Use test 1 for now
const testBusiness = testBusiness1;

async function testCitationAPI() {
  console.log('🧪 Testing Citation Coverage API (GBP Check)');
  console.log('==========================================\n');
  console.log('Test Business:', testBusiness.business_name);
  console.log('Location:', `${testBusiness.city}, ${testBusiness.state}\n`);

  try {
    const startTime = Date.now();

    const response = await fetch('http://localhost:3001/api/citation-coverage', {
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

    console.log(`✅ API Response received in ${duration}ms\n`);
    console.log('📊 RESULTS');
    console.log('==========');
    console.log(`Has Google Business Profile: ${result.hasGBP ? 'Yes ✓' : 'No ✗'}`);
    console.log(`Score: ${result.score}/100\n`);

    if (result.gbpData) {
      console.log('📍 GOOGLE BUSINESS PROFILE DATA');
      console.log('================================');
      console.log(`Name: ${result.gbpData.name}`);
      console.log(`Rating: ${result.gbpData.rating}/5`);
      console.log(`Reviews: ${result.gbpData.reviewCount}`);
      console.log(`Address: ${result.gbpData.address || 'N/A'}`);
      console.log(`Phone: ${result.gbpData.phone || 'N/A'}\n`);
    }

    console.log('💡 INSIGHTS');
    console.log('===========');
    result.insights.forEach((insight, i) => {
      console.log(`${i + 1}. ${insight}`);
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
console.log('⏳ Starting test...\n');
testCitationAPI();
