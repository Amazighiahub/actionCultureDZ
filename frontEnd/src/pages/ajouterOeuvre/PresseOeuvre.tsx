/**
 * « Articles de presse sur cette œuvre » dans le formulaire d'une œuvre (2026-11-23). Une écrivaine
 * ajoute son livre et, au même endroit, les articles qui en parlent : ils sont rattachés au livre
 * et s'affichent sur sa page (« Dans la presse et en ligne ») et sur le portfolio.
 * - Ajout : les articles sont gardés dans le formulaire, puis enregistrés dès que l'œuvre est créée.
 * - Modification (idOeuvre) : chaque article est enregistré ou retiré aussitôt.
 */
import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Loader2, Newspaper, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { httpClient } from '@/services/httpClient';
import { messageErreurServeur } from '@/utils/erreurServeur';
import { ListeLiens, typeDepuisUrl, type LienExterne } from '@/components/shared/LiensExternes';
import { useConfirmation } from '@/hooks/useConfirmation';

/** Article saisi avant la création de l'œuvre */
export interface ArticlePresse { url: string; titre: string; source: string; date_publication: string }

const VIDE: ArticlePresse = { url: '', titre: '', source: '', date_publication: '' };

/** Corps envoyé à POST /liens */
export const corpsLien = (a: ArticlePresse, idOeuvre: number) => ({
  url: a.url.trim(), titre: a.titre, source: a.source, date_publication: a.date_publication || null, id_oeuvre: idOeuvre, id_evenement: null,
});

interface Props {
  /** Modification : l'œuvre existe, les articles sont enregistrés aussitôt */
  idOeuvre?: number | null;
  /** Ajout : articles en attente de la création de l'œuvre */
  enAttente: ArticlePresse[];
  onEnAttenteChange: (liste: ArticlePresse[]) => void;
}

