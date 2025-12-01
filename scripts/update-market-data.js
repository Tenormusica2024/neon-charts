// Market Data Update Script for GitHub Actions
// Updates market_data.json with latest stock and crypto prices

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// API Configuration
const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const COINGECKO_URL = 'https://api.coingecko.com/api/v3';

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

async function fetchPolygonData(ticker) {
  const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`;
  
  try {
    const data = await fetchWithRetry(url);
    
    if (!data.results || data.results.length === 0) {
      throw new Error(`No data returned for ${ticker}`);
    }
    
    const result = data.results[0];
    const current = result.c; // Close price
    const open = result.o;
    const change = ((current - open) / open) * 100;
    
    return {
      current: parseFloat(current.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      historical: [],
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error fetching ${ticker}:`, error.message);
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
  
  if (!POLYGON_API_KEY) {
    throw new Error('POLYGON_API_KEY environment variable is not set');
  }
  
  try {
    // Fetch all data in parallel
    console.log('Fetching market data...');
    const [spyData, fangData, btcData] = await Promise.all([
      fetchPolygonData('SPY'),
      fetchPolygonData('FNGS'),
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
