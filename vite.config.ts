import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5000,
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: true,
    hmr: {
      clientPort: 443,
      protocol: 'wss'
    }
  },
  plugins: [],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
