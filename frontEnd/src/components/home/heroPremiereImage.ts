/**
 * Première photo du bandeau de l'accueil (plusieurs largeurs). Partagée par HeroSection et par
 * main.tsx, qui la demande dès le démarrage sur l'accueil (avant traductions et page).
 */
export const HERO_PREMIERE_IMAGE = {
  url: '/images/hero/timgad-1280.webp',
  srcSet: '/images/hero/timgad-768.webp 768w, /images/hero/timgad-1280.webp 1280w, /images/hero/timgad-1920.webp 1920w',
  fallback: '/images/hero/timgad.jpg',
};
