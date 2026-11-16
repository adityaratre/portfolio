import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dist = resolve('dist');
const raw = process.env.SITE_URL || process.env.VITE_SITE_URL || '';
const adminPath = '/_private-console-8a4f2d';

if (!existsSync(dist)) {
  console.error('The dist directory is missing. Run the Vite build first.');
  process.exit(1);
}
mkdirSync(dist, { recursive: true });

let siteUrl = '';
if (raw) {
  try {
    const parsed = new URL(raw);
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Use an http or https URL.');
    siteUrl = parsed.origin;
  } catch (error) {
    console.error(`Invalid SITE_URL: ${error instanceof Error ? error.message : 'invalid URL'}`);
    process.exit(1);
  }
}

const robots = [
  'User-agent: *',
  'Allow: /',
  `Disallow: ${adminPath}`,
  ...(siteUrl ? [`Sitemap: ${siteUrl}/sitemap.xml`] : []),
  '',
].join('\n');
writeFileSync(resolve(dist, 'robots.txt'), robots, 'utf8');

const sitemapPath = resolve(dist, 'sitemap.xml');
if (!siteUrl) {
  if (existsSync(sitemapPath)) rmSync(sitemapPath);
  console.warn('SITE_URL is not set: robots.txt was generated, but sitemap.xml was skipped. Set SITE_URL to your real public domain.');
} else {
  const lastmod = new Date().toISOString().slice(0, 10);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
  writeFileSync(sitemapPath, xml, 'utf8');
  console.log(`Generated sitemap.xml for ${siteUrl}`);
}
