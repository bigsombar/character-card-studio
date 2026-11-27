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

// Keep the staging noindex header out of the Pages build, but make every Workers build ship it.
function copyCloudflareHeaders() {
  return {
    name: 'copy-cloudflare-headers',
    apply: 'build',
    closeBundle() {
      if (!isCloudflareBuild) return;
      const source = resolve(rootDir, 'cloudflare', '_headers');
      if (existsSync(source)) {
        copyFileSync(source, resolve(rootDir, 'dist', '_headers'));
      }
    },
  };
}

// Search-engine verification codes are tied to the hostname. Keep the Pages values in
// index.html and swap them only for the Workers build.
const CLOUDFLARE_VERIFICATION = {
  'google-site-verification': '4-oFMM5rkFdolJq5kOivEjLARgZEJllGJkExIFR5vOQ',
  'yandex-verification': '66a93615838b27c1',
  'msvalidate.01': '2643BF72E05CF1193FF728D24F07BCAE',
};

function cloudflareVerification() {
  return {
    name: 'cloudflare-verification',
    apply: 'build',
    transformIndexHtml(html) {
      if (!isCloudflareBuild) return html;
      return html.replace(
        /<meta\s+name="(google-site-verification|yandex-verification|msvalidate\.01)"\s+content="[^"]*"\s*\/?>/g,
        (match, name) =>
          `<meta name="${name}" content="${CLOUDFLARE_VERIFICATION[name]}" />`,
      );
    },
  };
}

export default defineConfig(({ command }) => ({
  base: command === 'build' && !isCloudflareBuild ? '/character-card-studio/' : '/',
  plugins: [react(), copySiteConfig(), copyCloudflareHeaders(), cloudflareVerification()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 3000,
  },
}));
