# Neon Charts 2025

A professional, high-end financial dashboard featuring real-time market data and switchable themes.

## Features

- **Real-Time Data**:
  - **S&P 500**: Powered by Twelve Data API (SPY ETF)
  - **FANG+**: Powered by Twelve Data API (FNGS ETN)
  - **Bitcoin**: Powered by CoinGecko API
  - **USD/JPY**: Powered by Twelve Data API (Forex)
  - **US 10-Year Treasury**: Powered by Twelve Data API (^TNX)
  - **Gold**: Powered by Twelve Data API (GC=F)
  - **VIX (Fear Index)**: Powered by Twelve Data API (^VIX)
  - **Nasdaq 100**: Powered by Twelve Data API (QQQ ETF)
- **Dual Themes**:
  - **Neon Cyber**: Futuristic dark mode with cyan/pink accents.
  - **Luxury Professional**: Elegant charcoal and gold aesthetic.
- **Robust Architecture**:
  - **GitHub Actions** automated data updates (daily at 14:30 UTC / 23:30 JST).
  - Static JSON data storage (`market_data.json`) for fast, reliable access.
  - Auto-refreshing charts every 10 minutes.
  - Responsive Grid Layout.
  - GitHub Pages frontend hosting.

## ⚠️ Important Notes

### yfinance Library Warning

**DO NOT use `yfinance` library for this project.**

- **Rate Limiting**: yfinance has strict rate limits that can block your requests
- **Bot Detection**: Yahoo Finance actively detects and blocks automated access
- **Unreliable**: Frequent downtime and API changes without notice
- **Alternative**: Use Twelve Data API (official, stable, generous free tier)

### API Rate Limits

- **Twelve Data Free Tier**: 800 API calls/day
- **Update Frequency**: Daily (1 update/day = 8 instruments × 1 call = 8 calls/day)
- **Total Monthly Usage**: ~240 calls/month (well within free tier)

## Setup

### Development

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Configure API Key**:
    - Get a free API key from [Twelve Data](https://twelvedata.com/).
    - Create a `.env` file:
      ```env
      TWELVE_DATA_API_KEY=your_api_key_here
      ```

3.  **Run Development Server**:
    ```bash
    # Terminal 1: Start Proxy Server (for local development)
    node proxy.js

    # Terminal 2: Start Frontend
    npx vite
    ```

### Production Deployment

#### Backend (Vercel Serverless Functions)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

3. **Set Environment Variables on Vercel Dashboard**:
   - Go to your project settings on Vercel
   - Add environment variable:
     - `TWELVE_DATA_API_KEY`: Your Twelve Data API key

4. **Get your Vercel deployment URL** (e.g., `https://neon-charts.vercel.app`)

#### Frontend (GitHub Pages)

1. **Update `.env.production`** with your Vercel URL:
   ```env
   VITE_PROXY_URL=https://your-project.vercel.app/api/quote
   ```

2. **Build for production**:
   ```bash
   npm run build
   ```

3. **Deploy to GitHub Pages**:
   ```bash
   git checkout gh-pages
   cp -r dist/* .
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin gh-pages
   ```

4. **Access your deployed app**:
   - Frontend: `https://your-username.github.io/neon-charts/`
   - Backend API: `https://your-project.vercel.app/api/quote/SPY`

## Technologies

- **Frontend**: Vite, Vanilla JS, Lightweight Charts
- **Backend**: Vercel Serverless Functions (Node.js)
- **Hosting**: 
  - Frontend: GitHub Pages
  - Backend: Vercel
- **Data**: Twelve Data, CoinGecko

## Architecture

```
┌─────────────────────────┐
│   GitHub Actions        │
│   (Scheduled Workflow)  │
│   Runs Daily 23:30 JST  │
└────────┬────────────────┘
         │
         │ Fetch & Update
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼────┐
│Twelve│  │CoinGe-│
│Data  │  │cko    │
└───┬──┘  └──┬────┘
    │         │
    └────┬────┘
         │
         │ Write
         ▼
┌─────────────────┐
│market_data.json │
│ (Static Data)   │
└────────┬────────┘
         │
         │ Read (every 10min)
         │
┌────────▼────────┐
│  GitHub Pages   │
│   (Frontend)    │
└─────────────────┘
```

### Data Flow

1. **GitHub Actions** runs daily at 23:30 JST (after US market close)
2. **update-market-data.js** fetches latest data from Twelve Data & CoinGecko
3. **market_data.json** is updated with new data
4. **GitHub Pages** is automatically rebuilt and deployed
5. **Frontend** reads from static JSON (no API keys needed in browser)

## License

ISC
