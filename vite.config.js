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

// Search-engine metadata is hostname-specific. index.html targets the canonical Workers build
// and marks the Pages copy as noindex; the Workers build flips robots and verification codes.
const CLOUDFLARE_VERIFICATION = {
  'google-site-verification': '4-oFMM5rkFdolJq5kOivEjLARgZEJllGJkExIFR5vOQ',
  'yandex-verification': '66a93615838b27c1',
  'msvalidate.01': '2643BF72E05CF1193FF728D24F07BCAE',
};

const CLOUDFLARE_ROBOTS = 'index, follow, max-image-preview:large';

function cloudflareSeo() {
  return {
    name: 'cloudflare-seo',
    apply: 'build',
    transformIndexHtml(html) {
      if (!isCloudflareBuild) return html;
      return html
        .replace(
          /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/,
          `<meta name="robots" content="${CLOUDFLARE_ROBOTS}" />`,
        )
        .replace(
          /<meta\s+name="(google-site-verification|yandex-verification|msvalidate\.01)"\s+content="[^"]*"\s*\/?>/g,
          (match, name) =>
            `<meta name="${name}" content="${CLOUDFLARE_VERIFICATION[name]}" />`,
        );
    },
  };
}

export default defineConfig(({ command }) => ({
  base: command === 'build' && !isCloudflareBuild ? '/character-card-studio/' : '/',
  plugins: [react(), copySiteConfig(), cloudflareSeo()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 3000,
  },
}));
