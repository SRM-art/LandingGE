import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone', bodySizeLimit: 11 * 1024 * 1024 }),
  security: { allowedDomains: [{ hostname: '127.0.0.1', protocol: 'http' }, { hostname: 'localhost', protocol: 'http' }] },
  devToolbar: { enabled: false },
  server: { host: '127.0.0.1', port: 4321 },
  vite: { server: { strictPort: true } },
});
