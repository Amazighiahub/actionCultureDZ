import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RequiredLabel } from '@/components/ui/required-label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import MotsClesInput from '@/components/shared/MotsClesInput';
import {
  Save, Upload, X, Loader2, AlertCircle,
  Tag, DollarSign, Clock, Package
} from 'lucide-react';
import { artisanatService, CreateArtisanatData } from '@/services/artisanat.service';
import { useToast } from '@/hooks/use-toast';
import { useRTL } from '@/hooks/useRTL';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { metadataService } from '@/services/metadata.service';
import type { Materiau, Technique } from '@/types/models/references.types';
import MultiLangInput from '@/components/MultiLangInput';
import FormPageHeader from '@/components/shared/FormPageHeader';
import { aDuTexte } from '@/utils/getLocalizedText';
import { rafraichirTableauDeBord } from '@/lib/queryClient';

type MultiLangText = {
  fr: string;
  ar: string;
  en: string;
  'tz-ltn': string;
  'tz-tfng': string;
};

interface FormData {
  nom: MultiLangText;
  description: MultiLangText;
  id_materiau: number;
  id_technique: number;
  prix_min?: number;
  prix_max?: number;
  delai_fabrication?: number;
  sur_commande: boolean;
  en_stock?: number;
  tags: string[];
}

