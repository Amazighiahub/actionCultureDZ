/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_NAME = 'Culture Algérie';
const SITE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://culture-algerie.com';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;
const DEFAULT_DESCRIPTION = 'Découvrez le riche patrimoine culturel algérien : événements, sites historiques, œuvres littéraires et artistiques, artisanat traditionnel.';

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article' | 'event' | 'product' | 'place';
  url?: string;
  keywords?: string[];
  locale?: string;
  noindex?: boolean;
  jsonLd?: Record<string, any> | Record<string, any>[];
}

function setMeta(property: string, content: string, isName = false) {
  const attr = isName ? 'name' : 'property';
  let el = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(url: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', url);
}

// Langues supportées et leurs codes hreflang
const SUPPORTED_HREFLANGS: Array<{ lang: string; hreflang: string }> = [
  { lang: 'fr', hreflang: 'fr-DZ' },
  { lang: 'ar', hreflang: 'ar-DZ' },
  { lang: 'en', hreflang: 'en' },
  { lang: 'tz-ltn', hreflang: 'tzm-Latn' },
  { lang: 'tz-tfng', hreflang: 'tzm-Tfng' },
];

function setHreflangTags(url: string) {
  // Nettoyer les anciennes balises hreflang
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());

  // Ajouter une balise pour chaque langue
  for (const { hreflang } of SUPPORTED_HREFLANGS) {
    const el = document.createElement('link');
    el.setAttribute('rel', 'alternate');
    el.setAttribute('hreflang', hreflang);
    el.setAttribute('href', url);
    document.head.appendChild(el);
  }

  // Ajouter x-default (français par défaut)
  const xDefault = document.createElement('link');
  xDefault.setAttribute('rel', 'alternate');
  xDefault.setAttribute('hreflang', 'x-default');
  xDefault.setAttribute('href', url);
  document.head.appendChild(xDefault);
}

function setJsonLd(data: Record<string, any> | Record<string, any>[]) {
  const id = 'seo-json-ld';
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  image,
  type = 'website',
  url,
  keywords = [],
  locale = 'fr_DZ',
  noindex = false,
  jsonLd,
}) => {
  const location = useLocation();
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const fullUrl = url || `${SITE_URL}${location.pathname}`;
  const desc = description || DEFAULT_DESCRIPTION;
  const img = image || DEFAULT_IMAGE;

  useEffect(() => {
    document.title = fullTitle;

    // Standard meta
    setMeta('description', desc, true);
    setMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow', true);

    if (keywords.length > 0) {
      setMeta('keywords', keywords.join(', '), true);
    }

    // Open Graph
    setMeta('og:title', fullTitle);
    setMeta('og:description', desc);
    setMeta('og:image', img);
    setMeta('og:url', fullUrl);
    setMeta('og:type', type === 'event' ? 'article' : type);
    setMeta('og:site_name', SITE_NAME);
    setMeta('og:locale', locale);
    setMeta('og:locale:alternate', 'ar_DZ');
    setMeta('og:locale:alternate', 'en_US');

    // Twitter Card
    setMeta('twitter:card', 'summary_large_image', true);
    setMeta('twitter:title', fullTitle, true);
    setMeta('twitter:description', desc, true);
    setMeta('twitter:image', img, true);

    // Canonical
    setCanonical(fullUrl);

    // Hreflang — indique à Google les versions linguistiques de la page
    setHreflangTags(fullUrl);

    // JSON-LD
    if (jsonLd) {
      setJsonLd(jsonLd);
    }

    return () => {
      const ldEl = document.getElementById('seo-json-ld');
      if (ldEl) ldEl.remove();
      // Nettoyer les hreflang
      document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());
    };
  }, [fullTitle, desc, img, fullUrl, type, locale, noindex, keywords, jsonLd]);

  return null;
};

// ============================================
// JSON-LD BUILDERS
// ============================================

