/**
 * EventComments - Commentaires et avis de l'événement
 * Liste des commentaires avec formulaire d'ajout
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Textarea } from '@/components/UI/textarea';
import { Badge } from '@/components/UI/badge';
import { Separator } from '@/components/UI/separator';
import {
  MessageCircle, Star, ThumbsUp, Reply, MoreVertical,
  Send, AlertCircle, User, Clock
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/UI/dropdown-menu';
import { LazyImage, EmptyState } from '@/components/shared';
import { useAuth } from '@/hooks/useAuth';
import { useLocalizedDate } from '@/hooks/useLocalizedDate';
import { useTranslateData } from '@/hooks/useTranslateData';
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
  user?: {
    id: number;
    nom: string;
    prenom: string;
    photo_url?: string;
  };
  likes_count?: number;
  is_liked?: boolean;
  replies?: Comment[];
}

interface EventCommentsProps {
  comments: Comment[];
  onAddComment: (content: string, rating?: number) => Promise<boolean>;
  eventId: number;
}

// Composant étoiles de notation
interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const StarRating: React.FC<StarRatingProps> = ({ 
  value, 
  onChange, 
  readonly = false,
  size = 'md'
}) => {
  const [hoverValue, setHoverValue] = useState(0);
  
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

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
          className={cn(
            "transition-colors",
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          )}
        >
          <Star
            className={cn(
              sizeClasses[size],
              "transition-colors",
              (hoverValue || value) >= star
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            )}
          />
        </button>
      ))}
    </div>
  );
};

// Composant pour un commentaire individuel
interface CommentItemProps {
  comment: Comment;
  onLike?: (id: number) => void;
  onReply?: (id: number) => void;
  onReport?: (id: number) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onLike,
  onReply,
  onReport
}) => {
  const { t } = useTranslation();
  const { formatDate } = useLocalizedDate();
  const { isAuthenticated } = useAuth();
  const { td } = useTranslateData();

  const user = comment.User || comment.user;
  const commentId = comment.id_commentaire || comment.id;

  return (
    <div className="flex gap-4">
      {/* Avatar */}
      <LazyImage
        src={user?.photo_url || '/images/default-avatar.png'}
        alt={user ? `${td(user.prenom)} ${td(user.nom)}` : 'Utilisateur'}
        className="w-10 h-10 rounded-full flex-shrink-0"
        aspectRatio="square"
        fallback="/images/default-avatar.png"
      />

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">
                {user ? `${td(user.prenom)} ${td(user.nom)}` : t('common.anonymous', 'Anonyme')}
              </span>
              
              {comment.note && (
                <StarRating value={comment.note} readonly size="sm" />
              )}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatDate(comment.date_creation, { relative: true })}</span>
            </div>
          </div>

          {/* Menu actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('common.moreOptions', 'Plus d\'options')}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onReport && (
                <DropdownMenuItem onClick={() => onReport(commentId!)}>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {t('common.report', 'Signaler')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Texte du commentaire */}
        <p className="mt-2 text-sm whitespace-pre-line">
          {td(comment.contenu)}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-4 mt-3">
          {onLike && isAuthenticated && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-2",
                comment.is_liked && "text-primary"
              )}
              onClick={() => onLike(commentId!)}
            >
              <ThumbsUp className={cn(
                "h-4 w-4 mr-1",
                comment.is_liked && "fill-current"
              )} />
              {comment.likes_count || 0}
            </Button>
          )}

          {onReply && isAuthenticated && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => onReply(commentId!)}
            >
              <Reply className="h-4 w-4 mr-1" />
              {t('common.reply', 'Répondre')}
            </Button>
          )}
        </div>

        {/* Réponses imbriquées */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4 pl-4 border-l-2 border-muted space-y-4">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id_commentaire || reply.id}
                comment={reply}
                onLike={onLike}
                onReport={onReport}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Composant principal
const EventComments: React.FC<EventCommentsProps> = ({
  comments,
  onAddComment,
  eventId
}) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  
  const [newComment, setNewComment] = useState('');
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculer la moyenne des notes
  const averageRating = comments.length > 0
    ? comments.reduce((acc, c) => acc + (c.note || 0), 0) / comments.filter(c => c.note).length
    : 0;

  // Distribution des notes
  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: comments.filter(c => c.note === star).length,
    percentage: comments.length > 0 
      ? (comments.filter(c => c.note === star).length / comments.length) * 100
      : 0
  }));

  // Soumettre un commentaire
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
        setError(t('comments.errorSubmit', 'Erreur lors de l\'envoi du commentaire'));
      }
    } catch (err) {
      setError(t('comments.errorSubmit', 'Erreur lors de l\'envoi du commentaire'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Résumé des avis */}
      {comments.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Note moyenne */}
              <div className="text-center md:border-r md:pr-6">
                <div className="text-4xl font-bold">
                  {averageRating.toFixed(1)}
                </div>
                <StarRating value={Math.round(averageRating)} readonly size="lg" />
                <p className="text-sm text-muted-foreground mt-1">
                  {comments.length} {t('comments.reviews', 'avis')}
                </p>
              </div>

              {/* Distribution */}
              <div className="flex-1 space-y-2">
                {ratingDistribution.map(({ star, count, percentage }) => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-sm w-8">{star} ★</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-yellow-400 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulaire d'ajout */}
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
              {/* Notation */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t('comments.yourRating', 'Votre note')} ({t('common.optional', 'optionnel')})
                </label>
                <StarRating value={rating} onChange={setRating} size="lg" />
              </div>

              {/* Textarea */}
              <div>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={t('comments.placeholder', 'Partagez votre expérience...')}
                  className="min-h-[100px]"
                />
              </div>

              {/* Erreur */}
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {/* Bouton */}
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="animate-spin mr-2">⏳</span>
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
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

export default EventComments;
