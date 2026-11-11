/**
 * « C'est mon organisation » : sur la page d'une organisation sans responsable, un professionnel
 * demande à la gérer ; l'équipe Tala DZ vérifie. Affiche aussi l'état de sa demande.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { messageErreurServeur } from '@/utils/erreurServeur';
import { useQueryClient } from '@tanstack/react-query';
import { KeyRound, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { httpClient } from '@/services/httpClient';
import { SaisieConserveeAvis, useSaisieConservee } from '@/hooks/useSaisieConservee';

const DemandeResponsable: React.FC<{
  idOrganisation: number;
  maisonEdition: boolean;
  maDemande?: { statut: string; motif?: string | null } | null;
}> = ({ idOrganisation, maisonEdition, maDemande }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [ouvert, setOuvert] = useState(false);
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // Session expirée pendant la saisie : message conservé, fenêtre rouverte au retour (audit V11 FRM-23).
  // Avant le « return » anticipé plus bas (règle des hooks).
  const { restauree, oublier } = useSaisieConservee({
    cle: idOrganisation ? `revendication:${idOrganisation}` : null,
    valeur: { message },
    restaurer: (v) => { setMessage(v.message || ''); setErreur(null); setOuvert(true); },
    actif: ouvert && !!message.trim(),
  });
  const fermer = () => { setOuvert(false); oublier(); };
  const libelle = maisonEdition
    ? t('organisations.revendication.boutonEdition', 'C’est ma maison d’édition')
    : t('organisations.revendication.bouton', 'C’est mon organisation');

  const envoyer = async () => {
    setEnvoi(true); setErreur(null);
    try {
      const res = await httpClient.post<unknown>(`/organisations/${idOrganisation}/revendication`, { message });
      if (!res.success) throw new Error(messageErreurServeur(res, t('common.errorOccurred', 'Une erreur est survenue')));
      fermer();
      toast({ title: t('organisations.revendication.envoyee', 'Demande envoyée : l’équipe Tala DZ va la vérifier') });
      await queryClient.invalidateQueries({ queryKey: ['organisation-vitrine', idOrganisation] });
    } catch (e) {
      // Refus du serveur (message trop long…) : sa raison précise, détail des champs compris
      setErreur(messageErreurServeur(e, t('common.errorOccurred', 'Une erreur est survenue')));
    } finally {
      setEnvoi(false);
    }
  };

  if (maDemande?.statut === 'en_attente') {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 flex items-center gap-3 text-sm">
          <Clock className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
          {t('organisations.revendication.enCours', 'Votre demande pour gérer cette page est en cours de vérification par l’équipe Tala DZ.')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <KeyRound className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
        <div className="flex-1 text-sm">
          <p className="font-medium">{t('organisations.revendication.titre', 'Personne ne gère encore cette page.')}</p>
          <p className="text-muted-foreground">
            {maDemande?.statut === 'refusee'
              ? `${t('organisations.revendication.refusee', 'Votre précédente demande n’a pas été acceptée')}${maDemande.motif ? ` : ${maDemande.motif}` : ''}`
              : t('organisations.revendication.aide', 'Vous en êtes responsable ? Demandez à la gérer : vous pourrez modifier la page et ajouter vos contenus.')}
          </p>
        </div>
        {isAuthenticated ? (
          <Button onClick={() => { setMessage(''); setErreur(null); setOuvert(true); }}>{libelle}</Button>
        ) : (
          <Button asChild variant="outline"><Link to="/auth">{t('organisations.revendication.connexion', 'Se connecter pour la gérer')}</Link></Button>
        )}
      </CardContent>

      <Dialog open={ouvert} onOpenChange={(o) => (o ? setOuvert(true) : fermer())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{libelle}</DialogTitle>
            <DialogDescription>
              {t('organisations.revendication.verification', 'L’équipe Tala DZ vérifie que vous représentez bien cette organisation, puis vous en devenez responsable.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="message-revendication">{t('organisations.revendication.message', 'Qui êtes-vous pour cette organisation ? (facultatif)')}</Label>
            <Textarea id="message-revendication" rows={4} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder={t('organisations.revendication.exemple', 'Ex. : je suis le directeur ; contact : 0550 00 00 00')} />
            <SaisieConserveeAvis visible={restauree} />
            {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={fermer}>{t('common.cancel', 'Annuler')}</Button>
            <Button onClick={envoyer} disabled={envoi}>{t('organisations.revendication.envoyer', 'Envoyer la demande')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default DemandeResponsable;
