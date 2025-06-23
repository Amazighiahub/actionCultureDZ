/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Book, Film, Music, FileText, Beaker, Palette, Hammer, Loader2
} from 'lucide-react';
 import { TypeUser } from '@/types/models/type-user.types';
// Import des services
import { mediaService } from '@/services/media.service';
import { metadataService, CategoryGroupedByGenre } from '@/services/metadata.service';
import { oeuvreService } from '@/services/oeuvre.service';
import { mapToBackendDTO } from '@/types/api/create-oeuvre-backend.dto';

// Import du composant de gestion des intervenants
import IntervenantEditeurManager from '@/components/oeuvre/IntervenantEditeurManager';

// Import des types
import type { TagMotCle, Editeur } from '@/types/models/references.types';
import type { 
  IntervenantExistant, 
  NouvelIntervenant, 
  ContributeurOeuvre,
  EditeurOeuvre,
  DetailsSpecifiques,
  CreateOeuvreCompleteDTO
} from '@/types/api/oeuvre-creation.types';


// ============================================================================
// TYPES LOCAUX
// ============================================================================

// Type pour les médias
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
  types_oeuvres?: any[];
  langues?: any[];
  categories?: any[];
  materiaux?: any[];
  techniques?: any[];
  editeurs?: Editeur[];
  tags?: TagMotCle[];
  types_users?: TypeUser[];
}

// Type pour le formulaire
interface FormData {
  // Champs généraux
  titre: string;
  description: string;
  id_type_oeuvre: number;
  id_langue: number;
  annee_creation?: number;
  prix?: number;
  categories: number[];
  tags: string[];
  
