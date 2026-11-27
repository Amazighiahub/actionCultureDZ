/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { evenementPath, oeuvrePath, lieuPath, artisanatPath, servicePath } from '@/utils/slug';
import { getLocalizedText } from '@/utils/getLocalizedText';

const SITE_NAME = 'Tala DZ';
// Domaine de production fixe : un canonical ou une URL JSON-LD ne doit jamais pointer
// vers localhost ou une préversion
const SITE_URL = 'https://taladz.com';
const DEFAULT_TITLE = 'Tala DZ - La source de la culture algérienne';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;
const DEFAULT_DESCRIPTION = 'Découvrez le riche patrimoine culturel algérien : événements, sites historiques, œuvres littéraires et artistiques, artisanat traditionnel.';

/** Texte d'un champ multilingue dans la langue courante (lecture commune getLocalizedText, audit V11 COD-1) */
const text = (value: unknown): string => getLocalizedText(value, i18n.language);

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
  // Titre et description par défaut dans la langue de la page (avant : toujours en français)
  const { t } = useTranslation();
  const fullTitle = title ? `${title} | ${t('seo.siteName', SITE_NAME)}` : t('seo.defaultTitle', DEFAULT_TITLE);
  const fullUrl = url || canonicalUrl(location.pathname);
  const desc = description || t('seo.defaultDescription', DEFAULT_DESCRIPTION);
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
      document.title = i18n.t('seo.defaultTitle', DEFAULT_TITLE);
      setMeta('description', i18n.t('seo.defaultDescription', DEFAULT_DESCRIPTION), true);
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

/**
 * Auteur crédité d'une œuvre, même règle que la fiche et le serveur (services/oeuvre/auteursOeuvres) :
 * contributeur au rôle principal (membre puis intervenant), sinon le premier. 2026-11-27 : Google
 * voyait les livres sans auteur (Users vide), datés de leur saisie et toujours « en français ».
 */
function auteurCredite(oeuvre: any): { prenom?: unknown; nom?: unknown } | undefined {
  const membres = (oeuvre.Users || []) as any[];
  const intervenants = ((oeuvre.OeuvreIntervenants || []) as any[]).filter((i) => i?.Intervenant);
  const choix = membres.find((u) => u?.OeuvreUser?.role_principal) || intervenants.find((i) => i.role_principal)
    || membres[0] || intervenants[0];
  return choix?.Intervenant || choix;
}

export function buildOeuvreJsonLd(oeuvre: any): Record<string, any> {
  const auteur = auteurCredite(oeuvre);
  const nomAuteur = auteur ? `${text(auteur.prenom)} ${text(auteur.nom)}`.trim() : '';
  return {
    '@context': 'https://schema.org',
    '@type': oeuvre.Livre ? 'Book' : 'CreativeWork',
    name: text(oeuvre.titre),
    description: text(oeuvre.description).substring(0, 300),
    author: nomAuteur ? { '@type': 'Person', name: nomAuteur } : undefined,
    // Année de l'œuvre (et non la date de sa saisie sur Tala DZ)
    datePublished: oeuvre.annee_creation ? String(oeuvre.annee_creation) : undefined,
    genre: text(oeuvre.Genre?.nom) || text(oeuvre.TypeOeuvre?.nom_type),
    inLanguage: oeuvre.Langue?.code || undefined,
    image: absoluteImage(oeuvre.image_url || oeuvre.couverture_url),
    url: `${SITE_URL}${oeuvrePath(oeuvre.id_oeuvre, oeuvre.titre, oeuvre.id_type_oeuvre)}`,
    ...(oeuvre.Livre ? {
      isbn: oeuvre.Livre.isbn || undefined,
      numberOfPages: oeuvre.Livre.nb_pages || undefined,
    } : {}),
  };
}

const EVENT_STATUS: Record<string, string> = {
  annule: 'https://schema.org/EventCancelled',
  reporte: 'https://schema.org/EventPostponed',
};

export function buildEvenementJsonLd(event: any): Record<string, any> {
  const online = !event.Lieu && !!event.en_ligne;
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
      // Pas le lien de la réunion, réservé aux inscrits : la page de l'événement
      ? { '@type': 'VirtualLocation', url: `${SITE_URL}${evenementPath(event.id_evenement, event.nom_evenement)}` }
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
    url: `${SITE_URL}${evenementPath(event.id_evenement, event.nom_evenement)}`,
  };
}

/**
 * Lieu de patrimoine. `description` : phrase automatique quand la fiche n'a pas de texte. Commune et wilaya en
 * lettres latines (avant : le nom arabe de la base, quelle que soit la langue) ; site parent et points de visite
 * reliés (2026-11-19).
 */
