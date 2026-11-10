/**
 * Commentaires d'une œuvre chargés à part, pour une page qui n'utilise pas useOeuvreDetails
 * (fiche d'artisanat : un produit artisanal est une œuvre). Même affichage que la fiche d'une œuvre.
 */
import { messageNoteIgnoree } from '@/utils/noteIgnoree';
import { echecCommentaire } from '@/utils/envoiCommentaire';
import type { ResultatEnvoi } from '@/utils/erreurServeur';
import React, { Suspense } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useInviterConnexion } from '@/hooks/useInviterConnexion';
import { commentaireService } from '@/services/commentaire.service';

const OeuvreComments = React.lazy(() => import('@/pages/oeuvreDetail/oeuvre/OeuvreComments'));

export default function CommentairesOeuvre({ oeuvreId }: { oeuvreId: number }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const inviterConnexion = useInviterConnexion();
  const queryClient = useQueryClient();
  const cle = ['oeuvre-comments', oeuvreId];

  const { data } = useQuery({
    queryKey: cle,
    queryFn: async () => {
      const reponse = await commentaireService.getCommentairesOeuvre(oeuvreId);
      return reponse.success && reponse.data ? (reponse.data.items || reponse.data || []) : [];
    },
    staleTime: 60 * 1000,
    retry: false,
  });

  const ajout = useMutation({
    mutationFn: async ({ contenu, note }: { contenu: string; note?: number }) => {
      const reponse = await commentaireService.createCommentaireOeuvre(oeuvreId, { contenu, ...(note ? { note_qualite: note } : {}) });
      if (!reponse.success) throw reponse;
      return reponse.data;
    },
    onSuccess: (donnees) => {
      toast({ title: t('comments.added', 'Commentaire ajouté'), description: messageNoteIgnoree(donnees, t) || t('comments.addedDesc', 'Votre avis a été publié') });
      queryClient.invalidateQueries({ queryKey: cle });
    },
    // Échec : message sous la case (plus de bandeau en double, audit V11 FRM-14)
  });

  const ajouter = async (contenu: string, note?: number): Promise<ResultatEnvoi> => {
    if (!isAuthenticated) {
      inviterConnexion(t('auth.loginToComment', 'Connectez-vous pour commenter'));
      return { ok: false };
    }
    try {
      await ajout.mutateAsync({ contenu, note });
      return { ok: true };
    } catch (err) {
      return echecCommentaire(err, t);
    }
  };

  return (
    <Suspense fallback={null}>
      <OeuvreComments comments={Array.isArray(data) ? data : []} onAddComment={ajouter} oeuvreId={oeuvreId}
        onChange={() => queryClient.invalidateQueries({ queryKey: cle })} />
    </Suspense>
  );
}
