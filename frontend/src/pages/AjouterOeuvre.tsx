/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
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

// Import des services RÉELS
import { metadataService } from '@/services/metadata.service';
import { mediaService } from '@/services/media.service';
import { oeuvreService } from '@/services/oeuvre.service';
import type { TagMotCle } from '@/types/models/references.types';
// import { useAuth } from '@/hooks/useAuth'; // À décommenter si vous avez ce hook

// Types locaux
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

// Type étendu pour les métadonnées avec tags
interface ExtendedMetadata {
  types_oeuvres?: any[];
  types_evenements?: any[];
  types_organisations?: any[];
  genres?: any[];
  langues?: any[];
  categories?: any[];
  materiaux?: any[];
  techniques?: any[];
  editeurs?: any[];
  wilayas?: any[];
  tags?: TagMotCle[]; // Ajout des tags avec le bon type
}

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
  // Livre
  isbn?: string;
  nb_pages?: number;
  id_genre_livre?: number;
  
  // Film
  duree_minutes?: number;
  realisateur?: string;
  id_genre_film?: number;
  
  // Album Musical
  duree_album?: number;
  label?: string;
  id_genre_musique?: number;
  
  // Article
  auteur?: string;
  source?: string;
  type_article?: string;
  resume_article?: string;
  url_source?: string;
  
  // Article Scientifique
  journal?: string;
  doi?: string;
  pages?: string;
  volume?: string;
  numero?: string;
  peer_reviewed?: boolean;
  
  // Artisanat
  id_materiau?: number;
  id_technique?: number;
  dimensions?: string;
  poids?: number;
  
  // Œuvre d'Art
  technique_art?: string;
  dimensions_art?: string;
  support?: string;
}

