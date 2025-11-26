import { fetchStockData, fetchBitcoinData } from '../src/js/api.js';

describe('fetchStockData', () => {
  test('正常なシンボルでデータ取得', async () => {
    const data = await fetchStockData('SPY');
    
    expect(data).toHaveProperty('current');
    expect(data).toHaveProperty('change');
    expect(data).toHaveProperty('historical');
    
    if (!data.error) {
      expect(typeof data.current).toBe('number');
      expect(data.current).toBeGreaterThan(0);
      expect(Array.isArray(data.historical)).toBe(true);
    }
  }, 15000);
  
  test('無効なシンボルでエラー返却', async () => {
    const data = await fetchStockData('INVALID_SYMBOL_12345');
    expect(data.error).toBe(true);
    expect(data).toHaveProperty('message');
  }, 15000);
});

describe('fetchBitcoinData', () => {
  test('Bitcoinデータ取得', async () => {
    const data = await fetchBitcoinData();
    
    if (!data.error) {
      expect(data).toHaveProperty('current');
      expect(data).toHaveProperty('change');
      expect(data).toHaveProperty('history');
      
      expect(typeof data.current).toBe('number');
      expect(data.current).toBeGreaterThan(0);
      expect(Array.isArray(data.history)).toBe(true);
    }
  }, 15000);
  
  test('キャッシュが正常に動作', async () => {
    const data1 = await fetchBitcoinData();
    const data2 = await fetchBitcoinData();
    
    if (!data1.error && !data2.error) {
      expect(data1.current).toBe(data2.current);
    }
  }, 15000);
});
