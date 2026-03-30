import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload, Save, ArrowLeft, X, Plus, AlertCircle,
  Book, Film, Music, FileText, Beaker, Palette, Hammer, Loader2, Star,
  Edit } from
'lucide-react';
import { TypeUser } from '@/types/models/type-user.types';

// Import des services
import { mediaService } from '@/services/media.service';
import { metadataService, CategoryGroupedByGenre } from '@/services/metadata.service';
import { oeuvreService } from '@/services/oeuvre.service';
import { articleBlockService } from '@/services/articleBlock.service';
import { httpClient } from '@/services/httpClient';
import { useAuth } from '@/hooks/useAuth';
import { useRTL } from '@/hooks/useRTL';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { mapToBackendDTO } from '@/types/api/create-oeuvre-backend.dto';
import { getTranslation, type SupportedLanguage } from '@/types/common/multilingual.types';
import ArticleEditor from '@/components/article/ArticleEditor';

// Import du composant de gestion des intervenants
import IntervenantEditeurManager from '@/components/oeuvre/IntervenantEditeurManager';

// Import des types
import type { TagMotCle, Editeur, TypeOeuvre, Langue, Categorie, Materiau, Technique } from '@/types/models/references.types';
import type { Oeuvre } from '@/types/models/oeuvre.types';
import type { ArticleBlock, ArticleSaveResponse, ArticleFormData } from '@/types/models/articles.types';
import type {
  IntervenantExistant,
  NouvelIntervenant,
  ContributeurOeuvre,
  EditeurOeuvre,
  DetailsSpecifiques,
  CreateOeuvreCompleteDTO } from
'@/types/api/oeuvre-creation.types';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// TYPES LOCAUX
// ============================================================================

// Type pour les médias
import { useTranslation } from "react-i18next";
import MultiLangInput from '@/components/MultiLangInput';
interface MediaUpload {
  id: string;
  file: File;
  preview?: string;
  type: 'image' | 'video' | 'audio' | 'document';
  isPrincipal: boolean;
  titre?: string;
  description?: string;
  uploadProgress?: number;
}

// Type pour les métadonnées étendues
interface ExtendedMetadata {
  types_oeuvres?: TypeOeuvre[];
  langues?: Langue[];
  categories?: Categorie[];
  materiaux?: Materiau[];
  techniques?: Technique[];
  editeurs?: Editeur[];
  tags?: TagMotCle[];
  types_users?: TypeUser[];
}

// Type pour le formulaire
interface FormData {
  // Champs généraux
  titre: { fr: string; ar: string; en: string; 'tz-ltn'?: string; 'tz-tfng'?: string };
  description: { fr: string; ar: string; en: string; 'tz-ltn'?: string; 'tz-tfng'?: string };
  id_type_oeuvre: number;
  id_langue: number;
  annee_creation?: number;
  prix?: number;
  categories: number[];
  tags: string[];

  // Traduction
  is_traduction?: boolean;
  id_oeuvre_originale?: number;
  oeuvre_originale_titre?: string;

  // Champs spécifiques selon le type
  isbn?: string;
  nb_pages?: number;
  duree_minutes?: number;
  realisateur?: string;
  duree_album?: string;
  label?: string;
  nb_pistes?: number;
  auteur?: string;
  source?: string;
  resume_article?: string;
  url_source?: string;
  journal?: string;
  doi?: string;
  pages?: string;
  volume?: string;
  numero?: string;
  peer_reviewed?: boolean;
  id_materiau?: number;
  id_technique?: number;
  dimensions?: string;
  poids?: number;
  technique_art?: string;
  dimensions_art?: string;
  support?: string;
}

// Type for the article editor save response (expands on ArticleSaveResponse)
interface ArticleEditorSavePayload {
  article: {
    formData: ArticleFormData;
    blocks: ArticleBlock[];
    contributeurs?: {
      existants?: IntervenantExistant[];
      contributeurs?: ContributeurOeuvre[];
      nouveaux?: NouvelIntervenant[];
    };
    editeurs?: Array<EditeurOeuvre | number>;
    id_oeuvre?: number;
    titre?: string;
    [key: string]: unknown;
  };
  blocks?: ArticleBlock[];
}

// Type for the media upload response
interface MediaUploadResult {
  id_media: number;
  url?: string;
  [key: string]: unknown;
}

// Type for an article block as saved to the backend
interface ArticleBlockToSave {
  type_block: string;
  contenu: string;
  contenu_json: unknown;
  metadata: Record<string, unknown>;
  id_media: number | null;
  ordre: number;
  visible: boolean;
  id_article?: number;
}

// État initial du formulaire
const INITIAL_FORM_DATA: FormData = {
  titre: { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
  description: { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
  id_type_oeuvre: 0,
  id_langue: 1,
  categories: [],
  tags: []
};

// ============================================================================
// COMPOSANTS INTERNES
// ============================================================================

// Composant de sélection des catégories
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
  const { t } = useTranslation();
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
        throw new Error(response.error || t('common.unknownError', 'Erreur inconnue'));
      }
    } catch (err) {
      console.error('Erreur chargement catégories:', err);
      setError(t('ajouteroeuvre.categoriesLoadError', 'Impossible de charger les catégories'));
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
          <span className="ms-2">{t("ajouteroeuvre.chargement_des_catgories")}</span>
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
          <CardTitle className="text-2xl font-serif">{t("ajouteroeuvre.catgories_1")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t("ajouteroeuvre.aucune_catgorie_disponible")}

          </p>
        </CardContent>
      </Card>);

  }

  return (
    <Card className="shadow-cultural">
      <CardHeader>
        <CardTitle className="text-2xl font-serif">{t("ajouteroeuvre.catgories_1")}</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">{t("ajouteroeuvre.slectionnez_une_plusieurs")}

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
                  <Badge variant="secondary" className="ms-2">
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

                    {allSelected ? t('ajouteroeuvre.deselectAll', 'Tout désélectionner') : t('ajouteroeuvre.selectAll', 'Tout sélectionner')}
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

// Composant pour sélectionner le mode d'édition des articles
interface EditorModeSelectorProps {
  metadata: ExtendedMetadata;
  formData: FormData;
  showEditorChoice: boolean;
  useArticleEditor: boolean;
  setUseArticleEditor: (value: boolean) => void;
}

const EditorModeSelector: React.FC<EditorModeSelectorProps> = ({
  metadata,
  formData,
  showEditorChoice,
  useArticleEditor,
  setUseArticleEditor
}) => {
  const { t } = useTranslation();
  const typeOeuvre = metadata.types_oeuvres?.find((type: TypeOeuvre) => type.id_type_oeuvre === formData.id_type_oeuvre);
  const isArticleType = typeOeuvre && (
  typeOeuvre.nom_type === 'Article' ||
  typeOeuvre.nom_type === 'Article Scientifique');


  if (!isArticleType || !showEditorChoice) return null;

  return (
    <Card className="shadow-cultural">
      <CardHeader>
        <CardTitle className="text-2xl font-serif">{t("ajouteroeuvre.mode_ddition")}</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">{t("ajouteroeuvre.choisissez_comment_crer")}

        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setUseArticleEditor(false)}
            className={`p-6 rounded-lg border-2 transition-all hover-lift ${
            !useArticleEditor ?
            'border-primary bg-primary/5 shadow-md' :
            'border-border hover:border-primary/50'}`
            }>

            <FileText className="h-8 w-8 mb-3 mx-auto text-primary" />
            <h3 className="font-semibold mb-2">{t("ajouteroeuvre.formulaire_classique")}</h3>
            <p className="text-sm text-muted-foreground">{t("ajouteroeuvre.simple_rapide_pour")}

            </p>
          </button>
          
          <button
            type="button"
            onClick={() => setUseArticleEditor(true)}
            className={`p-6 rounded-lg border-2 transition-all hover-lift ${
            useArticleEditor ?
            'border-primary bg-primary/5 shadow-md' :
            'border-border hover:border-primary/50'}`
            }>

            <Edit className="h-8 w-8 mb-3 mx-auto text-primary" />
            <h3 className="font-semibold mb-2">{t("ajouteroeuvre.diteur_avanc")}</h3>
            <p className="text-sm text-muted-foreground">{t("ajouteroeuvre.mise_page_riche")}

            </p>
          </button>
        </div>
        
        {useArticleEditor &&
        <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t("ajouteroeuvre.lditeur_avanc_vous")}

            <ul className="list-disc list-inside mt-2 text-sm">
                <li>{t("ajouteroeuvre.titres_soustitres_hirarchiss")}</li>
                <li>{t("ajouteroeuvre.images_avec_lgendes")}</li>
                <li>{t("ajouteroeuvre.citations_mises_forme")}</li>
                <li>{t("ajouteroeuvre.listes_tableaux")}</li>
                <li>{t("ajouteroeuvre.blocs_code_pour")}</li>
              </ul>
            </AlertDescription>
          </Alert>
        }
      </CardContent>
    </Card>);

};

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

/** Extrait le nom lisible d'un tag (gère JSON multilingue et string) */
const getTagName = (nom: unknown, lang: SupportedLanguage = 'fr'): string => {
  if (!nom) return '';
  if (typeof nom === 'string') return nom;
  if (typeof nom === 'object' && nom !== null) {
    const record = nom as Record<string, string | undefined>;
    return record[lang] || record.fr || record.ar || record.en || '';
  }
  return String(nom);
};