export function buildOeuvreJsonLd(oeuvre: any): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: oeuvre.titre || '',
    description: oeuvre.description?.substring(0, 300) || '',
    author: oeuvre.Users?.[0]
      ? { '@type': 'Person', name: `${oeuvre.Users[0].prenom || ''} ${oeuvre.Users[0].nom || ''}`.trim() }
      : undefined,
    datePublished: oeuvre.date_publication || oeuvre.date_creation,
    genre: oeuvre.Genre?.nom || oeuvre.TypeOeuvre?.nom_type || '',
    inLanguage: oeuvre.langue || 'fr',
    image: oeuvre.image_url || oeuvre.couverture_url || '',
    url: `${SITE_URL}/oeuvres/${oeuvre.id_oeuvre}`,
    ...(oeuvre.Livre ? {
      '@type': 'Book',
      isbn: oeuvre.Livre.isbn || undefined,
      numberOfPages: oeuvre.Livre.nombre_pages || undefined,
    } : {}),
  };
}

export function buildEvenementJsonLd(event: any): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.nom_evenement || event.titre || '',
    description: event.description?.substring(0, 300) || '',
    startDate: event.date_debut,
    endDate: event.date_fin,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: event.Lieu ? {
      '@type': 'Place',
      name: event.Lieu.nom || '',
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.Lieu.Commune?.nom || event.lieu || '',
        addressCountry: 'DZ',
      },
    } : undefined,
    organizer: event.Organisateur ? {
      '@type': 'Person',
      name: `${event.Organisateur.prenom || ''} ${event.Organisateur.nom || ''}`.trim(),
    } : undefined,
    image: event.image_url || event.couverture_url || '',
    url: `${SITE_URL}/evenements/${event.id_evenement}`,
  };
}

export function buildPatrimoineJsonLd(site: any): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'LandmarksOrHistoricalBuildings',
    name: site.nom || '',
    description: site.description?.substring(0, 300) || '',
    address: {
      '@type': 'PostalAddress',
      addressLocality: site.Commune?.nom || site.localisation || '',
      addressRegion: site.Commune?.Daira?.Wilaya?.nom || site.wilaya || '',
      addressCountry: 'DZ',
    },
    geo: site.latitude && site.longitude ? {
      '@type': 'GeoCoordinates',
      latitude: site.latitude,
      longitude: site.longitude,
    } : undefined,
    image: site.image_url || site.photo_principale || '',
    url: `${SITE_URL}/patrimoine/${site.id_site}`,
    additionalType: site.type_patrimoine || '',
  };
}

export function buildArtisanatJsonLd(artisanat: any): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: artisanat.nom || artisanat.titre || '',
    description: artisanat.description?.substring(0, 300) || '',
    category: artisanat.type_artisanat || artisanat.categorie || '',
    image: artisanat.images?.[0] || artisanat.image_url || '',
    url: `${SITE_URL}/artisanat/${artisanat.id_artisanat}`,
    manufacturer: artisanat.artisan ? {
      '@type': 'Person',
      name: `${artisanat.artisan.prenom || ''} ${artisanat.artisan.nom || ''}`.trim(),
    } : undefined,
    offers: artisanat.prix ? {
      '@type': 'Offer',
      price: artisanat.prix,
      priceCurrency: 'DZD',
      availability: 'https://schema.org/InStock',
    } : undefined,
  };
}

export function buildArticleJsonLd(oeuvre: any): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: oeuvre.titre || '',
    description: oeuvre.description?.substring(0, 300) || '',
    author: oeuvre.Users?.[0]
      ? { '@type': 'Person', name: `${oeuvre.Users[0].prenom || ''} ${oeuvre.Users[0].nom || ''}`.trim() }
      : undefined,
    datePublished: oeuvre.date_publication || oeuvre.date_creation,
    dateModified: oeuvre.date_modification || oeuvre.date_publication || oeuvre.date_creation,
    image: oeuvre.image_url || oeuvre.couverture_url || '',
    url: `${SITE_URL}/articles/${oeuvre.id_oeuvre}`,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    inLanguage: oeuvre.langue || 'fr',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/articles/${oeuvre.id_oeuvre}`,
    },
  };
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; url: string }>): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

export function buildWebsiteJsonLd(): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/oeuvres?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
    inLanguage: ['fr', 'ar', 'en', 'ber'],
  };
}

export { SEOHead, SITE_URL, SITE_NAME };
export default SEOHead;
