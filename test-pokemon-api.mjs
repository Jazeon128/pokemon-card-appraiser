import fetch from 'node-fetch';

async function testPokemonAPI() {
  console.log('Testing Pokemon TCG API directly...\n');

  const searches = ['pikachu', 'charizard', 'mewtwo'];

  for (const search of searches) {
    const url = `https://api.pokemontcg.io/v2/cards?q=name:${search}*&pageSize=3&orderBy=name`;
    console.log(`\nTesting: ${search}`);
    console.log('URL:', url);

    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Pokemon-Card-Appraiser/1.0',
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;

      console.log(`✓ Status: ${response.status}`);
      console.log(`✓ Time: ${elapsed}ms`);

      if (response.ok) {
        const data = await response.json();
        console.log(`✓ Found ${data.data.length} cards`);
        if (data.data.length > 0) {
          console.log(`✓ First card: ${data.data[0].name}`);
        }
      } else {
        console.log(`✗ Error: ${response.statusText}`);
        const text = await response.text();
        console.log(`✗ Response: ${text.substring(0, 200)}`);
      }

    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.log(`✗ FAILED after ${elapsed}ms`);
      console.log(`✗ Error: ${error.message}`);
      if (error.name === 'AbortError') {
        console.log('✗ Request timed out (10s)');
      }
    }
  }
}

testPokemonAPI();
