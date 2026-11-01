/**
 * Refus d'un contenu par l'administration : le motif est obligatoire et envoyé à l'auteur
 * (avant : refus sans motif, l'auteur ne savait pas quoi corriger).
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Props {
  open: boolean;
  titre?: string;
  onClose: () => void;
  onConfirm: (motif: string) => void | Promise<void>;
}

const MotifRefusDialog: React.FC<Props> = ({ open, titre, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const [motif, setMotif] = useState('');
  const [envoi, setEnvoi] = useState(false);
  useEffect(() => { if (open) setMotif(''); }, [open]);

  const confirmer = async () => {
    setEnvoi(true);
    try { await onConfirm(motif.trim()); } finally { setEnvoi(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titre || t('admin.refus.titre', 'Refuser')}</DialogTitle>
          <DialogDescription>{t('admin.refus.aide', 'Expliquez ce qu’il faut corriger : le motif est envoyé à l’auteur.')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="motif-refus">{t('admin.organisations.motif', 'Motif')}</Label>
          <Textarea id="motif-refus" rows={4} maxLength={1000} value={motif} onChange={(e) => setMotif(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel', 'Annuler')}</Button>
          <Button variant="destructive" disabled={!motif.trim() || envoi} onClick={confirmer}>{t('admin.organisations.refuser', 'Refuser')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MotifRefusDialog;
