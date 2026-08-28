import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

function missingTerrainTile404() {
  return {
    name: 'missing-terrain-tile-404',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? '';
        const base = (server.config.base || '/').replace(/\/$/, '');
        const prefixes = [`${base}/terrain/`, '/terrain/'];
        if (!prefixes.some((prefix) => url.startsWith(prefix)) || !url.endsWith('.png')) {
          next();
          return;
        }

        const relative = url.replace(/^\/+/, '').replace(/^ourea\//, '');
        if (relative.includes('..')) {
          res.statusCode = 400;
          res.end('Invalid path');
          return;
        }

        const filePath = path.join(server.config.root, 'public', ...relative.split('/'));
        if (!fs.existsSync(filePath)) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain');
          res.end('Not found');
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  base: process.env.OUREA_BASE || '/',
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/maplibre-gl')) return 'maplibre';
        },
      },
    },
  },
  plugins: [missingTerrainTile404()],
});
