/**
 * Aide à l'écriture d'un article :
 * - « Comment réussir son article ? » : les étapes dans l'ordre (repliable ; le choix est retenu) ;
 * - modèles prêts à l'emploi (poème, portrait, compte rendu d'événement, lieu du patrimoine) : un clic place
 *   les bons blocs, chacun avec une consigne grisée (metadata.indication), jamais publiée. Les blocs laissés
 *   vides sont ignorés à l'enregistrement (estBlocVide).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, ChevronDown, ChevronUp, Feather, Landmark, CalendarDays, UserRound } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ArticleBlock } from '@/types/models/articles.types';

type Traduire = (cle: string, defaut: string) => string;
type Modele = 'poeme' | 'portrait' | 'evenement' | 'lieu';

/** Bloc vide : rien à publier (texte vide, liste vide, image sans photo) */
export function estBlocVide(b: ArticleBlock): boolean {
  if (['text', 'heading', 'citation', 'code'].includes(b.type_block)) return !String(b.contenu ?? '').trim();
  if (b.type_block === 'list') return !Array.isArray(b.contenu_json) || !b.contenu_json.some((e: unknown) => String(e ?? '').trim());
  if (b.type_block === 'image') {
    return !b.id_media && !b.media?.id_media && !b.media?.url && !((b.metadata as Record<string, unknown> | undefined)?.tempFile);
  }
  return false;
}

/** Blocs d'un modèle (consignes dans la langue du site) */
export function blocsDuModele(modele: Modele, t: Traduire): ArticleBlock[] {
  const texte = (indication: string, metadata: Record<string, unknown> = {}): ArticleBlock =>
    ({ type_block: 'text', contenu: '', metadata: { ...metadata, indication } } as ArticleBlock);
  const titre = (indication: string): ArticleBlock =>
    ({ type_block: 'heading', contenu: '', metadata: { level: 2, indication } } as ArticleBlock);
  const image = (indication: string, layout: string): ArticleBlock =>
    ({ type_block: 'image', contenu: '', metadata: { layout, indication } } as ArticleBlock);
  const blocs: Record<Modele, ArticleBlock[]> = {
    poeme: [
      image(t('modeles.poeme.image', 'Facultatif : une photo ou une œuvre qui accompagne le poème'), 'float-left'),
      texte(t('modeles.poeme.texte', 'Collez le poème ici : un vers par ligne, une ligne vide entre deux strophes.'), { forme: 'poeme' }),
      texte(t('modeles.poeme.note', 'Facultatif : quelques mots sur le poème ou sur son auteur.'), { forme: 'encadre' }),
    ],
    portrait: [
      image(t('modeles.portrait.image', 'Une photo de l’artiste ou de son œuvre'), 'full-width'),
      texte(t('modeles.portrait.intro', 'Présentez la personne en quelques lignes : qui elle est, d’où elle vient, ce qu’elle crée.')),
      titre(t('modeles.portrait.titre1', 'Titre de section, par exemple : Son parcours')),
      texte(t('modeles.portrait.parcours', 'Racontez son parcours : formation, rencontres, étapes importantes.')),
      titre(t('modeles.portrait.titre2', 'Titre de section, par exemple : Ses œuvres')),
      texte(t('modeles.portrait.oeuvres', 'Décrivez ses œuvres principales, sa technique, ce qui la rend unique.')),
      { type_block: 'citation', contenu: '', metadata: { indication: t('modeles.portrait.citation', 'Une phrase de l’artiste, entre guillemets') } } as ArticleBlock,
    ],
    evenement: [
      image(t('modeles.evenement.image', 'Une photo de l’événement'), 'full-width'),
      texte(t('modeles.evenement.intro', 'Quand, où, et qui organisait ? Présentez l’événement en quelques lignes.')),
      titre(t('modeles.evenement.titre1', 'Titre de section, par exemple : Le programme')),
      texte(t('modeles.evenement.programme', 'Racontez les moments forts : spectacles, ateliers, rencontres.')),
      titre(t('modeles.evenement.titre2', 'Titre de section, par exemple : Ce qu’il faut retenir')),
      texte(t('modeles.evenement.bilan', 'Votre bilan : l’ambiance, le public, ce qui a marqué.')),
      texte(t('modeles.evenement.infos', 'Infos pratiques : prochaine édition, contact, lien d’inscription.'), { forme: 'encadre' }),
    ],
    lieu: [
      image(t('modeles.lieu.image', 'Une photo du lieu'), 'full-width'),
      texte(t('modeles.lieu.intro', 'Où se trouve ce lieu et pourquoi est-il important ?')),
      titre(t('modeles.lieu.titre1', 'Titre de section, par exemple : Son histoire')),
      texte(t('modeles.lieu.histoire', 'Racontez son histoire : origine, grandes époques, légendes.')),
      titre(t('modeles.lieu.titre2', 'Titre de section, par exemple : Traditions et vie locale')),
      texte(t('modeles.lieu.traditions', 'Fêtes, savoir-faire, cuisine, chants liés à ce lieu.')),
      texte(t('modeles.lieu.dicton', 'Facultatif : un proverbe ou un dicton de la région.'), { forme: 'proverbe' }),
      texte(t('modeles.lieu.acces', 'Comment s’y rendre, quand le visiter, ce qu’il faut savoir.'), { forme: 'encadre' }),
    ],
  };
  return blocs[modele].map((b, ordre) => ({ ...b, ordre, visible: true }));
}

