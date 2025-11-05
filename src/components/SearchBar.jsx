import { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

export default function SearchBar({ onSearch, isLoading, apiProvider }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    includeHistory: false,
    minPrice: '',
    maxPrice: '',
    rarity: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      onSearch(searchTerm.trim(), filters);
    }
  };

  const rarities = [
    'Common',
    'Uncommon',
    'Rare',
    'Rare Holo',
    'Rare Holo EX',
    'Rare Holo GX',
    'Rare Holo V',
    'Rare Holo VMAX',
    'Rare Ultra',
    'Rare Secret'
  ];

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto mb-8">
      {/* Search Input */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search for a Pokemon card..."
            className="w-full px-5 py-3 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            disabled={isLoading}
          />
        </div>
        {apiProvider === 'pricetracker' && (
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 ${showFilters ? 'bg-blue-500 text-white' : 'bg-white border-2 border-gray-300 text-gray-700'} rounded-lg hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all flex items-center gap-2`}
            title="Filters"
          >
            <SlidersHorizontal size={20} />
            <span className="hidden sm:inline text-sm font-medium">Filters</span>
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading || !searchTerm.trim()}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium"
        >
          <Search size={20} />
          <span className="hidden sm:inline">Search</span>
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-4 shadow-lg">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <SlidersHorizontal size={20} />
            Search Filters
          </h3>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Price History Toggle */}
            <div className="col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.includeHistory}
                  onChange={(e) => setFilters({ ...filters, includeHistory: e.target.checked })}
                  className="w-5 h-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-200"
                />
                <div>
                  <span className="font-semibold text-gray-800">Include Price History</span>
                  <p className="text-sm text-gray-600">Show historical price trends and charts</p>
                </div>
              </label>
            </div>

            {/* Rarity Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Rarity
              </label>
              <select
                value={filters.rarity}
                onChange={(e) => setFilters({ ...filters, rarity: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="">All Rarities</option>
                {rarities.map(rarity => (
                  <option key={rarity} value={rarity}>{rarity}</option>
                ))}
              </select>
            </div>

            {/* Min Price */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Minimum Price ($)
              </label>
              <input
                type="number"
                value={filters.minPrice}
                onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Max Price */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Maximum Price ($)
              </label>
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                placeholder="1000.00"
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Clear Filters */}
            <div className="col-span-2">
              <button
                type="button"
                onClick={() => setFilters({ includeHistory: false, minPrice: '', maxPrice: '', rarity: '' })}
                className="text-sm text-blue-500 hover:text-blue-700 font-semibold"
              >
                Clear all filters
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <p className="text-center text-gray-600 mt-2">Searching...</p>
      )}
    </form>
  );
}