export default function PresseOeuvre({ idOeuvre, enAttente, onEnAttenteChange }: Props) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ArticlePresse>(VIDE);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  // Verrou immédiat : deux Entrée rapides créaient deux fois le même article (2026-11-27)
  const verrou = useRef(false);
  const { confirmer, fenetreConfirmation } = useConfirmation();

  const { data: enregistres = [] } = useQuery({
    queryKey: ['mes-liens', i18n.language],
    enabled: !!idOeuvre,
    queryFn: async () => {
      const res = await httpClient.get<LienExterne[]>('/liens/mes-liens');
      return res.success && Array.isArray(res.data) ? res.data : [];
    },
  });
  const deCetteOeuvre = enregistres.filter((l) => Number(l.id_oeuvre) === Number(idOeuvre));
  const rafraichir = () => {
    queryClient.invalidateQueries({ queryKey: ['mes-liens'] });
    queryClient.invalidateQueries({ queryKey: ['liens', 'oeuvre', Number(idOeuvre)] });
  };

  const ajouter = async () => {
    if (verrou.current) return;
    if (!form.url.trim()) { setErreur(t('liens.collerDabord', 'Collez d’abord le lien de l’article (il commence par https://).')); return; }
    if (!typeDepuisUrl(form.url)) { setErreur(t('liens.lienInvalide', 'Lien invalide : il doit commencer par https://')); return; }
    setErreur('');
    if (!idOeuvre) {
      if (enAttente.some((a) => a.url.trim() === form.url.trim())) { setErreur(t('liens.dejaAjoute', 'Cet article est déjà dans la liste.')); return; }
      onEnAttenteChange([...enAttente, form]);
      setForm(VIDE);
      return;
    }
    verrou.current = true;
    setEnvoi(true);
    try {
      const res = await httpClient.post('/liens', corpsLien(form, idOeuvre));
      if (!res.success) { setErreur(messageErreurServeur(res, t('liens.nonEnregistre', 'Le lien n’a pas été enregistré. Réessayez.'))); return; }
      setForm(VIDE);
      rafraichir();
    } catch (e) {
      setErreur(messageErreurServeur(e, t('liens.nonEnregistre', 'Le lien n’a pas été enregistré. Réessayez.')));
    } finally {
      verrou.current = false;
      setEnvoi(false);
    }
  };

  const retirerEnregistre = async (l: LienExterne) => {
    if (!(await confirmer({ titre: t('liens.confirmerRetrait', 'Retirer ce lien ?'), description: t('liens.confirmerRetraitAide', 'Il disparaîtra de votre portfolio et de la page concernée.'), libelleConfirmer: t('liens.retirer', 'Retirer'), variante: 'destructive' }))) return;
    try {
      const res = await httpClient.delete(`/liens/${l.id_lien}`);
      if (!res.success) throw res;
      rafraichir();
    } catch (e) {
      setErreur(messageErreurServeur(e, t('liens.nonRetire', 'Le lien n’a pas été retiré. Réessayez.')));
    }
  };

  // Articles en attente, affichés comme les liens enregistrés
  const apercus: LienExterne[] = enAttente.map((a, i) => ({
    id_lien: -(i + 1), type_lien: typeDepuisUrl(a.url) || 'presse', url: a.url.trim(), titre: a.titre || null, source: a.source || null, date_publication: a.date_publication || null,
  }));
  const liste = idOeuvre ? deCetteOeuvre : apercus;

  return (
    <Card className="shadow-cultural">
      <CardHeader>
        <CardTitle className="text-2xl font-serif flex items-center gap-2">
          <Newspaper className="h-6 w-6 text-primary" aria-hidden="true" />
          {t('liens.presseOeuvre.titre', 'Articles de presse sur cette œuvre')}
          <span className="text-base text-muted-foreground font-normal">({t('common.optional', 'facultatif')})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('liens.presseOeuvre.aide', 'Un journal, une radio ou un site a parlé de cette œuvre ? Collez le lien de l’article ou de la vidéo : les visiteurs le trouveront sur la page de l’œuvre et sur votre portfolio.')}
        </p>

        {liste.length > 0 && (
          <ul className="space-y-2">
            {liste.map((l, i) => (
              <li key={l.id_lien} className="flex items-start justify-between gap-2 rounded-lg border p-3">
                <div className="min-w-0 flex-1"><ListeLiens liens={[l]} /></div>
                <Button type="button" variant="ghost" size="icon" aria-label={t('liens.retirer', 'Retirer')}
                  onClick={() => (idOeuvre ? retirerEnregistre(l) : onEnAttenteChange(enAttente.filter((_, j) => j !== i)))}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="presse-url">{t('liens.adresse', 'Collez le lien')}</Label>
            <Input id="presse-url" type="url" inputMode="url" dir="ltr" placeholder="https://…" maxLength={500}
              aria-invalid={!!erreur || undefined} aria-describedby={erreur ? 'presse-erreur' : undefined}
              value={form.url} onChange={(e) => { setForm((f) => ({ ...f, url: e.target.value })); setErreur(''); }}
              // Entrée dans ce champ : ajoute l'article, n'envoie pas tout le formulaire de l'œuvre
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ajouter(); } }} />
          </div>
          <div>
            <Label htmlFor="presse-titre">{t('liens.titreLien', 'Titre (facultatif)')}</Label>
            <Input id="presse-titre" dir="auto" maxLength={200} value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="presse-source">{t('liens.source', 'Journal ou média (facultatif)')}</Label>
            <Input id="presse-source" dir="auto" maxLength={100} placeholder={t('liens.sourceAide', 'Ex. : El Watan, APS, Radio Algérie')}
              value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="presse-date">{t('liens.date', 'Date (facultatif)')}</Label>
            <Input id="presse-date" type="date" value={form.date_publication} onChange={(e) => setForm((f) => ({ ...f, date_publication: e.target.value }))} />
          </div>
          <div className="flex items-end justify-end">
            <Button type="button" variant="outline" onClick={ajouter} disabled={envoi}>
              {envoi ? <Loader2 className="h-4 w-4 me-2 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4 me-2" aria-hidden="true" />}
              {t('liens.presseOeuvre.ajouter', 'Ajouter cet article')}
            </Button>
          </div>
          {erreur && <p id="presse-erreur" role="alert" className="md:col-span-2 text-sm text-destructive">{erreur}</p>}
        </div>
        {!idOeuvre && enAttente.length > 0 && (
          <p className="text-xs text-muted-foreground">{t('liens.presseOeuvre.enAttente', 'Ces articles seront rattachés à l’œuvre dès son enregistrement.')}</p>
        )}
      </CardContent>
      {fenetreConfirmation}
    </Card>
  );
}
