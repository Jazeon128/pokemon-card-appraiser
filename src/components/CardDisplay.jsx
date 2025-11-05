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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-7xl mx-auto mb-8">
      {cards.map((card) => (
        <div key={card.id} className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:border-blue-400 hover:shadow-lg transition-all">
          {/* Card Image */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex justify-center items-center h-64">
            {card.imageUrl || card.images?.small ? (
              <img
                src={card.imageUrl || card.images?.small}
                alt={card.name}
                className="max-h-full w-auto object-contain drop-shadow-md"
              />
            ) : (
              <div className="text-gray-400 text-center">
                <Star size={40} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No image</p>
              </div>
            )}
          </div>

          {/* Card Info */}
          <div className="p-4 space-y-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1">{card.name}</h3>
              <p className="text-xs text-gray-500">
                {card.setName || card.set?.name}
                {(card.cardNumber || card.number) && ` • #${card.cardNumber || card.number}`}
              </p>
              {card.rarity && (
                <p className="text-xs text-blue-600 font-medium mt-1">{card.rarity}</p>
              )}
            </div>

            {/* Prices */}
            {card.prices || card.cardmarket?.prices || card.tcgplayer?.prices ? (
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp size={14} className="text-emerald-600" />
                  <span className="text-xs font-semibold text-gray-700">Market Price</span>
                </div>

                {/* Pokemon Price Tracker Format */}
                {card.prices && (
                  <div className="space-y-1.5">
                    {card.prices.market && (
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-600">Current</span>
                        <span className="text-lg font-bold text-emerald-600">
                          ${typeof card.prices.market === 'number' ? card.prices.market.toFixed(2) : card.prices.market}
                        </span>
                      </div>
                    )}
                    {(card.prices.low || card.prices.high) && (
                      <div className="flex justify-between text-xs text-gray-500 pt-1 border-t border-slate-200">
                        {card.prices.low && <span>Low: ${card.prices.low.toFixed(2)}</span>}
                        {card.prices.high && <span>High: ${card.prices.high.toFixed(2)}</span>}
                      </div>
                    )}
                  </div>
                )}

                {/* TCGPlayer Prices */}
                {card.tcgplayer?.prices && !card.prices && (
                  <div className="space-y-1">
                    {card.tcgplayer.prices.holofoil && (
                      <PriceRow label="Holofoil" price={card.tcgplayer.prices.holofoil.market} />
                    )}
                    {card.tcgplayer.prices.normal && (
                      <PriceRow label="Normal" price={card.tcgplayer.prices.normal.market} />
                    )}
                  </div>
                )}

                {/* Cardmarket Prices */}
                {card.cardmarket?.prices && !card.prices && (
                  <div className="space-y-1">
                    {card.cardmarket.prices.averageSellPrice && (
                      <PriceRow label="Average" price={card.cardmarket.prices.averageSellPrice} currency="€" />
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-center">
                <p className="text-xs text-gray-500">No pricing data</p>
              </div>
            )}

            {/* Add to Collection Button */}
            <button
              onClick={() => onAddToCollection(card)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all hover:shadow-md active:scale-95"
            >
              <Plus size={18} />
              <span className="text-sm">Add to Collection</span>
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
