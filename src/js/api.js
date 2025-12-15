const MARKET_DATA_URL = './market_data.json';
const COINGECKO_URL = 'https://api.coingecko.com/api/v3';

let marketDataCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchMarketData() {
  const now = Date.now();
  
  // Return cached data if still fresh
  if (marketDataCache && (now - lastFetchTime) < CACHE_DURATION) {
    return marketDataCache;
  }
  
  try {
    const response = await fetch(`${MARKET_DATA_URL}?t=${now}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch market data: ${response.statusText}`);
    }
    marketDataCache = await response.json();
    lastFetchTime = now;
    return marketDataCache;
  } catch (error) {
    console.error('Error fetching market data:', error);
    // Return cached data even if expired, better than nothing
    if (marketDataCache) {
      console.warn('Using stale cache due to fetch error');
      return marketDataCache;
    }
    throw error;
  }
}

export async function fetchStockData(symbol) {
  try {
    const marketData = await fetchMarketData();
    
    // Map symbol to data key
    const symbolMap = {
      'SPY': 'SPY',
      'FNGS': 'FANG',
      'USD/JPY': 'USDJPY',
      'TNX': 'TNX',
      'XAU/USD': 'GOLD',
      'VIX': 'VIX',
      'QQQ': 'QQQ'
    };
    
    const dataKey = symbolMap[symbol];
    
    if (!dataKey || !marketData[dataKey]) {
      throw new Error(`No data available for ${symbol}`);
    }
    
    const data = marketData[dataKey];
    
    return {
      current: data.current,
      change: data.change,
      historical: data.historical || [],
      lastUpdated: data.last_updated
    };
  } catch (error) {
    console.error(`Error fetching stock data for ${symbol}:`, error);
    return { error: true, message: error.message };
  }
}

export async function fetchBitcoinData() {
  try {
    // Fetch current price and 30-day history
    const [priceRes, historyRes] = await Promise.all([
      fetch(`${COINGECKO_URL}/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true`),
      fetch(`${COINGECKO_URL}/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily`)
    ]);

    if (!priceRes.ok || !historyRes.ok) throw new Error('CoinGecko API error');

    const priceData = await priceRes.json();
    const historyData = await historyRes.json();

    // Process and deduplicate history data
    const uniqueHistory = new Map();
    historyData.prices.forEach(([timestamp, price]) => {
      const dateStr = new Date(timestamp).toISOString().split('T')[0];
      // Keep the last price for the day (close price)
      uniqueHistory.set(dateStr, price);
    });

    const sortedHistory = Array.from(uniqueHistory.entries())
      .map(([time, value]) => ({ time, value }))
      .sort((a, b) => new Date(a.time) - new Date(b.time));

    return {
      current: priceData.bitcoin.usd,
      change: priceData.bitcoin.usd_24h_change,
      history: sortedHistory
    };
  } catch (error) {
    console.error('Error fetching Bitcoin data:', error);
    return null;
  }
}

export async function fetchFangPlusData() {
  // Use FNGS (MicroSectors FANG+ ETN) as proxy for FANG+ Index
  return await fetchStockData('FNGS');
}
