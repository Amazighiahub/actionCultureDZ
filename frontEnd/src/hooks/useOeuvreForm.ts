/**
 * useOeuvreForm - Hook pour gérer le formulaire d'ajout d'œuvre
 */
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/UI/use-toast';
import { metadataService } from '@/services/metadata.service';
import { oeuvreService } from '@/services/oeuvre.service';
import { mediaService } from '@/services/media.service';

// Types
interface FormData {
  titre: string;
  description: string;
  id_type_oeuvre: number;
  id_langue: number;
  annee_creation?: number;
  prix?: number;
  categories: number[];
  tags: string[];
  medias: any[];
  // Champs spécifiques
  isbn?: string;
  nb_pages?: number;
  duree_minutes?: number;
  realisateur?: string;
  duree_album?: string;
  label?: string;
  id_editeur?: number;
  resume?: string;
  synopsis?: string;
  genre_musical?: string;
  id_technique?: number;
  id_materiau?: number;
  dimensions?: string;
  poids?: number;
  support?: string;
  journal?: string;
  doi?: string;
  volume?: string;
  numero?: string;
  pages?: string;
  url_source?: string;
  peer_reviewed?: boolean;
  region_origine?: string;
  details_supplementaires?: string;
  [key: string]: any;
}

interface Metadata {
  types_oeuvres: any[];
  langues: any[];
  editeurs: any[];
  techniques: any[];
  materiaux: any[];
  tags: any[];
  categoriesGrouped: any[];
}

const INITIAL_FORM_DATA: FormData = {
  titre: '',
  description: '',
  id_type_oeuvre: 0,
  id_langue: 1,
  categories: [],
  tags: [],
  medias: []
};