  // Champs spécifiques selon le type
  isbn?: string;
  nb_pages?: number;
  duree_minutes?: number;
  realisateur?: string;
  duree_album?: string;
  label?: string;
  auteur?: string;
  source?: string;
  type_article?: string;
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

// État initial du formulaire
const INITIAL_FORM_DATA: FormData = {
  titre: '',
  description: '',
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
        
        const availableCategoryIds = response.data.flatMap(g => g.categories.map(c => c.id_categorie));
        const validCategories = selectedCategories.filter(id => availableCategoryIds.includes(id));
        
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
    const newCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];
    onCategoriesChange(newCategories);
  }, [selectedCategories, onCategoriesChange]);

  const handleGenreToggleAll = useCallback((genreId: number) => {
    const genre = categoriesGrouped.find(g => g.id_genre === genreId);
    if (!genre) return;

    const genreCategoryIds = genre.categories.map(c => c.id_categorie);
    const allSelected = genreCategoryIds.every(id => selectedCategories.includes(id));

    if (allSelected) {
      onCategoriesChange(selectedCategories.filter(id => !genreCategoryIds.includes(id)));
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
          <span className="ml-2">Chargement des catégories...</span>
        </CardContent>
      </Card>
    );
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
      </Card>
    );
  }

  if (categoriesGrouped.length === 0) {
    return (
      <Card className="shadow-cultural">
        <CardHeader>
          <CardTitle className="text-2xl font-serif">Catégories</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aucune catégorie disponible pour ce type d'œuvre.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-cultural">
      <CardHeader>
        <CardTitle className="text-2xl font-serif">Catégories</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Sélectionnez une ou plusieurs catégories pour classifier votre œuvre
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {categoriesGrouped.map(genre => {
          const genreCategoryIds = genre.categories.map(c => c.id_categorie);
          const selectedCount = genreCategoryIds.filter(id => selectedCategories.includes(id)).length;
          const allSelected = selectedCount === genre.categories.length && genre.categories.length > 0;
          
          return (
            <div key={genre.id_genre} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">
                  {genre.nom}
                  {selectedCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedCount}/{genre.categories.length}
                    </Badge>
                  )}
                </h3>
                {genre.categories.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleGenreToggleAll(genre.id_genre)}
                    className="text-xs"
                  >
                    {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </Button>
                )}
              </div>
              
              {genre.description && (
                <p className="text-sm text-muted-foreground">{genre.description}</p>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                {genre.categories.map(category => (
                  <div key={category.id_categorie} className="flex items-start space-x-2">
                    <Checkbox
                      id={`cat-${category.id_categorie}`}
                      checked={selectedCategories.includes(category.id_categorie)}
                      onCheckedChange={() => handleCategoryToggle(category.id_categorie)}
                      className="mt-0.5 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                    <Label
                      htmlFor={`cat-${category.id_categorie}`}
                      className="text-sm font-normal cursor-pointer hover:text-primary flex-1"
                    >
                      <span className="font-medium">{category.nom}</span>
                      {category.description && (
                        <span className="block text-xs text-muted-foreground mt-1">
                          {category.description}
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
});

CategorySelection.displayName = 'CategorySelection';

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

const AjouterOeuvre: React.FC = () => {
  // État de chargement et erreurs
  const [loading, setLoading] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  
  // Authentification
  const authToken = localStorage.getItem('auth_token');
  const isAuthenticated = !!authToken;
  const user = useMemo(() => {
    try {
      const userInfo = localStorage.getItem('user_info');
      return userInfo ? JSON.parse(userInfo) : null;
    } catch (e) {
      console.error('Erreur parsing user info:', e);
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

  // ============================================================================
  // EFFETS
  // ============================================================================

  // Charger les métadonnées au montage
  useEffect(() => {
    loadMetadata();
  }, []);

  // Générer des suggestions de tags quand le contenu change
  useEffect(() => {
    generateTagSuggestions();
  }, [formData.titre, formData.description, formData.id_type_oeuvre]);

  // Nettoyer les URLs des aperçus au démontage
  useEffect(() => {
    return () => {
      medias.forEach(media => {
        if (media.preview) {
          URL.revokeObjectURL(media.preview);
        }
      });
    };
  }, []);

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
        setSubmitError(response.error || 'Impossible de charger les données de référence');
      }
    } catch (error) {
      console.error('Erreur chargement métadonnées:', error);
      setSubmitError('Erreur de connexion au serveur. Veuillez réessayer.');
    } finally {
      setLoadingMetadata(false);
    }
  };

  const generateTagSuggestions = useCallback(() => {
    if (!metadata.types_oeuvres || metadata.types_oeuvres.length === 0) return;
    
    const suggestions: string[] = [];
    const typeOeuvre = metadata.types_oeuvres.find((t: any) => t.id_type_oeuvre === formData.id_type_oeuvre);
    
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
    
    keywords.forEach(keyword => {
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
      5: <FileText className="h-5 w-5" />,
      6: <Hammer className="h-5 w-5" />,
      7: <Palette className="h-5 w-5" />
    };
    return icons[typeId] || null;
  }, []);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleInputChange = useCallback((field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleTagAdd = useCallback(async (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase();
    
    if (normalizedTag && !formData.tags.includes(normalizedTag)) {
      // Vérifier si le tag existe déjà
      const existingTag = metadata.tags?.find((t: TagMotCle) => 
        t.nom.toLowerCase() === normalizedTag
      );
      
      // Si le tag n'existe pas, le créer
      if (!existingTag && metadata.tags) {
        try {
          const response = await metadataService.createTag({ nom: normalizedTag });
          if (response.success && response.data) {
            setMetadata(prev => ({
              ...prev,
              tags: [...(prev.tags || []), response.data!]
            }));
          }
        } catch (error) {
          console.error('Erreur création tag:', error);
        }
      }
      
      setFormData(prev => ({ ...prev, tags: [...prev.tags, normalizedTag] }));
      setNewTag('');
      setShowTagSuggestions(false);
    }
  }, [formData.tags, metadata.tags]);

  const handleTagRemove = useCallback((tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  }, []);

  const handleMediaUpload = useCallback((files: FileList) => {
    const newMedias: MediaUpload[] = [];
    const errors: string[] = [];
    
    Array.from(files).forEach(file => {
      // Validation
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        errors.push(`${file.name}: Fichier trop volumineux (max 100MB)`);
        return;
      }
      
      const type = file.type.startsWith('image/') ? 'image' :
                   file.type.startsWith('video/') ? 'video' :
                   file.type.startsWith('audio/') ? 'audio' : 'document';
      
      const media: MediaUpload = {
        id: `media-${Date.now()}-${Math.random()}`,
        file,
        type,
        isPrincipal: medias.length === 0 && newMedias.length === 0,
        preview: type === 'image' ? URL.createObjectURL(file) : undefined
      };
      
      newMedias.push(media);
    });
    
    if (errors.length > 0) {
      alert('Erreurs lors de l\'ajout des fichiers:\n' + errors.join('\n'));
    }
    
    if (newMedias.length > 0) {
      setMedias(prev => [...prev, ...newMedias]);
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
    const media = medias.find(m => m.id === mediaId);
    if (media?.preview) {
      URL.revokeObjectURL(media.preview);
    }
    
    setMedias(prev => {
      const updated = prev.filter(m => m.id !== mediaId);
      if (media?.isPrincipal && updated.length > 0) {
        updated[0].isPrincipal = true;
      }
      return updated;
    });
  }, [medias]);

  const handleSetPrincipalMedia = useCallback((mediaId: string) => {
    setMedias(prev => prev.map(m => ({
      ...m,
      isPrincipal: m.id === mediaId
    })));
  }, []);

  const handleIntervenantsChange = useCallback((
    existants: IntervenantExistant[],
    nouveaux: NouvelIntervenant[],
    contributeurs: ContributeurOeuvre[]
  ) => {
    setIntervenantsExistants(existants);
    setNouveauxIntervenants(nouveaux);
    setContributeurs(contributeurs);
  }, []);

  const handleEditeursChange = useCallback((editeurs: EditeurOeuvre[]) => {
    setEditeurs(editeurs);
  }, []);

  // ============================================================================
  // SOUMISSION DU FORMULAIRE
  // ============================================================================

  const prepareDetailsSpecifiques = useCallback((typeOeuvre: any): DetailsSpecifiques => {
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
          realisateur: formData.realisateur,
          producteur: undefined,
          studio: undefined
        };
        break;
        
      case 'Album Musical':
        details.album = {
          duree: formData.duree_album,
          label: formData.label,
          nb_pistes: undefined
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

      // Validation
      if (!formData.titre || !formData.id_type_oeuvre || !formData.description) {
        setSubmitError('Veuillez remplir tous les champs obligatoires');
        return;
      }

      // Vérifier les catégories
      const hasCategories = await metadataService.checkIfTypeHasCategories(formData.id_type_oeuvre);
      if (hasCategories && formData.categories.length === 0) {
        setSubmitError('Veuillez sélectionner au moins une catégorie');
        return;
      }

      // Préparer les détails spécifiques
      const typeOeuvre = metadata.types_oeuvres?.find((t: any) => t.id_type_oeuvre === formData.id_type_oeuvre);
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

      setUploadProgress('Création de l\'œuvre...');
      
      console.log('📝 Données envoyées:', {
        ...oeuvreData,
        nb_categories: oeuvreData.categories?.length || 0,
        nb_contributeurs: (oeuvreData.utilisateurs_inscrits?.length || 0) + 
                         (oeuvreData.intervenants_non_inscrits?.length || 0) + 
                         (oeuvreData.nouveaux_intervenants?.length || 0),
        nb_medias: medias.length
      });

      try {
        let oeuvreResponse;
        const mediaFiles = medias.map(m => m.file);
        
        if (mediaFiles.length > 0) {
          console.log('📤 Création avec médias (FormData)');
          oeuvreResponse = await oeuvreService.createOeuvreFormData(oeuvreData as any, mediaFiles);
        } else {
          console.log('📝 Création sans médias (JSON)');
          oeuvreResponse = await oeuvreService.createOeuvre(oeuvreData as any);
        }
        
        if (!oeuvreResponse.success) {
          setSubmitError(oeuvreResponse.error || 'Erreur lors de la création de l\'œuvre');
          return;
        }

        // Succès
        alert(isDraft ? 'Brouillon sauvegardé avec succès !' : 'Œuvre créée avec succès !');
        
        // Redirection
        setTimeout(() => {
          window.location.href = '/dashboard-pro';
        }, 1500);
        
      } catch (error: any) {
        // Gestion du timeout
        if (error.message && 
            (error.message.includes('timeout') || 
             error.message.includes('Timeout') ||
             error.code === 'ECONNABORTED')) {
          
          console.log('⏱️ Timeout détecté, vérification de la création...');
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const checkResult = await oeuvreService.checkRecentOeuvre(formData.titre);
          
          if (checkResult.success && checkResult.data) {
            console.log('✅ Œuvre trouvée malgré le timeout');
            
            if (medias.length > 0) {
              const uploadConfirm = confirm(
                'L\'œuvre a été créée avec succès ! ' +
                'Voulez-vous uploader les médias maintenant ?'
              );
              
              if (uploadConfirm) {
                setUploadProgress('Upload des médias...');
                const mediaFiles = medias.map(m => m.file);
                await oeuvreService.uploadMedias(checkResult.data.id_oeuvre, mediaFiles);
              }
            }
            
            alert('Œuvre créée avec succès ! Redirection...');
            setTimeout(() => {
              window.location.href = '/dashboard-pro';
            }, 1500);
            
          } else {
            setSubmitError(
              'Impossible de vérifier si l\'œuvre a été créée. ' +
              'Veuillez consulter votre tableau de bord ou réessayer.'
            );
          }
        } else {
          setSubmitError(error.message || 'Erreur lors de la création de l\'œuvre');
        }
      }
      
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      setSubmitError(error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'enregistrement');
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  }, [formData, metadata.types_oeuvres, contributeurs, nouveauxIntervenants, editeurs, medias, prepareDetailsSpecifiques]);

  // ============================================================================
  // RENDU DES CHAMPS SPÉCIFIQUES
  // ============================================================================

  const renderSpecificFields = useCallback(() => {
    if (!metadata.types_oeuvres || metadata.types_oeuvres.length === 0) return null;
    
    const typeOeuvre = metadata.types_oeuvres.find((t: any) => t.id_type_oeuvre === formData.id_type_oeuvre);
    if (!typeOeuvre) return null;

    const fieldsConfig: Record<string, React.ReactNode> = {
      'Livre': (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="isbn">ISBN</Label>
            <Input 
              id="isbn" 
              placeholder="978-2-1234-5678-9"
              value={formData.isbn || ''}
              onChange={(e) => handleInputChange('isbn', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nb_pages">Nombre de pages</Label>
            <Input 
              id="nb_pages" 
              type="number" 
              placeholder="Ex: 250"
              value={formData.nb_pages || ''}
              onChange={(e) => handleInputChange('nb_pages', parseInt(e.target.value) || undefined)}
            />
          </div>
        </div>
      ),
      
      'Film': (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="duree_minutes">Durée (minutes)</Label>
            <Input 
              id="duree_minutes" 
              type="number" 
              placeholder="Ex: 120"
              value={formData.duree_minutes || ''}
              onChange={(e) => handleInputChange('duree_minutes', parseInt(e.target.value) || undefined)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="realisateur">Réalisateur</Label>
            <Input 
              id="realisateur" 
              placeholder="Nom du réalisateur"
              value={formData.realisateur || ''}
              onChange={(e) => handleInputChange('realisateur', e.target.value)}
            />
          </div>
        </div>
      ),
      
      'Album Musical': (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="duree_album">Durée totale</Label>
            <Input 
              id="duree_album" 
              placeholder="Ex: 45:30"
              value={formData.duree_album || ''}
              onChange={(e) => handleInputChange('duree_album', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">Label / Maison de production</Label>
            <Input 
              id="label" 
              placeholder="Nom du label"
              value={formData.label || ''}
              onChange={(e) => handleInputChange('label', e.target.value)}
            />
          </div>
        </div>
      ),
      
      'Article': (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="auteur">Auteur</Label>
              <Input 
                id="auteur" 
                placeholder="Nom de l'auteur"
                value={formData.auteur || ''}
                onChange={(e) => handleInputChange('auteur', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Source / Publication</Label>
              <Input 
                id="source" 
                placeholder="Ex: El Watan, Le Monde"
                value={formData.source || ''}
                onChange={(e) => handleInputChange('source', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="resume_article">Résumé de l'article</Label>
            <Textarea 
              id="resume_article" 
              placeholder="Résumé ou chapeau de l'article..."
              className="min-h-[100px]"
              value={formData.resume_article || ''}
              onChange={(e) => handleInputChange('resume_article', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url_source">URL de l'article (optionnel)</Label>
            <Input 
              id="url_source" 
              type="url" 
              placeholder="https://..."
              value={formData.url_source || ''}
              onChange={(e) => handleInputChange('url_source', e.target.value)}
            />
          </div>
        </div>
      ),
      
      'Article Scientifique': (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="journal">Journal / Revue</Label>
              <Input 
                id="journal" 
                placeholder="Nom du journal scientifique"
                value={formData.journal || ''}
                onChange={(e) => handleInputChange('journal', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doi">DOI</Label>
              <Input 
                id="doi" 
                placeholder="10.1234/example"
                value={formData.doi || ''}
                onChange={(e) => handleInputChange('doi', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="volume">Volume</Label>
              <Input 
                id="volume" 
                placeholder="Ex: 12"
                value={formData.volume || ''}
                onChange={(e) => handleInputChange('volume', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero">Numéro</Label>
              <Input 
                id="numero" 
                placeholder="Ex: 3"
                value={formData.numero || ''}
                onChange={(e) => handleInputChange('numero', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pages">Pages</Label>
              <Input 
                id="pages" 
                placeholder="Ex: 123-145"
                value={formData.pages || ''}
                onChange={(e) => handleInputChange('pages', e.target.value)}
              />
            </div>
            <div className="space-y-2 flex items-center">
              <Checkbox 
                id="peer_reviewed" 
                checked={formData.peer_reviewed || false}
                onCheckedChange={(checked) => handleInputChange('peer_reviewed', checked === true)}
              />
              <Label htmlFor="peer_reviewed" className="ml-2">Article évalué par des pairs</Label>
            </div>
          </div>
        </div>
      ),
      
      'Artisanat': (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="id_materiau">Matériau principal</Label>
            <Select 
              value={formData.id_materiau?.toString() || ''}
              onValueChange={(value) => handleInputChange('id_materiau', value ? parseInt(value) : undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un matériau" />
              </SelectTrigger>
              <SelectContent>
                {metadata.materiaux?.map((materiau: any) => (
                  <SelectItem key={materiau.id_materiau} value={materiau.id_materiau.toString()}>
                    {materiau.nom}
                  </SelectItem>
                )) || <SelectItem value="0" disabled>Aucun matériau disponible</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="id_technique">Technique utilisée</Label>
            <Select 
              value={formData.id_technique?.toString() || ''}
              onValueChange={(value) => handleInputChange('id_technique', value ? parseInt(value) : undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une technique" />
              </SelectTrigger>
              <SelectContent>
                {metadata.techniques?.map((technique: any) => (
                  <SelectItem key={technique.id_technique} value={technique.id_technique.toString()}>
                    {technique.nom}
                  </SelectItem>
                )) || <SelectItem value="0" disabled>Aucune technique disponible</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dimensions">Dimensions (cm)</Label>
            <Input 
              id="dimensions" 
              placeholder="Ex: 30x20x15"
              value={formData.dimensions || ''}
              onChange={(e) => handleInputChange('dimensions', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="poids">Poids (kg)</Label>
            <Input 
              id="poids" 
              type="number" 
              step="0.1"
              placeholder="Ex: 1.5"
              value={formData.poids || ''}
              onChange={(e) => handleInputChange('poids', parseFloat(e.target.value) || undefined)}
            />
          </div>
        </div>
      ),
      
      'Œuvre d\'Art': (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="technique_art">Technique artistique</Label>
            <Input 
              id="technique_art" 
              placeholder="Ex: Huile sur toile, Aquarelle"
              value={formData.technique_art || ''}
              onChange={(e) => handleInputChange('technique_art', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dimensions_art">Dimensions (cm)</Label>
            <Input 
              id="dimensions_art" 
              placeholder="Ex: 100x80"
              value={formData.dimensions_art || ''}
              onChange={(e) => handleInputChange('dimensions_art', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="support">Support</Label>
            <Input 
              id="support" 
              placeholder="Ex: Toile, Papier, Bois"
              value={formData.support || ''}
              onChange={(e) => handleInputChange('support', e.target.value)}
            />
          </div>
        </div>
      )
    };

    return fieldsConfig[typeOeuvre.nom_type] || null;
  }, [metadata.types_oeuvres, formData, handleInputChange]);

  // ============================================================================
  // RENDU CONDITIONNEL SELON L'ÉTAT
  // ============================================================================

  if (loadingMetadata) {
    return (
      <div className="min-h-screen bg-background pattern-geometric flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (!loadingMetadata && (!metadata.types_oeuvres || metadata.types_oeuvres.length === 0)) {
    return (
      <div className="min-h-screen bg-background pattern-geometric">
        <div className="container py-12">
          <div className="max-w-4xl mx-auto">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {submitError || 'Impossible de charger les données nécessaires au formulaire.'}
                <Button 
                  variant="link" 
                  className="ml-2 px-0"
                  onClick={() => {
                    setLoadingMetadata(true);
                    setSubmitError(null);
                    loadMetadata();
                  }}
                >
                  Réessayer
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDU PRINCIPAL
  // ============================================================================

  return (
    <div className="min-h-screen bg-background pattern-geometric">
      <div className="container py-12">
        <div className="max-w-4xl mx-auto">
          {/* En-tête */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="hover-lift"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-4xl font-bold tracking-tight font-serif text-gradient">
                  Ajouter une œuvre
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  Partagez votre création avec la communauté
                </p>
              </div>
            </div>
            {isAuthenticated && user && (
              <div className="text-right text-sm text-muted-foreground">
                <p>Connecté en tant que</p>
                <p className="font-medium text-foreground">
                  {user.prenom || ''} {user.nom || user.email || 'Utilisateur'}
                </p>
              </div>
            )}
          </div>

          {/* Alerte d'authentification */}
          {!isAuthenticated && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Vous devez être connecté pour ajouter une œuvre. 
                <Button variant="link" className="px-1" onClick={() => window.location.href = '/login'}>
                  Se connecter
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Erreur de soumission */}
          {submitError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-8">
            {/* Type d'œuvre */}
            <Card className="shadow-cultural">
              <CardHeader>
                <CardTitle className="text-2xl font-serif">Type d'œuvre</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {metadata.types_oeuvres?.map((type: any) => (
                    <Button
                      key={type.id_type_oeuvre}
                      type="button"
                      variant={formData.id_type_oeuvre === type.id_type_oeuvre ? "default" : "outline"}
                      className={`h-auto py-4 flex flex-col items-center space-y-2 hover-lift ${
                        formData.id_type_oeuvre === type.id_type_oeuvre 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-secondary hover:text-secondary-foreground'
                      }`}
                      onClick={() => handleInputChange('id_type_oeuvre', type.id_type_oeuvre)}
                    >
                      {getTypeIcon(type.id_type_oeuvre)}
                      <span className="font-medium">{type.nom_type}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Informations générales */}
            {formData.id_type_oeuvre > 0 && (
              <Card className="shadow-cultural">
                <CardHeader>
                  <CardTitle className="text-2xl font-serif">Informations générales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="titre" className="text-base">Titre de l'œuvre *</Label>
                      <Input 
                        id="titre" 
                        placeholder="Ex: L'art de la calligraphie maghrebine"
                        value={formData.titre}
                        onChange={(e) => handleInputChange('titre', e.target.value)}
                        className="hover:border-primary focus:border-primary"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="id_langue" className="text-base">Langue *</Label>
                      <Select 
                        value={formData.id_langue.toString()}
                        onValueChange={(value) => handleInputChange('id_langue', parseInt(value))}
                      >
                        <SelectTrigger className="hover:border-primary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {metadata.langues?.map((langue: any) => (
                            <SelectItem key={langue.id_langue} value={langue.id_langue.toString()}>
                              {langue.nom}
                            </SelectItem>
                          )) || <SelectItem value="1">Français</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="annee_creation" className="text-base">Année de création</Label>
                      <Input 
                        id="annee_creation" 
                        type="number" 
                        placeholder={new Date().getFullYear().toString()}
                        value={formData.annee_creation || ''}
                        onChange={(e) => handleInputChange('annee_creation', parseInt(e.target.value) || undefined)}
                        className="hover:border-primary focus:border-primary"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="prix" className="text-base">Prix (en DA)</Label>
                      <Input 
                        id="prix" 
                        type="number" 
                        placeholder="Ex: 1200"
                        value={formData.prix || ''}
                        onChange={(e) => handleInputChange('prix', parseInt(e.target.value) || undefined)}
                        className="hover:border-primary focus:border-primary"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-base">Description *</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Décrivez votre œuvre, son contexte, ses influences..."
                      className="min-h-[120px] hover:border-primary focus:border-primary"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Champs spécifiques selon le type */}
            {formData.id_type_oeuvre > 0 && (
              <Card className="shadow-cultural">
                <CardHeader>
                  <CardTitle className="text-2xl font-serif">
                    Informations spécifiques - {metadata.types_oeuvres?.find((t: any) => t.id_type_oeuvre === formData.id_type_oeuvre)?.nom_type}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderSpecificFields()}
                </CardContent>
              </Card>
            )}

            {/* Sélection des catégories */}
            {formData.id_type_oeuvre > 0 && (
              <CategorySelection
                typeOeuvreId={formData.id_type_oeuvre}
                selectedCategories={formData.categories}
                onCategoriesChange={(categories) => handleInputChange('categories', categories)}
              />
            )}

            {/* Gestion des intervenants et éditeurs */}
            {formData.id_type_oeuvre > 0 && metadata.types_users && metadata.editeurs && (
              <IntervenantEditeurManager
                typeOeuvreId={formData.id_type_oeuvre}
                typesUsers={metadata.types_users}
                editeurs={metadata.editeurs}
                onIntervenantsChange={handleIntervenantsChange}
                onEditeursChange={handleEditeursChange}
              />
            )}

            {/* Tags */}
            {formData.id_type_oeuvre > 0 && (
              <Card className="shadow-cultural">
                <CardHeader>
                  <CardTitle className="text-2xl font-serif">Tags</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Tags sélectionnés */}
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="pl-3 pr-1 bg-secondary hover:bg-secondary/80">
                        {tag}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1 ml-1 hover:bg-transparent"
                          onClick={() => handleTagRemove(tag)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>

                  {/* Input pour ajouter des tags */}
                  <div className="relative">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ajouter un tag..."
                        value={newTag}
                        onChange={(e) => {
                          setNewTag(e.target.value);
                          setShowTagSuggestions(e.target.value.length > 0);
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleTagAdd(newTag);
                          }
                        }}
                        className="hover:border-primary focus:border-primary"
                      />
                      <Button 
                        type="button"
                        size="sm"
                        onClick={() => handleTagAdd(newTag)}
                        disabled={!newTag}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Suggestions de tags */}
                    {showTagSuggestions && newTag && metadata.tags && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-10 max-h-48 overflow-auto">
                        {metadata.tags
                          .filter((tag: TagMotCle) => tag.nom.toLowerCase().includes(newTag.toLowerCase()) && !formData.tags.includes(tag.nom))
                          .slice(0, 5)
                          .map((tag: TagMotCle) => (
                            <button
                              key={tag.id_tag}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-secondary transition-colors"
                              onClick={() => handleTagAdd(tag.nom)}
                            >
                              {tag.nom}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Tags suggérés */}
                  {suggestedTags.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Tags suggérés :</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestedTags
                          .filter(tag => !formData.tags.includes(tag))
                          .map(tag => (
                            <Button
                              key={tag}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleTagAdd(tag)}
                              className="hover:bg-primary hover:text-primary-foreground hover:border-primary"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {tag}
                            </Button>
                          ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Fichiers et médias */}
            {formData.id_type_oeuvre > 0 && (
              <Card className="shadow-cultural">
                <CardHeader>
                  <CardTitle className="text-2xl font-serif">Fichiers et médias</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Médias uploadés */}
                  {medias.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-lg">Médias ajoutés</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {medias.map(media => (
                          <div key={media.id} className="relative group">
                            <div className="border rounded-lg p-4 space-y-2 hover-lift bg-card">
                              {/* Aperçu */}
                              {media.type === 'image' && media.preview ? (
                                <img 
                                  src={media.preview} 
                                  alt={media.titre || 'Aperçu'} 
                                  className="w-full h-32 object-cover rounded"
                                />
                              ) : (
                                <div className="w-full h-32 bg-muted rounded flex items-center justify-center">
                                  {media.type === 'video' && <Film className="h-8 w-8 text-muted-foreground" />}
                                  {media.type === 'audio' && <Music className="h-8 w-8 text-muted-foreground" />}
                                  {media.type === 'document' && <FileText className="h-8 w-8 text-muted-foreground" />}
                                </div>
                              )}
                              
                              {/* Infos */}
                              <p className="text-sm truncate">{media.file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(media.file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                              
                              {/* Badge média principal */}
                              {media.isPrincipal && (
                                <Badge variant="default" className="text-xs bg-accent text-accent-foreground">
                                  Principal
                                </Badge>
                              )}
                              
                              {/* Actions */}
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity space-x-1">
                                {!media.isPrincipal && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleSetPrincipalMedia(media.id)}
                                    title="Définir comme média principal"
                                  >
                                    ⭐
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleMediaRemove(media.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Zone d'upload */}
                  <div className="space-y-2">
                    <Label className="text-base">Ajouter des médias</Label>
                    <div 
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                        isDragging 
                          ? 'border-primary bg-primary/5' 
                          : 'border-muted-foreground/25 hover:border-primary/50'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-foreground mb-2">
                        Glissez-déposez vos fichiers ou cliquez pour sélectionner
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Images, vidéos, audio ou documents (max 100MB par fichier)
                      </p>
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                        onChange={(e) => e.target.files && handleMediaUpload(e.target.files)}
                        className="hidden"
                        id="media-upload"
                      />
                      <Button 
                        type="button"
                        variant="outline" 
                        onClick={() => document.getElementById('media-upload')?.click()}
                        className="hover:bg-primary hover:text-primary-foreground hover:border-primary"
                      >
                        Choisir des fichiers
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            {formData.id_type_oeuvre > 0 && (
              <div className="space-y-4">
                {uploadProgress && (
                  <div className="text-center text-sm text-muted-foreground animate-pulse">
                    {uploadProgress}
                  </div>
                )}
                <div className="flex justify-end space-x-4">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => handleSubmit(true)}
                    disabled={loading || !isAuthenticated}
                    className="hover:bg-secondary hover:text-secondary-foreground hover:border-secondary"
                  >
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Sauvegarder comme brouillon
                  </Button>
                  <Button 
                    type="button"
                    onClick={() => handleSubmit(false)}
                    disabled={loading || !isAuthenticated}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-cultural"
                  >
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Save className="h-4 w-4 mr-2" />
                    Publier l'œuvre
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AjouterOeuvre;