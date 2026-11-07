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
  /** Commandes : frais d'envoi en DA (null : pas d'envoi) et remise en main propre */
  envoi_algerie?: number | string | null;
  envoi_etranger?: number | string | null;
  main_propre?: boolean;
}

export interface PaiementInscription {
  montant: number | null;
  paye: boolean;
  date_paiement: string | null;
  moyens: MoyensPaiement | null;
  organisateur: { id: number; nom: string } | null;
  /** L'organisateur n'est plus en règle (compte suspendu) : ne pas payer */
  organisateur_indisponible?: boolean;
}

const erreur = (e: unknown, defaut: string) => ({
  success: false as const,
  error: e instanceof Error && e.message ? e.message : defaut,
  code: (e as { code?: string })?.code,
});

export const paiementService = {
  async mesMoyens(): Promise<ApiResponse<MoyensPaiement | null>> {
    try { return await httpClient.get<MoyensPaiement | null>('/paiement/mes-moyens'); } catch (e) { return erreur(e, 'Erreur'); }
  },
  /** Changer le RIP, le CCP, le titulaire ou le lien demande le mot de passe */
  async enregistrerMoyens(moyens: MoyensPaiement | null, motDePasse?: string): Promise<ApiResponse<MoyensPaiement | null> & { code?: string }> {
    try { return await httpClient.put<MoyensPaiement | null>('/paiement/mes-moyens', { moyens, mot_de_passe: motDePasse || undefined }); } catch (e) { return erreur(e, 'Erreur'); }
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

/** Coordonnées dont le changement demande le mot de passe (même liste que le serveur) */
export const CLES_SENSIBLES = ['titulaire', 'baridimob_rip', 'ccp_numero', 'ccp_cle', 'especes', 'lien_url', 'lien_libelle', 'consignes'] as const;

/** Nom du site d'un lien de paiement, affiché à côté du lien (l'acheteur voit où il va payer) */
export const siteDuLien = (url?: string | null): string | null => {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
};

/** RIP lisible : groupes de quatre chiffres */
export const ripLisible = (rip: string) => rip.replace(/(\d{4})(?=\d)/g, '$1 ');
