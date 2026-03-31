import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useRTL } from '@/hooks/useRTL';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { useToast } from '@/hooks/use-toast';
import { mediaService } from '@/services/media.service';
import { metadataService } from '@/services/metadata.service';
import { oeuvreService } from '@/services/oeuvre.service';
import { articleBlockService } from '@/services/articleBlock.service';
import { httpClient } from '@/services/httpClient';
import { mapToBackendDTO } from '@/types/api/create-oeuvre-backend.dto';
import { getTranslation, type SupportedLanguage } from '@/types/common/multilingual.types';
import type { TagMotCle, TypeOeuvre, Categorie } from '@/types/models/references.types';
import type { Oeuvre } from '@/types/models/oeuvre.types';
import type { ArticleBlock, ArticleSaveResponse, ArticleFormData } from '@/types/models/articles.types';
import type {
  IntervenantExistant,
  NouvelIntervenant,
  ContributeurOeuvre,
  EditeurOeuvre,
  DetailsSpecifiques,
} from '@/types/api/oeuvre-creation.types';
import type {
  FormData,
  ExtendedMetadata,
  MediaUpload,
  ArticleEditorSavePayload,
  MediaUploadResult,
  ArticleBlockToSave,
} from './types';
import { INITIAL_FORM_DATA } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Extrait le nom lisible d'un tag (gère JSON multilingue et string) */
export const getTagName = (nom: unknown, lang: SupportedLanguage = 'fr'): string => {
  if (!nom) return '';
  if (typeof nom === 'string') return nom;
  if (typeof nom === 'object' && nom !== null) {
    const record = nom as Record<string, string | undefined>;
    return record[lang] || record.fr || record.ar || record.en || '';
  }
  return String(nom);
};

