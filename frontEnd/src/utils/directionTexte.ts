/**
 * Sens d'écriture d'un texte d'après ses lettres : arabe → de droite à gauche. Sert aux contenus
 * (articles…) dont la langue peut différer de celle du site : un article arabe lu avec le site en
 * français s'affichait aligné à gauche, avec la ponctuation et les dates mal placées.
 */
export function directionTexte(textes: Array<string | null | undefined>): 'rtl' | 'ltr' {
  let arabe = 0;
  let latin = 0;
  for (const t of textes) {
    for (const ch of String(t || '').slice(0, 2000)) {
      const c = ch.charCodeAt(0);
      if ((c >= 0x0600 && c <= 0x06ff) || (c >= 0x0750 && c <= 0x077f) || (c >= 0xfb50 && c <= 0xfeff)) arabe++;
      else if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a) || (c >= 0xc0 && c <= 0x24f)) latin++;
    }
  }
  return arabe > latin ? 'rtl' : 'ltr';
}

/** Paragraphe sans retours à la ligne en trop au début et à la fin (ils créaient de grands blancs) */
export function paragrapheNettoye(texte: unknown): string {
  return String(texte ?? '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .replace(/\n{3,}/g, '\n\n');
}
