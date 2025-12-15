# Neon Charts 2025

A professional, high-end financial dashboard featuring real-time market data and switchable themes.

## Features

- **Real-Time Data (6 Instruments)**:
  - **S&P 500**: Powered by Twelve Data API (SPY ETF)
  - **FANG+**: Powered by Twelve Data API (FNGS ETN)
  - **Bitcoin**: Powered by CoinGecko API
  - **USD/JPY**: Powered by Twelve Data API (Forex)
  - **Gold (XAU/USD)**: Powered by Twelve Data API (Spot Gold)
  - **Nasdaq 100**: Powered by Twelve Data API (QQQ ETF)
- **Dual Themes**:
  - **Neon Cyber**: Futuristic dark mode with cyan/pink accents.
  - **Luxury Professional**: Elegant charcoal and gold aesthetic.
- **Robust Architecture**:
  - **GitHub Actions** automated data updates (daily at 14:30 UTC / 23:30 JST).
  - Static JSON data storage (`market_data.json`) for fast, reliable access.
  - Auto-refreshing charts every 10 minutes in browser.
  - Rate limit protection: Sequential API calls with 200ms delay.
  - Responsive Grid Layout.
  - GitHub Pages frontend hosting.

## ⚠️ Important Notes

### yfinance Library Warning

**DO NOT use `yfinance` library for this project.**

- **Rate Limiting**: yfinance has strict rate limits that can block your requests
- **Bot Detection**: Yahoo Finance actively detects and blocks automated access
- **Unreliable**: Frequent downtime and API changes without notice
- **Alternative**: Use Twelve Data API (official, stable, generous free tier)

### API Rate Limits & Update Frequency

**Twelve Data API (Free Tier):**
- **Daily Limit**: 800 API calls/day
- **Per-Minute Limit**: 8 API calls/minute
- **Per-Second Limit**: Burst of up to 8 requests (but sustained rate should be lower)

**Our Implementation (Rate Limit Protection):**
- **Sequential Requests**: Each API call is made one-at-a-time with 200ms delay
- **Effective Rate**: 5 requests/second (well below the 8/minute limit)
- **Safety Margin**: 37.5% below the theoretical limit for stability
- **Daily Usage**: 6 instruments × 1 update/day = **6 API calls/day**
- **Monthly Usage**: ~180 calls/month (22.5% of free tier limit)

**Update Frequency:**
- **Backend Data Update**: Once daily at **23:30 JST** (14:30 UTC) via GitHub Actions
- **Frontend Refresh**: Every **10 minutes** (re-reads `market_data.json`)
- **Execution Time**: ~1.2 seconds (6 requests × 200ms delay)

**Why Not More Frequent Updates?**
- Daily updates are sufficient for portfolio tracking and long-term analysis
- More frequent updates would waste API quota and provide minimal value
- Market data changes are meaningful on a daily basis, not minute-by-minute

**Instruments Removed (API Limitations):**
- ❌ **VIX (Fear Index)**: Not available in Twelve Data free tier
- ❌ **TNX (US 10-Year Treasury)**: Requires Twelve Data "Grow" plan or higher

## Setup

### Prerequisites

