/**
 * Site installable et notifications sur le téléphone.
 * L'installation se propose une seule fois par chargement : l'événement est gardé dès le démarrage.
 */
import { httpClient } from '@/services/httpClient';

interface InvitationInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let invitation: InvitationInstallation | null = null;
const abonnes = new Set<() => void>();
const prevenir = () => abonnes.forEach((f) => f());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    invitation = e as InvitationInstallation;
    prevenir();
  });
  window.addEventListener('appinstalled', () => {
    invitation = null;
    prevenir();
  });
}

export const suivreInstallation = (f: () => void) => {
  abonnes.add(f);
  return () => {
    abonnes.delete(f);
  };
};

export const installationProposee = () => invitation !== null;

export const estInstallee = () => window.matchMedia?.('(display-mode: standalone)').matches
  || (navigator as Navigator & { standalone?: boolean }).standalone === true;

// Safari sur iPad se présente comme un Mac : seul l'écran tactile le distingue
export const estIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
  || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

export async function lancerInstallation(): Promise<boolean> {
  if (!invitation) return false;
  await invitation.prompt();
  const { outcome } = await invitation.userChoice;
  invitation = null;
  prevenir();
  return outcome === 'accepted';
}

export const notificationsPossibles = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const versOctets = (base64: string): Uint8Array => {
  const normalise = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(normalise), (c) => c.charCodeAt(0));
};

export async function abonnementActuel(): Promise<PushSubscription | null> {
  if (!notificationsPossibles()) return null;
  const inscription = await navigator.serviceWorker.getRegistration();
  return inscription ? inscription.pushManager.getSubscription() : null;
}

const enregistrerAbonnement = (abonnement: PushSubscription) => {
  const { endpoint, keys } = abonnement.toJSON();
  return httpClient.post<unknown>('/notifications/push/abonnement', { endpoint, p256dh: keys?.p256dh, auth: keys?.auth });
};

export type ResultatActivation = 'active' | 'refusee' | 'indisponible';

export async function activerNotifications(): Promise<ResultatActivation> {
  if (!notificationsPossibles()) return 'indisponible';
  // Avant tout appel réseau : sur iPhone, la demande doit suivre directement le geste de la personne
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'refusee';

  const cle = await httpClient.get<{ cle: string | null }>('/notifications/push/cle');
  if (!cle.data?.cle) return 'indisponible';

  const inscription = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const abonnement = await inscription.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: versOctets(cle.data.cle) as BufferSource,
  });
  try {
    await enregistrerAbonnement(abonnement);
  } catch {
    // Le serveur ne l'a pas : le navigateur ne doit pas se croire abonné
    await abonnement.unsubscribe().catch(() => false);
    return 'indisponible';
  }
  return 'active';
}

export async function desactiverNotifications(): Promise<void> {
  const abonnement = await abonnementActuel();
  if (!abonnement) return;
  await httpClient.post('/notifications/push/abonnement/retrait', { endpoint: abonnement.endpoint }).catch(() => undefined);
  await abonnement.unsubscribe().catch(() => false);
}

/**
 * Téléphone partagé : cet appareil passe au compte qui vient de se connecter ou d'ouvrir ses réglages
 * (la session précédente a pu expirer sans déconnexion). Sans effet s'il n'a jamais activé les notifications.
 */
export async function rattacherAppareil(): Promise<void> {
  const abonnement = await abonnementActuel();
  if (abonnement) await enregistrerAbonnement(abonnement);
}

/**
 * À la déconnexion : le navigateur cesse tout de suite de recevoir, sans appel réseau qui pourrait
 * ralentir la sortie ou renouveler la session. La ligne du serveur tombe au prochain envoi (réponse 410).
 */
export async function retirerAppareilALaDeconnexion(): Promise<void> {
  await Promise.race([
    abonnementActuel().then((a) => a?.unsubscribe()).catch(() => undefined),
    new Promise((resoudre) => { setTimeout(resoudre, 2000); }),
  ]);
}
