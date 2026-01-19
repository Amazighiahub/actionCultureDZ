/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { Label } from '@/components/UI/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/UI/select';
import { Checkbox } from '@/components/UI/checkbox';
import { Alert, AlertDescription } from '@/components/UI/alert';
import { Badge } from '@/components/UI/badge';
import {
  ArrowLeft, Save, Upload, X, Plus, Loader2, AlertCircle,
  Hammer, Tag, DollarSign, Clock, Package
} from 'lucide-react';
import { artisanatService, CreateArtisanatData } from '@/services/artisanat.service';
import { metadataService } from '@/services/metadata.service';
import MultiLangInput from '@/components/MultiLangInput';

interface FormData {
  nom: { fr: string; ar: string; en: string };
  description: { fr: string; ar: string; en: string };
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
  nom: { fr: '', ar: '', en: '' },
  description: { fr: '', ar: '', en: '' },
  id_materiau: 0,
  id_technique: 0,
  sur_commande: false,
  tags: []
};

const AjouterArtisanat: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLang = i18n.language;

  // States
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [medias, setMedias] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newTag, setNewTag] = useState('');

  // Metadata
  const [materiaux, setMateriaux] = useState<any[]>([]);
  const [techniques, setTechniques] = useState<any[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  // Load metadata
  useEffect(() => {
    loadMetadata();
  }, []);

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
    } catch (err) {
      console.error('Erreur chargement metadata:', err);
    } finally {
      setLoadingMetadata(false);
    }
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setMedias(prev => [...prev, ...newFiles]);

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
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.nom.fr && !formData.nom.ar) {
      setError(t('ajouterArtisanat.errors.nomRequired', 'Le nom est requis'));
      return;
    }
    if (!formData.id_materiau) {
      setError(t('ajouterArtisanat.errors.materiauRequired', 'Le matériau est requis'));
      return;
    }
    if (!formData.id_technique) {
      setError(t('ajouterArtisanat.errors.techniqueRequired', 'La technique est requise'));
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

      const response = await artisanatService.create(createData);

      if (response.success && response.data) {
        // Upload medias if any
        if (medias.length > 0) {
          await artisanatService.uploadMedias(response.data.id, medias);
        }

        setSuccess(true);
        setTimeout(() => {
          navigate('/dashboard-pro');
        }, 2000);
      } else {
        setError(response.error || t('ajouterArtisanat.errors.createFailed', 'Erreur lors de la création'));
      }
    } catch (err: any) {
      console.error('Erreur creation artisanat:', err);
      setError(err.message || t('ajouterArtisanat.errors.createFailed', 'Erreur lors de la création'));
    } finally {
      setLoading(false);
    }
  };

  const getLocalizedName = (item: any) => {
    if (!item) return '';
    if (typeof item.nom === 'string') {
      try {
        const parsed = JSON.parse(item.nom);
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)}>
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
          <Alert className="mb-6 bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">
              {t('ajouterArtisanat.success', 'Artisanat ajouté avec succès!')}
            </AlertDescription>
          </Alert>
        )}

        {/* Error message */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
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
                    label={t('ajouterArtisanat.nom', 'Nom du produit')}
                    value={formData.nom}
                    onChange={(value) => setFormData(prev => ({ ...prev, nom: value }))}
                    required
                    placeholder={t('ajouterArtisanat.nomPlaceholder', 'Ex: Tapis berbère traditionnel')}
                  />

                  {/* Description multilingue */}
                  <MultiLangInput
                    label={t('ajouterArtisanat.description', 'Description')}
                    value={formData.description}
                    onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
                    multiline
                    rows={4}
                    placeholder={t('ajouterArtisanat.descriptionPlaceholder', 'Décrivez votre produit, ses caractéristiques...')}
                  />

                  {/* Materiau et Technique */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('ajouterArtisanat.materiau', 'Matériau')} *</Label>
                      <Select
                        value={formData.id_materiau ? String(formData.id_materiau) : ''}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          id_materiau: parseInt(value)
                        }))}
                      >
                        <SelectTrigger>
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
                    </div>

                    <div className="space-y-2">
                      <Label>{t('ajouterArtisanat.technique', 'Technique')} *</Label>
                      <Select
                        value={formData.id_technique ? String(formData.id_technique) : ''}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          id_technique: parseInt(value)
                        }))}
                      >
                        <SelectTrigger>
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
                      <Label>{t('ajouterArtisanat.prixMin', 'Prix minimum (DA)')}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.prix_min || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          prix_min: e.target.value ? parseFloat(e.target.value) : undefined
                        }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('ajouterArtisanat.prixMax', 'Prix maximum (DA)')}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.prix_max || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          prix_max: e.target.value ? parseFloat(e.target.value) : undefined
                        }))}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {t('ajouterArtisanat.delaiFabrication', 'Délai de fabrication (jours)')}
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        value={formData.delai_fabrication || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          delai_fabrication: e.target.value ? parseInt(e.target.value) : undefined
                        }))}
                        placeholder={t('ajouterArtisanat.delaiFabricationPlaceholder', 'Nombre de jours')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {t('ajouterArtisanat.enStock', 'Quantité en stock')}
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.en_stock || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          en_stock: e.target.value ? parseInt(e.target.value) : undefined
                        }))}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sur_commande"
                      checked={formData.sur_commande}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        sur_commande: !!checked
                      }))}
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

              {/* Submit button */}
              <Card>
                <CardContent className="pt-6">
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
