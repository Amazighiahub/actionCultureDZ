/**
 * StepGeneralInfo - Étape 1 du formulaire d'ajout d'œuvre
 * Informations générales : titre, description, type, langue
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Input } from '@/components/UI/input';
import { Label } from '@/components/UI/label';
import { Textarea } from '@/components/UI/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/UI/select';
import { Book, Film, Music, Palette, FileText, Hammer, Beaker } from 'lucide-react';

// Types
interface FormData {
  titre: string;
  description: string;
  id_type_oeuvre: number;
  id_langue: number;
  annee_creation?: number;
  prix?: number;
  [key: string]: any;
}

interface Metadata {
  types_oeuvres?: Array<{ id_type_oeuvre: number; nom_type: string; code?: string }>;
  langues?: Array<{ id_langue: number; nom: string }>;
}

interface StepGeneralInfoProps {
  formData: FormData;
  updateFormData: (field: string, value: any) => void;
  errors: Record<string, string>;
  metadata: Metadata;
}

// Icônes par type
const TYPE_ICONS: Record<string, React.ElementType> = {
  livre: Book,
  litterature: Book,
  film: Film,
  cinema: Film,
  musique: Music,
  art: Palette,
  article: FileText,
  recherche: Beaker,
  artisanat: Hammer,
  default: Palette
};

const StepGeneralInfo: React.FC<StepGeneralInfoProps> = ({
  formData,
  updateFormData,
  errors,
  metadata
}) => {
  const { t } = useTranslation();

  const getTypeIcon = (code?: string) => {
    if (!code) return TYPE_ICONS.default;
    const normalizedCode = code.toLowerCase();
    return TYPE_ICONS[normalizedCode] || TYPE_ICONS.default;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-serif">
          {t('oeuvre.steps.general.title', 'Informations générales')}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Titre */}
        <div className="space-y-2">
          <Label htmlFor="titre">
            {t('oeuvre.fields.title', 'Titre de l\'œuvre')} *
          </Label>
          <Input
            id="titre"
            value={formData.titre}
            onChange={(e) => updateFormData('titre', e.target.value)}
            placeholder={t('oeuvre.fields.titlePlaceholder', 'Ex: La Casbah d\'Alger')}
            className={errors.titre ? 'border-destructive' : ''}
          />
          {errors.titre && (
            <p className="text-sm text-destructive">{errors.titre}</p>
          )}
        </div>

        {/* Type d'œuvre */}
        <div className="space-y-2">
          <Label>{t('oeuvre.fields.type', 'Type d\'œuvre')} *</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {metadata.types_oeuvres?.map((type) => {
              const Icon = getTypeIcon(type.code);
              const isSelected = formData.id_type_oeuvre === type.id_type_oeuvre;
              
              return (
                <button
                  key={type.id_type_oeuvre}
                  type="button"
                  onClick={() => updateFormData('id_type_oeuvre', type.id_type_oeuvre)}
                  className={`
                    flex flex-col items-center gap-2 p-4 border rounded-lg transition-all
                    ${isSelected 
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                      : 'hover:border-primary/50 hover:bg-muted/50'
                    }
                  `}
                >
                  <Icon className={`h-6 w-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${isSelected ? 'text-primary' : ''}`}>
                    {type.nom_type}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.id_type_oeuvre && (
            <p className="text-sm text-destructive">{errors.id_type_oeuvre}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">
            {t('oeuvre.fields.description', 'Description')} *
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => updateFormData('description', e.target.value)}
            placeholder={t('oeuvre.fields.descriptionPlaceholder', 'Décrivez votre œuvre...')}
            className={`min-h-[150px] ${errors.description ? 'border-destructive' : ''}`}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formData.description.length} caractères</span>
            <span>{t('oeuvre.fields.descriptionHint', 'Minimum 50 caractères recommandés')}</span>
          </div>
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description}</p>
          )}
        </div>

        {/* Langue et année */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2">
            <Label>{t('oeuvre.fields.language', 'Langue')}</Label>
            <Select
              value={formData.id_langue?.toString()}
              onValueChange={(v) => updateFormData('id_langue', parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('common.select', 'Sélectionner')} />
              </SelectTrigger>
              <SelectContent>
                {metadata.langues?.map((langue) => (
                  <SelectItem key={langue.id_langue} value={langue.id_langue.toString()}>
                    {langue.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="annee">{t('oeuvre.fields.year', 'Année de création')}</Label>
            <Input
              id="annee"
              type="number"
              min="1800"
              max={new Date().getFullYear()}
              value={formData.annee_creation || ''}
              onChange={(e) => updateFormData('annee_creation', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder={new Date().getFullYear().toString()}
            />
          </div>
        </div>

        {/* Prix (optionnel) */}
        <div className="space-y-2">
          <Label htmlFor="prix">
            {t('oeuvre.fields.price', 'Prix')} 
            <span className="text-muted-foreground ml-1">({t('common.optional', 'optionnel')})</span>
          </Label>
          <div className="relative">
            <Input
              id="prix"
              type="number"
              min="0"
              step="0.01"
              value={formData.prix || ''}
              onChange={(e) => updateFormData('prix', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="0.00"
              className="pl-12"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              DZD
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('oeuvre.fields.priceHint', 'Laissez vide si l\'œuvre n\'est pas à vendre')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default StepGeneralInfo;
