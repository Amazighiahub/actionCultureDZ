/**
 * useChangementLangue — relance un chargement quand la langue du site change (pas au premier
 * affichage). Les contenus (noms des lieux, œuvres, pièces d'artisanat) sont traduits par le
 * serveur selon la langue envoyée : sans rechargement, ils restaient dans l'ancienne langue.
 * Les données de React Query sont, elles, relues par le client lui-même (lib/queryClient.ts).
 */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export function useChangementLangue(recharger: () => void) {
  const { i18n } = useTranslation();
  const premiere = useRef(i18n.language);
  const rappel = useRef(recharger);
  rappel.current = recharger;

  useEffect(() => {
    if (i18n.language === premiere.current) return;
    premiere.current = i18n.language;
    rappel.current();
  }, [i18n.language]);
}

export default useChangementLangue;
