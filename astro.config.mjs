// @ts-check
import { defineConfig } from 'astro/config';

// In locale il sito gira alla radice; su GitHub Pages vive sotto /<nome-repo>/.
// La CI passa SITO_URL e SITO_BASE, così lo stesso codice serve entrambi i casi.
const site = process.env.SITO_URL ?? 'https://garu92.github.io/Ricettario';
const base = process.env.SITO_BASE ?? '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  markdown: {
    smartypants: true,
  },
});
