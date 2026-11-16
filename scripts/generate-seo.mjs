import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
const htmlPath = resolve(dist, 'index.html');

if (!siteUrl) {
  if (existsSync(sitemapPath)) rmSync(sitemapPath);
  console.warn('SITE_URL is not set: sitemap.xml and static canonical metadata were skipped. Set SITE_URL to your real public domain.');
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

  if (existsSync(htmlPath)) {
    let html = readFileSync(htmlPath, 'utf8');
    const canonical = `${siteUrl}/`;
    const image = `${siteUrl}/assets/og-image.jpg`;
    const person = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': `${canonical}#person`,
      name: 'Aditya Kumar Ratre',
      alternateName: ['Aditya Ratre', 'Aditya Kumar Ratre'],
      description: 'BBA student at D.P. Vipra College, Bilaspur; founder of NexaGrind AI, developer and digital creator from Chhattisgarh, India.',
      url: canonical,
      image,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Bilaspur',
        addressRegion: 'Chhattisgarh',
        addressCountry: 'IN',
      },
      affiliation: {
        '@type': 'EducationalOrganization',
        name: 'D.P. Vipra College',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Bilaspur',
          addressRegion: 'Chhattisgarh',
          addressCountry: 'IN',
        },
      },
      sameAs: [
        'https://www.linkedin.com/in/adityaratre',
        'https://github.com/adityaratre',
        'https://www.instagram.com/mr.aditya_ratre',
        'https://www.instagram.com/nexagrindyt/',
        'https://www.youtube.com/@nexagrind',
      ],
    };
    const tags = [
      `<link rel="canonical" href="${canonical}">`,
      `<meta property="og:url" content="${canonical}">`,
      `<meta property="og:image" content="${image}">`,
      `<meta name="twitter:image" content="${image}">`,
      `<script id="portfolio-static-person-schema" type="application/ld+json">${JSON.stringify(person)}</script>`,
    ].join('\n    ');

    if (html.includes('</head>')) {
      html = html.replace('</head>', `    ${tags}\n  </head>`);
      writeFileSync(htmlPath, html, 'utf8');
    }
  }
  console.log(`Generated sitemap.xml and static canonical metadata for ${siteUrl}`);
}
