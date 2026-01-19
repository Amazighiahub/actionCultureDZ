/**
 * OeuvreComments - Commentaires et avis de l'œuvre
 * Similaire à EventComments mais adapté aux œuvres
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Textarea } from '@/components/UI/textarea';
import { Badge } from '@/components/UI/badge';
import { Separator } from '@/components/UI/separator';
import {
  MessageCircle, Star, ThumbsUp, Send, AlertCircle, User, Clock
} from 'lucide-react';
import { LazyImage, EmptyState } from '@/components/shared';
import { useAuth } from '@/hooks/useAuth';
import { useLocalizedDate } from '@/hooks/useLocalizedDate';
import { cn } from '@/lib/utils';

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
  onAddComment: (content: string, rating?: number) => Promise<boolean>;
  oeuvreId: number;
}

// Composant étoiles
const StarRating: React.FC<{
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}> = ({ value, onChange, readonly = false, size = 'md' }) => {
  const [hoverValue, setHoverValue] = useState(0);
  const sizeClasses = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6' };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHoverValue(star)}
          onMouseLeave={() => !readonly && setHoverValue(0)}
          className={cn("transition-colors", readonly ? "cursor-default" : "cursor-pointer hover:scale-110")}
        >
          <Star
            className={cn(
              sizeClasses[size],
              (hoverValue || value) >= star ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            )}
          />
        </button>
      ))}
    </div>
  );
};

// Item commentaire
const CommentItem: React.FC<{ comment: Comment }> = ({ comment }) => {
  const { formatDate } = useLocalizedDate();
  const user = comment.User;

  return (
    <div className="flex gap-4">
      <LazyImage
        src={user?.photo_url || '/images/default-avatar.png'}
        alt={user ? `${user.prenom} ${user.nom}` : 'Utilisateur'}
        className="w-10 h-10 rounded-full flex-shrink-0"
        fallback="/images/default-avatar.png"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">
                {user ? `${user.prenom} ${user.nom}` : 'Anonyme'}
              </span>
              {comment.note && <StarRating value={comment.note} readonly size="sm" />}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatDate(comment.date_creation, { relative: true })}</span>
            </div>
          </div>
        </div>
        <p className="mt-2 text-sm whitespace-pre-line">{comment.contenu}</p>
      </div>
    </div>
  );
};

// Composant principal
const OeuvreComments: React.FC<OeuvreCommentsProps> = ({ comments, onAddComment, oeuvreId }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  
  const [newComment, setNewComment] = useState('');
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Moyenne des notes
  const commentsWithNote = comments.filter(c => c.note);
  const averageRating = commentsWithNote.length > 0
    ? commentsWithNote.reduce((acc, c) => acc + (c.note || 0), 0) / commentsWithNote.length
    : 0;

  // Distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: comments.filter(c => c.note === star).length,
    percentage: commentsWithNote.length > 0 
      ? (comments.filter(c => c.note === star).length / commentsWithNote.length) * 100
      : 0
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) {
      setError(t('comments.errorEmpty', 'Veuillez écrire un commentaire'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const success = await onAddComment(newComment.trim(), rating || undefined);
      if (success) {
        setNewComment('');
        setRating(0);
      } else {
        setError(t('comments.errorSubmit', 'Erreur lors de l\'envoi'));
      }
    } catch {
      setError(t('comments.errorSubmit', 'Erreur lors de l\'envoi'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Résumé des notes */}
      {commentsWithNote.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="text-center md:border-r md:pr-6">
                <div className="text-4xl font-bold">{averageRating.toFixed(1)}</div>
                <StarRating value={Math.round(averageRating)} readonly size="lg" />
                <p className="text-sm text-muted-foreground mt-1">
                  {commentsWithNote.length} {t('comments.reviews', 'avis')}
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t('comments.yourRating', 'Votre note')} ({t('common.optional', 'optionnel')})
                </label>
                <StarRating value={rating} onChange={setRating} size="lg" />
              </div>
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={t('comments.placeholder', 'Partagez votre avis...')}
                className="min-h-[100px]"
              />
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  <Send className="h-4 w-4 mr-2" />
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
                <CommentItem comment={comment} />
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
