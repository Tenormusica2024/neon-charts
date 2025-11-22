const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());

const API_KEY = process.env.TWELVE_DATA_API_KEY || 'demo'; // User must provide this
const BASE_URL = 'https://api.twelvedata.com';

app.get('/', (req, res) => {
    res.send(`Proxy server is running (Twelve Data). API Key status: ${API_KEY === 'demo' ? 'DEMO (Limited)' : 'CONFIGURED'}`);
});

// Cache to save API calls (Limit is 8/min for free tier)
const cache = {
    data: {},
    timestamp: {}
};
const CACHE_DURATION = 60 * 1000; // 1 minute cache

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

app.get('/api/quote/:symbol', async (req, res) => {
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
