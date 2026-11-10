/**
 * Échec de l'envoi d'un commentaire (œuvre, événement, artisanat) : un seul message, sous la case, qui dit
 * la vraie raison (trop d'envois, texte refusé…) ou, sans réseau, que le texte est conservé.
 * Avant : un message fixe sous la case et un bandeau « Network Error » en plus (audit V11 FRM-14).
 */
import type { TFunction } from 'i18next';
import { echecEnvoi, type ResultatEnvoi } from '@/utils/erreurServeur';

export function echecCommentaire(err: unknown, t: TFunction): ResultatEnvoi {
  return echecEnvoi(err, {
    defaut: t('comments.nonEnvoye', 'Votre commentaire n’est pas parti. Il est toujours dans la case : réessayez.'),
    nonParti: t('comments.nonEnvoye', 'Votre commentaire n’est pas parti. Il est toujours dans la case : réessayez.'),
  });
}
