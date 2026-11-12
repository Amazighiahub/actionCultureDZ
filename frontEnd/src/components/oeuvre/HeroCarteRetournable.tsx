/**
 * HeroCarteRetournable - Carte d'œuvre qui se retourne (recto / verso, effet 3D)
 * Partagée par HeroAlbum (pochette / vinyle) et HeroFilm (affiche / synopsis) ;
 * HeroLivre réutilise la coque (CarteRetournable), les boutons et la fenêtre d'agrandissement.
 * Avant : ~380 lignes recopiées dans chaque fichier, correctif clavier recopié 3 fois (audit V11 COD-15).
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Globe, Quote, RotateCcw, Sparkles, Star, X, ZoomIn, type LucideIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { optimizeImageUrl } from '@/helpers/assetUrl';
import { useRTL } from '@/hooks/useRTL';
import { cn } from '@/lib/Utils';
import type { Oeuvre } from '@/types/models/oeuvre.types';

type Icone = LucideIcon;

/* ───────────── Coque : retournement 3D et accès clavier (une seule fois pour les 3 cartes) ───────────── */

const FORMATS = {
  // Pochette d'album : carrée
  carre: { largeur: 'w-[260px] sm:w-[300px] md:w-[340px] lg:w-[360px]', perspective: '1200px', proportion: 'aspect-square' },
  // Affiche de film, couverture de livre : 2/3
  affiche: { largeur: 'w-[180px] sm:w-[200px] md:w-[240px] lg:w-[260px]', perspective: '900px', proportion: 'aspect-[2/3]' },
} as const;

const FACE_CACHEE: React.CSSProperties = { backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' };

interface CarteRetournableProps {
  format: keyof typeof FORMATS;
  retournee: boolean;
  onRetourner: () => void;
  recto: React.ReactNode;
  verso: React.ReactNode;
  /** Affiché sous la carte, dans le même bloc de largeur fixe */
  apres?: React.ReactNode;
}

export const CarteRetournable: React.FC<CarteRetournableProps> = ({ format, retournee, onRetourner, recto, verso, apres }) => {
  const { direction } = useRTL();
  const f = FORMATS[format];
  const rotation = `rotateY(${direction === 'rtl' ? '-180deg' : '180deg'})`;

  return (
    <div className={`relative mx-auto ${f.largeur}`} style={{ perspective: f.perspective }}>
      {/* La carte contient le bouton « Agrandir » : un <button> natif autour serait un bouton dans un bouton,
          d'où role="button" + clavier, écrits ici une seule fois */}
      <div
        className={cn(`relative w-full ${f.proportion} cursor-pointer transition-all duration-700 ease-in-out`)}
        style={{ transformStyle: 'preserve-3d', transform: retournee ? rotation : 'rotateY(0deg)' }}
        onClick={onRetourner}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRetourner(); } }}
      >
        <div className="absolute inset-0 w-full h-full" style={FACE_CACHEE}>
          <div className="relative w-full h-full group">{recto}</div>
        </div>
        <div className="absolute inset-0 w-full h-full" style={{ ...FACE_CACHEE, transform: rotation }}>
          <div className="relative w-full h-full group">{verso}</div>
        </div>
      </div>
      {apres}
    </div>
  );
};

/** Boutons qui apparaissent au survol du recto : agrandir (sans retourner la carte) et rappel « retourner » */
export const BoutonsSurvolCarte: React.FC<{ onAgrandir: () => void }> = ({ onAgrandir }) => {
  const { t } = useTranslation();
  return (
    <div className="absolute bottom-4 end-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onAgrandir(); }}
        className="bg-white/20 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white/40 transition-colors"
        title={t('works.zoom', 'Agrandir')}
        aria-label={t('works.zoom', 'Agrandir')}
      >
        <ZoomIn className="h-5 w-5 text-white" aria-hidden="true" />
      </button>
      <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 shadow-lg">
        <RotateCcw className="h-5 w-5 text-white" />
      </div>
    </div>
  );
};

interface FenetreZoomProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  image: string | null;
  titre: string;
  icone: Icone;
  texteSansImage: string;
  /** Légende sous l'image (livre : titre et auteur) */
  children?: React.ReactNode;
}

/** Image en grand sur fond noir */
export const FenetreZoom: React.FC<FenetreZoomProps> = ({ open, onOpenChange, image, titre, icone: IconeImage, texteSansImage, children }) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 bg-black/95 border-0" aria-describedby={undefined}>
        <DialogTitle className="sr-only">{titre}</DialogTitle>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-4 end-4 z-50 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
          aria-label={t('common.close', 'Fermer')}
        >
          <X className="h-6 w-6 text-white" aria-hidden="true" />
        </button>
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          {image ? (
            <img src={image} alt={titre} className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" />
          ) : (
            <div className="flex flex-col items-center justify-center text-white/60">
              <IconeImage className="h-24 w-24 mb-4" />
              <p>{texteSansImage}</p>
            </div>
          )}
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
};

