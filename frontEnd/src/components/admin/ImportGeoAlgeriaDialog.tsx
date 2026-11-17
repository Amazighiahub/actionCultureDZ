/**
 * Importer des lieux GeoAlgeria (sites historiques, parcs, attractions : OpenStreetMap et Wikidata), wilaya
 * par wilaya, puis relire et publier les brouillons (demande de la responsable, 2026-11-17).
 * Onglet « Importer » : choisir la wilaya, cocher (les vrais lieux sont pré-cochés, ceux déjà sur le site
 * sont grisés), importer → les lieux sont créés en brouillon, invisibles.
 * Onglet « À publier » : brouillons à relire, à publier ou à écarter.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, MapPin, Download, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { httpClient } from '@/services/httpClient';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { messageErreurServeur } from '@/utils/erreurServeur';

interface WilayaPoints { id_wilaya: number; codeW: number; nom: unknown; wilaya_name_ascii: string; points: number }
interface PointGeo {
  id: string; categorie: 'historique' | 'parc' | 'attraction'; type: string; nom: Record<string, string>;
  lat: number; lng: number; preCoche: boolean; typePatrimoine: string; commune: { id_commune: number; nom: string };
  deja: { id_lieu: number; nom: unknown; statut: string } | null; source: string;
}
interface Brouillon { id_lieu: number; nom: unknown; latitude: number; longitude: number; commune: string; wilaya: string; codeW: number }

const CATEGORIES: Array<PointGeo['categorie']> = ['historique', 'parc', 'attraction'];
const carte = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`;

const ImportGeoAlgeriaDialog: React.FC<{ open: boolean; onOpenChange: (o: boolean) => void; onImported: () => void }> = ({ open, onOpenChange, onImported }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const echec = t('common.errorOccurred', 'Une erreur est survenue');
  const [onglet, setOnglet] = useState('importer');
  const [wilayas, setWilayas] = useState<WilayaPoints[]>([]);
  const [wilaya, setWilaya] = useState('');
  const [points, setPoints] = useState<PointGeo[] | null>(null);
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [brouillons, setBrouillons] = useState<Brouillon[] | null>(null);
  const [choixBrouillons, setChoixBrouillons] = useState<Set<number>>(new Set());
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  const chargerBrouillons = useCallback(() => {
    httpClient.get<Brouillon[]>('/patrimoine/admin/brouillons')
      .then((r) => { setBrouillons(r.success && Array.isArray(r.data) ? r.data : []); setChoixBrouillons(new Set()); })
      .catch(() => setBrouillons([]));
  }, []);

  useEffect(() => {
    if (!open) return;
    setMessage(null);
    httpClient.get<WilayaPoints[]>('/patrimoine/import-geoalgeria/wilayas')
      .then((r) => { if (r.success && r.data) setWilayas(r.data.filter((w) => w.points > 0)); })
      .catch(() => {});
    chargerBrouillons();
  }, [open, chargerBrouillons]);

  // Points de la wilaya (rechargés après un import : les lieux créés passent « déjà sur Tala DZ »)
  const chargerPoints = useCallback((code: string) => {
    setPoints(null); setCoches(new Set());
    if (!code) return;
    httpClient.get<{ points: PointGeo[] }>('/patrimoine/import-geoalgeria', { wilaya: code })
      .then((r) => {
        const liste = r.success && r.data ? r.data.points : [];
        setPoints(liste);
        setCoches(new Set(liste.filter((p) => p.preCoche && !p.deja).map((p) => p.id)));
      })
      .catch((e) => { setPoints([]); setMessage({ ok: false, texte: messageErreurServeur(e, echec) }); });
  }, [echec]);

  useEffect(() => { setMessage(null); chargerPoints(wilaya); }, [wilaya, chargerPoints]);

  const parCategorie = useMemo(() => CATEGORIES.map((c) => [c, (points || []).filter((p) => p.categorie === c)] as const), [points]);
  const nomPoint = (p: PointGeo) => getLocalizedText(p.nom, lang, p.nom.fr || p.nom.ar || '');
  const basculer = (id: string) => setCoches((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toutCategorie = (liste: readonly PointGeo[], cocher: boolean) => setCoches((prev) => {
    const n = new Set(prev);
    for (const p of liste) if (!p.deja) { if (cocher) n.add(p.id); else n.delete(p.id); }
    return n;
  });

  const importer = async () => {
    setEnvoi(true); setMessage(null);
    try {
      const r = await httpClient.post<{ crees: number; deja: number; ignores: number }>('/patrimoine/import-geoalgeria', { ids: [...coches] });
      if (!r.success || !r.data) throw r;
      setMessage({ ok: true, texte: t('admin.patrimoine.geo.bilan', {
        crees: r.data.crees, deja: r.data.deja,
        defaultValue: '{{crees}} lieu(x) créé(s) en brouillon ; {{deja}} déjà présent(s), non recréé(s). Relisez-les dans l’onglet « À publier ».'
      }) });
      onImported();
      chargerBrouillons();
      chargerPoints(wilaya);
    } catch (e) {
      setMessage({ ok: false, texte: messageErreurServeur(e, echec) });
    } finally {
      setEnvoi(false);
    }
  };

  const decider = async (decision: 'publier' | 'ecarter') => {
    setEnvoi(true); setMessage(null);
    try {
      const r = await httpClient.post<{ modifies: number }>('/patrimoine/admin/brouillons', { ids: [...choixBrouillons], decision });
      if (!r.success || !r.data) throw r;
      setMessage({ ok: true, texte: decision === 'publier'
        ? t('admin.patrimoine.geo.publies', { n: r.data.modifies, defaultValue: '{{n}} lieu(x) publié(s).' })
        : t('admin.patrimoine.geo.ecartes', { n: r.data.modifies, defaultValue: '{{n}} lieu(x) écarté(s).' }) });
      onImported();
      chargerBrouillons();
    } catch (e) {
      setMessage({ ok: false, texte: messageErreurServeur(e, echec) });
    } finally {
      setEnvoi(false);
    }
  };

  const libelleCategorie = (c: PointGeo['categorie']) => ({
    historique: t('admin.patrimoine.geo.historiques', 'Sites historiques'),
    parc: t('admin.patrimoine.geo.parcs', 'Parcs et réserves'),
    attraction: t('admin.patrimoine.geo.attractions', 'Attractions (à trier : beaucoup ne sont pas touristiques)')
  })[c];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!envoi) onOpenChange(o); }}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Download className="h-5 w-5" />{t('admin.patrimoine.geo.titre', 'Importer des lieux (GeoAlgeria)')}</DialogTitle>
          <DialogDescription>
            {t('admin.patrimoine.geo.aide', 'Sites historiques, parcs et attractions d’OpenStreetMap et de Wikidata. Les lieux importés restent en brouillon, invisibles, jusqu’à leur publication.')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={onglet} onValueChange={setOnglet}>
          <TabsList>
            <TabsTrigger value="importer">{t('admin.patrimoine.geo.ongletImporter', 'Importer')}</TabsTrigger>
            <TabsTrigger value="publier">{t('admin.patrimoine.geo.ongletPublier', { n: brouillons?.length ?? 0, defaultValue: 'À publier ({{n}})' })}</TabsTrigger>
          </TabsList>

          <TabsContent value="importer" className="space-y-4">
            <Select value={wilaya} onValueChange={setWilaya}>
              <SelectTrigger aria-label={t('admin.patrimoine.geo.wilaya', 'Wilaya')}>
                <SelectValue placeholder={t('admin.patrimoine.geo.choisirWilaya', 'Choisir une wilaya')} />
              </SelectTrigger>
              <SelectContent>
                {wilayas.map((w) => (
                  <SelectItem key={w.codeW} value={String(w.codeW)}>
                    {/* Nom arabe sur le site en arabe, sinon le nom latin (l'arabe se mêlait aux chiffres) */}
                    {`${String(w.codeW).padStart(2, '0')} · ${lang === 'ar' ? getLocalizedText(w.nom, lang, w.wilaya_name_ascii) : w.wilaya_name_ascii} (${w.points})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {wilaya && points === null && <p className="text-sm text-muted-foreground"><Loader2 className="inline h-4 w-4 animate-spin me-2" />{t('common.loading', 'Chargement…')}</p>}

            {parCategorie.map(([categorie, liste]) => liste.length > 0 && (
              <section key={categorie} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">{libelleCategorie(categorie)} ({liste.length})</h3>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => toutCategorie(liste, true)}>{t('admin.patrimoine.geo.toutCocher', 'Tout cocher')}</Button>
                    <Button size="sm" variant="ghost" onClick={() => toutCategorie(liste, false)}>{t('admin.patrimoine.geo.toutDecocher', 'Tout décocher')}</Button>
                  </div>
                </div>
                <ul className="divide-y rounded-md border">
                  {liste.map((p) => (
                    <li key={p.id} className={`flex items-center gap-3 px-3 py-2 ${p.deja ? 'opacity-60' : ''}`}>
                      <Checkbox checked={coches.has(p.id)} disabled={!!p.deja} onCheckedChange={() => basculer(p.id)} aria-label={nomPoint(p)} />
                      <span className="flex-1 min-w-0">
                        <span className="block truncate font-medium" dir="auto">{nomPoint(p)}</span>
                        <span className="block text-xs text-muted-foreground">
                          {[p.commune.nom, t(`patrimoine.types.${p.typePatrimoine}`, p.typePatrimoine), p.deja ? t('admin.patrimoine.geo.deja', 'déjà sur Tala DZ') : ''].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <a href={carte(p.lat, p.lng)} target="_blank" rel="noopener noreferrer" className="text-primary" aria-label={t('admin.patrimoine.geo.voirCarte', 'Voir sur la carte')}>
                        <MapPin className="h-4 w-4" />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {points && points.length > 0 && (
              <div className="flex items-center justify-between gap-2 border-t pt-3">
                <p className="text-sm text-muted-foreground">{t('admin.patrimoine.geo.coches', { n: coches.size, defaultValue: '{{n}} lieu(x) coché(s)' })}</p>
                <Button disabled={!coches.size || envoi} onClick={importer}>
                  {envoi ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Download className="h-4 w-4 me-2" />}
                  {t('admin.patrimoine.geo.importer', 'Importer en brouillon')}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="publier" className="space-y-3">
            {brouillons?.length === 0 && <p className="text-sm text-muted-foreground">{t('admin.patrimoine.geo.aucunBrouillon', 'Aucun lieu en brouillon.')}</p>}
            {!!brouillons?.length && (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setChoixBrouillons(new Set(brouillons.map((b) => b.id_lieu)))}>{t('admin.patrimoine.geo.toutCocher', 'Tout cocher')}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setChoixBrouillons(new Set())}>{t('admin.patrimoine.geo.toutDecocher', 'Tout décocher')}</Button>
                </div>
                <ul className="divide-y rounded-md border">
                  {brouillons.map((b) => (
                    <li key={b.id_lieu} className="flex items-center gap-3 px-3 py-2">
                      <Checkbox checked={choixBrouillons.has(b.id_lieu)} aria-label={getLocalizedText(b.nom, lang, '')}
                        onCheckedChange={() => setChoixBrouillons((prev) => { const n = new Set(prev); if (n.has(b.id_lieu)) n.delete(b.id_lieu); else n.add(b.id_lieu); return n; })} />
                      <span className="flex-1 min-w-0">
                        <a href={`/patrimoine/${b.id_lieu}`} target="_blank" rel="noopener noreferrer" className="block truncate font-medium hover:underline" dir="auto">{getLocalizedText(b.nom, lang, '')}</a>
                        <span className="block text-xs text-muted-foreground">{`${b.commune} · ${String(b.codeW).padStart(2, '0')} ${b.wilaya}`}</span>
                      </span>
                      <a href={carte(b.latitude, b.longitude)} target="_blank" rel="noopener noreferrer" className="text-primary" aria-label={t('admin.patrimoine.geo.voirCarte', 'Voir sur la carte')}>
                        <MapPin className="h-4 w-4" />
                      </a>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
                  <Button variant="outline" disabled={!choixBrouillons.size || envoi} onClick={() => decider('ecarter')}>{t('admin.patrimoine.geo.ecarter', 'Écarter')}</Button>
                  <Button disabled={!choixBrouillons.size || envoi} onClick={() => decider('publier')}>
                    <CheckCircle2 className="h-4 w-4 me-2" />{t('admin.patrimoine.geo.publier', { n: choixBrouillons.size, defaultValue: 'Publier ({{n}})' })}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {message && (
          <Alert variant={message.ok ? 'default' : 'destructive'}><AlertDescription role="status">{message.texte}</AlertDescription></Alert>
        )}
        <p className="text-xs text-muted-foreground">{t('admin.patrimoine.geo.licence', 'Données © contributeurs OpenStreetMap (ODbL) et Wikidata, via GeoAlgeria. La source est indiquée sur chaque fiche importée.')}</p>
      </DialogContent>
    </Dialog>
  );
};

export default ImportGeoAlgeriaDialog;
