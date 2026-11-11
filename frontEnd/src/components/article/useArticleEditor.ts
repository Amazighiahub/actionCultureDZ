/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ArticleImporte } from '@/utils/importArticle';
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useSaisieConservee } from '@/hooks/useSaisieConservee';
import { useTranslation } from 'react-i18next';
import { messageErreurServeur } from '@/utils/erreurServeur';

import { articleBlockService } from '@/services/articleBlock.service';
import { metadataService } from '@/services/metadata.service';
import { oeuvreService } from '@/services/oeuvre.service';

import type {
  ArticleBlock,
  ArticleFormData,
  ArticleEditorProps,
  ArticleSaveResponse,
  BlockType,
} from '@/types/models/articles.types';

import { createDefaultBlock } from '@/types/models/articles.types';

import type {
  IntervenantExistant,
  NouvelIntervenant,
  ContributeurOeuvre,
  EditeurOeuvre,
} from '@/types/api/oeuvre-creation.types';

import { generateBlockUid } from './articleEditor.constants';
import { estBlocVide } from './ModelesEtAide';
import { LANGUES_ARTICLE, langueOrigine } from '@/utils/traductionBlocs';
import { nomDuTag } from '@/utils/donneesArticle';

// Template scientifique pour les nouveaux articles scientifiques
const SCIENTIFIC_TEMPLATE: ArticleBlock[] = [
  { type_block: 'heading', contenu: '1. Introduction', metadata: { level: 2 }, ordre: 0, visible: true },
  { type_block: 'text', contenu: 'Présentez le contexte de votre recherche, la problématique étudiée et les objectifs de l\'étude. Terminez par l\'annonce du plan de l\'article.', metadata: { alignment: 'justify' }, ordre: 1, visible: true },
  { type_block: 'heading', contenu: '2. Revue de littérature', metadata: { level: 2 }, ordre: 2, visible: true },
  { type_block: 'text', contenu: 'Synthétisez les travaux antérieurs pertinents. Identifiez les lacunes dans la littérature existante que votre recherche vise à combler.', metadata: { alignment: 'justify' }, ordre: 3, visible: true },
  { type_block: 'heading', contenu: '3. Méthodologie', metadata: { level: 2 }, ordre: 4, visible: true },
  { type_block: 'text', contenu: 'Décrivez votre approche méthodologique : type de recherche, échantillon, instruments de collecte de données, procédure d\'analyse.', metadata: { alignment: 'justify' }, ordre: 5, visible: true },
  { type_block: 'heading', contenu: '4. Résultats', metadata: { level: 2 }, ordre: 6, visible: true },
  { type_block: 'text', contenu: 'Présentez vos résultats de manière objective. Utilisez des tableaux, figures et graphiques pour illustrer vos données.', metadata: { alignment: 'justify' }, ordre: 7, visible: true },
  { type_block: 'image', contenu: '', metadata: { caption: 'Figure 1 : Insérez ici un graphique ou une illustration de vos résultats', layout: 'full-width' }, ordre: 8, visible: true },
  { type_block: 'heading', contenu: '5. Discussion', metadata: { level: 2 }, ordre: 9, visible: true },
  { type_block: 'text', contenu: 'Interprétez vos résultats en les comparant à la littérature existante. Discutez les implications, les limites de l\'étude et les perspectives futures.', metadata: { alignment: 'justify' }, ordre: 10, visible: true },
  { type_block: 'heading', contenu: '6. Conclusion', metadata: { level: 2 }, ordre: 11, visible: true },
  { type_block: 'text', contenu: 'Résumez les principaux apports de votre recherche et proposez des pistes pour de futurs travaux.', metadata: { alignment: 'justify' }, ordre: 12, visible: true },
  { type_block: 'heading', contenu: 'Références', metadata: { level: 2 }, ordre: 13, visible: true },
  { type_block: 'text', contenu: '[1] Nom, P. (Année). Titre de l\'article. Nom du journal, Volume(Numéro), pages. DOI\n[2] Nom, P. (Année). Titre du livre. Éditeur.', metadata: { alignment: 'left' }, ordre: 14, visible: true },
];