1. **Get API Keys**:
   - [Twelve Data API](https://twelvedata.com/) - Free tier (800 calls/day)
   - No CoinGecko API key needed (public endpoint)

2. **GitHub Repository Setup**:
   - Fork or clone this repository
   - Enable GitHub Actions in repository settings
   - Enable GitHub Pages (Settings > Pages > Source: gh-pages branch)

### GitHub Actions Configuration

1. **Add Secret to Repository**:
   - Go to repository Settings > Secrets and variables > Actions
   - Click "New repository secret"
   - Name: `TWELVE_DATA_API_KEY`
   - Value: Your Twelve Data API key

2. **Workflow File** (already configured):
   - `.github/workflows/update-data.yml`
   - Runs daily at 14:30 UTC (23:30 JST)
   - Automatically builds and deploys to GitHub Pages

3. **Manual Trigger** (optional):
   ```bash
   gh workflow run update-data.yml
   ```

### Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   - Create `.env` file in project root:
     ```env
     TWELVE_DATA_API_KEY=your_api_key_here
     ```

3. **Update Market Data Manually** (optional):
   ```bash
   node scripts/update-market-data.js
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   - Open http://localhost:5173 in browser

5. **Build for Production**:
   ```bash
   npm run build
   ```
   - Output: `dist/` directory

## Technologies

- **Frontend**: 
  - Vite (build tool)
  - Vanilla JavaScript (ES Modules)
  - Lightweight Charts (TradingView library)
  - CSS Variables (theme system)
- **Backend**: 
  - Node.js (data fetching script)
  - GitHub Actions (automation)
- **Hosting**: 
  - GitHub Pages (static site hosting)
  - GitHub Actions (serverless compute)
- **APIs**: 
  - Twelve Data API (stocks, forex, commodities)
  - CoinGecko API (cryptocurrency)

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
2. **update-market-data.js** sequentially fetches data with 200ms delay:
   - SPY → FNGS → BTC → USD/JPY → XAU/USD → QQQ
3. **market_data.json** is updated with new data (~1.2 second execution)
4. **Vite builds** the frontend (`npm run build`)
5. **GitHub Pages** is automatically deployed with updated data
6. **Frontend** reads from static JSON every 10 minutes (no API keys needed in browser)

### Key Design Decisions

**Why Sequential API Calls (not parallel)?**
- Twelve Data free tier has strict rate limits (8 requests/minute)
- Parallel requests (Promise.all) can trigger rate limit errors
- Sequential with 200ms delay = 5 requests/second (safe margin)
- Trade-off: +1.2s execution time for 100% reliability

**Why Daily Updates (not hourly)?**
- Free tier quota preservation (6 calls/day vs 144 calls/day)
- Market data is meaningful on a daily basis for long-term tracking
- Hourly updates provide minimal value for portfolio analysis

**Why Static JSON (not direct API calls)?**
- No API keys exposed in browser (security)
- Fast page loads (no waiting for API responses)
- Works even if APIs are down (shows last known data)
- No CORS issues

**Why GitHub Actions (not Vercel/AWS Lambda)?**
- Completely free (no credit card required)
- Simple setup (just add API key as secret)
- Automatic deployment to GitHub Pages
- Built-in scheduling (cron syntax)

## Troubleshooting

### GitHub Actions Workflow Fails

**Error: "No data returned for [SYMBOL]"**
- Check if API key is correctly set in repository secrets
- Verify symbol format matches Twelve Data API requirements:
  - Stocks/ETFs: `SPY`, `QQQ`, `FNGS` (no prefix)
  - Forex: `USD/JPY` (with slash)
  - Commodities: `XAU/USD` (with slash, not `GC=F`)
- Some symbols require paid plans (e.g., VIX, TNX)

**Error: "Rate limit exceeded"**
- Workflow is running too frequently (should be daily only)
- Multiple manual triggers in short time (wait 1 minute between runs)
- Sequential fetch implementation should prevent this (200ms delay)

### Data Not Updating on GitHub Pages

**Check these in order:**
1. Verify GitHub Actions workflow completed successfully
2. Check gh-pages branch has latest commit
3. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
4. Check `market_data.json` in gh-pages branch for updated timestamp

### Local Development Issues

**"TWELVE_DATA_API_KEY environment variable is not set"**
- Create `.env` file in project root
- Add: `TWELVE_DATA_API_KEY=your_api_key_here`
- Restart development server

**Charts not displaying**
- Check browser console for JavaScript errors
- Verify `market_data.json` exists and has valid data
- Check if port 5173 is available (Vite default)

### API Symbol Format Reference

| Instrument | Twelve Data Symbol | Notes |
|-----------|-------------------|-------|
| S&P 500 ETF | `SPY` | No prefix |
| FANG+ ETN | `FNGS` | No prefix |
| Nasdaq 100 | `QQQ` | No prefix |
| USD/JPY | `USD/JPY` | With slash |
| Gold | `XAU/USD` | With slash (not `GC=F`) |
| Bitcoin | N/A | Uses CoinGecko API |

## Contributing

Feel free to open issues or submit pull requests for improvements.

## License

ISC
