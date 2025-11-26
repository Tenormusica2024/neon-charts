# Neon Charts 2025 - 推奨修正コード例集

このドキュメントは、コードレビューで発見された問題の具体的な修正コードを提供します。

---

## 🔴 Critical Issues - 即座修正必要

### Issue #1: API Keyの必須化

**ファイル**: `proxy.js`

```javascript
// ❌ Before (INSECURE)
const dotenv = require('dotenv');
dotenv.config();

const API_KEY = process.env.TWELVE_DATA_API_KEY || 'demo';
const BASE_URL = 'https://api.twelvedata.com';

// ✅ After (SECURE)
const dotenv = require('dotenv');
dotenv.config();

const API_KEY = process.env.TWELVE_DATA_API_KEY;
const BASE_URL = 'https://api.twelvedata.com';

// API Key検証
if (!API_KEY) {
  console.error('\x1b[31m%s\x1b[0m', '========================================');
  console.error('\x1b[31m%s\x1b[0m', 'FATAL ERROR: API Key Not Configured!');
  console.error('\x1b[31m%s\x1b[0m', '========================================');
  console.error('');
  console.error('⚠️  TWELVE_DATA_API_KEY environment variable is not set.');
  console.error('');
  console.error('📝 Steps to fix:');
  console.error('  1. Create a .env file in the project root');
  console.error('  2. Add this line: TWELVE_DATA_API_KEY=your_api_key_here');
  console.error('  3. Get your free API key from: https://twelvedata.com/');
  console.error('');
  console.error('Example .env file:');
  console.error('  TWELVE_DATA_API_KEY=abc123def456');
  console.error('');
  process.exit(1);
}

console.log('✅ API Key loaded successfully');
console.log(`🔑 Using API Key: ${API_KEY.substring(0, 4)}***${API_KEY.substring(API_KEY.length - 4)}`);
```

---

### Issue #2: CORS設定の厳格化

**ファイル**: `proxy.js`

```javascript
// ❌ Before (INSECURE)
const cors = require('cors');
app.use(cors()); // 全オリジン許可

// ✅ After (SECURE)
const cors = require('cors');

// 環境変数から許可オリジンを読み込み（本番環境対応）
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:5173',      // Vite dev server
      'http://localhost:3000',      // Alternative dev port
      'http://127.0.0.1:5173',      // Localhost IP
      'https://neon-charts.com',    // Production (example)
      'https://www.neon-charts.com' // Production www subdomain
    ];

app.use(cors({
  origin: function(origin, callback) {
    // オリジンがないリクエストを許可（curl, Postman, モバイルアプリ）
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `CORS policy violation: Origin "${origin}" is not allowed. Allowed origins: ${allowedOrigins.join(', ')}`;
      console.warn('\x1b[33m%s\x1b[0m', `⚠️  ${msg}`);
      return callback(new Error(msg), false);
    }
    
    console.log(`✅ CORS: Allowing origin ${origin}`);
    return callback(null, true);
  },
  credentials: true, // Cookieを許可（必要な場合）
  optionsSuccessStatus: 200
}));

console.log('🔒 CORS configured for:', allowedOrigins);
```

**.envファイルに追加**:
```env
ALLOWED_ORIGINS=http://localhost:5173,https://your-production-domain.com
```

---

### Issue #3: DOM要素存在確認

**ファイル**: `src/js/charts.js`

