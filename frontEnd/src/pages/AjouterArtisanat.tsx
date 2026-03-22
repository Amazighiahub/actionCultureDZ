import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Save, Upload, X, Plus, Loader2, AlertCircle,
  Hammer, Tag, DollarSign, Clock, Package
} from 'lucide-react';
import { artisanatService, CreateArtisanatData } from '@/services/artisanat.service';
import { useToast } from '@/hooks/use-toast';
import { useRTL } from '@/hooks/useRTL';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { metadataService } from '@/services/metadata.service';
import type { Materiau, Technique } from '@/types/models/references.types';
import MultiLangInput from '@/components/MultiLangInput';

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
  const [newTag, setNewTag] = useState('');

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
      const response = await artisanatService.getById(editId);
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
          nom: toObj(art.nom),
          description: toObj(art.description),
          id_materiau: art.id_materiau || 0,
          id_technique: art.id_technique || 0,
          prix_min: art.prix_min,
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

      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
      const oversized = newFiles.filter(f => f.size > MAX_SIZE);
      if (oversized.length > 0) {
        toast({ title: t('common.error', 'Erreur'), description: t('validation.fileTooLarge', 'Fichier trop volumineux (max 5 Mo)'), variant: 'destructive' });
        newFiles = newFiles.filter(f => f.size <= MAX_SIZE);
        if (newFiles.length === 0) return;
      }

      setMedias(prev => [...prev, ...newFiles]);
      setIsDirty(true);

      // Create previews
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeMedia = (index: number) => {
    setMedias(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Handle tags
  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
      setIsDirty(true);
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
    setIsDirty(true);
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
    setError(null);

    // Validation — collect all errors
    const errs: Record<string, string> = {};
    if (!Object.values(formData.nom).some(v => v?.trim())) {
      errs.nom = t('ajouterArtisanat.errors.nomRequired', 'Le nom est requis');
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
        // Upload medias if any (only for new items or new medias)
        const itemId = (response.data as { id?: number } | undefined)?.id || editId;
        if (medias.length > 0 && itemId) {
          await artisanatService.uploadMedias(itemId, medias);
        }

        setSuccess(true);
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
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/dashboard-pro')}>
            <ArrowLeft className="h-5 w-5 me-2" />
            {t('common.back', 'Retour')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Hammer className="h-6 w-6 text-amber-600" />
              {t('ajouterArtisanat.title', 'Ajouter un artisanat')}
            </h1>
            <p className="text-muted-foreground">{t('ajouterArtisanat.subtitle', 'Partagez votre savoir-faire artisanal')}</p>
          </div>
        </div>

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
            <div className="lg:col-span-2 space-y-6">
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
                    requiredLanguages={['fr']}
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
                    requiredLanguages={[]}
                    placeholder={t('ajouterArtisanat.descriptionPlaceholder', 'Décrivez votre produit, ses caractéristiques...')}
                  />

                  {/* Materiau et Technique */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('ajouterArtisanat.materiau', 'Matériau')} *</Label>
                      <Select
                        value={formData.id_materiau ? String(formData.id_materiau) : ''}
                        onValueChange={(value) => {
                          setFormData(prev => ({ ...prev, id_materiau: parseInt(value) }));
                          setFieldErrors(prev => ({ ...prev, id_materiau: '' }));
                          setIsDirty(true);
                        }}
                      >
                        <SelectTrigger
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
                      <Label>{t('ajouterArtisanat.technique', 'Technique')} *</Label>
                      <Select
                        value={formData.id_technique ? String(formData.id_technique) : ''}
                        onValueChange={(value) => {
                          setFormData(prev => ({ ...prev, id_technique: parseInt(value) }));
                          setFieldErrors(prev => ({ ...prev, id_technique: '' }));
                          setIsDirty(true);
                        }}
                      >
                        <SelectTrigger
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
                      <Label>{t('ajouterArtisanat.prixMin', 'Prix minimum (DA)')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                      <Input
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
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('ajouterArtisanat.prixMax', 'Prix maximum (DA)')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                      <Input
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
                      />
                    </div>
                  </div>
                  {fieldErrors.prix && (
                    <p role="alert" className="text-sm text-destructive">{fieldErrors.prix}</p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {t('ajouterArtisanat.delaiFabrication', 'Délai de fabrication (jours)')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span>
                      </Label>
                      <Input
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
                      <Label className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {t('ajouterArtisanat.enStock', 'Quantité en stock')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span>
                      </Label>
                      <Input
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
                  <div className="flex gap-2 mb-4">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder={t('ajouterArtisanat.tagPlaceholder', 'Ajouter un tag...')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <Button type="button" onClick={addTag} variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ms-2 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
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
                            className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1"
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
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 me-2 animate-spin" />
                        {t('ajouterArtisanat.submitting', 'Création en cours...')}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 me-2" />
                        {t('ajouterArtisanat.submit', 'Créer l\'artisanat')}
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
