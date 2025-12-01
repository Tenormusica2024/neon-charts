import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/neon-charts/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },
  publicDir: false,
  plugins: [
    {
      name: 'copy-market-data',
      writeBundle() {
        const fs = require('fs');
        const path = require('path');
        const src = path.resolve(__dirname, 'market_data.json');
        const dest = path.resolve(__dirname, 'dist', 'market_data.json');
        fs.copyFileSync(src, dest);
        console.log('✓ market_data.json copied to dist/');
      }
    }
  ]
});
