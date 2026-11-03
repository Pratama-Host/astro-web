import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import process from 'node:process';

const configuredSite = (() => {
  try {
    const url = new URL(process.env.SITE_ORIGIN || '');
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.origin : undefined;
  } catch {
    return undefined;
  }
})();

export default defineConfig({
  site: configuredSite,
  output: 'server',
  adapter: cloudflare({
    imageService: 'compile',
  }),
  compressHTML: true,
  build: {
    assets: '_astro',
  },
});
