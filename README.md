# Pokemon Card Appraiser 🎴

A beautiful, fast, and responsive web application for searching Pokemon cards, viewing current market prices, and tracking your collection value.

![Pokemon Card Appraiser](https://img.shields.io/badge/Built%20with-React%20%2B%20Vite-blue)
![Tailwind CSS](https://img.shields.io/badge/Styled%20with-Tailwind%20CSS-38B2AC)

## Features

- **🔍 Search Pokemon Cards** - Find any Pokemon card by name with instant results
- **💰 Real-time Pricing** - View current market prices from TCGPlayer and Cardmarket
- **📦 Collection Tracking** - Add cards to your collection and track total value
- **💾 Persistent Storage** - Your collection is saved locally in your browser
- **📱 Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **⚡ Lightning Fast** - Built with Vite for optimal performance

## Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Next-generation frontend tooling
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client for API requests
- **Lucide React** - Beautiful & consistent icons
- **Pokemon Price Tracker API** - Real card data and pricing with 23,000+ cards

## Quick Start

### Prerequisites

- Node.js 16+ and npm installed on your machine

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd pokemon-card-appraiser

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be running at `http://localhost:5173`

### Build for Production

```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

## Deployment

### Deploy to Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

### Deploy to Netlify

```bash
# Build the project
npm run build

# Deploy the dist folder to Netlify
```

## Usage

1. **Search for Cards**: Type a Pokemon name in the search bar (e.g., "Charizard", "Pikachu VMAX")
2. **View Prices**: Browse through search results to see current market prices
3. **Add to Collection**: Click "Add to Collection" on any card
4. **Track Value**: View your collection and total value by clicking "My Collection"
5. **Manage Collection**: Remove cards from your collection as needed

## API Information

This app uses the [Pokemon Price Tracker API](https://www.pokemonpricetracker.com/) which provides:
- Comprehensive card data for 23,000+ cards
- Current market prices with historical data
- Card images and details
- PSA pricing data
- Authenticated with API key (included in the app)
- Free tier with generous rate limits

## Project Structure

```
pokemon-card-appraiser/
├── src/
│   ├── components/
│   │   ├── SearchBar.jsx       # Search input component
│   │   ├── CardDisplay.jsx     # Card grid display
│   │   └── CollectionList.jsx  # Collection tracker
│   ├── App.jsx                 # Main app component
│   ├── index.css               # Tailwind imports
│   └── main.jsx                # React entry point
├── public/                     # Static assets
├── index.html                  # HTML template
├── package.json                # Dependencies
├── vite.config.js              # Vite configuration
├── tailwind.config.js          # Tailwind configuration
└── postcss.config.js           # PostCSS configuration
```

## Features in Detail

### Search Functionality
- Real-time search with loading states
- Error handling for network issues
- Results sorted by release date
- Shows up to 12 cards per search

### Price Display
- TCGPlayer prices (Holofoil, Normal, Reverse Holo, 1st Edition)
- Cardmarket prices (Average Sell, Trend Price)
- Automatic currency formatting
- "No price data" fallback for cards without pricing

### Collection Management
- Add cards with duplicate detection
- Remove cards with confirmation
- Automatic total value calculation
- Persistent storage using localStorage
- Card count display

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Acknowledgments

- [Pokemon Price Tracker API](https://www.pokemonpricetracker.com/) for providing comprehensive card data and pricing
- [Tailwind CSS](https://tailwindcss.com/) for the styling system
- [Lucide](https://lucide.dev/) for beautiful icons
- The Pokemon Company for the amazing trading card game

## Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

Built with ❤️ for Pokemon card collectors
