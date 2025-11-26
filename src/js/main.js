import { fetchBitcoinData, fetchStockData } from './api.js';
import { ChartManager } from './charts.js';
import { ThemeManager } from './theme-manager.js';

// 定数定義（マジックナンバー防止）
const API_REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10分
const API_REFRESH_INTERVAL_MINUTES = 10;

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

// 共通エラー処理関数
function parseApiError(errorData) {
  if (!errorData || !errorData.error) return null;
  
  const errMsg = errorData.message || '';
  
  // エラータイプを判定
  if (errMsg.includes('Unauthorized') || errMsg.includes('Invalid API key')) {
    return { type: 'auth', message: 'Invalid API Key' };
  }
  if (errMsg.includes('Failed to fetch') || errMsg.includes('ECONNREFUSED')) {
    return { type: 'network', message: 'Proxy Server Down' };
  }
  if (errMsg.includes('Rate Limit') || errMsg.includes('429')) {
    return { type: 'rate', message: 'API Rate Limit' };
  }
  if (errMsg.includes('404') || errMsg.includes('Not Found')) {
    return { type: 'notfound', message: 'Symbol Not Found' };
  }
  
  return { type: 'unknown', message: 'API Error' };
}

// エラー表示関数
function showError(cardId, errorData) {
  const errorInfo = parseApiError(errorData);
  
  if (!errorInfo) {
    console.error(`Unexpected error format for ${cardId}:`, errorData);
    return;
  }
  
  const priceEl = document.getElementById(`price-${cardId}`);
  if (!priceEl) {
    console.error(`Price element not found: price-${cardId}`);
    return;
  }
  
  priceEl.textContent = errorInfo.message;
  priceEl.className = 'current-price error';
  
  // エラータイプ別の追加情報
  if (errorInfo.type === 'network') {
    console.warn('⚠️  Proxy server may not be running. Start it with: node proxy.js');
  } else if (errorInfo.type === 'auth') {
    console.error('❌ API Key is invalid. Check your .env file.');
  } else if (errorInfo.type === 'rate') {
    console.warn(`⚠️  API rate limit reached. Data will refresh in ${API_REFRESH_INTERVAL_MINUTES} minutes.`);
  }
}

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
    // 並列実行（3つ同時にリクエスト） - 3倍高速化
    const [sp500Data, fangData, btcData] = await Promise.all([
      fetchStockData('SPY'),
      fetchStockData('FNGS'),
      fetchBitcoinData()
    ]);

    // 1. S&P 500 (Using SPY ETF as proxy)
    if (sp500Data && !sp500Data.error) {
      updateCard('sp500', sp500Data.current, sp500Data.change, sp500Data.historical);
      const tickerEl = document.querySelector('#card-sp500 .ticker');
      if (tickerEl) tickerEl.textContent = 'SPY (S&P 500 ETF)';
    } else {
      showError('sp500', sp500Data);
    }

    // 2. FANG+ (Using FNGS ETN as proxy)
    if (fangData && !fangData.error) {
      updateCard('fang', fangData.current, fangData.change, fangData.historical);
      const tickerEl = document.querySelector('#card-fang .ticker');
      if (tickerEl) tickerEl.textContent = 'FNGS (FANG+ ETN)';
    } else {
      showError('fang', fangData);
    }

    // 3. Bitcoin
    if (btcData && !btcData.error) {
      updateCard('btc', btcData.current, btcData.change, btcData.history);
    } else {
      showError('btc', btcData || { error: true, message: 'CoinGecko API error' });
    }

  } catch (error) {
    console.error('❌ Fatal error loading data:', error);
    // 例外を適切に伝播（必要に応じてUIにエラー表示）
    showError('sp500', { error: true, message: error.message });
    showError('fang', { error: true, message: error.message });
    showError('btc', { error: true, message: error.message });
  }
}

// Initial Load
loadData().then(() => {
  // データ読み込み完了後にローディング画面を非表示
  hideLoading();
});

// ローディング画面を非表示にする関数
function hideLoading() {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.classList.add('hidden');
    // アニメーション完了後にDOMから削除
    setTimeout(() => {
      loadingOverlay.remove();
    }, 500);
  }
}

// 定期的なデータ更新
const refreshMessage = `🔄 Data will refresh every ${API_REFRESH_INTERVAL_MINUTES} minutes`;
console.log(refreshMessage);
setInterval(loadData, API_REFRESH_INTERVAL_MS);
