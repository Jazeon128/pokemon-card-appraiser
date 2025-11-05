import { Plus, Star, TrendingUp } from 'lucide-react';

export default function CardDisplay({ cards, onAddToCollection }) {
  if (!cards || cards.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No cards found. Try searching for a Pokemon card!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {cards.map((card) => (
        <div key={card.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
          {/* Card Image */}
          <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-4 flex justify-center items-center h-80">
            {card.images?.small ? (
              <img
                src={card.images.small}
                alt={card.name}
                className="max-h-full object-contain rounded-lg"
              />
            ) : (
              <div className="text-gray-400 text-center">
                <Star size={48} className="mx-auto mb-2" />
                <p>No image available</p>
              </div>
            )}
          </div>

          {/* Card Info */}
          <div className="p-4">
            <h3 className="text-xl font-bold text-gray-800 mb-1">{card.name}</h3>
            <p className="text-sm text-gray-600 mb-3">
              {card.set?.name} • {card.number}/{card.set?.printedTotal || card.set?.total}
              {card.rarity && ` • ${card.rarity}`}
            </p>

            {/* Prices */}
            {card.cardmarket?.prices || card.tcgplayer?.prices ? (
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-green-600" />
                  <span className="font-semibold text-gray-700">Market Prices</span>
                </div>

                {/* TCGPlayer Prices */}
                {card.tcgplayer?.prices && (
                  <div className="space-y-1 mb-2">
                    <p className="text-xs text-gray-500 font-semibold">TCGPlayer</p>
                    {card.tcgplayer.prices.holofoil && (
                      <PriceRow label="Holofoil" price={card.tcgplayer.prices.holofoil.market} />
                    )}
                    {card.tcgplayer.prices.reverseHolofoil && (
                      <PriceRow label="Reverse Holo" price={card.tcgplayer.prices.reverseHolofoil.market} />
                    )}
                    {card.tcgplayer.prices.normal && (
                      <PriceRow label="Normal" price={card.tcgplayer.prices.normal.market} />
                    )}
                    {card.tcgplayer.prices.unlimited && (
                      <PriceRow label="Unlimited" price={card.tcgplayer.prices.unlimited.market} />
                    )}
                    {card.tcgplayer.prices['1stEdition'] && (
                      <PriceRow label="1st Edition" price={card.tcgplayer.prices['1stEdition'].market} />
                    )}
                  </div>
                )}

                {/* Cardmarket Prices */}
                {card.cardmarket?.prices && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-semibold">Cardmarket</p>
                    {card.cardmarket.prices.averageSellPrice && (
                      <PriceRow label="Avg Sell" price={card.cardmarket.prices.averageSellPrice} currency="€" />
                    )}
                    {card.cardmarket.prices.trendPrice && (
                      <PriceRow label="Trend" price={card.cardmarket.prices.trendPrice} currency="€" />
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-3 mb-3 text-center">
                <p className="text-sm text-gray-500">No price data available</p>
              </div>
            )}

            {/* Add to Collection Button */}
            <button
              onClick={() => onAddToCollection(card)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Plus size={20} />
              Add to Collection
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PriceRow({ label, price, currency = '$' }) {
  if (!price) return null;

  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{label}:</span>
      <span className="font-semibold text-gray-800">
        {currency}{typeof price === 'number' ? price.toFixed(2) : price}
      </span>
    </div>
  );
}
