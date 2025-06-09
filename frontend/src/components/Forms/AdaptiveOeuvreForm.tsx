// AdaptiveOeuvreForm.tsx - VERSION FINALE AVEC METADATASERVICE

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  HiBookOpen as Book,
  HiNewspaper as Newspaper,
  HiFilm as Film,
  HiMusicalNote as Music,
  HiCamera as Camera,
  HiPaintBrush as Palette,
  HiBeaker as FlaskConical,
  HiPlus as Plus,
  HiXMark as X,
  HiInformationCircle as Info,
  HiExclamationTriangle as AlertTriangle,
  HiCheckCircle as CheckCircle,
  HiArrowLeft,
  HiArrowRight,
  HiTrash as Trash2,
  HiCloudArrowUp as Upload,
  HiSparkles,
  HiClock,
  HiStar,
  HiUserGroup as Users,
  HiMagnifyingGlass as Search,
  HiArrowPath as Loader
} from 'react-icons/hi2';

// ✅ IMPORTS CORRECTS
import { useOeuvres } from '../../hooks/useOeuvre';
import { useNotificationsContext } from '../../components/providers/NotificationProvider';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { useSearchApi } from '../../hooks/useSearchApi';
import { userService } from '../../services/api/users';
import { mediaService } from '../../services/api/media';
import TagSelector from '../../components/Forms/TagSelector';
import FileUpload from '../../components/Upload/FileUpload';
import { Loading } from '../../components/UI';

// ✅ IMPORT DU SERVICE MÉTADONNÉES
import { metadataService } from '../../services/api/metadata';

// ✅ IMPORT DU FICHIER UPLOAD COMPLET
import type { UploadedFile, FileUploadResult } from '../../types/upload';



const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  if (typeof error === 'string') return error;
  return 'Une erreur est survenue';
};
// ✅ IMPORTS DE TYPES CORRECTS
import type { 
  Oeuvre, 
  CreateOeuvreData,
  UpdateOeuvreData
} from '../../types/oeuvre';
import type { User } from '../../types/user';
import type { TypeOeuvre, Langue, Categorie, Genre } from '../../types/classification';

// =============================================================================
// INTERFACES
// =============================================================================

