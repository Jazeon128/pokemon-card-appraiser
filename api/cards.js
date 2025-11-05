// Vercel Serverless Function to proxy Pokemon TCG API requests
// This avoids CORS issues by making the request from the server

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { search, limit = 12 } = req.query;

    if (!search) {
      return res.status(400).json({ error: 'Search parameter is required' });
    }

    // Build Pokemon TCG API URL
    const apiUrl = new URL('https://api.pokemontcg.io/v2/cards');
    apiUrl.searchParams.set('q', `name:${search}*`);
    apiUrl.searchParams.set('pageSize', limit);
    apiUrl.searchParams.set('orderBy', 'name');

    console.log('Fetching from:', apiUrl.toString());

    // Fetch from Pokemon TCG API
    const response = await fetch(apiUrl.toString(), {
      headers: {
        'User-Agent': 'Pokemon-Card-Appraiser/1.0'
      }
    });

    if (!response.ok) {
      console.error('API Error:', response.status, response.statusText);
      return res.status(response.status).json({
        error: `Pokemon TCG API error: ${response.statusText}`
      });
    }

    const data = await response.json();

    console.log('Success! Found', data.data?.length, 'cards');

    // Return the data
    return res.status(200).json(data);

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      error: 'Failed to fetch cards',
      message: error.message
    });
  }
}
