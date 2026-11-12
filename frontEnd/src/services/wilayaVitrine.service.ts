/** Page d'une wilaya, et liens entre une œuvre et un lieu */
import { httpClient } from '@/services/httpClient';
import { API_ENDPOINTS } from '@/config/api';
import { oeuvrePath, artisanatPath } from '@/utils/slug';
import { reponseEchec } from '@/utils/erreurServeur';
import i18next from 'i18next';

export interface ListeTotal<T> { liste: T[]; total: number }

export interface WilayaResume { id_wilaya: number; nom: string; wilaya_name_ascii?: string; codeW?: number }

export interface PersonneWilaya {
  id_user: number;
  nom: unknown;
  prenom: unknown;
  photo_url?: string | null;
  id_type_user: number;
  entreprise?: string | null;
  TypeUser?: { id_type_user: number; nom_type: unknown } | null;
}

export interface OeuvreCarte {
  id_oeuvre: number;
  id_type_oeuvre: number;
  id_artisanat?: number | null;
  titre: unknown;
  resume?: unknown;
  image?: string | null;
  id_lien?: number;
  peut_retirer?: boolean;
  statut?: string;
}

export interface EvenementWilaya { id_evenement: number; nom_evenement: unknown; date_debut?: string | null; date_fin?: string | null; image_url?: string | null }

export interface LieuWilaya { id_lieu: number; nom: unknown; image?: string | null; Commune?: { nom?: string; commune_name_ascii?: string } | null }

export interface VitrineWilaya {
  wilaya: WilayaResume;
  professionnels: ListeTotal<PersonneWilaya>;
  oeuvres: ListeTotal<OeuvreCarte>;
  articles: ListeTotal<OeuvreCarte>;
  artisanat: ListeTotal<OeuvreCarte>;
  evenements: ListeTotal<EvenementWilaya>;
  lieux: ListeTotal<LieuWilaya>;
  organisations: ListeTotal<Record<string, unknown>>;
}

export interface LieuDeOeuvre { id_lien: number; id_lieu: number; nom: unknown; peut_retirer: boolean }

/** Adresse de la fiche : chaque genre d'œuvre a la sienne */
export const lienOeuvre = (o: Pick<OeuvreCarte, 'id_oeuvre' | 'id_type_oeuvre' | 'id_artisanat'> & { titre?: unknown }): string => {
  if (o.id_artisanat) return artisanatPath(o.id_artisanat, o.titre);
  return oeuvrePath(o.id_oeuvre, o.titre, o.id_type_oeuvre);
};

export const wilayaVitrineService = {
  vitrine: async (id: number) => (await httpClient.get<VitrineWilaya>(`/wilayas/${id}/vitrine`)).data ?? null,
  wilayas: async () => (await httpClient.get<WilayaResume[]>(API_ENDPOINTS.metadata.geographie.wilayas)).data ?? [],
  oeuvresLiees: async (idLieu: number) => (await httpClient.get<OeuvreCarte[]>(`/patrimoine/${idLieu}/oeuvres-liees`)).data ?? [],
  lieuxDeOeuvre: async (idOeuvre: number) =>
    (await httpClient.get<{ peut_relier: boolean; lieux: LieuDeOeuvre[] }>(`/patrimoine/oeuvre-lieux/${idOeuvre}`)).data
    ?? { peut_relier: false, lieux: [] },
  // httpClient rejette les erreurs : sans ce repli, le bouton restait bloqué sans aucun message
  relier: (idLieu: number, idOeuvre: number) => httpClient.post(`/patrimoine/${idLieu}/oeuvres-liees`, { id_oeuvre: idOeuvre })
    .catch((e: unknown) => reponseEchec(e, i18next.t('common.errorOccurred', 'Une erreur est survenue'))),
  retirer: (idLieu: number, idLien: number) => httpClient.delete(`/patrimoine/${idLieu}/pages/${idLien}`)
    .catch((e: unknown) => reponseEchec(e, i18next.t('common.errorOccurred', 'Une erreur est survenue')))
};
