# Neon Charts 2025 - セキュリティ詳細分析レポート

**レビュー日**: 2025-11-26  
**セキュリティスコア**: 6/10 (⚠️ Needs Improvement)  
**本番環境デプロイ**: ⚠️ **非推奨**（Critical Issues修正後のみ推奨）

---

## 🔴 Critical Security Issues

### 1. API Keyの不適切なデフォルト値

**ファイル**: `proxy.js:12`  
**リスクレベル**: 🔴 Critical  
**CVSSスコア**: 7.5 (High)

**脇威の詳細**:
```javascript
const API_KEY = process.env.TWELVE_DATA_API_KEY || 'demo'; // ❌ VULNERABLE
```

**攻撃シナリオ**:
1. 開発者が.envファイルを設定し忘れる
2. アプリケーションがdemoキーで起動（エラーなし）
3. Twelve Dataのdemoキーは1日あたり8リクエストの制限
4. ユーザーがアクセスするとAPIエラーが頻発
5. 本番環境でサービスが使用不可に

**影響範囲**:
- サービスの不安定性
- ユーザー体験の極度の低下
- デバッグが困難（エラーが間欠的）

**修正方法**:
```javascript
// ✅ SECURE: 環境変数必須化
const API_KEY = process.env.TWELVE_DATA_API_KEY;

if (!API_KEY) {
  console.error('\x1b[31m%s\x1b[0m', 'FATAL ERROR: TWELVE_DATA_API_KEY environment variable is not set!');
  console.error('Please create a .env file with: TWELVE_DATA_API_KEY=your_api_key_here');
  console.error('Get your API key from: https://twelvedata.com/');
  process.exit(1); // 即座終了
}

console.log('✅ API Key loaded successfully');
```

**検証方法**:
1. `.env`ファイルを削除
2. `node proxy.js`を実行
3. エラーメッセージが表示され、起動しないことを確認

---

### 2. CORS設定の過度な緩和

**ファイル**: `proxy.js:10`  
**リスクレベル**: 🔴 Critical  
**CVSSスコア**: 6.5 (Medium-High)

**脇威の詳細**:
```javascript
app.use(cors()); // ❌ 全オリジン許可 = 無防備状態
```

**攻撃シナリオ**:
1. 攻撃者が悪意のあるウェブサイトを作成
2. 被害者がそのサイトにアクセス
3. JavaScriptから`http://localhost:3001/api/quote/SPY`を呼び出し
4. 被害者のAPIクォータを消費（無断使用）
5. APIレート制限に達し、正規ユーザーがサービス使用不可に

**影響範囲**:
- APIクォータの不正消費
- サービス不能攻撃（DoS）
- 予期せぬAPI料金発生（有料プランの場合）

**修正方法**:
```javascript
// ✅ SECURE: ホワイトリスト方式
const allowedOrigins = [
  'http://localhost:5173',      // Vite dev server
  'http://localhost:3000',      // Alternative dev port
  'https://neon-charts.com',    // Production domain
  'https://www.neon-charts.com' // Production www subdomain
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `CORS policy: Origin ${origin} is not allowed. Allowed origins: ${allowedOrigins.join(', ')}`;
      console.warn('⚠️', msg);
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, // Allow cookies if needed
  optionsSuccessStatus: 200
}));

console.log('✅ CORS configured for:', allowedOrigins);
```

**検証方法**:
```javascript
// 悪意のあるHTMLファイルでテスト
// test-cors-attack.html
<script>
fetch('http://localhost:3001/api/quote/SPY')
  .then(r => r.json())
  .then(d => console.log('ATTACK SUCCESS:', d)) // ❌ 失敗するべき
  .catch(e => console.log('ATTACK BLOCKED:', e)); // ✅ こちらが期待動作
</script>
```

---

### 3. API Keyのクライアント側露出（現状は安全）

**ファイル**: `src/js/api.js`  
**リスクレベル**: 🟢 None (現在は安全に実装済み)  

**現在の実装**:
```javascript
// ✅ SECURE: プロキシ経由でAPIキーを隠蔽
const PROXY_URL = 'http://localhost:3001/api/quote';
export async function fetchStockData(symbol) {
  const response = await fetch(`${PROXY_URL}/${symbol}`); // APIキーはサーバー側
  // ...
}
```