const INITIAL_FORM: FormData = {
  nom: { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
  description: { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
  id_materiau: 0,
  id_technique: 0,
  prix_min: undefined,
  prix_max: undefined,
  delai_fabrication: undefined,
  sur_commande: true,
  en_stock: undefined,
  tags: []
};

const AjouterArtisanat: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const editId = id ? parseInt(id) : null;
  const currentLang = i18n.language;
  const { direction } = useRTL();

  // States
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [isDirty, setIsDirty] = useState(false);
  const [medias, setMedias] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  useUnsavedChanges(isDirty);

  // Metadata
  const [materiaux, setMateriaux] = useState<Materiau[]>([]);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  // Load metadata
  useEffect(() => {
    loadMetadata();
  }, []);

  // Charger les données existantes en mode édition
  useEffect(() => {
    if (isEditMode && editId) {
      loadExistingArtisanat();
    }
  }, [isEditMode, editId]);

  const loadExistingArtisanat = async () => {
    if (!editId) return;
    try {
      const response = await artisanatService.getForEdit(editId);
      if (response.success && response.data) {
        const art = response.data as Record<string, unknown>;
        const toObj = (v: unknown): MultiLangText => {
          if (typeof v === 'object' && v !== null) {
            const obj = v as Record<string, unknown>;
            return { fr: (obj.fr as string) || '', ar: (obj.ar as string) || '', en: (obj.en as string) || '', 'tz-ltn': (obj['tz-ltn'] as string) || '', 'tz-tfng': (obj['tz-tfng'] as string) || '' };
          }
          return { fr: (typeof v === 'string' ? v : '') || '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' };
        };
        setFormData({
          // Nom et description sont portés par l'œuvre parente
          nom: toObj(art.nom ?? (art.Oeuvre as Record<string, unknown> | undefined)?.titre),
          description: toObj(art.description ?? (art.Oeuvre as Record<string, unknown> | undefined)?.description),
          id_materiau: art.id_materiau || 0,
          id_technique: art.id_technique || 0,
          prix_min: (art.prix_min as number | undefined) ?? (art.prix != null ? Number(art.prix) : undefined),
          prix_max: art.prix_max,
          delai_fabrication: art.delai_fabrication,
          sur_commande: art.sur_commande || false,
          en_stock: art.en_stock,
          tags: (Array.isArray(art.tags) ? art.tags : []).map((t: unknown) => {
            if (typeof t === 'object' && t !== null && 'nom' in t) return (t as { nom: string }).nom;
            return typeof t === 'string' ? t : '';
          }).filter(Boolean),
        });
        // Artisanat loaded for editing
      } else {
        setError('Artisanat introuvable');
        navigate('/dashboard-pro');
      }
    } catch (_err: unknown) {
      setError(t('ajouterArtisanat.errors.loadFailed', 'Impossible de charger l\'artisanat'));
    }
  };

  const loadMetadata = async () => {
    try {
      setLoadingMetadata(true);
      const [materiauxRes, techniquesRes] = await Promise.all([
        metadataService.getMateriaux(),
        metadataService.getTechniques()
      ]);

      if (materiauxRes.success && materiauxRes.data) {
        setMateriaux(materiauxRes.data);
      }
      if (techniquesRes.success && techniquesRes.data) {
        setTechniques(techniquesRes.data);
      }
    } catch {
      toast({ title: t('common.error', 'Erreur'), description: t('ajouterArtisanat.errors.loadMetadataFailed', 'Erreur lors du chargement des matériaux et techniques'), variant: 'destructive' });
    } finally {
      setLoadingMetadata(false);
    }
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      let newFiles = Array.from(files);

      // Photos uniquement (aperçus en <img>), 10 Mo comme la limite image du serveur
      const MAX_SIZE = 10 * 1024 * 1024;
      const rejected = newFiles.filter(f => !f.type.startsWith('image/') || f.size > MAX_SIZE);
      if (rejected.length > 0) {
        toast({ title: t('common.error', 'Erreur'), description: t('upload.imageOnly10', 'Photos uniquement, 10 Mo maximum par fichier'), variant: 'destructive' });
        newFiles = newFiles.filter(f => f.type.startsWith('image/') && f.size <= MAX_SIZE);
        if (newFiles.length === 0) return;
      }

      setMedias(prev => [...prev, ...newFiles]);
      setIsDirty(true);

      // Create previews
      setPreviews(prev => [...prev, ...newFiles.map(file => URL.createObjectURL(file))]);
      e.target.value = '';
    }
  };

  const removeMedia = (index: number) => {
    if (previews[index]) URL.revokeObjectURL(previews[index]);
    setMedias(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };


  const validateFieldOnBlur = (field: string) => {
    if (field === 'prix_min' || field === 'prix_max') {
      if (formData.prix_min && formData.prix_max && Number(formData.prix_min) > Number(formData.prix_max)) {
        const error = t('ajouterArtisanat.errors.prixMinMax', 'Le prix minimum ne peut pas être supérieur au prix maximum');
        setFieldErrors(prev => ({ ...prev, prix: error }));
      } else {
        setFieldErrors(prev => {
          const next = { ...prev };
          delete next.prix;
          return next;
        });
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || success) return;
    setError(null);

    // Validation — collect all errors
    const errs: Record<string, string> = {};
    if (!Object.values(formData.nom).some(v => v?.trim())) {
      errs.nom = t('ajouterArtisanat.errors.nomRequired', 'Le nom est requis');
    }
    // Description obligatoire : le serveur la refuse vide (comme pour toute œuvre)
    if (!aDuTexte(formData.description)) {
      errs.description = t('ajouterArtisanat.errors.descriptionRequired', 'La description est requise, dans au moins une langue');
    }
    if (!formData.id_materiau) {
      errs.id_materiau = t('ajouterArtisanat.errors.materiauRequired', 'Le matériau est requis');
    }
    if (!formData.id_technique) {
      errs.id_technique = t('ajouterArtisanat.errors.techniqueRequired', 'La technique est requise');
    }
    if (formData.prix_min && formData.prix_max && Number(formData.prix_min) > Number(formData.prix_max)) {
      errs.prix = t('ajouterArtisanat.errors.prixMinMax', 'Le prix minimum ne peut pas être supérieur au prix maximum');
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError(Object.values(errs)[0]);
      setTimeout(() => {
        const el = document.querySelector('[aria-invalid="true"]');
        if (el) {
          (el as HTMLElement).focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 0);
      return;
    }

    try {
      setLoading(true);

      const createData: CreateArtisanatData = {
        nom: JSON.stringify(formData.nom),
        description: JSON.stringify(formData.description),
        id_materiau: formData.id_materiau,
        id_technique: formData.id_technique,
        prix_min: formData.prix_min,
        prix_max: formData.prix_max,
        delai_fabrication: formData.delai_fabrication,
        sur_commande: formData.sur_commande,
        en_stock: formData.en_stock,
        tags: formData.tags
      };

      let response;
      if (isEditMode && editId) {
        // Updating artisanat
        response = await artisanatService.update(editId, createData);
      } else {
        response = await artisanatService.create(createData);
      }

      if (response.success) {
        // Envoi des photos (le serveur renvoie id_artisanat, pas id)
        const created = response.data as { id_artisanat?: number; id?: number } | undefined;
        const itemId = created?.id_artisanat || created?.id || editId;
        if (medias.length > 0 && itemId) {
          let uploaded = false;
          try {
            uploaded = !!(await artisanatService.uploadMedias(Number(itemId), medias)).success;
          } catch {
            uploaded = false;
          }
          if (!uploaded) {
            // La création a réussi : on le dit, mais sans cacher l'échec des photos
            toast({
              title: t('ajouterArtisanat.mediasFailedTitle', 'Photos non envoyées'),
              description: t('ajouterArtisanat.mediasFailed', "Votre création est enregistrée, mais les photos n'ont pas pu être envoyées. Ajoutez-les depuis votre tableau de bord."),
              variant: 'destructive',
            });
          }
        }

        setSuccess(true);
        rafraichirTableauDeBord();
        setTimeout(() => {
          navigate('/dashboard-pro');
        }, 2000);
      } else {
        setError(response.error || (isEditMode ? 'Erreur lors de la mise à jour' : t('ajouterArtisanat.errors.createFailed', 'Erreur lors de la création')));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('ajouterArtisanat.errors.createFailed', 'Erreur lors de la création'));
    } finally {
      setLoading(false);
    }
  };

  const getLocalizedName = (item: { nom?: string | Record<string, string> } | null) => {
    if (!item) return '';
    if (typeof item.nom === 'string') {
      try {
        const parsed = JSON.parse(item.nom) as Record<string, string>;
        return parsed[currentLang] || parsed.fr || item.nom;
      } catch {
        return item.nom;
      }
    }
    return item.nom?.[currentLang] || item.nom?.fr || '';
  };

  if (loadingMetadata) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div dir={direction} className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <FormPageHeader
          backTo="/dashboard-pro"
          backLabel={t('common.back', 'Retour')}
          title={isEditMode ? t('ajouterArtisanat.editTitle', 'Modifier l’artisanat') : t('ajouterArtisanat.title', 'Ajouter un artisanat')}
          subtitle={isEditMode ? t('ajouterArtisanat.editSubtitle', 'Corrigez ou complétez votre produit, puis enregistrez.') : t('ajouterArtisanat.subtitle', 'Partagez votre savoir-faire artisanal')}
        />

        {/* Success message */}
        {success && (
          <Alert className="mb-6 bg-primary/10 border-primary/20">
            <AlertDescription className="text-primary">
              {t('ajouterArtisanat.success', 'Artisanat ajouté avec succès!')}
            </AlertDescription>
          </Alert>
        )}

        {/* Error message */}
        {error && (
          <Alert variant="destructive" className="mb-6" role="alert">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <p className="text-sm text-muted-foreground mb-4">{t('common.requiredFieldsLegend')}</p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main form */}
            <div className="lg:col-span-2 space-y-6 min-w-0">
              {/* Basic info */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('ajouterArtisanat.basicInfo', 'Informations de base')}</CardTitle>
                  <CardDescription>{t('ajouterArtisanat.basicInfoDesc', 'Décrivez votre produit artisanal')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Nom multilingue */}
                  <MultiLangInput
                    name="nom"
                    label={t('ajouterArtisanat.nom', 'Nom du produit')}
                    value={formData.nom}
                    onChange={(value) => {
                      setFormData(prev => ({ ...prev, nom: value as MultiLangText }));
                      setFieldErrors(prev => ({ ...prev, nom: '' }));
                      setIsDirty(true);
                    }}
                    required
                    requiredLanguages={[]}
                    placeholder={t('ajouterArtisanat.nomPlaceholder', 'Ex: Tapis berbère traditionnel')}
                    errors={fieldErrors.nom ? { fr: fieldErrors.nom } : undefined}
                  />

                  {/* Description multilingue */}
                  <MultiLangInput
                    name="description"
                    label={t('ajouterArtisanat.description', 'Description')}
                    value={formData.description}
                    onChange={(value) => {
                      setFormData(prev => ({ ...prev, description: value as MultiLangText }));
                      setIsDirty(true);
                    }}
                    type="textarea"
                    rows={4}
                    required
                    requiredLanguages={[]}
                    errors={fieldErrors.description ? { fr: fieldErrors.description } : undefined}
                    placeholder={t('ajouterArtisanat.descriptionPlaceholder', 'Décrivez votre produit, ses caractéristiques...')}
                  />

                  {/* Materiau et Technique */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <RequiredLabel htmlFor="artisanat-materiau" required>{t('ajouterArtisanat.materiau', 'Matériau')}</RequiredLabel>
                      <Select
                        value={formData.id_materiau ? String(formData.id_materiau) : ''}
                        onValueChange={(value) => {
                          setFormData(prev => ({ ...prev, id_materiau: parseInt(value) }));
                          setFieldErrors(prev => ({ ...prev, id_materiau: '' }));
                          setIsDirty(true);
                        }}
                      >
                        <SelectTrigger
                          id="artisanat-materiau"
                          aria-required="true"
                          className={fieldErrors.id_materiau ? 'border-destructive' : ''}
                          aria-invalid={!!fieldErrors.id_materiau}
                          aria-describedby={fieldErrors.id_materiau ? 'materiau-error' : undefined}
                        >
                          <SelectValue placeholder={t('ajouterArtisanat.selectMateriau', 'Sélectionner un matériau')} />
                        </SelectTrigger>
                        <SelectContent>
                          {materiaux.map((m) => (
                            <SelectItem key={m.id_materiau || m.id} value={String(m.id_materiau || m.id)}>
                              {getLocalizedName(m)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldErrors.id_materiau && (
                        <p id="materiau-error" role="alert" className="text-sm text-destructive">{fieldErrors.id_materiau}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <RequiredLabel htmlFor="artisanat-technique" required>{t('ajouterArtisanat.technique', 'Technique')}</RequiredLabel>
                      <Select
                        value={formData.id_technique ? String(formData.id_technique) : ''}
                        onValueChange={(value) => {
                          setFormData(prev => ({ ...prev, id_technique: parseInt(value) }));
                          setFieldErrors(prev => ({ ...prev, id_technique: '' }));
                          setIsDirty(true);
                        }}
                      >
                        <SelectTrigger
                          id="artisanat-technique"
                          aria-required="true"
                          className={fieldErrors.id_technique ? 'border-destructive' : ''}
                          aria-invalid={!!fieldErrors.id_technique}
                          aria-describedby={fieldErrors.id_technique ? 'technique-error' : undefined}
                        >
                          <SelectValue placeholder={t('ajouterArtisanat.selectTechnique', 'Sélectionner une technique')} />
                        </SelectTrigger>
                        <SelectContent>
                          {techniques.map((tech) => (
                            <SelectItem key={tech.id_technique || tech.id} value={String(tech.id_technique || tech.id)}>
                              {getLocalizedName(tech)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldErrors.id_technique && (
                        <p id="technique-error" role="alert" className="text-sm text-destructive">{fieldErrors.id_technique}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing and availability */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    {t('ajouterArtisanat.pricingTitle', 'Prix et disponibilité')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="artisanat-prix-min">{t('ajouterArtisanat.prixMin', 'Prix minimum (DA)')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                      <Input
                        id="artisanat-prix-min"
                        type="number"
                        min={0}
                        max={100000000}
                        value={formData.prix_min || ''}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            prix_min: e.target.value ? parseFloat(e.target.value) : undefined
                          }));
                          setIsDirty(true);
                        }}
                        onBlur={() => validateFieldOnBlur('prix_min')}
                        placeholder="0.00"
                        aria-invalid={!!fieldErrors.prix}
                        aria-describedby={fieldErrors.prix ? 'artisanat-prix-error' : undefined}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="artisanat-prix-max">{t('ajouterArtisanat.prixMax', 'Prix maximum (DA)')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                      <Input
                        id="artisanat-prix-max"
                        type="number"
                        min={0}
                        max={100000000}
                        value={formData.prix_max || ''}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            prix_max: e.target.value ? parseFloat(e.target.value) : undefined
                          }));
                          setIsDirty(true);
                        }}
                        onBlur={() => validateFieldOnBlur('prix_max')}
                        placeholder="0.00"
                        aria-invalid={!!fieldErrors.prix}
                        aria-describedby={fieldErrors.prix ? 'artisanat-prix-error' : undefined}
                      />
                    </div>
                  </div>
                  {fieldErrors.prix && (
                    <p id="artisanat-prix-error" role="alert" className="text-sm text-destructive">{fieldErrors.prix}</p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="artisanat-delai" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" aria-hidden="true" />
                        {t('ajouterArtisanat.delaiFabrication', 'Délai de fabrication (jours)')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span>
                      </Label>
                      <Input
                        id="artisanat-delai"
                        type="number"
                        min={1}
                        max={365}
                        value={formData.delai_fabrication || ''}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            delai_fabrication: e.target.value ? parseInt(e.target.value) : undefined
                          }));
                          setIsDirty(true);
                        }}
                        placeholder={t('ajouterArtisanat.delaiFabricationPlaceholder', 'Nombre de jours')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="artisanat-stock" className="flex items-center gap-2">
                        <Package className="h-4 w-4" aria-hidden="true" />
                        {t('ajouterArtisanat.enStock', 'Quantité en stock')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span>
                      </Label>
                      <Input
                        id="artisanat-stock"
                        type="number"
                        min={0}
                        max={100000}
                        value={formData.en_stock || ''}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            en_stock: e.target.value ? parseInt(e.target.value) : undefined
                          }));
                          setIsDirty(true);
                        }}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="sur_commande"
                      checked={formData.sur_commande}
                      onCheckedChange={(checked) => {
                        setFormData(prev => ({
                          ...prev,
                          sur_commande: !!checked
                        }));
                        setIsDirty(true);
                      }}
                    />
                    <Label htmlFor="sur_commande">{t('ajouterArtisanat.surCommande', 'Disponible sur commande')}</Label>
                  </div>
                </CardContent>
              </Card>

              {/* Tags */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    {t('ajouterArtisanat.tagsTitle', 'Tags / Mots-clés')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MotsClesInput
                    id="artisanat-new-tag"
                    value={formData.tags}
                    onChange={(tags) => { setFormData(prev => ({ ...prev, tags })); setIsDirty(true); }}
                    placeholder={t('ajouterArtisanat.tagPlaceholder', 'Ajouter un tag...')}
                    addLabel={t('ajouterArtisanat.addTag', 'Ajouter le tag')}
                    removeLabel={(tag) => t('ajouterArtisanat.removeTag', 'Supprimer le tag {{tag}}', { tag })}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Media upload */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    {t('ajouterArtisanat.mediasTitle', 'Photos')}
                  </CardTitle>
                  <CardDescription>{t('ajouterArtisanat.mediasDesc', 'Ajoutez des photos de votre produit')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="media-upload"
                    />
                    <label
                      htmlFor="media-upload"
                      className="cursor-pointer block"
                    >
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {t('ajouterArtisanat.mediasUploadText', 'Cliquez pour ajouter des photos')}
                      </p>
                    </label>
                  </div>

                  {/* Preview */}
                  {previews.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {previews.map((preview, index) => (
                        <div key={index} className="relative">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded"
                          />
                          <button
                            type="button"
                            onClick={() => removeMedia(index)}
                            aria-label={t('common.delete', 'Supprimer')}
                            className="absolute -top-2 -end-2 bg-destructive text-white rounded-full p-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Submit & Cancel buttons */}
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={loading || success}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 me-2 animate-spin" />
                        {isEditMode ? t('common.saving', 'Enregistrement...') : t('ajouterArtisanat.submitting', 'Création en cours...')}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 me-2" />
                        {isEditMode ? t('events.create.saveChanges', 'Enregistrer les modifications') : t('ajouterArtisanat.submit', 'Créer l\'artisanat')}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    size="lg"
                    onClick={() => navigate('/dashboard-pro')}
                  >
                    {t('common.cancel', 'Annuler')}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
};

export default AjouterArtisanat;
