/**
 * Refus d'un contenu par l'administration : le motif est obligatoire et envoyé à l'auteur
 * (avant : refus sans motif, l'auteur ne savait pas quoi corriger).
 * Motifs prêts à cliquer (audit V11 OUT-15) : ils s'ajoutent au texte, que la modération complète.
 * Fenêtre commune aux œuvres, événements et services (avant : une copie par onglet).
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MOTIFS_REFUS, ajouterMotif } from '@/utils/motifsRefus';

interface Props {
  open: boolean;
  titre?: string;
  /** Ce qui arrive à l'auteur (« revient en brouillon… ») ; par défaut : le motif lui est envoyé */
  description?: string;
  placeholder?: string;
  libelleBouton?: string;
  onClose: () => void;
  onConfirm: (motif: string) => void | Promise<void>;
}

const MotifRefusDialog: React.FC<Props> = ({ open, titre, description, placeholder, libelleBouton, onClose, onConfirm }) => {
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titre || t('admin.refus.titre', 'Refuser')}</DialogTitle>
          <DialogDescription>{description || t('admin.refus.aide', 'Expliquez ce qu’il faut corriger : le motif est envoyé à l’auteur.')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground" id="motifs-prets">{t('admin.refus.motifsPrets', 'Motifs fréquents (cliquez pour les ajouter)')}</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="motifs-prets">
            {MOTIFS_REFUS.map(({ cle, defaut }) => {
              const texte = t(cle, defaut);
              return (
                <Button key={cle} type="button" variant="outline" size="sm" className="h-auto whitespace-normal py-1 text-start text-xs"
                  onClick={() => setMotif((m) => ajouterMotif(m, texte))}>
                  {texte}
                </Button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="motif-refus">{t('admin.organisations.motif', 'Motif')}</Label>
          <Textarea id="motif-refus" rows={4} maxLength={1000} value={motif} placeholder={placeholder} onChange={(e) => setMotif(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel', 'Annuler')}</Button>
          <Button variant="destructive" disabled={!motif.trim() || envoi} onClick={confirmer}>{libelleBouton || t('admin.organisations.refuser', 'Refuser')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MotifRefusDialog;
