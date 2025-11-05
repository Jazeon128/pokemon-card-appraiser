// Vercel Serverless Function with caching to reduce API calls
// Simple in-memory cache (resets on cold starts)

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
    const { search, limit = 12 } = req.query;

    if (!search) {
      return res.status(400).json({ error: 'Search parameter is required' });
    }

    // Check cache
    const cacheKey = `${search}-${limit}`;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Cache hit for:', search);
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cached.data);
    }

    console.log('Cache miss for:', search);
    res.setHeader('X-Cache', 'MISS');

    // Build Pokemon TCG API URL
    const apiUrl = new URL('https://api.pokemontcg.io/v2/cards');
    apiUrl.searchParams.set('q', `name:${search}*`);
    apiUrl.searchParams.set('pageSize', limit);
    apiUrl.searchParams.set('orderBy', 'name');

    console.log('Fetching from:', apiUrl.toString());

    // Fetch with timeout (9s to stay under Vercel's 10s limit)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000); // 9 second timeout

    try {
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

        if (response.status === 404) {
          const emptyResult = { data: [], count: 0, totalCount: 0 };
          // Cache empty results too
          cache.set(cacheKey, { data: emptyResult, timestamp: Date.now() });
          return res.status(200).json(emptyResult);
        }

        return res.status(response.status).json({
          error: `Pokemon TCG API error: ${response.statusText}`
        });
      }

      const data = await response.json();

      console.log('Success! Found', data.data?.length, 'cards');

      // Store in cache
      cache.set(cacheKey, { data, timestamp: Date.now() });

      // Clean old cache entries (simple cleanup)
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
        console.error('Request timeout after 9s');
        return res.status(504).json({
          error: 'The Pokemon API is taking too long to respond. Please try again in a moment.',
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
