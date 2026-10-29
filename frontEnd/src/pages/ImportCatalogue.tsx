/**
 * Import du catalogue d'une maison d'édition : /organisations/:id/catalogue
 * 1. télécharger le modèle Excel ; 2. choisir le fichier rempli et les couvertures ;
 * 3. aperçu ligne par ligne (rien n'est enregistré) ; 4. import, puis envoi des couvertures livre par livre.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Download, FileSpreadsheet, Images, CheckCircle2, XCircle, RefreshCw, Upload, Loader2, BookOpen } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FormPageHeader from '@/components/shared/FormPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { httpClient } from '@/services/httpClient';
import { prepareImageForUpload } from '@/utils/prepareImageForUpload';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { organisationPath } from '@/utils/slug';
import { rafraichirTableauDeBord } from '@/lib/queryClient';

interface LigneApercu { ligne: number; titre: string; auteur: string; isbn: string | null; couverture: string | null; etat: 'nouveau' | 'existe' | 'erreur'; erreurs: string[] }
interface Apercu { resume: { total: number; nouveaux: number; existants: number; erreurs: number; sansCouverture: number }; imagesSansLivre: string[]; lignes: LigneApercu[] }
interface Bilan { crees: Array<{ ligne: number; id_oeuvre: number; couverture: string | null }>; lies: Array<{ ligne: number }>; aVerifier?: Array<{ ligne: number }>; dejaPresents?: Array<{ ligne: number }>; echecs: Array<{ ligne: number; erreur: string }>; ignorees: number }

const message = (e: unknown, defaut: string) => (e instanceof Error && e.message ? e.message : defaut);

const ImportCatalogue: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const idOrg = parseInt(id || '', 10);
  const { t, i18n } = useTranslation();
  const [fichier, setFichier] = useState<File | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [bilan, setBilan] = useState<Bilan | null>(null);
  const [couvertures, setCouvertures] = useState({ faites: 0, total: 0, echecs: 0 });
  const [etape, setEtape] = useState<'choix' | 'verification' | 'import' | 'fini'>('choix');
  const [erreur, setErreur] = useState<string | null>(null);

  const { data: org } = useQuery({
    queryKey: ['organisation-vitrine', idOrg],
    queryFn: async () => (await httpClient.get<{ nom: unknown; peutModifier: boolean }>(`/organisations/${idOrg}/vitrine`)).data,
    enabled: !!idOrg
  });
  const nom = getLocalizedText(org?.nom, i18n.language, '');
  // Vignette de chaque couverture choisie
  const apercus = useMemo(() => new Map(images.map(f => [f.name, URL.createObjectURL(f)])), [images]);
  useEffect(() => () => { apercus.forEach(url => URL.revokeObjectURL(url)); }, [apercus]);

  const formulaire = () => {
    const fd = new FormData();
    fd.append('fichier', fichier as File);
    fd.append('images', JSON.stringify(images.map(f => f.name)));
    return fd;
  };

  const telechargerModele = () => httpClient.download(`/organisations/${idOrg}/catalogue/modele`, 'Modele_catalogue_TalaDZ.xlsx');

  const verifier = async () => {
    if (!fichier) return;
    setErreur(null); setApercu(null); setEtape('verification');
    try {
      const res = await httpClient.upload<Apercu>(`/organisations/${idOrg}/catalogue/apercu`, formulaire());
      if (!res.success || !res.data) throw new Error(res.error);
      setApercu(res.data);
    } catch (e) {
      setErreur(message(e, t('catalogue.erreurLecture', 'Le fichier n’a pas pu être lu')));
    } finally {
      setEtape('choix');
    }
  };

  const importer = async () => {
    if (!fichier || !apercu) return;
    setErreur(null); setEtape('import');
    try {
      const res = await httpClient.upload<Bilan>(`/organisations/${idOrg}/catalogue`, formulaire());
      if (!res.success || !res.data) throw new Error(res.error);
      const resultat = res.data;
      // Couvertures : une par livre créé, réduite avant l'envoi
      const aEnvoyer = resultat.crees.filter(c => c.couverture && images.some(f => f.name === c.couverture));
      let faites = 0; let echecs = 0;
      setCouvertures({ faites: 0, total: aEnvoyer.length, echecs: 0 });
      for (const c of aEnvoyer) {
        try {
          const fd = new FormData();
          fd.append('medias', await prepareImageForUpload(images.find(f => f.name === c.couverture) as File));
          const envoi = await httpClient.upload(`/oeuvres/${c.id_oeuvre}/medias/upload`, fd);
          if (!envoi.success) echecs++;
        } catch {
          echecs++;
        }
        faites++;
        setCouvertures({ faites, total: aEnvoyer.length, echecs });
      }
      setBilan(resultat);
      setEtape('fini');
      rafraichirTableauDeBord();
    } catch (e) {
      setErreur(message(e, t('catalogue.erreurImport', 'L’import a échoué')));
      setEtape('choix');
    }
  };

  const recommencer = () => { setFichier(null); setImages([]); setApercu(null); setBilan(null); setErreur(null); setEtape('choix'); };
  const pageMaison = org ? organisationPath(idOrg, org.nom) : '/organisations';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-10">
        <div className="max-w-4xl mx-auto space-y-6">
          <FormPageHeader
            backTo={pageMaison}
            backLabel={nom || t('common.back', 'Retour')}
            title={t('catalogue.titre', 'Importer votre catalogue')}
            subtitle={t('catalogue.sousTitre', 'Tous vos livres en une seule fois, avec un fichier Excel et leurs couvertures.')}
          />

          {etape === 'fini' && bilan ? (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-green-600" aria-hidden="true" />
                  <h2 className="text-xl font-semibold">{t('catalogue.termine', 'Import terminé')}</h2>
                </div>
                <ul className="space-y-1 text-sm">
                  <li>{t('catalogue.bilanCrees', { count: bilan.crees.length, defaultValue: '{{count}} livre(s) envoyé(s) à l’équipe Tala DZ pour vérification' })}</li>
                  {bilan.lies.length > 0 && <li>{t('catalogue.bilanLies', { count: bilan.lies.length, defaultValue: '{{count}} livre(s) déjà sur le site, relié(s) à votre maison' })}</li>}
                  {(bilan.aVerifier?.length ?? 0) > 0 && <li>{t('catalogue.bilanAVerifier', { count: bilan.aVerifier!.length, defaultValue: '{{count}} livre(s) déjà sur le site, ajouté(s) par un autre compte : l’équipe Tala DZ vérifiera avant de les relier à votre maison' })}</li>}
                  {(bilan.dejaPresents?.length ?? 0) > 0 && <li>{t('catalogue.bilanDejaPresents', { count: bilan.dejaPresents!.length, defaultValue: '{{count}} livre(s) déjà dans votre catalogue, non recréé(s)' })}</li>}
                  {couvertures.total > 0 && <li>{t('catalogue.bilanCouvertures', { faites: couvertures.faites - couvertures.echecs, total: couvertures.total, defaultValue: '{{faites}} couverture(s) sur {{total}} ajoutée(s)' })}</li>}
                  {bilan.ignorees > 0 && <li className="text-destructive">{t('catalogue.bilanIgnorees', { count: bilan.ignorees, defaultValue: '{{count}} ligne(s) en erreur non importée(s) : corrigez-les et importez-les à nouveau' })}</li>}
                  {bilan.echecs.map(e => <li key={e.ligne} className="text-destructive">{t('catalogue.ligne', { n: e.ligne, defaultValue: 'Ligne {{n}}' })} : {e.erreur}</li>)}
                </ul>
                <div className="flex flex-wrap gap-3">
                  <Button asChild><Link to={pageMaison}>{t('catalogue.voirPage', 'Voir la page de la maison d’édition')}</Link></Button>
                  <Button variant="outline" onClick={recommencer}>{t('catalogue.autreFichier', 'Importer un autre fichier')}</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Download className="h-5 w-5" />{t('catalogue.etape1', '1. Téléchargez le modèle')}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{t('catalogue.etape1Aide', 'Une ligne par livre : titre, résumé, auteur, année, langue, ISBN, nombre de pages, catégories, prix. La feuille « Aide » explique chaque colonne.')}</p>
                  <Button variant="outline" onClick={telechargerModele}><FileSpreadsheet className="h-4 w-4 me-2" />{t('catalogue.modele', 'Télécharger le modèle Excel')}</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Upload className="h-5 w-5" />{t('catalogue.etape2', '2. Déposez votre fichier et vos couvertures')}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <label htmlFor="fichier-catalogue" className="text-sm font-medium flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" />{t('catalogue.fichier', 'Votre fichier Excel (.xlsx)')}</label>
                    <input id="fichier-catalogue" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      className="block w-full text-sm file:me-3 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
                      onChange={(e) => { setFichier(e.target.files?.[0] || null); setApercu(null); }} />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="couvertures-catalogue" className="text-sm font-medium flex items-center gap-2"><Images className="h-4 w-4" />{t('catalogue.couvertures', 'Vos couvertures (facultatif) : sélectionnez toutes les images d’un coup')}</label>
                    <input id="couvertures-catalogue" type="file" accept="image/jpeg,image/png,image/webp" multiple
                      className="block w-full text-sm file:me-3 file:rounded-md file:border-0 file:bg-secondary file:px-4 file:py-2"
                      onChange={(e) => { setImages(Array.from(e.target.files || [])); setApercu(null); }} />
                    <p className="text-xs text-muted-foreground">
                      {images.length > 0
                        ? t('catalogue.nbImages', { count: images.length, defaultValue: '{{count}} image(s) choisie(s)' })
                        : t('catalogue.couverturesAide', 'Nommez chaque image par l’ISBN du livre (9789947055213.jpg), ou écrivez son nom dans la colonne « Fichier couverture ».')}
                    </p>
                  </div>
                  <Button onClick={verifier} disabled={!fichier || etape !== 'choix'}>
                    {etape === 'verification' ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <RefreshCw className="h-4 w-4 me-2" />}
                    {t('catalogue.verifier', 'Vérifier le fichier')}
                  </Button>
                  <p className="text-xs text-muted-foreground">{t('catalogue.rienEnregistre', 'La vérification n’enregistre rien : vous voyez d’abord le résultat, ligne par ligne.')}</p>
                </CardContent>
              </Card>

              {erreur && <Alert variant="destructive" role="alert"><AlertDescription>{erreur}</AlertDescription></Alert>}

              {apercu && (
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BookOpen className="h-5 w-5" />{t('catalogue.etape3', '3. Vérifiez, puis importez')}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-green-600 hover:bg-green-600">{t('catalogue.nbNouveaux', { count: apercu.resume.nouveaux, defaultValue: '{{count}} nouveau(x) livre(s)' })}</Badge>
                      {apercu.resume.existants > 0 && <Badge variant="secondary">{t('catalogue.nbExistants', { count: apercu.resume.existants, defaultValue: '{{count}} déjà sur le site' })}</Badge>}
                      {apercu.resume.erreurs > 0 && <Badge variant="destructive">{t('catalogue.nbErreurs', { count: apercu.resume.erreurs, defaultValue: '{{count}} ligne(s) à corriger' })}</Badge>}
                      {apercu.resume.sansCouverture > 0 && <Badge variant="outline">{t('catalogue.nbSansCouverture', { count: apercu.resume.sansCouverture, defaultValue: '{{count}} sans couverture' })}</Badge>}
                    </div>
                    {apercu.imagesSansLivre.length > 0 && (
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        {t('catalogue.imagesSansLivre', 'Images qui ne correspondent à aucun livre :')} {apercu.imagesSansLivre.join(', ')}
                      </p>
                    )}
                    <ul className="divide-y rounded-lg border">
                      {apercu.lignes.map(l => (
                        <li key={l.ligne} className="flex items-start gap-3 p-3">
                          <div className="h-16 w-12 shrink-0 rounded bg-muted overflow-hidden flex items-center justify-center">
                            {l.couverture && apercus.get(l.couverture)
                              ? <img src={apercus.get(l.couverture)} alt="" className="h-full w-full object-cover" />
                              : <BookOpen className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium" dir="auto">{l.titre || '—'}</p>
                            <p className="text-sm text-muted-foreground">
                              {[t('catalogue.ligne', { n: l.ligne, defaultValue: 'Ligne {{n}}' }), l.auteur, l.isbn ? `ISBN ${l.isbn}` : ''].filter(Boolean).join(' · ')}
                            </p>
                            {l.erreurs.length > 0 && <p className="text-sm text-destructive">{l.erreurs.join(' ; ')}</p>}
                          </div>
                          <span className="shrink-0 text-sm flex items-center gap-1">
                            {l.etat === 'nouveau' && <><CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />{t('catalogue.etatNouveau', 'Nouveau')}</>}
                            {l.etat === 'existe' && <><RefreshCw className="h-4 w-4 text-muted-foreground" aria-hidden="true" />{t('catalogue.etatExiste', 'Déjà sur le site')}</>}
                            {l.etat === 'erreur' && <><XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />{t('catalogue.etatErreur', 'À corriger')}</>}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {etape === 'import' && (
                      <p className="text-sm flex items-center gap-2" role="status">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        {couvertures.total
                          ? t('catalogue.envoiCouvertures', { faites: couvertures.faites, total: couvertures.total, defaultValue: 'Envoi des couvertures : {{faites}} / {{total}}' })
                          : t('catalogue.importEnCours', 'Import en cours…')}
                      </p>
                    )}
                    <Button size="lg" onClick={importer} disabled={etape !== 'choix' || apercu.resume.nouveaux + apercu.resume.existants === 0}>
                      <Upload className="h-4 w-4 me-2" />
                      {t('catalogue.importer', { count: apercu.resume.nouveaux + apercu.resume.existants, defaultValue: 'Importer {{count}} livre(s)' })}
                    </Button>
                    {apercu.resume.erreurs > 0 && (
                      <p className="text-xs text-muted-foreground">{t('catalogue.erreursIgnorees', 'Les lignes à corriger ne sont pas importées : corrigez le fichier et vérifiez-le à nouveau, ou importez-les plus tard.')}</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ImportCatalogue;
