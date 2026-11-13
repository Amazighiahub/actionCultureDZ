/**
 * Fenêtre de signalement, la même pour un commentaire et pour une fiche (œuvre, événement,
 * artisanat) : motif, précision facultative, envoi à l'équipe de modération (audit V11 OUT-2).
 * Extraite de ActionsCommentaire (avant : dialogue écrit dans le menu des commentaires seulement).
 * Texte gardé si la session expire pendant la saisie (useSaisieConservee), fenêtre rouverte au retour.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MOTIFS_SIGNALEMENT } from '@/utils/motifsSignalement';
import { SaisieConserveeAvis, useSaisieConservee } from '@/hooks/useSaisieConservee';

interface Props {
  open: boolean;
  /** Fermeture (annuler, croix, envoi réussi) */
  onClose: () => void;
  /** Rouvrir la fenêtre après une session expirée (texte restauré) */
  onRouvrir: () => void;
  /** Clé de la saisie conservée, ex. « commentaire:12:signaler » */
  cle: string | null;
  titre: string;
  /** Envoi du signalement ; message du serveur affiché dans la fenêtre en cas de refus */
  envoyer: (motif: string, precision?: string) => Promise<{ success: boolean; error?: string }>;
  onEnvoye: () => void;
}

export default function DialogueSignalement({ open, onClose, onRouvrir, cle, titre, envoyer, onEnvoye }: Props) {
  const { t } = useTranslation();
  const [motif, setMotif] = useState('');
  const [precision, setPrecision] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const { restauree, oublier } = useSaisieConservee({
    cle,
    valeur: { motif, precision },
    restaurer: (v) => { setMotif(v.motif || ''); setPrecision(v.precision || ''); setErreur(null); onRouvrir(); },
    actif: open && !!(motif || precision.trim()),
  });

  // Nouvelle ouverture : fenêtre vide (sauf texte restauré après une session expirée)
  const etaitOuvert = useRef(open);
  useEffect(() => {
    if (open && !etaitOuvert.current && !restauree) { setMotif(''); setPrecision(''); setErreur(null); }
    etaitOuvert.current = open;
  }, [open, restauree]);

  const fermer = () => { oublier(); onClose(); };

  const signaler = async () => {
    if (!motif) {
      setErreur(t('comments.actions.motifRequis', 'Choisissez un motif'));
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      const res = await envoyer(motif, precision.trim() || undefined);
      if (!res.success) {
        setErreur(res.error || t('common.error', 'Erreur'));
        return;
      }
      oublier();
      onEnvoye();
    } finally {
      setEnvoi(false);
    }
  };

  const idPrecision = `precision-${(cle || 'signalement').replace(/[^a-z0-9-]/gi, '-')}`;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) fermer(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titre}</DialogTitle>
          <DialogDescription>{t('comments.actions.signalerAide', 'L’équipe Tala DZ lira votre signalement. La personne ne saura pas que c’est vous.')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t('comments.actions.motif', 'Motif')}</Label>
            <Select value={motif} onValueChange={setMotif}>
              <SelectTrigger aria-label={t('comments.actions.motif', 'Motif')}>
                <SelectValue placeholder={t('comments.actions.motifChoisir', 'Choisir un motif')} />
              </SelectTrigger>
              <SelectContent>
                {MOTIFS_SIGNALEMENT.map(({ valeur, cle: cleMotif }) => (
                  <SelectItem key={valeur} value={valeur}>{t(cleMotif, valeur)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={idPrecision}>{t('comments.actions.precision', 'Précision (facultatif)')}</Label>
            <Textarea id={idPrecision} dir="auto" value={precision} onChange={(e) => setPrecision(e.target.value)} maxLength={1000} />
          </div>
          <SaisieConserveeAvis visible={restauree} />
        </div>
        {erreur && <p role="alert" className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" aria-hidden="true" />{erreur}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={fermer}>{t('common.cancel', 'Annuler')}</Button>
          <Button onClick={signaler} disabled={envoi}>{t('comments.actions.envoyer', 'Envoyer le signalement')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
