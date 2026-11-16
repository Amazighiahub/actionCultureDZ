/**
 * Filtres de la liste des services (2026-11-16) : note minimale, budget (prix de départ), équipements.
 * Un service sans note est écarté par une note minimale ; sans prix, par un budget.
 */
export const BUDGETS = [1000, 3000, 10000];

type ServiceFiltrable = {
  note?: { moyenne: number; nombre: number } | null;
  tarif_min?: string | number | null;
  tarif_max?: string | number | null;
  equipements?: string[] | null;
};

export function filtrerServices<T extends ServiceFiltrable>(liste: T[], { noteMin = 0, budget = 0, equipements = [] as string[] } = {}): T[] {
  return liste.filter((s) => {
    if (noteMin > 0 && !(s.note && s.note.nombre > 0 && s.note.moyenne >= noteMin)) return false;
    if (budget > 0) {
      const depart = s.tarif_min ?? s.tarif_max;
      if (depart === null || depart === undefined || depart === '' || Number(depart) > budget) return false;
    }
    if (equipements.length && !equipements.every((e) => Array.isArray(s.equipements) && s.equipements.includes(e))) return false;
    return true;
  });
}
