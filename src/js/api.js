import { logger } from './logger.js';

const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001/api/quote';
const COINGECKO_URL = 'https://api.coingecko.com/api/v3';

if (!import.meta.env.VITE_PROXY_URL && import.meta.env.MODE === 'production') {
  logger.error('❌ FATAL: VITE_PROXY_URL is not set in production environment');
  alert('Configuration error. Please contact the administrator.');
}

logger.log(`[API] Using proxy URL: ${PROXY_URL}`);

// キャッシュシステム
const cache = {
  bitcoin: { data: null, timestamp: 0 },
  SPY: { data: null, timestamp: 0 },
  FNGS: { data: null, timestamp: 0 }
};
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5分

const rateLimiter = {
  requests: [],
  maxRequests: 7,
  windowMs: 60 * 1000
};

async function checkRateLimit() {
  const now = Date.now();
  rateLimiter.requests = rateLimiter.requests.filter(t => now - t < rateLimiter.windowMs);
  
  if (rateLimiter.requests.length >= rateLimiter.maxRequests) {
    const oldestRequest = rateLimiter.requests[0];
    const waitTime = rateLimiter.windowMs - (now - oldestRequest);
    logger.warn(`Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  rateLimiter.requests.push(now);
}

export async function fetchStockData(symbol) {
  // キャッシュチェック
  const now = Date.now();
  if (cache[symbol] && cache[symbol].data && (now - cache[symbol].timestamp < CACHE_DURATION_MS)) {
    logger.log(`📋 Using cached ${symbol} data`);
    return cache[symbol].data;
  }
  
  await checkRateLimit();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${PROXY_URL}/${symbol}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || response.statusText);
    }
    const data = await response.json();

    // キャッシュ更新
    if (!cache[symbol]) cache[symbol] = { data: null, timestamp: 0 };
    cache[symbol] = { data, timestamp: now };
    logger.log(`✅ ${symbol} data fetched and cached`);

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      logger.error(`Request timeout for ${symbol}`);
      if (cache[symbol] && cache[symbol].data) {
        const ageMinutes = Math.floor((Date.now() - cache[symbol].timestamp) / 60000);
        logger.warn(`⚠️  Using stale ${symbol} data from cache (${ageMinutes} minutes old)`);
        return { 
          ...cache[symbol].data, 
          isStale: true, 
          staleMinutes: ageMinutes,
          staleWarning: `Data is ${ageMinutes} min old (Timeout)`
        };
      }
      return { error: true, message: 'Request timeout. Please try again.' };
    }
    
    logger.error(`Error fetching stock data for ${symbol}:`, error);
    
    // エラー時は古いキャッシュを返す（Bitcoinと同様）
    if (cache[symbol] && cache[symbol].data) {
      const ageMinutes = Math.floor((Date.now() - cache[symbol].timestamp) / 60000);
      logger.warn(`⚠️  Using stale ${symbol} data from cache (${ageMinutes} minutes old)`);
      
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
    logger.log('📋 Using cached Bitcoin data');
    return cache.bitcoin.data;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    // Fetch current price and 30-day history
    const [priceRes, historyRes] = await Promise.all([
      fetch(`${COINGECKO_URL}/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true`, {
        signal: controller.signal
      }),
      fetch(`${COINGECKO_URL}/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily`, {
        signal: controller.signal
      })
    ]);
    clearTimeout(timeoutId);

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
    logger.log('✅ Bitcoin data fetched and cached');
    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      logger.error('Request timeout for Bitcoin');
      if (cache.bitcoin.data) {
        const ageMinutes = Math.floor((Date.now() - cache.bitcoin.timestamp) / 60000);
        logger.warn(`⚠️  Using stale Bitcoin data from cache (${ageMinutes} minutes old)`);
        return { 
          ...cache.bitcoin.data, 
          isStale: true, 
          staleMinutes: ageMinutes,
          staleWarning: `Data is ${ageMinutes} min old (Timeout)`
        };
      }
      return { error: true, message: 'Request timeout. Please try again.' };
    }
    
    logger.error('❌ Error fetching Bitcoin data:', error);
    
    // エラー時は古いキャッシュを返す（可能なら）
    if (cache.bitcoin.data) {
      const ageMinutes = Math.floor((Date.now() - cache.bitcoin.timestamp) / 60000);
      logger.warn(`⚠️  Using stale Bitcoin data from cache (${ageMinutes} minutes old)`);
      
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