export function useAjouterOeuvre() {
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

  useEffect(() => {
    loadMetadata();
  }, []);

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

  useEffect(() => {
    generateTagSuggestions();
  }, [formData.titre, formData.description, formData.id_type_oeuvre]);

  useEffect(() => {
    return () => {
      medias.forEach((media) => {
        if (media.preview) {
          URL.revokeObjectURL(media.preview);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!metadata.types_oeuvres || metadata.types_oeuvres.length === 0) return;
    const typeOeuvre = metadata.types_oeuvres.find((type: TypeOeuvre) => type.id_type_oeuvre === formData.id_type_oeuvre);
    const isArticleType = typeOeuvre && (
    typeOeuvre.nom_type === 'Article' ||
    typeOeuvre.nom_type === 'Article Scientifique');
    setShowEditorChoice(!!isArticleType);
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
    const text = `${formData.titre} ${formData.description}`.toLowerCase();
    const keywords = ['algérie', 'maghreb', 'berbère', 'tradition', 'moderne', 'contemporain', 'patrimoine', 'culture'];
    keywords.forEach((keyword) => {
      if (text.includes(keyword) && !suggestions.includes(keyword)) {
        suggestions.push(keyword);
      }
    });
    setSuggestedTags(suggestions.slice(0, 8));
  }, [metadata.types_oeuvres, formData.id_type_oeuvre, formData.titre, formData.description]);

  const getTypeIcon = useCallback((typeId: number) => typeId, []);

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
      const existingTag = metadata.tags?.find((t: TagMotCle) =>
        getTagName(t.nom, lang).toLowerCase() === normalizedTag
      );
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
      const maxSize = 100 * 1024 * 1024;
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
        isPrincipal: medias.length === 0 && newMedias.length === 0,
        preview: type === 'image' ? URL.createObjectURL(file) : undefined
      };
      newMedias.push(media);
    });
    if (errors.length > 0) {
      toast({ title: t('ajouteroeuvre.erreur_upload'), description: errors.join('\n'), variant: 'destructive' });
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
  contribs: ContributeurOeuvre[]) =>
  {
    setIntervenantsExistants(existants);
    setNouveauxIntervenants(nouveaux);
    setContributeurs(contribs);
  }, []);

  const handleEditeursChange = useCallback((eds: EditeurOeuvre[]) => {
    setEditeurs(eds);
  }, []);

  // Handler pour la sauvegarde depuis ArticleEditor
  const handleArticleEditorSave = useCallback(async (response: ArticleSaveResponse) => {
    try {
      const articlePayload = response.article as unknown as ArticleEditorSavePayload['article'];
      const { formData: articleFormData, blocks, contributeurs: contribs, editeurs: eds } = articlePayload;

      const isScientific = articleFormData.type === 'article_scientifique';
      const id_type_oeuvre = isScientific ? 5 : 4;

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
          return d.subtype?.id_article_scientifique ||
            d.article_scientifique?.id_article_scientifique ||
            d.oeuvre?.ArticleScientifique?.id_article_scientifique ||
            d.oeuvre?.article_scientifique?.id_article_scientifique ||
            d.ArticleScientifique?.id_article_scientifique ||
            d.details_specifiques_record?.id_article_scientifique;
        }
        return d.subtype?.id_article ||
          d.article?.id_article ||
          d.oeuvre?.Article?.id_article ||
          d.oeuvre?.article?.id_article ||
          d.Article?.id_article ||
          d.details_specifiques_record?.id_article;
      })();

      let finalArticleRecordId = articleRecordId;
      if (blocks && blocks.length > 0) {
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
          toast({ title: t('toasts.warning'), description: t('toasts.articleCreatedBlocksFailed'), variant: 'destructive' });
        }

        const blocksWithMedia = await Promise.all(
          blocks.map(async (block: ArticleBlock, index: number) => {
            let id_media = block.id_media || null;
            if (block.type_block === 'image' && block.metadata?.tempFile instanceof File) {
              try {
                const fd = new FormData();
                fd.append('files', block.metadata.tempFile);
                const uploadResult = await httpClient.postFormData<MediaUploadResult | MediaUploadResult[]>(
                  `/oeuvres/${oeuvreId}/medias/upload`, fd
                );
                if (uploadResult.success && uploadResult.data) {
                  const uploadedMedias = Array.isArray(uploadResult.data) ? uploadResult.data : [uploadResult.data];
                  if (uploadedMedias[0]?.id_media) {
                    id_media = uploadedMedias[0].id_media;
                  }
                }
              } catch (uploadErr) {
                console.warn(`⚠️ Erreur upload image bloc ${index}:`, uploadErr);
              }
            }
            return { block, id_media, index };
          })
        );

        const blocksToSave = blocksWithMedia.map(({ block, id_media, index }) => {
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
        }
      }

      toast({ title: t('ajouteroeuvre.succes'), description: t('ajouteroeuvre.article_cree_succes') });
      setTimeout(() => { navigate(`/articles/${oeuvreId}`); }, 1500);

    } catch (error: unknown) {
      console.error('❌ Erreur sauvegarde article avancé:', error);
      const message = error instanceof Error ? error.message : t('ajouteroeuvre.articleSaveError', 'Erreur lors de la sauvegarde de l\'article');
      toast({ title: t('common.error', 'Erreur'), description: message, variant: 'destructive' });
    }
  }, [toast, t]);

  // ============================================================================
  // SOUMISSION DU FORMULAIRE
  // ============================================================================

  const prepareDetailsSpecifiques = useCallback((typeOeuvre: TypeOeuvre): DetailsSpecifiques => {
    const details: DetailsSpecifiques = {};
    switch (typeOeuvre.nom_type) {
      case 'Livre':
        details.livre = { isbn: formData.isbn, nb_pages: formData.nb_pages, format: 'standard', collection: undefined };
        break;
      case 'Film':
        details.film = { duree_minutes: formData.duree_minutes, realisateur: formData.realisateur };
        break;
      case 'Album Musical':
        details.album_musical = { duree: formData.duree_album, label: formData.label, nb_pistes: formData.nb_pistes };
        break;
      case 'Article':
        details.article = { auteur: formData.auteur, source: formData.source, resume: formData.resume_article, url_source: formData.url_source };
        break;
      case 'Article Scientifique':
        details.article_scientifique = { journal: formData.journal, doi: formData.doi, pages: formData.pages, volume: formData.volume, numero: formData.numero, peer_reviewed: formData.peer_reviewed };
        break;
      case 'Artisanat':
        details.artisanat = { id_materiau: formData.id_materiau, id_technique: formData.id_technique, dimensions: formData.dimensions, poids: formData.poids, prix: formData.prix };
        break;
      case 'Œuvre d\'Art':
        details.oeuvre_art = { technique: formData.technique_art, dimensions: formData.dimensions_art, support: formData.support };
        break;
    }
    return details;
  }, [formData]);

  const handleSubmit = useCallback(async (isDraft = false) => {
    try {
      setLoading(true);
      setSubmitError(null);
      setFieldErrors({});

      const errors: Record<string, string> = {};
      if (!formData.titre?.fr?.trim() && !formData.titre?.ar?.trim()) {
        errors.titre = t('oeuvre.errors.titleRequired', 'Le titre est requis (au moins en français ou arabe)');
      }
      if (!formData.id_type_oeuvre) {
        errors.id_type_oeuvre = t('oeuvre.errors.typeRequired', 'Veuillez sélectionner un type d\'œuvre');
      }
      if (!formData.description?.fr?.trim() && !formData.description?.ar?.trim()) {
        errors.description = t('oeuvre.errors.descriptionRequired', 'La description est requise (au moins en français ou arabe)');
      }
      if (formData.id_type_oeuvre) {
        const hasCategories = await metadataService.checkIfTypeHasCategories(formData.id_type_oeuvre);
        if (hasCategories && formData.categories.length === 0) {
          errors.categories = t('oeuvre.errors.categoryRequired', 'Veuillez sélectionner au moins une catégorie');
        }
      }
      if (!formData.id_langue || formData.id_langue === 0) {
        errors.id_langue = t('oeuvre.errors.languageRequired', 'Veuillez sélectionner la langue originale');
      }
      if (formData.annee_creation) {
        const currentYear = new Date().getFullYear();
        if (formData.annee_creation < 1800 || formData.annee_creation > currentYear + 1) {
          errors.annee_creation = t('oeuvre.errors.invalidYear', `L'année doit être entre 1800 et ${currentYear + 1}`);
        }
      }
      if (formData.prix !== undefined && formData.prix !== null && formData.prix < 0) {
        errors.prix = t('oeuvre.errors.invalidPrice', 'Le prix ne peut pas être négatif');
      }
      if (formData.isbn) {
        const isbnClean = formData.isbn.replace(/[-\s]/g, '');
        if (!/^(\d{10}|\d{13})$/.test(isbnClean)) {
          errors.isbn = t('oeuvre.errors.invalidIsbn', 'ISBN invalide — 10 ou 13 chiffres attendus');
        }
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setSubmitError(t('oeuvre.errors.formHasErrors', 'Veuillez corriger les erreurs ci-dessous'));
        const fieldOrder = ['id_type_oeuvre', 'titre', 'description', 'annee_creation', 'prix', 'isbn', 'categories'];
        const firstErrorField = fieldOrder.find((f) => errors[f]);
        if (firstErrorField) {
          const elementId = firstErrorField === 'titre' ? 'titre-fr'
            : firstErrorField === 'description' ? 'description-fr'
            : firstErrorField;
          requestAnimationFrame(() => {
            const el = document.getElementById(elementId) || document.getElementById(`${firstErrorField}-error`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              if (typeof (el as HTMLElement).focus === 'function') el.focus();
            }
          });
        }
        return;
      }

      const typeOeuvre = metadata.types_oeuvres?.find((type: TypeOeuvre) => type.id_type_oeuvre === formData.id_type_oeuvre);
      const detailsSpecifiques = typeOeuvre ? prepareDetailsSpecifiques(typeOeuvre) : {};
      const oeuvreData = mapToBackendDTO(formData, contributeurs, intervenantsExistants, nouveauxIntervenants, editeurs, detailsSpecifiques);

      // 🔍 DEBUG TEMPORAIRE — à supprimer après diagnostic
      console.group('🔍 DEBUG: Soumission oeuvre');
      console.log('typeOeuvre:', typeOeuvre?.nom_type, '(id:', formData.id_type_oeuvre, ')');
      console.log('detailsSpecifiques:', JSON.stringify(detailsSpecifiques, null, 2));
      console.log('oeuvreData (payload complet):', JSON.stringify(oeuvreData, null, 2));
      console.log('Nombre de médias:', medias.length);
      console.log('Path:', medias.length > 0 ? 'createOeuvreFormData (multipart)' : 'createOeuvre (JSON)');
      console.groupEnd();

      setUploadProgress(isEditMode ? t('ajouteroeuvre.updatingOeuvre', 'Mise à jour de l\'oeuvre...') : t('ajouteroeuvre.creatingOeuvre', 'Création de l\'oeuvre...'));

      try {
        let oeuvreResponse;
        const mediaFiles = medias.map((m) => m.file);

        if (isEditMode && editId) {
          oeuvreResponse = await oeuvreService.updateOeuvre(editId, oeuvreData);
          if (oeuvreResponse.success && mediaFiles.length > 0) {
            setUploadProgress(t('ajouteroeuvre.uploadingMedias', 'Upload des médias...'));
            for (const file of mediaFiles) {
              try {
                const fd = new FormData();
                fd.append('medias', file);
                await httpClient.upload(`/oeuvres/${editId}/medias/upload`, fd);
              } catch (err) {
                console.error('Erreur upload média:', err);
              }
            }
          }
        } else if (mediaFiles.length > 0) {
          const mediaMetadata = medias.map((m) => ({ is_principal: m.isPrincipal }));
          oeuvreResponse = await oeuvreService.createOeuvreFormData(oeuvreData, mediaFiles, mediaMetadata);
        } else {
          oeuvreResponse = await oeuvreService.createOeuvre(oeuvreData);
        }

        if (!oeuvreResponse.success) {
          // 🔍 DEBUG TEMPORAIRE — à supprimer après diagnostic
          console.group('🔴 DEBUG: Erreur création oeuvre');
          console.log('Response complète:', JSON.stringify(oeuvreResponse, null, 2));
          console.groupEnd();
          setSubmitError(oeuvreResponse.error || (isEditMode ? t('ajouteroeuvre.updateError', 'Erreur lors de la mise à jour') : t('ajouteroeuvre.createError', 'Erreur lors de la création de l\'oeuvre')));
          return;
        }

        toast({
          title: t('ajouteroeuvre.succes'),
          description: isEditMode ? t('toasts.oeuvreStatusUpdated') : (isDraft ? t('ajouteroeuvre.brouillon_sauvegarde') : t('ajouteroeuvre.oeuvre_creee_succes')),
        });
        setTimeout(() => { navigate('/dashboard-pro'); }, 1500);

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '';
        const errorCode = (error as { code?: string })?.code;
        if (errorMessage && (errorMessage.includes('timeout') || errorMessage.includes('Timeout') || errorCode === 'ECONNABORTED')) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const titreStr = formData.titre.fr || '';
          const checkResult = await oeuvreService.checkRecentOeuvre(titreStr);
          if (checkResult.success && checkResult.data) {
            if (medias.length > 0) {
              setUploadProgress(t('ajouteroeuvre.uploadingMedia', 'Upload des médias...'));
              const oeuvreId = checkResult.data.id_oeuvre;
              for (let i = 0; i < medias.length; i++) {
                const media = medias[i];
                await mediaService.uploadOeuvreMedia(media.file, oeuvreId, { is_principal: media.isPrincipal, ordre: i });
              }
            }
            toast({ title: t('ajouteroeuvre.succes'), description: t('ajouteroeuvre.oeuvre_creee_succes') });
            setTimeout(() => { navigate('/dashboard-pro'); }, 1500);
          } else {
            setSubmitError(t('ajouteroeuvre.verifyError', 'Impossible de vérifier si l\'oeuvre a été créée. Veuillez consulter votre tableau de bord ou réessayer.'));
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

  return {
    // State
    t, i18n, lang, direction, navigate,
    isEditMode, editId,
    loading, loadingMetadata, loadingEdit,
    submitError, setSubmitError, fieldErrors,
    uploadProgress,
    isAuthenticated, user,
    formData, metadata, setLoadingMetadata,
    intervenantsExistants, nouveauxIntervenants, contributeurs, editeurs,
    searchOeuvreResults, setSearchOeuvreResults,
    medias, isDragging,
    suggestedTags, newTag, setNewTag, showTagSuggestions, setShowTagSuggestions,
    useArticleEditor, setUseArticleEditor, showEditorChoice,
    // Handlers
    handleInputChange,
    handleTagAdd, handleTagRemove,
    handleMediaUpload, handleDragOver, handleDragLeave, handleDrop,
    handleMediaRemove, handleSetPrincipalMedia,
    handleIntervenantsChange, handleEditeursChange,
    handleArticleEditorSave,
    handleSubmit,
    loadMetadata,
    getTagName: (nom: unknown) => getTagName(nom, lang),
  };
}