```javascript
// ❌ Before
export class ChartManager {
  constructor(containerId, colorUp, colorDown) {
    this.container = document.getElementById(containerId);
    this.chart = createChart(this.container, { ... });
    // ...
  }
}

// ✅ After
export class ChartManager {
  constructor(containerId, colorUp, colorDown) {
    this.container = document.getElementById(containerId);
    
    // ✅ 存在確認
    if (!this.container) {
      throw new Error(
        `Chart container with id "${containerId}" not found in DOM. ` +
        `Make sure the HTML element exists before creating the chart.`
      );
    }
    
    this.chart = createChart(this.container, {
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#a0a0a0',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
      },
      crosshair: {
        vertLine: {
          labelVisible: false,
        },
      },
    });

    this.series = this.chart.addSeries(AreaSeries, {
      lineColor: colorUp,
      topColor: colorUp.replace(')', ', 0.4)').replace('rgb', 'rgba'),
      bottomColor: colorUp.replace(')', ', 0.0)').replace('rgb', 'rgba'),
      lineWidth: 2,
    });

    // ✅ リサイズハンドラーをインスタンスにバインド
    this.resizeHandler = () => {
      this.chart.resize(this.container.clientWidth, this.container.clientHeight);
    };
    window.addEventListener('resize', this.resizeHandler);
  }
  
  // ✅ クリーンアップメソッド追加（メモリリーク対策）
  destroy() {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.chart) {
      this.chart.remove();
      this.chart = null;
    }
    this.container = null;
    console.log('✅ Chart destroyed and cleaned up');
  }

  updateData(data) {
    if (!data || data.length === 0) return;
    this.series.setData(data);
    this.chart.timeScale().fitContent();
  }

  updateColors(isLuxury) {
    const color = isLuxury ? '#d4af37' : '#00f3ff';
    this.series.applyOptions({
      lineColor: color,
      topColor: isLuxury ? 'rgba(212, 175, 55, 0.4)' : 'rgba(0, 243, 255, 0.4)',
      bottomColor: isLuxury ? 'rgba(212, 175, 55, 0.0)' : 'rgba(0, 243, 255, 0.0)',
    });

    this.chart.applyOptions({
      layout: {
        textColor: isLuxury ? '#8c8c8c' : '#a0a0a0',
      },
      grid: {
        vertLines: { color: isLuxury ? 'rgba(212, 175, 55, 0.05)' : 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: isLuxury ? 'rgba(212, 175, 55, 0.05)' : 'rgba(255, 255, 255, 0.05)' },
      }
    });
  }
}
```

**ファイル**: `src/js/theme-manager.js`

```javascript
// ❌ Before
export class ThemeManager {
  constructor(onThemeChange) {
    this.toggleBtn = document.getElementById('theme-toggle');
    this.body = document.body;
    // ...
  }
}

// ✅ After
export class ThemeManager {
  constructor(onThemeChange) {
    this.toggleBtn = document.getElementById('theme-toggle');
    
    // ✅ 存在確認
    if (!this.toggleBtn) {
      throw new Error(
        'Theme toggle button with id "theme-toggle" not found in DOM. ' +
        'Make sure the button element exists in your HTML.'
      );
    }
    
    this.body = document.body;
    this.onThemeChange = onThemeChange;
    
    // ✅ LocalStorageからテーマを読み込み
    const savedTheme = localStorage.getItem('neon-charts-theme');
    this.isLuxury = savedTheme === 'luxury';
    
    // 初期テーマ適用
    this.applyTheme();

    this.toggleBtn.addEventListener('click', () => this.toggleTheme());
  }

  toggleTheme() {
    this.isLuxury = !this.isLuxury;
    this.applyTheme();
    
    // ✅ LocalStorageに保存
    localStorage.setItem('neon-charts-theme', this.isLuxury ? 'luxury' : 'neon');
    console.log(`✅ Theme changed to: ${this.isLuxury ? 'Luxury' : 'Neon'}`);
  }
  
  // ✅ テーマ適用を別メソッド化
  applyTheme() {
    if (this.isLuxury) {
      this.body.classList.remove('theme-neon');
      this.body.classList.add('theme-luxury');
      this.toggleBtn.querySelector('.btn-text').textContent = 'Switch to Neon';
    } else {
      this.body.classList.remove('theme-luxury');
      this.body.classList.add('theme-neon');
      this.toggleBtn.querySelector('.btn-text').textContent = 'Switch to Luxury';
    }

    if (this.onThemeChange) {
      this.onThemeChange(this.isLuxury);
    }
  }
}
```

