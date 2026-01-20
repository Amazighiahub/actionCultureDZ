/**
 * ArtisanatForm - Composant de formulaire artisanat réutilisable
 * Intègre la validation, le multilingue et la gestion des médias
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { Label } from '@/components/UI/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/UI/select';
import { Checkbox } from '@/components/UI/checkbox';
import { Badge } from '@/components/UI/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/UI/tabs';
import {
  Upload, X, Plus, Loader2, Hammer, Tag, DollarSign, Clock, Package,
  ArrowLeft, Save, Edit, Eye, Shield, CheckCircle, AlertCircle
} from 'lucide-react';
import MultiLangInput from '@/components/MultiLangInput';
import FormField from './FormField';
import { cn } from '@/lib/utils';

export interface ArtisanatFormData {
  nom: { fr: string; ar: string; en: string; 'tz-ltn'?: string; 'tz-tfng'?: string };
  description: { fr: string; ar: string; en: string; 'tz-ltn'?: string; 'tz-tfng'?: string };
  id_materiau: number;
  id_technique: number;
  prix_min?: number;
  prix_max?: number;
  delai_fabrication?: number;
  sur_commande: boolean;
  en_stock?: number;
  tags: string[];
  statut?: 'en_attente' | 'approuve' | 'rejete';
  id_artisan?: number;
  rejet_motif?: string;
}

interface ArtisanatFormProps {
  initialData?: Partial<ArtisanatFormData>;
  materiaux: any[];
  techniques: any[];
  onSubmit: (data: ArtisanatFormData) => Promise<void>;
  onCancel?: () => void;
  mode?: 'create' | 'edit' | 'view' | 'verify';
  loading?: boolean;
  error?: string | null;
  success?: boolean;
  medias?: File[];
  previews?: string[];
  onMediaChange?: (files: File[], previews: string[]) => void;
  onMediaRemove?: (index: number) => void;
  className?: string;
}

const DEFAULT_INITIAL_DATA: ArtisanatFormData = {
  nom: { fr: '', ar: '', en: '' },
  description: { fr: '', ar: '', en: '' },
  id_materiau: 0,
  id_technique: 0,
  sur_commande: false,
  tags: [],
  statut: 'en_attente'
};

const ArtisanatForm: React.FC<ArtisanatFormProps> = ({
  initialData = DEFAULT_INITIAL_DATA,
  materiaux = [],
  techniques = [],
  onSubmit,
  onCancel,
  mode = 'create',
  loading = false,
  error = null,
  success = false,
  medias = [],
  previews = [],
  onMediaChange,
  onMediaRemove,
  className
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const [formData, setFormData] = useState<ArtisanatFormData>({
    ...DEFAULT_INITIAL_DATA,
    ...initialData
  });
  const [newTag, setNewTag] = useState('');

  // Handle form data changes
  const updateFormData = (updates: Partial<ArtisanatFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (mode === 'view') return;
    
    const files = e.target.files;
    if (files && onMediaChange) {
      const newFiles = Array.from(files);
      const newPreviews: string[] = [];
      
      // Create previews
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);
          if (newPreviews.length === newFiles.length) {
            onMediaChange([...medias, ...newFiles], [...previews, ...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Handle tags
  const addTag = () => {
    if (mode === 'view') return;
    
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      updateFormData({
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    if (mode === 'view') return;
    
    updateFormData({
      tags: formData.tags.filter(t => t !== tag)
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  // Get localized name
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

  const getModeIcon = () => {
    switch (mode) {
      case 'create': return <Hammer className="h-6 w-6" />;
      case 'edit': return <Edit className="h-6 w-6" />;
      'view': return <Eye className="h-6 w-6" />;
      case 'verify': return <Shield className="h-6 w-6" />;
      default: return <Hammer className="h-6 w-6" />;
    }
  };

  const getModeTitle = () => {
    switch (mode) {
      case 'create': return t('artisanatForm.createTitle', 'Ajouter un artisanat');
      case 'edit': return t('artisanForm.editTitle', 'Modifier l\'artisanat');
      case 'view': return t('artisanForm.viewTitle', 'Détails de l\'artisanat');
      case 'verify': return t('artisanForm.verifyTitle', 'Vérifier l\'artisanat');
      default: return t('artisanForm.title', 'Artisanat');
    }
  };

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center gap-4">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            <ArrowLeft className="h-5 w-5 me-2" />
            {t('common.back', 'Retour')}
          </Button>
        )}
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            {getModeIcon()}
            {getModeTitle()}
          </h2>
        </div>
      </div>

      {/* Mode indicator */}
      <div>
        <Badge variant={mode === 'verify' ? 'default' : 'secondary'} className="px-3 py-1">
          {mode === 'create' && <Hammer className="h-3 w-3 mr-1" />}
          {mode === 'edit' && <Edit className="h-3 w-3 mr-1" />}
          {mode === 'view' && <Eye className="h-3 w-3 mr-1" />}
          {mode === 'verify' && <Shield className="h-3 w-3 mr-1" />}
          {mode === 'create' && t('artisanForm.mode.create', 'Création')}
          {mode === 'edit' && t('artisanForm.mode.edit', 'Modification')}
          {mode === 'view' && t('artisanForm.mode.view', 'Consultation')}
          {mode === 'verify' && t('artisanForm.mode.verify', 'Vérification')}
        </Badge>
      </div>

      {/* Success/Error messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <span>{t('artisanForm.success', 'Opération réussie!')}</span>
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>{t('artisanForm.basicInfo', 'Informations de base')}</CardTitle>
                <CardDescription>
                  {mode === 'view' 
                    ? t('artisanForm.basicInfoDescView', 'Informations sur le produit artisanal')
                    : t('artisanForm.basicInfoDesc', 'Décrivez votre produit artisanal')
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Nom multilingue */}
                <div className={mode === 'view' ? 'opacity-75' : ''}>
                  <MultiLangInput
                    label={t('artisanForm.nom', 'Nom du produit')}
                    value={formData.nom}
                    onChange={(value) => updateFormData({ nom: value })}
                    required={mode !== 'view'}
                    disabled={mode === 'view'}
                    placeholder={t('artisanForm.nomPlaceholder', 'Ex: Tapis berbère traditionnel')}
                  />
                </div>

                {/* Description multilingue */}
                <div className={mode === 'view' ? 'opacity-75' : ''}>
                  <MultiLangInput
                    label={t('artisanForm.description', 'Description')}
                    value={formData.description}
                    onChange={(value) => updateFormData({ description: value })}
                    disabled={mode === 'view'}
                    placeholder={t('artisanForm.descriptionPlaceholder', 'Décrivez votre produit, ses caractéristiques...')}
                  />
                </div>

                {/* Materiau et Technique */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label required={mode !== 'view'}>
                      {t('artisanForm.materiau', 'Matériau')}
                    </Label>
                    <Select
                      value={formData.id_materiau ? String(formData.id_materiau) : ''}
                      onValueChange={(value) => updateFormData({ id_materiau: parseInt(value) })}
                      disabled={mode === 'view'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('artisanForm.selectMateriau', 'Sélectionner un matériau')} />
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

                  <div>
                    <Label required={mode !== 'view'}>
                      {t('artisanForm.technique', 'Technique')}
                    </Label>
                    <Select
                      value={formData.id_technique ? String(formData.id_technique) : ''}
                      onValueChange={(value) => updateFormData({ id_technique: parseInt(value) })}
                      disabled={mode === 'view'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('artisanForm.selectTechnique', 'Sélectionner une technique')} />
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

            {/* Pricing and Availability */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {t('artisanForm.pricingTitle', 'Prix et disponibilité')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label={t('artisanForm.prixMin', 'Prix minimum (DA)')}
                    type="number"
                    min={0}
                    value={formData.prix_min || ''}
                    onChange={(value) => updateFormData({ prix_min: value ? parseFloat(value) : undefined })}
                    disabled={mode === 'view'}
                    placeholder="0.00"
                  />
                  
                  <FormField
                    label={t('artisanForm.prixMax', 'Prix maximum (DA)')}
                    type="number"
                    min={0}
                    value={formData.prix_max || ''}
                    onChange={(value) => updateFormData({ prix_max: value ? parseFloat(value) : undefined })}
                    disabled={mode === 'view'}
                    placeholder="0.00"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label={t('artisanForm.delaiFabrication', 'Délai de fabrication (jours)')}
                    type="number"
                    min={1}
                    value={formData.delai_fabrication || ''}
                    onChange={(value) => updateFormData({ delai_fabrication: value ? parseInt(value) : undefined })}
                    disabled={mode === 'view'}
                    placeholder={t('artisanForm.delaiFabricationPlaceholder', 'Nombre de jours')}
                  />
                  
                  <FormField
                    label={t('artisanForm.enStock', 'Quantité en stock')}
                    type="number"
                    min={0}
                    value={formData.en_stock || ''}
                    onChange={(value) => updateFormData({ en_stock: value ? parseInt(value) : undefined })}
                    disabled={mode === 'view'}
                    placeholder="0"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sur_commande"
                    checked={formData.sur_commande}
                    onCheckedChange={(checked) => updateFormData({ sur_commande: !!checked })}
                    disabled={mode === 'view'}
                  />
                  <Label htmlFor="sur_commande" disabled={mode === 'view'}>
                    {t('artisanForm.surCommande', 'Disponible sur commande')}
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  {t('artisanForm.tagsTitle', 'Tags / Mots-clés')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={mode === 'view' ? 'opacity-75' : ''}>
                  <div className="flex gap-2 mb-4">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder={t('artisanForm.tagPlaceholder', 'Ajouter un tag...')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      disabled={mode === 'view'}
                    />
                    <Button type="button" onClick={addTag} variant="outline" disabled={mode === 'view'}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1">
                        {tag}
                        {mode !== 'view' && (
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ms-2 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Admin Verification Section */}
            {mode === 'verify' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {t('artisanForm.verificationTitle', 'Vérification administrative')}
                  </CardTitle>
                  <CardDescription>
                    {t('artisanForm.verificationDesc', 'Approuvez ou rejetez ce produit artisanal')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  Corriger la syntaxe du FormField pour le select
                  
                  {formData.statut === 'rejete' && (
                    <FormField
                      label={t('artisanForm.motifRejet', 'Motif du rejet')}
                      type="textarea"
                      rows={3}
                      value={formData.rejet_motif || ''}
                      onChange={(value) => updateFormData({ rejet_motif: value })}
                      placeholder={t('artisanForm.motifRejetPlaceholder', 'Expliquez pourquoi ce produit est rejeté...')}
                    />
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Media Upload */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  {t('artisanForm.mediasTitle', 'Photos')}
                </CardTitle>
                <CardDescription>
                  {mode === 'view' 
                    ? t('artisanForm.mediasDescView', 'Photos du produit')
                    : t('artisanForm.mediasDesc', 'Ajoutez des photos de votre produit')
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {mode !== 'view' && (
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
                        {t('artisanForm.mediasUploadText', 'Cliquez pour ajouter des photos')}
                      </p>
                    </label>
                  </div>
                )}

                {/* Preview */}
                {previews && previews.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {previews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded"
                        />
                        {mode !== 'view' && onMediaRemove && (
                          <button
                            type="button"
                            onClick={() => onMediaRemove(index)}
                            className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
            {(mode === 'create' || mode === 'edit' || mode === 'verify') && (
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
                        {t('artisanForm.submitting', 'En cours...')}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 me-2" />
                        {mode === 'create' && t('artisanForm.submit', 'Créer l\'artisanat')}
                        {mode === 'edit' && t('artisanForm.update', 'Mettre à jour')}
                        {mode === 'verify' && t('artisanForm.verify', 'Vérifier et sauvegarder')}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default ArtisanatForm;
