/**
 * StepCategories - Étape 3 : Catégories et Tags
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/UI/card';
import { Input } from '@/components/UI/input';
import { Label } from '@/components/UI/label';
import { Badge } from '@/components/UI/badge';
import { Button } from '@/components/UI/button';
import { Checkbox } from '@/components/UI/checkbox';
import { Skeleton } from '@/components/UI/skeleton';
import { X, Plus, Tag, FolderTree, Sparkles } from 'lucide-react';
import { metadataService } from '@/services/metadata.service';

interface StepCategoriesProps {
  formData: any;
  updateFormData: (field: string, value: any) => void;
  errors: Record<string, string>;
  metadata: any;
}

interface CategoryGroup {
  id_genre: number;
  nom_genre: string;
  categories: Array<{
    id_categorie: number;
    nom: string;
  }>;
}

const StepCategories: React.FC<StepCategoriesProps> = ({
  formData,
  updateFormData,
  errors,
  metadata
}) => {
  const { t } = useTranslation();
  const [categoriesGrouped, setCategoriesGrouped] = useState<CategoryGroup[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

  // Charger les catégories selon le type d'œuvre
  useEffect(() => {
    if (formData.id_type_oeuvre) {
      loadCategories();
    }
  }, [formData.id_type_oeuvre]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await metadataService.getCategoriesForType(formData.id_type_oeuvre);
      if (response.success && response.data) {
        setCategoriesGrouped(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Gestion des catégories
  const handleCategoryToggle = (categoryId: number) => {
    const currentCategories = formData.categories || [];
    const newCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter((id: number) => id !== categoryId)
      : [...currentCategories, categoryId];
    updateFormData('categories', newCategories);
  };

  const isCategorySelected = (categoryId: number) => {
    return (formData.categories || []).includes(categoryId);
  };

  // Gestion des tags
  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !(formData.tags || []).includes(trimmedTag)) {
      updateFormData('tags', [...(formData.tags || []), trimmedTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    updateFormData('tags', (formData.tags || []).filter((tag: string) => tag !== tagToRemove));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(newTag);
    }
  };

  // Tags suggérés basés sur le type d'œuvre
  useEffect(() => {
    const suggestions: Record<string, string[]> = {
      livre: ['littérature', 'roman', 'poésie', 'essai', 'histoire', 'culture'],
      film: ['documentaire', 'fiction', 'court-métrage', 'animation', 'cinéma'],
      musique: ['chaabi', 'raï', 'andalou', 'kabyle', 'traditionnel', 'moderne'],
      art: ['peinture', 'sculpture', 'contemporain', 'traditionnel', 'abstrait'],
      artisanat: ['poterie', 'tissage', 'bijoux', 'cuir', 'bois', 'traditionnel']
    };

    const typeCode = metadata.types_oeuvres?.find(
      (t: any) => t.id_type_oeuvre === formData.id_type_oeuvre
    )?.code?.toLowerCase() || '';

    setSuggestedTags(suggestions[typeCode] || ['culture', 'algérie', 'patrimoine']);
  }, [formData.id_type_oeuvre, metadata]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-serif">
          {t('oeuvre.steps.categories.title', 'Catégories & Tags')}
        </CardTitle>
        <CardDescription>
          {t('oeuvre.steps.categories.description', 'Classifiez votre œuvre pour faciliter sa découverte')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Section Catégories */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-primary" />
            <Label className="text-lg font-medium">
              {t('oeuvre.fields.categories', 'Catégories')}
            </Label>
          </div>

          {loadingCategories ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-28" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : categoriesGrouped.length > 0 ? (
            <div className="space-y-6">
              {categoriesGrouped.map((group) => (
                <div key={group.id_genre} className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                    {group.nom_genre}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {group.categories.map((category) => {
                      const isSelected = isCategorySelected(category.id_categorie);
                      return (
                        <button
                          key={category.id_categorie}
                          type="button"
                          onClick={() => handleCategoryToggle(category.id_categorie)}
                          className={`
                            px-3 py-1.5 rounded-full text-sm border transition-all
                            ${isSelected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background hover:bg-muted border-border'
                            }
                          `}
                        >
                          {category.nom}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              {t('oeuvre.steps.categories.noCategories', 'Aucune catégorie disponible pour ce type d\'œuvre.')}
            </p>
          )}

          {/* Résumé des catégories sélectionnées */}
          {(formData.categories || []).length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                {t('oeuvre.steps.categories.selected', '{{count}} catégorie(s) sélectionnée(s)', {
                  count: formData.categories.length
                })}
              </p>
            </div>
          )}
        </div>

        {/* Section Tags */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <Label className="text-lg font-medium">
              {t('oeuvre.fields.tags', 'Tags / Mots-clés')}
            </Label>
          </div>

          {/* Input pour nouveau tag */}
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={handleTagKeyPress}
              placeholder={t('oeuvre.fields.tagsPlaceholder', 'Ajouter un tag...')}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => handleAddTag(newTag)}
              disabled={!newTag.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Tags sélectionnés */}
          {(formData.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag: string) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="pl-3 pr-1 py-1 flex items-center gap-1"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Tags suggérés */}
          {suggestedTags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                {t('oeuvre.steps.categories.suggestions', 'Suggestions')}
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedTags
                  .filter((tag) => !(formData.tags || []).includes(tag))
                  .map((tag) => (
                    <Button
                      key={tag}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddTag(tag)}
                      className="text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {tag}
                    </Button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Erreurs */}
        {errors.categories && (
          <p className="text-sm text-destructive">{errors.categories}</p>
        )}
        {errors.tags && (
          <p className="text-sm text-destructive">{errors.tags}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default StepCategories;
