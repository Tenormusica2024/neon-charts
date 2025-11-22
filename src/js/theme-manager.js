export class ThemeManager {
  constructor(onThemeChange) {
    this.toggleBtn = document.getElementById('theme-toggle');
    this.body = document.body;
    this.isLuxury = false;
    this.onThemeChange = onThemeChange;

    this.toggleBtn.addEventListener('click', () => this.toggleTheme());
  }

  toggleTheme() {
    this.isLuxury = !this.isLuxury;

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
