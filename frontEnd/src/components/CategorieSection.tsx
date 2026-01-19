import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Label } from '@/components/UI/label';
import { Checkbox } from '@/components/UI/checkbox';
import { Badge } from '@/components/UI/badge';
import { Alert, AlertDescription } from '@/components/UI/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { metadataService } from '@/services/metadata.service';
import type { CategoryGroupedByGenre } from '@/services/metadata.service';import { useTranslation } from "react-i18next";
import { t } from 'i18next';

interface CategorySelectionProps {
  typeOeuvreId: number;
  selectedCategories: number[];
  onCategoriesChange: (categories: number[]) => void;
}

const CategorySelection: React.FC<CategorySelectionProps> = React.memo(({
  typeOeuvreId,
  selectedCategories,
  onCategoriesChange
}) => {
  const [categoriesGrouped, setCategoriesGrouped] = useState<CategoryGroupedByGenre[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCategories, setHasCategories] = useState(true);

  useEffect(() => {
    if (typeOeuvreId > 0) {
      loadCategoriesForType();
    }
  }, [typeOeuvreId]);

  const loadCategoriesForType = async () => {
    try {
      setLoading(true);
      setError(null);

      const hasCategories = await metadataService.checkIfTypeHasCategories(typeOeuvreId);
      setHasCategories(hasCategories);

      if (!hasCategories) {
        setCategoriesGrouped([]);
        return;
      }

      const response = await metadataService.getCategoriesForType(typeOeuvreId);

      if (response.success && response.data) {
        setCategoriesGrouped(response.data);

        const availableCategoryIds = response.data.flatMap((g) => g.categories.map((c) => c.id_categorie));
        const validCategories = selectedCategories.filter((id) => availableCategoryIds.includes(id));

        if (validCategories.length !== selectedCategories.length) {
          onCategoriesChange(validCategories);
        }
      } else {
        throw new Error(response.error || 'Erreur inconnue');
      }
    } catch (err) {
      console.error('Erreur chargement catégories:', err);
      setError('Impossible de charger les catégories disponibles');
      setCategoriesGrouped([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryToggle = useCallback((categoryId: number) => {
    const newCategories = selectedCategories.includes(categoryId) ?
    selectedCategories.filter((id) => id !== categoryId) :
    [...selectedCategories, categoryId];
    onCategoriesChange(newCategories);
  }, [selectedCategories, onCategoriesChange]);

  const handleGenreToggleAll = useCallback((genreId: number) => {
    const genre = categoriesGrouped.find((g) => g.id_genre === genreId);
    if (!genre) return;

    const genreCategoryIds = genre.categories.map((c) => c.id_categorie);
    const allSelected = genreCategoryIds.every((id) => selectedCategories.includes(id));

    if (allSelected) {
      onCategoriesChange(selectedCategories.filter((id) => !genreCategoryIds.includes(id)));
    } else {
      const newCategories = [...new Set([...selectedCategories, ...genreCategoryIds])];
      onCategoriesChange(newCategories);
    }
  }, [categoriesGrouped, selectedCategories, onCategoriesChange]);

  if (loading) {
    return (
      <Card className="shadow-cultural">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2">{t("common_categoriesection.chargement_des_catgories")}</span>
        </CardContent>
      </Card>);

  }

  if (!hasCategories) {
    return null;
  }

  if (error) {
    return (
      <Card className="shadow-cultural">
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>);

  }

  if (categoriesGrouped.length === 0) {
    return (
      <Card className="shadow-cultural">
        <CardHeader>
          <CardTitle className="text-2xl font-serif">{t("common_categoriesection.catgories_1")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t("common_categoriesection.aucune_catgorie_disponible")}

          </p>
        </CardContent>
      </Card>);

  }

  return (
    <Card className="shadow-cultural">
      <CardHeader>
        <CardTitle className="text-2xl font-serif">{t("common_categoriesection.catgories_1")}</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">{t("common_categoriesection.slectionnez_une_plusieurs")}

        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {categoriesGrouped.map((genre) => {
          const genreCategoryIds = genre.categories.map((c) => c.id_categorie);
          const selectedCount = genreCategoryIds.filter((id) => selectedCategories.includes(id)).length;
          const allSelected = selectedCount === genre.categories.length && genre.categories.length > 0;

          return (
            <div key={genre.id_genre} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">
                  {genre.nom}
                  {selectedCount > 0 &&
                  <Badge variant="secondary" className="ml-2">
                      {selectedCount}/{genre.categories.length}
                    </Badge>
                  }
                </h3>
                {genre.categories.length > 1 &&
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleGenreToggleAll(genre.id_genre)}
                  className="text-xs">
                  
                    {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </Button>
                }
              </div>
              
              {genre.description &&
              <p className="text-sm text-muted-foreground">{genre.description}</p>
              }
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ps-4">
                {genre.categories.map((category) =>
                <div key={category.id_categorie} className="flex items-start gap-2">
                    <Checkbox
                    id={`cat-${category.id_categorie}`}
                    checked={selectedCategories.includes(category.id_categorie)}
                    onCheckedChange={() => handleCategoryToggle(category.id_categorie)}
                    className="mt-0.5 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
                  
                    <Label
                    htmlFor={`cat-${category.id_categorie}`}
                    className="text-sm font-normal cursor-pointer hover:text-primary flex-1">
                    
                      <span className="font-medium">{category.nom}</span>
                      {category.description &&
                    <span className="block text-xs text-muted-foreground mt-1">
                          {category.description}
                        </span>
                    }
                    </Label>
                  </div>
                )}
              </div>
            </div>);

        })}
      </CardContent>
    </Card>);

});

CategorySelection.displayName = 'CategorySelection';

export default CategorySelection;