/**
 * Rédaction conservée quand la session expire (audit V11 FRM-23) : une clé par usage de l'éditeur.
 * Nouvel article (ajout d'œuvre, mode article), modification par l'auteur (/editer-article/:id) et
 * proposition de modification (/articles/:id/proposer) ne partagent jamais leur brouillon.
 */
export type ModeSaisieArticle = 'creation' | 'modification' | 'proposition';
export const modeSaisieArticle = (articleId: string | number | undefined, chemin: string): ModeSaisieArticle =>
  !articleId ? 'creation' : /\/proposer\/?$/.test(chemin) ? 'proposition' : 'modification';
export const cleSaisieArticle = (articleId: string | number | undefined, mode: ModeSaisieArticle) =>
  `article:${articleId || 'nouveau'}:${mode}`;

/** Bloc gardé dans le brouillon : sans le fichier d'une photo pas encore envoyée, ni son aperçu temporaire */
const blocSansFichier = (b: ArticleBlock): ArticleBlock => {
  const { _uid: _u, ...bloc } = b as ArticleBlock & { _uid?: string };
  const { tempFile: _f, ...metadata } = (bloc.metadata || {}) as Record<string, unknown>;
  const apercu = typeof bloc.media?.url === 'string' && bloc.media.url.startsWith('blob:');
  return { ...bloc, metadata, media: apercu ? undefined : bloc.media } as ArticleBlock;
};