---

## 🟠 High Priority - 2週間以内に対応

### Issue #5: エラー処理の共通化

**ファイル**: `src/js/main.js`

```javascript
// ❌ Before (重複コード)
// S&P 500用
if (sp500Data && !sp500Data.error) {
  // ...
} else {
  let msg = 'API Error';
  const err = sp500Data?.message || '';
  if (err.includes('Unauthorized')) msg = 'Invalid Key';
  else if (err.includes('Failed to fetch')) msg = 'Proxy Down';
  else if (err.includes('Rate Limit')) msg = 'API Limit';
  document.getElementById('price-sp500').textContent = msg;
}

// FANG+用 - 完全に同じロジック
if (fangData && !fangData.error) {
  // ...
} else {
  let msg = 'API Error';
  const err = fangData?.message || '';
  if (err.includes('Unauthorized')) msg = 'Invalid Key';
  else if (err.includes('Failed to fetch')) msg = 'Proxy Down';
  else if (err.includes('Rate Limit')) msg = 'API Limit';
  document.getElementById('price-fang').textContent = msg;
}

// ✅ After (共通化)

// ✅ 共通エラー処理関数
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

// ✅ エラー表示関数
function showError(cardId, errorData) {
  const errorInfo = parseApiError(errorData);
  
  if (!errorInfo) {
    console.error(`Unexpected error format for ${cardId}:`, errorData);
    return;
  }
  
  const priceEl = document.getElementById(`price-${cardId}`);
  priceEl.textContent = errorInfo.message;
  priceEl.className = 'current-price error';
  
  // エラータイプ別の追加情報
  if (errorInfo.type === 'network') {
    console.warn('⚠️  Proxy server may not be running. Start it with: node proxy.js');
  } else if (errorInfo.type === 'auth') {
    console.error('❌ API Key is invalid. Check your .env file.');
  } else if (errorInfo.type === 'rate') {
    console.warn('⚠️  API rate limit reached. Data will refresh in 10 minutes.');
  }
}

// ✅ 使用例
async function loadData() {
  try {
    // 並列実行（次のIssue #6で詳述）
    const [sp500Data, fangData, btcData] = await Promise.all([
      fetchStockData('SPY'),
      fetchStockData('FNGS'),
      fetchBitcoinData()
    ]);

    // S&P 500
    if (sp500Data && !sp500Data.error) {
      updateCard('sp500', sp500Data.current, sp500Data.change, sp500Data.historical);
      document.querySelector('#card-sp500 .ticker').textContent = 'SPY (S&P 500 ETF)';
    } else {
      showError('sp500', sp500Data);
    }

    // FANG+
    if (fangData && !fangData.error) {
      updateCard('fang', fangData.current, fangData.change, fangData.historical);
      document.querySelector('#card-fang .ticker').textContent = 'FNGS (FANG+ ETN)';
    } else {
      showError('fang', fangData);
    }

    // Bitcoin
    if (btcData) {
      updateCard('btc', btcData.current, btcData.change, btcData.history);
    } else {
      showError('btc', { error: true, message: 'CoinGecko API error' });
    }

  } catch (error) {
    console.error('❌ Fatal error loading data:', error);
  }
}
```

**CSS追加** (`src/css/main.css`):
```css
.current-price.error {
  color: #ff0055;
  font-size: 1.2rem;
}
```

---

### Issue #6: API呼び出しの並列化

**ファイル**: `src/js/main.js`

