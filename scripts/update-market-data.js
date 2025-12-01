// Market Data Update Script for GitHub Actions
// Updates market_data.json with latest stock and crypto prices

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// API Configuration
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;
const COINGECKO_URL = 'https://api.coingecko.com/api/v3';
const TWELVE_DATA_URL = 'https://api.twelvedata.com';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Attempt ${i + 1}/${retries} failed:`, error.message);
      if (i < retries - 1) {
        await sleep(RETRY_DELAY * (i + 1));
      } else {
        throw error;
      }
    }
  }
}

async function fetchTwelveData(symbol) {
  const url = `${TWELVE_DATA_URL}/time_series?symbol=${symbol}&interval=1day&outputsize=30&apikey=${TWELVE_DATA_API_KEY}`;
  
  try {
    const data = await fetchWithRetry(url);
    
    if (data.status === 'error' || !data.values) {
      throw new Error(`No data returned for ${symbol}: ${data.message || 'Unknown error'}`);
    }
    
    const values = data.values;
    const currentPrice = parseFloat(values[0].close);
    const prevPrice = parseFloat(values[1].close);
    const change = ((currentPrice - prevPrice) / prevPrice) * 100;
    
    // Format historical data for lightweight-charts (ascending order)
    const historical = values.map(v => ({
      time: v.datetime,
      value: parseFloat(v.close)
    })).reverse(); // Twelve Data returns newest first, chart needs oldest first
    
    return {
      current: parseFloat(currentPrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      historical: historical,
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error.message);
    throw error;
  }
}

async function fetchBitcoinData() {
  const url = `${COINGECKO_URL}/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true`;
  
  try {
    const data = await fetchWithRetry(url);
    
    if (!data.bitcoin) {
      throw new Error('No Bitcoin data returned');
    }
    
    return {
      current: Math.round(data.bitcoin.usd),
      change: parseFloat(data.bitcoin.usd_24h_change.toFixed(2)),
      historical: [],
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching Bitcoin:', error.message);
    throw error;
  }
}

async function updateMarketData() {
  console.log('Starting market data update...');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  if (!TWELVE_DATA_API_KEY) {
    throw new Error('TWELVE_DATA_API_KEY environment variable is not set');
  }
  
  try {
    // Fetch all data in parallel
    console.log('Fetching market data...');
    const [spyData, fangData, btcData] = await Promise.all([
      fetchTwelveData('SPY'),
      fetchTwelveData('FNGS'),
      fetchBitcoinData()
    ]);
    
    const marketData = {
      SPY: spyData,
      FANG: fangData,
      BTC: btcData
    };
    
    // Write to file
    const outputPath = path.join(__dirname, '..', 'market_data.json');
    await fs.writeFile(
      outputPath,
      JSON.stringify(marketData, null, 2),
      'utf8'
    );
    
    console.log('✓ Market data updated successfully');
    console.log(`SPY: $${spyData.current} (${spyData.change > 0 ? '+' : ''}${spyData.change}%)`);
    console.log(`FANG: $${fangData.current} (${fangData.change > 0 ? '+' : ''}${fangData.change}%)`);
    console.log(`BTC: $${btcData.current} (${btcData.change > 0 ? '+' : ''}${btcData.change}%)`);
    console.log(`Output: ${outputPath}`);
    
    return marketData;
  } catch (error) {
    console.error('✗ Failed to update market data:', error.message);
    throw error;
  }
}

// Run update
updateMarketData()
  .then(() => {
    console.log('\n✓ Update completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Update failed:', error.message);
    process.exit(1);
  });
