// Vercel Serverless Function using Pokemon Price Tracker API
// Faster and more reliable than Pokemon TCG API

const POKEMON_API_URL = 'https://www.pokemonpricetracker.com/api/v2/cards';
const POKEMON_API_KEY = 'pokeprice_free_676abca92fe3786036116f10c15cde25afdd5bfc60feb11a';

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      search,
      limit = 12,
      includeHistory = 'false',
      minPrice,
      maxPrice,
      rarity,
      setId
    } = req.query;

    if (!search && !setId) {
      return res.status(400).json({
        error: 'Search or setId parameter is required'
      });
    }

    // Build cache key
    const cacheKey = JSON.stringify(req.query);
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Cache hit for:', search || setId);
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cached.data);
    }

    console.log('Cache miss - fetching from Pokemon Price Tracker API');
    res.setHeader('X-Cache', 'MISS');

    // Build API URL with parameters
    const apiUrl = new URL(POKEMON_API_URL);

    if (search) apiUrl.searchParams.set('search', search);
    if (setId) apiUrl.searchParams.set('setId', setId);
    if (minPrice) apiUrl.searchParams.set('minPrice', minPrice);
    if (maxPrice) apiUrl.searchParams.set('maxPrice', maxPrice);
    if (rarity) apiUrl.searchParams.set('rarity', rarity);

    apiUrl.searchParams.set('limit', Math.min(limit, 20));
    apiUrl.searchParams.set('includeHistory', includeHistory);
    apiUrl.searchParams.set('sortBy', 'name');

    console.log('Fetching from:', apiUrl.toString());

    // Fetch with 8 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(apiUrl.toString(), {
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${POKEMON_API_KEY}`,
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('API Error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);

        return res.status(response.status).json({
          error: `Pokemon API error: ${response.statusText}`,
          details: errorText.substring(0, 200)
        });
      }

      const data = await response.json();
      console.log('Success! Found', data.data?.length || 0, 'cards');

      // Store in cache
      cache.set(cacheKey, { data, timestamp: Date.now() });

      // Clean old cache entries
      if (cache.size > 100) {
        const entries = Array.from(cache.entries());
        const oldEntries = entries
          .filter(([_, value]) => Date.now() - value.timestamp > CACHE_TTL)
          .map(([key]) => key);
        oldEntries.forEach(key => cache.delete(key));
      }

      return res.status(200).json(data);

    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        console.error('Request timeout after 8s');
        return res.status(504).json({
          error: 'The Pokemon API is taking too long to respond. Please try again.',
          message: 'Request Timeout'
        });
      }

      throw fetchError;
    }

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      error: 'Failed to fetch cards',
      message: error.message
    });
  }
}
