/**
 * MessageParticipantsDialog — « Écrire aux participants » dans Gérer › Participants.
 * Changement de programme, point de rencontre, programme en PDF, groupe WhatsApp, dossier Drive :
 * chaque personne choisie (tous, confirmés, en attente) reçoit une notification sur le site et un
 * email. Les messages déjà envoyés restent visibles en dessous, avec le nombre d'emails partis.
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Loader2, Mail, MapPin, MessageCircle, FolderOpen, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useLocalizedDate } from '@/hooks/useLocalizedDate';
import { httpClient } from '@/services/httpClient';
import { uploadService } from '@/services/upload.service';
import { safeExternalUrl } from '@/utils/safeUrl';

type Cible = 'tous' | 'confirme' | 'en_attente';
interface MessageEnvoye {
  id_message: number;
  cible: Cible;
  titre: string;
  message: string;
  point_rencontre: string | null;
  lien_programme: string | null;
  lien_whatsapp: string | null;
  lien_drive: string | null;
  nb_destinataires: number;
  nb_emails_envoyes: number;
  nb_emails_echoues: number;
  date_creation: string;
}
interface Liste { nombres: Record<Cible, number>; messages: MessageEnvoye[] }
interface Programme { url: string; nom: string }

const VIDE = { titre: '', message: '', point_rencontre: '', lien_whatsapp: '', lien_drive: '' };
const PDF_MAX = 50 * 1024 * 1024;

interface Props {
  evenementId: number;
  ouvert: boolean;
  onFermer: () => void;
}

const MessageParticipantsDialog: React.FC<Props> = ({ evenementId, ouvert, onFermer }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { formatDate } = useLocalizedDate();
  const [liste, setListe] = useState<Liste | null>(null);
  const [cible, setCible] = useState<Cible>('tous');
  const [champs, setChamps] = useState(VIDE);
  const [programme, setProgramme] = useState<Programme | null>(null);
  const [envoiPdf, setEnvoiPdf] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = async () => {
    const res = await httpClient.get<Liste>(`/evenements/${evenementId}/participants/messages`);
    if (res.success && res.data) setListe(res.data);
  };

  useEffect(() => {
    if (ouvert) charger();
  }, [ouvert, evenementId]);

  const changer = (cle: keyof typeof VIDE) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setChamps(c => ({ ...c, [cle]: e.target.value }));

  const fermer = () => {
    setChamps(VIDE); setProgramme(null); setErreur(null); setCible('tous');
    onFermer();
  };

  /** Le PDF est mis en ligne dès qu'il est choisi ; le message contient ensuite son lien */
  const choisirPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (!fichier) return;
    if (fichier.type !== 'application/pdf') {
      setErreur(t('pro.participants.messages.pdfSeulement', 'Choisissez un fichier PDF.'));
      return;
    }
    if (fichier.size > PDF_MAX) {
      setErreur(t('pro.participants.messages.pdfTropGros', 'Le PDF est trop lourd (50 Mo au plus).'));
      return;
    }
    setErreur(null); setEnvoiPdf(true);
    const res = await uploadService.uploadDocument(fichier);
    setEnvoiPdf(false);
    if (res.success && res.data?.url) {
      setProgramme({ url: res.data.url, nom: fichier.name });
    } else {
      setErreur(res.error || t('pro.participants.messages.pdfEchec', 'Le PDF n’a pas pu être envoyé, réessayez.'));
    }
  };

  const nombre = liste?.nombres?.[cible] ?? 0;

  const envoyer = async () => {
    setEnCours(true); setErreur(null);
    const res = await httpClient.post<{ destinataires: number; email_etat: string }>(`/evenements/${evenementId}/participants/messages`, {
      cible, ...champs, lien_programme: programme?.url || ''
    });
    setEnCours(false);
    if (!res.success) {
      setErreur(res.error || t('pro.participants.actions.error', 'Une erreur est survenue'));
      return;
    }
    toast({
      title: t('pro.participants.messages.envoye', 'Message envoyé'),
      description: res.data?.email_etat && res.data.email_etat !== 'actif'
        ? t('pro.participants.messages.envoyeSansEmail', '{{n}} personne(s) l’ont reçu sur le site. Les emails sont en pause sur la plateforme.', { n: res.data?.destinataires ?? 0 })
        : t('pro.participants.messages.envoyeDesc', '{{n}} personne(s) le reçoivent sur le site et par email.', { n: res.data?.destinataires ?? 0 })
    });
    setChamps(VIDE); setProgramme(null);
    await charger();
  };

  const libelleCible = (c: Cible) => ({
    tous: t('pro.participants.messages.cibleTous', 'Tous les inscrits'),
    confirme: t('pro.participants.messages.cibleConfirme', 'Seulement les confirmés'),
    en_attente: t('pro.participants.messages.cibleAttente', 'Seulement ceux en attente')
  })[c];

  const suggestions = [
    t('pro.participants.messages.sujetProgramme', 'Changement de programme'),
    t('pro.participants.messages.sujetPratique', 'Informations pratiques'),
    t('pro.participants.messages.sujetRappel', 'Rappel')
  ];

  const lien = (url: string | null, icone: React.ReactNode, libelle: string) => url ? (
    <a href={safeExternalUrl(url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
      {icone}{libelle}
    </a>
  ) : null;

  return (
    <Dialog open={ouvert} onOpenChange={(o) => { if (!o) fermer(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" aria-hidden="true" />
            {t('pro.participants.messages.titre', 'Écrire aux participants')}
          </DialogTitle>
          <DialogDescription>
            {t('pro.participants.messages.description', 'Chaque personne reçoit une notification sur le site et un email, même si elle n’a pas encore choisi son mot de passe.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('pro.participants.messages.aQui', 'À qui ?')}</Label>
            <Select value={cible} onValueChange={(v) => setCible(v as Cible)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(['tous', 'confirme', 'en_attente'] as Cible[]).map(c => (
                  <SelectItem key={c} value={c}>{libelleCible(c)} ({liste?.nombres?.[c] ?? '…'})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="msg-titre">{t('pro.participants.messages.objet', 'Objet')}</Label>
            <Input id="msg-titre" dir="auto" maxLength={150} value={champs.titre} onChange={changer('titre')} />
            <div className="flex flex-wrap gap-1">
              {suggestions.map(s => (
                <Badge key={s} variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setChamps(c => ({ ...c, titre: s }))}>{s}</Badge>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="msg-texte">{t('pro.participants.messages.message', 'Message')}</Label>
            <Textarea id="msg-texte" dir="auto" rows={5} maxLength={5000} value={champs.message} onChange={changer('message')}
              placeholder={t('pro.participants.messages.messageAide', 'Ex. : le chantier commence samedi à 8 h au lieu de dimanche. Pensez à apporter des gants et une gourde.')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="msg-rdv" className="flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden="true" />{t('pro.participants.messages.pointRencontre', 'Point de rencontre')} <span className="text-muted-foreground font-normal">({t('common.optional', 'facultatif')})</span></Label>
            <Input id="msg-rdv" dir="auto" maxLength={300} value={champs.point_rencontre} onChange={changer('point_rencontre')}
              placeholder={t('pro.participants.messages.pointRencontreAide', 'Ex. : devant la mairie, samedi à 8 h (ou un lien Google Maps)')} />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1"><FileText className="h-4 w-4" aria-hidden="true" />{t('pro.participants.messages.programme', 'Programme en PDF')} <span className="text-muted-foreground font-normal">({t('common.optional', 'facultatif')})</span></Label>
            {programme ? (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                <span className="truncate">{programme.nom}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setProgramme(null)} aria-label={t('pro.participants.messages.retirerPdf', 'Retirer le PDF')}>
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input type="file" accept="application/pdf,.pdf" onChange={choisirPdf} disabled={envoiPdf} aria-label={t('pro.participants.messages.programme', 'Programme en PDF')} />
                {envoiPdf && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="msg-wa" className="flex items-center gap-1"><MessageCircle className="h-4 w-4" aria-hidden="true" />{t('pro.participants.messages.whatsapp', 'Lien du groupe WhatsApp')}</Label>
              <Input id="msg-wa" dir="ltr" inputMode="url" value={champs.lien_whatsapp} onChange={changer('lien_whatsapp')} placeholder="https://chat.whatsapp.com/…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="msg-drive" className="flex items-center gap-1"><FolderOpen className="h-4 w-4" aria-hidden="true" />{t('pro.participants.messages.drive', 'Lien du dossier Drive')}</Label>
              <Input id="msg-drive" dir="ltr" inputMode="url" value={champs.lien_drive} onChange={changer('lien_drive')} placeholder="https://drive.google.com/…" />
            </div>
          </div>

          {erreur && <p className="text-sm text-destructive" role="alert">{erreur}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={fermer}>{t('common.close', 'Fermer')}</Button>
          <Button onClick={envoyer} disabled={enCours || envoiPdf || nombre === 0 || champs.titre.trim().length < 3 || !champs.message.trim()}>
            {enCours ? <Loader2 className="h-4 w-4 me-2 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4 me-2" aria-hidden="true" />}
            {t('pro.participants.messages.envoyer', 'Envoyer à {{n}} personne(s)', { n: nombre })}
          </Button>
        </DialogFooter>

        {liste && liste.messages.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-semibold">{t('pro.participants.messages.dejaEnvoyes', 'Messages déjà envoyés')}</h4>
              {liste.messages.map(m => {
                const traites = m.nb_emails_envoyes + m.nb_emails_echoues;
                return (
                  <div key={m.id_message} className="rounded-lg border p-3 text-sm space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium" dir="auto">{m.titre}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(m.date_creation, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                    <p className="text-muted-foreground whitespace-pre-line line-clamp-3" dir="auto">{m.message}</p>
                    {m.point_rencontre && <p dir="auto"><MapPin className="inline h-3 w-3 me-1" aria-hidden="true" />{m.point_rencontre}</p>}
                    <div className="flex flex-wrap gap-3">
                      {lien(m.lien_programme, <FileText className="h-3 w-3" aria-hidden="true" />, t('pro.participants.messages.programmeCourt', 'Programme (PDF)'))}
                      {lien(m.lien_whatsapp, <MessageCircle className="h-3 w-3" aria-hidden="true" />, 'WhatsApp')}
                      {lien(m.lien_drive, <FolderOpen className="h-3 w-3" aria-hidden="true" />, 'Drive')}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {libelleCible(m.cible)} · {t('pro.participants.messages.bilan', '{{n}} personne(s)', { n: m.nb_destinataires })} · {traites < m.nb_destinataires
                        ? t('pro.participants.messages.emailsEnCours', 'emails en cours d’envoi')
                        : t('pro.participants.messages.emailsBilan', '{{ok}} email(s) envoyé(s)', { ok: m.nb_emails_envoyes })}
                      {m.nb_emails_echoues > 0 && <span className="text-destructive"> · {t('pro.participants.messages.emailsEchecs', '{{n}} non envoyé(s)', { n: m.nb_emails_echoues })}</span>}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MessageParticipantsDialog;
