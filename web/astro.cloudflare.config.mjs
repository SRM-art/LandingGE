import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// The same pages use Node in local development and Cloudflare bindings in production.
export default defineConfig({
  output:'server',
  outDir:'./dist-cloudflare',
  adapter:cloudflare({configPath:'./wrangler.jsonc',imageService:'passthrough',remoteBindings:false}),
  session:false,
  devToolbar:{enabled:false},
  vite:{resolve:{alias:Object.fromEntries(['database','runtime','media'].map(name=>[
    '#'+name,fileURLToPath(new URL(`./src/server/${name}.cloudflare.ts`,import.meta.url)),
  ]))}},
});
