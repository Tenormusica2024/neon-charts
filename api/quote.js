// Vercel Serverless Function for Stock Quote API
// Endpoint: /api/quote/[symbol]

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://tenormusica2024.github.io'
];

const cache = {
  data: {},
  timestamp: {}
};
const CACHE_DURATION = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 10;

function cleanOldCache() {
  const entries = Object.entries(cache.timestamp);
  
  if (entries.length > MAX_CACHE_ENTRIES) {
    entries.sort((a, b) => a[1] - b[1]);
    const toDelete = entries.slice(0, entries.length - MAX_CACHE_ENTRIES);
    toDelete.forEach(([symbol]) => {
      delete cache.data[symbol];
      delete cache.timestamp[symbol];
    });
  }
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return true;
  } else if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return true;
  } else if (origin) {
    res.status(403).json({ error: 'Forbidden: Invalid origin' });
    return false;
  }
  return true;
}

function validateSymbol(symbol) {
  if (!symbol) {
    return { valid: false, error: 'Symbol is required', status: 400 };
  }
  
  const upperSymbol = symbol.toUpperCase();
  const symbolRegex = /^[A-Z]{1,5}$/;
  
  if (!symbolRegex.test(upperSymbol)) {
    return { 
      valid: false, 
      error: 'Invalid Symbol Format. Must be 1-5 uppercase letters (e.g., SPY, AAPL)', 
      status: 400 
    };
  }
  
  const allowedSymbols = ['SPY', 'FNGS'];
  if (!allowedSymbols.includes(upperSymbol)) {
    return { 
      valid: false, 
      error: `Symbol Not Allowed. Only these symbols are allowed: ${allowedSymbols.join(', ')}`, 
      status: 403 
    };
  }
  
  return { valid: true, symbol: upperSymbol };
}

async function fetchTwelveData(endpoint, apiKey) {
  const url = `https://api.twelvedata.com${endpoint}&apikey=${apiKey}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Twelve Data API Error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Fetch error for ${endpoint}:`, error);
    return { status: 'error', message: error.message };
  }
}

export default async function handler(req, res) {
  if (!setCorsHeaders(req, res)) return;
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  const { symbol: rawSymbol } = req.query;
  const validation = validateSymbol(rawSymbol);
  
  if (!validation.valid) {
    return res.status(validation.status).json({ error: validation.error });
  }
  
  const symbol = validation.symbol;
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  
  if (!apiKey || apiKey === 'demo') {
    return res.status(500).json({ 
      error: 'API Key not configured',
      message: 'Server configuration error. Please contact administrator.' 
    });
  }
  
  if (cache.data[symbol] && (Date.now() - cache.timestamp[symbol] < CACHE_DURATION)) {
    return res.json(cache.data[symbol]);
  }
  
  try {
    const data = await fetchTwelveData(`/time_series?symbol=${symbol}&interval=1day&outputsize=30`, apiKey);
    
    if (data.status === 'error' || !data.values) {
      const msg = data.message || 'Unknown error';
      console.error(`API Error for ${symbol}: ${msg}`);
      
      if (msg.includes('Invalid API key')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (msg.includes('limit')) {
        return res.status(429).json({ error: 'Rate Limit Exceeded' });
      }
      return res.status(404).json({ error: msg });
    }
    
    const values = data.values;
    const currentPrice = parseFloat(values[0].close);
    const prevPrice = parseFloat(values[1].close);
    const change = ((currentPrice - prevPrice) / prevPrice) * 100;
    
    const historical = values.map(v => ({
      time: v.datetime,
      value: parseFloat(v.close)
    })).reverse();
    
    const result = {
      current: currentPrice,
      change: change,
      historical: historical
    };
    
    cache.data[symbol] = result;
    cache.timestamp[symbol] = Date.now();
    cleanOldCache();
    
    return res.json(result);
  } catch (error) {
    console.error(`Error processing ${symbol}:`, error);
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    const safeMessage = isProduction ? 'Internal Server Error' : error.message;
    return res.status(500).json({ error: safeMessage });
  }
}
