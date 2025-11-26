const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = 3001;

// CORS設定の厳格化 - 本番環境では許可するオリジンを明示的に指定
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
    // 本番環境のドメインを追加する場合はここに記載
    // 'https://yourdomain.com'
];

app.use(cors({
    origin: function(origin, callback) {
        // originがundefinedの場合（同一オリジン）またはallowedOriginsに含まれる場合は許可
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

// API Key必須化 - 環境変数が設定されていない場合はサーバー起動を拒否
const API_KEY = process.env.TWELVE_DATA_API_KEY;

if (!API_KEY || API_KEY === 'demo') {
    console.error('❌ ERROR: TWELVE_DATA_API_KEY environment variable is required.');
    console.error('Please create a .env file with: TWELVE_DATA_API_KEY=your_api_key_here');
    console.error('Get your API key from: https://twelvedata.com/');
    process.exit(1);
}
const BASE_URL = 'https://api.twelvedata.com';

app.get('/', (req, res) => {
    res.send(`Proxy server is running (Twelve Data). API Key status: ${API_KEY === 'demo' ? 'DEMO (Limited)' : 'CONFIGURED'}`);
});

// Cache to save API calls (Limit is 8/min for free tier)
const cache = {
    data: {},
    timestamp: {}
};
// キャッシュ時間をFrontendと統一（Proxyがマスター）
const CACHE_DURATION = 5 * 60 * 1000; // 5分キャッシュ（Frontendと同期）

async function fetchTwelveData(endpoint) {
    const url = `${BASE_URL}${endpoint}&apikey=${API_KEY}`;
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

// Symbol バリデーションミドルウェア
function validateSymbol(req, res, next) {
    let { symbol } = req.params;
    
    // 小文字を大文字に変換（キャッシュの一貫性確保）
    symbol = symbol.toUpperCase();
    req.params.symbol = symbol;
    
    // 1-5文字の大文字のみ
    const symbolRegex = /^[A-Z]{1,5}$/;
    if (!symbolRegex.test(symbol)) {
        return res.status(400).json({ 
            error: 'Invalid Symbol Format',
            message: 'Symbol must be 1-5 uppercase letters (e.g., SPY, AAPL, GOOGL)'
        });
    }
    
    // 許可リスト（本番環境ではAPIクォータ保護のため有効化推奨）
    const allowedSymbols = ['SPY', 'FNGS'];
    if (!allowedSymbols.includes(symbol)) {
        return res.status(403).json({ 
            error: 'Symbol Not Allowed',
            message: `Only these symbols are allowed: ${allowedSymbols.join(', ')}`
        });
    }
    
    next();
}

app.get('/api/quote/:symbol', validateSymbol, async (req, res) => {
    const { symbol } = req.params;

    // Check cache
    if (cache.data[symbol] && (Date.now() - cache.timestamp[symbol] < CACHE_DURATION)) {
        return res.json(cache.data[symbol]);
    }

    try {
        // Fetch Time Series (Daily) - Returns latest 30 points by default
        // This avoids date issues because we don't send start_date/end_date
        const data = await fetchTwelveData(`/time_series?symbol=${symbol}&interval=1day&outputsize=30`);

        if (data.status === 'error' || !data.values) {
            const msg = data.message || 'Unknown error';
            console.error(`API Error for ${symbol}: ${msg}`);
            // Return 404 or 401 based on message
            if (msg.includes('Invalid API key')) return res.status(401).json({ error: 'Unauthorized' });
            if (msg.includes('limit')) return res.status(429).json({ error: 'Rate Limit' });
            return res.status(404).json({ error: msg });
        }

        // Format Data
        // Twelve Data returns values in reverse order (newest first)
        const values = data.values;
        const currentPrice = parseFloat(values[0].close);
        const prevPrice = parseFloat(values[1].close);
        const change = ((currentPrice - prevPrice) / prevPrice) * 100;

        const historical = values.map(v => ({
            time: v.datetime,
            value: parseFloat(v.close)
        })).reverse(); // lightweight-charts needs ascending order

        const result = {
            current: currentPrice,
            change: change,
            historical: historical
        };

        // Update cache
        cache.data[symbol] = result;
        cache.timestamp[symbol] = Date.now();

        res.json(result);
    } catch (error) {
        console.error(`Error processing ${symbol}:`, error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
    console.log(`Using Twelve Data API Key: ${API_KEY === 'demo' ? 'DEMO (Limited)' : 'PROVIDED'}`);
});
