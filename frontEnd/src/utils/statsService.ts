/**
 * Signal d'une vue ou d'un clic sur la fiche d'un service, pour les statistiques de son professionnel
 * (2026-11-16). Une fois par jour et par navigateur (mémoire du navigateur) ; rien sur la personne
 * n'est envoyé. Un échec n'a aucun effet sur la page.
 */
import { httpClient } from '@/services/httpClient';

export type ActionStat = 'vue' | 'whatsapp' | 'reservation' | 'appel';

export function signalerService(idService: number, action: ActionStat): void {
  if (!idService) return;
  const cle = `tala-stat:${idService}:${action}:${new Date().toISOString().slice(0, 10)}`;
  try {
    if (localStorage.getItem(cle)) return;
    localStorage.setItem(cle, '1');
  } catch { /* stockage indisponible (navigation privée) : on compte quand même */ }
  httpClient.post(`/services/${idService}/stat`, { action }).catch(() => undefined);
}
