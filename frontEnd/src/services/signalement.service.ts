/**
 * Signaler un contenu à l'équipe de modération (POST /signalements) : commentaire, œuvre, événement,
 * artisanat. Connexion et e-mail vérifié exigés par le serveur, qui ne garde que les contenus publiés.
 */
import i18next from 'i18next';
import { httpClient } from './httpClient';
import type { ApiResponse } from '@/config/api';
import { reponseEchec } from '@/utils/erreurServeur';

export type TypeContenuSignalable = 'commentaire' | 'oeuvre' | 'evenement' | 'artisanat' | 'lieu';

export async function signalerContenu(
  type: TypeContenuSignalable, id: number, motif: string, description?: string
): Promise<ApiResponse<void>> {
  try {
    return await httpClient.post<void>('/signalements', {
      type_entite: type, id_entite: id, motif, ...(description ? { description } : {})
    });
  } catch (error: unknown) {
    return { ...reponseEchec(error, i18next.t('common.errorOccurred', 'Une erreur est survenue')) };
  }
}
