import { useState, useEffect } from 'react';
import axios from 'axios';
import SearchBar from './components/SearchBar';
import CardDisplay from './components/CardDisplay';
import CollectionList from './components/CollectionList';
import { Sparkles, Settings } from 'lucide-react';

// Use our serverless function to avoid CORS issues
const POKEMON_API_URL = '/api/cards';

function App() {
  const [cards, setCards] = useState([]);
  const [collection, setCollection] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCollection, setShowCollection] = useState(false);
  const [apiProvider, setApiProvider] = useState('tcg'); // 'tcg' or 'pricetracker'
  const [showSettings, setShowSettings] = useState(false);

  // Load collection from localStorage on mount
  useEffect(() => {
    const savedCollection = localStorage.getItem('pokemonCollection');
    if (savedCollection) {
      try {
        setCollection(JSON.parse(savedCollection));
      } catch (e) {
        console.error('Failed to load collection:', e);
      }
    }

    // Load API provider preference
    const savedProvider = localStorage.getItem('apiProvider');
    if (savedProvider) {
      setApiProvider(savedProvider);
    }
  }, []);

  // Save collection to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pokemonCollection', JSON.stringify(collection));
  }, [collection]);

  // Save API provider preference
  useEffect(() => {
    localStorage.setItem('apiProvider', apiProvider);
  }, [apiProvider]);

  const handleSearch = async (searchTerm, filters = {}) => {
    setIsLoading(true);
    setError(null);
    setShowCollection(false);

    const queryParams = {
      search: searchTerm,
      limit: 12,
      provider: apiProvider, // Add API provider
      includeHistory: filters.includeHistory || false
    };

    // Add optional filters if provided (only for pricetracker)
    if (apiProvider === 'pricetracker') {
      if (filters.minPrice) queryParams.minPrice = filters.minPrice;
      if (filters.maxPrice) queryParams.maxPrice = filters.maxPrice;
      if (filters.rarity) queryParams.rarity = filters.rarity;
    }

    const apiUrl = `${POKEMON_API_URL}?${new URLSearchParams(queryParams)}`;

    console.log('=== API Request ===');
    console.log('Provider:', apiProvider);
    console.log('URL:', apiUrl);
    console.log('Params:', queryParams);
    console.log('Filters:', filters);

    try {
      const response = await axios.get(POKEMON_API_URL, {
        params: queryParams
      });

      console.log('=== API Response Success ===');
      console.log('Status:', response.status);
      console.log('Data:', response.data);
      console.log('Card count:', response.data.data?.length);

      if (!response.data.data || response.data.data.length === 0) {
        setError(`No cards found matching "${searchTerm}". Try a different search term or adjust your filters.`);
        setCards([]);
      } else {
        setCards(response.data.data);
      }
    } catch (err) {
      console.error('=== API Error ===');
      console.error('Error object:', err);
      console.error('Error message:', err.message);
      console.error('Error response:', err.response);
      console.error('Error status:', err.response?.status);
      console.error('Error data:', err.response?.data);
      console.error('Error config:', err.config);

      let errorMessage = 'Failed to fetch cards. ';

      if (err.response) {
        // Server responded with error
        errorMessage += `Server error (${err.response.status}): ${err.response.data?.message || 'Unknown error'}`;
      } else if (err.request) {
        // Request made but no response
        errorMessage += `Network error: No response from server. Check your internet connection.`;
      } else {
        // Something else happened
        errorMessage += `Error: ${err.message}`;
      }

      setError(errorMessage);
      setCards([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCollection = (card) => {
    // Check if card is already in collection
    const isAlreadyInCollection = collection.some(c => c.id === card.id);

    if (isAlreadyInCollection) {
      alert('This card is already in your collection!');
      return;
    }

    setCollection([...collection, card]);
    // Show a brief success message
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    notification.textContent = `Added ${card.name} to collection!`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };

  const handleRemoveCard = (index) => {
    const newCollection = collection.filter((_, i) => i !== index);
    setCollection(newCollection);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles size={28} className="text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                Pokemon Card Appraiser
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all active:scale-95"
                title="Settings"
              >
                <Settings size={22} />
              </button>
              <button
                onClick={() => setShowCollection(!showCollection)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-5 rounded-lg transition-all hover:shadow-md active:scale-95"
              >
                {showCollection ? 'Search Cards' : `My Collection (${collection.length})`}
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="mt-4 p-4 bg-slate-50 border-2 border-gray-200 rounded-lg">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Settings size={18} />
                API Settings
              </h3>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer p-3 border-2 border-gray-200 rounded-lg hover:border-blue-400 transition-colors bg-white">
                  <input
                    type="radio"
                    name="apiProvider"
                    value="tcg"
                    checked={apiProvider === 'tcg'}
                    onChange={(e) => setApiProvider(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">Pokemon TCG API</div>
                    <div className="text-sm text-gray-600">Free, unlimited requests, no API key needed</div>
                    <div className="text-xs text-gray-500 mt-1">⚠️ May be slower during high traffic</div>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer p-3 border-2 border-gray-200 rounded-lg hover:border-blue-400 transition-colors bg-white">
                  <input
                    type="radio"
                    name="apiProvider"
                    value="pricetracker"
                    checked={apiProvider === 'pricetracker'}
                    onChange={(e) => setApiProvider(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">Pokemon Price Tracker API</div>
                    <div className="text-sm text-gray-600">Faster responses, advanced filters</div>
                    <div className="text-xs text-gray-500 mt-1">⚠️ Limited to 100 requests/day on free tier</div>
                  </div>
                </label>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                💡 Your preference is saved automatically
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {!showCollection ? (
          <>
            {/* Search Section */}
            <div className="mb-10">
              <SearchBar
                onSearch={handleSearch}
                isLoading={isLoading}
                apiProvider={apiProvider}
              />
              {error && (
                <div className="max-w-4xl mx-auto mt-4 p-4 bg-red-50 border-2 border-red-200 text-red-800 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Results Section */}
            {cards.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Found {cards.length} {cards.length === 1 ? 'card' : 'cards'}
                </h2>
                <CardDisplay cards={cards} onAddToCollection={handleAddToCollection} />
              </div>
            )}

            {/* Welcome Message */}
            {cards.length === 0 && !error && !isLoading && (
              <div className="max-w-4xl mx-auto text-center py-16">
                <h2 className="text-3xl font-bold text-gray-900 mb-3">
                  Welcome to Pokemon Card Appraiser
                </h2>
                <p className="text-base text-gray-600 mb-12">
                  Search for Pokemon cards to see current market prices and build your collection.
                </p>
                <div className="grid md:grid-cols-3 gap-5 text-left">
                  <div className="bg-white p-6 rounded-xl border-2 border-gray-200 hover:border-blue-300 transition-colors">
                    <div className="text-3xl mb-3">🔍</div>
                    <h3 className="font-bold text-gray-900 mb-2 text-base">Search Cards</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Find any Pokemon card by name and see detailed pricing information
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border-2 border-gray-200 hover:border-blue-300 transition-colors">
                    <div className="text-3xl mb-3">💰</div>
                    <h3 className="font-bold text-gray-900 mb-2 text-base">Track Prices</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      View real-time market prices and historical trends
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border-2 border-gray-200 hover:border-blue-300 transition-colors">
                    <div className="text-3xl mb-3">📦</div>
                    <h3 className="font-bold text-gray-900 mb-2 text-base">Build Collection</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Add cards to your collection and track total value
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <CollectionList collection={collection} onRemoveCard={handleRemoveCard} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center">
          <p className="text-sm text-gray-600">
            Powered by{' '}
            <a
              href="https://www.pokemonpricetracker.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
            >
              Pokemon Price Tracker API
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
