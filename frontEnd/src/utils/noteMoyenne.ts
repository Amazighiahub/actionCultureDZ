/**
 * Note moyenne d'une liste d'avis : une seule note par personne (la première donnée). Avant, une
 * personne qui avait noté plusieurs fois pesait plusieurs fois dans la moyenne.
 */
type Avis = {
  id_user?: number | null;
  User?: { id_user?: number | null } | null;
  date_creation?: string | Date | null;
  note?: number | null;
  note_qualite?: number | null;
};

export const noteAvis = (a: Avis): number => Number(a.note_qualite ?? a.note) || 0;

export function noteMoyenne(avis: Avis[]): { moyenne: number; nombre: number; repartition: Record<number, number> } {
  const parPersonne = new Map<string, { note: number; date: number }>();
  avis.forEach((a, i) => {
    const note = noteAvis(a);
    if (note <= 0) return;
    const qui = a.User?.id_user ?? a.id_user;
    const cle = qui != null ? `u${qui}` : `a${i}`;
    const date = a.date_creation ? new Date(a.date_creation).getTime() || 0 : 0;
    const deja = parPersonne.get(cle);
    if (!deja || date < deja.date) parPersonne.set(cle, { note, date });
  });
  const notes = [...parPersonne.values()].map((v) => v.note);
  const repartition: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  notes.forEach((n) => { const e = Math.round(n); if (repartition[e] !== undefined) repartition[e]++; });
  return { moyenne: notes.length ? notes.reduce((s, n) => s + n, 0) / notes.length : 0, nombre: notes.length, repartition };
}
