/**
 * Propositions de modification d'un article (brouillons validés par l'auteur ou l'administration).
 * Endpoints : backend/routes/oeuvreRoutes.js (/oeuvres/:id/revisions)
 */
import type { ApiResponse } from '@/config/api';
import { httpClient } from './httpClient';

export interface BlocRevision {
  type_block: string;
  contenu?: string | null;
  contenu_json?: unknown;
  metadata?: Record<string, unknown> | null;
  id_media?: number | null;
  media?: { url: string } | null;
}

export interface RevisionResume {
  id_revision: number;
  id_auteur: number | null;
  motif: string;
  statut: 'en_attente' | 'acceptee' | 'refusee';
  motif_refus?: string | null;
  date_creation: string;
  date_decision?: string | null;
  Auteur?: { id_user: number; nom: unknown; prenom: unknown } | null;
}

export interface RevisionDetail extends RevisionResume {
  contenu: { titre?: unknown; description?: unknown; blocks: BlocRevision[] };
  peut_decider: boolean;
}

export const articleRevisionService = {
  lister(idOeuvre: number): Promise<ApiResponse<{ peut_decider: boolean; revisions: RevisionResume[] }>> {
    return httpClient.get(`/oeuvres/${idOeuvre}/revisions`);
  },
  detail(idOeuvre: number, idRevision: number): Promise<ApiResponse<RevisionDetail>> {
    return httpClient.get(`/oeuvres/${idOeuvre}/revisions/${idRevision}`);
  },
  proposer(idOeuvre: number, donnees: { motif: string; titre?: unknown; description?: unknown; blocks: BlocRevision[] }): Promise<ApiResponse<{ id_revision: number }>> {
    return httpClient.post(`/oeuvres/${idOeuvre}/revisions`, donnees);
  },
  decider(idOeuvre: number, idRevision: number, decision: 'accepter' | 'refuser', motif_refus?: string): Promise<ApiResponse<{ statut: string }>> {
    return httpClient.post(`/oeuvres/${idOeuvre}/revisions/${idRevision}/decision`, { decision, motif_refus });
  },
};

/** Empreinte d'un bloc pour la comparaison (même type, même contenu, même image) */
export const empreinteBloc = (b: BlocRevision): string =>
  JSON.stringify([b.type_block, (b.contenu || '').trim(), b.contenu_json ?? null, b.id_media ?? null,
    (b.metadata as Record<string, unknown> | null)?.url ?? null, (b.metadata as Record<string, unknown> | null)?.caption ?? null,
    (b.metadata as Record<string, unknown> | null)?.level ?? null, (b.metadata as Record<string, unknown> | null)?.author ?? null]);

export type LigneComparaison = { etat: 'identique' | 'ajoute' | 'retire'; bloc: BlocRevision };

/**
 * Ce qui change entre l'article actuel et la version proposée, bloc par bloc
 * (plus longue sous-suite commune : un bloc déplacé apparaît retiré puis ajouté).
 */
export function comparerBlocs(actuels: BlocRevision[], proposes: BlocRevision[]): LigneComparaison[] {
  const a = actuels.map(empreinteBloc), b = proposes.map(empreinteBloc);
  const n = a.length, m = b.length;
  const L: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const lignes: LigneComparaison[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    // Bloc inchangé : celui de l'article (avec son image chargée)
    if (a[i] === b[j]) { lignes.push({ etat: 'identique', bloc: actuels[i] }); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) { lignes.push({ etat: 'retire', bloc: actuels[i] }); i++; }
    else { lignes.push({ etat: 'ajoute', bloc: proposes[j] }); j++; }
  }
  while (i < n) lignes.push({ etat: 'retire', bloc: actuels[i++] });
  while (j < m) lignes.push({ etat: 'ajoute', bloc: proposes[j++] });
  return lignes;
}
