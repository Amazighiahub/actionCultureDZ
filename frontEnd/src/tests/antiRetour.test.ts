/**
 * Tests anti-retour (2026-11-16, « finir une fois pour toutes ») : des motifs qui ont déjà produit des
 * défauts ne doivent pas réapparaître dans le code du site.
 * - `String(x.titre)` sur un texte multilingue { fr, ar } donnait « [object Object] » (partage d'une œuvre,
 *   d'un article) : utiliser getLocalizedText(x.titre, langue).
 * - `prenom?.[0]` sur un nom multilingue ne donnait aucune initiale : utiliser initiales(prenom, nom, langue).
 * - Bouton caché jusqu'au survol (« Retirer la photo », cœur favori) : invisible sur téléphone ;
 *   utiliser BoutonRetirerApercu ou ajouter [@media(hover:none)]:opacity-100.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { initiales, texteRecherchable } from '@/utils/getLocalizedText';

const RACINE = path.resolve(__dirname, '..');
// Fichiers où le motif est voulu (la valeur y est déjà une chaîne, vérifiée juste avant)
const PERMIS = new Set(['components/article/useArticleEditor.ts']);

function fichiers(dossier: string): string[] {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dossier, e.name);
    if (e.isDirectory()) return /__tests__|^tests?$/.test(e.name) ? [] : fichiers(p);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
  });
}

const MOTIFS: { nom: string; re: RegExp; sauf?: RegExp }[] = [
  { nom: 'String(x.titre|nom|nom_evenement|description) → getLocalizedText', re: /String\(\s*[\w?.]+\.(titre|nom|nom_evenement|description)\s*(\|\|[^)]*)?\)/ },
  { nom: 'prenom?.[0] / nom?.[0] → initiales()', re: /\b(prenom|nom)\?\.\[0\]/ },
  // Élément caché jusqu'au survol de la souris : invisible sur un téléphone (il n'y a pas de survol).
  // Permis seulement s'il est aussi visible sans survol ([@media(hover:none)]) ou purement décoratif.
  {
    nom: 'caché au survol sans [@media(hover:none)] → invisible sur téléphone',
    re: /opacity-0 group-hover:opacity-100/,
    // Décoratif (dégradé, petite icône dans un lien, loupe sur une vignette entièrement cliquable)
    sauf: /hover:none|bg-gradient|isVideo|<ExternalLink|<ArrowRight/,
  },
];

describe('motifs interdits (anti-retour)', () => {
  for (const { nom, re, sauf } of MOTIFS) {
    it(nom, () => {
      const trouves = fichiers(RACINE)
        .filter((f) => !PERMIS.has(path.relative(RACINE, f).split(path.sep).join('/')))
        .flatMap((f) => fs.readFileSync(f, 'utf8').split('\n')
          .map((ligne, i) => (re.test(ligne) && !(sauf && sauf.test(ligne)) && !/^\s*(\*|\/\/)/.test(ligne) && !/typeof [\w?.]+ === 'object'/.test(ligne)
            ? `${path.relative(RACINE, f)}:${i + 1}` : null))
          .filter(Boolean));
      expect(trouves).toEqual([]);
    });
  }
});

describe('aides pour les textes multilingues', () => {
  it('initiales : texte simple ou multilingue, lettre arabe entière', () => {
    expect(initiales('amel', 'Benali')).toBe('AB');
    expect(initiales({ fr: 'Amel', ar: 'أمل' }, { fr: 'Benali' }, 'fr')).toBe('AB');
    expect(initiales({ fr: 'Amel', ar: 'أمل' }, { ar: 'بن علي' }, 'ar')).toBe('أب');
    expect(initiales(null, undefined)).toBe('');
  });

  it('texte recherchable : toutes les langues, en minuscules', () => {
    const t = texteRecherchable({ fr: 'Amel', ar: 'أمل' }, 'BENALI', 'amel@example.com');
    expect(t).toContain('amel');
    expect(t).toContain('أمل');
    expect(t).toContain('benali');
    expect(t).not.toContain('[object');
  });
});

/**
 * Lot 3, doublons (2026-11-19) : une liste ou une aide commune n'est définie qu'à un seul endroit.
 * Avant : la liste des types de service en 3 copies (annuaire, formulaire, administration).
 */
describe('une seule définition (anti-retour des copies)', () => {
  const UNIQUES: { nom: string; re: RegExp; fichier: string }[] = [
    { nom: 'TYPES_SERVICE', re: /\bconst TYPES_SERVICE\s*=/, fichier: 'components/services/typesService.ts' },
    // Visionneuse de médias plein écran : 4 copies avant (galerie d'événement, d'œuvre, de service, photos des visiteurs)
    { nom: 'visionneuse de médias', re: /\bconst (Lightbox|VisionneuseMedias)\b|function useNavigationPhotos\b/, fichier: 'components/shared/VisionneuseMedias.tsx' },
    { nom: 'useConfirmation', re: /\bfunction useConfirmation\b/, fichier: 'hooks/useConfirmation.tsx' },
    // État d'un favori sur une page de détail : useFavoriCheck (avant : refait à la main sur l'article et l'artisanat,
    // et l'invitation à se connecter recopiée 5 fois)
    { nom: 'vérification d’un favori', re: /favoriService\.check\(/, fichier: 'hooks/useFavoris.ts' },
    { nom: 'invitation à se connecter pour un favori', re: /auth\.loginToFavorite/, fichier: 'hooks/useFavoris.ts' },
  ];
  for (const u of UNIQUES) {
    it(`${u.nom} : seulement dans ${u.fichier}`, () => {
      const trouves = fichiers(RACINE).filter((f) => u.re.test(fs.readFileSync(f, 'utf8')))
        .map((f) => path.relative(RACINE, f).split(path.sep).join('/'));
      expect(trouves).toEqual([u.fichier]);
    });
  }

  // window.confirm : fenêtre du navigateur (anglais sur certains téléphones, sans arabe, bloquée dans certaines
  // applications). Utiliser useConfirmation ; seule la sortie d'une page modifiée garde la fenêtre du navigateur.
  it('pas de window.confirm hors useUnsavedChanges', () => {
    const trouves = fichiers(RACINE)
      .filter((f) => fs.readFileSync(f, 'utf8').split('\n').some((l) => /(window\.|[^.\w])confirm\(/.test(l) && !/^\s*(\/\/|\*)/.test(l)))
      .map((f) => path.relative(RACINE, f).split(path.sep).join('/'));
    expect(trouves).toEqual(['hooks/useUnsavedChanges.ts']);
  });
});
