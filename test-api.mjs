import axios from 'axios';

const POKEMON_API_URL = 'https://api.pokemontcg.io/v2/cards';

async function testAPI() {
  console.log('Testing Pokemon TCG API...\n');

  const queryParams = {
    q: 'name:pikachu*',
    pageSize: 3,
    orderBy: 'name'
  };

  const url = `${POKEMON_API_URL}?${new URLSearchParams(queryParams)}`;
  console.log('URL:', url);

  try {
    const response = await axios.get(POKEMON_API_URL, {
      params: queryParams,
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log('\n✅ SUCCESS!');
    console.log('Status:', response.status);
    console.log('Found cards:', response.data.data.length);
    console.log('\nFirst card:');
    console.log('- Name:', response.data.data[0].name);
    console.log('- Set:', response.data.data[0].set.name);
    console.log('- Image:', response.data.data[0].images.small);

    if (response.data.data[0].tcgplayer?.prices) {
      console.log('- Has pricing data: YES');
    } else {
      console.log('- Has pricing data: NO');
    }

  } catch (error) {
    console.log('\n❌ FAILED');
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    } else if (error.request) {
      console.log('No response received');
    }
  }
}

testAPI();