/* ───────────── Carte complète d'Album et de Film ───────────── */

// Classes écrites en entier (Tailwind ne lit que des noms complets)
const THEMES = {
  album: {
    halo: 'from-emerald-500 to-teal-500',
    cadre: '',
    sansImage: 'from-emerald-800 to-teal-900',
    iconeSansImage: 'text-emerald-400/50',
    voile: 'from-black/60 via-transparent to-transparent',
    fondVerso: 'bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-950',
    fondVersoSombre: 'dark:from-emerald-950 dark:via-teal-950 dark:to-black',
    texte: 'text-emerald-50',
    icone: 'text-emerald-400',
    badge: 'border-emerald-400/50 text-emerald-200 bg-emerald-950/50',
    titre: 'text-emerald-100',
    guillemets: 'text-emerald-500/50',
    description: 'text-emerald-100/90',
    trait: 'bg-emerald-600/30',
    etoiles: 'text-emerald-500/50',
    ligne: 'text-emerald-200/80',
    indice: 'text-emerald-400/60',
  },
  film: {
    halo: null,
    cadre: 'border-2 border-purple-500/20',
    sansImage: 'from-purple-900 to-slate-900',
    iconeSansImage: 'text-purple-400/50',
    voile: 'from-black/70 via-transparent to-black/10',
    fondVerso: 'bg-gradient-to-br from-purple-900 via-slate-900 to-purple-950',
    fondVersoSombre: 'dark:from-purple-950 dark:via-slate-950 dark:to-black',
    texte: 'text-purple-50',
    icone: 'text-purple-400',
    badge: 'border-purple-400/50 text-purple-200 bg-purple-950/50',
    titre: 'text-purple-100',
    guillemets: 'text-purple-500/50',
    description: 'text-purple-100/90',
    trait: 'bg-purple-600/30',
    etoiles: 'text-purple-500/50',
    ligne: 'text-purple-200/80',
    indice: 'text-purple-400/60',
  },
} as const;

export interface LigneVerso {
  cle: string;
  libelle: React.ReactNode;
  valeur: React.ReactNode;
  /** Ex. 'font-medium' */
  classeValeur?: string;
}

interface HeroCarteRetournableProps {
  theme: keyof typeof THEMES;
  oeuvre: Oeuvre;
  mainImage: string | null;
  titre: string;
  mainContributors: Array<{ prenom?: unknown; nom?: unknown }>;
  gt: (field: unknown) => string;
  icone: Icone;
  /** Badge en haut, côté fin du recto (album : gratuit ; film : durée) */
  badgeRecto?: React.ReactNode;
  /** Décor du verso (vinyle, pellicule) */
  motifVerso: React.ReactNode;
  typeLibelle: React.ReactNode;
  descriptionVerso: string;
  /** Lignes propres au type, avant la langue et l'année */
  lignesVerso: LigneVerso[];
  textes: {
    /** Au dos : « Cliquez pour voir la pochette » */
    retourRecto: string;
    /** Sous la carte, carte retournée */
    voirRecto: string;
    /** Sous la carte, recto visible */
    voirVerso: string;
    /** Fenêtre d'agrandissement sans image */
    sansImage: string;
  };
}

