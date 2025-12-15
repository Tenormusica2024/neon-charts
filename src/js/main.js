import { fetchBitcoinData, fetchStockData } from './api.js';
import { ChartManager } from './charts.js';
import { ThemeManager } from './theme-manager.js';
import { logger } from './logger.js';

// 定数定義（マジックナンバー防止）
const API_REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10分
const API_REFRESH_INTERVAL_MINUTES = 10;

// Initialize Charts
const sp500Chart = new ChartManager('chart-sp500', '#00f3ff');
const fangChart = new ChartManager('chart-fang', '#00f3ff');
const btcChart = new ChartManager('chart-btc', '#00f3ff');
const usdjpyChart = new ChartManager('chart-usdjpy', '#00f3ff');
const goldChart = new ChartManager('chart-gold', '#00f3ff');
const qqqChart = new ChartManager('chart-qqq', '#00f3ff');

// Initialize Theme Manager
const themeManager = new ThemeManager((isLuxury) => {
  sp500Chart.updateColors(isLuxury);
  fangChart.updateColors(isLuxury);
  btcChart.updateColors(isLuxury);
  usdjpyChart.updateColors(isLuxury);
  goldChart.updateColors(isLuxury);
  qqqChart.updateColors(isLuxury);
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
    logger.error(`Unexpected error format for ${cardId}:`, errorData);
    return;
  }
  
  const priceEl = document.getElementById(`price-${cardId}`);
  if (!priceEl) {
    logger.error(`Price element not found: price-${cardId}`);
    return;
  }
  
  priceEl.textContent = errorInfo.message;
  priceEl.className = 'current-price error';
  
  // エラータイプ別の追加情報
  if (errorInfo.type === 'network') {
    logger.warn('⚠️  Proxy server may not be running. Start it with: node proxy.js');
  } else if (errorInfo.type === 'auth') {
    logger.error('❌ API Key is invalid. Check your .env file.');
  } else if (errorInfo.type === 'rate') {
    logger.warn(`⚠️  API rate limit reached. Data will refresh in ${API_REFRESH_INTERVAL_MINUTES} minutes.`);
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
  if (id === 'usdjpy') usdjpyChart.updateData(data);
  if (id === 'gold') goldChart.updateData(data);
  if (id === 'qqq') qqqChart.updateData(data);
}

function showRefreshIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'refresh-indicator';
  indicator.textContent = '🔄 Updating...';
  document.body.appendChild(indicator);
  return indicator;
}

// Main Data Loading
async function loadData() {
  const indicator = showRefreshIndicator();
  
  try {
    // 並列実行（6つ同時にリクエスト） - エラーは各API関数内でキャッチ済み
    const [sp500Data, fangData, btcData, usdjpyData, goldData, qqqData] = await Promise.all([
      fetchStockData('SPY'),
      fetchStockData('FNGS'),
      fetchBitcoinData(),
      fetchStockData('USD/JPY'),
      fetchStockData('XAU/USD'),
      fetchStockData('QQQ')
    ]);

  // 1. S&P 500 (Using SPY ETF as proxy)
  if (sp500Data && !sp500Data.error) {
    // 古いデータ警告の表示
    if (sp500Data.isStale) {
      logger.warn(`⚠️  ${sp500Data.staleWarning}`);
      const sp500Card = document.getElementById('card-sp500');
      if (sp500Card) {
        let warningBanner = sp500Card.querySelector('.stale-warning');
        if (!warningBanner) {
          warningBanner = document.createElement('div');
          warningBanner.className = 'stale-warning';
          sp500Card.insertBefore(warningBanner, sp500Card.firstChild);
        }
        warningBanner.textContent = `⚠️  Data is ${sp500Data.staleMinutes} min old`;
      }
    }
    updateCard('sp500', sp500Data.current, sp500Data.change, sp500Data.historical);
    const tickerEl = document.querySelector('#card-sp500 .ticker');
    if (tickerEl) tickerEl.textContent = 'SPY (S&P 500 ETF)';
  } else {
    showError('sp500', sp500Data);
  }

  // 2. FANG+ (Using FNGS ETN as proxy)
  if (fangData && !fangData.error) {
    // 古いデータ警告の表示
    if (fangData.isStale) {
      logger.warn(`⚠️  ${fangData.staleWarning}`);
      const fangCard = document.getElementById('card-fang');
      if (fangCard) {
        let warningBanner = fangCard.querySelector('.stale-warning');
        if (!warningBanner) {
          warningBanner = document.createElement('div');
          warningBanner.className = 'stale-warning';
          fangCard.insertBefore(warningBanner, fangCard.firstChild);
        }
        warningBanner.textContent = `⚠️  Data is ${fangData.staleMinutes} min old`;
      }
    }
    updateCard('fang', fangData.current, fangData.change, fangData.historical);
    const tickerEl = document.querySelector('#card-fang .ticker');
    if (tickerEl) tickerEl.textContent = 'FNGS (FANG+ ETN)';
  } else {
    showError('fang', fangData);
  }

  // 3. Bitcoin
  if (btcData && !btcData.error) {
    // 古いデータ警告の表示
    if (btcData.isStale) {
      logger.warn(`⚠️  ${btcData.staleWarning}`);
      // UIに警告バナー表示
      const btcCard = document.getElementById('card-btc');
      if (btcCard) {
        let warningBanner = btcCard.querySelector('.stale-warning');
        if (!warningBanner) {
          warningBanner = document.createElement('div');
          warningBanner.className = 'stale-warning';
          btcCard.insertBefore(warningBanner, btcCard.firstChild);
        }
        warningBanner.textContent = `⚠️  Data is ${btcData.staleMinutes} min old`;
      }
    }
    updateCard('btc', btcData.current, btcData.change, btcData.historical);
  } else {
    showError('btc', btcData);
  }

  // 4. USD/JPY
  if (usdjpyData && !usdjpyData.error) {
    updateCard('usdjpy', usdjpyData.current, usdjpyData.change, usdjpyData.historical);
  } else {
    showError('usdjpy', usdjpyData);
  }

  // 5. Gold
  if (goldData && !goldData.error) {
    updateCard('gold', goldData.current, goldData.change, goldData.historical);
  } else {
    showError('gold', goldData);
  }

  // 7. Nasdaq 100
  if (qqqData && !qqqData.error) {
    updateCard('qqq', qqqData.current, qqqData.change, qqqData.historical);
  } else {
    showError('qqq', qqqData);
  }
  } finally {
    indicator?.remove();
  }
}

// Initial Load
loadData().finally(() => {
  // データ読み込み完了後にローディング画面を非表示（成功・失敗問わず）
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
logger.log(refreshMessage);
setInterval(loadData, API_REFRESH_INTERVAL_MS);

// ページ離脱時のクリーンアップ（メモリリーク対策）
window.addEventListener('beforeunload', () => {
  logger.log('🧹 Cleaning up charts...');
  sp500Chart.destroy();
  fangChart.destroy();
  btcChart.destroy();
  usdjpyChart.destroy();
  goldChart.destroy();
  qqqChart.destroy();
});
