import type { MediaEnregistre } from './MediasEnregistres';
import type { GenreExtrait } from './ExtraitFichiersLivre';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { detailsArticle, liensArticle, nomDuTag } from '@/utils/donneesArticle';
import { prepareImageForUpload } from '@/utils/prepareImageForUpload';
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
import { messageErreurServeur } from '@/utils/erreurServeur';
import { mapToBackendDTO, type CreateOeuvreBackendDTO } from '@/types/api/create-oeuvre-backend.dto';
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
  PisteAlbum,
} from './types';
import { INITIAL_FORM_DATA } from './types';
import { getLocalizedText, aDuTexte } from '@/utils/getLocalizedText';
import { rafraichirTableauDeBord } from '@/lib/queryClient';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Extrait le nom lisible d'un tag (gère JSON multilingue et string) */
export const getTagName = (nom: unknown, lang: SupportedLanguage = 'fr'): string => {
  if (!nom) return '';
  if (typeof nom === 'string') return nom;
  if (typeof nom === 'object' && nom !== null) {
    return getLocalizedText(nom, lang);
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
  // Article complet pour une page (« Écrire un article ») : ouvre l'éditeur avancé, puis relie
  // l'article à la section d'un lieu (?lieu=69&section=gastronomie) ou à une personnalité
  // (?personnalite=33) et revient sur cette page
  const [searchParams] = useSearchParams();
  const cibleArticle = useMemo(() => {
    if (isEditMode) return null;
    const lieu = parseInt(searchParams.get('lieu') || '', 10);
    const section = searchParams.get('section');
    if (lieu > 0 && section) {
      return { type: 'lieu' as const, section, url: `/patrimoine/${lieu}/pages`, corps: { section_patrimoine: section }, retour: `/patrimoine/${lieu}` };
    }
    const personnalite = parseInt(searchParams.get('personnalite') || '', 10);
    if (personnalite > 0) {
      return { type: 'personnalite' as const, section: null, url: `/intervenants/${personnalite}/articles`, corps: {}, retour: `/personnalites/${personnalite}` };
    }
    return null;
  }, [searchParams, isEditMode]);

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
  // Modification : médias déjà enregistrés (retirables un par un)
  const [mediasEnregistres, setMediasEnregistres] = useState<MediaEnregistre[]>([]);
  // Livre : extrait PDF et audio déjà en ligne, et fichiers choisis (envoyés après l'enregistrement)
  const [extraitsEnregistres, setExtraitsEnregistres] = useState<Partial<Record<GenreExtrait, MediaEnregistre | null>>>({});
  const [extraitsChoisis, setExtraitsChoisis] = useState<Partial<Record<GenreExtrait, File | null>>>({});
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

  // Ref synchrone pour bloquer les double-envois (mobile double-tap)
  const submittingRef = useRef(false);
  // Article déjà créé lors d'un essai précédent dont le contenu n'a pas pu être enregistré :
  // le nouvel essai le complète au lieu d'en créer un second
  const articleCreeRef = useRef<{ oeuvreId: number; articleRecordId?: number } | null>(null);

  // Brouillon gardé quand la session expire pendant la saisie (httpClient émet « auth:expired » puis
  // renvoie vers la connexion, qui ramène ici) : la saisie revient, sauf les fichiers joints
  const BROUILLON_OEUVRE = 'eventculture_draft_oeuvre';
  const saisieRef = useRef({ formData, contributeurs, editeurs, nouveauxIntervenants });
  saisieRef.current = { formData, contributeurs, editeurs, nouveauxIntervenants };
  useEffect(() => {
    const garder = () => {
      try {
        sessionStorage.setItem(BROUILLON_OEUVRE, JSON.stringify({ savedAt: Date.now(), editId, ...saisieRef.current }));
      } catch { /* stockage plein : rien à faire */ }
    };
    window.addEventListener('auth:expired', garder);
    return () => window.removeEventListener('auth:expired', garder);
  }, [editId]);

  /** Remet le brouillon de cette œuvre (création ou modification), s'il date de moins de 30 minutes */
  const restaurerBrouillon = useCallback(() => {
    try {
      const brut = sessionStorage.getItem(BROUILLON_OEUVRE);
      if (!brut) return;
      const brouillon = JSON.parse(brut);
      if ((brouillon.editId ?? null) !== (editId ?? null)) return;
      sessionStorage.removeItem(BROUILLON_OEUVRE);
      if (!brouillon.savedAt || Date.now() - brouillon.savedAt > 30 * 60 * 1000) return;
      if (brouillon.formData) setFormData(brouillon.formData);
      if (Array.isArray(brouillon.contributeurs)) setContributeurs(brouillon.contributeurs);
      if (Array.isArray(brouillon.editeurs)) setEditeurs(brouillon.editeurs);
      if (Array.isArray(brouillon.nouveauxIntervenants)) setNouveauxIntervenants(brouillon.nouveauxIntervenants);
      toast({
        title: t('ajouteroeuvre.brouillonRestaure', 'Votre saisie a été restaurée'),
        description: t('ajouteroeuvre.brouillonFichiers', 'Votre session avait expiré. Ajoutez à nouveau les fichiers (images, sons) avant d’envoyer.')
      });
    } catch { /* brouillon illisible : ignoré */ }
  }, [editId]);
  useEffect(() => {
    if (!isEditMode) restaurerBrouillon();
  }, [isEditMode, restaurerBrouillon]);

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
    if (!cibleArticle) return;
    setFormData(prev => ({ ...prev, id_type_oeuvre: 4 }));
    setUseArticleEditor(true);
  }, [cibleArticle]);

  useEffect(() => {
    if (isEditMode && editId && !loadingMetadata) {
      loadExistingOeuvre();
    }
  }, [isEditMode, editId, loadingMetadata]);

  const loadExistingOeuvre = async () => {
    if (!editId) return;
    try {
      setLoadingEdit(true);
      const response = await oeuvreService.getForEdit(editId);
      if (response.success && response.data) {
        const oeuvre = response.data as Oeuvre & Record<string, unknown>;
        const titre = oeuvre.titre;
        const description = oeuvre.description;
        const rawCategories = (oeuvre.Categories ?? (oeuvre as unknown as Record<string, unknown>).categories ?? []) as Array<Categorie | number>;
        // Un article se modifie dans son éditeur (texte en blocs, images), pas dans ce formulaire
        if (oeuvre.id_type_oeuvre === 4 || oeuvre.id_type_oeuvre === 5) {
          navigate(`/editer-article/${editId}`, { replace: true });
          return;
        }
        const rawTags = (oeuvre.Tags ?? (oeuvre as unknown as Record<string, unknown>).tags ?? []) as Array<TagMotCle | string>;
        // Extraire les données des sous-types depuis les associations Sequelize
        const livreData = (oeuvre['Livre'] ?? oeuvre['livre'] ?? {}) as Record<string, unknown>;
        const filmData = (oeuvre['Film'] ?? oeuvre['film'] ?? {}) as Record<string, unknown>;
        const albumData = (oeuvre['AlbumMusical'] ?? oeuvre['album_musical'] ?? {}) as Record<string, unknown>;
        const articleData = (oeuvre['Article'] ?? oeuvre['article'] ?? {}) as Record<string, unknown>;
        const articleScientifiqueData = (oeuvre['ArticleScientifique'] ?? oeuvre['article_scientifique'] ?? {}) as Record<string, unknown>;
        const artisanatData = (oeuvre['Artisanat'] ?? oeuvre['artisanat'] ?? {}) as Record<string, unknown>;
        const oeuvreArtData = (oeuvre['OeuvreArt'] ?? oeuvre['oeuvre_art'] ?? {}) as Record<string, unknown>;
        setFormData({
          titre: typeof titre === 'object' && titre !== null ? titre : { fr: typeof titre === 'string' ? titre : '', ar: '', en: '' },
          description: typeof description === 'object' && description !== null ? description : { fr: typeof description === 'string' ? description : '', ar: '', en: '' },
          id_type_oeuvre: oeuvre.id_type_oeuvre || 0,
          id_langue: oeuvre.id_langue || 1,
          categories: rawCategories.map((c) => typeof c === 'object' && c !== null ? c.id_categorie : c) || [],
          tags: rawTags.map(nomDuTag).filter(Boolean),
          annee_creation: oeuvre.annee_creation,
          // Un artisanat porte son prix sur sa propre fiche, pas sur l'œuvre
          prix: (artisanatData['prix'] ?? oeuvre.prix) as number | undefined,
          // Livre
          isbn: (livreData['isbn'] ?? oeuvre['isbn']) as string | undefined,
          extrait: (livreData['extrait'] ?? undefined) as string | undefined,
          nb_pages: (livreData['nb_pages'] ?? oeuvre['nb_pages']) as number | undefined,
          // Film
          duree_minutes: (filmData['duree_minutes'] ?? oeuvre['duree_minutes']) as number | undefined,
          realisateur: (filmData['realisateur'] ?? oeuvre['realisateur']) as string | undefined,
          // Album Musical
          duree_album: (albumData['duree'] ?? oeuvre['duree_album']) as string | undefined,
          label: (albumData['label'] ?? oeuvre['label']) as string | undefined,
          nb_pistes: (albumData['nb_pistes'] ?? oeuvre['nb_pistes']) as number | undefined,
          format_album: (albumData['format'] ?? undefined) as string | undefined,
          pistes: Array.isArray(albumData['pistes']) ? albumData['pistes'] as PisteAlbum[] : undefined,
          liens_ecoute: Array.isArray(albumData['liens_ecoute'])
            ? (albumData['liens_ecoute'] as Array<{ url?: string } | string>).map((l) => (typeof l === 'string' ? l : l?.url || '')).filter(Boolean)
            : undefined,
          instruments: Array.isArray(albumData['instruments']) ? albumData['instruments'] as string[] : undefined,
          // Article
          auteur: (articleData['auteur'] ?? oeuvre['auteur']) as string | undefined,
          source: (articleData['source'] ?? oeuvre['source']) as string | undefined,
          resume_article: (articleData['resume'] ?? oeuvre['resume_article']) as string | undefined,
          url_source: (articleData['url_source'] ?? oeuvre['url_source']) as string | undefined,
          // Article Scientifique
          journal: (articleScientifiqueData['journal'] ?? oeuvre['journal']) as string | undefined,
          doi: (articleScientifiqueData['doi'] ?? oeuvre['doi']) as string | undefined,
          pages: (articleScientifiqueData['pages'] ?? oeuvre['pages']) as string | undefined,
          volume: (articleScientifiqueData['volume'] ?? oeuvre['volume']) as string | undefined,
          numero: (articleScientifiqueData['numero'] ?? oeuvre['numero']) as string | undefined,
          peer_reviewed: (articleScientifiqueData['peer_reviewed'] ?? oeuvre['peer_reviewed']) as boolean | undefined,
          // Artisanat
          id_materiau: (artisanatData['id_materiau'] ?? oeuvre['id_materiau']) as number | undefined,
          id_technique: (artisanatData['id_technique'] ?? oeuvre['id_technique']) as number | undefined,
          dimensions: (artisanatData['dimensions'] ?? oeuvre['dimensions']) as string | undefined,
          poids: (artisanatData['poids'] ?? oeuvre['poids']) as number | undefined,
          // Œuvre d'Art
          technique_art: (oeuvreArtData['technique'] ?? oeuvre['technique_art']) as string | undefined,
          dimensions_art: (oeuvreArtData['dimensions'] ?? oeuvre['dimensions_art']) as string | undefined,
          support: (oeuvreArtData['support'] ?? oeuvre['support']) as string | undefined,
        });
        const tousMedias = ((oeuvre['Media'] ?? oeuvre['medias'] ?? []) as MediaEnregistre[]).filter(m => m?.id_media);
        const idPdf = Number(livreData['id_media_extrait_pdf']) || null;
        const idAudio = Number(livreData['id_media_extrait_audio']) || null;
        setExtraitsEnregistres({
          pdf: tousMedias.find(m => m.id_media === idPdf) ?? null,
          audio: tousMedias.find(m => m.id_media === idAudio) ?? null,
        });
        // Les extraits se gèrent dans leur propre bloc, pas dans la liste des médias
        setMediasEnregistres(tousMedias.filter(m => m.id_media !== idPdf && m.id_media !== idAudio));
        // Saisie en cours perdue par une session expirée : elle remplace les valeurs chargées
        restaurerBrouillon();
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
    typeOeuvre.id_type_oeuvre === 4 ||  // Article
    typeOeuvre.id_type_oeuvre === 5);   // Article Scientifique
    setShowEditorChoice(!!isArticleType);
    // Article : toujours l'éditeur avancé (avec le formulaire simple, le texte écrit dans le seul
    // « résumé » donnait un article sans contenu, et la page publiée restait vide)
    setUseArticleEditor(!!isArticleType);
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
      const typeTags: Record<number, string[]> = {
        1: ['littérature', 'lecture', 'roman'],        // Livre
        2: ['cinéma', 'audiovisuel', 'réalisation'],   // Film
        3: ['musique', 'chanson', 'patrimoine musical'], // Musique
        7: ['fait-main', 'artisanal', 'traditionnel'], // Artisanat
        5: ['recherche', 'science', 'académique']      // Article Scientifique
      };
      if (typeTags[typeOeuvre.id_type_oeuvre]) {
        suggestions.push(...typeTags[typeOeuvre.id_type_oeuvre]);
      }
    }
    const titreTxt = typeof formData.titre === 'object' ? Object.values(formData.titre).join(' ') : String(formData.titre || '');
    const descTxt = typeof formData.description === 'object' ? Object.values(formData.description).join(' ') : String(formData.description || '');
    const text = `${titreTxt} ${descTxt}`.toLowerCase();
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

  const handleInputChange = useCallback((field: keyof FormData, value: FormData[keyof FormData] | null) => {
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
      const fileType = file.type.startsWith('image/') ? 'image'
        : file.type.startsWith('video/') ? 'video'
        : file.type.startsWith('audio/') ? 'audio'
        : 'document';
      const maxSizes: Record<string, number> = { image: 10, video: 100, audio: 50, document: 50 };
      const maxSizeMB = maxSizes[fileType];
      const maxSize = maxSizeMB * 1024 * 1024;
      if (file.size > maxSize) {
        errors.push(`${file.name}: ${t('validation.fileTooLarge', 'Fichier trop volumineux')} (max ${maxSizeMB}MB)`);
        return;
      }
      const type = fileType;
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
      toast({ title: t('ajouteroeuvre.erreur_upload', "Erreur lors de l'envoi des fichiers"), description: errors.join('\n'), variant: 'destructive' });
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
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      const articlePayload = response.article as unknown as ArticleEditorSavePayload['article'];
      const { formData: articleFormData, blocks, contributeurs: contribs, editeurs: eds } = articlePayload;

      const isScientific = articleFormData.type === 'article_scientifique';
      const id_type_oeuvre = isScientific ? 5 : 4;
      // Article sans aucun contenu (blocs vides ignorés) : refusé, comme à la modification
      if (!blocks?.length) {
        throw new Error(t('article_articleeditor.contenuVide', 'L’article doit garder au moins un bloc de contenu.'));
      }

      const details_specifiques = detailsArticle(articleFormData as unknown as Record<string, unknown>) as DetailsSpecifiques;

      const oeuvreData = {
        titre: typeof articleFormData.titre === 'string' ? { fr: articleFormData.titre } : articleFormData.titre,
        description: typeof articleFormData.description === 'string' ? { fr: articleFormData.description } : articleFormData.description,
        id_type_oeuvre,
        id_langue: articleFormData.id_langue,
        annee_creation: articleFormData.annee_creation || new Date().getFullYear(),
        categories: articleFormData.categories || [],
        tags: articleFormData.tags || [],
        details_specifiques,
        ...liensArticle(contribs, eds),
      } as CreateOeuvreBackendDTO;

      // Nouvel essai après un échec du contenu : l'article existe déjà, on le met à jour
      const dejaCree = articleCreeRef.current;
      let oeuvreResponse: Awaited<ReturnType<typeof oeuvreService.createOeuvre>>;
      if (dejaCree) {
        const maj = await oeuvreService.updateOeuvre(dejaCree.oeuvreId, {
          titre: oeuvreData.titre, description: oeuvreData.description, categories: oeuvreData.categories,
          tags: oeuvreData.tags, details_specifiques: oeuvreData.details_specifiques,
        } as Partial<CreateOeuvreBackendDTO>);
        if (!maj.success) throw new Error(messageErreurServeur(maj, t('toasts.updateError')));
        oeuvreResponse = { success: true, data: { oeuvre: { id_oeuvre: dejaCree.oeuvreId } } } as typeof oeuvreResponse;
      } else {
        oeuvreResponse = await oeuvreService.createOeuvre(oeuvreData);
      }

      if (!oeuvreResponse.success || !oeuvreResponse.data?.oeuvre?.id_oeuvre) {
        throw new Error(messageErreurServeur(oeuvreResponse, t('ajouteroeuvre.articleCreateError', 'Erreur lors de la création de l\'article')));
      }

      const oeuvreId = oeuvreResponse.data.oeuvre.id_oeuvre;

      const articleRecordId = dejaCree?.articleRecordId ?? (() => {
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

        // Garder l'article créé : un nouvel essai le complétera (pas de second article en double)
        articleCreeRef.current = { oeuvreId, articleRecordId: finalArticleRecordId || undefined };
        if (!finalArticleRecordId) {
          console.error('❌ ID article spécifique manquant! Réponse backend:', JSON.stringify(oeuvreResponse.data, null, 2));
          throw new Error(t('ajouteroeuvre.contenuNonEnregistre', 'Le texte de l’article n’a pas pu être enregistré. Il est toujours à l’écran : cliquez de nouveau sur « Enregistrer ».'));
        }

        const blocksWithMedia = await Promise.all(
          blocks.map(async (block: ArticleBlock, index: number) => {
            let id_media = block.id_media || null;
            if (block.type_block === 'image' && block.metadata?.tempFile instanceof File) {
              try {
                // Champ « medias » attendu par le serveur (avec « files », chaque image était refusée)
                const fd = new FormData();
                fd.append('medias', await prepareImageForUpload(block.metadata.tempFile));
                const uploadResult = await httpClient.postFormData<MediaUploadResult | MediaUploadResult[]>(
                  `/oeuvres/${oeuvreId}/medias/upload`, fd
                );
                if (uploadResult.success && uploadResult.data) {
                  const uploadedMedias = Array.isArray(uploadResult.data) ? uploadResult.data : [uploadResult.data];
                  if (uploadedMedias[0]?.id_media) {
                    id_media = uploadedMedias[0].id_media;
                  }
                }
                if (!id_media) throw new Error(uploadResult.error || 'upload');
              } catch (uploadErr) {
                // Photo non envoyée : on s'arrête (avant, l'article était publié sans elle, en silence)
                console.warn(`⚠️ Erreur upload image bloc ${index}:`, uploadErr);
                throw new Error(t('toasts.imageUploadFailed', "Échec de l'envoi de l'image (bloc {{index}})", { index: index + 1 }));
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
          blocks: blocksToSave.map((b) => ({
            id_article: finalArticleRecordId as number,
            type_block: b.type_block,
            contenu: b.contenu,
            contenu_json: b.contenu_json as Record<string, unknown> | unknown[] | undefined,
            metadata: b.metadata,
            ...(b.id_media ? { id_media: b.id_media } : {}),
          })),
        }) : { success: false, error: 'ID article manquant' };

        if (!blocksResponse.success) {
          // Le texte n'est pas enregistré : on reste dans l'éditeur, le texte à l'écran (avant : page
          // de l'article ouverte, vide, et le texte perdu)
          console.warn('⚠️ Erreur sauvegarde blocs:', blocksResponse.error);
          throw new Error(messageErreurServeur(blocksResponse, t('ajouteroeuvre.contenuNonEnregistre', 'Le texte de l’article n’a pas pu être enregistré. Il est toujours à l’écran : cliquez de nouveau sur « Enregistrer ».')));
        }
      }
      articleCreeRef.current = null;

      // Créé en brouillon : sans cet envoi, l'article n'arrivait jamais à l'équipe malgré « soumis avec
      // succès ». Blocs non enregistrés : il reste en brouillon, on n'envoie pas un article vide
      const soumission = await oeuvreService.submitForValidation(oeuvreId);
      if (!soumission.success) {
        toast({
          title: t('toasts.warning'),
          description: t('ajouteroeuvre.articleNonSoumis', "Article enregistré en brouillon, mais pas envoyé à l'équipe. Envoyez-le depuis votre tableau de bord."),
          variant: 'destructive',
        });
      }

      if (cibleArticle) {
        const lien = await httpClient.post(cibleArticle.url, { id_oeuvre: oeuvreId, ...cibleArticle.corps })
          .catch(() => ({ success: false }));
        toast(lien.success
          ? { title: t('ajouteroeuvre.succes'), description: t('patrimoine.pages.ajoutee', 'Article enregistré : il apparaîtra après validation par l’équipe Tala DZ.') }
          : { title: t('toasts.warning'), description: t('patrimoine.pages.lienEchec', 'Article enregistré, mais il n’a pas pu être relié à la page.'), variant: 'destructive' });
        navigate(cibleArticle.retour);
        return;
      }
      if (soumission.success) {
        toast({ title: t('ajouteroeuvre.succes'), description: t('ajouteroeuvre.article_cree_succes') });
      }
      navigate(`/articles/${oeuvreId}`);

    } catch (error: unknown) {
      console.error('❌ Erreur sauvegarde article avancé:', error);
      const message = messageErreurServeur(error, t('ajouteroeuvre.articleSaveError', 'Erreur lors de la sauvegarde de l\'article'));
      toast({ title: t('common.error', 'Erreur'), description: message, variant: 'destructive' });
      // Renvoyée à l'éditeur : il l'affiche en rouge et garde le texte à l'écran
      throw new Error(message);
    } finally {
      submittingRef.current = false;
    }
  }, [toast, t, navigate, cibleArticle]);

  // ============================================================================
  // SOUMISSION DU FORMULAIRE
  // ============================================================================

  const prepareDetailsSpecifiques = useCallback((typeOeuvre: TypeOeuvre): DetailsSpecifiques => {
    const details: DetailsSpecifiques = {};
    // Utiliser id_type_oeuvre (numérique) au lieu de nom_type (traduit selon la langue)
    switch (typeOeuvre.id_type_oeuvre) {
      case 1: // Livre
        // Champ vidé : chaîne vide, effacée par le serveur (absent, l'ancien extrait restait)
        details.livre = { isbn: formData.isbn, nb_pages: formData.nb_pages, extrait: formData.extrait ?? '' };
        break;
      case 2: // Film
        details.film = { duree_minutes: formData.duree_minutes, realisateur: formData.realisateur };
        break;
      case 3: // Album Musical
        details.album_musical = {
          duree: formData.duree_album,
          label: formData.label,
          nb_pistes: formData.nb_pistes,
          format: formData.format_album || undefined,
          pistes: (formData.pistes || []).filter((p) => p.titre.trim()),
          liens_ecoute: (formData.liens_ecoute || []).map((url) => url.trim()).filter(Boolean).map((url) => ({ url })),
          instruments: formData.instruments || []
        };
        break;
      case 4: // Article
        details.article = { auteur: formData.auteur, source: formData.source, resume: formData.resume_article, url_source: formData.url_source };
        break;
      case 5: // Article Scientifique
        details.article_scientifique = { journal: formData.journal, doi: formData.doi, pages: formData.pages, volume: formData.volume, numero: formData.numero, peer_reviewed: formData.peer_reviewed };
        break;
      case 6: // Œuvre d'Art
        details.oeuvre_art = { technique: formData.technique_art, dimensions: formData.dimensions_art, support: formData.support };
        break;
      case 7: // Artisanat
        details.artisanat = { id_materiau: formData.id_materiau, id_technique: formData.id_technique, dimensions: formData.dimensions, poids: formData.poids, prix: formData.prix };
        break;
    }
    return details;
  }, [formData]);

  const avertirSiNonSoumise = (res: { success: boolean }) => {
    if (!res.success) {
      toast({ title: t('toasts.warning'), description: t('ajouteroeuvre.oeuvreNonSoumise', "Œuvre enregistrée en brouillon, mais pas envoyée à l'équipe. Envoyez-la depuis votre tableau de bord."), variant: 'destructive' });
    }
  };

  const handleSubmit = useCallback(async (isDraft = false) => {
    // Protection synchrone contre le double-envoi (mobile double-tap)
    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      setLoading(true);
      setSubmitError(null);
      setFieldErrors({});

      const errors: Record<string, string> = {};
      if (!aDuTexte(formData.titre)) {
        errors.titre = t('oeuvre.errors.titleRequired', 'Le titre est requis, dans au moins une langue');
      }
      if (!formData.id_type_oeuvre) {
        errors.id_type_oeuvre = t('oeuvre.errors.typeRequired', 'Veuillez sélectionner un type d\'œuvre');
      }
      if (!aDuTexte(formData.description)) {
        errors.description = t('oeuvre.errors.descriptionRequired', 'La description est requise, dans au moins une langue');
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
          errors.annee_creation = t('oeuvre.errors.invalidYear', "L'année doit être entre 1800 et {{max}}", { max: currentYear + 1 });
        }
      }
      if (formData.prix !== undefined && formData.prix !== null && formData.prix < 0) {
        errors.prix = t('oeuvre.errors.invalidPrice', 'Le prix ne peut pas être négatif');
      }
      if (formData.isbn) {
        const isbnClean = formData.isbn.replace(/[-\s]/g, '').toUpperCase();
        // ISBN-10 : le dernier caractère peut être X (même règle que le serveur)
        if (!/^(\d{9}[\dX]|\d{13})$/.test(isbnClean)) {
          errors.isbn = t('oeuvre.errors.invalidIsbn', 'ISBN invalide — 10 ou 13 chiffres attendus');
        }
      }
      if (formData.url_source) {
        try {
          const url = new URL(formData.url_source.trim());
          if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('protocol');
        } catch {
          errors.url_source = t('oeuvre.errors.invalidUrl', 'URL invalide — utilisez le format https://exemple.com');
        }
      }
      // Liens d'écoute (musique) : https seulement, comme le vérifie le serveur
      if (formData.id_type_oeuvre === 3 && (formData.liens_ecoute || []).some((lien) => {
        if (!lien.trim()) return false;
        try { return new URL(lien.trim()).protocol !== 'https:'; } catch { return true; }
      })) {
        errors.liens_ecoute = t('musique.lienInvalide', 'Chaque lien doit commencer par https://');
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setSubmitError(t('oeuvre.errors.formHasErrors', 'Veuillez corriger les erreurs ci-dessous'));
        const fieldOrder = ['id_type_oeuvre', 'titre', 'id_langue', 'description', 'annee_creation', 'prix', 'isbn', 'url_source', 'liens_ecoute', 'categories'];
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

      setUploadProgress(isEditMode ? t('ajouteroeuvre.updatingOeuvre', 'Mise à jour de l\'oeuvre...') : t('ajouteroeuvre.creatingOeuvre', 'Création de l\'oeuvre...'));

      try {
        let oeuvreResponse;
        const mediaFiles = medias.map((m) => m.file);
        // Envoi un par un avec progression ; les échecs sont comptés pour prévenir l'utilisateur
        let failedMedias = 0;
        const uploadMediaFiles = async (oeuvreId: number) => {
          for (let i = 0; i < mediaFiles.length; i++) {
            const progressLabel = (percent: number) => t('ajouteroeuvre.uploadingMediaN', 'Envoi des médias ({{current}}/{{total}}) : {{percent}} %', { current: i + 1, total: mediaFiles.length, percent });
            setUploadProgress(progressLabel(0));
            try {
              const fd = new FormData();
              fd.append('medias', await prepareImageForUpload(mediaFiles[i]));
              const res = await httpClient.upload(`/oeuvres/${oeuvreId}/medias/upload`, fd, (p) => setUploadProgress(progressLabel(p)));
              if (!res?.success) failedMedias++;
            } catch (err) {
              console.error('Erreur upload média:', err);
              failedMedias++;
            }
          }
        };

        // Livre : extrait PDF et lecture audio, chacun sur sa propre adresse
        const uploadExtraits = async (oeuvreId: number) => {
          if (formData.id_type_oeuvre !== 1) return;
          for (const genre of ['pdf', 'audio'] as GenreExtrait[]) {
            const fichier = extraitsChoisis[genre];
            if (!fichier) continue;
            const progressLabel = (percent: number) => t('ajouteroeuvre.envoiExtrait', 'Envoi de l’extrait : {{percent}} %', { percent });
            setUploadProgress(progressLabel(0));
            try {
              const fd = new FormData();
              fd.append('fichier', fichier);
              const res = await httpClient.upload(`/oeuvres/${oeuvreId}/extrait/${genre}`, fd, (p) => setUploadProgress(progressLabel(p)));
              if (!res?.success) {
                failedMedias++;
                if (res?.error) toast({ title: t('ajouteroeuvre.extraitRefuse', 'Extrait non envoyé'), description: res.error, variant: 'destructive' });
              }
            } catch (err) {
              console.error('Erreur envoi extrait:', err);
              failedMedias++;
            }
          }
        };

        if (isEditMode && editId) {
          oeuvreResponse = await oeuvreService.updateOeuvre(editId, oeuvreData);
          if (oeuvreResponse.success && mediaFiles.length > 0) {
            await uploadMediaFiles(Number(editId));
          }
          if (oeuvreResponse.success) await uploadExtraits(Number(editId));
        } else {
          oeuvreResponse = await oeuvreService.createOeuvre(oeuvreData);

          if (oeuvreResponse.success && mediaFiles.length > 0 && oeuvreResponse.data?.oeuvre?.id_oeuvre) {
            const oeuvreId = oeuvreResponse.data.oeuvre.id_oeuvre;
            await uploadMediaFiles(oeuvreId);
          }
          if (oeuvreResponse.success && oeuvreResponse.data?.oeuvre?.id_oeuvre) {
            await uploadExtraits(oeuvreResponse.data.oeuvre.id_oeuvre);
          }
        }

        if (!oeuvreResponse.success) {
          setSubmitError(oeuvreResponse.error || (isEditMode ? t('ajouteroeuvre.updateError', 'Erreur lors de la mise à jour') : t('ajouteroeuvre.createError', 'Erreur lors de la création de l\'oeuvre')));
          return;
        }

        // Si l'utilisateur a cliqué "Publier" (pas brouillon), soumettre automatiquement pour validation
        if (!isDraft && !isEditMode && oeuvreResponse.data?.oeuvre?.id_oeuvre) {
          try {
            avertirSiNonSoumise(await oeuvreService.submitForValidation(oeuvreResponse.data.oeuvre.id_oeuvre));
          } catch (err) {
            console.warn('Soumission auto pour validation échouée:', err);
          }
        }

        toast({
          title: t('ajouteroeuvre.succes'),
          description: isEditMode ? t('toasts.oeuvreStatusUpdated') : (isDraft ? t('ajouteroeuvre.brouillon_sauvegarde') : t('ajouteroeuvre.oeuvre_creee_succes')),
        });
        if (failedMedias > 0) {
          toast({
            title: t('ajouteroeuvre.mediasFailedTitle', 'Médias non envoyés'),
            description: t('ajouteroeuvre.mediasFailed', "{{count}} fichier(s) n'ont pas pu être envoyés. Ajoutez-les depuis votre tableau de bord.", { count: failedMedias }),
            variant: 'destructive',
          });
        }
        rafraichirTableauDeBord();
        navigate('/dashboard-pro');

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '';
        const errorCode = (error as { code?: string })?.code;
        const delaiDepasse = !!errorMessage && (errorMessage.includes('timeout') || errorMessage.includes('Timeout') || errorCode === 'ECONNABORTED');
        if (delaiDepasse && isEditMode) {
          // Modification : pas de reprise (elle renvoyait les médias en double) ; la personne vérifie
          setSubmitError(t('ajouteroeuvre.verifyUpdate', 'Le serveur a tardé à répondre : la modification a peut-être été enregistrée. Ouvrez votre tableau de bord pour vérifier avant de recommencer.'));
        } else if (delaiDepasse) {
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
            // « Publier » demandé : envoi à la validation, comme sans délai dépassé (avant : restait en brouillon)
            if (!isDraft) {
              try {
                avertirSiNonSoumise(await oeuvreService.submitForValidation(checkResult.data.id_oeuvre));
              } catch (err) {
                console.warn('Soumission pour validation échouée:', err);
              }
            }
            toast({ title: t('ajouteroeuvre.succes'), description: isDraft ? t('ajouteroeuvre.brouillon_sauvegarde') : t('ajouteroeuvre.oeuvre_creee_succes') });
            navigate('/dashboard-pro');
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
      submittingRef.current = false;
    }
  }, [formData, metadata.types_oeuvres, contributeurs, nouveauxIntervenants, editeurs, medias, extraitsChoisis, prepareDetailsSpecifiques, toast, t]);

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
    useArticleEditor, setUseArticleEditor, showEditorChoice, cibleArticle,
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
    mediasEnregistres,
    retirerMediaEnregistre: (idMedia: number) => setMediasEnregistres(prev => prev.filter(m => m.id_media !== idMedia)),
    extraitsEnregistres, extraitsChoisis,
    choisirExtrait: (genre: GenreExtrait, fichier: File | null) => setExtraitsChoisis(prev => ({ ...prev, [genre]: fichier })),
    retirerExtrait: (genre: GenreExtrait) => setExtraitsEnregistres(prev => ({ ...prev, [genre]: null })),
  };
}