const HeroCarteRetournable: React.FC<HeroCarteRetournableProps> = ({
  theme, oeuvre, mainImage, titre, mainContributors, gt, icone: IconeType,
  badgeRecto, motifVerso, typeLibelle, descriptionVerso, lignesVerso, textes,
}) => {
  const { rtlClasses } = useRTL();
  const [retournee, setRetournee] = useState(false);
  const [zoom, setZoom] = useState(false);
  const c = THEMES[theme];
  const note = (oeuvre as { note_moyenne?: number }).note_moyenne;

  const recto = (
    <>
      {c.halo && (
        <div className={`absolute inset-0 bg-gradient-to-br ${c.halo} rounded-lg blur-2xl opacity-15 group-hover:opacity-25 transition-opacity duration-300 -z-10`} />
      )}

      {/* Ombre portée 3D */}
      <div
        className="absolute inset-0 bg-black/20 rounded-lg transform translate-x-4 translate-y-4 -z-10 transition-transform duration-300 group-hover:translate-x-6 group-hover:translate-y-6"
        style={{ filter: 'blur(8px)' }}
      />

      <div className={cn('relative w-full h-full rounded-lg overflow-hidden shadow-2xl', c.cadre)}>
        {mainImage ? (
          <img
            src={optimizeImageUrl(mainImage, 900)}
            alt={titre}
            fetchPriority="high"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${c.sansImage} flex flex-col items-center justify-center p-8`}>
            {/* Titre : affiché par le bandeau du bas (avant : deux fois, superposé) */}
            <IconeType className={`h-24 w-24 ${c.iconeSansImage} mb-4`} aria-hidden="true" />
          </div>
        )}

        <div className={`absolute inset-0 bg-gradient-to-t ${c.voile}`} />

        {/* Note */}
        {note && note > 0 && (
          <div className={`absolute top-4 ${rtlClasses.start(4)}`}>
            <Badge className="bg-yellow-500 text-black shadow-lg">
              <Star className="h-3 w-3 me-1 fill-current" />
              {note.toFixed(1)}
            </Badge>
          </div>
        )}

        {badgeRecto && <div className={`absolute top-4 ${rtlClasses.end(4)}`}>{badgeRecto}</div>}

        {/* Infos en bas */}
        <div className="absolute bottom-0 start-0 end-0 p-6 text-white">
          <h2 className="text-2xl font-bold mb-1 line-clamp-2 drop-shadow-lg text-white">{titre}</h2>
          {mainContributors.length > 0 && (
            <p className="text-white/90 font-medium drop-shadow">
              {gt(mainContributors[0].prenom)} {gt(mainContributors[0].nom)}
            </p>
          )}
        </div>

        <BoutonsSurvolCarte onAgrandir={() => setZoom(true)} />

        {/* Effet brillance */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>
    </>
  );

  const verso = (
    <>
      <div className="absolute inset-0 bg-black/20 rounded-lg transform -translate-x-4 translate-y-4 -z-10" style={{ filter: 'blur(8px)' }} />

      <div className={cn('relative w-full h-full overflow-hidden shadow-2xl rounded-lg', c.fondVerso, c.fondVersoSombre)}>
        {motifVerso}

        <div className={`relative h-full flex flex-col p-6 ${c.texte}`}>
          <div className="flex items-center justify-between mb-4">
            <IconeType className={`h-8 w-8 ${c.icone}`} />
            <Badge variant="outline" className={c.badge}>{typeLibelle}</Badge>
          </div>

          <h3 className={`text-xl font-bold mb-3 ${c.titre}`}>{titre}</h3>

          <div className="flex-1 overflow-hidden">
            <Quote className={`h-5 w-5 ${c.guillemets} mb-2`} />
            <p className={`text-sm leading-relaxed ${c.description} line-clamp-[8]`}>{descriptionVerso}</p>
          </div>

          {/* Séparateur */}
          <div className="my-4 flex items-center gap-2">
            <div className={`flex-1 h-px ${c.trait}`} />
            <Sparkles className={`h-4 w-4 ${c.etoiles}`} />
            <div className={`flex-1 h-px ${c.trait}`} />
          </div>

          {/* Métadonnées */}
          <div className="space-y-2 text-sm">
            {lignesVerso.map(l => (
              <div key={l.cle} className={`flex items-center justify-between ${c.ligne}`}>
                <span>{l.libelle}</span>
                <span className={l.classeValeur}>{l.valeur}</span>
              </div>
            ))}
            {oeuvre.Langue && (
              <div className={`flex items-center gap-2 ${c.ligne}`}>
                <Globe className="h-4 w-4" />
                <span>{gt(oeuvre.Langue.nom)}</span>
              </div>
            )}
            {oeuvre.annee_creation && (
              <div className={`flex items-center gap-2 ${c.ligne}`}>
                <Calendar className="h-4 w-4" />
                <span>{oeuvre.annee_creation}</span>
              </div>
            )}
          </div>

          <div className="mt-4 text-center">
            <span className={`text-xs ${c.indice} flex items-center justify-center gap-1`}>
              <RotateCcw className="h-3 w-3" />
              {textes.retourRecto}
            </span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <CarteRetournable
        format={theme === 'album' ? 'carre' : 'affiche'}
        retournee={retournee}
        onRetourner={() => setRetournee(r => !r)}
        recto={recto}
        verso={verso}
        apres={
          <p className="text-center text-sm text-muted-foreground mt-6 flex items-center justify-center gap-2">
            <RotateCcw className="h-4 w-4" />
            {retournee ? textes.voirRecto : textes.voirVerso}
          </p>
        }
      />
      {/* Hors de la carte : un clic dans la fenêtre ne doit pas retourner la carte (les événements React traversent les portails) */}
      <FenetreZoom open={zoom} onOpenChange={setZoom} image={mainImage} titre={titre} icone={IconeType} texteSansImage={textes.sansImage} />
    </>
  );
};

export default HeroCarteRetournable;