export function useArticleEditor({ articleId, initialData, onSave }: Pick<ArticleEditorProps, 'articleId' | 'initialData' | 'onSave'>) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  // State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('content');
  const [metadata, setMetadata] = useState<any>({});

  const [formData, setFormData] = useState<ArticleFormData>({
    titre: '',
    description: '',
    id_langue: 1,
    categories: [],
    tags: [],
    type: 'article',
    ...initialData
  });

  const [blocks, setBlocks] = useState<ArticleBlock[]>([]);
  // Article existant : son contenu a-t-il bien été chargé ? (sinon, enregistrer effacerait le vrai texte)
  const [contenuCharge, setContenuCharge] = useState(false);
  const MESSAGE_NON_CHARGE = () => t('article.errors.contenuNonCharge', 'Le contenu de l’article n’a pas pu être chargé. Rechargez la page avant de modifier : rien ne sera enregistré tant qu’il n’est pas chargé.');

  const [intervenantsExistants, setIntervenantsExistants] = useState<IntervenantExistant[]>([]);
  const [nouveauxIntervenants, setNouveauxIntervenants] = useState<NouvelIntervenant[]>([]);
  const [contributeurs, setContributeurs] = useState<ContributeurOeuvre[]>([]);
  const [editeurs, setEditeurs] = useState<EditeurOeuvre[]>([]);

  // Langue dans laquelle le texte de l'article est écrit (les autres langues en sont des traductions) ;
  // nouvel article : la langue du site
  const langueSite = (LANGUES_ARTICLE as readonly string[]).includes(i18n.language) ? i18n.language : 'fr';
  const [langueTexte, setLangueTexte] = useState(langueSite);
  const [editLang, setEditLang] = useState(langueSite);
  const [translations, setTranslations] = useState<Record<string, { titre: string; description: string }>>(() => {
    const init: Record<string, { titre: string; description: string }> = {
      fr: { titre: '', description: '' },
      ar: { titre: '', description: '' },
      en: { titre: '', description: '' },
    };
    if (initialData?.titre) {
      if (typeof initialData.titre === 'object') {
        Object.entries(initialData.titre).forEach(([lang, val]) => {
          if (!init[lang]) init[lang] = { titre: '', description: '' };
          init[lang].titre = String(val);
        });
      } else {
        init.fr.titre = String(initialData.titre);
      }
    }
    if (initialData?.description) {
      if (typeof initialData.description === 'object') {
        Object.entries(initialData.description as any).forEach(([lang, val]) => {
          if (!init[lang]) init[lang] = { titre: '', description: '' };
          init[lang].description = String(val);
        });
      } else {
        init.fr.description = String(initialData.description);
      }
    }
    return init;
  });

  // Modifications non enregistrées : contenu comparé à celui de l'ouverture (ou du chargement)
  const signature = JSON.stringify({ formData, translations, blocks: blocks.map(({ _uid, ...b }: any) => b) });
  const signatureActuelle = useRef(signature);
  signatureActuelle.current = signature;
  const reference = useRef<string | null>(null);
  const referenceFigee = useRef(false);
  useEffect(() => {
    if (loading) return;
    // Après le chargement et le modèle d'article scientifique éventuel (sauf brouillon remis : la
    // référence reste alors le contenu chargé, et la rédaction remise compte comme une modification)
    const minuterie = setTimeout(() => { if (!referenceFigee.current) reference.current = signatureActuelle.current; }, 300);
    return () => clearTimeout(minuterie);
  }, [loading]);
  const modifie = reference.current !== null && reference.current !== signature;

  // Session expirée pendant la rédaction : titre, chapeau, traductions et blocs conservés, remis au retour
  // (audit V11 FRM-23). Article existant : clé connue une fois son contenu chargé ; le brouillon passe
  // après et l'emporte. Jamais les photos pas encore envoyées (fichier, aperçu) : à rajouter.
  const { pathname } = useLocation();
  const cleSaisie = cleSaisieArticle(articleId, modeSaisieArticle(articleId, pathname));
  const [fichiersARajouter, setFichiersARajouter] = useState(false);
  const { restauree: saisieRestauree, oublier: oublierSaisie } = useSaisieConservee({
    cle: articleId && !contenuCharge ? null : cleSaisie,
    valeur: {
      formData, translations, langueTexte,
      blocks: blocks.map(blocSansFichier),
      avaitFichiers: blocks.some(b => !!(b.metadata as Record<string, unknown> | undefined)?.tempFile),
    },
    restaurer: (v) => {
      reference.current = signatureActuelle.current;
      referenceFigee.current = true;
      if (v.formData) setFormData(prev => ({ ...prev, ...v.formData }));
      if (v.translations) setTranslations(v.translations);
      if (Array.isArray(v.blocks)) setBlocks(v.blocks.map(b => ({ ...b, _uid: generateBlockUid() } as ArticleBlock)));
      if (v.langueTexte) { setLangueTexte(v.langueTexte); setEditLang(v.langueTexte); }
      setFichiersARajouter(!!v.avaitFichiers);
      toast({
        title: t('ajouteroeuvre.brouillonRestaure', 'Votre saisie a été restaurée'),
        description: v.avaitFichiers
          ? t('ajouteroeuvre.brouillonFichiers', 'Votre session avait expiré. Ajoutez à nouveau les fichiers (images, sons) avant d’envoyer.')
          : t('saisie.conservee', 'Votre session avait expiré : votre texte a été conservé. Vérifiez-le, puis envoyez-le de nouveau.'),
      });
    },
    actif: modifie,
  });

  const [newTag, setNewTag] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    contributeurs: true,
    tags: true
  });

  // Effects
  useEffect(() => { loadMetadata(); }, []);

  useEffect(() => {
    if (!articleId && formData.type === 'article_scientifique' && blocks.length === 0) {
      setBlocks(SCIENTIFIC_TEMPLATE);
    }
  }, [formData.type]);

  useEffect(() => {
    if (articleId) { loadArticle(); }
  }, [articleId]);

  // Data loading
  const loadMetadata = async () => {
    try {
      const response = await metadataService.getAllCached();
      if (response.success && response.data) {
        setMetadata(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement métadonnées:', error);
    }
  };

  const loadArticle = async () => {
    if (!articleId) return;
    setLoading(true);
    try {
      // Toutes les langues : la version traduite aurait été réenregistrée comme texte français
      const oeuvreResponse = await oeuvreService.getForEdit(Number(articleId));
      if (oeuvreResponse.success && oeuvreResponse.data) {
        const oeuvre = oeuvreResponse.data as any;

        const articleType: 'article' | 'article_scientifique' =
          oeuvre.ArticleScientifique || oeuvre.article_scientifique ? 'article_scientifique' : 'article';
        const articleData = oeuvre.Article || oeuvre.ArticleScientifique || oeuvre.article || oeuvre.article_scientifique;
        const blocksRecordId = articleData?.id_article ?? articleData?.id_article_scientifique ?? Number(articleId);

        const titreObj: Record<string, string> = typeof oeuvre.titre === 'object' && oeuvre.titre !== null
          ? oeuvre.titre : { fr: String(oeuvre.titre || '') };
        const descObj: Record<string, string> = typeof oeuvre.description === 'object' && oeuvre.description !== null
          ? oeuvre.description : { fr: String(oeuvre.description || '') };

        setTranslations(prev => {
          const updated = { ...prev };
          Object.entries(titreObj).forEach(([lang, val]) => {
            if (!updated[lang]) updated[lang] = { titre: '', description: '' };
            updated[lang].titre = val as string;
          });
          Object.entries(descObj).forEach(([lang, val]) => {
            if (!updated[lang]) updated[lang] = { titre: '', description: '' };
            updated[lang].description = val as string;
          });
          return updated;
        });

        setFormData({
          titre: titreObj.fr || Object.values(titreObj)[0] || '',
          description: descObj.fr || Object.values(descObj)[0] || '',
          id_langue: oeuvre.id_langue,
          annee_creation: oeuvre.annee_creation,
          categories: oeuvre.Categories?.map((c: any) => c.id_categorie) || [],
          tags: (oeuvre.Tags || []).map(nomDuTag).filter(Boolean),
          type: articleType,
          ...articleData,
          // Article scientifique : le lien source est enregistré dans url_hal
          url_source: articleData?.url_source ?? articleData?.url_hal ?? undefined
        });

        const blocksResponse = await articleBlockService.getBlocksByArticle(
          Number(blocksRecordId),
          articleType
        );

        if (blocksResponse.success && blocksResponse.data) {
          setBlocks(blocksResponse.data.map((b: any) => ({ ...b, _uid: generateBlockUid() })));
          const origine = langueOrigine(blocksResponse.data, langueSite);
          setLangueTexte(origine);
          setEditLang(origine);
          setContenuCharge(true);
        } else {
          // Contenu non chargé : l'éditeur paraîtrait vide, et enregistrer effacerait le vrai texte
          setError(MESSAGE_NON_CHARGE());
        }
      } else {
        setError(MESSAGE_NON_CHARGE());
      }
    } catch (error) {
      console.error('Erreur chargement article:', error);
      setError(MESSAGE_NON_CHARGE());
    } finally {
      setLoading(false);
    }
  };

  // Block operations
  const addBlock = (type: BlockType | string, insertAt?: number) => {
    const newBlock = createDefaultBlock(type as BlockType);
    newBlock.visible = true;
    (newBlock as any)._uid = generateBlockUid();

    let newBlocks: ArticleBlock[];
    if (insertAt !== undefined && insertAt >= 0 && insertAt <= blocks.length) {
      newBlocks = [...blocks.slice(0, insertAt), newBlock, ...blocks.slice(insertAt)];
    } else {
      newBlocks = [...blocks, newBlock];
    }
    newBlocks.forEach((b, idx) => { b.ordre = idx; });
    setBlocks(newBlocks);
  };

  const updateBlock = (index: number, updates: Partial<ArticleBlock>) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], ...updates };
    setBlocks(newBlocks);
  };

  /** Tous les blocs d'un coup (nettoyage de la mise en page, annulation) */
  const remplacerBlocs = (nouveaux: ArticleBlock[]) => setBlocks(nouveaux);

  /** Article importé d'un fichier : titre, chapeau, mots-clés et blocs, dans toutes ses langues */
  const importerArticle = (a: ArticleImporte) => {
    setTranslations(prev => {
      const suivant = { ...prev };
      for (const langue of new Set([...Object.keys(a.titre), ...Object.keys(a.description)])) {
        suivant[langue] = {
          titre: a.titre[langue] ?? prev[langue]?.titre ?? '',
          description: a.description[langue] ?? prev[langue]?.description ?? '',
        };
      }
      return suivant;
    });
    if (a.tags.length) setFormData(prev => ({ ...prev, tags: [...new Set([...(prev.tags || []), ...a.tags])] }));
    setLangueTexte(a.langue);
    setEditLang(a.langue);
    setBlocks(a.blocks.map(b => ({ ...b, _uid: generateBlockUid() } as ArticleBlock)));
  };

  const deleteBlock = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === blocks.length - 1)
    ) return;

    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    newBlocks.forEach((block, idx) => { block.ordre = idx; });
    setBlocks(newBlocks);
  };

  const duplicateBlock = (index: number) => {
    const blockToDuplicate = blocks[index];
    const newBlock = {
      ...blockToDuplicate,
      id_block: undefined,
      ordre: blocks.length,
      _uid: generateBlockUid()
    } as any;
    setBlocks([...blocks, newBlock]);
  };

  // Tag management
  const handleAddTag = async (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase();
    if (normalizedTag && !formData.tags.includes(normalizedTag)) {
      // Mot-clé nouveau : le serveur le crée à l'enregistrement (helpers/tags.resolveTagIds). L'appel de
      // création directe était réservé à l'administration : les auteurs voyaient un faux « Accès refusé ».
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, normalizedTag] }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !(prev as any)[section] }));
  };

  const handleIntervenantsChange = (existants: IntervenantExistant[], nouveaux: NouvelIntervenant[], contributeursList: ContributeurOeuvre[]) => {
    setIntervenantsExistants(existants);
    setNouveauxIntervenants(nouveaux);
    setContributeurs(contributeursList);
  };

  // Save
  const handleSave = async () => {
    // Article existant dont le contenu n'a pas été chargé : on n'enregistre rien (le texte serait effacé)
    if (articleId && !contenuCharge) {
      setError(MESSAGE_NON_CHARGE());
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const errs: Record<string, string> = {};
      const hasAnyTitre = Object.values(translations).some(t => t.titre?.trim());
      const hasAnyDescription = Object.values(translations).some(t => t.description?.trim());
      if (!hasAnyTitre) {
        errs.titre = t('article.errors.titreRequired', 'Le titre est obligatoire (au moins dans une langue)');
      }
      if (!hasAnyDescription) {
        errs.description = t('article.errors.descriptionRequired', 'La description est obligatoire (au moins dans une langue)');
      }

      const hasCategories = formData.type === 'article' ? 4 : 5;
      const shouldHaveCategories = await metadataService.checkIfTypeHasCategories(hasCategories);

      if (shouldHaveCategories && formData.categories.length === 0) {
        errs.categories = t('article.errors.categoriesRequired', 'Veuillez sélectionner au moins une catégorie');
      }

      setFieldErrors(errs);
      if (Object.keys(errs).length > 0) {
        // Les catégories se choisissent dans l'onglet Métadonnées
        setActiveTab(errs.titre || errs.description ? 'content' : 'metadata');
        throw new Error(Object.values(errs)[0]);
      }

      const buildMultiLang = (field: 'titre' | 'description') => {
        const obj: Record<string, string> = {};
        Object.entries(translations).forEach(([lang, vals]) => {
          if (vals[field]?.trim()) {
            obj[lang] = vals[field].trim();
          }
        });
        return obj;
      };

      const titreMultiLang = buildMultiLang('titre');
      const descriptionMultiLang = buildMultiLang('description');

      // Langue de l'œuvre : celle dans laquelle l'article est écrit (codes de la table des langues)
      const CODE_LANGUE: Record<string, string> = { 'tz-ltn': 'tm', 'tz-tfng': 'tif' };
      const codeLangue = CODE_LANGUE[langueTexte] || langueTexte;
      const idLangueTexte = (metadata?.langues as Array<{ id_langue: number; code?: string }> | undefined)
        ?.find(l => l.code === codeLangue)?.id_langue;

      const saveFormData = {
        ...formData,
        id_langue: idLangueTexte || formData.id_langue,
        titre: titreMultiLang as any,
        description: descriptionMultiLang as any,
      };
      if (!saveFormData.id_langue) {
        throw new Error(t('article.errors.langueInconnue', 'La langue de l’article n’a pas pu être déterminée. Choisissez-la dans « Le texte de l’article est écrit en », puis réessayez.'));
      }
      // Un bloc de texte tient en 65 000 octets en base (environ 30 000 lettres arabes, 60 000 latines)
      const tropLong = blocks.findIndex(b => new TextEncoder().encode(String(b.contenu ?? '')).length > 60000);
      if (tropLong >= 0) {
        setActiveTab('content');
        throw new Error(t('article.errors.blocTropLong', 'Le bloc n° {{n}} est trop long : coupez-le en plusieurs paragraphes (un bloc par partie), puis enregistrez.', { n: tropLong + 1 }));
      }

      const response: ArticleSaveResponse = {
        article: {
          id_oeuvre: articleId ? Number(articleId) : 0,
          titre: titreMultiLang.fr || Object.values(titreMultiLang)[0] || '',
          formData: saveFormData,
          // Chaque bloc garde la langue de son texte d'origine (pour la traduction). Les blocs laissés vides
          // (cases d'un modèle non remplies) ne sont pas publiés, et les consignes du modèle sont retirées.
          blocks: blocks.filter(b => !estBlocVide(b)).map(b => {
            const { indication: _indication, ...metadata } = (b.metadata || {}) as Record<string, unknown>;
            return { ...b, metadata: { ...metadata, langue_origine: langueTexte } };
          }),
          contributeurs: {
            existants: intervenantsExistants,
            nouveaux: nouveauxIntervenants,
            contributeurs: contributeurs
          },
          editeurs
        }
      };

      if (onSave) {
        await onSave(response);
        // Envoi réussi (onSave rejette en cas d'échec) : plus rien à garder
        oublierSaisie();
      } else {
        oublierSaisie();
        toast({
          title: t('common.success', 'Succès'),
          description: t('article.savedSuccess', 'Article sauvegardé avec succès!'),
        });
      }
    } catch (error: any) {
      console.error('Erreur sauvegarde:', error);
      // Raison du serveur, détail des champs compris (ex. proposition de modification refusée) ;
      // avant : « Données invalides », ou un repli en français dans l'interface arabe
      setError(messageErreurServeur(error, t('ajouteroeuvre.articleSaveError', "Erreur lors de la sauvegarde de l'article")));
    } finally {
      setSaving(false);
    }
  };

  return {
    // State
    loading, saving, error, fieldErrors, activeTab, setActiveTab, modifie,
    // Rédaction remise après une session expirée (avis à afficher), photos à rajouter
    saisieRestauree, fichiersARajouter,
    metadata, formData, setFormData,
    blocks, editLang, setEditLang, langueTexte, setLangueTexte,
    translations, setTranslations,
    newTag, setNewTag, expandedSections,
    intervenantsExistants, nouveauxIntervenants,
    contributeurs, editeurs, setEditeurs,

    // Handlers
    addBlock, updateBlock, deleteBlock, moveBlock, duplicateBlock, remplacerBlocs, importerArticle,
    handleAddTag, handleRemoveTag, toggleSection,
    handleIntervenantsChange, handleSave,
  };
}
