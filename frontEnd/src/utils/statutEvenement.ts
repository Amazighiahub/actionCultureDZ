/**
 * Statut affiché d'un événement : un événement planifié, publié ou en cours dont la date
 * est passée s'affiche « Terminé » (le statut en base n'est pas mis à jour automatiquement,
 * d'où un badge « Planifié » à côté de « Cet événement est passé »).
 */
const STATUTS_ACTIFS = ['planifie', 'publie', 'en_cours'];

export function statutAffiche(
  statut: string | undefined | null,
  dateDebut?: string | Date | null,
  dateFin?: string | Date | null,
  maintenant: Date = new Date()
): string {
  const s = statut || 'brouillon';
  if (!STATUTS_ACTIFS.includes(s)) return s;
  const fin = finEffective(dateDebut, dateFin);
  if (!fin) return s;
  return fin <= maintenant ? 'termine' : s;
}

const UNE_HEURE = 60 * 60 * 1000;

/**
 * Fin réelle, à l'heure de l'Algérie (UTC+1, sans heure d'été) — même règle que le serveur
 * (backend/helpers/finEvenement.js) : un jour enregistré sans heure (minuit UTC, ou « 2026-10-20 »)
 * vaut pour toute la journée ; sans date de fin, l'événement dure jusqu'au soir de son premier jour.
 */
export function finEffective(dateDebut?: string | Date | null, dateFin?: string | Date | null): Date | null {
  const fin = dateFin ? new Date(dateFin) : null;
  const finValide = fin !== null && !Number.isNaN(fin.getTime());
  const sansHeure = (d: Date) => d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
  if (finValide && !sansHeure(fin)) return fin;
  const ref = finValide ? fin : (dateDebut ? new Date(dateDebut) : null);
  if (!ref || Number.isNaN(ref.getTime())) return null;
  const local = new Date(ref.getTime() + UNE_HEURE);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1) - UNE_HEURE);
}

const UN_JOUR = 24 * UNE_HEURE;

/** Jour civil en Algérie (UTC+1), sous la forme d'un nombre de jours depuis 1970 */
const jourAlgerie = (d: Date) => Math.floor((d.getTime() + UNE_HEURE) / UN_JOUR);

export type Echeance =
  | { cle: 'enCours' }
  | { cle: 'aujourdhui' }
  | { cle: 'demain' }
  | { cle: 'dansJours'; jours: number }
  | { cle: 'termine' };

/**
 * Échéance d'un événement pour le public : « En ce moment », « Aujourd'hui », « Demain »,
 * « Dans N jours » ou « Terminé ». Remplace le statut interne (« Publié ») sur les cartes
 * (audit V11 UX-17) ; aussi utilisé par « À la une » de l'accueil.
 */
export function echeanceEvenement(
  dateDebut?: string | Date | null,
  dateFin?: string | Date | null,
  maintenant: Date = new Date()
): Echeance | null {
  if (!dateDebut) return null;
  const debut = new Date(dateDebut);
  if (Number.isNaN(debut.getTime())) return null;
  const fin = finEffective(dateDebut, dateFin);
  if (fin && fin <= maintenant) return { cle: 'termine' };
  const jours = jourAlgerie(debut) - jourAlgerie(maintenant);
  // Jour enregistré sans heure : l'heure n'est pas connue, on dit « Aujourd'hui » et non « En ce moment »
  const debutSansHeure = debut.getUTCHours() === 0 && debut.getUTCMinutes() === 0 && debut.getUTCSeconds() === 0;
  if (debut <= maintenant && !(debutSansHeure && jours === 0)) return { cle: 'enCours' };
  if (jours <= 0) return { cle: 'aujourdhui' };
  if (jours === 1) return { cle: 'demain' };
  return { cle: 'dansJours', jours };
}

type Traduire = (cle: string, options?: Record<string, unknown>) => string;

/** Libellé traduit d'une échéance (clés de « À la une » de l'accueil) */
export function libelleEcheance(echeance: Echeance | null, t: Traduire): string | null {
  if (!echeance) return null;
  switch (echeance.cle) {
    case 'enCours': return t('home.aLaUne.enCours', { defaultValue: 'En ce moment' });
    case 'aujourdhui': return t('home.aLaUne.aujourdhui', { defaultValue: 'Aujourd’hui' });
    case 'demain': return t('home.aLaUne.demain', { defaultValue: 'Demain' });
    case 'dansJours': return t('home.aLaUne.dansJours', { defaultValue: 'Dans {{count}} jours', count: echeance.jours });
    case 'termine': return t('events.statuses.termine', { defaultValue: 'Terminé' });
  }
}

export type PeriodeEvenements = 'tous' | 'weekend' | 'mois';

/** Date « AAAA-MM-JJ » d'un jour compté depuis 1970 */
const iso = (jour: number) => new Date(jour * UN_JOUR).toISOString().slice(0, 10);

/**
 * Bornes du filtre « Quand ? » de la liste des événements, en jours civils de l'Algérie.
 * Le week-end algérien est le vendredi et le samedi : du dimanche au jeudi, c'est le prochain ;
 * le vendredi ou le samedi, c'est celui en cours. « Ce mois-ci » couvre le mois civil entier.
 */
export function bornesPeriode(
  periode: PeriodeEvenements,
  maintenant: Date = new Date()
): { dateDebut?: string; dateFin?: string } {
  if (periode === 'tous') return {};
  const jour = jourAlgerie(maintenant);
  const local = new Date(jour * UN_JOUR);
  if (periode === 'weekend') {
    const js = local.getUTCDay(); // 0 = dimanche … 5 = vendredi, 6 = samedi
    const vendredi = js === 6 ? jour - 1 : jour + (5 - js);
    return { dateDebut: iso(vendredi), dateFin: iso(vendredi + 1) };
  }
  const premier = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) / UN_JOUR;
  const dernier = Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 0) / UN_JOUR;
  return { dateDebut: iso(premier), dateFin: iso(dernier) };
}
