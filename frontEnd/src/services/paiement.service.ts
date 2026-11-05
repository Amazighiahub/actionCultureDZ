/**
 * Paiement direct au professionnel : Tala DZ n'encaisse rien et ne prend aucune commission.
 */
import { httpClient } from './httpClient';
import type { ApiResponse } from '@/config/api';

export interface MoyensPaiement {
  titulaire?: string | null;
  baridimob_rip?: string | null;
  ccp_numero?: string | null;
  ccp_cle?: string | null;
  especes?: boolean;
  lien_url?: string | null;
  lien_libelle?: string | null;
  consignes?: string | null;
}

export interface PaiementInscription {
  montant: number | null;
  paye: boolean;
  date_paiement: string | null;
  moyens: MoyensPaiement | null;
  organisateur: { id: number; nom: string } | null;
}

const erreur = (e: unknown, defaut: string) => ({ success: false as const, error: e instanceof Error && e.message ? e.message : defaut });

export const paiementService = {
  async mesMoyens(): Promise<ApiResponse<MoyensPaiement | null>> {
    try { return await httpClient.get<MoyensPaiement | null>('/paiement/mes-moyens'); } catch (e) { return erreur(e, 'Erreur'); }
  },
  async enregistrerMoyens(moyens: MoyensPaiement | null): Promise<ApiResponse<MoyensPaiement | null>> {
    try { return await httpClient.put<MoyensPaiement | null>('/paiement/mes-moyens', { moyens }); } catch (e) { return erreur(e, 'Erreur'); }
  },
  async paiementEvenement(idEvenement: number): Promise<ApiResponse<PaiementInscription>> {
    try { return await httpClient.get<PaiementInscription>(`/paiement/evenements/${idEvenement}`); } catch (e) { return erreur(e, 'Erreur'); }
  },
  async confirmerPaiement(idEvenement: number, idParticipant: number, recu: boolean): Promise<ApiResponse<{ paye: boolean }>> {
    try {
      return await httpClient.put<{ paye: boolean }>(`/paiement/evenements/${idEvenement}/participants/${idParticipant}`, { recu });
    } catch (e) { return erreur(e, 'Erreur'); }
  },
};

/** RIP lisible : groupes de quatre chiffres */
export const ripLisible = (rip: string) => rip.replace(/(\d{4})(?=\d)/g, '$1 ');
