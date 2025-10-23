#!/usr/bin/env node

/**
 * Test script for Keyword Opportunity Scanner API
 * Tests DataForSEO Ranked Keywords integration
 */

// Test with a website that has limited keyword data (to test fallback)
const testBusiness = {
  website: "smileboutiquegroup.com",
  category: "dentist",
  city: "Beverly Hills"
};

async function testKeywordScanner() {
  console.log('\n🧪 Testing Keyword Opportunity Scanner');
  console.log('======================================\n');
  console.log('Website:', testBusiness.website);
  console.log('Category:', testBusiness.category);
  console.log('City:', testBusiness.city);
  console.log('\n⏱️  Starting keyword research...\n');

  try {
    const startTime = Date.now();

    const response = await fetch('http://localhost:3000/api/keywords', {
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

    if (!result.success) {
      console.error('❌ Error:', result.error);
      return;
    }

    console.log('📊 KEYWORD OPPORTUNITIES');
    console.log('========================');
    console.log(`Found ${result.keywords.length} keywords\n`);

    if (result.keywords.length > 0) {
      // Group by opportunity type
      const ranking = result.keywords.filter(k => k.opportunity === 'ranking');
      const improve = result.keywords.filter(k => k.opportunity === 'improve');
      const gap = result.keywords.filter(k => k.opportunity === 'gap');

      if (ranking.length > 0) {
        console.log('✅ RANKING WELL (Positions 1-3):');
        ranking.forEach(kw => {
          console.log(`   • "${kw.keyword}" - ${kw.volume.toLocaleString()} searches/mo (Rank #${kw.ranking})`);
        });
        console.log('');
      }

      if (improve.length > 0) {
        console.log('⚠️  CAN IMPROVE (Positions 4-20):');
        improve.forEach(kw => {
          console.log(`   • "${kw.keyword}" - ${kw.volume.toLocaleString()} searches/mo (Rank #${kw.ranking})`);
        });
        console.log('');
      }

      if (gap.length > 0) {
        console.log('🔵 OPPORTUNITIES (Not ranking or low position):');
        gap.forEach(kw => {
          const rankText = kw.ranking ? ` (Rank #${kw.ranking})` : '';
          console.log(`   • "${kw.keyword}" - ${kw.volume.toLocaleString()} searches/mo${rankText}`);
        });
        console.log('');
      }

      // Show summary
      console.log('📈 SUMMARY');
      console.log('=========');
      console.log(`Total Keywords: ${result.keywords.length}`);
      console.log(`Ranking Well: ${ranking.length}`);
      console.log(`Can Improve: ${improve.length}`);
      console.log(`Opportunities: ${gap.length}`);

      const totalVolume = result.keywords.reduce((sum, kw) => sum + kw.volume, 0);
      console.log(`Total Monthly Search Volume: ${totalVolume.toLocaleString()}`);
    } else {
      console.log('No keywords found for this website.');
      console.log('This may be because the site is new or has limited organic search presence.');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
console.log('⏳ Starting keyword scanner test...\n');
testKeywordScanner();