**良い点**:
- APIキーがフロントエンドコードに含まれていない
- ブラウザのDevToolsでAPIキーが見えない
- プロキシサーバーがAPIキーを安全に管理

**注意事項**:
- プロキシサーバーが停止するとサービス全体が使用不可
- 本番環境ではプロキシサーバーの高可用性確保が必要

---

## 🟠 High Priority Security Issues

### 4. レートリミットの不完全な実装

**ファイル**: `proxy.js:19-24`  
**リスクレベル**: 🟠 High  

**現在の実装**:
```javascript
const cache = {
    data: {},
    timestamp: {}
};
const CACHE_DURATION = 60 * 1000; // 1分間キャッシュ
```

**問題点**:
- キャッシュはあるが、リクエスト自体のレート制限がない
- 攻撃者が異なるsymbolで大量リクエストを送信できる
- Twelve DataのAPI制限（無料: 8リクエスト/分）を超える可能性

**修正方法**:
```javascript
const rateLimit = require('express-rate-limit');

// ✅ IPベースのレート制限
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分間
  max: 5, // 1IPあたり5リクエストまで
  message: {
    error: 'Rate Limit Exceeded',
    message: 'Too many requests from this IP. Please try again later.',
    retryAfter: 60
  },
  standardHeaders: true, // RateLimit-* headers
  legacyHeaders: false
});

app.use('/api/', apiLimiter); // 全APIエンドポイントに適用
```

**インストール**:
```bash
npm install express-rate-limit
```

---

### 5. エラーメッセージによる情報漏洩

**ファイル**: `proxy.js:86-87`  
**リスクレベル**: 🟠 High  

**問題点**:
```javascript
catch (error) {
    console.error(`Error processing ${symbol}:`, error);
    res.status(500).json({ error: error.message || 'Internal Server Error' }); // ❌ 詳細露出
}
```

**リスク**:
- 内部エラーがクライアントに露出
- スタックトレースやファイルパスが漏洩する可能性
- 攻撃者にシステム構造のヒントを与える

**修正方法**:
```javascript
// ✅ SECURE: 環境別のエラーハンドリング
const isDevelopment = process.env.NODE_ENV === 'development';

catch (error) {
    // ログはサーバー側で詳細に記録
    console.error(`[ERROR] Processing ${symbol}:`, {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
    });
    
    // クライアントには最小限の情報のみ
    res.status(500).json({ 
        error: isDevelopment ? error.message : 'An unexpected error occurred',
        code: 'INTERNAL_SERVER_ERROR'
    });
}
```

---

## 🟡 Medium Priority Security Issues

### 6. キャッシュのメモリ無制限成長

**ファイル**: `proxy.js:19-23`  
**リスクレベル**: 🟡 Medium  

**問題点**:
```javascript
const cache = {
    data: {},      // ❌ 無制限に増える
    timestamp: {}  // ❌ 古いエントリが削除されない
};
```

**攻撃シナリオ**:
1. 攻撃者が1000個の異なるsymbolをリクエスト
2. キャッシュが無限に増え、メモリを消費
3. サーバーのメモリ不足でクラッシュ

**修正方法**:
```javascript
// ✅ SECURE: LRUキャッシュ使用
const NodeCache = require('node-cache');
const cache = new NodeCache({ 
  stdTTL: 60,        // 60秒間有効
  checkperiod: 120,  // 2分ごとに期限切れエントリ削除
  maxKeys: 100       // 最大1000エントリ
});

app.get('/api/quote/:symbol', async (req, res) => {
    const { symbol } = req.params;
    
    // キャッシュチェック
    const cachedData = cache.get(symbol);
    if (cachedData) {
        return res.json(cachedData);
    }
    
    // ... API呼び出し ...
    
    // キャッシュに保存
    cache.set(symbol, result);
    res.json(result);
});
```

**インストール**:
```bash
npm install node-cache
```

---

### 7. 入力検証の欠如

**ファイル**: `proxy.js:40-41`  
**リスクレベル**: 🟡 Medium  

**問題点**:
```javascript
app.get('/api/quote/:symbol', async (req, res) => {
    const { symbol } = req.params; // ❌ 検証なし
    // ...
    const data = await fetchTwelveData(`/time_series?symbol=${symbol}...`); // ❌ インジェクションリスク
});
```