const CLE_AIDE = 'taladz-aide-article-repliee';
const aideRepliee = () => { try { return localStorage.getItem(CLE_AIDE) === '1'; } catch { return false; } };

/** Les étapes pour réussir son article (repliable) */
export function AideRedaction() {
  const { t } = useTranslation();
  const [ouvert, setOuvert] = useState(() => !aideRepliee());
  const basculer = () => {
    setOuvert((o) => {
      try { localStorage.setItem(CLE_AIDE, o ? '1' : '0'); } catch { /* stockage indisponible */ }
      return !o;
    });
  };
  const etapes = [
    t('aideArticle.etape1', 'Choisissez un modèle ci-dessous, ou ajoutez vos blocs un par un (paragraphe, image, titre, citation…).'),
    t('aideArticle.etape2', 'Écrivez le titre et une courte description : ils sont obligatoires.'),
    t('aideArticle.etape3', 'Écrivez votre texte dans les blocs. Pour un poème, choisissez « Style du texte : Poème » ; pour un proverbe ou une note, « Proverbe » ou « Encadré ».'),
    t('aideArticle.etape4', 'Ajoutez vos photos et choisissez leur place : pleine largeur, centrée, à gauche ou à droite.'),
    t('aideArticle.etape5', 'Onglet « Métadonnées » : choisissez au moins une catégorie (obligatoire), puis ajoutez des mots-clés.'),
    t('aideArticle.etape6', 'Onglet « Aperçu » : vérifiez le rendu, puis cliquez sur « Enregistrer ». Un message vert confirme l’enregistrement ; un message rouge explique ce qui manque.'),
  ];
  return (
    <Card className="mb-6 border-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <button type="button" onClick={basculer} aria-expanded={ouvert} className="flex w-full items-center justify-between gap-3 text-start font-semibold">
          <span className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />{t('aideArticle.titre', 'Comment réussir son article ?')}</span>
          {ouvert ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
        </button>
        {ouvert && (
          <ol className="mt-3 list-decimal space-y-1.5 ps-6 text-sm">
            {etapes.map((e, i) => <li key={i}>{e}</li>)}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

/** Choix d'un modèle (article vide) */
export function ChoixModele({ onChoisir }: { onChoisir: (blocs: ArticleBlock[]) => void }) {
  const { t } = useTranslation();
  const tr: Traduire = (cle, defaut) => t(cle, defaut);
  const modeles: { cle: Modele; icone: typeof Feather; titre: string; aide: string }[] = [
    { cle: 'poeme', icone: Feather, titre: t('modeles.poeme.nom', 'Poème'), aide: t('modeles.poeme.aide', 'Image à gauche, vers centrés') },
    { cle: 'portrait', icone: UserRound, titre: t('modeles.portrait.nom', 'Portrait d’artiste'), aide: t('modeles.portrait.aide', 'Parcours, œuvres, citation') },
    { cle: 'evenement', icone: CalendarDays, titre: t('modeles.evenement.nom', 'Compte rendu d’événement'), aide: t('modeles.evenement.aide', 'Programme, bilan, infos pratiques') },
    { cle: 'lieu', icone: Landmark, titre: t('modeles.lieu.nom', 'Lieu du patrimoine'), aide: t('modeles.lieu.aide', 'Histoire, traditions, accès') },
  ];
  return (
    <div className="mb-6">
      <p className="mb-3 text-sm font-medium">{t('modeles.choisir', 'Commencer avec un modèle :')}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {modeles.map(({ cle, icone: Icone, titre, aide }) => (
          <Button key={cle} type="button" variant="outline" className="h-auto flex-col items-start gap-1 whitespace-normal p-4 text-start"
            onClick={() => onChoisir(blocsDuModele(cle, tr))}>
            <span className="flex items-center gap-2 font-semibold"><Icone className="h-4 w-4 text-primary" aria-hidden="true" />{titre}</span>
            <span className="text-xs font-normal text-muted-foreground">{aide}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
