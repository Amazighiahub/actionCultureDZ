/**
 * BoutonContacterPro — sur la page d'un professionnel (audit V11 UX-26, choix de la responsable).
 * Le message part par e-mail au professionnel, qui répond depuis sa messagerie ; son adresse n'est
 * pas montrée. Une personne non connectée est envoyée vers la connexion, puis revient sur la page.
 * Le texte en cours est gardé si la session expire (useSaisieConservee), comme les autres formulaires.
 */
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, Mail, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { usePermissionsContext } from '@/providers/PermissionsProvider';
import { httpClient } from '@/services/httpClient';
import AntiRobot, { useAntiRobot } from '@/components/shared/AntiRobot';
import { useSaisieConservee } from '@/hooks/useSaisieConservee';
import { messageErreurServeur } from '@/utils/erreurServeur';

const MESSAGE_MIN = 10;
const MESSAGE_MAX = 2000;

export default function BoutonContacterPro({ idProfessionnel, nom }: { idProfessionnel: number; nom: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = usePermissionsContext();
  const antiRobot = useAntiRobot();
  const [ouvert, setOuvert] = useState(false);
  const [sujet, setSujet] = useState('');
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const { oublier } = useSaisieConservee({
    cle: `contact-pro:${idProfessionnel}`,
    valeur: { sujet, message },
    restaurer: (v) => { setSujet(v.sujet || ''); setMessage(v.message || ''); if (v.message) setOuvert(true); },
    actif: !!message.trim()
  });

  const ouvrir = () => {
    if (!isAuthenticated) {
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setOuvert(true);
  };

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    const texte = message.trim();
    if (texte.length < MESSAGE_MIN) {
      setErreur(t('portfolio.contact.tropCourt', 'Écrivez au moins 10 caractères.'));
      return;
    }
    if (!antiRobot.pretAEnvoyer()) return;
    setEnvoi(true);
    try {
      const jeton = antiRobot.lireJeton();
      const res = await httpClient.post<unknown>(`/users/professionals/${idProfessionnel}/contact`, {
        sujet: sujet.trim() || undefined,
        message: texte,
        ...(jeton ? { turnstile_token: jeton } : {})
      });
      if (!res.success) {
        setErreur(messageErreurServeur(res, t('portfolio.contact.echec', 'Le message n’est pas parti. Réessayez.')));
        return;
      }
      oublier();
      setSujet('');
      setMessage('');
      setOuvert(false);
      toast({
        title: t('portfolio.contact.envoye', 'Message envoyé'),
        description: t('portfolio.contact.envoyeDesc', '{{nom}} le reçoit par e-mail et pourra vous répondre à votre adresse.', { nom })
      });
    } catch (err) {
      setErreur(messageErreurServeur(err, t('portfolio.contact.echec', 'Le message n’est pas parti. Réessayez.')));
    } finally {
      setEnvoi(false);
      // Un jeton anti-robot ne sert qu'une fois
      antiRobot.reinitialiser();
    }
  };

  return (
    <>
      <Button variant="outline" onClick={ouvrir}>
        <Mail className="h-4 w-4 me-2" aria-hidden="true" />
        {t('portfolio.contacter', 'Contacter')}
      </Button>
      <Dialog open={ouvert} onOpenChange={(o) => { if (!envoi) setOuvert(o); }}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={envoyer} noValidate>
            <DialogHeader>
              <DialogTitle>{t('portfolio.contact.titre', 'Écrire à {{nom}}', { nom })}</DialogTitle>
              <DialogDescription>
                {t('portfolio.contact.aide', 'Votre message lui est transmis par e-mail par Tala DZ, avec votre adresse pour qu’il puisse vous répondre. Son adresse ne vous est pas montrée.')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="contact-pro-sujet">{t('portfolio.contact.sujet', 'Sujet')} <span className="text-muted-foreground font-normal">({t('common.optional', 'facultatif')})</span></Label>
                <Input id="contact-pro-sujet" value={sujet} maxLength={200} onChange={(e) => setSujet(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-pro-message">{t('portfolio.contact.message', 'Votre message')} *</Label>
                <Textarea
                  id="contact-pro-message"
                  rows={6}
                  value={message}
                  maxLength={MESSAGE_MAX}
                  onChange={(e) => { setMessage(e.target.value); if (erreur) setErreur(null); }}
                  aria-invalid={!!erreur}
                  aria-describedby={erreur ? 'contact-pro-erreur' : undefined}
                />
                <p className="text-xs text-muted-foreground text-end">{message.length} / {MESSAGE_MAX}</p>
              </div>
              <AntiRobot ref={antiRobot.ref} action="contact" onJeton={antiRobot.setJeton} attente={antiRobot.attente} />
              {erreur && <p id="contact-pro-erreur" role="alert" className="text-sm text-destructive">{erreur}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOuvert(false)} disabled={envoi}>
                {t('common.cancel', 'Annuler')}
              </Button>
              <Button type="submit" disabled={envoi}>
                {envoi ? <Loader2 className="h-4 w-4 me-2 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4 me-2" aria-hidden="true" />}
                {t('portfolio.contact.envoyer', 'Envoyer')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
