/**
 * Créer une organisation (/ajouter-organisation) ou modifier sa page (/organisations/:id/modifier).
 * La page publique attend la vérification de l'équipe ; depuis le formulaire d'événement
 * (?retour=evenement), on y revient après la création.
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RequiredLabel } from '@/components/ui/required-label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Contact, Upload, X, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useToast } from '@/components/ui/use-toast';
import MultiLangInput from '@/components/MultiLangInput';
import { useRTL } from '@/hooks/useRTL';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { httpClient } from '@/services/httpClient';
import { metadataService } from '@/services/metadata.service';
import { API_ENDPOINTS } from '@/config/api';
import FormPageHeader from '@/components/shared/FormPageHeader';
import { SOCIAL_NETWORKS, isValidSocialUrl } from '@/components/shared/SocialLinks';
import { aDuTexte, getLocalizedText } from '@/utils/getLocalizedText';
import { getAssetUrl } from '@/helpers/assetUrl';
import { organisationPath } from '@/utils/slug';
import type { Wilaya } from '@/types';
import i18n from 'i18next';

interface TypeOrganisation {
  id_type_organisation: number;
  nom: { fr?: string; ar?: string; en?: string } | string;
}

type Textes = { fr: string; ar: string; en: string; 'tz-ltn': string; 'tz-tfng': string };
const VIDE: Textes = { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' };
const LOGO_MAX = 5 * 1024 * 1024;

const AjouterOrganisation = () => {
  const navigate = useNavigate();
  const { id: paramId } = useParams<{ id: string }>();
  const idModif = paramId ? parseInt(paramId, 10) || null : null;
  const [params] = useSearchParams();
  const depuisEvenement = params.get('retour') === 'evenement';
  const { t } = useTranslation();
  const { direction } = useRTL();
  const { toast } = useToast();

  const [types, setTypes] = useState<TypeOrganisation[]>([]);
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeLoadError, setTypeLoadError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [logoFichier, setLogoFichier] = useState<File | null>(null);
  const [logoApercu, setLogoApercu] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nom: { ...VIDE },
    description: { ...VIDE },
    id_type_organisation: '',
    site_web: '',
    logo_url: '',
    id_wilaya: '',
    adresse: '',
    email: '',
    telephone: '',
    reseaux: {} as Record<string, string>,
  });

  useUnsavedChanges(isDirty);

  // Création : organisations au nom proche (« Voulez-vous dire… ? »), pour éviter les doublons
  const nomSaisi = useDebouncedValue(Object.values(formData.nom).find(v => v && v.trim().length >= 3) || '', 500);
  const [ressemblantes, setRessemblantes] = useState<Array<{ id_organisation: number; nom: unknown; statut?: string }>>([]);
  useEffect(() => {
    if (idModif || !nomSaisi) { setRessemblantes([]); return; }
    let actif = true;
    httpClient.get<Array<{ id_organisation: number; nom: unknown; statut?: string }>>('/organisations/ressemblantes', { nom: nomSaisi })
      .then(res => { if (actif) setRessemblantes(res.success && res.data ? res.data : []); })
      .catch(() => { if (actif) setRessemblantes([]); });
    return () => { actif = false; };
  }, [nomSaisi, idModif]);

  const champ = <K extends keyof typeof formData>(cle: K, valeur: (typeof formData)[K]) => {
    setFormData(prev => ({ ...prev, [cle]: valeur }));
    setFieldErrors(prev => { const next = { ...prev }; delete next[cle as string]; return next; });
    setIsDirty(true);
  };

  useEffect(() => {
    loadTypes();
    metadataService.getWilayas().then(res => { if (res.success && res.data) setWilayas(res.data); }).catch(() => {});
  }, []);

  // Modification : la page actuelle, toutes langues
  useEffect(() => {
    if (!idModif) return;
    httpClient.get<{
      nom: unknown; description?: unknown; id_type_organisation?: number; site_web?: string | null; logo_url?: string | null;
      id_wilaya?: number | null; adresse?: string | null; email?: string | null; telephone?: string | null;
      reseaux?: Record<string, string> | null; peutModifier?: boolean;
    }>(`/organisations/${idModif}/vitrine`).then(res => {
      const o = res.data;
      if (!res.success || !o) return;
      if (!o.peutModifier) { navigate(organisationPath(idModif, o.nom), { replace: true }); return; }
      const textes = (v: unknown): Textes => ({ ...VIDE, ...(v && typeof v === 'object' ? v as Partial<Textes> : typeof v === 'string' ? { fr: v } : {}) });
      setFormData({
        nom: textes(o.nom),
        description: textes(o.description),
        id_type_organisation: o.id_type_organisation ? String(o.id_type_organisation) : '',
        site_web: o.site_web || '',
        logo_url: o.logo_url || '',
        id_wilaya: o.id_wilaya ? String(o.id_wilaya) : '',
        adresse: o.adresse || '',
        email: o.email || '',
        telephone: o.telephone || '',
        reseaux: o.reseaux || {},
      });
      if (o.logo_url) setLogoApercu(getAssetUrl(o.logo_url, { width: 224 }));
    }).catch(() => {});
  }, [idModif, navigate]);

  const loadTypes = async () => {
    try {
      const response = await httpClient.get<TypeOrganisation[]>(API_ENDPOINTS.organisations.types);
      if (response.success && response.data) {
        setTypes(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement types organisations:', error);
      setTypeLoadError(true);
    }
  };

  const choisirLogo = (fichier?: File | null) => {
    if (!fichier) return;
    if (!fichier.type.startsWith('image/') || fichier.size > LOGO_MAX) {
      setFieldErrors(prev => ({ ...prev, logo: t('organisations.form.logoInvalide', 'Choisissez une image de moins de 5 Mo') }));
      return;
    }
    setLogoFichier(fichier);
    setLogoApercu(URL.createObjectURL(fichier));
    setFieldErrors(prev => { const next = { ...prev }; delete next.logo; return next; });
    setIsDirty(true);
  };

  const retirerLogo = () => {
    setLogoFichier(null);
    setLogoApercu(null);
    champ('logo_url', '');
  };

  const validateFieldOnBlur = (field: string) => {
    let error: string | undefined;
    if (field === 'site_web') {
      if (formData.site_web && !/^https?:\/\/.+\..+/.test(formData.site_web)) {
        error = t('organisations.create.urlInvalid', 'URL du site web invalide (doit commencer par http:// ou https://)');
      }
    }
    if (field === 'email' && formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      error = t('organisations.form.emailInvalide', 'Adresse e-mail invalide');
    }
    if (field === 'telephone' && formData.telephone && !/^[0-9+().\s-]{6,30}$/.test(formData.telephone)) {
      error = t('organisations.form.telephoneInvalide', 'Numéro de téléphone invalide');
    }
    setFieldErrors(prev => {
      if (!error) { const next = { ...prev }; delete next[field]; return next; }
      return { ...prev, [field]: error };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errs: Record<string, string> = {};
    if (!aDuTexte(formData.nom)) {
      errs.nom = t('organisations.create.nameRequired', 'Le nom de l\'organisation est requis, dans au moins une langue');
    }
    if (!formData.id_type_organisation) {
      errs.id_type_organisation = t('organisations.create.typeRequired', 'Le type d\'organisation est requis');
    }
    for (const reseau of SOCIAL_NETWORKS) {
      const url = formData.reseaux[reseau.key] || '';
      if (url && (!url.startsWith('https://') || !isValidSocialUrl(reseau.key, url))) {
        errs[`reseau_${reseau.key}`] = t('organisations.form.reseauInvalide', { reseau: reseau.label, defaultValue: 'Lien {{reseau}} invalide (adresse https:// du réseau)' });
      }
    }
    for (const f of ['site_web', 'email', 'telephone']) if (fieldErrors[f]) errs[f] = fieldErrors[f];
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast({
        title: t('common.error'),
        description: Object.values(errs)[0],
        variant: 'destructive',
      });
      setTimeout(() => {
        const el = document.querySelector('[aria-invalid="true"]');
        if (el) {
          (el as HTMLElement).focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 0);
      return;
    }

    setLoading(true);
    try {
      // Le logo est envoyé d'abord : la page enregistre son adresse
      let logo_url = formData.logo_url || null;
      if (logoFichier) {
        const fd = new FormData();
        fd.append('image', logoFichier);
        const envoi = await httpClient.upload<{ url?: string }>('/upload/image', fd);
        if (!envoi.success || !envoi.data?.url) throw new Error(t('organisations.form.logoEchec', 'Le logo n’a pas pu être envoyé'));
        logo_url = envoi.data.url;
      }
      const reseaux = Object.fromEntries(Object.entries(formData.reseaux).filter(([, v]) => v && v.trim()));
      const corps = {
        nom: formData.nom,
        id_type_organisation: parseInt(formData.id_type_organisation),
        description: formData.description,
        site_web: formData.site_web || null,
        logo_url,
        id_wilaya: formData.id_wilaya ? parseInt(formData.id_wilaya) : null,
        adresse: formData.adresse || null,
        email: formData.email || null,
        telephone: formData.telephone || null,
        reseaux,
      };

      const response = idModif
        ? await httpClient.put<Record<string, unknown>>(`/organisations/${idModif}`, corps)
        : await httpClient.post<Record<string, unknown>>(API_ENDPOINTS.organisations.create, corps);

      if (response.success) {
        setIsDirty(false);
        toast({
          title: t('common.success', 'Succès'),
          description: idModif
            ? t('organisations.form.enregistree', 'Page de l’organisation mise à jour')
            : t('organisations.form.creeeEnAttente', 'Organisation créée. Sa page sera publiée après vérification par l’équipe Tala DZ.'),
        });
        const id = idModif || Number(response.data?.id_organisation);
        if (!idModif && depuisEvenement) navigate('/ajouter-evenement');
        else navigate(id ? organisationPath(id, formData.nom) : '/organisations');
      } else {
        toast({
          title: t('common.error', 'Erreur'),
          description: response.error || t('organisations.create.error', 'Erreur lors de la création'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erreur enregistrement organisation:', error);
      toast({
        title: t('common.error', 'Erreur'),
        description: error instanceof Error && error.message ? error.message : t('organisations.create.error', 'Erreur lors de la création'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getTypeName = (type: TypeOrganisation): string => {
    if (typeof type.nom === 'object') {
      return getLocalizedText(type.nom, i18n.language);
    }
    return type.nom;
  };

  const retour = idModif ? organisationPath(idModif, formData.nom) : depuisEvenement ? '/ajouter-evenement' : '/organisations';
  const facultatif = <span className="text-muted-foreground font-normal">({t('common.optional')})</span>;
  const erreurChamp = (cle: string) => fieldErrors[cle] && (
    <p id={`${cle}-error`} role="alert" className="text-sm text-destructive">{fieldErrors[cle]}</p>
  );

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      <Header />

      <main className="container py-12">
        <div className="max-w-2xl mx-auto">
          <FormPageHeader
            backTo={retour}
            backLabel={t('common.back', 'Retour')}
            title={idModif ? t('organisations.form.titreModifier', 'Modifier la page de l’organisation') : t('organisations.create.title', 'Créer une organisation')}
            subtitle={t('organisations.form.sousTitre', 'Association, maison d’édition, musée… : votre page réunit vos événements et vos publications.')}
          />

          <form onSubmit={handleSubmit} className="space-y-6">
            <p className="text-sm text-muted-foreground">{t('common.requiredFieldsLegend')}</p>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {t('organisations.create.info', 'Informations')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {/* Le champ multilingue affiche lui-même son libellé (avec l'astérisque) */}
                  <MultiLangInput
                    name="nom"
                    label={t('organisations.create.name', 'Nom de l\'organisation')}
                    value={formData.nom}
                    onChange={(value) => champ('nom', value as Textes)}
                    required
                    requiredLanguages={[]}
                    placeholder={t('organisations.create.namePlaceholder', 'Ex: Association culturelle...')}
                    errors={fieldErrors.nom ? { fr: fieldErrors.nom } : undefined}
                  />
                  {ressemblantes.length > 0 && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="space-y-1">
                        <p className="font-medium">{t('organisations.form.existePeutEtre', 'Elle existe peut-être déjà sur Tala DZ :')}</p>
                        <ul className="list-disc ps-5">
                          {ressemblantes.map(o => (
                            <li key={o.id_organisation}>
                              {o.statut === 'valide'
                                ? <Link to={organisationPath(o.id_organisation, o.nom)} target="_blank" className="text-primary underline underline-offset-4">{getLocalizedText(o.nom, i18n.language)}</Link>
                                : getLocalizedText(o.nom, i18n.language)}
                            </li>
                          ))}
                        </ul>
                        <p className="text-sm">{t('organisations.form.existeConseil', 'Si c’est la vôtre, ne la recréez pas : demandez à son responsable de vous ajouter comme membre, ou écrivez à l’équipe Tala DZ.')}</p>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="space-y-2">
                  <RequiredLabel required>{t('organisations.create.type', 'Type d\'organisation')}</RequiredLabel>
                  <Select value={formData.id_type_organisation} onValueChange={(value) => champ('id_type_organisation', value)}>
                    <SelectTrigger
                      className={fieldErrors.id_type_organisation ? 'border-destructive' : ''}
                      aria-invalid={!!fieldErrors.id_type_organisation}
                      aria-describedby={fieldErrors.id_type_organisation ? 'id_type_organisation-error' : undefined}
                    >
                      <SelectValue placeholder={t('organisations.create.typePlaceholder', 'Choisir un type')} />
                    </SelectTrigger>
                    <SelectContent>
                      {types.map((type) => (
                        <SelectItem key={type.id_type_organisation} value={type.id_type_organisation.toString()}>
                          {getTypeName(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {erreurChamp('id_type_organisation')}
                  {typeLoadError && (
                    <p className="text-sm text-destructive">{t('organisations.create.typeLoadError', 'Impossible de charger les types. Veuillez rafraîchir la page.')}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t('common.description', 'Description')} {facultatif}</Label>
                  <MultiLangInput
                    name="description"
                    label={t('common.description', 'Description')}
                    value={formData.description}
                    onChange={(value) => champ('description', value as Textes)}
                    type="textarea"
                    rows={4}
                    requiredLanguages={[]}
                    placeholder={t('organisations.create.descriptionPlaceholder', 'Décrivez votre organisation...')}
                  />
                </div>

                {/* Logo */}
                <div className="space-y-2">
                  <Label htmlFor="logo">{t('organisations.form.logo', 'Logo')} {facultatif}</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-lg border bg-white flex items-center justify-center overflow-hidden">
                      {logoApercu
                        ? <img src={logoApercu} alt="" className="h-full w-full object-contain" />
                        : <Building2 className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <label htmlFor="logo" className="cursor-pointer"><Upload className="h-4 w-4 me-2" aria-hidden="true" />{t('organisations.form.choisirLogo', 'Choisir une image')}</label>
                      </Button>
                      {logoApercu && (
                        <Button type="button" variant="ghost" size="sm" onClick={retirerLogo}><X className="h-4 w-4 me-1" aria-hidden="true" />{t('common.remove', 'Retirer')}</Button>
                      )}
                    </div>
                    <input id="logo" type="file" accept="image/*" className="sr-only" onChange={(e) => choisirLogo(e.target.files?.[0])}
                      aria-invalid={!!fieldErrors.logo} aria-describedby={fieldErrors.logo ? 'logo-error' : undefined} />
                  </div>
                  {erreurChamp('logo')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Contact className="h-5 w-5" />
                  {t('organisations.form.coordonnees', 'Coordonnées')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('gastronomie.wilaya', 'Wilaya')} {facultatif}</Label>
                    <Select value={formData.id_wilaya || 'aucune'} onValueChange={(v) => champ('id_wilaya', v === 'aucune' ? '' : v)}>
                      <SelectTrigger aria-label={t('gastronomie.wilaya', 'Wilaya')}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aucune">—</SelectItem>
                        {wilayas.map(w => <SelectItem key={w.id_wilaya} value={String(w.id_wilaya)}>{(i18n.language.startsWith('ar') && w.nom) || w.wilaya_name_ascii || w.nom}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adresse">{t('organisations.form.adresse', 'Adresse')} {facultatif}</Label>
                    <Input id="adresse" maxLength={255} value={formData.adresse} onChange={(e) => champ('adresse', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('organisations.form.email', 'E-mail')} {facultatif}</Label>
                    <Input id="email" type="email" autoComplete="email" maxLength={255} value={formData.email}
                      onChange={(e) => champ('email', e.target.value)} onBlur={() => validateFieldOnBlur('email')}
                      aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? 'email-error' : undefined} />
                    {erreurChamp('email')}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telephone">{t('organisations.form.telephone', 'Téléphone')} {facultatif}</Label>
                    <Input id="telephone" type="tel" autoComplete="tel" maxLength={30} value={formData.telephone}
                      onChange={(e) => champ('telephone', e.target.value)} onBlur={() => validateFieldOnBlur('telephone')}
                      aria-invalid={!!fieldErrors.telephone} aria-describedby={fieldErrors.telephone ? 'telephone-error' : undefined} />
                    {erreurChamp('telephone')}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="site_web">{t('organisations.create.website', 'Site web')} {facultatif}</Label>
                  <Input
                    id="site_web"
                    type="url"
                    autoComplete="url"
                    maxLength={255}
                    value={formData.site_web}
                    onChange={(e) => champ('site_web', e.target.value)}
                    onBlur={() => validateFieldOnBlur('site_web')}
                    placeholder="https://www.example.com"
                    aria-invalid={!!fieldErrors.site_web}
                    aria-describedby={fieldErrors.site_web ? 'site_web-error' : 'site_web-helper'}
                  />
                  <p id="site_web-helper" className="text-xs text-muted-foreground">{t('common.urlHelper')}</p>
                  {erreurChamp('site_web')}
                </div>

                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium">{t('organisations.form.reseaux', 'Réseaux sociaux')} {facultatif}</legend>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {SOCIAL_NETWORKS.map(({ key, label, icon: Icone, placeholder }) => (
                      <div key={key} className="space-y-1">
                        <Label htmlFor={`reseau-${key}`} className="flex items-center gap-2 text-sm font-normal"><Icone className="h-4 w-4" aria-hidden="true" />{label}</Label>
                        <Input id={`reseau-${key}`} type="url" placeholder={placeholder} value={formData.reseaux[key] || ''}
                          onChange={(e) => champ('reseaux', { ...formData.reseaux, [key]: e.target.value })}
                          aria-invalid={!!fieldErrors[`reseau_${key}`]} aria-describedby={fieldErrors[`reseau_${key}`] ? `reseau_${key}-error` : undefined} />
                        {erreurChamp(`reseau_${key}`)}
                      </div>
                    ))}
                  </div>
                </fieldset>
              </CardContent>
            </Card>

            {!idModif && (
              <p className="text-sm text-muted-foreground">
                {t('organisations.form.verification', 'Vous pourrez utiliser votre organisation tout de suite pour vos événements. Sa page publique apparaîtra dans l’annuaire après vérification par l’équipe Tala DZ.')}
              </p>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate(retour)}>
                {t('common.cancel', 'Annuler')}
              </Button>
              <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={loading}>
                <Building2 className="h-4 w-4 me-2" />
                {loading
                  ? t('organisations.create.submitting', 'Création en cours...')
                  : idModif ? t('common.save', 'Enregistrer') : t('organisations.create.submit', 'Créer l\'organisation')}
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AjouterOrganisation;
