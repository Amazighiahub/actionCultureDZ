/**
 * Tri des services par note pondérée (même formule que le serveur, services/service/classementServices.js) :
 * un seul avis à 5 étoiles ne passe pas devant vingt avis à 4,8. Sans avis : à la fin.
 */
type Note = { moyenne: number; nombre: number } | null | undefined;
const M = 3;

export function trierParNote<T extends { note?: Note }>(liste: T[], critere: 'note' | 'avis'): T[] {
  const notees = liste.map((s) => s.note).filter((n): n is { moyenne: number; nombre: number } => !!n && n.nombre > 0);
  const total = notees.reduce((s, n) => s + n.nombre, 0);
  const generale = total ? notees.reduce((s, n) => s + n.moyenne * n.nombre, 0) / total : 0;
  const score = (n: Note) => (n && n.nombre > 0 ? (n.nombre * n.moyenne + M * generale) / (n.nombre + M) : -1);
  const avis = (n: Note) => (n ? n.nombre : 0);
  return [...liste].sort((a, b) => (critere === 'avis'
    ? avis(b.note) - avis(a.note) || score(b.note) - score(a.note)
    : score(b.note) - score(a.note) || avis(b.note) - avis(a.note)));
}
