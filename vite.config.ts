import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'date-fns-resolver',
      resolveId(id) {
        // Handle direct imports to date-fns/index.mjs
        if (id === 'date-fns/index.mjs') {
          return path.resolve(__dirname, 'node_modules/date-fns/esm/index.js');
        }
        return null;
      }
    }
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['date-fns']
  },
  resolve: {
    alias: {
      'date-fns': path.resolve(__dirname, 'node_modules/date-fns'),
    },
  },
});
