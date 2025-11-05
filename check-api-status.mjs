import https from 'https';

function checkAPI(url, name) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const req = https.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Pokemon-Card-Appraiser/1.0',
        'Accept': 'application/json'
      }
    }, (res) => {
      const elapsed = Date.now() - startTime;

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          name,
          status: res.statusCode,
          time: elapsed,
          success: res.statusCode === 200,
          dataLength: data.length,
          error: null
        });
      });
    });

    req.on('error', (error) => {
      const elapsed = Date.now() - startTime;
      resolve({
        name,
        status: null,
        time: elapsed,
        success: false,
        dataLength: 0,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name,
        status: null,
        time: 10000,
        success: false,
        dataLength: 0,
        error: 'Timeout after 10s'
      });
    });
  });
}

async function testAPIs() {
  console.log('🔍 Testing Pokemon Card APIs...\n');
  console.log('='.repeat(60));

  const tests = [
    {
      name: 'Pokemon TCG API - Base',
      url: 'https://api.pokemontcg.io/v2/cards?pageSize=1'
    },
    {
      name: 'Pokemon TCG API - Pikachu Search',
      url: 'https://api.pokemontcg.io/v2/cards?q=name:pikachu&pageSize=1'
    },
    {
      name: 'Pokemon TCG API - Sets Endpoint',
      url: 'https://api.pokemontcg.io/v2/sets?pageSize=1'
    }
  ];

  const results = [];

  for (const test of tests) {
    console.log(`\nTesting: ${test.name}`);
    console.log(`URL: ${test.url}`);

    const result = await checkAPI(test.url, test.name);
    results.push(result);

    if (result.success) {
      console.log(`✅ SUCCESS - Status: ${result.status} - Time: ${result.time}ms - Data: ${result.dataLength} bytes`);
    } else if (result.error) {
      console.log(`❌ FAILED - Error: ${result.error} - Time: ${result.time}ms`);
    } else {
      console.log(`❌ FAILED - Status: ${result.status} - Time: ${result.time}ms`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 SUMMARY:');
  console.log('='.repeat(60));

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${successCount} ✅`);
  console.log(`Failed: ${failCount} ❌`);

  if (successCount === 0) {
    console.log('\n🚨 CONCLUSION: Pokemon TCG API appears to be DOWN or BLOCKED');
    console.log('   - All tests failed');
    console.log('   - This could be due to:');
    console.log('     1. API is completely down');
    console.log('     2. Network/firewall blocking the requests');
    console.log('     3. DNS resolution issues');
  } else if (successCount === results.length) {
    console.log('\n✅ CONCLUSION: Pokemon TCG API is UP and responding normally');
  } else {
    console.log('\n⚠️  CONCLUSION: Pokemon TCG API is partially working');
    console.log('   - Some endpoints working, others failing');
  }

  console.log('\n' + '='.repeat(60));
}

testAPIs().catch(console.error);
