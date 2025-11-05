import { Trash2, DollarSign, Package } from 'lucide-react';

export default function CollectionList({ collection, onRemoveCard }) {
  if (!collection || collection.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <Package size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Your Collection is Empty</h3>
        <p className="text-gray-500">Search for cards and add them to start tracking your collection!</p>
      </div>
    );
  }

  // Calculate total value
  const totalValue = collection.reduce((sum, card) => {
    const price = getCardPrice(card);
    return sum + (price || 0);
  }, 0);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">My Collection</h2>
        <div className="bg-green-100 px-4 py-2 rounded-lg">
          <div className="flex items-center gap-2">
            <DollarSign size={20} className="text-green-600" />
            <div>
              <p className="text-xs text-gray-600">Total Value</p>
              <p className="text-lg font-bold text-green-600">${totalValue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {collection.map((card, index) => {
          const price = getCardPrice(card);

          return (
            <div
              key={`${card.id}-${index}`}
              className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
            >
              {/* Card Image */}
              <img
                src={card.imageUrl || card.images?.small || '/placeholder.png'}
                alt={card.name}
                className="w-16 h-22 object-contain rounded"
              />

              {/* Card Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-800 truncate">{card.name}</h4>
                <p className="text-sm text-gray-600 truncate">
                  {card.setName || card.set?.name} • #{card.cardNumber || card.number}
                </p>
                {price ? (
                  <p className="text-sm font-semibold text-green-600 mt-1">
                    ${price.toFixed(2)}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 mt-1">No price data</p>
                )}
              </div>

              {/* Remove Button */}
              <button
                onClick={() => onRemoveCard(index)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove from collection"
              >
                <Trash2 size={20} />
              </button>
            </div>
          );
        })}
      </div>

      {collection.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            {collection.length} card{collection.length !== 1 ? 's' : ''} in collection
          </p>
        </div>
      )}
    </div>
  );
}

// Helper function to get the best available price for a card
function getCardPrice(card) {
  // Try Pokemon Price Tracker format first
  if (card.prices) {
    if (card.prices.market) return card.prices.market;
    if (card.prices.mid) return card.prices.mid;
    if (card.prices.high) return card.prices.high;
    if (card.prices.low) return card.prices.low;
  }

  // Try TCGPlayer prices
  if (card.tcgplayer?.prices) {
    const prices = card.tcgplayer.prices;

    // Check various price types in order of preference
    if (prices.holofoil?.market) return prices.holofoil.market;
    if (prices['1stEdition']?.market) return prices['1stEdition'].market;
    if (prices.unlimited?.market) return prices.unlimited.market;
    if (prices.reverseHolofoil?.market) return prices.reverseHolofoil.market;
    if (prices.normal?.market) return prices.normal.market;
  }

  // Fallback to Cardmarket prices
  if (card.cardmarket?.prices) {
    const prices = card.cardmarket.prices;
    if (prices.averageSellPrice) return prices.averageSellPrice;
    if (prices.trendPrice) return prices.trendPrice;
  }

  return null;
}
