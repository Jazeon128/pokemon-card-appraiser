import { useState, useEffect } from 'react';
import axios from 'axios';
import SearchBar from './components/SearchBar';
import CardDisplay from './components/CardDisplay';
import CollectionList from './components/CollectionList';
import { Sparkles } from 'lucide-react';

const POKEMON_API_URL = 'https://www.pokemonpricetracker.com/api/v2/cards';
const POKEMON_API_KEY = 'pokeprice_free_676abca92fe3786036116f10c15cde25afdd5bfc60feb11a';

function App() {
  const [cards, setCards] = useState([]);
  const [collection, setCollection] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCollection, setShowCollection] = useState(false);

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
  }, []);

  // Save collection to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pokemonCollection', JSON.stringify(collection));
  }, [collection]);

  const handleSearch = async (searchTerm) => {
    setIsLoading(true);
    setError(null);
    setShowCollection(false);

    try {
      const response = await axios.get(POKEMON_API_URL, {
        params: {
          name: searchTerm,
          pageSize: 12,
        },
        headers: {
          'Authorization': `Bearer ${POKEMON_API_KEY}`
        }
      });

      console.log('API Response:', response.data);

      if (!response.data.data || response.data.data.length === 0) {
        setError(`No cards found matching "${searchTerm}". Try a different search term.`);
        setCards([]);
      } else {
        setCards(response.data.data);
      }
    } catch (err) {
      console.error('Search error:', err);
      console.error('Error details:', err.response?.data);
      setError(`API Error: ${err.response?.data?.message || err.message || 'Failed to fetch cards. Please try again.'}`);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles size={32} className="text-blue-500" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Pokemon Card Appraiser
              </h1>
            </div>
            <button
              onClick={() => setShowCollection(!showCollection)}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              {showCollection ? 'Search Cards' : `My Collection (${collection.length})`}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!showCollection ? (
          <>
            {/* Search Section */}
            <div className="mb-8">
              <SearchBar onSearch={handleSearch} isLoading={isLoading} />
              {error && (
                <div className="max-w-2xl mx-auto mt-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
                  {error}
                </div>
              )}
            </div>

            {/* Results Section */}
            {cards.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  Search Results ({cards.length} cards)
                </h2>
                <CardDisplay cards={cards} onAddToCollection={handleAddToCollection} />
              </div>
            )}

            {/* Welcome Message */}
            {cards.length === 0 && !error && !isLoading && (
              <div className="max-w-3xl mx-auto text-center py-12">
                <h2 className="text-4xl font-bold text-gray-800 mb-4">
                  Welcome to Pokemon Card Appraiser! 🎴
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  Search for any Pokemon card to see current market prices and add them to your collection.
                </p>
                <div className="grid md:grid-cols-3 gap-6 text-left">
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="text-3xl mb-2">🔍</div>
                    <h3 className="font-bold text-gray-800 mb-2">Search Cards</h3>
                    <p className="text-gray-600 text-sm">
                      Find any Pokemon card by name and see detailed pricing information
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="text-3xl mb-2">💰</div>
                    <h3 className="font-bold text-gray-800 mb-2">Track Prices</h3>
                    <p className="text-gray-600 text-sm">
                      View current market prices from TCGPlayer and Cardmarket
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="text-3xl mb-2">📦</div>
                    <h3 className="font-bold text-gray-800 mb-2">Build Collection</h3>
                    <p className="text-gray-600 text-sm">
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
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-gray-600">
          <p className="text-sm">
            Powered by{' '}
            <a
              href="https://www.pokemonpricetracker.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 font-semibold"
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