```javascript
// ❌ Before (遅い: 約3秒)
async function loadData() {
  try {
    const sp500Data = await fetchStockData('SPY');    // 1秒待機
    // ... 処理 ...
    const fangData = await fetchStockData('FNGS');    // さらに1秒待機
    // ... 処理 ...
    const btcData = await fetchBitcoinData();         // さらに1秒待機
    // ... 処理 ...
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// ✅ After (速い: 約1秒)
async function loadData() {
  try {
    // ✅ 並列実行（3つ同時にリクエスト）
    const [sp500Data, fangData, btcData] = await Promise.all([
      fetchStockData('SPY'),
      fetchStockData('FNGS'),
      fetchBitcoinData()
    ]);

    // S&P 500の処理
    if (sp500Data && !sp500Data.error) {
      updateCard('sp500', sp500Data.current, sp500Data.change, sp500Data.historical);
      document.querySelector('#card-sp500 .ticker').textContent = 'SPY (S&P 500 ETF)';
    } else {
      showError('sp500', sp500Data);
    }

    // FANG+の処理
    if (fangData && !fangData.error) {
      updateCard('fang', fangData.current, fangData.change, fangData.historical);
      document.querySelector('#card-fang .ticker').textContent = 'FNGS (FANG+ ETN)';
    } else {
      showError('fang', fangData);
    }

    // Bitcoinの処理
    if (btcData) {
      updateCard('btc', btcData.current, btcData.change, btcData.history);
    } else {
      showError('btc', { error: true, message: 'CoinGecko API error' });
    }

  } catch (error) {
    console.error('❌ Fatal error loading data:', error);
  }
}
```

**パフォーマンス比較**:
- Before: 1秒 + 1秒 + 1秒 = **3秒**
- After: max(1秒, 1秒, 1秒) = **1秒** (✅ **3倍高速化**)

---

### Issue #8: マジックナンバーの定数化

**ファイル**: `proxy.js`

```javascript
// ❌ Before
const CACHE_DURATION = 60 * 1000; // 何分？

// ✅ After
const CACHE_DURATION_MS = 1 * 60 * 1000; // 1 minute
const CACHE_DURATION_SECONDS = 60; // For logging

console.log(`📋 Cache duration: ${CACHE_DURATION_SECONDS} seconds`);
```

**ファイル**: `src/js/main.js`

```javascript
// ❌ Before
setInterval(loadData, 600000); // 何分？

// ✅ After
const API_REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const API_REFRESH_INTERVAL_MINUTES = 10;

console.log(`🔄 Data will refresh every ${API_REFRESH_INTERVAL_MINUTES} minutes`);
setInterval(loadData, API_REFRESH_INTERVAL_MS);
```

---

## 🟡 Medium Priority - 1ヶ月以内

### Issue #10: CoinGecko APIキャッシュ

**ファイル**: `src/js/api.js`

```javascript
// ✅ キャッシュシステム追加
const cache = {
  bitcoin: { data: null, timestamp: 0 }
};
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export async function fetchBitcoinData() {
  // ✅ キャッシュチェック
  const now = Date.now();
  if (cache.bitcoin.data && (now - cache.bitcoin.timestamp < CACHE_DURATION_MS)) {
    console.log('📋 Using cached Bitcoin data');
    return cache.bitcoin.data;
  }

  try {
    const [priceRes, historyRes] = await Promise.all([
      fetch(`${COINGECKO_URL}/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true`),
      fetch(`${COINGECKO_URL}/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily`)
    ]);

    if (!priceRes.ok || !historyRes.ok) {
      throw new Error(`CoinGecko API error: ${priceRes.status} / ${historyRes.status}`);
    }

    const priceData = await priceRes.json();
    const historyData = await historyRes.json();

    const uniqueHistory = new Map();
    historyData.prices.forEach(([timestamp, price]) => {
      const dateStr = new Date(timestamp).toISOString().split('T')[0];
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
    
    // ✅ キャッシュ更新
    cache.bitcoin = { data: result, timestamp: now };
    console.log('✅ Bitcoin data fetched and cached');
    return result;
    
  } catch (error) {
    console.error('❌ Error fetching Bitcoin data:', error);
    
    // ✅ エラー時は古いキャッシュを返す（可能なら）
    if (cache.bitcoin.data) {
      console.warn('⚠️  Using stale Bitcoin data from cache');
      return cache.bitcoin.data;
    }
    
    return null;
  }
}
```

