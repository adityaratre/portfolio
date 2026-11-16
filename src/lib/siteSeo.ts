import { profile, education, seo, skillCategories } from '../data/portfolio';

const env = import.meta.env as ImportMetaEnv & { readonly VITE_SITE_URL?: string };

function meta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function absoluteUrl(value: string, base: string) {
  if (!value) return '';
  try { return new URL(value, base || window.location.origin).toString(); }
  catch { return value; }
}

export function applyPortfolioSeo() {
  const siteUrl = (seo.canonicalUrl || env.VITE_SITE_URL || '').trim().replace(/\/$/, '');
  const canonical = siteUrl ? `${siteUrl}/` : '';
  const pageTitle = seo.title?.trim() || 'Aditya Kumar Ratre | Portfolio';
  const description = seo.description?.trim() || profile.intro;
  const image = absoluteUrl(seo.ogImage || '/assets/og-image.jpg', siteUrl || window.location.origin);
  const sameAs = Object.values(profile.links).filter((link): link is string => typeof link === 'string' && /^https?:\/\//.test(link));
  const college = education.find((item) => /vipra/i.test(item.school));
  const skills = skillCategories.flatMap((category) => category.skills.map((skill) => skill.name));

  document.title = pageTitle;
  meta('meta[name="description"]', 'name', 'description', description);
  meta('meta[name="author"]', 'name', 'author', profile.fullName);
  meta('meta[name="robots"]', 'name', 'robots', seo.robots || 'index,follow');
  meta('meta[name="keywords"]', 'name', 'keywords', (seo.keywords || []).join(', '));
  meta('meta[property="og:type"]', 'property', 'og:type', 'profile');
  meta('meta[property="og:title"]', 'property', 'og:title', pageTitle);
  meta('meta[property="og:description"]', 'property', 'og:description', description);
  meta('meta[property="og:image"]', 'property', 'og:image', image);
  meta('meta[property="og:site_name"]', 'property', 'og:site_name', profile.displayName);
  meta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  meta('meta[name="twitter:title"]', 'name', 'twitter:title', pageTitle);
  meta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
  meta('meta[name="twitter:image"]', 'name', 'twitter:image', image);
  if (seo.twitterHandle) meta('meta[name="twitter:site"]', 'name', 'twitter:site', seo.twitterHandle);

  let canonicalLink = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) {
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonical;
  } else {
    canonicalLink?.remove();
  }

  const person = {
    '@type': 'Person',
    '@id': canonical ? `${canonical}#person` : undefined,
    name: profile.fullName,
    alternateName: ['Aditya Ratre', 'Aditya Kumar Ratre'],
    description,
    jobTitle: profile.role,
    image,
    email: profile.email || undefined,
    url: canonical || undefined,
    address: { '@type': 'PostalAddress', addressLocality: 'Bilaspur', addressRegion: 'Chhattisgarh', addressCountry: 'IN' },
    affiliation: college ? { '@type': 'EducationalOrganization', name: college.school, address: { '@type': 'PostalAddress', addressLocality: 'Bilaspur', addressRegion: 'Chhattisgarh', addressCountry: 'IN' } } : undefined,
    sameAs,
    knowsAbout: skills,
  };
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      person,
      {
        '@type': 'WebSite',
        name: `${profile.fullName} — Portfolio`,
        url: canonical || undefined,
        inLanguage: 'en-IN',
        publisher: { '@type': 'Person', name: profile.fullName },
      },
      {
        '@type': 'ProfilePage',
        name: pageTitle,
        description,
        mainEntity: { '@id': canonical ? `${canonical}#person` : undefined, '@type': 'Person', name: profile.fullName },
        url: canonical || undefined,
      },
    ],
  };
  let schema = document.getElementById('portfolio-person-schema');
  if (!schema) {
    schema = document.createElement('script');
    schema.id = 'portfolio-person-schema';
    schema.setAttribute('type', 'application/ld+json');
    document.head.appendChild(schema);
  }
  schema.textContent = JSON.stringify(graph);
}
