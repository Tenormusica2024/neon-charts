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
  - Local Node.js Proxy Server for API security and CORS handling.
  - Auto-updating charts (10-minute interval).
  - Responsive Grid Layout.

## Setup

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
    # Terminal 1: Start Proxy Server
    node proxy.js

    # Terminal 2: Start Frontend
    npx vite
    ```

## Technologies

- **Frontend**: Vite, Vanilla JS, Lightweight Charts
- **Backend**: Node.js, Express, Cors
- **Data**: Twelve Data, CoinGecko
