/**
 * ImportReleveDialog - Import d'un relevé Excel de points de visite (modèle Taladz)
 * 1. fichier + lieu (choisi, ou celui de la feuille « Site ») → 2. aperçu → 3. bilan
 * Rien n'est écrit avant « Importer » ; un fichier réimporté met à jour sans dupliquer.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Download, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2, MapPin, ArrowLeft, Upload
} from 'lucide-react';
import { patrimoineService, type ApercuReleve, type BilanReleve } from '@/services/patrimoine.service';
import { getLocalizedText } from '@/utils/getLocalizedText';

export const MODELE_RELEVE_URL = '/modeles/Modele_points_GPS_Taladz.xlsx';

type Etape = 'fichier' | 'apercu' | 'bilan';
type SiteOption = { id: number; nom: string };

interface ImportReleveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

const ACTION_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  creer: 'default', maj: 'secondary', inchange: 'outline'
};

const ImportReleveDialog: React.FC<ImportReleveDialogProps> = ({ open, onOpenChange, onImported }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [etape, setEtape] = useState<Etape>('fichier');
  const [fichier, setFichier] = useState<File | null>(null);
  const [mode, setMode] = useState<'feuille' | 'existant'>('feuille');
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [filtreSite, setFiltreSite] = useState('');
  const [siteId, setSiteId] = useState<number | null>(null);
  const [apercu, setApercu] = useState<ApercuReleve | null>(null);
  const [bilan, setBilan] = useState<BilanReleve | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Remise à zéro à chaque ouverture
  useEffect(() => {
    if (!open) return;
    setEtape('fichier'); setFichier(null); setMode('feuille'); setSiteId(null); setFiltreSite('');
    setApercu(null); setBilan(null); setErreur(null);
  }, [open]);

  // Lieux principaux (pour rattacher les points à un lieu déjà sur Taladz)
  useEffect(() => {
    if (!open || mode !== 'existant' || sites.length) return;
    patrimoineService.getCarte().then((res) => {
      const liste: SiteOption[] = (res.data || [])
        .filter(s => typeof s.id_lieu === 'number')
        .map(s => ({ id: s.id_lieu as number, nom: getLocalizedText(s.nom, i18n.language) || `#${s.id_lieu}` }))
        .sort((a, b) => a.nom.localeCompare(b.nom, i18n.language));
      setSites(liste);
    }).catch(() => setSites([]));
  }, [open, mode, sites.length, i18n.language]);

  const sitesFiltres = useMemo(() => {
    const f = filtreSite.trim().toLowerCase();
    return f ? sites.filter(s => s.nom.toLowerCase().includes(f)) : sites;
  }, [sites, filtreSite]);

  const parentId = mode === 'existant' ? siteId : null;
  const peutVerifier = !!fichier && (mode === 'feuille' || !!siteId) && !enCours;

  const choisirFichier = (f: File | undefined) => {
    setErreur(null);
    if (!f) return;
    if (!/\.xlsx$/i.test(f.name)) {
      setErreur(t('admin.patrimoine.import.errors.format', 'Choisissez un fichier Excel (.xlsx).'));
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setErreur(t('admin.patrimoine.import.errors.size', 'Le fichier dépasse 5 Mo.'));
      return;
    }
    setFichier(f);
  };

  const verifier = async () => {
    if (!fichier) return;
    setEnCours(true); setErreur(null);
    try {
      const res = await patrimoineService.apercuReleve(fichier, parentId);
      if (!res.success || !res.data) throw new Error(res.error || '');
      setApercu(res.data);
      setEtape('apercu');
    } catch (e) {
      setErreur((e as Error).message || t('admin.patrimoine.import.errors.read', 'Fichier illisible.'));
    } finally {
      setEnCours(false);
    }
  };

  const importer = async () => {
    if (!fichier) return;
    setEnCours(true); setErreur(null);
    try {
      const res = await patrimoineService.importerReleve(fichier, parentId);
      if (!res.success || !res.data) throw new Error(res.error || '');
      setBilan(res.data);
      setEtape('bilan');
      onImported?.();
    } catch (e) {
      setErreur((e as Error).message || t('common.error', 'Une erreur est survenue'));
    } finally {
      setEnCours(false);
    }
  };

  const aEcrire = apercu ? apercu.bilan.creer + apercu.bilan.maj : 0;
  const lieuACreer = apercu?.lieu && !apercu.lieu.existe;

  return (
    <Dialog open={open} onOpenChange={(o) => !enCours && onOpenChange(o)}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {t('admin.patrimoine.import.title', 'Importer un relevé Excel')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.patrimoine.import.description', 'Points GPS d’un lieu remplis dans le modèle Taladz (par une association, un guide…). Rien n’est enregistré avant la confirmation.')}
          </DialogDescription>
        </DialogHeader>

        {erreur && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{erreur}</AlertDescription>
          </Alert>
        )}

        {/* 1. Fichier et lieu */}
        {etape === 'fichier' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
              <span className="text-muted-foreground">
                {t('admin.patrimoine.import.templateHint', 'Envoyez ce modèle à l’association : une ligne par point, avec son nom et sa position.')}
              </span>
              <Button variant="outline" size="sm" asChild>
                <a href={MODELE_RELEVE_URL} download>
                  <Download className="h-4 w-4 me-2" />
                  {t('admin.patrimoine.import.downloadTemplate', 'Télécharger le modèle')}
                </a>
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="releve-fichier">{t('admin.patrimoine.import.file', 'Relevé rempli (.xlsx)')}</Label>
              <div
                className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); choisirFichier(e.dataTransfer.files?.[0]); }}
              >
                <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                {fichier ? (
                  <span className="font-medium break-all">{fichier.name}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {t('admin.patrimoine.import.dropHint', 'Glissez le fichier ici ou cliquez pour le choisir')}
                  </span>
                )}
                <input
                  ref={inputRef}
                  id="releve-fichier"
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="sr-only"
                  onChange={(e) => { choisirFichier(e.target.files?.[0]); e.target.value = ''; }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>{t('admin.patrimoine.import.placeLabel', 'Lieu auquel rattacher les points')}</Label>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'feuille' | 'existant')} className="space-y-2">
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="feuille" id="releve-feuille" className="mt-0.5" />
                  <Label htmlFor="releve-feuille" className="font-normal cursor-pointer leading-snug">
                    {t('admin.patrimoine.import.fromSheet', 'Le lieu décrit dans la feuille « Site » du fichier')}
                    <span className="block text-xs text-muted-foreground">
                      {t('admin.patrimoine.import.fromSheetHint', 'Retrouvé dans sa commune s’il existe déjà, sinon créé.')}
                    </span>
                  </Label>
                </div>
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="existant" id="releve-existant" className="mt-0.5" />
                  <Label htmlFor="releve-existant" className="font-normal cursor-pointer leading-snug">
                    {t('admin.patrimoine.import.existing', 'Un lieu déjà sur Taladz')}
                  </Label>
                </div>
              </RadioGroup>

              {mode === 'existant' && (
                <div className="space-y-2 ps-6">
                  <Input
                    value={filtreSite}
                    onChange={(e) => setFiltreSite(e.target.value)}
                    placeholder={t('admin.patrimoine.searchPlaceholder', 'Rechercher un site...')}
                    aria-label={t('admin.patrimoine.searchPlaceholder', 'Rechercher un site...')}
                  />
                  <div role="listbox" aria-label={t('admin.patrimoine.import.existing', 'Un lieu déjà sur Taladz')} className="max-h-48 overflow-y-auto rounded-md border divide-y">
                    {sitesFiltres.length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground">{t('admin.patrimoine.noResults', 'Aucun site trouvé')}</p>
                    ) : sitesFiltres.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        role="option"
                        aria-selected={siteId === s.id}
                        onClick={() => setSiteId(s.id)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-start text-sm transition-colors ${siteId === s.id ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-muted'}`}
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{s.nom}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. Aperçu */}
        {etape === 'apercu' && apercu && (
          <div className="space-y-4">
            {apercu.erreurs.length > 0 ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc ps-4 space-y-1">{apercu.erreurs.map(e => <li key={e}>{e}</li>)}</ul>
                </AlertDescription>
              </Alert>
            ) : apercu.lieu && (
              <div className="rounded-lg border p-3 text-sm">
                <span className="text-muted-foreground">{t('admin.patrimoine.import.place', 'Lieu')} : </span>
                <span className="font-semibold">{apercu.lieu.nom}</span>
                {lieuACreer && (
                  <Badge variant="secondary" className="ms-2">
                    {t('admin.patrimoine.import.placeToCreate', 'sera créé — commune {{commune}}', { commune: apercu.lieu.commune })}
                  </Badge>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              {([
                ['creer', apercu.bilan.creer, t('admin.patrimoine.import.toCreate', 'à créer')],
                ['maj', apercu.bilan.maj, t('admin.patrimoine.import.toUpdate', 'à mettre à jour')],
                ['inchange', apercu.bilan.inchanges, t('admin.patrimoine.import.unchanged', 'inchangés')],
                ['ignoree', apercu.bilan.ignorees, t('admin.patrimoine.import.ignored', 'lignes ignorées')]
              ] as const).map(([cle, n, libelle]) => (
                <div key={cle} className={`rounded-lg border p-2 ${cle === 'ignoree' && n > 0 ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/30' : ''}`}>
                  <div className="text-xl font-bold tabular-nums">{n}</div>
                  <div className="text-xs text-muted-foreground">{libelle}</div>
                </div>
              ))}
            </div>

            {apercu.ignorees.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
                <p className="font-medium mb-1">{t('admin.patrimoine.import.ignoredTitle', 'Lignes ignorées (à corriger dans le fichier)')}</p>
                <ul className="space-y-0.5">
                  {apercu.ignorees.map(i => (
                    <li key={i.id}>N° {i.id}{i.nom ? ` — ${i.nom}` : ''} : {i.raison}</li>
                  ))}
                </ul>
              </div>
            )}

            {apercu.points.length > 0 && (
              <div className="max-h-72 overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 text-start font-medium">N°</th>
                      <th className="px-2 py-2 text-start font-medium">{t('admin.patrimoine.import.colName', 'Point')}</th>
                      <th className="px-2 py-2 text-start font-medium hidden sm:table-cell">{t('common.type', 'Type')}</th>
                      <th className="px-2 py-2 text-start font-medium hidden md:table-cell">{t('admin.patrimoine.import.colPosition', 'Position')}</th>
                      <th className="px-2 py-2 text-end font-medium">{t('admin.patrimoine.import.colAction', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {apercu.points.map(p => (
                      <tr key={p.id} className={p.action === 'inchange' ? 'text-muted-foreground' : ''}>
                        <td className="px-2 py-1.5 tabular-nums">{p.id}</td>
                        <td className="px-2 py-1.5">
                          <span className={p.statut === 'brouillon' ? 'italic' : ''}>{p.nom}</span>
                          {p.nomAr && p.nomAr !== p.nom && <span className="block w-fit text-xs text-muted-foreground" dir="rtl">{p.nomAr}</span>}
                          {p.statut === 'brouillon' && (
                            <span className="block text-xs text-amber-700 dark:text-amber-400">
                              {t('admin.patrimoine.import.draft', 'brouillon — invisible tant qu’il n’a pas de nom')}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 hidden sm:table-cell">{t(`patrimoine.types.${p.type}`, p.type)}</td>
                        <td className="px-2 py-1.5 hidden md:table-cell text-xs tabular-nums" dir="ltr">
                          {p.interieur ? (p.repere || '—') : `${p.latitude?.toFixed(6)}, ${p.longitude?.toFixed(6)}`}
                        </td>
                        <td className="px-2 py-1.5 text-end">
                          <Badge variant={ACTION_VARIANT[p.action]} className="whitespace-nowrap">
                            {p.action === 'creer' ? t('admin.patrimoine.import.actionCreate', 'créer')
                              : p.action === 'maj' ? t('admin.patrimoine.import.actionUpdate', 'mettre à jour')
                              : t('admin.patrimoine.import.actionNone', 'inchangé')}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 3. Bilan */}
        {etape === 'bilan' && bilan && (
          <div className="space-y-3 text-center py-2">
            <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" aria-hidden="true" />
            <p className="font-semibold">{t('admin.patrimoine.import.done', 'Relevé importé')}</p>
            <p className="text-sm text-muted-foreground">
              {bilan.lieuCree && <>{t('admin.patrimoine.import.placeCreated', 'Lieu créé.')} </>}
              {t('admin.patrimoine.import.summary', '{{crees}} point(s) créé(s), {{maj}} mis à jour, {{inchanges}} inchangé(s).', { crees: bilan.crees, maj: bilan.maj, inchanges: bilan.inchanges })}
            </p>
            {bilan.erreurs.length > 0 && (
              <Alert variant="destructive" className="text-start">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="space-y-0.5">{bilan.erreurs.map(e => <li key={e.id}>N° {e.id} {e.nom} : {e.erreur}</li>)}</ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {etape === 'fichier' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enCours}>{t('common.cancel', 'Annuler')}</Button>
              <Button onClick={verifier} disabled={!peutVerifier}>
                {enCours && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {t('admin.patrimoine.import.check', 'Vérifier le fichier')}
              </Button>
            </>
          )}
          {etape === 'apercu' && apercu && (
            <>
              <Button variant="outline" onClick={() => { setEtape('fichier'); setErreur(null); }} disabled={enCours}>
                <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" />
                {t('common.back', 'Retour')}
              </Button>
              <Button onClick={importer} disabled={enCours || apercu.erreurs.length > 0 || (aEcrire === 0 && !lieuACreer)}>
                {enCours && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {aEcrire === 0 && !lieuACreer
                  ? t('admin.patrimoine.import.nothing', 'Rien à importer')
                  : t('admin.patrimoine.import.confirm', 'Importer {{count}} point(s)', { count: aEcrire })}
              </Button>
            </>
          )}
          {etape === 'bilan' && bilan && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.close', 'Fermer')}</Button>
              <Button onClick={() => { onOpenChange(false); navigate(`/patrimoine/${bilan.idLieu}`, { state: { from: '/admin/dashboard?tab=patrimoine' } }); }}>
                <MapPin className="h-4 w-4 me-2" />
                {t('admin.patrimoine.import.viewPlace', 'Voir le lieu et ses points')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportReleveDialog;
