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

    // Fetch from Pokemon TCG API with timeout and retry
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    let lastError;
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        console.log(`Attempt ${attempts}/${maxAttempts}`);

        const response = await fetch(apiUrl.toString(), {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Pokemon-Card-Appraiser/1.0',
            'Accept': 'application/json'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.error('API Error:', response.status, response.statusText);

          // If it's a 404, don't retry
          if (response.status === 404) {
            return res.status(404).json({
              error: 'No cards found',
              data: []
            });
          }

          // If it's a server error, retry
          if (response.status >= 500 && attempts < maxAttempts) {
            console.log('Server error, retrying...');
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
            continue;
          }

          return res.status(response.status).json({
            error: `Pokemon TCG API error: ${response.statusText}`
          });
        }

        const data = await response.json();

        console.log('Success! Found', data.data?.length, 'cards');

        // Return the data
        return res.status(200).json(data);

      } catch (fetchError) {
        lastError = fetchError;

        if (fetchError.name === 'AbortError') {
          console.error('Request timeout');
          if (attempts < maxAttempts) {
            console.log('Retrying after timeout...');
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
        } else {
          console.error('Fetch error:', fetchError);
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
        }
      }
    }

    // All attempts failed
    clearTimeout(timeoutId);

    if (lastError?.name === 'AbortError') {
      return res.status(504).json({
        error: 'Request timeout - Pokemon TCG API is taking too long to respond. Please try again.',
        message: 'Gateway Timeout'
      });
    }

    return res.status(500).json({
      error: 'Failed to fetch cards after multiple attempts',
      message: lastError?.message || 'Unknown error'
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      error: 'Failed to fetch cards',
      message: error.message
    });
  }
}
