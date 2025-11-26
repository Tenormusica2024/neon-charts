export class ThemeManager {
  constructor(onThemeChange) {
    this.toggleBtn = document.getElementById('theme-toggle');
    
    // DOM要素の存在確認
    if (!this.toggleBtn) {
      console.error('Theme toggle button not found: theme-toggle');
      throw new Error('Theme toggle button element with id "theme-toggle" does not exist');
    }
    
    this.body = document.body;
    this.onThemeChange = onThemeChange;
    
    // LocalStorageからテーマを読み込み（XSS対策：バリデーション実施）
    const savedTheme = localStorage.getItem('neon-charts-theme');
    // 許可された値のみを受け入れる（XSS対策）
    const validThemes = ['neon', 'luxury'];
    if (savedTheme && !validThemes.includes(savedTheme)) {
      console.warn(`⚠️  Invalid theme value in localStorage: "${savedTheme}". Using default theme.`);
      localStorage.removeItem('neon-charts-theme'); // 不正な値を削除
      this.isLuxury = false;
    } else {
      this.isLuxury = savedTheme === 'luxury';
    }
    
    console.log(`✅ Theme loaded from storage: ${this.isLuxury ? 'Luxury' : 'Neon'}`);
    
    // 初期テーマ適用
    this.applyTheme();

    this.toggleBtn.addEventListener('click', () => this.toggleTheme());
  }

  toggleTheme() {
    this.isLuxury = !this.isLuxury;
    this.applyTheme();
    
    // LocalStorageに保存
    localStorage.setItem('neon-charts-theme', this.isLuxury ? 'luxury' : 'neon');
    console.log(`✅ Theme changed to: ${this.isLuxury ? 'Luxury' : 'Neon'}`);
  }
  
  // テーマ適用を別メソッド化
  applyTheme() {
    if (this.isLuxury) {
      this.body.classList.remove('theme-neon');
      this.body.classList.add('theme-luxury');
      const btnText = this.toggleBtn.querySelector('.btn-text');
      if (btnText) btnText.textContent = 'Switch to Neon';
    } else {
      this.body.classList.remove('theme-luxury');
      this.body.classList.add('theme-neon');
      const btnText = this.toggleBtn.querySelector('.btn-text');
      if (btnText) btnText.textContent = 'Switch to Luxury';
    }

    if (this.onThemeChange) {
      this.onThemeChange(this.isLuxury);
    }
  }
}
