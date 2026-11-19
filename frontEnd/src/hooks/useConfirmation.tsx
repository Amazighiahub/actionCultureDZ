/**
 * Demande de confirmation dans une fenêtre du site (lot 3 doublons, 2026-11-19). Remplace window.confirm :
 * fenêtre du navigateur en anglais sur certains téléphones, sans mise en page arabe, et bloquée dans
 * certaines applications (WebView). Usage :
 *   const { confirmer, fenetreConfirmation } = useConfirmation();
 *   if (!(await confirmer({ titre: '…', variante: 'destructive' }))) return;
 *   …
 *   return <>{…}{fenetreConfirmation}</>;
 * Seule exception : la sortie d'une page modifiée (useUnsavedChanges) doit répondre tout de suite.
 */
import { useCallback, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

export interface DemandeConfirmation {
  titre: string;
  description?: string;
  libelleConfirmer?: string;
  variante?: 'default' | 'destructive' | 'warning';
}

export function useConfirmation() {
  const [demande, setDemande] = useState<DemandeConfirmation | null>(null);
  const reponse = useRef<((ok: boolean) => void) | null>(null);

  const repondre = useCallback((ok: boolean) => {
    reponse.current?.(ok);
    reponse.current = null;
    setDemande(null);
  }, []);

  const confirmer = useCallback((d: DemandeConfirmation) => new Promise<boolean>((resoudre) => {
    reponse.current?.(false); // une demande précédente restée ouverte vaut « non »
    reponse.current = resoudre;
    setDemande(d);
  }), []);

  const fenetreConfirmation = (
    <ConfirmDialog
      open={!!demande}
      onOpenChange={(ouvert) => { if (!ouvert) repondre(false); }}
      title={demande?.titre || ''}
      description={demande?.description}
      confirmLabel={demande?.libelleConfirmer}
      variant={demande?.variante || 'default'}
      onConfirm={() => repondre(true)}
    />
  );

  return { confirmer, fenetreConfirmation };
}
