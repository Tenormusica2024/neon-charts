import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      name: 'copy-assets',
      writeBundle() {
        // market_data.json をコピー
        const dataSrc = path.resolve(__dirname, 'market_data.json');
        const dataDest = path.resolve(__dirname, 'dist', 'market_data.json');
        fs.copyFileSync(dataSrc, dataDest);
        console.log('✓ market_data.json copied to dist/');
        
        // favicon.svg をコピー
        const faviconSrc = path.resolve(__dirname, 'favicon.svg');
        const faviconDest = path.resolve(__dirname, 'dist', 'favicon.svg');
        fs.copyFileSync(faviconSrc, faviconDest);
        console.log('✓ favicon.svg copied to dist/');
      }
    }
  ]
});
