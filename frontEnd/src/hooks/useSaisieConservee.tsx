/**
 * Texte en cours de saisie conservé quand la session expire (audit V11 FRM-23).
 *
 * Quand la session expire, httpClient affiche « Session expirée », émet l'événement « auth:expired »,
 * puis recharge la page de connexion, qui ramène ensuite sur la page quittée. Avant, le commentaire,
 * le message ou les réponses en cours étaient perdus.
 *
 * Fonctionnement, commun à tous les formulaires (avant : deux mécanismes recopiés, sans l'utilisateur
 * dans la clé) :
 * - sauvegarde seulement à l'événement « auth:expired » (rien n'est écrit pendant la frappe) ;
 * - sessionStorage, clé = utilisateur + formulaire + élément (ex. « avis-oeuvre:42 ») ;
 * - restauration une seule fois, au retour, si le brouillon a moins de 30 minutes ; il est effacé aussitôt ;
 * - oublier() après un envoi réussi ou « Annuler » ; tout est effacé à la déconnexion.
 * Jamais de mot de passe ni de fichier.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUtilisateurOptionnel } from '@/providers/PermissionsProvider';

const PREFIXE = 'saisie:';
const DUREE_MAX = 30 * 60 * 1000;

const cleComplete = (cle: string, idUtilisateur: number | string) => `${PREFIXE}${idUtilisateur}:${cle}`;

const lire = (cleStockage: string): { savedAt: number; valeur: unknown } | null => {
  try {
    const brut = sessionStorage.getItem(cleStockage);
    return brut ? JSON.parse(brut) : null;
  } catch {
    return null;
  }
};

/** Un brouillon attend-il pour ce formulaire ? (sans le consommer : pour ouvrir l'onglet qui le contient) */
export function saisieEnAttente(cle: string, idUtilisateur: number | string | undefined | null): boolean {
  if (idUtilisateur === undefined || idUtilisateur === null) return false;
  const brouillon = lire(cleComplete(cle, idUtilisateur));
  return !!brouillon && Date.now() - brouillon.savedAt < DUREE_MAX;
}

/** À la déconnexion : aucun brouillon ne doit rester pour la personne suivante (poste partagé) */
export function oublierSaisiesConservees(): void {
  try {
    const cles: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(PREFIXE)) cles.push(k);
    }
    cles.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // Stockage indisponible : rien à effacer
  }
}

interface Options<T> {
  /** Formulaire et élément, ex. « avis-oeuvre:42 » ; null tant que l'élément n'est pas connu */
  cle: string | null;
  /** Ce qu'il faut garder (texte, et ce qu'il faut pour rouvrir la fenêtre) */
  valeur: T;
  /** Remet le texte en place (et rouvre la fenêtre ou le mode d'édition si besoin) */
  restaurer: (valeur: T) => void;
  /** Ne rien garder quand c'est faux (formulaire fermé, rien d'écrit) */
  actif?: boolean;
  /** Faux pour un formulaire sans compte (contact) : la clé ne contient pas l'utilisateur */
  parUtilisateur?: boolean;
}

export function useSaisieConservee<T>({ cle, valeur, restaurer, actif = true, parUtilisateur = true }: Options<T>) {
  const user = useUtilisateurOptionnel();
  // L'identifiant est lu dans le contexte React : localStorage.user est déjà effacé quand l'événement arrive
  const idUtilisateur = parUtilisateur ? user?.id_user : 'public';
  const cleStockage = cle && idUtilisateur !== undefined && idUtilisateur !== null ? cleComplete(cle, idUtilisateur) : null;

  const courant = useRef({ valeur, actif, cleStockage });
  courant.current = { valeur, actif, cleStockage };
  const restaurerRef = useRef(restaurer);
  restaurerRef.current = restaurer;
  const [restauree, setRestauree] = useState(false);

  // Sauvegarde au moment où la session expire
  useEffect(() => {
    const garder = () => {
      const { valeur: v, actif: a, cleStockage: c } = courant.current;
      if (!a || !c) return;
      try { sessionStorage.setItem(c, JSON.stringify({ v: 1, savedAt: Date.now(), valeur: v })); } catch { /* stockage plein ou bloqué */ }
    };
    window.addEventListener('auth:expired', garder);
    return () => window.removeEventListener('auth:expired', garder);
  }, []);

  // Restauration, une seule fois, quand la clé est connue
  const dejaLu = useRef<string | null>(null);
  useEffect(() => {
    if (!cleStockage || dejaLu.current === cleStockage) return;
    dejaLu.current = cleStockage;
    const brouillon = lire(cleStockage);
    try { sessionStorage.removeItem(cleStockage); } catch { /* rien */ }
    if (!brouillon || Date.now() - brouillon.savedAt > DUREE_MAX) return;
    restaurerRef.current(brouillon.valeur as T);
    setRestauree(true);
  }, [cleStockage]);

  const oublier = useCallback(() => {
    setRestauree(false);
    const c = courant.current.cleStockage;
    if (c) { try { sessionStorage.removeItem(c); } catch { /* rien */ } }
  }, []);

  return { restauree, oublier };
}

/** Avis durable sous le formulaire après une restauration (un bandeau de 5 s ne suffit pas) */
export function SaisieConserveeAvis({ visible }: { visible: boolean }) {
  const { t } = useTranslation();
  if (!visible) return null;
  return (
    <p role="status" className="rounded-md border border-primary/30 bg-primary/5 p-2 text-sm">
      {t('saisie.conservee', 'Votre session avait expiré : votre texte a été conservé. Vérifiez-le, puis envoyez-le de nouveau.')}
    </p>
  );
}