---

## 🛡️ Security Enhancements

### レートリミットの実装

**インストール**:
```bash
npm install express-rate-limit
```

**ファイル**: `proxy.js`

```javascript
const rateLimit = require('express-rate-limit');

// ✅ IPベースのレート制限
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分間
  max: 10, // 1IPあたり10リクエストまで
  message: {
    error: 'Rate Limit Exceeded',
    message: 'Too many requests from this IP address. Please try again later.',
    retryAfter: 60
  },
  standardHeaders: true, // RateLimit-* ヘッダー追加
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`⚠️  Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: 60
    });
  }
});

// 全APIエンドポイントに適用
app.use('/api/', apiLimiter);

console.log('🔒 Rate limiting enabled: 10 requests/minute per IP');
```

---

### 入力検証の追加

**ファイル**: `proxy.js`

```javascript
// ✅ Symbolバリデーションミドルウェア
function validateSymbol(req, res, next) {
  const { symbol } = req.params;
  
  // 1-5文字の大文字のみ
  const symbolRegex = /^[A-Z]{1,5}$/;
  if (!symbolRegex.test(symbol)) {
    return res.status(400).json({ 
      error: 'Invalid Symbol Format',
      message: 'Symbol must be 1-5 uppercase letters (e.g., SPY, AAPL, GOOGL)'
    });
  }
  
  // 許可リストチェック（オプション）
  const allowedSymbols = ['SPY', 'FNGS', 'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
  if (!allowedSymbols.includes(symbol)) {
    return res.status(403).json({ 
      error: 'Symbol Not Allowed',
      message: `Only these symbols are allowed: ${allowedSymbols.join(', ')}`
    });
  }
  
  next(); // 検証成功
}

// ✅ バリデーション適用
app.get('/api/quote/:symbol', validateSymbol, async (req, res) => {
  const { symbol } = req.params;
  // ... 既存の処理 ...
});
```

---

## 📝 完全なproxyjs修正版

```javascript
// proxy.js - 完全修正版
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ✅ API Key検証
const API_KEY = process.env.TWELVE_DATA_API_KEY;
if (!API_KEY) {
  console.error('\x1b[31mFATAL: TWELVE_DATA_API_KEY not set!\x1b[0m');
  process.exit(1);
}

// ✅ CORS設定
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('CORS not allowed'), false);
  }
}));

// ✅ レートリミット
const apiLimiter = rateLimit({
  windowMs: 60000,
  max: 10,
  message: { error: 'Rate Limit', retryAfter: 60 }
});
app.use('/api/', apiLimiter);

// ✅ 入力検証
function validateSymbol(req, res, next) {
  const { symbol } = req.params;
  if (!/^[A-Z]{1,5}$/.test(symbol)) {
    return res.status(400).json({ error: 'Invalid symbol format' });
  }
  next();
}

// キャッシュ
const cache = new Map();
const CACHE_DURATION_MS = 60000;

app.get('/', (req, res) => {
  res.json({ status: 'running', apiKey: 'configured' });
});

app.get('/api/quote/:symbol', validateSymbol, async (req, res) => {
  const { symbol } = req.params;
  
  // キャッシュチェック
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return res.json(cached.data);
  }
  
  try {
    const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=30&apikey=${API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'error') {
      return res.status(400).json({ error: data.message });
    }
    
    const values = data.values;
    const result = {
      current: parseFloat(values[0].close),
      change: ((parseFloat(values[0].close) - parseFloat(values[1].close)) / parseFloat(values[1].close)) * 100,
      historical: values.map(v => ({
        time: v.datetime,
        value: parseFloat(v.close)
      })).reverse()
    };
    
    cache.set(symbol, { data: result, timestamp: Date.now() });
    res.json(result);
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Proxy running on http://localhost:${PORT}`);
});
```

---

**このファイルを参照しながら、各Issueを順次修正してください。**