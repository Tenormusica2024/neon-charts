const PROXY_URL = 'http://localhost:3001/api/quote';
const COINGECKO_URL = 'https://api.coingecko.com/api/v3';

export async function fetchStockData(symbol) {
  try {
    const response = await fetch(`${PROXY_URL}/${symbol}`);
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || response.statusText);
    }
    const data = await response.json();

    // Proxy already formats data for us
    return data;
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