const AjouterOeuvreAdaptatif = () => {
  const [loading, setLoading] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // État de connexion - Utiliser le hook si disponible
  // const { isAuthenticated, user } = useAuth();
  
  // Sinon, vérifier le token directement
  const authToken = localStorage.getItem('auth_token');
  const isAuthenticated = !!authToken;
  let user = null;
  try {
    const userInfo = localStorage.getItem('user_info');
    user = userInfo ? JSON.parse(userInfo) : null;
  } catch (e) {
    console.error('Erreur parsing user info:', e);
  }
  
  // État du formulaire
  const [formData, setFormData] = useState<FormData>({
    titre: '',
    description: '',
    id_type_oeuvre: 0,
    id_langue: 1,
    categories: [],
    tags: []
  });
  
  // État de progression
  const [uploadProgress, setUploadProgress] = useState<string>('');
  
  // Médias
  const [medias, setMedias] = useState<MediaUpload[]>([]);
  const [apercuDisponible, setApercuDisponible] = useState(false);
  const [apercuFile, setApercuFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Métadonnées
  const [metadata, setMetadata] = useState<ExtendedMetadata>({
    types_oeuvres: [],
    langues: [],
    genres: [],
    categories: [],
    materiaux: [],
    techniques: [],
    tags: []
  });
  
  // Tags suggérés
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // Charger les métadonnées
  useEffect(() => {
    loadMetadata();
  }, []);

  // Générer des suggestions de tags basées sur le contexte
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

  const loadMetadata = async () => {
    try {
      // Utiliser la version avec cache pour de meilleures performances
      const response = await metadataService.getAllCached();
      
      if (response.success && response.data) {
        setMetadata(response.data as ExtendedMetadata);
        
        // Les tags ne sont pas inclus dans le type AllMetadata,
        // on doit les récupérer séparément
        const tagsResponse = await metadataService.getTags();
        if (tagsResponse.success && tagsResponse.data) {
          setMetadata(prev => ({ ...prev, tags: tagsResponse.data }));
        }
      } else {
        setSubmitError(response.error || 'Impossible de charger les données de référence');
      }
      
      setLoadingMetadata(false);
    } catch (error) {
      console.error('Erreur chargement métadonnées:', error);
      setSubmitError('Erreur de connexion au serveur. Veuillez réessayer.');
      setLoadingMetadata(false);
    }
  };

  const generateTagSuggestions = () => {
    if (!metadata.types_oeuvres || metadata.types_oeuvres.length === 0) return;
    
    const suggestions: string[] = [];
    const typeOeuvre = metadata.types_oeuvres.find((t: any) => t.id_type_oeuvre === formData.id_type_oeuvre);
    
    // Tags basés sur le type d'œuvre
    if (typeOeuvre) {
      switch (typeOeuvre.nom_type) {
        case 'Livre':
          suggestions.push('littérature', 'lecture', 'roman');
          break;
        case 'Film':
          suggestions.push('cinéma', 'audiovisuel', 'réalisation');
          break;
        case 'Artisanat':
          suggestions.push('fait-main', 'artisanal', 'traditionnel');
          break;
        case 'Article Scientifique':
          suggestions.push('recherche', 'science', 'académique');
          break;
      }
    }
    
    // Tags basés sur le titre et la description
    const text = `${formData.titre} ${formData.description}`.toLowerCase();
    const keywords = ['algérie', 'maghreb', 'berbère', 'tradition', 'moderne', 'contemporain', 'patrimoine', 'culture'];
    
    keywords.forEach(keyword => {
      if (text.includes(keyword) && !suggestions.includes(keyword)) {
        suggestions.push(keyword);
      }
    });
    
    // Ajouter des tags existants pertinents
    if (metadata.tags && Array.isArray(metadata.tags) && metadata.tags.length > 0) {
      metadata.tags.forEach((tag: any) => {
        if (!suggestions.includes(tag.nom) && suggestions.length < 10) {
          suggestions.push(tag.nom);
        }
      });
    }
    
    setSuggestedTags(suggestions.slice(0, 8));
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoryToggle = (categoryId: number) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(id => id !== categoryId)
        : [...prev.categories, categoryId]
    }));
  };

  const handleTagAdd = async (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      // Vérifier si le tag existe déjà dans la base
      const existingTag = metadata.tags?.find((t: TagMotCle) => 
        t.nom.toLowerCase() === tag.toLowerCase()
      );
      
      // Si le tag n'existe pas, proposer de le créer
      if (!existingTag && metadata.tags) {
        try {
          const response = await metadataService.createTag({ nom: tag });
          if (response.success && response.data) {
            // Ajouter le nouveau tag aux métadonnées
            setMetadata(prev => ({
              ...prev,
              tags: [...(prev.tags || []), response.data]
            }));
          }
        } catch (error) {
          console.error('Erreur création tag:', error);
        }
      }
      
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setNewTag('');
      setShowTagSuggestions(false);
    }
  };

  const handleTagRemove = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleMediaUpload = (files: FileList) => {
    const newMedias: MediaUpload[] = [];
    const errors: string[] = [];
    
    Array.from(files).forEach(file => {
      // Validation avec mediaService
      const validation = mediaService.validateFile(file, {
        maxSize: 100 * 1024 * 1024, // 100MB
        allowedTypes: [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'video/mp4', 'video/webm', 'video/ogg',
          'audio/mpeg', 'audio/wav', 'audio/ogg',
          'application/pdf', 'application/msword', 
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
      });
      
      if (!validation.valid) {
        errors.push(`${file.name}: ${validation.error}`);
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
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleMediaUpload(files);
    }
  };

  const handleMediaRemove = (mediaId: string) => {
    const media = medias.find(m => m.id === mediaId);
    if (media?.preview) {
      URL.revokeObjectURL(media.preview);
    }
    
    setMedias(prev => {
      const updated = prev.filter(m => m.id !== mediaId);
      // Si on supprime le média principal, définir le premier comme principal
      if (media?.isPrincipal && updated.length > 0) {
        updated[0].isPrincipal = true;
      }
      return updated;
    });
  };

  const handleSetPrincipalMedia = (mediaId: string) => {
    setMedias(prev => prev.map(m => ({
      ...m,
      isPrincipal: m.id === mediaId
    })));
  };

  const handleSubmit = async (isDraft = false) => {
    try {
      setLoading(true);
      setSubmitError(null);

      // Validation basique
      if (!formData.titre || !formData.id_type_oeuvre) {
        setSubmitError('Veuillez remplir tous les champs obligatoires');
        return;
      }

      // Préparation des données selon le type d'œuvre
      const oeuvreData: any = {
        titre: formData.titre,
        description: formData.description,
        id_type_oeuvre: formData.id_type_oeuvre,
        id_langue: formData.id_langue,
        date_creation: formData.annee_creation ? `${formData.annee_creation}-01-01` : undefined,
        categories: formData.categories,
        // Convertir les noms de tags en IDs ou en noms selon ce que l'API attend
        tags: formData.tags
      };

      // Ajouter le prix seulement s'il est défini
      if (formData.prix) {
        oeuvreData.prix = formData.prix;
      }

      // Ajouter les champs spécifiques selon le type
      const typeOeuvre = metadata.types_oeuvres?.find((t: any) => t.id_type_oeuvre === formData.id_type_oeuvre);
      if (typeOeuvre) {
        switch (typeOeuvre.nom_type) {
          case 'Livre':
            if (formData.isbn) oeuvreData.isbn = formData.isbn;
            if (formData.nb_pages) oeuvreData.nb_pages = formData.nb_pages;
            if (formData.id_genre_livre) oeuvreData.id_genre = formData.id_genre_livre;
            break;
          case 'Film':
            if (formData.duree_minutes) oeuvreData.duree = formData.duree_minutes;
            if (formData.realisateur) oeuvreData.realisateur = formData.realisateur;
            if (formData.id_genre_film) oeuvreData.id_genre = formData.id_genre_film;
            break;
          case 'Album Musical':
            if (formData.duree_album) oeuvreData.duree = formData.duree_album;
            if (formData.label) oeuvreData.label = formData.label;
            if (formData.id_genre_musique) oeuvreData.id_genre = formData.id_genre_musique;
            break;
          case 'Article':
            if (formData.auteur) oeuvreData.auteur = formData.auteur;
            if (formData.source) oeuvreData.source = formData.source;
            if (formData.type_article) oeuvreData.type_article = formData.type_article;
            if (formData.resume_article) oeuvreData.resume = formData.resume_article;
            if (formData.url_source) oeuvreData.url_source = formData.url_source;
            break;
          case 'Article Scientifique':
            if (formData.journal) oeuvreData.journal = formData.journal;
            if (formData.doi) oeuvreData.doi = formData.doi;
            if (formData.pages) oeuvreData.pages = formData.pages;
            if (formData.volume) oeuvreData.volume = formData.volume;
            if (formData.numero) oeuvreData.numero = formData.numero;
            if (formData.peer_reviewed) oeuvreData.peer_reviewed = formData.peer_reviewed;
            break;
          case 'Artisanat':
            if (formData.id_materiau) oeuvreData.id_materiau = formData.id_materiau;
            if (formData.id_technique) oeuvreData.id_technique = formData.id_technique;
            if (formData.dimensions) oeuvreData.dimensions = formData.dimensions;
            if (formData.poids) oeuvreData.poids = formData.poids;
            break;
          case 'Œuvre d\'Art':
            if (formData.technique_art) oeuvreData.technique = formData.technique_art;
            if (formData.dimensions_art) oeuvreData.dimensions = formData.dimensions_art;
            if (formData.support) oeuvreData.support = formData.support;
            break;
        }
      }

      // ===== INTÉGRATION API (à décommenter en production) =====
      /*
      // 1. Créer l'œuvre
      const oeuvreResponse = await oeuvreService.create(oeuvreData);
      
      if (!oeuvreResponse.success || !oeuvreResponse.data) {
        setSubmitError(oeuvreResponse.error || 'Erreur lors de la création de l\'œuvre');
        return;
      }

      const oeuvreId = oeuvreResponse.data.id;

      // 2. Upload des médias
      if (medias.length > 0) {
        for (const media of medias) {
          const uploadResponse = await uploadService.uploadImage(media.file, {
            generateThumbnail: true,
            maxWidth: 1920,
            maxHeight: 1080
          });

          if (uploadResponse.success && uploadResponse.data) {
            // Associer le média à l'œuvre
            await oeuvreService.uploadMedia(oeuvreId, media.file, {
              titre: media.titre,
              description: media.description,
              is_principal: media.isPrincipal
            });
          }
        }
      }

      // 3. Upload de l'aperçu si disponible
      if (apercuDisponible && apercuFile) {
        const apercuResponse = await uploadService.uploadDocument(apercuFile);
        if (apercuResponse.success && apercuResponse.data) {
          // Associer l'aperçu à l'œuvre (endpoint à définir)
          // await oeuvreService.uploadApercu(oeuvreId, apercuFile);
        }
      }

      // Redirection après succès
      window.location.href = '/dashboard-pro';
      */

      // ===== CODE DE TEST (à supprimer en production) =====
      console.log('Données à envoyer:', {
        oeuvre: oeuvreData,
        medias: medias.map(m => ({
          file: m.file,
          isPrincipal: m.isPrincipal,
          titre: m.titre,
          description: m.description
        })),
        apercu: apercuFile,
        statut: isDraft ? 'brouillon' : 'en_attente'
      });

      // Simuler un délai
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Message de succès
      alert(isDraft ? 'Brouillon sauvegardé avec succès !' : 'Œuvre soumise avec succès !');
      
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      setSubmitError(error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'enregistrement');
      setUploadProgress('');
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  // Icône selon le type d'œuvre
  const getTypeIcon = (typeId: number) => {
    switch (typeId) {
      case 1: return <Book className="h-5 w-5" />;
      case 2: return <Film className="h-5 w-5" />;
      case 3: return <Music className="h-5 w-5" />;
      case 4: case 5: return <FileText className="h-5 w-5" />;
      case 6: return <Hammer className="h-5 w-5" />;
      case 7: return <Palette className="h-5 w-5" />;
      default: return null;
    }
  };

  // Rendu des champs spécifiques selon le type d'œuvre
  const renderSpecificFields = () => {
    if (!metadata.types_oeuvres || metadata.types_oeuvres.length === 0) return null;
    
    const typeOeuvre = metadata.types_oeuvres.find((t: any) => t.id_type_oeuvre === formData.id_type_oeuvre);
    if (!typeOeuvre) return null;

    switch (typeOeuvre.nom_type) {
      case 'Livre':
        return (
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
                onChange={(e) => handleInputChange('nb_pages', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="id_genre_livre">Genre littéraire</Label>
              <Select 
                value={formData.id_genre_livre?.toString()}
                onValueChange={(value) => handleInputChange('id_genre_livre', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un genre" />
                </SelectTrigger>
                <SelectContent>
                  {metadata.genres?.filter((g: any) => [1, 2, 3].includes(g.id_genre)).map((genre: any) => (
                    <SelectItem key={genre.id_genre} value={genre.id_genre.toString()}>
                      {genre.nom}
                    </SelectItem>
                  )) || <SelectItem value="0" disabled>Aucun genre disponible</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'Film':
        return (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="duree_minutes">Durée (minutes)</Label>
              <Input 
                id="duree_minutes" 
                type="number" 
                placeholder="Ex: 120"
                value={formData.duree_minutes || ''}
                onChange={(e) => handleInputChange('duree_minutes', parseInt(e.target.value))}
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
            <div className="space-y-2">
              <Label htmlFor="id_genre_film">Genre cinématographique</Label>
              <Select 
                value={formData.id_genre_film?.toString()}
                onValueChange={(value) => handleInputChange('id_genre_film', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un genre" />
                </SelectTrigger>
                <SelectContent>
                  {metadata.genres?.filter((g: any) => [3, 4].includes(g.id_genre)).map((genre: any) => (
                    <SelectItem key={genre.id_genre} value={genre.id_genre.toString()}>
                      {genre.nom}
                    </SelectItem>
                  )) || <SelectItem value="0" disabled>Aucun genre disponible</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'Album Musical':
        return (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="duree_album">Durée totale (minutes)</Label>
              <Input 
                id="duree_album" 
                type="number" 
                placeholder="Ex: 45"
                value={formData.duree_album || ''}
                onChange={(e) => handleInputChange('duree_album', parseInt(e.target.value))}
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
            <div className="space-y-2">
              <Label htmlFor="id_genre_musique">Genre musical</Label>
              <Select 
                value={formData.id_genre_musique?.toString()}
                onValueChange={(value) => handleInputChange('id_genre_musique', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un genre" />
                </SelectTrigger>
                <SelectContent>
                  {metadata.genres?.filter((g: any) => [5, 6, 7].includes(g.id_genre)).map((genre: any) => (
                    <SelectItem key={genre.id_genre} value={genre.id_genre.toString()}>
                      {genre.nom}
                    </SelectItem>
                  )) || <SelectItem value="0" disabled>Aucun genre disponible</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'Article':
        return (
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
              <Label htmlFor="type_article">Type d'article</Label>
              <Select 
                value={formData.type_article}
                onValueChange={(value) => handleInputChange('type_article', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="actualite">Actualité</SelectItem>
                  <SelectItem value="opinion">Opinion</SelectItem>
                  <SelectItem value="reportage">Reportage</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="analyse">Analyse</SelectItem>
                </SelectContent>
              </Select>
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
        );

      case 'Article Scientifique':
        return (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="journal">Journal / Revue *</Label>
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
        );

      case 'Artisanat':
        return (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="id_materiau">Matériau principal</Label>
              <Select 
                value={formData.id_materiau?.toString()}
                onValueChange={(value) => handleInputChange('id_materiau', parseInt(value))}
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
                value={formData.id_technique?.toString()}
                onValueChange={(value) => handleInputChange('id_technique', parseInt(value))}
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
                onChange={(e) => handleInputChange('poids', parseFloat(e.target.value))}
              />
            </div>
          </div>
        );

      case 'Œuvre d\'Art':
        return (
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
        );

      default:
        return null;
    }
  };

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

  // Si erreur au chargement et pas de métadonnées
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

  return (
    <div className="min-h-screen bg-background pattern-geometric">
      <div className="container py-12">
        <div className="max-w-4xl mx-auto">
          {/* En-tête */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" className="hover-lift">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour au dashboard
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
                        onChange={(e) => handleInputChange('annee_creation', parseInt(e.target.value))}
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
                        onChange={(e) => handleInputChange('prix', parseInt(e.target.value))}
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
                    Informations spécifiques - {metadata.types_oeuvres.find((t: any) => t.id_type_oeuvre === formData.id_type_oeuvre)?.nom_type}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderSpecificFields()}
                </CardContent>
              </Card>
            )}

            {/* Catégories */}
            {formData.id_type_oeuvre > 0 && (
              <Card className="shadow-cultural">
                <CardHeader>
                  <CardTitle className="text-2xl font-serif">Catégories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {metadata.categories.map((categorie: any) => (
                      <div key={categorie.id_categorie} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`cat-${categorie.id_categorie}`}
                          checked={formData.categories.includes(categorie.id_categorie)}
                          onCheckedChange={() => handleCategoryToggle(categorie.id_categorie)}
                          className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                        />
                        <Label 
                          htmlFor={`cat-${categorie.id_categorie}`}
                          className="text-sm font-normal cursor-pointer hover:text-primary"
                        >
                          {categorie.nom}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
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
                    {showTagSuggestions && newTag && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-10 max-h-48 overflow-auto">
                        {metadata.tags
                          .filter((tag: any) => tag.nom.toLowerCase().includes(newTag.toLowerCase()) && !formData.tags.includes(tag.nom))
                          .slice(0, 5)
                          .map((tag: any) => (
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
                  
                  {/* Aperçu gratuit */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="apercu" 
                        checked={apercuDisponible}
                        onCheckedChange={(checked) => setApercuDisponible(checked === true)}
                        className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                      <Label htmlFor="apercu" className="cursor-pointer hover:text-primary">
                        Proposer un aperçu gratuit
                      </Label>
                    </div>
                    
                    {apercuDisponible && (
                      <div className="ml-6 space-y-2">
                        <Label htmlFor="fichier-apercu" className="text-base">Fichier d'aperçu</Label>
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-foreground">
                            Extrait ou version réduite de l'œuvre
                          </p>
                          <input
                            type="file"
                            onChange={(e) => setApercuFile(e.target.files?.[0] || null)}
                            className="hidden"
                            id="apercu-upload"
                          />
                          <Button 
                            type="button"
                            variant="outline" 
                            size="sm" 
                            onClick={() => document.getElementById('apercu-upload')?.click()}
                            className="mt-2 hover:bg-primary hover:text-primary-foreground hover:border-primary"
                          >
                            Choisir un fichier
                          </Button>
                          {apercuFile && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {apercuFile.name}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
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

export default AjouterOeuvreAdaptatif;