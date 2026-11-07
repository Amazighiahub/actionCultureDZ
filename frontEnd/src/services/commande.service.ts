/**
 * Commandes de livres, d'œuvres d'art et d'artisanat : l'acheteur paie directement le professionnel,
 * Tala DZ n'encaisse rien et ne prend aucune commission.
 */
import { httpClient } from './httpClient';
import type { ApiResponse } from '@/config/api';
import type { MoyensPaiement } from './paiement.service';

export type ModeLivraison = 'algerie' | 'etranger' | 'main_propre' | 'a_convenir';
export type StatutCommande = 'en_attente' | 'payee' | 'envoyee' | 'annulee';

export interface OffreOeuvre {
  commandable: boolean;
  raison?: 'introuvable' | 'type' | 'sans_prix' | 'sans_moyen' | 'epuise';
  id_oeuvre?: number;
  titre?: string;
  prix?: number | null;
  prix_max?: number | null;
  stock?: number | null;
  /** Œuvre d'art unique : quantité 1 */
  unique?: boolean;
  vendeur?: { id: number; nom: string } | null;
  /** Frais d'envoi en DA par mode (null : à convenir) */
  livraison?: Partial<Record<ModeLivraison, number | null>>;
}

export interface Commande {
  id_commande: number;
  id_oeuvre: number | null;
  titre: string;
  quantite: number;
  prix_unitaire: number;
  prix_a_confirmer: boolean;
  frais_envoi: number | null;
  montant_total: number;
  livraison: ModeLivraison;
  adresse?: string | null;
  telephone?: string | null;
  message: string | null;
  statut: StatutCommande;
  date_creation: string;
  date_paiement: string | null;
  date_envoi: string | null;
  date_annulation: string | null;
  annulee_par: 'acheteur' | 'vendeur' | null;
  role: 'acheteur' | 'vendeur';
  vendeur: { id: number; nom: string };
  acheteur: { id: number; nom: string; email?: string | null };
  /** Montré à l'acheteur tant qu'il doit payer (copie des coordonnées au moment de la commande) */
  moyens?: MoyensPaiement;
  /** Le vendeur a changé ses coordonnées depuis la commande : à vérifier avec lui avant de payer */
  moyens_modifies?: boolean;
  /** Vendeur suspendu : ne pas payer */
  vendeur_indisponible?: boolean;
  /** Vendeur : montant qu'il peut encore fixer (fourchette annoncée) */
  montant_bornes?: { min: number; max: number };
}

export interface NouvelleCommande {
  id_oeuvre: number;
  quantite: number;
  livraison: ModeLivraison;
  adresse?: string;
  telephone?: string;
  message?: string;
}

const erreur = (e: unknown) => ({ success: false as const, error: e instanceof Error && e.message ? e.message : 'Erreur' });

export const commandeService = {
  async offre(idOeuvre: number): Promise<ApiResponse<OffreOeuvre>> {
    try { return await httpClient.get<OffreOeuvre>(`/commandes/oeuvres/${idOeuvre}/offre`); } catch (e) { return erreur(e); }
  },
  async commander(d: NouvelleCommande): Promise<ApiResponse<Commande>> {
    try { return await httpClient.post<Commande>('/commandes', d); } catch (e) { return erreur(e); }
  },
  async mesAchats(): Promise<ApiResponse<Commande[]>> {
    try { return await httpClient.get<Commande[]>('/commandes/mes-achats'); } catch (e) { return erreur(e); }
  },
  async mesVentes(): Promise<ApiResponse<Commande[]>> {
    try { return await httpClient.get<Commande[]>('/commandes/mes-ventes'); } catch (e) { return erreur(e); }
  },
  async ventesATraiter(): Promise<ApiResponse<{ total: number }>> {
    try { return await httpClient.get<{ total: number }>('/commandes/mes-ventes/a-traiter'); } catch (e) { return erreur(e); }
  },
  async mettreAJour(id: number, d: { statut?: StatutCommande; montant_total?: number }): Promise<ApiResponse<Commande>> {
    try { return await httpClient.put<Commande>(`/commandes/${id}`, d); } catch (e) { return erreur(e); }
  },
};
