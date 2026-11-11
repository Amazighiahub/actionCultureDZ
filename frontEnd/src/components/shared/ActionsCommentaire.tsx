/**
 * Menu d'un commentaire, le même partout (œuvre, article, artisanat, événement, service) :
 * son auteur le modifie ou le supprime, les autres membres le signalent,
 * l'administration le masque ou le supprime.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, EyeOff, Flag, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { commentaireService } from '@/services/commentaire.service';
import { MOTIFS_SIGNALEMENT } from '@/utils/motifsSignalement';
import { SaisieConserveeAvis, useSaisieConservee } from '@/hooks/useSaisieConservee';

interface Props {
  commentaire: { id_commentaire?: number; id?: number; id_user?: number; contenu: string; User?: object | null };
  /** Après une modification : recharger la liste */
  onChange?: () => void;
}

type Fenetre = 'modifier' | 'signaler' | 'supprimer' | 'masquer' | null;

const ActionsCommentaire: React.FC<Props> = ({ commentaire, onChange }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [fenetre, setFenetre] = useState<Fenetre>(null);
  const [texte, setTexte] = useState('');
  const [motif, setMotif] = useState('');
  const [precision, setPrecision] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const id = commentaire.id_commentaire ?? commentaire.id;
  const idAuteur = commentaire.id_user ?? (commentaire.User as { id_user?: number } | null | undefined)?.id_user;

  // Session expirée pendant la modification ou le signalement : texte conservé, fenêtre rouverte au
  // retour (audit V11 FRM-23). Avant le « return » anticipé (règle des hooks) ; une clé par action.
  const { restauree: modificationRestauree, oublier: oublierModification } = useSaisieConservee({
    cle: id ? `commentaire:${id}:modifier` : null,
    valeur: { texte },
    restaurer: (v) => { setTexte(v.texte || ''); setErreur(null); setFenetre('modifier'); },
    // Seulement un texte changé (la fenêtre s'ouvre avec le commentaire actuel)
    actif: fenetre === 'modifier' && !!texte.trim() && texte.trim() !== (commentaire.contenu || '').trim(),
  });
  const { restauree: signalementRestaure, oublier: oublierSignalement } = useSaisieConservee({
    cle: id ? `commentaire:${id}:signaler` : null,
    valeur: { motif, precision },
    restaurer: (v) => { setMotif(v.motif || ''); setPrecision(v.precision || ''); setErreur(null); setFenetre('signaler'); },
    actif: fenetre === 'signaler' && !!(motif || precision.trim()),
  });
  /** Fermer une fenêtre (« Annuler », croix ou action réussie) : plus rien à conserver */
  const fermer = () => { setFenetre(null); oublierModification(); oublierSignalement(); };

  if (!isAuthenticated || !user || !id) return null;
  const estAuteur = Number(idAuteur) === Number(user.id_user);

  const ouvrir = (quoi: Fenetre) => {
    setErreur(null);
    if (quoi === 'modifier') setTexte(commentaire.contenu || '');
    if (quoi === 'signaler') { setMotif(''); setPrecision(''); }
    setFenetre(quoi);
  };

  /** Une action : message de réussite et liste rechargée, ou message du serveur dans la fenêtre */
  const executer = async (action: () => Promise<{ success: boolean; error?: string }>, reussite: string) => {
    setEnvoi(true);
    setErreur(null);
    try {
      const res = await action();
      if (!res.success) {
        setErreur(res.error || t('common.error', 'Erreur'));
        return false;
      }
      toast({ title: reussite });
      fermer();
      onChange?.();
      return true;
    } finally {
      setEnvoi(false);
    }
  };

  const enregistrer = () => {
    if (texte.trim().length < 3) {
      setErreur(t('comments.errorTooShort', 'Le commentaire doit contenir au moins 3 caractères'));
      return;
    }
    void executer(() => commentaireService.updateCommentaire(id, { contenu: texte.trim() }), t('comments.actions.modifie', 'Commentaire modifié'));
  };

  const signaler = () => {
    if (!motif) {
      setErreur(t('comments.actions.motifRequis', 'Choisissez un motif'));
      return;
    }
    void executer(
      () => commentaireService.signalerCommentaire(id, motif, precision.trim() || undefined),
      t('comments.reportSuccess', 'Signalement envoyé. Merci.')
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={t('common.moreOptions', 'Plus d\'options')}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {estAuteur && (
            <DropdownMenuItem onClick={() => ouvrir('modifier')}>
              <Pencil className="h-4 w-4 me-2" aria-hidden="true" />{t('comments.actions.modifier', 'Modifier')}
            </DropdownMenuItem>
          )}
          {!estAuteur && (
            <DropdownMenuItem onClick={() => ouvrir('signaler')}>
              <Flag className="h-4 w-4 me-2" aria-hidden="true" />{t('common.report', 'Signaler')}
            </DropdownMenuItem>
          )}
          {isAdmin && !estAuteur && (
            <DropdownMenuItem onClick={() => ouvrir('masquer')}>
              <EyeOff className="h-4 w-4 me-2" aria-hidden="true" />{t('comments.actions.masquer', 'Masquer')}
            </DropdownMenuItem>
          )}
          {(estAuteur || isAdmin) && (
            <DropdownMenuItem className="text-destructive" onClick={() => ouvrir('supprimer')}>
              <Trash2 className="h-4 w-4 me-2" aria-hidden="true" />{t('comments.actions.supprimer', 'Supprimer')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={fenetre === 'modifier'} onOpenChange={(o) => { if (!o) fermer(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('comments.actions.modifierTitre', 'Modifier votre commentaire')}</DialogTitle>
            <DialogDescription>{t('comments.actions.modifierAide', 'Le nouveau texte remplace l’ancien.')}</DialogDescription>
          </DialogHeader>
          <Textarea dir="auto" value={texte} onChange={(e) => setTexte(e.target.value)} maxLength={2000} className="min-h-[120px]"
            aria-label={t('comments.actions.modifierTitre', 'Modifier votre commentaire')} />
          <SaisieConserveeAvis visible={modificationRestauree} />
          {erreur && <p role="alert" className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" aria-hidden="true" />{erreur}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={fermer}>{t('common.cancel', 'Annuler')}</Button>
            <Button onClick={enregistrer} disabled={envoi}>{t('common.save', 'Enregistrer')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={fenetre === 'signaler'} onOpenChange={(o) => { if (!o) fermer(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('comments.actions.signalerTitre', 'Signaler ce commentaire')}</DialogTitle>
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
                  {MOTIFS_SIGNALEMENT.map(({ valeur, cle }) => (
                    <SelectItem key={valeur} value={valeur}>{t(cle, valeur)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`precision-${id}`}>{t('comments.actions.precision', 'Précision (facultatif)')}</Label>
              <Textarea id={`precision-${id}`} dir="auto" value={precision} onChange={(e) => setPrecision(e.target.value)} maxLength={1000} />
            </div>
            <SaisieConserveeAvis visible={signalementRestaure} />
          </div>
          {erreur && <p role="alert" className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" aria-hidden="true" />{erreur}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={fermer}>{t('common.cancel', 'Annuler')}</Button>
            <Button onClick={signaler} disabled={envoi}>{t('comments.actions.envoyer', 'Envoyer le signalement')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={fenetre === 'supprimer'}
        onOpenChange={(o) => { if (!o) fermer(); }}
        title={t('comments.actions.supprimerTitre', 'Supprimer ce commentaire ?')}
        description={erreur || t('comments.actions.supprimerAide', 'Il disparaîtra du site.')}
        confirmLabel={t('comments.actions.supprimer', 'Supprimer')}
        variant="destructive"
        onConfirm={async () => {
          const ok = await executer(() => (estAuteur
            ? commentaireService.deleteCommentaire(id)
            : commentaireService.moderateCommentaire(id, 'supprime')), t('comments.actions.supprime', 'Commentaire supprimé'));
          if (!ok) toast({ title: t('common.error', 'Erreur'), variant: 'destructive' });
        }}
      />

      <ConfirmDialog
        open={fenetre === 'masquer'}
        onOpenChange={(o) => { if (!o) fermer(); }}
        title={t('comments.actions.masquerTitre', 'Masquer ce commentaire ?')}
        description={erreur || t('comments.actions.masquerAide', 'Il ne sera plus visible sur le site, sans être effacé.')}
        confirmLabel={t('comments.actions.masquer', 'Masquer')}
        onConfirm={async () => {
          const ok = await executer(() => commentaireService.moderateCommentaire(id, 'rejete'), t('comments.actions.masque', 'Commentaire masqué'));
          if (!ok) toast({ title: t('common.error', 'Erreur'), variant: 'destructive' });
        }}
      />
    </>
  );
};

export default ActionsCommentaire;
