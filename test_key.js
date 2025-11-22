const dotenv = require('dotenv');
dotenv.config();

const API_KEY = process.env.FINNHUB_API_KEY;
console.log('Testing API Key:', API_KEY);

async function test() {
    try {
        // 1. Test Quote (Basic access)
        const quoteRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=SPY&token=${API_KEY}`);
        console.log('Quote Status:', quoteRes.status, quoteRes.statusText);
        if (quoteRes.ok) {
            const data = await quoteRes.json();
            console.log('Quote Data:', data);
            console.log('API seems to be working for Quotes.');
        } else {
            console.error('Quote Failed:', await quoteRes.text());
        }

        // 2. Test Market Status (To check server time if available, or just infer from headers)
        // Finnhub doesn't have a simple "time" endpoint, but we can check the 'Date' header
        console.log('Server Date Header:', quoteRes.headers.get('date'));

    } catch (e) {
        console.error('Test Error:', e);
    }
}

test();
