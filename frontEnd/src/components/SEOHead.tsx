/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import i18n from 'i18next';

const SITE_NAME = 'Tala DZ';
// Domaine de production fixe : un canonical ou une URL JSON-LD ne doit jamais pointer
// vers localhost ou une préversion
const SITE_URL = 'https://taladz.com';
const DEFAULT_TITLE = 'Tala DZ - La source de la culture algérienne';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;
const DEFAULT_DESCRIPTION = 'Découvrez le riche patrimoine culturel algérien : événements, sites historiques, œuvres littéraires et artistiques, artisanat traditionnel.';

/** Texte d'un champ multilingue ({ fr, ar, ... }) dans la langue courante, ou le texte tel quel */
function text(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const v = value as Record<string, string | undefined>;
    return v[i18n.language] || v.fr || v.ar || v.en || Object.values(v).find(Boolean) || '';
  }
  return '';
}

/** URL absolue d'image, exploitable par les réseaux sociaux (pas de SVG ni de chemin relatif) */
function absoluteImage(src?: string): string {
  if (!src || /\.svg(\?|$)/i.test(src)) return DEFAULT_IMAGE;
  if (/^https?:\/\//.test(src)) return src;
  return `${SITE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
}

/** Adresse canonique : domaine de production, sans paramètres ni slash final */
function canonicalUrl(pathname: string): string {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/';
  return `${SITE_URL}${path}`;
}

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

// Pas de balises hreflang : les langues partagent la même adresse (pas d'URL par langue),
// et des hreflang pointant tous vers la même page sont ignorés par Google.

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
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const fullUrl = url || canonicalUrl(location.pathname);
  const desc = description || DEFAULT_DESCRIPTION;
  const img = absoluteImage(image);

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
    // (les og:locale:alternate sont déclarées une fois pour toutes dans index.html)

    // Twitter Card
    setMeta('twitter:card', 'summary_large_image', true);
    setMeta('twitter:title', fullTitle, true);
    setMeta('twitter:description', desc, true);
    setMeta('twitter:image', img, true);

    // Canonical (pas sur une page noindex : les deux signaux se contredisent)
    if (noindex) document.querySelector('link[rel="canonical"]')?.remove();
    else setCanonical(fullUrl);

    // JSON-LD
    if (jsonLd) {
      setJsonLd(jsonLd);
    }

    return () => {
      document.getElementById('seo-json-ld')?.remove();
      // Retour aux valeurs par défaut : une page sans SEOHead ne garde pas
      // le titre, la description ou le canonical de la page précédente
      document.title = DEFAULT_TITLE;
      setMeta('description', DEFAULT_DESCRIPTION, true);
      setMeta('robots', 'index, follow', true);
      setMeta('og:title', DEFAULT_TITLE);
      setMeta('og:description', DEFAULT_DESCRIPTION);
      setMeta('og:image', DEFAULT_IMAGE);
      setMeta('og:url', `${SITE_URL}/`);
      setMeta('og:type', 'website');
      setMeta('twitter:title', DEFAULT_TITLE, true);
      setMeta('twitter:description', DEFAULT_DESCRIPTION, true);
      setMeta('twitter:image', DEFAULT_IMAGE, true);
      document.querySelector('link[rel="canonical"]')?.remove();
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
    '@type': oeuvre.Livre ? 'Book' : 'CreativeWork',
    name: text(oeuvre.titre),
    description: text(oeuvre.description).substring(0, 300),
    author: oeuvre.Users?.[0]
      ? { '@type': 'Person', name: `${text(oeuvre.Users[0].prenom)} ${text(oeuvre.Users[0].nom)}`.trim() }
      : undefined,
    datePublished: oeuvre.date_publication || oeuvre.date_creation,
    genre: text(oeuvre.Genre?.nom) || text(oeuvre.TypeOeuvre?.nom_type),
    inLanguage: oeuvre.langue || 'fr',
    image: absoluteImage(oeuvre.image_url || oeuvre.couverture_url),
    url: `${SITE_URL}/oeuvres/${oeuvre.id_oeuvre}`,
    ...(oeuvre.Livre ? {
      isbn: oeuvre.Livre.isbn || undefined,
      numberOfPages: oeuvre.Livre.nombre_pages || undefined,
    } : {}),
  };
}

const EVENT_STATUS: Record<string, string> = {
  annule: 'https://schema.org/EventCancelled',
  reporte: 'https://schema.org/EventPostponed',
};

export function buildEvenementJsonLd(event: any): Record<string, any> {
  const online = !event.Lieu && !!event.url_virtuel;
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: text(event.nom_evenement) || text(event.titre),
    description: text(event.description).substring(0, 300),
    startDate: event.date_debut,
    endDate: event.date_fin,
    eventStatus: EVENT_STATUS[event.statut] || 'https://schema.org/EventScheduled',
    eventAttendanceMode: online
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
    location: online
      ? { '@type': 'VirtualLocation', url: event.url_virtuel }
      : event.Lieu ? {
        '@type': 'Place',
        name: text(event.Lieu.nom),
        address: {
          '@type': 'PostalAddress',
          addressLocality: text(event.Lieu.Commune?.nom) || text(event.lieu),
          addressCountry: 'DZ',
        },
      } : undefined,
    organizer: event.Organisateur ? {
      '@type': 'Person',
      name: `${text(event.Organisateur.prenom)} ${text(event.Organisateur.nom)}`.trim(),
    } : undefined,
    image: absoluteImage(event.image_url || event.couverture_url),
    url: `${SITE_URL}/evenements/${event.id_evenement}`,
  };
}

export function buildPatrimoineJsonLd(site: any): Record<string, any> {
  const image = site.medias?.find((m: any) => m.type === 'image')?.url;
  return {
    '@context': 'https://schema.org',
    '@type': 'LandmarksOrHistoricalBuildings',
    name: text(site.nom),
    description: (text(site.DetailLieu?.description) || text(site.description)).substring(0, 300),
    address: {
      '@type': 'PostalAddress',
      addressLocality: text(site.Commune?.nom),
      addressRegion: text(site.Commune?.Daira?.Wilaya?.nom),
      addressCountry: 'DZ',
    },
    geo: site.latitude && site.longitude ? {
      '@type': 'GeoCoordinates',
      latitude: site.latitude,
      longitude: site.longitude,
    } : undefined,
    image: absoluteImage(image),
    url: `${SITE_URL}/patrimoine/${site.id_lieu}`,
  };
}

export function buildArtisanatJsonLd(artisanat: any): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: text(artisanat.nom) || text(artisanat.titre),
    description: text(artisanat.description).substring(0, 300),
    category: text(artisanat.type_artisanat) || text(artisanat.categorie),
    image: absoluteImage(artisanat.images?.[0] || artisanat.image_url),
    url: `${SITE_URL}/artisanat/${artisanat.id_artisanat}`,
    manufacturer: artisanat.artisan ? {
      '@type': 'Person',
      name: `${text(artisanat.artisan.prenom)} ${text(artisanat.artisan.nom)}`.trim(),
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
    headline: text(oeuvre.titre),
    description: text(oeuvre.description).substring(0, 300),
    author: oeuvre.Users?.[0]
      ? { '@type': 'Person', name: `${text(oeuvre.Users[0].prenom)} ${text(oeuvre.Users[0].nom)}`.trim() }
      : undefined,
    datePublished: oeuvre.date_publication || oeuvre.date_creation,
    dateModified: oeuvre.date_modification || oeuvre.date_publication || oeuvre.date_creation,
    image: absoluteImage(oeuvre.image_url || oeuvre.couverture_url),
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
      name: text(item.name),
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
