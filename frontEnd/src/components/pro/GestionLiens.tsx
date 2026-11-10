/**
 * Le professionnel ajoute ses liens (article de presse, YouTube, Instagram, TikTok, Facebook)
 * et choisit où ils apparaissent : sur son portfolio seul, ou aussi sur une de ses œuvres ou un de ses événements.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { httpClient } from '@/services/httpClient';
import { messageErreurServeur } from '@/utils/erreurServeur';
import { ListeLiens, NOMS_LIEN, typeDepuisUrl, type LienExterne } from '@/components/shared/LiensExternes';

interface MesContenus {
  oeuvres: Array<{ id_oeuvre: number; titre: string }>;
  evenements: Array<{ id_evenement: number; nom_evenement: string }>;
}

const VIDE = { url: '', titre: '', source: '', date_publication: '', rattachement: 'portfolio' };

const valeurRattachement = (l: LienExterne) => {
  if (l.id_oeuvre) return `oeuvre:${l.id_oeuvre}`;
  return l.id_evenement ? `evenement:${l.id_evenement}` : 'portfolio';
};

export default function GestionLiens() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cle = ['mes-liens', i18n.language];
  const [ouvert, setOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [idModifie, setIdModifie] = useState<number | null>(null);
  const [form, setForm] = useState(VIDE);
  const [erreur, setErreur] = useState('');

  const { data: liens = [] } = useQuery({
    queryKey: cle,
    queryFn: async () => {
      const res = await httpClient.get<LienExterne[]>('/liens/mes-liens');
      return res.success && Array.isArray(res.data) ? res.data : [];
    },
  });
  const { data: contenus } = useQuery({
    queryKey: ['mes-contenus-liens', i18n.language],
    enabled: ouvert,
    queryFn: async () => (await httpClient.get<MesContenus>('/liens/mes-contenus')).data || { oeuvres: [], evenements: [] },
  });

  const type = typeDepuisUrl(form.url);
  const fermer = () => { setOuvert(false); setIdModifie(null); setForm(VIDE); setErreur(''); };
  const nouveau = () => { setIdModifie(null); setForm(VIDE); setErreur(''); setOuvert(true); };
  const modifier = (l: LienExterne) => {
    setIdModifie(l.id_lien);
    setForm({
      url: l.url,
      titre: l.titre || '',
      source: l.source || '',
      date_publication: l.date_publication || '',
      rattachement: valeurRattachement(l),
    });
    setErreur('');
    setOuvert(true);
  };

  const rafraichir = () => queryClient.invalidateQueries({ queryKey: ['mes-liens'] });

  const enregistrer = async () => {
    // Bouton toujours actif : on explique ce qui manque (avant : grisé sans explication, audit V11 FRM-24)
    if (!form.url.trim()) {
      setErreur(t('liens.collerDabord', 'Collez d’abord le lien de l’article (il commence par https://).'));
      document.getElementById('lien-url')?.focus();
      return;
    }
    if (!type) {
      setErreur(t('liens.lienInvalide', 'Lien invalide : il doit commencer par https://'));
      return;
    }
    const [genre, id] = form.rattachement.split(':');
    const corps = {
      url: form.url.trim(),
      titre: form.titre,
      source: form.source,
      date_publication: form.date_publication || null,
      id_oeuvre: genre === 'oeuvre' ? Number(id) : null,
      id_evenement: genre === 'evenement' ? Number(id) : null,
    };
    setEnCours(true);
    setErreur('');
    try {
      const res = idModifie
        ? await httpClient.put(`/liens/${idModifie}`, corps)
        : await httpClient.post('/liens', corps);
      if (!res.success) {
        setErreur(messageErreurServeur(res, t('liens.nonEnregistre', 'Le lien n’a pas été enregistré. Réessayez.')));
        return;
      }
      toast({ title: t('liens.enregistre', 'Lien enregistré') });
      fermer();
      rafraichir();
    } catch (e) {
      // Connexion coupée : un message compréhensible (et non « Network Error ») ; le lien a pu être
      // enregistré avant la coupure, la liste est donc relue
      setErreur(messageErreurServeur(e, t('auth.errors.networkError', 'Problème de connexion. Vérifiez votre connexion internet et réessayez.')));
      rafraichir();
    } finally {
      setEnCours(false);
    }
  };

  const retirer = async (l: LienExterne) => {
    try {
      const res = await httpClient.delete(`/liens/${l.id_lien}`);
      if (!res.success) throw res;
      rafraichir();
    } catch (e) {
      toast({ title: t('common.error', 'Erreur'), description: messageErreurServeur(e, t('liens.nonRetire', 'Le lien n’a pas été retiré. Réessayez.')), variant: 'destructive' });
    }
  };

  return (
    <section className="mt-8 pt-6 border-t" aria-labelledby="profil-liens-titre">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="profil-liens-titre" className="text-lg font-semibold">{t('liens.gestionTitre', 'Articles de presse et liens')}</h3>
        {!ouvert && (
          <Button variant="outline" size="sm" onClick={nouveau}>
            <Plus className="h-4 w-4 me-2" aria-hidden="true" />
            {t('liens.ajouter', 'Ajouter un lien')}
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {t('liens.aide', 'Articles de presse, YouTube, Instagram, TikTok, Facebook : ils apparaissent sur votre portfolio et, si vous le choisissez, sur l’œuvre ou l’événement concerné.')}
      </p>

      {ouvert && (
        <div className="grid gap-3 rounded-lg border p-3 mb-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="lien-url">{t('liens.adresse', 'Collez le lien')}</Label>
            <Input id="lien-url" type="url" inputMode="url" dir="ltr" placeholder="https://…" maxLength={500}
              aria-invalid={!!erreur || undefined} aria-describedby={erreur ? 'lien-erreur' : undefined}
              value={form.url} onChange={(e) => { setForm((f) => ({ ...f, url: e.target.value })); setErreur(''); }} />
            {type && <p className="text-sm text-muted-foreground mt-1">{t('liens.reconnu', 'Reconnu :')} {t(`liens.types.${type}`, NOMS_LIEN[type])}</p>}
          </div>
          <div>
            <Label htmlFor="lien-titre">{t('liens.titreLien', 'Titre (facultatif)')}</Label>
            <Input id="lien-titre" dir="auto" maxLength={200} value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="lien-source">{t('liens.source', 'Journal ou média (facultatif)')}</Label>
            <Input id="lien-source" dir="auto" maxLength={100} placeholder={t('liens.sourceAide', 'Ex. : El Watan, APS, Radio Algérie')}
              value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="lien-date">{t('liens.date', 'Date (facultatif)')}</Label>
            <Input id="lien-date" type="date" value={form.date_publication} onChange={(e) => setForm((f) => ({ ...f, date_publication: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="lien-rattachement">{t('liens.rattacher', 'Rattacher à')}</Label>
            <Select value={form.rattachement} onValueChange={(rattachement) => setForm((f) => ({ ...f, rattachement }))}>
              <SelectTrigger id="lien-rattachement"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="portfolio">{t('liens.portfolioSeul', 'Seulement mon portfolio')}</SelectItem>
                {!!contenus?.oeuvres.length && (
                  <SelectGroup>
                    <SelectLabel>{t('liens.mesOeuvres', 'Mes œuvres, articles et artisanat')}</SelectLabel>
                    {contenus.oeuvres.map((o) => <SelectItem key={o.id_oeuvre} value={`oeuvre:${o.id_oeuvre}`}>{o.titre}</SelectItem>)}
                  </SelectGroup>
                )}
                {!!contenus?.evenements.length && (
                  <SelectGroup>
                    <SelectLabel>{t('liens.mesEvenements', 'Mes événements')}</SelectLabel>
                    {contenus.evenements.map((e) => <SelectItem key={e.id_evenement} value={`evenement:${e.id_evenement}`}>{e.nom_evenement}</SelectItem>)}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>
          {erreur && <p id="lien-erreur" role="alert" className="md:col-span-2 text-sm text-destructive">{erreur}</p>}
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={fermer}>{t('common.cancel', 'Annuler')}</Button>
            <Button type="button" onClick={enregistrer} disabled={enCours}>
              {enCours && <Loader2 className="h-4 w-4 me-2 animate-spin" aria-hidden="true" />}
              {t('common.save', 'Enregistrer')}
            </Button>
          </div>
        </div>
      )}

      {liens.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('liens.aucun', 'Aucun lien pour l’instant. Ajoutez vos articles de presse et vos vidéos pour enrichir votre page.')}</p>
      ) : (
        <ul className="space-y-3">
          {liens.map((l) => (
            <li key={l.id_lien} className="flex items-start justify-between gap-2 rounded-lg border p-3">
              <div className="min-w-0 flex-1"><ListeLiens liens={[l]} avecCible /></div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" variant="ghost" size="icon" onClick={() => modifier(l)} aria-label={t('common.edit', 'Modifier')}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => retirer(l)} aria-label={t('liens.retirer', 'Retirer')}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