export function useOeuvreForm() {
  const { toast } = useToast();
  
  // États
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [metadata, setMetadata] = useState<Metadata>({
    types_oeuvres: [],
    langues: [],
    editeurs: [],
    techniques: [],
    materiaux: [],
    tags: [],
    categoriesGrouped: []
  });
  const [metadataLoading, setMetadataLoading] = useState(true);

  // Charger les métadonnées au montage
  useEffect(() => {
    loadMetadata();
  }, []);

  const loadMetadata = async () => {
    try {
      setMetadataLoading(true);
      
      const [
        typesResponse,
        languesResponse,
        editeursResponse,
        techniquesResponse,
        materiauxResponse,
        tagsResponse
      ] = await Promise.all([
        metadataService.getTypesOeuvres(),
        metadataService.getLangues(),
        metadataService.getEditeurs().catch(() => ({ success: false })),
        metadataService.getTechniques().catch(() => ({ success: false })),
        metadataService.getMateriaux().catch(() => ({ success: false })),
        metadataService.getTags().catch(() => ({ success: false }))
      ]);

      setMetadata({
        types_oeuvres: typesResponse.success ? typesResponse.data : [],
        langues: languesResponse.success ? languesResponse.data : [],
        editeurs: editeursResponse.success ? editeursResponse.data : [],
        techniques: techniquesResponse.success ? techniquesResponse.data : [],
        materiaux: materiauxResponse.success ? materiauxResponse.data : [],
        tags: tagsResponse.success ? tagsResponse.data : [],
        categoriesGrouped: []
      });
    } catch (error) {
      console.error('Erreur chargement métadonnées:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données',
        variant: 'destructive'
      });
    } finally {
      setMetadataLoading(false);
    }
  };

  // Mettre à jour un champ du formulaire
  const updateFormData = useCallback((field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Effacer l'erreur pour ce champ
    setErrors((prev) => ({ ...prev, [field]: '' }));
  }, []);

  // Validation par étape
  const validateStep = useCallback(async (step: number): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0: // Informations générales
        if (!formData.titre || formData.titre.trim().length < 3) {
          newErrors.titre = 'Le titre doit contenir au moins 3 caractères';
        }
        if (!formData.description || formData.description.trim().length < 20) {
          newErrors.description = 'La description doit contenir au moins 20 caractères';
        }
        if (!formData.id_type_oeuvre) {
          newErrors.id_type_oeuvre = 'Veuillez sélectionner un type d\'œuvre';
        }
        break;

      case 1: // Détails spécifiques
        // Validation optionnelle selon le type
        break;

      case 2: // Catégories & Tags
        // Pas de validation obligatoire
        break;

      case 3: // Médias
        const images = formData.medias?.filter((m) => m.type === 'image') || [];
        if (images.length === 0) {
          newErrors.medias = 'Veuillez ajouter au moins une image';
        }
        break;

      case 4: // Récapitulatif
        // Validation finale
        if (!formData.titre) newErrors.titre = 'Titre requis';
        if (!formData.description) newErrors.description = 'Description requise';
        if (!formData.id_type_oeuvre) newErrors.id_type_oeuvre = 'Type requis';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Uploader les médias
  const uploadMedias = async (): Promise<number[]> => {
    const uploadedIds: number[] = [];

    for (const media of formData.medias || []) {
      if (media.uploaded && media.uploadedId) {
        uploadedIds.push(media.uploadedId);
        continue;
      }

      try {
        const response = await mediaService.upload(media.file, {
          type: media.type,
          is_principal: media.isPrincipal
        });

        if (response.success && response.data?.id) {
          uploadedIds.push(response.data.id);
          // Marquer comme uploadé
          setFormData((prev) => ({
            ...prev,
            medias: prev.medias.map((m) =>
              m.id === media.id
                ? { ...m, uploaded: true, uploadedId: response.data.id }
                : m
            )
          }));
        }
      } catch (error) {
        console.error('Erreur upload média:', error);
      }
    }

    return uploadedIds;
  };

  // Soumettre le formulaire
  const submitForm = useCallback(async (asBrouillon: boolean = false): Promise<boolean> => {
    try {
      setIsSubmitting(true);

      // Validation finale
      const isValid = await validateStep(4);
      if (!isValid && !asBrouillon) {
        toast({
          title: 'Formulaire incomplet',
          description: 'Veuillez corriger les erreurs',
          variant: 'destructive'
        });
        return false;
      }

      // Uploader les médias
      const mediaIds = await uploadMedias();

      // Préparer les données
      const submitData = {
        titre: formData.titre,
        description: formData.description,
        id_type_oeuvre: formData.id_type_oeuvre,
        id_langue: formData.id_langue,
        annee_creation: formData.annee_creation,
        prix: formData.prix,
        categories: formData.categories,
        tags: formData.tags,
        media_ids: mediaIds,
        statut: asBrouillon ? 'brouillon' : 'en_attente',
        // Champs spécifiques
        details_specifiques: {
          isbn: formData.isbn,
          nb_pages: formData.nb_pages,
          duree_minutes: formData.duree_minutes,
          realisateur: formData.realisateur,
          id_editeur: formData.id_editeur,
          id_technique: formData.id_technique,
          id_materiau: formData.id_materiau,
          dimensions: formData.dimensions,
          poids: formData.poids,
          support: formData.support,
          journal: formData.journal,
          doi: formData.doi,
          volume: formData.volume,
          numero: formData.numero,
          pages: formData.pages,
          url_source: formData.url_source,
          peer_reviewed: formData.peer_reviewed
        }
      };

      // Envoyer au serveur
      const response = await oeuvreService.create(submitData);

      if (response.success) {
        return true;
      } else {
        throw new Error(response.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Erreur soumission:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateStep, toast]);

  // Réinitialiser le formulaire
  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setErrors({});
  }, []);

  return {
    formData,
    updateFormData,
    errors,
    validateStep,
    submitForm,
    resetForm,
    isSubmitting,
    metadata,
    metadataLoading
  };
}

export default useOeuvreForm;