export function buildPatrimoineJsonLd(site: any, { description }: { description?: string } = {}): Record<string, any> {
  const image = site.medias?.find((m: any) => m.type === 'image')?.url;
  const parent = site.Ancetres?.length ? site.Ancetres[site.Ancetres.length - 1] : null;
  const commune = site.commune?.commune_name_ascii || site.Commune?.commune_name_ascii || text(site.Commune?.nom);
  const wilaya = site.wilaya?.wilaya_name_ascii || site.Commune?.Daira?.Wilaya?.wilaya_name_ascii || text(site.Commune?.Daira?.Wilaya?.nom);
  return {
    '@context': 'https://schema.org',
    '@type': ['TouristAttraction', 'LandmarksOrHistoricalBuildings'],
    name: text(site.nom),
    description: ((text(site.DetailLieu?.description) || text(site.description)).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      || description || '').substring(0, 300),
    address: {
      '@type': 'PostalAddress',
      addressLocality: commune,
      addressRegion: wilaya,
      addressCountry: 'DZ',
    },
    containedInPlace: parent ? { '@type': 'TouristAttraction', name: text(parent.nom), url: `${SITE_URL}${lieuPath(parent.id_lieu, parent.nom)}` } : undefined,
    containsPlace: (site.SousLieux || []).slice(0, 50).map((p: any) => ({ '@type': 'TouristAttraction', name: text(p.nom), url: `${SITE_URL}${lieuPath(p.id_lieu, p.nom)}` })),
    geo: site.latitude && site.longitude ? {
      '@type': 'GeoCoordinates',
      latitude: site.latitude,
      longitude: site.longitude,
    } : undefined,
    image: absoluteImage(image),
    // Même adresse que le canonical (avec le nom)
    url: `${SITE_URL}${lieuPath(site.id_lieu, site.nom)}`,
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
    url: `${SITE_URL}${artisanatPath(artisanat.id_artisanat, artisanat.nom || artisanat.titre || artisanat.Oeuvre?.titre)}`,
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
    url: `${SITE_URL}${oeuvrePath(oeuvre.id_oeuvre, oeuvre.titre, 4)}`,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    inLanguage: oeuvre.langue || 'fr',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}${oeuvrePath(oeuvre.id_oeuvre, oeuvre.titre, 4)}`,
    },
  };
}

/** Type schema.org d'un service aux visiteurs */
const TYPES_SERVICE_SCHEMA: Record<string, string> = {
  restaurant: 'Restaurant', hotel: 'LodgingBusiness', artisanat: 'Store', guide: 'LocalBusiness',
  transport: 'LocalBusiness', location: 'LocalBusiness', autre: 'LocalBusiness',
};

/**
 * Fiche d'un service (restaurant, hébergement…) pour les moteurs de recherche : nom, adresse, téléphone,
 * prix, position et note des avis (étoiles dans les résultats), comme TripAdvisor (2026-11-16).
 * La note n'est donnée que s'il y a des avis : les avis sont ceux des visiteurs du site, pas du service.
 */
export function buildServiceJsonLd(service: {
  id: number; nom: string; description?: string; type_service?: string; photo_url?: string | null;
  galerie?: { url?: string }[]; adresse?: string; ville?: string; telephone?: string | null; site_web?: string | null;
  latitude?: number | string | null; longitude?: number | string | null; tarif_min?: number | string | null;
  tarif_max?: number | string | null; note?: { moyenne: number; nombre: number } | null;
}): Record<string, any> {
  const images = [service.photo_url, ...(service.galerie || []).map((g) => g.url)].filter((u): u is string => !!u).map(absoluteImage);
  const lat = Number(service.latitude);
  const lon = Number(service.longitude);
  const prix = [service.tarif_min, service.tarif_max].filter((v) => v !== null && v !== undefined && v !== '').map(Number);
  return {
    '@context': 'https://schema.org',
    '@type': TYPES_SERVICE_SCHEMA[service.type_service || 'autre'] || 'LocalBusiness',
    name: service.nom,
    description: service.description ? service.description.substring(0, 300) : undefined,
    image: images.length ? images.slice(0, 5) : undefined,
    url: `${SITE_URL}${servicePath(service.id, service.nom)}`,
    telephone: service.telephone || undefined,
    sameAs: service.site_web || undefined,
    address: service.adresse || service.ville ? {
      '@type': 'PostalAddress',
      streetAddress: service.adresse || undefined,
      addressLocality: service.ville || undefined,
      addressCountry: 'DZ',
    } : undefined,
    geo: Number.isFinite(lat) && Number.isFinite(lon) && (lat || lon) ? { '@type': 'GeoCoordinates', latitude: lat, longitude: lon } : undefined,
    priceRange: prix.length ? `${Math.min(...prix)}–${Math.max(...prix)} DZD` : undefined,
    currenciesAccepted: prix.length ? 'DZD' : undefined,
    aggregateRating: service.note && service.note.nombre > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: service.note.moyenne,
      reviewCount: service.note.nombre,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
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
