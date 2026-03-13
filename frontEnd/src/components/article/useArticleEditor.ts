/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

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

export function useArticleEditor({ articleId, initialData, onSave }: Pick<ArticleEditorProps, 'articleId' | 'initialData' | 'onSave'>) {
  const { t } = useTranslation();
  const { toast } = useToast();

  // State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const [intervenantsExistants, setIntervenantsExistants] = useState<IntervenantExistant[]>([]);
  const [nouveauxIntervenants, setNouveauxIntervenants] = useState<NouvelIntervenant[]>([]);
  const [contributeurs, setContributeurs] = useState<ContributeurOeuvre[]>([]);
  const [editeurs, setEditeurs] = useState<EditeurOeuvre[]>([]);

  const [editLang, setEditLang] = useState('fr');
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
      const oeuvreResponse = await oeuvreService.getOeuvreById(Number(articleId));
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
          tags: oeuvre.Tags?.map((t: any) => t.nom) || [],
          type: articleType,
          ...articleData
        });

        const blocksResponse = await articleBlockService.getBlocksByArticle(
          Number(blocksRecordId),
          articleType
        );

        if (blocksResponse.success && blocksResponse.data) {
          setBlocks(blocksResponse.data.map((b: any) => ({ ...b, _uid: generateBlockUid() })));
        }
      }
    } catch (error) {
      console.error('Erreur chargement article:', error);
      setError('Erreur lors du chargement de l\'article');
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
      const existingTag = metadata.tags?.find((t: any) => {
        if (typeof t.nom === 'string') return t.nom.toLowerCase() === normalizedTag;
        if (typeof t.nom === 'object' && t.nom) {
          return Object.values(t.nom).some((v: any) => typeof v === 'string' && v.toLowerCase() === normalizedTag);
        }
        return false;
      });

      if (!existingTag && metadata.tags) {
        try {
          const response = await metadataService.createTag({ nom: normalizedTag });
          if (response.success && response.data) {
            metadata.tags.push(response.data);
          }
        } catch (error) {
          console.error('Erreur création tag:', error);
        }
      }

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
    setSaving(true);
    setError(null);

    try {
      const hasAnyTitre = Object.values(translations).some(t => t.titre?.trim());
      const hasAnyDescription = Object.values(translations).some(t => t.description?.trim());
      if (!hasAnyTitre || !hasAnyDescription) {
        throw new Error('Le titre et la description sont obligatoires (au moins dans une langue)');
      }

      const hasCategories = formData.type === 'article' ? 4 : 5;
      const shouldHaveCategories = await metadataService.checkIfTypeHasCategories(hasCategories);

      if (shouldHaveCategories && formData.categories.length === 0) {
        throw new Error('Veuillez sélectionner au moins une catégorie');
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

      const saveFormData = {
        ...formData,
        titre: titreMultiLang as any,
        description: descriptionMultiLang as any,
      };

      const response: ArticleSaveResponse = {
        article: {
          id_oeuvre: articleId ? Number(articleId) : 0,
          titre: titreMultiLang.fr || Object.values(titreMultiLang)[0] || '',
          formData: saveFormData,
          blocks,
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
      } else {
        console.log('Sauvegarde article:', response);
        toast({
          title: t('common.success', 'Succès'),
          description: t('article.savedSuccess', 'Article sauvegardé avec succès!'),
        });
      }
    } catch (error: any) {
      console.error('Erreur sauvegarde:', error);
      setError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return {
    // State
    loading, saving, error, activeTab, setActiveTab,
    metadata, formData, setFormData,
    blocks, editLang, setEditLang,
    translations, setTranslations,
    newTag, setNewTag, expandedSections,
    intervenantsExistants, nouveauxIntervenants,
    contributeurs, editeurs, setEditeurs,

    // Handlers
    addBlock, updateBlock, deleteBlock, moveBlock, duplicateBlock,
    handleAddTag, handleRemoveTag, toggleSection,
    handleIntervenantsChange, handleSave,
  };
}
