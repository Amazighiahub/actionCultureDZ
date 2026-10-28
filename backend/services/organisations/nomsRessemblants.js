/**
 * Noms d'organisations « ressemblants » : « Santa Cruz », « Edition Santa Cruz » et
 * « Éditions Santa-Cruz » désignent la même maison. On compare les noms sans accents,
 * sans ponctuation et sans les mots génériques (éditions, association, culturelle…).
 */
const MOTS_GENERIQUES = new Set([
  'edition', 'editions', 'editeur', 'editeurs', 'association', 'associations', 'culturelle', 'culturele',
  'culturel', 'culture', 'maison', 'dar', 'el', 'al', 'les', 'le', 'la', 'de', 'du', 'des', 'd', 'l', 'et',
  'n', 'ath', 'ait', 'publishing', 'house', 'the', 'of', 'books', 'livres', 'librairie',
  'دار', 'النشر', 'نشر', 'للنشر', 'جمعية', 'الثقافية', 'ثقافية', 'منشورات'
]);

/** Mots significatifs d'un nom (sans accents, ponctuation ni mots génériques) */
const motsDuNom = (texte) => String(texte || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .split(' ')
  .filter(m => m && !MOTS_GENERIQUES.has(m));

/** Distance d'édition (petites chaînes : noms d'organisations) */
function distance(a, b) {
  const ligne = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let precedent = ligne[0];
    ligne[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = ligne[j];
      ligne[j] = Math.min(ligne[j] + 1, ligne[j - 1] + 1, precedent + (a[i - 1] === b[j - 1] ? 0 : 1));
      precedent = temp;
    }
  }
  return ligne[b.length];
}

/** Toutes les versions (langues) d'un nom multilingue, réduites à leurs mots significatifs */
const clesDuNom = (nom) => {
  const valeurs = nom && typeof nom === 'object' ? Object.values(nom) : [nom];
  return valeurs.map(v => motsDuNom(v).join(' ')).filter(Boolean);
};

/**
 * Deux noms désignent-ils probablement la même organisation ?
 * Mêmes mots significatifs, ou l'un contient l'autre (au moins 4 lettres), ou presque la même
 * orthographe (une faute pour 6 lettres), ou au moins deux tiers de mots en commun.
 */
function ressemble(nomA, nomB) {
  for (const a of clesDuNom(nomA)) {
    for (const b of clesDuNom(nomB)) {
      if (a === b) return true;
      const court = a.length <= b.length ? a : b;
      const long = a.length <= b.length ? b : a;
      if (court.length >= 4 && (` ${long} `).includes(` ${court} `)) return true;
      if (court.length >= 6 && distance(a, b) <= Math.floor(long.length / 6)) return true;
      // Mots en commun : « Adrar n Fad (ACAF) » et « Adrar N Fad Ait Smail »
      const motsA = new Set(a.split(' '));
      const motsB = b.split(' ');
      const communs = motsB.filter(m => m.length >= 3 && motsA.has(m)).length;
      if (communs >= 2 && communs / Math.min(motsA.size, motsB.length) >= 2 / 3) return true;
    }
  }
  return false;
}

module.exports = { ressemble, motsDuNom };
