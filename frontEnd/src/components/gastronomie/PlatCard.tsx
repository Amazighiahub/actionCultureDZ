/**
 * PlatCard — carte d'un plat traditionnel (photo, nom, lieu et wilaya, résumé) menant à
 * l'article complet. Partagée par la page Gastronomie et la page d'accueil.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Utensils } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { LazyImage } from '@/components/shared';
import { texteLangue } from '@/utils/programmeIntervenants';

type Texte = string | Record<string, string | undefined> | null;
export interface Wilaya { id_wilaya: number; nom?: string; wilaya_name_ascii?: string; codeW?: number }
export interface Plat {
  id_oeuvre: number;
  titre: Texte;
  resume: Texte;
  image: string | null;
  lieux: Array<{ id_lieu: number; nom: Texte; commune?: { nom?: string; commune_name_ascii?: string } | null; wilaya?: Wilaya | null }>;
}

/** Nom de la wilaya dans la langue affichée (arabe : nom arabe) */
export const nomWilaya = (w: Wilaya | null | undefined, lang: string): string =>
  (w ? (lang.startsWith('ar') && w.nom) || w.wilaya_name_ascii || w.nom || '' : '');

const STRETCHED_LINK_CLASS =
  'after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring';

const PlatCard: React.FC<{ plat: Plat }> = ({ plat }) => {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const titre = texteLangue(plat.titre, lang);
  const resume = texteLangue(plat.resume, lang);
  const lieu = plat.lieux[0];
  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-all group">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {plat.image ? (
          <LazyImage src={plat.image} maxWidth={640} alt={titre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" aria-hidden="true"><Utensils className="h-10 w-10 text-muted-foreground" /></div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-serif text-lg font-semibold leading-snug line-clamp-2 mb-1 group-hover:text-primary transition-colors">
          <Link to={`/articles/${plat.id_oeuvre}`} className={STRETCHED_LINK_CLASS}>{titre}</Link>
        </h3>
        {lieu && (
          <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {[texteLangue(lieu.nom, lang), nomWilaya(lieu.wilaya, lang)].filter(Boolean).join(' · ')}
              {plat.lieux.length > 1 && ` +${plat.lieux.length - 1}`}
            </span>
          </p>
        )}
        {resume && <p className="text-sm text-muted-foreground line-clamp-3">{resume}</p>}
      </CardContent>
    </Card>
  );
};

export default PlatCard;
