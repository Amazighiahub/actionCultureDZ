/**
 * Avis des visiteurs sur un service : note moyenne (calculée par le serveur), avis publiés,
 * formulaire (un avis par membre, pas sur son propre service) et réponse du professionnel.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MessageCircle, Reply, Send, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import StarRating from '@/components/shared/StarRating';
import { useAuth } from '@/hooks/useAuth';
import { useLocalizedDate } from '@/hooks/useLocalizedDate';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { commentaireService, type AvisService } from '@/services/commentaire.service';

const auteur = (a: AvisService) => a.User ? `${getLocalizedText(a.User.prenom)} ${getLocalizedText(a.User.nom)}`.trim() : '';

// Saisie d'un avis ou d'une réponse ; renvoie le message d'erreur du serveur s'il refuse
const Saisie: React.FC<{
  id: string; avecNote: boolean; libelle: string; onEnvoyer: (contenu: string, note?: number) => Promise<string | null>; onAnnuler?: () => void;
}> = ({ id, avecNote, libelle, onEnvoyer, onAnnuler }) => {
  const { t } = useTranslation();
  const [contenu, setContenu] = useState('');
  const [note, setNote] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contenu.trim().length < 3) {
      setErreur(t('comments.errorTooShort', 'Le commentaire doit contenir au moins 3 caractères'));
      return;
    }
    setEnvoi(true);
    const refus = await onEnvoyer(contenu.trim(), avecNote && note ? note : undefined);
    setEnvoi(false);
    setErreur(refus);
    if (!refus) { setContenu(''); setNote(0); }
  };

  return (
    <form onSubmit={envoyer} className="space-y-3">
      {avecNote && (
        <div>
          <p className="text-sm font-medium mb-1">{t('comments.yourRating', 'Votre note')} ({t('common.optional', 'optionnel')})</p>
          <StarRating value={note} onChange={setNote} size="lg" />
        </div>
      )}
      <Textarea id={id} value={contenu} onChange={(e) => setContenu(e.target.value)} maxLength={2000}
        placeholder={libelle} className="min-h-[90px]" aria-label={libelle}
        aria-invalid={!!erreur} aria-describedby={erreur ? `${id}-erreur` : undefined} />
      {erreur && (
        <p id={`${id}-erreur`} role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />{erreur}
        </p>
      )}
      <div className="flex justify-end gap-2">
        {onAnnuler && <Button type="button" variant="ghost" onClick={onAnnuler}>{t('common.cancel', 'Annuler')}</Button>}
        <Button type="submit" disabled={envoi}>
          <Send className="h-4 w-4 me-2" aria-hidden="true" />{t('comments.submit', 'Envoyer')}
        </Button>
      </div>
    </form>
  );
};

const ServiceAvis: React.FC<{ serviceId: number; proprietaireId?: number | null }> = ({ serviceId, proprietaireId }) => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { formatDate } = useLocalizedDate();
  const { formatNumber } = useLocalizedNumber();
  const queryClient = useQueryClient();
  const [reponseA, setReponseA] = useState<number | null>(null);

  const cle = ['service-avis', serviceId];
  const { data } = useQuery({ queryKey: cle, queryFn: () => commentaireService.getAvisService(serviceId) });
  const avis = data?.commentaires || [];
  const note = data?.note || { moyenne: 0, nombre: 0 };

  const estProprietaire = !!user && !!proprietaireId && Number(user.id_user) === Number(proprietaireId);
  const dejaDonne = !!user && avis.some(a => Number(a.id_user) === Number(user.id_user));

  const publier = async (contenu: string, noteDonnee?: number, parent?: number) => {
    try {
      await commentaireService.createAvisService(serviceId, {
        contenu, ...(noteDonnee ? { note_qualite: noteDonnee } : {}), ...(parent ? { commentaire_parent_id: parent } : {})
      });
      setReponseA(null);
      await queryClient.invalidateQueries({ queryKey: cle });
      return null;
    } catch (e) {
      return e instanceof Error && e.message ? e.message : t('comments.errorSubmit', 'Erreur lors de l\'envoi');
    }
  };

  return (
    <section className="mt-10" aria-labelledby="avis-titre">
      <h2 id="avis-titre" className="text-2xl font-bold font-serif mb-4 flex items-center gap-2">
        <MessageCircle className="h-6 w-6 text-primary" aria-hidden="true" />
        {t('servicesVisiteurs.avis.titre', 'Avis des visiteurs')}
      </h2>

      {note.nombre > 0 && (
        <div className="flex items-center gap-3 mb-6">
          <span className="text-4xl font-bold">{formatNumber(note.moyenne, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
          <div>
            <StarRating value={Math.round(note.moyenne)} readonly size="md" />
            <p className="text-sm text-muted-foreground">{t('servicesVisiteurs.avis.nombreNotes', { count: note.nombre, defaultValue: '{{count}} note(s)' })}</p>
          </div>
        </div>
      )}

      {/* Formulaire : connecté, pas son propre service, pas encore d'avis */}
      <Card className="mb-6">
        <CardContent className="p-5">
          {!isAuthenticated ? (
            <p className="text-sm text-muted-foreground">
              {t('servicesVisiteurs.avis.connexion', 'Connectez-vous pour donner votre avis.')}{' '}
              <Link to="/auth" className="font-medium text-primary hover:underline underline-offset-4">{t('auth.login.submit', 'Se connecter')}</Link>
            </p>
          ) : estProprietaire ? (
            <p className="text-sm text-muted-foreground">{t('servicesVisiteurs.avis.proprietaire', 'C’est votre service : vous pouvez répondre aux avis, mais pas le noter.')}</p>
          ) : dejaDonne ? (
            <p className="text-sm text-muted-foreground">{t('servicesVisiteurs.avis.dejaDonne', 'Merci ! Vous avez déjà donné votre avis sur ce service.')}</p>
          ) : (
            <Saisie id="avis-service" avecNote libelle={t('servicesVisiteurs.avis.placeholder', 'Racontez votre visite : accueil, qualité, prix…')}
              onEnvoyer={(contenu, n) => publier(contenu, n)} />
          )}
        </CardContent>
      </Card>

      {avis.length === 0 ? (
        <p className="text-muted-foreground">{t('servicesVisiteurs.avis.aucun', 'Aucun avis pour l’instant. Soyez le premier !')}</p>
      ) : (
        <ul className="space-y-5">
          {avis.map(a => (
            <li key={a.id_commentaire} className="border-b pb-5 last:border-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium">{auteur(a) || t('common.anonymous', 'Anonyme')}</span>
                {Number(a.note_qualite) > 0 && <StarRating value={Number(a.note_qualite)} readonly size="sm" />}
                <span className="text-sm text-muted-foreground">{formatDate(a.date_creation, { relative: true })}</span>
              </div>
              <p className="mt-2 whitespace-pre-line" dir="auto">{a.contenu}</p>

              {(a.Reponses || []).map(r => (
                <div key={r.id_commentaire} className="mt-3 ms-4 ps-4 border-s-2 border-primary/30">
                  <p className="text-sm font-medium">
                    {Number(r.id_user) === Number(proprietaireId)
                      ? t('servicesVisiteurs.avis.reponsePro', 'Réponse du professionnel')
                      : auteur(r)}
                  </p>
                  <p className="text-sm mt-1 whitespace-pre-line" dir="auto">{r.contenu}</p>
                </div>
              ))}

              {/* Le professionnel répond une fois à chaque avis */}
              {estProprietaire && !(a.Reponses || []).some(r => Number(r.id_user) === Number(proprietaireId)) && (
                reponseA === a.id_commentaire ? (
                  <div className="mt-3 ms-4">
                    <Saisie id={`reponse-${a.id_commentaire}`} avecNote={false}
                      libelle={t('servicesVisiteurs.avis.placeholderReponse', 'Votre réponse à ce visiteur')}
                      onEnvoyer={(contenu) => publier(contenu, undefined, a.id_commentaire)} onAnnuler={() => setReponseA(null)} />
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" className="mt-2 -ms-2" onClick={() => setReponseA(a.id_commentaire)}>
                    <Reply className="h-4 w-4 me-1 rtl:-scale-x-100" aria-hidden="true" />{t('common.reply', 'Répondre')}
                  </Button>
                )
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default ServiceAvis;