const AjouterOeuvre: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'fr') as SupportedLanguage;
  const { toast } = useToast();
  const { direction } = useRTL();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const editId = id ? parseInt(id) : null;

  // État de chargement et erreurs
  const [loading, setLoading] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // Authentification
  const { isAuthenticated, user: authUser } = useAuth();
  const user = useMemo(() => {
    try {
      return authUser || null;
    } catch (e) {
      return null;
    }
  }, []);

  // État du formulaire
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);

  // État pour les contributeurs
  const [intervenantsExistants, setIntervenantsExistants] = useState<IntervenantExistant[]>([]);
  const [nouveauxIntervenants, setNouveauxIntervenants] = useState<NouvelIntervenant[]>([]);
  const [contributeurs, setContributeurs] = useState<ContributeurOeuvre[]>([]);
  const [editeurs, setEditeurs] = useState<EditeurOeuvre[]>([]);

  // État pour recherche oeuvre originale (traduction)
  const [searchOeuvreResults, setSearchOeuvreResults] = useState<any[]>([]);

  // État pour les médias
  const [medias, setMedias] = useState<MediaUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // État pour les métadonnées
  const [metadata, setMetadata] = useState<ExtendedMetadata>({
    types_oeuvres: [],
    langues: [],
    categories: [],
    materiaux: [],
    techniques: [],
    tags: [],
    editeurs: [],
    types_users: []
  });

  // État pour les tags
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // États pour ArticleEditor
  const [useArticleEditor, setUseArticleEditor] = useState(false);
  const [showEditorChoice, setShowEditorChoice] = useState(false);

  // Track unsaved changes
  const isDirty = formData.titre.fr !== '' || formData.titre.ar !== '' || formData.description.fr !== '' || formData.description.ar !== '' || formData.id_type_oeuvre !== 0 || medias.length > 0;
  useUnsavedChanges(isDirty);

  // ============================================================================
  // EFFETS
  // ============================================================================

  // Charger les métadonnées au montage
  useEffect(() => {
    loadMetadata();
  }, []);

  // Charger les données existantes en mode édition
  useEffect(() => {
    if (isEditMode && editId && !loadingMetadata) {
      loadExistingOeuvre();
    }
  }, [isEditMode, editId, loadingMetadata]);

  const loadExistingOeuvre = async () => {
    if (!editId) return;
    try {
      setLoadingEdit(true);
      const response = await oeuvreService.getById(editId);
      if (response.success && response.data) {
        const oeuvre = response.data as Oeuvre & Record<string, unknown>;
        const titre = oeuvre.titre;
        const description = oeuvre.description;
        const rawCategories = (oeuvre.Categories ?? (oeuvre as unknown as Record<string, unknown>).categories ?? []) as Array<Categorie | number>;
        const rawTags = (oeuvre.Tags ?? (oeuvre as unknown as Record<string, unknown>).tags ?? []) as Array<TagMotCle | string>;
        const filmData = (oeuvre['Film'] ?? oeuvre['film'] ?? {}) as Record<string, unknown>;
        const articleData = (oeuvre['Article'] ?? oeuvre['article'] ?? {}) as Record<string, unknown>;
        const articleScientifiqueData = (oeuvre['ArticleScientifique'] ?? oeuvre['article_scientifique'] ?? {}) as Record<string, unknown>;
        setFormData({
          titre: typeof titre === 'object' && titre !== null ? titre : { fr: typeof titre === 'string' ? titre : '', ar: '', en: '' },
          description: typeof description === 'object' && description !== null ? description : { fr: typeof description === 'string' ? description : '', ar: '', en: '' },
          id_type_oeuvre: oeuvre.id_type_oeuvre || 0,
          id_langue: oeuvre.id_langue || 1,
          categories: rawCategories.map((c) => typeof c === 'object' && c !== null ? c.id_categorie : c) || [],
          tags: rawTags.map((t) => {
            if (typeof t === 'object' && t !== null && 'nom' in t) {
              const nom = (t as TagMotCle).nom;
              if (typeof nom === 'string') return nom;
              if (nom && typeof nom === 'object') return nom.fr || nom.ar || nom.en || Object.values(nom)[0] || '';
            }
            return String(t);
          }).filter(Boolean) || [],
          annee_creation: oeuvre.annee_creation,
          prix: oeuvre.prix,
          isbn: oeuvre['isbn'] as string | undefined,
          nb_pages: oeuvre['nb_pages'] as number | undefined,
          duree_minutes: (filmData['duree_minutes'] ?? oeuvre['duree_minutes']) as number | undefined,
          realisateur: (filmData['realisateur'] ?? oeuvre['realisateur']) as string | undefined,
          duree_album: oeuvre['duree_album'] as string | undefined,
          label: oeuvre['label'] as string | undefined,
          nb_pistes: oeuvre['nb_pistes'] as number | undefined,
          auteur: (articleData['auteur'] ?? oeuvre['auteur']) as string | undefined,
          source: (articleData['source'] ?? oeuvre['source']) as string | undefined,
          resume_article: (articleData['resume'] ?? oeuvre['resume_article']) as string | undefined,
          url_source: (articleData['url_source'] ?? oeuvre['url_source']) as string | undefined,
          journal: (articleScientifiqueData['journal'] ?? oeuvre['journal']) as string | undefined,
          doi: (articleScientifiqueData['doi'] ?? oeuvre['doi']) as string | undefined,
          pages: (articleScientifiqueData['pages'] ?? oeuvre['pages']) as string | undefined,
          volume: (articleScientifiqueData['volume'] ?? oeuvre['volume']) as string | undefined,
          numero: (articleScientifiqueData['numero'] ?? oeuvre['numero']) as string | undefined,
          peer_reviewed: (articleScientifiqueData['peer_reviewed'] ?? oeuvre['peer_reviewed']) as boolean | undefined,
          id_materiau: oeuvre['id_materiau'] as number | undefined,
          id_technique: oeuvre['id_technique'] as number | undefined,
          dimensions: oeuvre['dimensions'] as string | undefined,
          poids: oeuvre['poids'] as number | undefined,
          technique_art: oeuvre['technique_art'] as string | undefined,
          dimensions_art: oeuvre['dimensions_art'] as string | undefined,
          support: oeuvre['support'] as string | undefined,
        });
        // Oeuvre loaded for editing
      } else {
        toast({ title: t('toasts.error'), description: t('toasts.oeuvreNotFound'), variant: 'destructive' });
        navigate('/dashboard-pro');
      }
    } catch (error: unknown) {
      console.error('❌ Erreur chargement œuvre:', error);
      toast({ title: t('toasts.error'), description: t('toasts.oeuvreLoadFailed'), variant: 'destructive' });
    } finally {
      setLoadingEdit(false);
    }
  };

  // Générer des suggestions de tags quand le contenu change
  useEffect(() => {
    generateTagSuggestions();
  }, [formData.titre, formData.description, formData.id_type_oeuvre]);

  // Nettoyer les URLs des aperçus au démontage
  useEffect(() => {
    return () => {
      medias.forEach((media) => {
        if (media.preview) {
          URL.revokeObjectURL(media.preview);
        }
      });
    };
  }, []);

  // Détecter le changement de type d'œuvre pour les articles
  useEffect(() => {
    if (!metadata.types_oeuvres || metadata.types_oeuvres.length === 0) return;

    const typeOeuvre = metadata.types_oeuvres.find((type: TypeOeuvre) => type.id_type_oeuvre === formData.id_type_oeuvre);

    // Vérifier si c'est un type Article
    const isArticleType = typeOeuvre && (
    typeOeuvre.nom_type === 'Article' ||
    typeOeuvre.nom_type === 'Article Scientifique');


    // Afficher le choix d'éditeur uniquement pour les articles
    setShowEditorChoice(isArticleType);

    // Si ce n'est pas un article, désactiver l'éditeur avancé
    if (!isArticleType) {
      setUseArticleEditor(false);
    }
  }, [formData.id_type_oeuvre, metadata.types_oeuvres]);

  // ============================================================================
  // FONCTIONS UTILITAIRES
  // ============================================================================

  const loadMetadata = async () => {
    try {
      setLoadingMetadata(true);

      const response = await metadataService.getAllCached();

      if (response.success && response.data) {
        setMetadata(response.data as ExtendedMetadata);
      } else {
        setSubmitError(response.error || t('oeuvre.errors.loadRefFailed', 'Impossible de charger les données de référence'));
      }
    } catch (error) {
      console.error('Erreur chargement métadonnées:', error);
      setSubmitError(t('oeuvre.errors.connectionError', 'Erreur de connexion au serveur. Veuillez réessayer.'));
    } finally {
      setLoadingMetadata(false);
    }
  };

  const generateTagSuggestions = useCallback(() => {
    if (!metadata.types_oeuvres || metadata.types_oeuvres.length === 0) return;

    const suggestions: string[] = [];
    const typeOeuvre = metadata.types_oeuvres.find((type: TypeOeuvre) => type.id_type_oeuvre === formData.id_type_oeuvre);

    // Tags basés sur le type d'œuvre
    if (typeOeuvre) {
      const typeTags: Record<string, string[]> = {
        'Livre': ['littérature', 'lecture', 'roman'],
        'Film': ['cinéma', 'audiovisuel', 'réalisation'],
        'Artisanat': ['fait-main', 'artisanal', 'traditionnel'],
        'Article Scientifique': ['recherche', 'science', 'académique']
      };

      if (typeTags[typeOeuvre.nom_type]) {
        suggestions.push(...typeTags[typeOeuvre.nom_type]);
      }
    }

    // Tags basés sur le contenu
    const text = `${formData.titre} ${formData.description}`.toLowerCase();
    const keywords = ['algérie', 'maghreb', 'berbère', 'tradition', 'moderne', 'contemporain', 'patrimoine', 'culture'];

    keywords.forEach((keyword) => {
      if (text.includes(keyword) && !suggestions.includes(keyword)) {
        suggestions.push(keyword);
      }
    });

    setSuggestedTags(suggestions.slice(0, 8));
  }, [metadata.types_oeuvres, formData.id_type_oeuvre, formData.titre, formData.description]);

  const getTypeIcon = useCallback((typeId: number) => {
    const icons: Record<number, React.ReactNode> = {
      1: <Book className="h-5 w-5" />,
      2: <Film className="h-5 w-5" />,
      3: <Music className="h-5 w-5" />,
      4: <FileText className="h-5 w-5" />,
      5: <Beaker className="h-5 w-5" />,
      6: <Palette className="h-5 w-5" />,
      7: <Hammer className="h-5 w-5" />,
      8: <Palette className="h-5 w-5" />
    };
    return icons[typeId] ?? <FileText className="h-5 w-5" />;
  }, []);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleInputChange = useCallback((field: keyof FormData, value: FormData[keyof FormData]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleTagAdd = useCallback(async (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase();

    if (formData.tags.length >= 10) return;
    if (normalizedTag && !formData.tags.includes(normalizedTag)) {
      // Vérifier si le tag existe déjà (comparer sur toutes les langues du JSON)
      const existingTag = metadata.tags?.find((t: TagMotCle) =>
        getTagName(t.nom, lang).toLowerCase() === normalizedTag
      );

      // Si le tag n'existe pas, le créer (le backend fait aussi un findOrCreate)
      if (!existingTag && metadata.tags) {
        try {
          const response = await metadataService.createTag({ nom: normalizedTag });
          if (response.success && response.data) {
            setMetadata((prev) => ({
              ...prev,
              tags: [...(prev.tags || []), response.data!]
            }));
          }
        } catch (error) {
          console.error('Erreur création tag:', error);
        }
      }

      setFormData((prev) => ({ ...prev, tags: [...prev.tags, normalizedTag] }));
      setNewTag('');
      setShowTagSuggestions(false);
    }
  }, [formData.tags, metadata.tags, lang]);

  const handleTagRemove = useCallback((tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag)
    }));
  }, []);

  const handleMediaUpload = useCallback((files: FileList) => {
    const newMedias: MediaUpload[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      // Validation
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        errors.push(`${file.name}: ${t('validation.fileTooLarge', 'Fichier trop volumineux')} (max 100MB)`);
        return;
      }

      const type = file.type.startsWith('image/') ? 'image' :
      file.type.startsWith('video/') ? 'video' :
      file.type.startsWith('audio/') ? 'audio' : 'document';

      const media: MediaUpload = {
        id: `media-${Date.now()}-${Math.random()}`,
        file,
        type,
        isPrincipal: medias.length === 0 && newMedias.length === 0, // Première image = principale
        preview: type === 'image' ? URL.createObjectURL(file) : undefined
      };

      newMedias.push(media);
    });

    if (errors.length > 0) {
      toast({
        title: t('ajouteroeuvre.erreur_upload'),
        description: errors.join('\n'),
        variant: 'destructive',
      });
    }

    if (newMedias.length > 0) {
      setMedias((prev) => [...prev, ...newMedias]);
    }
  }, [medias.length]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleMediaUpload(files);
    }
  }, [handleMediaUpload]);

  const handleMediaRemove = useCallback((mediaId: string) => {
    const media = medias.find((m) => m.id === mediaId);
    if (media?.preview) {
      URL.revokeObjectURL(media.preview);
    }

    setMedias((prev) => {
      const updated = prev.filter((m) => m.id !== mediaId);
      // Si on supprime l'image principale et qu'il reste des images
      if (media?.isPrincipal && updated.length > 0) {
        updated[0].isPrincipal = true;
      }
      return updated;
    });
  }, [medias]);

  const handleSetPrincipalMedia = useCallback((mediaId: string) => {
    setMedias((prev) => prev.map((m) => ({
      ...m,
      isPrincipal: m.id === mediaId
    })));
  }, []);

  const handleIntervenantsChange = useCallback((
  existants: IntervenantExistant[],
  nouveaux: NouvelIntervenant[],
  contributeurs: ContributeurOeuvre[]) =>
  {
    setIntervenantsExistants(existants);
    setNouveauxIntervenants(nouveaux);
    setContributeurs(contributeurs);
  }, []);

  const handleEditeursChange = useCallback((editeurs: EditeurOeuvre[]) => {
    setEditeurs(editeurs);
  }, []);

  // Handler pour la sauvegarde depuis ArticleEditor
  const handleArticleEditorSave = useCallback(async (response: ArticleSaveResponse) => {

    try {
      const articlePayload = response.article as unknown as ArticleEditorSavePayload['article'];
      const { formData: articleFormData, blocks, contributeurs: contribs, editeurs: eds } = articlePayload;

      // 1. Déterminer le type d'oeuvre (article=4, article_scientifique=5)
      const isScientific = articleFormData.type === 'article_scientifique';
      const id_type_oeuvre = isScientific ? 5 : 4;

      // 2. Préparer les détails spécifiques selon le type
      const details_specifiques: DetailsSpecifiques = {};
      if (isScientific) {
        details_specifiques.article_scientifique = {
          journal: articleFormData.journal || undefined,
          doi: articleFormData.doi || undefined,
          volume: articleFormData.volume || undefined,
          numero: articleFormData.numero || undefined,
          pages: articleFormData.pages || undefined,
          peer_reviewed: articleFormData.peer_reviewed || false,
        };
      } else {
        details_specifiques.article = {
          auteur: articleFormData.auteur || undefined,
          source: articleFormData.source || undefined,
          resume: articleFormData.resume || undefined,
          url_source: articleFormData.url_source || undefined,
        };
      }

      // 3. Préparer les contributeurs
      // contribs.existants = IntervenantExistant[] (id_intervenant, id_type_user)
      // contribs.contributeurs = ContributeurOeuvre[] (id_user, id_type_user)
      // contribs.nouveaux = NouvelIntervenant[] (nom, prenom, etc.)
      const utilisateurs_inscrits = contribs?.contributeurs?.map((c: ContributeurOeuvre) => ({
        id_user: c.id_user,
        id_type_user: c.id_type_user,
        personnage: c.personnage || c.description_role || ''
      })) || [];

      const intervenants_existants = contribs?.existants?.map((c: IntervenantExistant) => ({
        id_intervenant: c.id_intervenant,
        id_type_user: c.id_type_user,
        personnage: c.personnage || ''
      })) || [];

      const nouveaux_intervenants = contribs?.nouveaux?.map((c: NouvelIntervenant) => ({
        nom: c.nom,
        prenom: c.prenom,
        role: c.personnage || 'Contributeur',
        id_type_user: c.id_type_user
      })) || [];

      const editeursIds = eds?.map((e: EditeurOeuvre | number) => typeof e === 'object' ? e.id_editeur : e) || [];

      // 4. Créer l'oeuvre via l'API
      const oeuvreData = {
        titre: articleFormData.titre,
        description: articleFormData.description,
        id_type_oeuvre,
        id_langue: articleFormData.id_langue,
        annee_creation: articleFormData.annee_creation || new Date().getFullYear(),
        categories: articleFormData.categories || [],
        tags: articleFormData.tags || [],
        details_specifiques,
        utilisateurs_inscrits,
        intervenants_existants,
        intervenants_non_inscrits: [],
        nouveaux_intervenants,
        editeurs: editeursIds,
      };

      const oeuvreResponse = await oeuvreService.createOeuvre(oeuvreData);

      if (!oeuvreResponse.success || !oeuvreResponse.data?.oeuvre?.id_oeuvre) {
        throw new Error(oeuvreResponse.error || t('ajouteroeuvre.articleCreateError', 'Erreur lors de la création de l\'article'));
      }

      const oeuvreId = oeuvreResponse.data.oeuvre.id_oeuvre;

      const articleRecordId = (() => {
        const d = oeuvreResponse.data;
        
        if (isScientific) {
          const id =
            d.subtype?.id_article_scientifique ||
            d.article_scientifique?.id_article_scientifique ||
            d.oeuvre?.ArticleScientifique?.id_article_scientifique ||
            d.oeuvre?.article_scientifique?.id_article_scientifique ||
            d.ArticleScientifique?.id_article_scientifique ||
            d.details_specifiques_record?.id_article_scientifique;
          return id;
        }
        const id =
          d.subtype?.id_article ||
          d.article?.id_article ||
          d.oeuvre?.Article?.id_article ||
          d.oeuvre?.article?.id_article ||
          d.Article?.id_article ||
          d.details_specifiques_record?.id_article;
        return id;
      })();

      // 5. Sauvegarder les blocs si présents
      let finalArticleRecordId = articleRecordId;
      if (blocks && blocks.length > 0) {
        // Fallback: si l'ID n'est pas dans la réponse de création, le récupérer via GET /oeuvres/:id
        if (!finalArticleRecordId) {
          console.warn('⚠️ articleRecordId non trouvé dans la réponse, tentative de récupération via GET...');
          try {
            const oeuvreDetail = await oeuvreService.getOeuvreById(oeuvreId);
            if (oeuvreDetail.success && oeuvreDetail.data) {
              const od = oeuvreDetail.data as Oeuvre & Record<string, unknown>;
              if (isScientific) {
                const altScientific = (od['article_scientifique'] as { id_article_scientifique?: number } | undefined);
                finalArticleRecordId = od.ArticleScientifique?.id_article_scientifique
                  || altScientific?.id_article_scientifique;
              } else {
                const altArticle = (od['article'] as { id_article?: number } | undefined);
                finalArticleRecordId = od.Article?.id_article
                  || altArticle?.id_article;
              }
            }
          } catch (fallbackErr) {
            console.error('❌ Fallback GET oeuvre échoué:', fallbackErr);
          }
        }

        if (!finalArticleRecordId) {
          console.error('❌ ID article spécifique manquant! Réponse backend:', JSON.stringify(oeuvreResponse.data, null, 2));
          toast({
            title: t('toasts.warning'),
            description: t('toasts.articleCreatedBlocksFailed'),
            variant: 'destructive',
          });
        }

        // 5a. Upload des images des blocs image qui ont un tempFile
        const blocksWithMedia = await Promise.all(
          blocks.map(async (block: ArticleBlock, index: number) => {
            let id_media = block.id_media || null;

            // Si le bloc a un fichier temporaire (image uploadée dans l'éditeur), l'envoyer au serveur
            if (block.type_block === 'image' && block.metadata?.tempFile instanceof File) {
              try {
                // Upload direct via FormData vers le endpoint multer
                const formData = new FormData();
                formData.append('files', block.metadata.tempFile);
                const uploadResult = await httpClient.postFormData<MediaUploadResult | MediaUploadResult[]>(
                  `/oeuvres/${oeuvreId}/medias/upload`,
                  formData
                );
                if (uploadResult.success && uploadResult.data) {
                  // Le backend retourne un tableau de medias créés
                  const medias = Array.isArray(uploadResult.data) ? uploadResult.data : [uploadResult.data];
                  if (medias[0]?.id_media) {
                    id_media = medias[0].id_media;
                  }
                } else {
                  console.warn(`⚠️ Échec upload image bloc ${index}:`, uploadResult.error);
                }
              } catch (uploadErr) {
                console.warn(`⚠️ Erreur upload image bloc ${index}:`, uploadErr);
              }
            }

            return { block, id_media, index };
          })
        );

        const blocksToSave = blocksWithMedia.map(({ block, id_media, index }) => {
          // Nettoyer les metadata (retirer tempFile et autres objets non-sérialisables)
          const cleanMetadata = block.metadata ? { ...block.metadata } : {};
          delete cleanMetadata.tempFile;
          
          return {
            type_block: block.type_block,
            contenu: block.contenu || '',
            contenu_json: block.contenu_json || null,
            metadata: cleanMetadata,
            id_media,
            ordre: index,
            visible: true,
          };
        });

        const blocksResponse = finalArticleRecordId ? await articleBlockService.createMultipleBlocks({
          id_article: finalArticleRecordId,
          article_type: isScientific ? 'article_scientifique' : 'article',
          blocks: blocksToSave.map((b: ArticleBlockToSave) => ({ ...b, id_article: finalArticleRecordId })),
        }) : { success: false, error: 'ID article manquant' };

        if (!blocksResponse.success) {
          console.warn('⚠️ Erreur sauvegarde blocs:', blocksResponse.error);
          // On continue même si les blocs échouent — l'oeuvre est créée
        } else {
        }
      }

      // 6. Succès — redirection
      toast({
        title: t('ajouteroeuvre.succes'),
        description: t('ajouteroeuvre.article_cree_succes'),
      });

      setTimeout(() => {
        // Rediriger vers la page article (avec blocs) pour les types article
        navigate(`/articles/${oeuvreId}`);
      }, 1500);

    } catch (error: unknown) {
      console.error('❌ Erreur sauvegarde article avancé:', error);
      const message = error instanceof Error ? error.message : t('ajouteroeuvre.articleSaveError', 'Erreur lors de la sauvegarde de l\'article');
      toast({
        title: t('common.error', 'Erreur'),
        description: message,
        variant: 'destructive',
      });
    }
  }, [toast, t]);

  // ============================================================================
  // SOUMISSION DU FORMULAIRE
  // ============================================================================

  const prepareDetailsSpecifiques = useCallback((typeOeuvre: TypeOeuvre): DetailsSpecifiques => {
    const details: DetailsSpecifiques = {};

    switch (typeOeuvre.nom_type) {
      case 'Livre':
        details.livre = {
          isbn: formData.isbn,
          nb_pages: formData.nb_pages,
          format: 'standard',
          collection: undefined
        };
        break;

      case 'Film':
        details.film = {
          duree_minutes: formData.duree_minutes,
          realisateur: formData.realisateur
        };
        break;

      case 'Album Musical':
        details.album_musical = {
          duree: formData.duree_album,
          label: formData.label,
          nb_pistes: formData.nb_pistes
        };
        break;

      case 'Article':
        details.article = {
          auteur: formData.auteur,
          source: formData.source,
          resume: formData.resume_article,
          url_source: formData.url_source
        };
        break;

      case 'Article Scientifique':
        details.article_scientifique = {
          journal: formData.journal,
          doi: formData.doi,
          pages: formData.pages,
          volume: formData.volume,
          numero: formData.numero,
          peer_reviewed: formData.peer_reviewed
        };
        break;

      case 'Artisanat':
        details.artisanat = {
          id_materiau: formData.id_materiau,
          id_technique: formData.id_technique,
          dimensions: formData.dimensions,
          poids: formData.poids,
          prix: formData.prix
        };
        break;

      case 'Œuvre d\'Art':
      case 'Art':
        details.oeuvre_art = {
          technique: formData.technique_art,
          dimensions: formData.dimensions_art,
          support: formData.support
        };
        break;
    }

    return details;
  }, [formData]);

  const handleSubmit = useCallback(async (isDraft = false) => {
    try {
      setLoading(true);
      setSubmitError(null);
      setFieldErrors({});

      // Collect ALL validation errors before returning
      const errors: Record<string, string> = {};

      // Validation — alignée sur le backend : fr OU ar requis
      if (!formData.titre?.fr?.trim() && !formData.titre?.ar?.trim()) {
        errors.titre = t('oeuvre.errors.titleRequired', 'Le titre est requis (au moins en français ou arabe)');
      }
      if (!formData.id_type_oeuvre) {
        errors.id_type_oeuvre = t('oeuvre.errors.typeRequired', 'Veuillez sélectionner un type d\'œuvre');
      }
      if (!formData.description?.fr?.trim() && !formData.description?.ar?.trim()) {
        errors.description = t('oeuvre.errors.descriptionRequired', 'La description est requise (au moins en français ou arabe)');
      }

      // Vérifier les catégories
      if (formData.id_type_oeuvre) {
        const hasCategories = await metadataService.checkIfTypeHasCategories(formData.id_type_oeuvre);
        if (hasCategories && formData.categories.length === 0) {
          errors.categories = t('oeuvre.errors.categoryRequired', 'Veuillez sélectionner au moins une catégorie');
        }
      }

      // Validation année de création
      if (formData.annee_creation) {
        const currentYear = new Date().getFullYear();
        if (formData.annee_creation < 1800 || formData.annee_creation > currentYear + 1) {
          errors.annee_creation = t('oeuvre.errors.invalidYear', `L'année doit être entre 1800 et ${currentYear + 1}`);
        }
      }

      // Validation prix >= 0
      if (formData.prix !== undefined && formData.prix !== null && formData.prix < 0) {
        errors.prix = t('oeuvre.errors.invalidPrice', 'Le prix ne peut pas être négatif');
      }

      // Validation ISBN
      if (formData.isbn) {
        const isbnClean = formData.isbn.replace(/[-\s]/g, '');
        if (!/^(\d{10}|\d{13})$/.test(isbnClean)) {
          errors.isbn = t('oeuvre.errors.invalidIsbn', 'ISBN invalide — 10 ou 13 chiffres attendus');
        }
      }

      // If any validation errors, set them all and focus the first errored field
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setSubmitError(t('oeuvre.errors.formHasErrors', 'Veuillez corriger les erreurs ci-dessous'));
        // Focus and scroll to the first errored field
        const fieldOrder = ['id_type_oeuvre', 'titre', 'description', 'annee_creation', 'prix', 'isbn', 'categories'];
        const firstErrorField = fieldOrder.find((f) => errors[f]);
        if (firstErrorField) {
          // For multilang inputs, target the active lang input; for others target the input by id
          const elementId = firstErrorField === 'titre' ? 'titre-fr'
            : firstErrorField === 'description' ? 'description-fr'
            : firstErrorField;
          requestAnimationFrame(() => {
            const el = document.getElementById(elementId)
              || document.getElementById(`${firstErrorField}-error`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              if (typeof (el as HTMLElement).focus === 'function') el.focus();
            }
          });
        }
        return;
      }

      // Préparer les détails spécifiques
      const typeOeuvre = metadata.types_oeuvres?.find((type: TypeOeuvre) => type.id_type_oeuvre === formData.id_type_oeuvre);
      const detailsSpecifiques = typeOeuvre ? prepareDetailsSpecifiques(typeOeuvre) : {};

      // Préparer les données avec la fonction helper
      const oeuvreData = mapToBackendDTO(
        formData,
        contributeurs,
        intervenantsExistants,
        nouveauxIntervenants,
        editeurs,
        detailsSpecifiques
      );

      setUploadProgress(isEditMode ? t('ajouteroeuvre.updatingOeuvre', 'Mise à jour de l\'oeuvre...') : t('ajouteroeuvre.creatingOeuvre', 'Création de l\'oeuvre...'));

      try {
        let oeuvreResponse;
        const mediaFiles = medias.map((m) => m.file);

        if (isEditMode && editId) {
          // Mode édition — appeler update
          oeuvreResponse = await oeuvreService.updateOeuvre(editId, oeuvreData);
        } else if (mediaFiles.length > 0) {
          const mediaMetadata = medias.map((m) => ({ is_principal: m.isPrincipal }));

          oeuvreResponse = await oeuvreService.createOeuvreFormData(
            oeuvreData,
            mediaFiles,
            mediaMetadata
          );
        } else {
          oeuvreResponse = await oeuvreService.createOeuvre(oeuvreData);
        }

        if (!oeuvreResponse.success) {
          setSubmitError(oeuvreResponse.error || (isEditMode ? t('ajouteroeuvre.updateError', 'Erreur lors de la mise à jour') : t('ajouteroeuvre.createError', 'Erreur lors de la création de l\'oeuvre')));
          return;
        }

        // Succès
        toast({
          title: t('ajouteroeuvre.succes'),
          description: isEditMode ? t('toasts.oeuvreStatusUpdated') : (isDraft ? t('ajouteroeuvre.brouillon_sauvegarde') : t('ajouteroeuvre.oeuvre_creee_succes')),
        });

        // Redirection
        setTimeout(() => {
          navigate('/dashboard-pro');
        }, 1500);

      } catch (error: unknown) {
        // Gestion du timeout
        const errorMessage = error instanceof Error ? error.message : '';
        const errorCode = (error as { code?: string })?.code;
        if (errorMessage && (
        errorMessage.includes('timeout') ||
        errorMessage.includes('Timeout') ||
        errorCode === 'ECONNABORTED')) {


          await new Promise((resolve) => setTimeout(resolve, 2000));

          const titreStr = formData.titre.fr || '';
          const checkResult = await oeuvreService.checkRecentOeuvre(titreStr);

          if (checkResult.success && checkResult.data) {

            if (medias.length > 0) {
              // Uploader automatiquement les médias après timeout
            const uploadConfirm = true; // Auto-upload après timeout

              if (uploadConfirm) {
                setUploadProgress(t('ajouteroeuvre.uploadingMedia', 'Upload des médias...'));
                const oeuvreId = checkResult.data.id_oeuvre;

                // Utiliser mediaService pour uploader avec isPrincipal
                for (let i = 0; i < medias.length; i++) {
                  const media = medias[i];
                  await mediaService.uploadOeuvreMedia(media.file, oeuvreId, {
                    is_principal: media.isPrincipal,
                    ordre: i
                  });
                }
              }
            }

            toast({
              title: t('ajouteroeuvre.succes'),
              description: t('ajouteroeuvre.oeuvre_creee_succes'),
            });
            setTimeout(() => {
              navigate('/dashboard-pro');
            }, 1500);

          } else {
            setSubmitError(
              t('ajouteroeuvre.verifyError', 'Impossible de vérifier si l\'oeuvre a été créée. Veuillez consulter votre tableau de bord ou réessayer.')
            );
          }
        } else {
          setSubmitError(errorMessage || t('ajouteroeuvre.createError', 'Erreur lors de la création de l\'oeuvre'));
        }
      }

    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      setSubmitError(error instanceof Error ? error.message : t('ajouteroeuvre.saveError', 'Une erreur est survenue lors de l\'enregistrement'));
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  }, [formData, metadata.types_oeuvres, contributeurs, nouveauxIntervenants, editeurs, medias, prepareDetailsSpecifiques, toast, t]);

  // ============================================================================
  // RENDU DES CHAMPS SPÉCIFIQUES
  // ============================================================================

  const renderSpecificFields = useCallback(() => {
    if (!metadata.types_oeuvres || metadata.types_oeuvres.length === 0) return null;

    const typeOeuvre = metadata.types_oeuvres.find((type: TypeOeuvre) => type.id_type_oeuvre === formData.id_type_oeuvre);
    if (!typeOeuvre) return null;

    const fieldsConfig: Record<string, React.ReactNode> = {
      'Livre':
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-2">
            <Label htmlFor="isbn">{t("ajouteroeuvre.isbn")} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
            <Input
            id="isbn"
            placeholder="978-2-1234-5678-9"
            maxLength={17}
            autoComplete="off"
            value={formData.isbn || ''}
            aria-invalid={!!fieldErrors.isbn || undefined}
            aria-describedby={fieldErrors.isbn ? 'isbn-error' : 'isbn-helper'}
            onChange={(e) => handleInputChange('isbn', e.target.value)} />
            <p id="isbn-helper" className="text-xs text-muted-foreground">{t("ajouteroeuvre.isbnHelper", "Format : 978-2-1234-5678-9")}</p>
            {fieldErrors.isbn && <p id="isbn-error" role="alert" className="text-sm text-destructive">{fieldErrors.isbn}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nb_pages">{t("ajouteroeuvre.nombre_pages")}</Label>
            <Input
            id="nb_pages"
            type="number"
            placeholder={t("ajouteroeuvre.placeholder_250")}
            value={formData.nb_pages || ''}
            onChange={(e) => handleInputChange('nb_pages', parseInt(e.target.value) || undefined)} />

          </div>
        </div>,


      'Film':
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-2">
            <Label htmlFor="duree_minutes">{t("ajouteroeuvre.dure_minutes")}</Label>
            <Input
            id="duree_minutes"
            type="number"
            placeholder={t("ajouteroeuvre.placeholder_120")}
            value={formData.duree_minutes || ''}
            onChange={(e) => handleInputChange('duree_minutes', parseInt(e.target.value) || undefined)} />

          </div>
          <div className="space-y-2">
            <Label htmlFor="realisateur">{t("ajouteroeuvre.ralisateur")}</Label>
            <Input
            id="realisateur"
            placeholder={t("ajouteroeuvre.placeholder_nom_ralisateur")}
            maxLength={200}
            autoComplete="name"
            value={formData.realisateur || ''}
            onChange={(e) => handleInputChange('realisateur', e.target.value)} />

          </div>
        </div>,


      'Album Musical':
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-2">
            <Label htmlFor="duree_album">{t("ajouteroeuvre.dure_totale")}</Label>
            <Input
            id="duree_album"
            placeholder={t("ajouteroeuvre.placeholder_4530")}
            maxLength={10}
            value={formData.duree_album || ''}
            onChange={(e) => handleInputChange('duree_album', e.target.value)} />

          </div>
          <div className="space-y-2">
            <Label htmlFor="label">{t("ajouteroeuvre.label_maison_production")}</Label>
            <Input
            id="label"
            placeholder={t("ajouteroeuvre.placeholder_nom_label")}
            maxLength={200}
            value={formData.label || ''}
            onChange={(e) => handleInputChange('label', e.target.value)} />

          </div>
          <div className="space-y-2">
            <Label htmlFor="nb_pistes">{t("ajouteroeuvre.nb_pistes", "Nombre de pistes")}</Label>
            <Input
            id="nb_pistes"
            type="number"
            placeholder={t("ajouteroeuvre.placeholder_nb_pistes", "Ex: 12")}
            value={formData.nb_pistes || ''}
            onChange={(e) => handleInputChange('nb_pistes', parseInt(e.target.value) || undefined)} />

          </div>
        </div>,


      'Article':
      <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-2">
              <Label htmlFor="auteur">{t("ajouteroeuvre.auteur")}</Label>
              <Input
              id="auteur"
              placeholder={t("ajouteroeuvre.placeholder_nom_lauteur")}
              maxLength={200}
              autoComplete="name"
              value={formData.auteur || ''}
              onChange={(e) => handleInputChange('auteur', e.target.value)} />

            </div>
            <div className="space-y-2">
              <Label htmlFor="source">{t("ajouteroeuvre.source_publication")}</Label>
              <Input
              id="source"
              placeholder={t("ajouteroeuvre.placeholder_watan_monde")}
              maxLength={300}
              value={formData.source || ''}
              onChange={(e) => handleInputChange('source', e.target.value)} />

            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="resume_article">{t("ajouteroeuvre.rsum_larticle")}</Label>
            <Textarea
            id="resume_article"
            placeholder={t("ajouteroeuvre.placeholder_rsum_chapeau_larticle")}
            className="min-h-[100px]"
            maxLength={5000}
            value={formData.resume_article || ''}
            onChange={(e) => handleInputChange('resume_article', e.target.value)} />

          </div>
          <div className="space-y-2">
            <Label htmlFor="url_source">{t("ajouteroeuvre.url_larticle_optionnel")}</Label>
            <Input
            id="url_source"
            type="url"
            autoComplete="url"
            maxLength={2048}
            placeholder="https://..."
            value={formData.url_source || ''}
            onChange={(e) => handleInputChange('url_source', e.target.value)} />
            <p className="text-xs text-muted-foreground">{t('common.urlHelper')}</p>

          </div>
        </div>,


      'Article Scientifique':
      <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-2">
              <Label htmlFor="journal">{t("ajouteroeuvre.journal_revue")}</Label>
              <Input
              id="journal"
              placeholder={t("ajouteroeuvre.placeholder_nom_journal_scientifique")}
              maxLength={300}
              value={formData.journal || ''}
              onChange={(e) => handleInputChange('journal', e.target.value)} />

            </div>
            <div className="space-y-2">
              <Label htmlFor="doi">{t("ajouteroeuvre.doi")} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
              <Input
              id="doi"
              placeholder={t("ajouteroeuvre.placeholder_101234example")}
              maxLength={100}
              value={formData.doi || ''}
              onChange={(e) => handleInputChange('doi', e.target.value)} />
              <p className="text-xs text-muted-foreground">{t("ajouteroeuvre.doiHelper", "Format : 10.1234/example")}</p>

            </div>
            <div className="space-y-2">
              <Label htmlFor="volume">{t("ajouteroeuvre.volume")}</Label>
              <Input
              id="volume"
              placeholder={t("ajouteroeuvre.placeholder_ex_12")}
              maxLength={20}
              value={formData.volume || ''}
              onChange={(e) => handleInputChange('volume', e.target.value)} />

            </div>
            <div className="space-y-2">
              <Label htmlFor="numero">{t("ajouteroeuvre.numro")}</Label>
              <Input
              id="numero"
              placeholder={t("ajouteroeuvre.placeholder_ex_3")}
              maxLength={20}
              value={formData.numero || ''}
              onChange={(e) => handleInputChange('numero', e.target.value)} />

            </div>
            <div className="space-y-2">
              <Label htmlFor="pages">{t("ajouteroeuvre.pages")}</Label>
              <Input
              id="pages"
              placeholder={t("ajouteroeuvre.placeholder_123145")}
              maxLength={20}
              value={formData.pages || ''}
              onChange={(e) => handleInputChange('pages', e.target.value)} />

            </div>
            <div className="space-y-2 flex items-center">
              <Checkbox
              id="peer_reviewed"
              checked={formData.peer_reviewed || false}
              onCheckedChange={(checked) => handleInputChange('peer_reviewed', checked === true)} />

              <Label htmlFor="peer_reviewed" className="ms-2">{t("ajouteroeuvre.article_valu_par")}</Label>
            </div>
          </div>
        </div>,


      'Artisanat':
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-2">
            <Label htmlFor="id_materiau">{t("ajouteroeuvre.matriau_principal")}</Label>
            <Select
            value={formData.id_materiau?.toString() || ''}
            onValueChange={(value) => handleInputChange('id_materiau', value ? parseInt(value) : undefined)}>

              <SelectTrigger>
                <SelectValue placeholder={t("ajouteroeuvre.placeholder_slectionnez_matriau")} />
              </SelectTrigger>
              <SelectContent>
                {metadata.materiaux?.map((materiau: Materiau) =>
              <SelectItem key={materiau.id_materiau} value={materiau.id_materiau.toString()}>
                    {materiau.nom}
                  </SelectItem>
              ) || <SelectItem value="0" disabled>{t("ajouteroeuvre.aucun_matriau_disponible")}</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="id_technique">{t("ajouteroeuvre.technique_utilise")}</Label>
            <Select
            value={formData.id_technique?.toString() || ''}
            onValueChange={(value) => handleInputChange('id_technique', value ? parseInt(value) : undefined)}>

              <SelectTrigger>
                <SelectValue placeholder={t("ajouteroeuvre.placeholder_slectionnez_une_technique")} />
              </SelectTrigger>
              <SelectContent>
                {metadata.techniques?.map((technique: Technique) =>
              <SelectItem key={technique.id_technique} value={technique.id_technique.toString()}>
                    {technique.nom}
                  </SelectItem>
              ) || <SelectItem value="0" disabled>{t("ajouteroeuvre.aucune_technique_disponible")}</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dimensions">{t("ajouteroeuvre.dimensions_1")}</Label>
            <Input
            id="dimensions"
            placeholder={t("ajouteroeuvre.placeholder_30x20x15")}
            maxLength={50}
            value={formData.dimensions || ''}
            onChange={(e) => handleInputChange('dimensions', e.target.value)} />

          </div>
          <div className="space-y-2">
            <Label htmlFor="poids">{t("ajouteroeuvre.poids")}</Label>
            <Input
            id="poids"
            type="number"
            step="0.1"
            placeholder={t("ajouteroeuvre.placeholder_ex_1_5")}
            value={formData.poids || ''}
            onChange={(e) => handleInputChange('poids', parseFloat(e.target.value) || undefined)} />

          </div>
        </div>,


      'Œuvre d\'Art':
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-2">
            <Label htmlFor="technique_art">{t("ajouteroeuvre.technique_artistique")}</Label>
            <Input
            id="technique_art"
            placeholder={t("ajouteroeuvre.placeholder_huile_sur_toile")}
            maxLength={200}
            value={formData.technique_art || ''}
            onChange={(e) => handleInputChange('technique_art', e.target.value)} />

          </div>
          <div className="space-y-2">
            <Label htmlFor="dimensions_art">{t("ajouteroeuvre.dimensions_1")}</Label>
            <Input
            id="dimensions_art"
            placeholder={t("ajouteroeuvre.placeholder_100x80")}
            maxLength={50}
            value={formData.dimensions_art || ''}
            onChange={(e) => handleInputChange('dimensions_art', e.target.value)} />

          </div>
          <div className="space-y-2">
            <Label htmlFor="support">{t("ajouteroeuvre.support")}</Label>
            <Input
            id="support"
            placeholder={t("ajouteroeuvre.placeholder_toile_papier_bois")}
            maxLength={200}
            value={formData.support || ''}
            onChange={(e) => handleInputChange('support', e.target.value)} />

          </div>
        </div>,

      'Art':
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-2">
            <Label htmlFor="technique_art">{t("ajouteroeuvre.technique_artistique")}</Label>
            <Input
            id="technique_art"
            placeholder={t("ajouteroeuvre.placeholder_huile_sur_toile")}
            maxLength={200}
            value={formData.technique_art || ''}
            onChange={(e) => handleInputChange('technique_art', e.target.value)} />

          </div>
          <div className="space-y-2">
            <Label htmlFor="dimensions_art">{t("ajouteroeuvre.dimensions_1")}</Label>
            <Input
            id="dimensions_art"
            placeholder={t("ajouteroeuvre.placeholder_100x80")}
            maxLength={50}
            value={formData.dimensions_art || ''}
            onChange={(e) => handleInputChange('dimensions_art', e.target.value)} />

          </div>
          <div className="space-y-2">
            <Label htmlFor="support">{t("ajouteroeuvre.support")}</Label>
            <Input
            id="support"
            placeholder={t("ajouteroeuvre.placeholder_toile_papier_bois")}
            value={formData.support || ''}
            onChange={(e) => handleInputChange('support', e.target.value)} />

          </div>
        </div>

    };

    return fieldsConfig[typeOeuvre.nom_type] || null;
  }, [metadata.types_oeuvres, formData, handleInputChange, fieldErrors]);

  // ============================================================================
  // RENDU CONDITIONNEL SELON L'ÉTAT
  // ============================================================================
  if (loadingMetadata) {
    return (
      <div className="min-h-screen bg-background pattern-geometric flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">{t("ajouteroeuvre.chargement_des_donnes")}</p>
        </div>
      </div>);

  }

  if (!loadingMetadata && (!metadata.types_oeuvres || metadata.types_oeuvres.length === 0)) {
    return (
      <div className="min-h-screen bg-background pattern-geometric">
        <div className="container py-12">
          <div className="max-w-4xl mx-auto">
            <Alert variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {submitError || t('oeuvre.errors.loadMetadataFailed', 'Impossible de charger les données nécessaires au formulaire.')}
                <Button
                  variant="link"
                  className="ms-2 px-0"
                  onClick={() => {
                    setLoadingMetadata(true);
                    setSubmitError(null);
                    loadMetadata();
                  }}>{t("ajouteroeuvre.ressayer")}


                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>);

  }

  // ============================================================================
  // RENDU PRINCIPAL
  // ============================================================================

  return (
    <div dir={direction} className="min-h-screen bg-background pattern-geometric">
      <div className="container py-12">
        <div className="max-w-4xl mx-auto">
          {/* Si l'éditeur d'article est activé ET qu'un type article est sélectionné */}
          {useArticleEditor && formData.id_type_oeuvre > 0 && showEditorChoice ?
          <ArticleEditor
            initialData={{
              titre: formData.titre.fr || '',
              description: formData.description.fr || '',
              id_langue: formData.id_langue,
              categories: formData.categories,
              tags: formData.tags,
              type: formData.id_type_oeuvre === 4 ? 'article' : 'article_scientifique',
              // Passer les champs spécifiques si déjà remplis
              auteur: formData.auteur,
              source: formData.source,
              resume: formData.resume_article,
              url_source: formData.url_source,
              journal: formData.journal,
              doi: formData.doi,
              pages: formData.pages,
              volume: formData.volume,
              numero: formData.numero,
              peer_reviewed: formData.peer_reviewed
            }}
            onBack={() => {
              // Revenir au formulaire classique
              setUseArticleEditor(false);
            }}
            onSave={handleArticleEditorSave} /> :


          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(false); }}>
              {/* En-tête */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <Button
                  variant="outline"
                  size="sm"
                  className="hover-lift"
                  onClick={() => window.history.back()}>

                    <ArrowLeft className="h-4 w-4 me-2" />{t("ajouteroeuvre.retour")}

                </Button>
                  <div>
                    <h1 className="text-4xl font-bold tracking-tight font-serif text-gradient">{t("ajouteroeuvre.ajouter_une_uvre")}

                  </h1>
                    <p className="text-lg text-muted-foreground mt-2">{t("ajouteroeuvre.partagez_votre_cration")}

                  </p>
                  </div>
                </div>
                {isAuthenticated && user &&
              <div className="text-end text-sm text-muted-foreground">
                    <p>{t("ajouteroeuvre.connect_tant_que")}</p>
                    <p className="font-medium text-foreground">
                      {user.prenom || ''} {user.nom || user.email || 'Utilisateur'}
                    </p>
                  </div>
              }
              </div>

              {/* Alerte d'authentification */}
              {!isAuthenticated &&
            <Alert className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{t("ajouteroeuvre.vous_devez_tre")}

                <Button variant="link" className="px-1" onClick={() => navigate('/auth')}>{t("ajouteroeuvre.connecter")}

                </Button>
                  </AlertDescription>
                </Alert>
            }

              {/* Erreur de soumission */}
              {submitError &&
            <Alert variant="destructive" className="mb-6" role="alert" aria-live="assertive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
            }

              <p className="text-sm text-muted-foreground mb-2">{t('common.requiredFieldsLegend')}</p>
              <div className="space-y-8">
                {/* Type d'œuvre */}
                <Card className="shadow-cultural">
                  <CardHeader>
                    <CardTitle className="text-2xl font-serif">{t("ajouteroeuvre.type_duvre")}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t("ajouteroeuvre.type_hint", "Sélectionnez le type qui correspond le mieux à votre œuvre. Pour les articles et articles scientifiques, l'éditeur avancé permet une mise en page riche avec blocs (titres, images, citations, tableaux).")}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div id="id_type_oeuvre" role="group" aria-label={t("ajouteroeuvre.type_duvre")} className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-4" tabIndex={-1}>
                      {metadata.types_oeuvres?.map((type: TypeOeuvre) =>
                    <Button
                      key={type.id_type_oeuvre}
                      type="button"
                      variant={formData.id_type_oeuvre === type.id_type_oeuvre ? "default" : "outline"}
                      className={`h-auto py-4 flex flex-col items-center space-y-2 hover-lift ${
                      formData.id_type_oeuvre === type.id_type_oeuvre ?
                      'bg-primary text-primary-foreground' :
                      'hover:bg-secondary hover:text-secondary-foreground'}`
                      }
                      onClick={() => handleInputChange('id_type_oeuvre', type.id_type_oeuvre)}>

                          {getTypeIcon(type.id_type_oeuvre)}
                          <span className="font-medium">{type.nom_type}</span>
                        </Button>
                    )}
                    </div>
                    {fieldErrors.id_type_oeuvre && <p id="id_type_oeuvre-error" role="alert" className="mt-2 text-sm text-destructive">{fieldErrors.id_type_oeuvre}</p>}
                  </CardContent>
                </Card>

                {/* Sélecteur de mode d'édition pour les articles */}
                {formData.id_type_oeuvre > 0 && showEditorChoice &&
              <EditorModeSelector
                metadata={metadata}
                formData={formData}
                showEditorChoice={showEditorChoice}
                useArticleEditor={useArticleEditor}
                setUseArticleEditor={setUseArticleEditor} />

              }

                {/* Reste du formulaire - uniquement si pas en mode article editor */}
                {formData.id_type_oeuvre > 0 && !useArticleEditor &&
              <>
                    {/* Informations générales */}
                    <Card className="shadow-cultural">
                      <CardHeader>
                        <CardTitle className="text-2xl font-serif">{t("ajouteroeuvre.informations_gnrales")}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-6">
                          {/* Titre multilingue */}
                          <div>
                            <MultiLangInput
                              name="titre"
                              label={t("ajouteroeuvre.titre_luvre")}
                              value={formData.titre}
                              onChange={(value) => handleInputChange('titre', value)}
                              required
                              requiredLanguages={['fr']}
                              placeholder={t("ajouteroeuvre.placeholder_lart_calligraphie_maghrebine")}
                              errors={fieldErrors.titre ? { fr: fieldErrors.titre, ar: fieldErrors.titre } : {}}
                            />
                          </div>
                          
                          {/* Description multilingue */}
                          <div>
                            <MultiLangInput
                              name="description"
                              label={t("ajouteroeuvre.description")}
                              value={formData.description}
                              onChange={(value) => handleInputChange('description', value)}
                              type="textarea"
                              rows={4}
                              requiredLanguages={['fr']}
                              placeholder={t("ajouteroeuvre.placeholder_dcrivez_votre_uvre")}
                              errors={fieldErrors.description ? { fr: fieldErrors.description, ar: fieldErrors.description } : {}}
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="annee_creation" className="text-base">{t("ajouteroeuvre.anne_cration")} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                            <Input
                          id="annee_creation"
                          type="number"
                          min="1800"
                          max={new Date().getFullYear() + 1}
                          placeholder={new Date().getFullYear().toString()}
                          value={formData.annee_creation || ''}
                          aria-invalid={!!fieldErrors.annee_creation || undefined}
                          aria-describedby={fieldErrors.annee_creation ? 'annee_creation-error' : undefined}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') { handleInputChange('annee_creation', undefined); return; }
                            const num = parseInt(val);
                            if (!isNaN(num) && num >= 0) handleInputChange('annee_creation', num);
                          }}
                          className="hover:border-primary focus:border-primary" />
                            {fieldErrors.annee_creation && <p id="annee_creation-error" role="alert" className="text-sm text-destructive">{fieldErrors.annee_creation}</p>}
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="prix" className="text-base">{t("ajouteroeuvre.prix")} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                            <Input
                          id="prix"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={t("ajouteroeuvre.placeholder_1200")}
                          value={formData.prix || ''}
                          aria-invalid={!!fieldErrors.prix || undefined}
                          aria-describedby={fieldErrors.prix ? 'prix-error' : undefined}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') { handleInputChange('prix', undefined); return; }
                            const num = parseFloat(val);
                            if (!isNaN(num) && num >= 0) handleInputChange('prix', num);
                          }}
                          className="hover:border-primary focus:border-primary" />
                            {fieldErrors.prix && <p id="prix-error" role="alert" className="text-sm text-destructive">{fieldErrors.prix}</p>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Traduction */}
                    <Card className="shadow-cultural">
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="is_traduction"
                            checked={formData.is_traduction || false}
                            onChange={(e) => {
                              handleInputChange('is_traduction', e.target.checked);
                              if (!e.target.checked) {
                                handleInputChange('id_oeuvre_originale', undefined);
                                handleInputChange('oeuvre_originale_titre', undefined);
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <Label htmlFor="is_traduction" className="text-base cursor-pointer">
                            {t('ajouteroeuvre.isTraduction', 'Cette œuvre est une traduction')}
                          </Label>
                        </div>
                        {formData.is_traduction && (
                          <div className="space-y-2 pl-7">
                            <Label>{t('ajouteroeuvre.oeuvreOriginale', 'Œuvre originale')}</Label>
                            <Input
                              placeholder={t('ajouteroeuvre.rechercherOeuvre', 'Rechercher l\'œuvre originale par titre...')}
                              value={formData.oeuvre_originale_titre || ''}
                              onChange={async (e) => {
                                handleInputChange('oeuvre_originale_titre', e.target.value);
                                if (e.target.value.length >= 3) {
                                  try {
                                    const res = await oeuvreService.searchOeuvres({ q: e.target.value, limit: 5 });
                                    if (res.success && res.data) {
                                      const items = Array.isArray(res.data) ? res.data : (res.data as any).oeuvres || [];
                                      setSearchOeuvreResults(items);
                                    }
                                  } catch { /* ignore */ }
                                }
                              }}
                            />
                            {searchOeuvreResults.length > 0 && !formData.id_oeuvre_originale && (
                              <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                                {searchOeuvreResults.map((o: any) => (
                                  <button
                                    key={o.id_oeuvre}
                                    type="button"
                                    className="w-full text-left p-2 hover:bg-muted text-sm"
                                    onClick={() => {
                                      handleInputChange('id_oeuvre_originale', o.id_oeuvre);
                                      const titre = typeof o.titre === 'object' ? o.titre.fr || Object.values(o.titre)[0] : o.titre;
                                      handleInputChange('oeuvre_originale_titre', titre);
                                      setSearchOeuvreResults([]);
                                    }}
                                  >
                                    {typeof o.titre === 'object' ? o.titre.fr || Object.values(o.titre)[0] : o.titre}
                                    {o.Langue && <span className="text-muted-foreground ml-2">({o.Langue.nom})</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                            {formData.id_oeuvre_originale && (
                              <p className="text-sm text-green-600">
                                ✓ {t('ajouteroeuvre.oeuvreSelectionnee', 'Œuvre originale sélectionnée')}
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Champs spécifiques selon le type */}
                    <Card className="shadow-cultural">
                      <CardHeader>
                        <CardTitle className="text-2xl font-serif">{t("ajouteroeuvre.informations_spcifiques")}
                      {metadata.types_oeuvres?.find((type: TypeOeuvre) => type.id_type_oeuvre === formData.id_type_oeuvre)?.nom_type}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {renderSpecificFields()}
                      </CardContent>
                    </Card>

                    {/* Sélection des catégories */}
                    <CategorySelection
                  typeOeuvreId={formData.id_type_oeuvre}
                  selectedCategories={formData.categories}
                  onCategoriesChange={(categories) => handleInputChange('categories', categories)} />
                    {fieldErrors.categories && <p id="categories-error" role="alert" className="text-sm text-destructive mt-2">{fieldErrors.categories}</p>}

                    {/* Gestion des intervenants et éditeurs */}
                    {metadata.types_users && metadata.editeurs &&
                <IntervenantEditeurManager
                  typeOeuvreId={formData.id_type_oeuvre}
                  typesUsers={metadata.types_users}
                  editeurs={metadata.editeurs}
                  onIntervenantsChange={handleIntervenantsChange}
                  onEditeursChange={handleEditeursChange} />

                }

                    {/* Tags */}
                    <Card className="shadow-cultural">
                      <CardHeader>
                        <CardTitle className="text-2xl font-serif">{t("ajouteroeuvre.tags")}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Tags sélectionnés */}
                        <div className="flex flex-wrap gap-2">
                          {formData.tags.map((tag) =>
                      <Badge key={tag} variant="secondary" className="ps-3 pe-1 bg-secondary hover:bg-secondary/80">
                              {tag}
                              <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1 ms-1 hover:bg-transparent"
                          onClick={() => handleTagRemove(tag)}>

                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                      )}
                        </div>

                        {/* Input pour ajouter des tags */}
                        <div className="relative">
                          <div className="flex gap-2">
                            <Input
                          placeholder={t("ajouteroeuvre.placeholder_ajouter_tag")}
                          value={newTag}
                          onChange={(e) => {
                            setNewTag(e.target.value);
                            setShowTagSuggestions(e.target.value.length > 0);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleTagAdd(newTag);
                            }
                          }}
                          className="hover:border-primary focus:border-primary" />

                            <Button
                          type="button"
                          size="sm"
                          onClick={() => handleTagAdd(newTag)}
                          disabled={!newTag || formData.tags.length >= 10}
                          className="bg-primary hover:bg-primary/90">

                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Suggestions de tags */}
                          {showTagSuggestions && newTag && metadata.tags &&
                      <div className="absolute top-full start-0 end-0 mt-1 bg-background border rounded-md shadow-lg z-10 max-h-48 overflow-auto">
                              {metadata.tags.
                        filter((tag: TagMotCle) => {
                          const tagName = getTagName(tag.nom, lang);
                          return tagName.toLowerCase().includes(newTag.toLowerCase()) && !formData.tags.includes(tagName.toLowerCase());
                        }).
                        slice(0, 5).
                        map((tag: TagMotCle) =>
                        <button
                          key={tag.id_tag}
                          type="button"
                          className="w-full text-start px-3 py-2 hover:bg-secondary transition-colors"
                          onClick={() => handleTagAdd(getTagName(tag.nom, lang))}>

                                    {getTagName(tag.nom, lang)}
                                  </button>
                        )}
                            </div>
                      }
                        </div>

                        {/* Tags suggérés */}
                        {suggestedTags.length > 0 &&
                    <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">{t("ajouteroeuvre.tags_suggrs")}</p>
                            <div className="flex flex-wrap gap-2">
                              {suggestedTags.
                        filter((tag) => !formData.tags.includes(tag)).
                        map((tag) =>
                        <Button
                          key={tag}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleTagAdd(tag)}
                          className="hover:bg-primary hover:text-primary-foreground hover:border-primary">

                                    <Plus className="h-3 w-3 me-1" />
                                    {tag}
                                  </Button>
                        )}
                            </div>
                          </div>
                    }
                      </CardContent>
                    </Card>

                    {/* Fichiers et médias */}
                    <Card className="shadow-cultural">
                      <CardHeader>
                        <CardTitle className="text-2xl font-serif">{t("ajouteroeuvre.fichiers_mdias")}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-2">{t("ajouteroeuvre.premire_image_ajoute")}


                    </p>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Médias uploadés */}
                        {medias.length > 0 &&
                    <div className="space-y-4">
                            <h4 className="font-medium text-lg">{t("ajouteroeuvre.mdias_ajouts")}</h4>
                            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-4">
                              {medias.map((media) =>
                        <div key={media.id} className="relative group">
                                  <div className={`border-2 rounded-lg p-4 space-y-2 hover-lift bg-card transition-all ${
                          media.isPrincipal ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`
                          }>
                                    {/* Badge étoile pour l'image principale */}
                                    {media.isPrincipal &&
                            <div className="absolute -top-2 -end-2 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg z-10">
                                        <Star className="h-4 w-4 fill-current" />
                                      </div>
                            }
                                    
                                    {/* Aperçu */}
                                    {media.type === 'image' && media.preview ?
                            <div className="relative">
                                        <img
                                src={media.preview}
                                alt={media.titre || 'Aperçu'}
                                className="w-full h-32 object-cover rounded" />

                                        {/* Overlay au survol pour changer l'image principale */}
                                        {!media.isPrincipal && media.type === 'image' &&
                              <div
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded cursor-pointer flex items-center justify-center"
                                onClick={() => handleSetPrincipalMedia(media.id)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSetPrincipalMedia(media.id); } }}>

                                            <div className="text-white text-center">
                                              <Star className="h-6 w-6 mx-auto mb-1" />
                                              <p className="text-xs">{t("ajouteroeuvre.dfinir_comme_principale")}</p>
                                            </div>
                                          </div>
                              }
                                      </div> :

                            <div className="w-full h-32 bg-muted rounded flex items-center justify-center">
                                        {media.type === 'video' && <Film className="h-8 w-8 text-muted-foreground" />}
                                        {media.type === 'audio' && <Music className="h-8 w-8 text-muted-foreground" />}
                                        {media.type === 'document' && <FileText className="h-8 w-8 text-muted-foreground" />}
                                      </div>
                            }
                                    
                                    {/* Infos */}
                                    <p className="text-sm truncate">{media.file.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {(media.file.size / 1024 / 1024).toFixed(2)}{t("ajouteroeuvre.mb")}
                            </p>
                                    
                                    {/* Bouton supprimer */}
                                    <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="absolute top-2 end-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => handleMediaRemove(media.id)}>

                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                        )}
                            </div>
                          </div>
                    }
                        
                        {/* Zone d'upload */}
                        <div className="space-y-2">
                          <Label className="text-base">{t("ajouteroeuvre.ajouter_des_mdias")} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                          <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                        isDragging ?
                        'border-primary bg-primary/5' :
                        'border-muted-foreground/25 hover:border-primary/50'}`
                        }
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}>

                            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-foreground mb-2">{t("ajouteroeuvre.glissezdposez_vos_fichiers")}

                        </p>
                            <p className="text-sm text-muted-foreground mb-4">{t("ajouteroeuvre.images_vidos_audio")}

                        </p>
                            <input
                          type="file"
                          multiple
                          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                          onChange={(e) => e.target.files && handleMediaUpload(e.target.files)}
                          className="hidden"
                          id="media-upload" />

                            <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('media-upload')?.click()}
                          className="hover:bg-primary hover:text-primary-foreground hover:border-primary">{t("ajouteroeuvre.choisir_des_fichiers")}


                        </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="space-y-4">
                      {uploadProgress &&
                  <div className="text-center text-sm text-muted-foreground animate-pulse">
                          {uploadProgress}
                        </div>
                  }
                      <div className="flex justify-end gap-4">
                        <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSubmit(true)}
                      disabled={loading || !isAuthenticated}
                      className="hover:bg-secondary hover:text-secondary-foreground hover:border-secondary">

                          {loading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}{t("ajouteroeuvre.sauvegarder_comme_brouillon")}

                    </Button>
                        <Button
                      type="submit"
                      size="lg"
                      disabled={loading || !isAuthenticated}
                      className="w-full">

                          {loading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                          <Save className="h-4 w-4 me-2" />{t("ajouteroeuvre.publier_luvre")}

                    </Button>
                      </div>
                    </div>
                  </>
              }
              </div>
            </form>
          }
        </div>
      </div>
    </div>);

};

export default AjouterOeuvre;