**リスク**:
- SQL Injectionに似た攻撃（URLインジェクション）
- 悪意のあるsymbol値でAPIエラー誘発

**修正方法**:
```javascript
// ✅ SECURE: 入力検証
app.get('/api/quote/:symbol', async (req, res) => {
    const { symbol } = req.params;
    
    // Symbolのバリデーション
    const symbolRegex = /^[A-Z]{1,5}$/; // 1-5文字の大文字のみ
    if (!symbolRegex.test(symbol)) {
        return res.status(400).json({ 
            error: 'Invalid symbol format',
            message: 'Symbol must be 1-5 uppercase letters (e.g., SPY, AAPL)'
        });
    }
    
    // 許可リストチェック（オプション）
    const allowedSymbols = ['SPY', 'FNGS', 'AAPL', 'GOOGL', 'MSFT']; // 追加可能
    if (!allowedSymbols.includes(symbol)) {
        return res.status(403).json({ 
            error: 'Symbol not allowed',
            message: `Allowed symbols: ${allowedSymbols.join(', ')}`
        });
    }
    
    // ... 残りの処理 ...
});
```

---

## 🟢 Low Priority / Informational

### 8. HTTPSの未使用（ローカル開発）

**現在の実装**:
```javascript
const PROXY_URL = 'http://localhost:3001/api/quote'; // HTTP
```

**推奨事項**:
- 本番環境ではHTTPS必須
- SSL/TLS証明書の設定
- Let's Encryptで無料証明書取得可能

---

## 🛡️ セキュリティチェックリスト

### 即座対応必須
- [ ] API Key必須化（`proxy.js`）
- [ ] CORS設定の厳格化（`proxy.js`）
- [ ] レートリミット実装（`express-rate-limit`）

### 1週間以内
- [ ] エラーメッセージのサニタイズ
- [ ] キャッシュのメモリ管理（`node-cache`）
- [ ] 入力検証の追加

### 1ヶ月以内
- [ ] HTTPS化（本番環境）
- [ ] セキュリティヘッダーの追加（Helmet.js）
- [ ] ロギングシステムの構築

---

## 📊 セキュリティスコア詳細

| 評価項目 | スコア | 詳細 |
|---------|-------|------|
| APIキー管理 | 4/10 | ⚠️ デフォルト値あり |
| CORS設定 | 3/10 | ⚠️ 全オリジン許可 |
| 入力検証 | 5/10 | ⚠️ 検証なし |
| レート制限 | 6/10 | ⚠️ キャッシュのみ |
| エラー処理 | 5/10 | ⚠️ 情報漏洩リスク |
| HTTPS | 7/10 | ✅ 本番で必要 |
| ロギング | 8/10 | ✅ 基本実装あり |

**総合スコア**: 6/10 (⚠️ Needs Improvement)

---

## 📝 推奨セキュリティ強化パッケージ

```bash
# レートリミット
npm install express-rate-limit

# キャッシュ管理
npm install node-cache

# セキュリティヘッダー
npm install helmet

# 入力検証
npm install express-validator

# 環境変数検証
npm install joi
```

---

## 🎯 セキュリティ強化プラン

### Phase 1: Critical Fixes (Week 1)
```bash
# 1. API Key必須化
if (!process.env.TWELVE_DATA_API_KEY) process.exit(1);

# 2. CORS制限
app.use(cors({ origin: allowedOrigins }));

# 3. レートリミット
const limiter = rateLimit({ max: 5, windowMs: 60000 });
app.use('/api/', limiter);
```

### Phase 2: Security Hardening (Week 2-3)
```bash
# 4. 入力検証
app.get('/api/quote/:symbol', validateSymbol, handler);

# 5. Helmet.js
app.use(helmet());

# 6. ロギング
const morgan = require('morgan');
app.use(morgan('combined'));
```

### Phase 3: Monitoring (Week 4)
```bash
# 7. セキュリティログ
npm install winston

# 8. 監視
npm install express-status-monitor
```

---

**最終結論**: 現在のセキュリティスコアは6/10で、**本番環境へのデプロイは非推奨**です。Critical Issues（API Key必須化、CORS設定）を修正してからデプロイしてください。

---

**レポート作成**: Claude Code Security Specialist  
**次回レビュー**: 修正完了後（2025-12-10頃）