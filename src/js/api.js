const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001/api/quote';
const COINGECKO_URL = 'https://api.coingecko.com/api/v3';

console.log(`[API] Using proxy URL: ${PROXY_URL}`);

// キャッシュシステム
const cache = {
  bitcoin: { data: null, timestamp: 0 },
  SPY: { data: null, timestamp: 0 },
  FNGS: { data: null, timestamp: 0 }
};
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5分

export async function fetchStockData(symbol) {
  // キャッシュチェック
  const now = Date.now();
  if (cache[symbol] && cache[symbol].data && (now - cache[symbol].timestamp < CACHE_DURATION_MS)) {
    console.log(`📋 Using cached ${symbol} data`);
    return cache[symbol].data;
  }
  
  try {
    const response = await fetch(`${PROXY_URL}/${symbol}`);
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || response.statusText);
    }
    const data = await response.json();

    // キャッシュ更新
    if (!cache[symbol]) cache[symbol] = { data: null, timestamp: 0 };
    cache[symbol] = { data, timestamp: now };
    console.log(`✅ ${symbol} data fetched and cached`);

    return data;
  } catch (error) {
    console.error(`Error fetching stock data for ${symbol}:`, error);
    
    // エラー時は古いキャッシュを返す（Bitcoinと同様）
    if (cache[symbol] && cache[symbol].data) {
      const ageMinutes = Math.floor((Date.now() - cache[symbol].timestamp) / 60000);
      console.warn(`⚠️  Using stale ${symbol} data from cache (${ageMinutes} minutes old)`);
      
      return { 
        ...cache[symbol].data, 
        isStale: true, 
        staleMinutes: ageMinutes,
        staleWarning: `Data is ${ageMinutes} min old (API error)`
      };
    }
    
    return { error: true, message: error.message };
  }
}

export async function fetchBitcoinData() {
  // キャッシュチェック
  const now = Date.now();
  if (cache.bitcoin.data && (now - cache.bitcoin.timestamp < CACHE_DURATION_MS)) {
    console.log('📋 Using cached Bitcoin data');
    return cache.bitcoin.data;
  }
  
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

    const result = {
      current: priceData.bitcoin.usd,
      change: priceData.bitcoin.usd_24h_change,
      history: sortedHistory
    };
    
    // キャッシュ更新
    cache.bitcoin = { data: result, timestamp: now };
    console.log('✅ Bitcoin data fetched and cached');
    return result;
  } catch (error) {
    console.error('❌ Error fetching Bitcoin data:', error);
    
    // エラー時は古いキャッシュを返す（可能なら）
    if (cache.bitcoin.data) {
      const ageMinutes = Math.floor((Date.now() - cache.bitcoin.timestamp) / 60000);
      console.warn(`⚠️  Using stale Bitcoin data from cache (${ageMinutes} minutes old)`);
      
      // 古いデータであることをUIに通知するためのフラグを追加
      return { 
        ...cache.bitcoin.data, 
        isStale: true, 
        staleMinutes: ageMinutes,
        staleWarning: `Data is ${ageMinutes} min old (API error)`
      };
    }
    
    return { error: true, message: error.message };
  }
}

export async function fetchFangPlusData() {
  // Use FNGS (MicroSectors FANG+ ETN) as proxy for FANG+ Index
  return await fetchStockData('FNGS');
}
