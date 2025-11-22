import { fetchBitcoinData, fetchStockData } from './api.js';
import { ChartManager } from './charts.js';
import { ThemeManager } from './theme-manager.js';

// Initialize Charts
const sp500Chart = new ChartManager('chart-sp500', '#00f3ff');
const fangChart = new ChartManager('chart-fang', '#00f3ff');
const btcChart = new ChartManager('chart-btc', '#00f3ff');

// Initialize Theme Manager
const themeManager = new ThemeManager((isLuxury) => {
  sp500Chart.updateColors(isLuxury);
  fangChart.updateColors(isLuxury);
  btcChart.updateColors(isLuxury);
});

// Update UI Helper
function updateCard(id, price, change, data) {
  const priceEl = document.getElementById(`price-${id}`);
  const changeEl = document.getElementById(`change-${id}`);

  if (price === undefined || change === undefined) {
      priceEl.textContent = 'Error';
      return;
  }

  // Format Price
  priceEl.textContent = price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  });

  // Format Change
  const changeSign = change >= 0 ? '+' : '';
  changeEl.textContent = `${changeSign}${change.toFixed(2)}%`;
  changeEl.className = `price-change ${change >= 0 ? 'up' : 'down'}`;

  // Update Chart
  if (id === 'sp500') sp500Chart.updateData(data);
  if (id === 'fang') fangChart.updateData(data);
  if (id === 'btc') btcChart.updateData(data);
}

// Main Data Loading
async function loadData() {
  try {
    // 1. S&P 500 (Using SPY ETF as proxy)
    const sp500Data = await fetchStockData('SPY');
    if (sp500Data && !sp500Data.error) {
      updateCard('sp500', sp500Data.current, sp500Data.change, sp500Data.historical);
      document.querySelector('#card-sp500 .ticker').textContent = 'SPY (S&P 500 ETF)';
    } else {
        let msg = 'API Error';
        const err = sp500Data?.message || '';
        if (err.includes('Unauthorized')) msg = 'Invalid Key';
        else if (err.includes('Failed to fetch')) msg = 'Proxy Down';
        else if (err.includes('Rate Limit')) msg = 'API Limit';

        document.getElementById('price-sp500').textContent = msg;
        if (msg === 'Proxy Down') console.warn('Is node proxy.js running?');
    }

    // 2. FANG+ (Using FNGS ETN as proxy)
    const fangData = await fetchStockData('FNGS');
    if (fangData && !fangData.error) {
      updateCard('fang', fangData.current, fangData.change, fangData.historical);
      document.querySelector('#card-fang .ticker').textContent = 'FNGS (FANG+ ETN)';
    } else {
        let msg = 'API Error';
        const err = fangData?.message || '';
        if (err.includes('Unauthorized')) msg = 'Invalid Key';
        else if (err.includes('Failed to fetch')) msg = 'Proxy Down';
        else if (err.includes('Rate Limit')) msg = 'API Limit';

        document.getElementById('price-fang').textContent = msg;
    }

    // 3. Bitcoin
    const btcData = await fetchBitcoinData();
    if (btcData) {
      updateCard('btc', btcData.current, btcData.change, btcData.history);
    }

  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Initial Load
loadData();

// Refresh every 10 minutes to avoid API limits
setInterval(loadData, 600000);
