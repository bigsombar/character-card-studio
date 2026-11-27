import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

// GitHub Pages reads _config.yml from the deployed branch. Vite does not normally copy
// repository-root files, so mirror it into dist after the bundle is written.
function copySiteConfig() {
  return {
    name: 'copy-site-config',
    apply: 'build',
    closeBundle() {
      const source = resolve(rootDir, '_config.yml');
      if (existsSync(source)) {
        copyFileSync(source, resolve(rootDir, 'dist', '_config.yml'));
      }
    },
  };
}

// GitHub Pages serves the app from the repository subpath, while Cloudflare Workers serves it
// from the hostname root. Set DEPLOY_TARGET=cloudflare for the Workers build.
const isCloudflareBuild = process.env.DEPLOY_TARGET === 'cloudflare';

export default defineConfig(({ command }) => ({
  base: command === 'build' && !isCloudflareBuild ? '/character-card-studio/' : '/',
  plugins: [react(), copySiteConfig()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 3000,
  },
}));
