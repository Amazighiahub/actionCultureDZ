/**
 * OeuvreComments - Commentaires et avis de l'œuvre
 * Similaire à EventComments mais adapté aux œuvres
 */
import { noteMoyenne } from '@/utils/noteMoyenne';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  MessageCircle, Star, Send, AlertCircle, User, Clock
} from 'lucide-react';
import { LazyImage, EmptyState } from '@/components/shared';
import { useAuth } from '@/hooks/useAuth';
import { useLocalizedDate } from '@/hooks/useLocalizedDate';
import type { ResultatEnvoi } from '@/utils/erreurServeur';
import { SaisieConserveeAvis, useSaisieConservee } from '@/hooks/useSaisieConservee';
import { cn } from '@/lib/Utils';
import { getLocalizedText } from '@/utils/getLocalizedText';

interface Comment {
  id_commentaire?: number;
  id?: number;
  contenu: string;
  note?: number;
  date_creation: string;
  User?: {
    id_user: number;
    nom: string;
    prenom: string;
    photo_url?: string;
  };
}

interface OeuvreCommentsProps {
  comments: Comment[];
  onAddComment: (content: string, rating?: number) => Promise<ResultatEnvoi>;
  oeuvreId: number;
  /** Après une modification, suppression ou un masquage : recharger la liste */
  onChange?: () => void;
}

// StarRating importé depuis composant partagé
import StarRating from '@/components/shared/StarRating';
import ActionsCommentaire from '@/components/shared/ActionsCommentaire';

// Item commentaire
/** Note d'un avis (le serveur la renvoie dans note_qualite) ; 0 si aucune */
const noteOf = (c: { note?: number | null; note_qualite?: number | null }): number =>
  Number(c.note_qualite ?? c.note) || 0;

const CommentItem: React.FC<{ comment: Comment; onChange?: () => void }> = ({ comment, onChange }) => {
  const { formatDate } = useLocalizedDate();
  const user = comment.User;

  return (
    <div className="flex gap-4">
      <LazyImage
        src={user?.photo_url || '/images/default-avatar.svg'}
        alt={user ? `${getLocalizedText(user.prenom)} ${getLocalizedText(user.nom)}` : 'Utilisateur'}
        className="w-10 h-10 rounded-full flex-shrink-0"
        fallback="/images/default-avatar.svg"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">
                {user ? `${getLocalizedText(user.prenom)} ${getLocalizedText(user.nom)}` : 'Anonyme'}
              </span>
              {noteOf(comment) > 0 && <StarRating value={noteOf(comment)} readonly size="sm" />}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatDate(comment.date_creation, { relative: true })}</span>
            </div>
          </div>
          <ActionsCommentaire commentaire={comment} onChange={onChange} />
        </div>
        <p className="mt-2 text-sm whitespace-pre-line">{comment.contenu}</p>
      </div>
    </div>
  );
};

// Composant principal
const OeuvreComments: React.FC<OeuvreCommentsProps> = ({ comments, onAddComment, oeuvreId, onChange }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  const [newComment, setNewComment] = useState('');
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Texte et note conservés si la session expire pendant la saisie (audit V11 FRM-23)
  const { restauree, oublier } = useSaisieConservee({
    cle: oeuvreId ? `avis-oeuvre:${oeuvreId}` : null,
    valeur: { texte: newComment, note: rating },
    restaurer: (v) => { setNewComment(v.texte || ''); setRating(v.note || 0); },
    actif: !!newComment.trim(),
  });

  // Moyenne des notes
  // Une note par personne (les notes en double ne comptent qu'une fois)
  const { moyenne: averageRating, nombre: nombreNotes, repartition } = noteMoyenne(comments);

  // Distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: repartition[star] || 0,
    percentage: nombreNotes > 0
      ? ((repartition[star] || 0) / nombreNotes) * 100
      : 0
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) {
      setError(t('comments.errorEmpty', 'Veuillez écrire un commentaire'));
      setTimeout(() => document.getElementById('oeuvre-comment')?.focus(), 0);
      return;
    }

    if (newComment.trim().length < 3) {
      setError(t('comments.errorTooShort', 'Le commentaire doit contenir au moins 3 caractères'));
      setTimeout(() => document.getElementById('oeuvre-comment')?.focus(), 0);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Réussite : un seul bandeau, celui de l'envoi (avant : deux). Échec : la vraie raison sous la case.
      const resultat = await onAddComment(newComment.trim(), rating || undefined);
      if (resultat.ok) {
        setNewComment('');
        setRating(0);
        oublier();
      } else if (resultat.erreur) {
        setError(resultat.erreur);
      }
    } catch {
      setError(t('comments.nonEnvoye', 'Votre commentaire n’est pas parti. Il est toujours dans la case : réessayez.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Résumé des notes */}
      {nombreNotes > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="text-center md:border-e md:pe-6">
                <div className="text-4xl font-bold">{averageRating.toFixed(1)}</div>
                <StarRating value={Math.round(averageRating)} readonly size="lg" />
                <p className="text-sm text-muted-foreground mt-1">
                  {nombreNotes} {t('comments.reviews', 'avis')}
                </p>
              </div>
              <div className="flex-1 space-y-2">
                {ratingDistribution.map(({ star, count, percentage }) => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-sm w-8">{star} ★</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400" style={{ width: `${percentage}%` }} />
                    </div>
                    <span className="text-sm text-muted-foreground w-8">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulaire */}
      {isAuthenticated ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              {t('comments.addComment', 'Ajouter un avis')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t('comments.yourRating', 'Votre note')} ({t('common.optional', 'optionnel')})
                </label>
                <StarRating value={rating} onChange={setRating} size="lg" />
              </div>
              <Textarea
                id="oeuvre-comment"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={t('comments.placeholder', 'Partagez votre avis...')}
                className="min-h-[100px]"
                maxLength={2000}
                aria-invalid={!!error}
                aria-describedby={error ? 'oeuvre-comment-error' : undefined}
              />
              <p className="text-xs text-muted-foreground text-end mt-1">
                {newComment.length}/2000
              </p>
              <SaisieConserveeAvis visible={restauree} />
              {error && (
                <div id="oeuvre-comment-error" role="alert" className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  <Send className="h-4 w-4 me-2" />
                  {t('comments.submit', 'Publier')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {t('comments.loginRequired', 'Connectez-vous pour laisser un avis')}
            </p>
            <Button asChild>
              <a href="/auth">{t('auth.login.submit', 'Se connecter')}</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Liste des commentaires */}
      {comments.length === 0 ? (
        <EmptyState
          type="documents"
          title={t('comments.empty', 'Aucun avis pour le moment')}
          description={t('comments.emptyDesc', 'Soyez le premier à donner votre avis !')}
        />
      ) : (
        <div className="space-y-6">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {comments.length} {t('comments.reviews', 'avis')}
          </h3>
          <div className="space-y-6">
            {comments.map((comment, index) => (
              <React.Fragment key={comment.id_commentaire || comment.id || index}>
                <CommentItem comment={comment} onChange={onChange} />
                {index < comments.length - 1 && <Separator />}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OeuvreComments;
