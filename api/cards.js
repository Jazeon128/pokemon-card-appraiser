// Vercel Serverless Function supporting multiple Pokemon Card APIs
// Supports: Pokemon TCG API (free, unlimited) and Pokemon Price Tracker API (fast, limited)

const PRICE_TRACKER_URL = 'https://www.pokemonpricetracker.com/api/v2/cards';
const TCG_API_URL = 'https://api.pokemontcg.io/v2/cards';
const POKEMON_API_KEY = process.env.POKEMON_API_KEY;

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
      provider = 'tcg', // Default to TCG API
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

    // Route to appropriate API based on provider
    if (provider === 'pricetracker') {
      return await handlePriceTrackerAPI(req, res, { search, limit, includeHistory, minPrice, maxPrice, rarity, setId });
    } else {
      return await handleTCGAPI(req, res, { search, limit });
    }

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      error: 'Failed to fetch cards',
      message: error.message
    });
  }
}

// Handle Pokemon Price Tracker API
async function handlePriceTrackerAPI(req, res, params) {
  const { search, limit, includeHistory, minPrice, maxPrice, rarity, setId } = params;

  // Check if API key is configured
  if (!POKEMON_API_KEY) {
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'POKEMON_API_KEY environment variable is not set for Price Tracker API'
    });
  }

  try {

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
    const apiUrl = new URL(PRICE_TRACKER_URL);

    if (search) apiUrl.searchParams.set('search', search);
    if (setId) apiUrl.searchParams.set('setId', setId);
    if (minPrice) apiUrl.searchParams.set('minPrice', minPrice);
    if (maxPrice) apiUrl.searchParams.set('maxPrice', maxPrice);
    if (rarity) apiUrl.searchParams.set('rarity', rarity);

    apiUrl.searchParams.set('limit', Math.min(limit, 20));
    apiUrl.searchParams.set('includeHistory', includeHistory);
    apiUrl.searchParams.set('sortBy', 'name');

    console.log('Fetching from:', apiUrl.toString());
    console.log('API Key present:', !!POKEMON_API_KEY);
    console.log('API Key length:', POKEMON_API_KEY?.length || 0);

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

        // Handle specific error codes
        if (response.status === 429) {
          return res.status(429).json({
            error: 'Rate limit exceeded',
            message: 'The API rate limit has been reached. Please wait a moment and try again.',
            details: errorText.substring(0, 500)
          });
        }

        if (response.status === 401 || response.status === 403) {
          return res.status(response.status).json({
            error: 'API authentication error',
            message: 'There is an issue with the API key. Please check your POKEMON_API_KEY environment variable.',
            details: errorText.substring(0, 500)
          });
        }

        return res.status(response.status).json({
          error: `Pokemon API error: ${response.statusText}`,
          message: `HTTP ${response.status}`,
          details: errorText.substring(0, 500)
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
      error: 'Failed to fetch cards from Price Tracker',
      message: error.message
    });
  }
}

// Handle Pokemon TCG API
async function handleTCGAPI(req, res, params) {
  const { search, limit } = params;

  try {
    // Build cache key
    const cacheKey = `tcg_${search}_${limit}`;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Cache hit for TCG API:', search);
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cached.data);
    }

    console.log('Cache miss - fetching from Pokemon TCG API');
    res.setHeader('X-Cache', 'MISS');

    // Build API URL with parameters
    const apiUrl = new URL(TCG_API_URL);
    apiUrl.searchParams.set('q', `name:"${search}*"`);
    apiUrl.searchParams.set('pageSize', Math.min(limit, 20));
    apiUrl.searchParams.set('orderBy', 'name');

    console.log('Fetching from:', apiUrl.toString());

    // Fetch with 10 second timeout (TCG API can be slow)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(apiUrl.toString(), {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('TCG API Error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);

        return res.status(response.status).json({
          error: `Pokemon TCG API error: ${response.statusText}`,
          message: `HTTP ${response.status}`,
          details: errorText.substring(0, 500)
        });
      }

      const data = await response.json();
      console.log('Success! Found', data.data?.length || 0, 'cards from TCG API');

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
        console.error('Request timeout after 10s');
        return res.status(504).json({
          error: 'The Pokemon TCG API is taking too long to respond. Please try again.',
          message: 'Request Timeout'
        });
      }

      throw fetchError;
    }

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      error: 'Failed to fetch cards from TCG API',
      message: error.message
    });
  }
}