interface AdaptiveOeuvreFormProps {
  initialData?: Partial<Oeuvre> | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormDataState {
  // Informations de base
  titre: string;
  description: string;
  type_oeuvre: string;
  langue: string;
  annee_creation: string;
  
  // Catégories et tags
  categories: string[];
  auteurs: Array<{
    id_user: number;
    nom: string;
    prenom: string;
    role?: string;
  }>;
  tags: string[];
  
  // Médias
  imageUrls: string[];
  pendingFiles: UploadedFile[];
  existingMediaIds: number[];
  
  // Champs spécifiques par type
  isbn: string;
  nb_pages: string;
  editeur_original: string;
  id_genre_livre: string;
  
  duree_minutes: string;
  realisateur: string;
  budget: string;
  classification: string;
  id_genre_film: string;
  
  duree: string;
  label: string;
  nombre_pistes: string;
  id_genre_album: string;
  
  source: string;
  type_article: string;
  niveau_credibilite: string;
  fact_checked: boolean;
  
  journal: string;
  doi: string;
  peer_reviewed: boolean;
  
  technique_photo: string;
  appareil: string;
  lieu_prise: string;
  
  technique: string;
  dimensions: string;
  support: string;
  style_artistique: string;
  
  id_materiau: string;
  id_technique: string;
  region_origine: string;
  niveau_difficulte: string;
  prix: string;
  
  statut: string;
}

// =============================================================================
// ICÔNES PAR TYPE D'ŒUVRE
// =============================================================================

const typeIcons: Record<string, React.ComponentType<any>> = {
  'Livre': Book,
  'Film': Film,
  'Album Musical': Music,
  'Article': Newspaper,
  'Article Scientifique': FlaskConical,
  'Photographie': Camera,
  'Œuvre d\'Art': Palette,
  'Artisanat': FlaskConical
};

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

const AdaptiveOeuvreForm: React.FC<AdaptiveOeuvreFormProps> = ({ 
  initialData = null, 
  onSuccess, 
  onCancel 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ✅ RÉCUPÉRATION DES MÉTADONNÉES AVEC LE SERVICE
  const { 
    data: metadataBundle, 
    isLoading: metadataLoading,
    error: metadataError,
    refetch: refetchMetadata
  } = useApi(
    async () => {
      console.log('🔄 Chargement des métadonnées via service...');
      const result = await metadataService.getAll();
      console.log('✅ Métadonnées chargées:', {
        types_oeuvres: result.types_oeuvres?.length || 0,
        langues: result.langues?.length || 0,
        categories: result.categories?.length || 0,
        genres: result.genres?.length || 0
      });
      return result;
    },
    { immediate: true }
  );

  // ✅ EXTRACTION SÉCURISÉE DES DONNÉES
  const types_oeuvres = metadataBundle?.types_oeuvres || [];
  const langues = metadataBundle?.langues || [];
  const categories = metadataBundle?.categories || [];
  const genres = metadataBundle?.genres || [];

  // ✅ GESTION D'ERREUR DES MÉTADONNÉES
  if (metadataError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 max-w-md mx-auto">
          <div className="mb-4">
            <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-600 mb-2">
              Erreur de chargement des métadonnées
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              {getErrorMessage(metadataError)}
            </p>
          </div>
          <div className="space-x-3">
            <button 
              onClick={() => refetchMetadata()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Réessayer
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Recharger la page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ AUTRES HOOKS
  const { addNotification } = useNotificationsContext();
  const { user } = useAuth();
  const { createOeuvre, updateOeuvre, createWithSpecificDetails } = useOeuvres();

  // ✅ Chargement des écrivains
  const { 
    data: ecrivains = [], 
    isLoading: loadingEcrivains,
    refetch: refetchEcrivains
  } = useApi(
    async () => {
      const response = await userService.getEcrivains({ limit: 100 });
      return response.data.items || [];
    },
    { immediate: true }
  );

  // ✅ Recherche d'écrivains
  const searchEcrivains = useSearchApi(
    async (query: string) => {
      return await userService.searchByType('ecrivain', query);
    },
    { debounceMs: 300, minLength: 2 }
  );

  // ✅ ÉTAT DU FORMULAIRE
  const [formData, setFormData] = useState<FormDataState>({
    // Informations de base
    titre: initialData?.titre || '',
    description: initialData?.description || '',
    type_oeuvre: initialData?.id_type_oeuvre?.toString() || '',
    langue: initialData?.id_langue?.toString() || '',
    annee_creation: initialData?.annee_creation?.toString() || '',
    
    // Catégories et tags
    categories: initialData?.Categories?.map((c: Categorie) => c.id_categorie.toString()) || [],
    auteurs: initialData?.Users?.map((u: User) => ({ 
      id_user: u.id_user, 
      nom: u.nom, 
      prenom: u.prenom,
      role: 'auteur'
    })) || [],
    tags: initialData?.TagMotCles?.map((t: any) => t.nom) || [],
    
    // Médias
    imageUrls: initialData?.Medias?.map((m: any) => m.url).filter(Boolean) || [],
    pendingFiles: [],
    existingMediaIds: initialData?.Medias?.map((m: any) => m.id_media) || [],
    
    // Champs spécifiques
    isbn: initialData?.Livre?.isbn || '',
    nb_pages: initialData?.Livre?.nb_pages?.toString() || '',
    editeur_original: initialData?.Livre?.editeur_original || '',
    id_genre_livre: initialData?.Livre?.id_genre?.toString() || '',
    
    duree_minutes: initialData?.Film?.duree_minutes?.toString() || '',
    realisateur: initialData?.Film?.realisateur || '',
    budget: initialData?.Film?.budget?.toString() || '',
    classification: initialData?.Film?.classification || '',
    id_genre_film: initialData?.Film?.id_genre?.toString() || '',
    
    duree: initialData?.AlbumMusical?.duree?.toString() || '',
    label: initialData?.AlbumMusical?.label || '',
    nombre_pistes: initialData?.AlbumMusical?.nombre_pistes?.toString() || '',
    id_genre_album: initialData?.AlbumMusical?.id_genre?.toString() || '',
    
    source: initialData?.Article?.source || '',
    type_article: initialData?.Article?.type_article || '',
    niveau_credibilite: initialData?.Article?.niveau_credibilite || '',
    fact_checked: initialData?.Article?.fact_checked || false,
    
    journal: initialData?.ArticleScientifique?.journal || '',
    doi: initialData?.ArticleScientifique?.doi || '',
    peer_reviewed: initialData?.ArticleScientifique?.peer_reviewed || false,
    
    technique_photo: '',
    appareil: '',
    lieu_prise: '',
    
    technique: initialData?.OeuvreArt?.technique || '',
    dimensions: initialData?.OeuvreArt?.dimensions || '',
    support: initialData?.OeuvreArt?.support || '',
    style_artistique: initialData?.OeuvreArt?.style_artistique || '',
    
    id_materiau: initialData?.Artisanat?.id_materiau?.toString() || '',
    id_technique: initialData?.Artisanat?.id_technique?.toString() || '',
    region_origine: initialData?.Artisanat?.region_origine || '',
    niveau_difficulte: initialData?.Artisanat?.niveau_difficulte || '',
    prix: initialData?.Artisanat?.prix?.toString() || '',
    
    statut: initialData?.statut || 'brouillon'
  });

  const [searchAuteur, setSearchAuteur] = useState('');

  // ✅ FONCTIONS UTILITAIRES
  const getSelectedType = useCallback((): TypeOeuvre | undefined => {
    return types_oeuvres.find((t: TypeOeuvre) => t.id_type_oeuvre.toString() === formData.type_oeuvre);
  }, [types_oeuvres, formData.type_oeuvre]);

  const getFilteredGenres = useCallback(() => {
    const selectedType = getSelectedType();
    if (!selectedType || !genres) return [];
    
    return genres.filter((genre: Genre) => 
      !genre.type_oeuvre || genre.type_oeuvre === selectedType.nom_type
    );
  }, [getSelectedType, genres]);

  // Options dynamiques
  const options = useMemo(() => ({
    typesArticles: [
      { value: 'presse', label: 'Presse' },
      { value: 'blog', label: 'Blog' },
      { value: 'magazine', label: 'Magazine' },
      { value: 'editorial', label: 'Éditorial' }
    ],
    niveauxCredibilite: [
      { value: 'tres_fiable', label: 'Très fiable' },
      { value: 'fiable', label: 'Fiable' },
      { value: 'moyen', label: 'Moyen' },
      { value: 'peu_fiable', label: 'Peu fiable' }
    ],
    classifications: [
      { value: 'G', label: 'Tout public' },
      { value: 'PG-13', label: 'Accord parental -13 ans' },
      { value: 'R', label: 'Interdit -17 ans' }
    ],
    niveauxDifficulte: [
      { value: 'facile', label: 'Facile' },
      { value: 'moyen', label: 'Moyen' },
      { value: 'difficile', label: 'Difficile' },
      { value: 'expert', label: 'Expert' }
    ]
  }), []);

  const canGoNext = useCallback(() => {
    switch (currentStep) {
      case 1:
        return formData.titre && formData.type_oeuvre && formData.description && formData.langue;
      case 2:
        return formData.categories.length > 0 && formData.auteurs.length > 0;
      case 3:
        return true;
      default:
        return true;
    }
  }, [currentStep, formData]);

  // ✅ GESTIONNAIRES D'ÉVÉNEMENTS
  const handleFileUpload = useCallback((urls: string[]) => {
    setFormData(prev => ({ 
      ...prev, 
      imageUrls: [...prev.imageUrls, ...urls]
    }));
    
    addNotification({
      type: 'success',
      title: 'Upload réussi',
      message: `${urls.length} image(s) ajoutée(s) avec succès`
    });
  }, [addNotification]);

  const handleUploadError = useCallback((error: string) => {
    addNotification({
      type: 'error',
      title: 'Erreur d\'upload',
      message: error
    });
  }, [addNotification]);

  const removeImage = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index)
    }));
  }, []);

  const addAuteur = useCallback((ecrivain: User) => {
    if (!formData.auteurs.find(a => a.id_user === ecrivain.id_user)) {
      setFormData(prev => ({
        ...prev,
        auteurs: [...prev.auteurs, {
          id_user: ecrivain.id_user,
          nom: ecrivain.nom,
          prenom: ecrivain.prenom,
          role: 'auteur'
        }]
      }));
    }
  }, [formData.auteurs]);

  const removeAuteur = useCallback((id_user: number) => {
    setFormData(prev => ({
      ...prev,
      auteurs: prev.auteurs.filter(a => a.id_user !== id_user)
    }));
  }, []);

  const handleTagsChange = useCallback((tags: string[]) => {
    setFormData(prev => ({ ...prev, tags }));
  }, []);

  // ✅ CONSTRUCTION DES DÉTAILS SPÉCIFIQUES
  const buildDetailsSpecifiques = useCallback(() => {
    const selectedType = getSelectedType();
    if (!selectedType) return {};

    const details: any = {};

    switch (selectedType.nom_type) {
      case 'Livre':
        details.livre = {
          isbn: formData.isbn || undefined,
          nb_pages: formData.nb_pages ? parseInt(formData.nb_pages) : undefined,
          editeur_original: formData.editeur_original || undefined,
          id_genre: formData.id_genre_livre ? parseInt(formData.id_genre_livre) : undefined
        };
        break;

      case 'Film':
        details.film = {
          duree_minutes: formData.duree_minutes ? parseInt(formData.duree_minutes) : undefined,
          realisateur: formData.realisateur || undefined,
          budget: formData.budget ? parseFloat(formData.budget) : undefined,
          classification: formData.classification || undefined,
          id_genre: formData.id_genre_film ? parseInt(formData.id_genre_film) : undefined
        };
        break;

      case 'Album Musical':
        details.album = {
          duree: formData.duree ? parseInt(formData.duree) : undefined,
          label: formData.label,
          nombre_pistes: formData.nombre_pistes ? parseInt(formData.nombre_pistes) : undefined,
          id_genre: formData.id_genre_album ? parseInt(formData.id_genre_album) : undefined
        };
        break;

      case 'Article':
        details.article = {
          source: formData.source || undefined,
          type_article: formData.type_article || undefined,
          niveau_credibilite: formData.niveau_credibilite || undefined,
          fact_checked: formData.fact_checked
        };
        break;

      case 'Article Scientifique':
        details.article_scientifique = {
          journal: formData.journal || undefined,
          doi: formData.doi || undefined,
          peer_reviewed: formData.peer_reviewed
        };
        break;

      case 'Artisanat':
        details.artisanat = {
          id_materiau: formData.id_materiau ? parseInt(formData.id_materiau) : undefined,
          id_technique: formData.id_technique ? parseInt(formData.id_technique) : undefined,
          region_origine: formData.region_origine || undefined,
          niveau_difficulte: formData.niveau_difficulte || undefined,
          prix: formData.prix ? parseFloat(formData.prix) : undefined
        };
        break;

      case 'Œuvre d\'Art':
        details.oeuvre_art = {
          technique: formData.technique || undefined,
          dimensions: formData.dimensions || undefined,
          support: formData.support || undefined,
          style_artistique: formData.style_artistique || undefined
        };
        break;
    }

    return details;
  }, [formData, getSelectedType]);

  // ✅ SOUMISSION DU FORMULAIRE
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const dataToSubmit: CreateOeuvreData = {
        titre: formData.titre,
        description: formData.description,
        id_type_oeuvre: parseInt(formData.type_oeuvre),
        id_langue: parseInt(formData.langue),
        annee_creation: formData.annee_creation ? parseInt(formData.annee_creation) : undefined,
        categories: formData.categories.map(c => parseInt(c)),
        auteurs: formData.auteurs.map(a => ({
          id_user: a.id_user,
          role: 'auteur' as any,
          role_principal: true
        })),
        tags: formData.tags,
        details_specifiques: buildDetailsSpecifiques()
      };

      let result;
      if (initialData?.id_oeuvre) {
        result = await updateOeuvre(initialData.id_oeuvre, dataToSubmit as UpdateOeuvreData);
      } else {
        result = await createWithSpecificDetails(dataToSubmit);
      }

      if (result) {
        addNotification({
          type: 'success',
          title: 'Succès',
          message: initialData ? 'Œuvre modifiée avec succès' : 'Œuvre créée avec succès'
        });
        
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Une erreur est survenue'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ RENDU DES CHAMPS SPÉCIFIQUES
  const renderSpecificFields = () => {
    const selectedType = getSelectedType();
    if (!selectedType) return null;

    const filteredGenres = getFilteredGenres();

    switch (selectedType.nom_type) {
      case 'Livre':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Genre littéraire</label>
              <select
                value={formData.id_genre_livre}
                onChange={(e) => setFormData({ ...formData, id_genre_livre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sélectionner un genre</option>
                {filteredGenres.map((genre: Genre) => (
                  <option key={genre.id_genre} value={genre.id_genre.toString()}>
                    {genre.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ISBN</label>
              <input
                type="text"
                value={formData.isbn}
                onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                placeholder="978-0-123456-78-9"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de pages</label>
              <input
                type="number"
                value={formData.nb_pages}
                onChange={(e) => setFormData({ ...formData, nb_pages: e.target.value })}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Éditeur original</label>
              <input
                type="text"
                value={formData.editeur_original}
                onChange={(e) => setFormData({ ...formData, editeur_original: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </>
        );

      case 'Film':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Genre cinématographique</label>
              <select
                value={formData.id_genre_film}
                onChange={(e) => setFormData({ ...formData, id_genre_film: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sélectionner un genre</option>
                {filteredGenres.map((genre: Genre) => (
                  <option key={genre.id_genre} value={genre.id_genre.toString()}>
                    {genre.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Durée (minutes)</label>
              <input
                type="number"
                value={formData.duree_minutes}
                onChange={(e) => setFormData({ ...formData, duree_minutes: e.target.value })}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Réalisateur</label>
              <input
                type="text"
                value={formData.realisateur}
                onChange={(e) => setFormData({ ...formData, realisateur: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Classification</label>
              <select
                value={formData.classification}
                onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sélectionner</option>
                {options.classifications.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </>
        );

      case 'Album Musical':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Genre musical</label>
              <select
                value={formData.id_genre_album}
                onChange={(e) => setFormData({ ...formData, id_genre_album: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sélectionner un genre</option>
                {filteredGenres.map((genre: Genre) => (
                  <option key={genre.id_genre} value={genre.id_genre.toString()}>
                    {genre.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Label</label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Durée (minutes)</label>
              <input
                type="number"
                value={formData.duree}
                onChange={(e) => setFormData({ ...formData, duree: e.target.value })}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de pistes</label>
              <input
                type="number"
                value={formData.nombre_pistes}
                onChange={(e) => setFormData({ ...formData, nombre_pistes: e.target.value })}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  // Obtenir les écrivains à afficher
  const displayedEcrivains = searchAuteur ? searchEcrivains.results : ecrivains;

  const steps = [
    { id: 1, name: 'Informations de base' },
    { id: 2, name: 'Détails et catégories' },
    { id: 3, name: 'Médias' },
    { id: 4, name: 'Publication' }
  ];

  // ✅ AFFICHAGE DU LOADING
  if (metadataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des métadonnées...</p>
          <p className="text-sm text-gray-500 mt-2">
            Types d'œuvres, langues, catégories...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* En-tête */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {initialData ? 'Modifier l\'œuvre' : 'Créer une nouvelle œuvre'}
          </h1>
          <p className="mt-2 text-gray-600">
            Partagez votre création culturelle avec la communauté
          </p>
        </div>

        {/* Indicateur d'étapes */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className={`flex items-center ${index > 0 ? 'ml-4' : ''}`}>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= step.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {currentStep > step.id ? <CheckCircle size={20} /> : step.id}
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-900 hidden sm:block">
                    {step.name}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-1 mx-2 ${
                      currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          
          {/* Étape 1: Informations de base */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-6">Informations de base</h2>

              {/* Type d'œuvre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Type d'œuvre <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {types_oeuvres
                    ?.filter((t: TypeOeuvre) => t.id_type_oeuvre !== 7)
                    .map((type: TypeOeuvre) => {
                      const Icon = typeIcons[type.nom_type] || Book;
                      return (
                        <label
                          key={type.id_type_oeuvre}
                          className={`relative flex flex-col items-center cursor-pointer rounded-lg border-2 p-4 transition-all ${
                            formData.type_oeuvre === type.id_type_oeuvre.toString()
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="type_oeuvre"
                            value={type.id_type_oeuvre}
                            checked={formData.type_oeuvre === type.id_type_oeuvre.toString()}
                            onChange={(e) => setFormData({ ...formData, type_oeuvre: e.target.value })}
                            className="sr-only"
                          />
                          <Icon
                            size={32}
                            className={`mb-2 ${
                              formData.type_oeuvre === type.id_type_oeuvre.toString()
                                ? 'text-blue-600' 
                                : 'text-gray-400'
                            }`}
                            style={{ 
                              color: formData.type_oeuvre === type.id_type_oeuvre.toString() 
                                ? type.couleur 
                                : undefined 
                            }}
                          />
                          <span className="text-sm font-medium text-center">
                            {type.nom_type}
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Titre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre de l'œuvre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.titre}
                  onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Entrez le titre de votre œuvre"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Décrivez votre œuvre..."
                />
              </div>

              {/* Langue */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Langue <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.langue}
                  onChange={(e) => setFormData({ ...formData, langue: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sélectionner une langue</option>
                  {langues?.map((langue: Langue) => (
                    <option key={langue.id_langue} value={langue.id_langue.toString()}>
                      {langue.nom}
                    </option>
                  ))}
                </select>
              </div>

              {/* Année de création */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Année de création</label>
                <input
                  type="number"
                  value={formData.annee_creation}
                  onChange={(e) => setFormData({ ...formData, annee_creation: e.target.value })}
                  min="1000"
                  max={new Date().getFullYear()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 2023"
                />
              </div>
            </div>
          )}

          {/* Étape 2: Détails et catégories */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-6">
                Détails et catégories
                {getSelectedType() && (
                  <span className="ml-2 text-sm font-normal text-blue-600">
                    ({getSelectedType()!.nom_type})
                  </span>
                )}
              </h2>

              {/* Champs spécifiques au type */}
              {formData.type_oeuvre && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {renderSpecificFields()}
                </div>
              )}

              {/* Auteurs (écrivains) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auteurs/Créateurs <span className="text-red-500">*</span>
                </label>
                
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={searchAuteur}
                    onChange={(e) => {
                      setSearchAuteur(e.target.value);
                      if (e.target.value) {
                        searchEcrivains.setQuery(e.target.value);
                      } else {
                        searchEcrivains.clearSearch();
                      }
                    }}
                    placeholder="Rechercher un écrivain..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {(loadingEcrivains || searchEcrivains.isSearching) && (
                    <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                  )}
                </div>

                {displayedEcrivains && displayedEcrivains.length > 0 && (
                  <div className="mb-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                    {displayedEcrivains.map((ecrivain: User) => (
                      <button
                        key={ecrivain.id_user}
                        type="button"
                        onClick={() => {
                          addAuteur(ecrivain);
                          setSearchAuteur('');
                          searchEcrivains.clearSearch();
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
                        disabled={formData.auteurs.find(a => a.id_user === ecrivain.id_user) !== undefined}
                      >
                        <div className="flex items-center justify-between">
                          <span className={formData.auteurs.find(a => a.id_user === ecrivain.id_user) ? 'text-gray-400' : ''}>
                            {ecrivain.prenom} {ecrivain.nom}
                          </span>
                          {formData.auteurs.find(a => a.id_user === ecrivain.id_user) && (
                            <span className="text-xs text-gray-500">Déjà ajouté</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {formData.auteurs.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.auteurs.map(auteur => (
                      <span
                        key={auteur.id_user}
                        className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                      >
                        {auteur.prenom} {auteur.nom}
                        <button
                          type="button"
                          onClick={() => removeAuteur(auteur.id_user)}
                          className="ml-2 text-green-600 hover:text-green-800"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Catégories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catégories <span className="text-red-500">*</span>
                </label>
                <select
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value && !formData.categories.includes(value)) {
                      setFormData({ ...formData, categories: [...formData.categories, value] });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value=""
                >
                  <option value="">Ajouter une catégorie...</option>
                  {categories?.map((cat: Categorie) => (
                    <option
                      key={cat.id_categorie}
                      value={cat.id_categorie.toString()}
                      disabled={formData.categories.includes(cat.id_categorie.toString())}
                    >
                      {cat.nom}
                    </option>
                  ))}
                </select>
                {formData.categories.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.categories.map(catId => {
                      const cat = categories?.find((c: Categorie) => c.id_categorie.toString() === catId);
                      return (
                        <span
                          key={catId}
                          className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                        >
                          {cat?.nom || catId}
                          <button
                            type="button"
                            onClick={() => setFormData({ 
                              ...formData, 
                              categories: formData.categories.filter(id => id !== catId) 
                            })}
                            className="ml-2 text-purple-600 hover:text-purple-800"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tags */}
              <TagSelector
                selectedTags={formData.tags}
                onTagsChange={handleTagsChange}
                typeOeuvre={getSelectedType()?.nom_type}
                categories={formData.categories}
                langue={formData.langue}
                titre={formData.titre}
                description={formData.description}
              />
            </div>
          )}

          {/* Étape 3: Médias */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-6">Médias et fichiers</h2>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="text-blue-600 mt-0.5 mr-3" size={20} />
                  <div>
                    <h4 className="font-medium text-blue-900">
                      Ajoutez des médias pour enrichir votre œuvre
                    </h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Images de couverture, illustrations, captures d'écran...
                    </p>
                  </div>
                </div>
              </div>

              <FileUpload
                type="image"
                maxSize={5}
                multiple={true}
                onFileUploaded={handleFileUpload}
                onError={handleUploadError}
                preview={true}
                placeholder="Glissez vos images ici ou cliquez pour sélectionner"
                className="mb-6"
              />

              {formData.imageUrls.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">
                    Images ajoutées ({formData.imageUrls.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {formData.imageUrls.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={imageUrl}
                          alt={`Image ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-image.jpg';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          title="Supprimer cette image"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                <p>
                  💡 <strong>Conseils :</strong> Utilisez des images de bonne qualité (min. 800x600px) 
                  au format JPG, PNG ou WebP. Taille maximale : 5MB par image.
                </p>
              </div>
            </div>
          )}

          {/* Étape 4: Publication */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-6">Options de publication</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Statut de publication</label>
                <div className="space-y-3">
                  {[
                    {
                      value: 'brouillon',
                      label: 'Brouillon',
                      description: 'Sauvegarde privée, non visible publiquement'
                    },
                    {
                      value: 'en_attente',
                      label: 'En attente de validation',
                      description: 'Soumis pour validation par les modérateurs'
                    }
                  ].map(status => (
                    <label
                      key={status.value}
                      className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-all ${
                        formData.statut === status.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="statut"
                        value={status.value}
                        checked={formData.statut === status.value}
                        onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium">{status.label}</div>
                        <div className="text-sm text-gray-600">{status.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold mb-4">Résumé de votre œuvre</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Titre :</span> {formData.titre || 'Non défini'}
                  </div>
                  <div>
                    <span className="font-medium">Type :</span> {getSelectedType()?.nom_type || 'Non défini'}
                  </div>
                  <div>
                    <span className="font-medium">Langue :</span>{' '}
                    {langues?.find((l: Langue) => l.id_langue.toString() === formData.langue)?.nom || 'Non définie'}
                  </div>
                  <div>
                    <span className="font-medium">Catégories :</span> {formData.categories.length} sélectionnée(s)
                  </div>
                  <div>
                    <span className="font-medium">Auteurs :</span> {formData.auteurs.length} sélectionné(s)
                  </div>
                  <div>
                    <span className="font-medium">Tags :</span> {formData.tags.length} ajouté(s)
                  </div>
                  <div>
                    <span className="font-medium">Médias :</span> 
                    {formData.imageUrls.length > 0 
                      ? ` ${formData.imageUrls.length} image(s) ajoutée(s)`
                      : ' Aucune image'
                    }
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-8 mt-8 border-t">
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>

              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <HiArrowLeft size={16} className="mr-1" />
                  Précédent
                </button>
              )}
            </div>

            <div className="flex space-x-3">
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={!canGoNext()}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                  <HiArrowRight size={16} className="ml-1" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} className="mr-1" />
                      {initialData ? 'Modifier l\'œuvre' : 'Créer l\'œuvre'}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdaptiveOeuvreForm;