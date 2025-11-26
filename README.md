# Neon Charts 2025

A professional, high-end financial dashboard featuring real-time market data and switchable themes.

## Features

- **Real-Time Data**:
  - **S&P 500**: Powered by Twelve Data API (SPY ETF)
  - **FANG+**: Powered by Twelve Data API (FNGS ETN)
  - **Bitcoin**: Powered by CoinGecko API
- **Dual Themes**:
  - **Neon Cyber**: Futuristic dark mode with cyan/pink accents.
  - **Luxury Professional**: Elegant charcoal and gold aesthetic.
- **Robust Architecture**:
  - Vercel Serverless Functions for API security and CORS handling.
  - Auto-updating charts (10-minute interval).
  - Responsive Grid Layout.
  - GitHub Pages frontend hosting.

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
┌─────────────────┐
│  GitHub Pages   │
│   (Frontend)    │
└────────┬────────┘
         │
         │ HTTPS
         │
┌────────▼────────┐
│ Vercel Function │
│  (Backend API)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼────┐
│Twelve│  │CoinGe-│
│Data  │  │cko    │
└──────┘  └───────┘
```

## License

ISC
