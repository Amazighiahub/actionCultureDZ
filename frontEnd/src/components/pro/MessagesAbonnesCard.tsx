/**
 * MessagesAbonnesCard — tableau de bord professionnel : messages déjà rédigés pour garder le lien avec
 * ses abonnés et les participants de ses événements. Un envoi par jour ; personnalisés côté serveur.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Send, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ConfirmDialog } from '@/components/shared';
import { httpClient } from '@/services/httpClient';
import { getDateLocale } from '@/hooks/useFormatDate';
import { getLocalizedText } from '@/utils/getLocalizedText';

type Modele = 'oeuvre' | 'evenement' | 'profil' | 'suivre';

interface Options {
  abonnes: number;
  participants: number;
  oeuvres: { id_oeuvre: number; titre: unknown }[];
  evenements: { id_evenement: number; nom_evenement: unknown }[];
  prochain_envoi: string | null;
}

export default function MessagesAbonnesCard() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [options, setOptions] = useState<Options | null>(null);
  const [modele, setModele] = useState<Modele>('oeuvre');
  const [contenu, setContenu] = useState('');
  const [confirmation, setConfirmation] = useState(false);
  const [enCours, setEnCours] = useState(false);

  const charger = () => httpClient.get<Options>('/professionnel/messages-abonnes')
    .then((res) => setOptions(res.data ?? null))
    .catch(() => setOptions(null));
  useEffect(() => {
    charger();
  }, []);

  if (!options) return null;

  const texte = (v: unknown) => getLocalizedText(v as never, i18n.language) || '';
  const destinataires = modele === 'suivre' ? options.participants : options.abonnes;
  const besoinContenu = modele === 'oeuvre' || modele === 'evenement';
  const possible = destinataires > 0 && !options.prochain_envoi && (!besoinContenu || !!contenu);
  const exemples: Record<Modele, string> = {
    oeuvre: t('messagesPro.exempleOeuvre', 'Bonjour Amina, [votre nom] vous invite à découvrir « [votre œuvre] ». Donnez votre avis en commentaire !'),
    evenement: t('messagesPro.exempleEvenement', 'Bonjour Amina, [votre nom] vous invite à l’événement « [votre événement] ». Inscrivez-vous pour y participer !'),
    profil: t('messagesPro.exempleProfil', 'Bonjour Amina, découvrez les nouveautés de [votre nom] sur son profil Tala DZ.'),
    suivre: t('messagesPro.exempleSuivre', 'Bonjour Amina, vous avez participé à un événement de [votre nom]. Abonnez-vous à son profil pour suivre ses nouveautés !'),
  };

  const envoyer = async () => {
    setConfirmation(false);
    setEnCours(true);
    try {
      const res = await httpClient.post<{ prevenus: number }>('/professionnel/messages-abonnes', {
        modele,
        ...(modele === 'oeuvre' ? { id_oeuvre: Number(contenu) } : {}),
        ...(modele === 'evenement' ? { id_evenement: Number(contenu) } : {}),
      });
      if (!res.success) throw new Error(res.error);
      toast({ title: t('messagesPro.envoye', { count: res.data?.prevenus ?? 0, defaultValue: 'Message envoyé à {{count}} personne(s)' }) });
      await charger();
    } catch (e) {
      toast({
        title: t('common.error', 'Erreur'),
        description: (e instanceof Error && e.message) || t('messagesPro.echec', 'Le message n’a pas pu être envoyé. Réessayez.'),
        variant: 'destructive',
      });
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" aria-hidden="true" />
          {t('messagesPro.titre', 'Gardez le lien avec votre public')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('messagesPro.compte', '{{abonnes}} abonné(s) · {{participants}} participant(s) à inviter', { abonnes: options.abonnes, participants: options.participants })}
        </p>

        <div className="space-y-2">
          <Label htmlFor="message-modele">{t('messagesPro.choisir', 'Message à envoyer')}</Label>
          <Select value={modele} onValueChange={(v) => { setModele(v as Modele); setContenu(''); }}>
            <SelectTrigger id="message-modele"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="oeuvre">{t('messagesPro.modeleOeuvre', 'J’ai ajouté une œuvre : donnez votre avis')}</SelectItem>
              <SelectItem value="evenement">{t('messagesPro.modeleEvenement', 'Je vous invite à mon événement')}</SelectItem>
              <SelectItem value="profil">{t('messagesPro.modeleProfil', 'Découvrez mes nouveautés')}</SelectItem>
              <SelectItem value="suivre">{t('messagesPro.modeleSuivre', 'Abonnez-vous à mon profil (participants)')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {besoinContenu && (
          <div className="space-y-2">
            <Label htmlFor="message-contenu">
              {modele === 'oeuvre' ? t('messagesPro.quelleOeuvre', 'Quelle œuvre ?') : t('messagesPro.quelEvenement', 'Quel événement ?')}
            </Label>
            <Select value={contenu} onValueChange={setContenu}>
              <SelectTrigger id="message-contenu"><SelectValue placeholder={t('messagesPro.selectionner', 'Choisir')} /></SelectTrigger>
              <SelectContent>
                {modele === 'oeuvre'
                  ? options.oeuvres.map((o) => <SelectItem key={o.id_oeuvre} value={String(o.id_oeuvre)}>{texte(o.titre)}</SelectItem>)
                  : options.evenements.map((e) => <SelectItem key={e.id_evenement} value={String(e.id_evenement)}>{texte(e.nom_evenement)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="rounded-md bg-muted p-3 text-sm">
          <p className="font-medium mb-1">{t('messagesPro.apercu', 'Exemple de ce qu’ils recevront')}</p>
          <p>{exemples[modele]}</p>
        </div>

        {options.prochain_envoi && (
          <p className="text-sm text-muted-foreground" role="status">
            {t('messagesPro.attente', 'Un message par jour : vous pourrez en envoyer un autre le {{date}}.', { date: new Date(options.prochain_envoi).toLocaleString(getDateLocale(i18n.language)) })}
          </p>
        )}
        {!options.prochain_envoi && destinataires === 0 && (
          <p className="text-sm text-muted-foreground">
            {modele === 'suivre'
              ? t('messagesPro.aucunParticipant', 'Aucun participant à inviter pour le moment.')
              : t('messagesPro.aucunAbonne', 'Vous n’avez pas encore d’abonnés. Partagez le lien de votre profil pour en avoir.')}
          </p>
        )}

        <Button className="w-full sm:w-auto" disabled={!possible || enCours} onClick={() => setConfirmation(true)}>
          {enCours ? <Loader2 className="h-4 w-4 me-2 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4 me-2" aria-hidden="true" />}
          {t('messagesPro.envoyer', { count: destinataires, defaultValue: 'Envoyer à {{count}} personne(s)' })}
        </Button>

        <ConfirmDialog
          open={confirmation}
          onOpenChange={setConfirmation}
          title={t('messagesPro.confirmer', { count: destinataires, defaultValue: 'Envoyer ce message à {{count}} personne(s) ?' })}
          description={t('messagesPro.confirmerTexte', 'Vous pourrez envoyer un seul message par jour.')}
          confirmLabel={t('messagesPro.envoyerCourt', 'Envoyer')}
          onConfirm={envoyer}
        />
      </CardContent>
    </Card>
  );
}
