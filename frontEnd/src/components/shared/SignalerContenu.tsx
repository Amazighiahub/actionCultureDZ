/**
 * « Signaler une erreur » sur une fiche (œuvre, événement, artisanat), audit V11 OUT-2 : une date
 * fausse, une photo prise sans droit ou un faux contenu remonte à l'équipe de modération.
 * Personne non connectée : envoyée vers la connexion, puis revient sur la fiche. L'auteur de la fiche
 * ne voit pas le bouton (il la modifie lui-même).
 */
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import DialogueSignalement from '@/components/shared/DialogueSignalement';
import { signalerContenu, type TypeContenuSignalable } from '@/services/signalement.service';

interface Props {
  type: Exclude<TypeContenuSignalable, 'commentaire'>;
  id: number;
  /** Auteur de la fiche : il ne se signale pas lui-même */
  idAuteur?: number | null;
  className?: string;
}

export default function SignalerContenu({ type, id, idAuteur, className }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [ouvert, setOuvert] = useState(false);

  if (isAuthenticated && user && idAuteur != null && Number(idAuteur) === Number(user.id_user)) return null;

  const ouvrir = () => {
    if (!isAuthenticated) {
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setOuvert(true);
  };

  return (
    <>
      <Button type="button" variant="ghost" size="sm" className={className ?? 'text-muted-foreground'} onClick={ouvrir}>
        <Flag className="h-4 w-4 me-2" aria-hidden="true" />
        {t('signalement.ficheBouton', 'Signaler une erreur')}
      </Button>
      {isAuthenticated && (
        <DialogueSignalement
          open={ouvert}
          onClose={() => setOuvert(false)}
          onRouvrir={() => setOuvert(true)}
          cle={`${type}:${id}:signaler`}
          titre={t('signalement.ficheTitre', 'Signaler une erreur sur cette fiche')}
          envoyer={(motif, precision) => signalerContenu(type, id, motif, precision)}
          onEnvoye={() => {
            setOuvert(false);
            toast({ title: t('comments.reportSuccess', 'Signalement envoyé. Merci.') });
          }}
        />
      )}
    </>
  );
}
