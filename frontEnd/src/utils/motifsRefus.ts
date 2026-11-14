/**
 * Motifs de refus prêts (audit V11 OUT-15) : la modération clique, le texte s'ajoute au motif (sans
 * remplacer ce qui est déjà écrit), puis elle complète. Formulés pour aider l'auteur à corriger.
 */
export const MOTIFS_REFUS: { cle: string; defaut: string }[] = [
  { cle: 'admin.refus.motifs.infosManquantes', defaut: 'Il manque des informations essentielles (date, heure, lieu ou adresse exacte).' },
  { cle: 'admin.refus.motifs.descriptionCourte', defaut: 'La description est trop courte : expliquez ce que les visiteurs vont découvrir.' },
  { cle: 'admin.refus.motifs.photo', defaut: 'La photo est floue, trop petite ou ne montre pas le contenu.' },
  { cle: 'admin.refus.motifs.droits', defaut: 'La photo ou le texte semble repris d’un autre site : indiquez la source ou votre autorisation.' },
  { cle: 'admin.refus.motifs.doublon', defaut: 'Ce contenu existe déjà sur Tala DZ.' },
  { cle: 'admin.refus.motifs.horsSujet', defaut: 'Ce contenu ne concerne pas la culture ou le patrimoine algériens.' },
  { cle: 'admin.refus.motifs.relecture', defaut: 'Le titre ou la description contient des fautes importantes : relisez-les.' },
  { cle: 'admin.refus.motifs.contact', defaut: 'Les coordonnées de contact sont incomplètes ou incorrectes.' },
  { cle: 'admin.refus.motifs.personne', defaut: 'Une personne reconnaissable apparaît sans son accord : choisissez une photo sans visage.' },
];

/** Ajoute un motif au texte déjà saisi (à la ligne s'il y en a déjà un) ; pas de doublon */
export function ajouterMotif(texte: string, motif: string): string {
  const actuel = texte.trimEnd();
  if (actuel.includes(motif)) return texte;
  return actuel ? `${actuel}\n${motif}` : motif;
}
