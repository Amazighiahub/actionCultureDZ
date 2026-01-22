/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { Label } from '@/components/UI/label';
import { Textarea } from '@/components/UI/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/UI/select';
import { Alert, AlertDescription } from '@/components/UI/alert';
import { Badge } from '@/components/UI/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/UI/tabs';
import { Checkbox } from '@/components/UI/checkbox';
import {
  ArrowLeft, Save, Eye, Plus, Trash2, MoveUp, MoveDown,
  Copy, Type, Heading1, Heading2, Image, Quote, List,
  Table, Code, Minus, AlertCircle, Loader2, FileText, Film,
  Upload, X, Star, ChevronDown, Grid3X3, Link2 } from
'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Import des helpers
import { getAssetUrl } from '@/helpers/assetUrl';

// Import des services et types
import { articleBlockService } from '@/services/articleBlock.service';
import { metadataService } from '@/services/metadata.service';
import { oeuvreService } from '@/services/oeuvre.service';
import { mapToBackendDTO } from '@/types/api/create-oeuvre-backend.dto';
import CategorySelection from '@/components/CategorieSection';
import IntervenantEditeurManager from '@/components/oeuvre/IntervenantEditeurManager';

// Import des types depuis le fichier centralisé
import type {
  ArticleBlock,
  ArticleFormData,
  ArticleEditorProps,
  ArticleBlockEditorProps,
  ArticleSaveResponse,
  BlockType,
  BlockTemplate,
  MediaInfo } from
'@/types/models/articles.types';

import {
  createDefaultBlock,
  isTextBlock,
  isMediaBlock,
  isListBlock,
  isTableBlock } from
'@/types/models/articles.types';

// Import des types pour les contributeurs
import type {
  IntervenantExistant,
  NouvelIntervenant,
  ContributeurOeuvre,
  EditeurOeuvre } from
'@/types/api/oeuvre-creation.types';

// Styles pour l'aperçu
import { useTranslation } from "react-i18next";const PREVIEW_STYLES = `
  .article-preview {
    font-family: Georgia, serif;
    line-height: 1.8;
    color: #333;
  }
  
  .article-preview h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: #1a1a1a;
  }
  
  .article-preview h2 {
    font-size: 2rem;
    font-weight: 600;
    margin-top: 2rem;
    margin-bottom: 1rem;
    color: #2a2a2a;
  }
  
  .article-preview h3 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    color: #3a3a3a;
  }
  
  .article-preview p {
    margin-bottom: 1.5rem;
  }
  
  .article-preview blockquote {
    border-left: 4px solid #e5e7eb;
    padding-left: 1.5rem;
    margin: 2rem 0;
    font-style: italic;
    color: #6b7280;
  }
  
  .article-preview blockquote cite {
    display: block;
    text-align: right;
    margin-top: 0.5rem;
    font-size: 0.875rem;
    font-style: normal;
  }
  
  .article-preview ul, .article-preview ol {
    margin-bottom: 1.5rem;
    padding-left: 2rem;
  }
  
  .article-preview li {
    margin-bottom: 0.5rem;
  }
  
  .article-preview pre {
    background-color: #f3f4f6;
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin-bottom: 1.5rem;
  }
  
  .article-preview code {
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
  }
  
  .article-preview img {
    max-width: 100%;
    height: auto;
    margin: 2rem auto;
    display: block;
  }
  
  .article-preview img.full-width {
    width: 100%;
  }
  
  .article-preview img.float-left {
    float: left;
    margin-right: 2rem;
    margin-bottom: 1rem;
    max-width: 50%;
  }
  
  .article-preview img.float-right {
    float: right;
    margin-left: 2rem;
    margin-bottom: 1rem;
    max-width: 50%;
  }
  
  .article-preview .image-caption {
    text-align: center;
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 0.5rem;
    font-style: italic;
  }
  
  .article-preview hr {
    border: none;
    border-top: 2px solid #e5e7eb;
    margin: 3rem 0;
  }
  
  .article-preview table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1.5rem;
  }
  
  .article-preview th,
  .article-preview td {
    border: 1px solid #e5e7eb;
    padding: 0.75rem;
    text-align: left;
  }
  
  .article-preview th {
    background-color: #f9fafb;
    font-weight: 600;
  }
  
  .article-preview .embed-container {
    position: relative;
    padding-bottom: 56.25%;
    height: 0;
    overflow: hidden;
    margin-bottom: 1.5rem;
  }
  
  .article-preview .embed-container iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
`;

// Templates de blocs
const BLOCK_TEMPLATES: BlockTemplate[] = [
{ id: 'text', name: 'Paragraphe', type_block: 'text', icon: 'Type' },
{ id: 'heading', name: 'Titre', type_block: 'heading', icon: 'Heading1' },
{ id: 'image', name: 'Image', type_block: 'image', icon: 'Image' },
{ id: 'video', name: 'Vidéo', type_block: 'video', icon: 'Film' },
{ id: 'citation', name: 'Citation', type_block: 'citation', icon: 'Quote' },
{ id: 'list', name: 'Liste', type_block: 'list', icon: 'List' },
{ id: 'table', name: 'Tableau', type_block: 'table', icon: 'Grid3X3' },
{ id: 'code', name: 'Code', type_block: 'code', icon: 'Code' },
{ id: 'separator', name: 'Séparateur', type_block: 'separator', icon: 'Minus' },
{ id: 'embed', name: 'Intégration', type_block: 'embed', icon: 'Link2' }];


// Mapping des icônes
const BLOCK_ICONS: Record<string, any> = {
  Type, Heading1, Image, Film, Quote, List, Grid3X3, Code, Minus, Link2
};

// Composant pour un bloc d'article
const ArticleBlockEditor: React.FC<ArticleBlockEditorProps> = ({
  block, index, onUpdate, onDelete, onMoveUp, onMoveDown, onDuplicate, canMoveUp, canMoveDown
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const handleContentChange = (value: string) => {
    onUpdate(index, { contenu: value });
  };

  const handleMetadataChange = (key: string, value: any) => {
    onUpdate(index, {
      metadata: { ...block.metadata, [key]: value }
    });
  };

  const handleImageUpload = (file: File) => {
    // Validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: t('common.error', 'Erreur'),
        description: t('article.imageTooLarge', 'L\'image est trop volumineuse (max 10MB)'),
        variant: 'destructive',
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: t('common.error', 'Erreur'),
        description: t('article.mustBeImage', 'Le fichier doit être une image'),
        variant: 'destructive',
      });
      return;
    }

    // Créer un aperçu de l'image
    const reader = new FileReader();
    reader.onload = (e) => {
      const mediaInfo: MediaInfo = {
        url: e.target?.result as string,
        titre: file.name,
        type_media: file.type,
        taille_fichier: file.size
      };

      onUpdate(index, {
        media: mediaInfo,
        // Stocker temporairement le fichier dans metadata pour l'upload
        metadata: {
          ...block.metadata,
          tempFile: file
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const handleVideoUrl = (url: string) => {
    // Extraire l'ID YouTube si c'est une URL YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (youtubeMatch) {
      onUpdate(index, {
        contenu: `https://www.youtube.com/embed/${youtubeMatch[1]}`,
        metadata: { ...block.metadata, videoType: 'youtube' }
      });
    } else {
      onUpdate(index, { contenu: url });
    }
  };

  const handleTableUpdate = (headers: string[], rows: string[][]) => {
    onUpdate(index, { contenu_json: { headers, rows } });
  };

  const handleImageRemove = () => {
    onUpdate(index, { media: undefined });
  };

  const renderBlockContent = () => {
    switch (block.type_block) {
      case 'text':
        return (
          <Textarea
            value={block.contenu || ''}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder={t("article_articleeditor.placeholder_entrez_votre_texte")}
            className="min-h-[100px]" />);



      case 'heading':
        return (
          <div className="space-y-3">
            <Select
              value={block.metadata?.level?.toString() || '2'}
              onValueChange={(value) => handleMetadataChange('level', parseInt(value))}>
              
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{t("article_articleeditor.titre")}</SelectItem>
                <SelectItem value="2">{t("article_articleeditor.titre_1")}</SelectItem>
                <SelectItem value="3">{t("article_articleeditor.titre_2")}</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={block.contenu || ''}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder={t("article_articleeditor.placeholder_entrez_votre_titre")}
              className="text-lg font-semibold" />
            
          </div>);


      case 'image':
        return (
          <div className="space-y-3">
            {block.media?.url ?
            <div className="relative group">
                <img
                src={getAssetUrl(block.media.url)}
                alt={block.metadata?.caption || 'Image'}
                className="w-full max-h-96 object-contain rounded-lg border" />
              
                <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleImageRemove}>
                
                  <X className="h-4 w-4" />
                </Button>
              </div> :

            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => document.getElementById(`image-upload-${index}`)?.click()}>
              
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-2">{t("article_articleeditor.cliquez_pour_uploader")}

              </p>
                <p className="text-xs text-muted-foreground">{t("article_articleeditor.jpg_png_gif")}

              </p>
                <input
                id={`image-upload-${index}`}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }} />
              
              </div>
            }
            
            <div className="space-y-2">
              <Label>{t("article_articleeditor.lgende_limage_optionnel")}</Label>
              <Input
                value={block.metadata?.caption || ''}
                onChange={(e) => handleMetadataChange('caption', e.target.value)}
                placeholder={t("article_articleeditor.placeholder_dcrivez_limage")} />
              
            </div>
            
            <div className="space-y-2">
              <Label>{t("article_articleeditor.mise_page")}</Label>
              <Select
                value={block.metadata?.layout || 'full-width'}
                onValueChange={(value) => handleMetadataChange('layout', value)}>
                
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-width">{t("article_articleeditor.pleine_largeur")}</SelectItem>
                  <SelectItem value="centered">{t("article_articleeditor.centre")}</SelectItem>
                  <SelectItem value="float-left">{t("article_articleeditor.flottante_gauche")}</SelectItem>
                  <SelectItem value="float-right">{t("article_articleeditor.flottante_droite")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>);


      case 'video':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t("article_articleeditor.url_vido")}</Label>
              <Input
                value={block.contenu || ''}
                onChange={(e) => handleVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..." />
              
              <p className="text-xs text-muted-foreground">{t("article_articleeditor.supporte_youtube_vimeo")}

              </p>
            </div>
            
            {block.contenu &&
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <Film className="h-12 w-12 text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">{t("article_articleeditor.aperu_vido")}</span>
              </div>
            }
          </div>);


      case 'citation':
        return (
          <div className="space-y-3">
            <Textarea
              value={block.contenu || ''}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder={t("article_articleeditor.placeholder_entrez_votre_citation")}
              className="italic" />
            
            <Input
              value={block.metadata?.author || ''}
              onChange={(e) => handleMetadataChange('author', e.target.value)}
              placeholder={t("article_articleeditor.placeholder_auteur_citation_optionnel")} />
            
          </div>);


      case 'list':
        return (
          <div className="space-y-3">
            <Select
              value={block.metadata?.listType || 'unordered'}
              onValueChange={(value) => handleMetadataChange('listType', value)}>
              
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unordered">{t("article_articleeditor.liste_puces")}</SelectItem>
                <SelectItem value="ordered">{t("article_articleeditor.liste_numrote")}</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              value={isListBlock(block) ? block.contenu_json.join('\n') : ''}
              onChange={(e) => onUpdate(index, {
                contenu_json: e.target.value.split('\n').filter((line) => line.trim())
              })}
              placeholder={t("article_articleeditor.placeholder_lment_par_ligne")}
              className="min-h-[100px]" />
            
          </div>);


      case 'table':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("article_articleeditor.diteur_tableau_fonctionnalit")}

            </p>
            {isTableBlock(block) ?
            <div className="border rounded-lg p-4 space-y-2">
                <div className="space-y-2">
                  <Label>{t("article_articleeditor.enttes_spars_par")}</Label>
                  <Input
                  value={block.contenu_json.headers.join(', ')}
                  onChange={(e) => {
                    const headers = e.target.value.split(',').map((h) => h.trim());
                    handleTableUpdate(headers, block.contenu_json.rows);
                  }}
                  placeholder={t("article_articleeditor.placeholder_colonne_colonne_colonne")} />
                
                </div>
                <div className="space-y-2">
                  <Label>{t("article_articleeditor.lignes_une_par")}</Label>
                  <Textarea
                  value={block.contenu_json.rows.map((row) => row.join(' | ')).join('\n')}
                  onChange={(e) => {
                    const rows = e.target.value.split('\n').map((line) =>
                    line.split('|').map((cell) => cell.trim())
                    );
                    handleTableUpdate(block.contenu_json.headers, rows);
                  }}
                  placeholder={t("article_articleeditor.placeholder_cellule_cellule_cellule")}
                  className="min-h-[100px]" />
                
                </div>
              </div> :

            <Button
              onClick={() => handleTableUpdate(['Col 1', 'Col 2'], [['', '']])}>{t("article_articleeditor.crer_tableau")}


            </Button>
            }
          </div>);


      case 'code':
        return (
          <div className="space-y-3">
            <Input
              value={block.metadata?.language || ''}
              onChange={(e) => handleMetadataChange('language', e.target.value)}
              placeholder={t("article_articleeditor.placeholder_langage_javascript_python")} />
            
            <Textarea
              value={block.contenu || ''}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder={t("article_articleeditor.placeholder_entrez_votre_code")}
              className="font-mono text-sm min-h-[150px]" />
            
          </div>);


      case 'separator':
        return (
          <div className="py-4">
            <hr className="border-t-2" />
          </div>);


      case 'embed':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t("article_articleeditor.code_dintgration_url")}</Label>
              <Textarea
                value={block.contenu || ''}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder={t("article_articleeditor.placeholder_iframe_srciframe_url")}
                className="min-h-[100px] font-mono text-sm" />
              
            </div>
            <p className="text-xs text-muted-foreground">{t("article_articleeditor.collez_code_dintgration")}

            </p>
          </div>);


      default:
        return <p className="text-muted-foreground">{t("article_articleeditor.type_bloc_non")}</p>;
    }
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <Badge variant="secondary" className="capitalize">
            {block.type_block.replace('_', ' ')}
          </Badge>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              title={t("article_articleeditor.title_monter")}>
              
              <MoveUp className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              title={t("article_articleeditor.title_descendre")}>
              
              <MoveDown className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onDuplicate}
              title={t("article_articleeditor.title_dupliquer")}>
              
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(index)}
              title={t("article_articleeditor.title_supprimer")}
              className="text-destructive hover:text-destructive">
              
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {renderBlockContent()}
      </CardContent>
    </Card>);

};

// Composant principal ArticleEditor avec types importés
const ArticleEditor: React.FC<ArticleEditorProps> = ({
  articleId,
  initialData,
  onBack,
  onSave
}) => {
  // États
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('content');
  const [metadata, setMetadata] = useState<any>({});

  // État du formulaire avec toutes les métadonnées
  const [formData, setFormData] = useState<ArticleFormData>({
    titre: '',
    description: '',
    id_langue: 1,
    categories: [],
    tags: [],
    type: 'article',
    ...initialData
  });

  // État des blocs
  const [blocks, setBlocks] = useState<ArticleBlock[]>([]);

  // États pour les contributeurs et éditeurs
  const [intervenantsExistants, setIntervenantsExistants] = useState<IntervenantExistant[]>([]);
  const [nouveauxIntervenants, setNouveauxIntervenants] = useState<NouvelIntervenant[]>([]);
  const [contributeurs, setContributeurs] = useState<ContributeurOeuvre[]>([]);
  const [editeurs, setEditeurs] = useState<EditeurOeuvre[]>([]);

  // Tags management
  const [newTag, setNewTag] = useState('');

  // État pour afficher/cacher les sections
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    contributeurs: true,
    tags: true
  });

  // Charger les métadonnées au montage
  const { t } = useTranslation();
  const { toast } = useToast();

  useEffect(() => {
    loadMetadata();
  }, []);

  // Charger l'article existant si articleId
  useEffect(() => {
    if (articleId) {
      loadArticle();
    }
  }, [articleId]);

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
      // Charger l'œuvre
      const oeuvreResponse = await oeuvreService.getOeuvreById(Number(articleId));
      if (oeuvreResponse.success && oeuvreResponse.data) {
        const oeuvre = oeuvreResponse.data;

        // Déterminer le type d'article
        const articleType = oeuvre.ArticleScientifique ? 'article_scientifique' : 'article';
        const articleData = oeuvre.Article || oeuvre.ArticleScientifique;

        setFormData({
          titre: oeuvre.titre,
          description: oeuvre.description || '',
          id_langue: oeuvre.id_langue,
          annee_creation: oeuvre.annee_creation,
          categories: oeuvre.Categories?.map((c: any) => c.id_categorie) || [],
          tags: oeuvre.Tags?.map((t: any) => t.nom) || [],
          type: articleType,
          ...articleData
        });
      }

      // Charger les blocs
      const blocksResponse = await articleBlockService.getBlocksByArticle(
        Number(articleId),
        formData.type
      );

      if (blocksResponse.success && blocksResponse.data) {
        setBlocks(blocksResponse.data);
      }
    } catch (error) {
      console.error('Erreur chargement article:', error);
      setError('Erreur lors du chargement de l\'article');
    } finally {
      setLoading(false);
    }
  };

  // Gestion des blocs avec les types importés
  const addBlock = (type: BlockType | string) => {
    const newBlock = createDefaultBlock(type as BlockType);
    newBlock.ordre = blocks.length;
    newBlock.visible = true;
    setBlocks([...blocks, newBlock]);
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
    direction === 'up' && index === 0 ||
    direction === 'down' && index === blocks.length - 1)
    {
      return;
    }

    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];

    // Mettre à jour l'ordre
    newBlocks.forEach((block, idx) => {
      block.ordre = idx;
    });

    setBlocks(newBlocks);
  };

  const duplicateBlock = (index: number) => {
    const blockToDuplicate = blocks[index];
    const newBlock = {
      ...blockToDuplicate,
      id_block: undefined,
      ordre: blocks.length
    };
    setBlocks([...blocks, newBlock]);
  };

  // Reste du composant identique...
  // (handleAddTag, handleRemoveTag, toggleSection, handleIntervenantsChange, handleSave, etc.)

  // Rendu du preview avec les types
  const renderPreviewBlock = (block: ArticleBlock, index: number) => {
    switch (block.type_block) {
      case 'text':
        return <p key={index}>{block.contenu}</p>;

      case 'heading':{
          const HeadingTag = `h${block.metadata?.level || 2}` as keyof JSX.IntrinsicElements;
          return <HeadingTag key={index}>{block.contenu}</HeadingTag>;
        }

      case 'image':
        return block.media?.url ?
        <figure key={index} className="my-6">
            <img
            src={getAssetUrl(block.media.url)}
            alt={block.metadata?.caption || 'Image'}
            className={block.metadata?.layout || 'full-width'} />
          
            {block.metadata?.caption &&
          <figcaption className="image-caption">
                {block.metadata.caption}
              </figcaption>
          }
          </figure> :
        null;

      case 'video':
        return block.contenu ?
        <div key={index} className="embed-container">
            <iframe
            src={block.contenu}
            frameBorder="0"
            allowFullScreen />
          
          </div> :
        null;

      case 'citation':
        return (
          <blockquote key={index}>
            <p>{block.contenu}</p>
            {block.metadata?.author && <cite>— {block.metadata.author}</cite>}
          </blockquote>);


      case 'list':{
          if (!isListBlock(block)) return null;
          return block.metadata?.listType === 'ordered' ?
          <ol key={index}>
            {block.contenu_json.map((item, i) => <li key={i}>{item}</li>)}
          </ol> :

          <ul key={index}>
            {block.contenu_json.map((item, i) => <li key={i}>{item}</li>)}
          </ul>;

        }

      case 'table':{
          if (!isTableBlock(block)) return null;
          return (
            <table key={index}>
            <thead>
              <tr>
                {block.contenu_json.headers.map((header, i) =>
                  <th key={i}>{header}</th>
                  )}
              </tr>
            </thead>
            <tbody>
              {block.contenu_json.rows.map((row, i) =>
                <tr key={i}>
                  {row.map((cell, j) =>
                  <td key={j}>{cell}</td>
                  )}
                </tr>
                )}
            </tbody>
          </table>);

        }

      case 'code':
        return (
          <pre key={index}>
            <code>{block.contenu}</code>
          </pre>);


      case 'separator':
        return <hr key={index} />;

      case 'embed':
        // ✅ SÉCURITÉ: Sanitiser le HTML pour prévenir les attaques XSS
        if (block.contenu) {
          // Utiliser DOMPurify pour nettoyer le HTML des embeds
          const sanitizeEmbed = (html: string) => {
            // Configuration stricte pour les embeds
            const allowedTags = ['iframe', 'div', 'span'];
            const allowedAttrs = ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'class', 'title'];
            
            // Créer un élément temporaire pour parser le HTML
            const temp = document.createElement('div');
            temp.innerHTML = html;
            
            // Vérifier que c'est un iframe de source autorisée
            const iframe = temp.querySelector('iframe');
            if (iframe) {
              const src = iframe.getAttribute('src') || '';
              const allowedDomains = ['youtube.com', 'youtube-nocookie.com', 'vimeo.com', 'dailymotion.com', 'soundcloud.com'];
              const isAllowed = allowedDomains.some(domain => src.includes(domain));
              if (!isAllowed) return '';
            }
            
            return html;
          };
          
          const sanitizedContent = sanitizeEmbed(block.contenu);
          return sanitizedContent ? (
            <div key={index} className="embed-container"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
          ) : null;
        }
        return null;

      default:
        return null;
    }
  };

  // Gestion des tags
  const handleAddTag = async (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase();

    if (normalizedTag && !formData.tags.includes(normalizedTag)) {
      // Vérifier si le tag existe déjà
      const existingTag = metadata.tags?.find((t: any) =>
      t.nom.toLowerCase() === normalizedTag
      );

      // Si le tag n'existe pas, le créer
      if (!existingTag && metadata.tags) {
        try {
          const response = await metadataService.createTag({ nom: normalizedTag });
          if (response.success && response.data) {
            // Mettre à jour les métadonnées locales
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
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag)
    }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handler pour les changements d'intervenants
  const handleIntervenantsChange = (existants: IntervenantExistant[], nouveaux: NouvelIntervenant[], contributeursList: ContributeurOeuvre[]) => {
    setIntervenantsExistants(existants);
    setNouveauxIntervenants(nouveaux);
    setContributeurs(contributeursList);
  };

  // Sauvegarde complète
  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // Validation
      if (!formData.titre || !formData.description) {
        throw new Error('Le titre et la description sont obligatoires');
      }

      const hasCategories = formData.type === 'article' ? 4 : 5;
      const shouldHaveCategories = await metadataService.checkIfTypeHasCategories(hasCategories);

      if (shouldHaveCategories && formData.categories.length === 0) {
        throw new Error('Veuillez sélectionner au moins une catégorie');
      }

      // Préparer les données pour la sauvegarde
      const response: ArticleSaveResponse = {
        article: {
          id_oeuvre: articleId ? Number(articleId) : 0,
          titre: formData.titre,
          formData,
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
        // Sauvegarde par défaut
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">{t("article_articleeditor.chargement")}</p>
        </div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-background">
      <style dangerouslySetInnerHTML={{ __html: PREVIEW_STYLES }} />
      
      <div className="container py-8">
        <div className="max-w-5xl mx-auto">
          {/* En-tête */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              {onBack &&
              <Button
                variant="outline"
                size="sm"
                onClick={onBack}>
                
                  <ArrowLeft className="h-4 w-4 mr-2" />{t("article_articleeditor.retour")}

              </Button>
              }
              <div>
                <h1 className="text-3xl font-bold">
                  {articleId ? 'Modifier l\'article' : 'Créer un article'}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {formData.type === 'article_scientifique' ? 'Article scientifique' : 'Article'}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setActiveTab(activeTab === 'preview' ? 'content' : 'preview')}>
                
                <Eye className="h-4 w-4 mr-2" />
                {activeTab === 'preview' ? 'Éditer' : 'Aperçu'}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}>
                
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />{t("article_articleeditor.sauvegarder")}

              </Button>
            </div>
          </div>

          {error &&
          <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          }

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="content">{t("article_articleeditor.contenu")}</TabsTrigger>
              <TabsTrigger value="metadata">{t("article_articleeditor.mtadonnes")}</TabsTrigger>
              <TabsTrigger value="preview">{t("article_articleeditor.aperu")}</TabsTrigger>
            </TabsList>

            {/* Onglet Contenu */}
            <TabsContent value="content" className="space-y-6">
              {/* Informations de base */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("article_articleeditor.informations_principales")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="titre">{t("article_articleeditor.titre_3")}</Label>
                    <Input
                      id="titre"
                      value={formData.titre}
                      onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                      placeholder={t("article_articleeditor.placeholder_titre_larticle")} />
                    
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">{t("article_articleeditor.description_chapeau")}</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t("article_articleeditor.placeholder_rsum_introduction_larticle")}
                      className="min-h-[100px]" />
                    
                  </div>
                </CardContent>
              </Card>

              {/* Blocs de contenu */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("article_articleeditor.contenu_larticle")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {blocks.length === 0 ?
                  <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{t("article_articleeditor.aucun_contenu_pour")}</p>
                      <p className="text-sm">{t("article_articleeditor.ajoutez_des_blocs")}</p>
                    </div> :

                  <div className="space-y-3">
                      {blocks.map((block, index) =>
                    <ArticleBlockEditor
                      key={`block-${block.id_block || index}`}
                      block={block}
                      index={index}
                      onUpdate={updateBlock}
                      onDelete={deleteBlock}
                      onMoveUp={() => moveBlock(index, 'up')}
                      onMoveDown={() => moveBlock(index, 'down')}
                      onDuplicate={() => duplicateBlock(index)}
                      canMoveUp={index > 0}
                      canMoveDown={index < blocks.length - 1} />

                    )}
                    </div>
                  }
                  
                  {/* Boutons d'ajout de blocs */}
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-3">{t("article_articleeditor.ajouter_bloc")}</p>
                    <div className="flex flex-wrap gap-2">
                      {BLOCK_TEMPLATES.map((template) => {
                        const Icon = BLOCK_ICONS[template.icon];
                        return (
                          <Button
                            key={template.id}
                            variant="outline"
                            size="sm"
                            onClick={() => addBlock(template.type_block)}>
                            
                            {Icon && <Icon className="h-4 w-4 mr-2" />}
                            {template.name}
                          </Button>);

                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet Métadonnées */}
            <TabsContent value="metadata" className="space-y-6">
              {/* Informations de base */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("article_articleeditor.informations_base")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="id_langue">{t("article_articleeditor.langue")}</Label>
                      <Select
                        value={formData.id_langue.toString()}
                        onValueChange={(value) => setFormData({ ...formData, id_langue: parseInt(value) })}>
                        
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {metadata.langues?.map((langue: any) =>
                          <SelectItem key={langue.id_langue} value={langue.id_langue.toString()}>
                              {langue.nom}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="annee_creation">{t("article_articleeditor.anne_cration")}</Label>
                      <Input
                        id="annee_creation"
                        type="number"
                        value={formData.annee_creation || new Date().getFullYear()}
                        onChange={(e) => setFormData({
                          ...formData,
                          annee_creation: parseInt(e.target.value) || undefined
                        })} />
                      
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Catégories avec toggle */}
              <Card>
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => toggleSection('categories')}>
                  
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">{t("article_articleeditor.catgories")}

                      {formData.categories.length > 0 &&
                      <Badge variant="secondary">{formData.categories.length}</Badge>
                      }
                    </CardTitle>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                      expandedSections.categories ? 'rotate-180' : ''}`
                      } />
                    
                  </div>
                </CardHeader>
                {expandedSections.categories &&
                <CardContent>
                    <CategorySelection
                    typeOeuvreId={formData.type === 'article_scientifique' ? 5 : 4}
                    selectedCategories={formData.categories}
                    onCategoriesChange={(categories) =>
                    setFormData({ ...formData, categories })
                    } />
                  
                  </CardContent>
                }
              </Card>

              {/* Contributeurs et éditeurs */}
              <Card>
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => toggleSection('contributeurs')}>
                  
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">{t("article_articleeditor.contributeurs_diteurs")}

                      {contributeurs.length + nouveauxIntervenants.length + editeurs.length > 0 &&
                      <Badge variant="secondary">
                          {contributeurs.length + nouveauxIntervenants.length + editeurs.length}
                        </Badge>
                      }
                    </CardTitle>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                      expandedSections.contributeurs ? 'rotate-180' : ''}`
                      } />
                    
                  </div>
                </CardHeader>
                {expandedSections.contributeurs && metadata.types_users && metadata.editeurs &&
                <CardContent>
                    <IntervenantEditeurManager
                    typeOeuvreId={formData.type === 'article_scientifique' ? 5 : 4}
                    typesUsers={metadata.types_users}
                    editeurs={metadata.editeurs}
                    onIntervenantsChange={handleIntervenantsChange}
                    onEditeursChange={setEditeurs} />
                  
                  </CardContent>
                }
              </Card>

              {/* Tags */}
              <Card>
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => toggleSection('tags')}>
                  
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">{t("article_articleeditor.tags")}

                      {formData.tags.length > 0 &&
                      <Badge variant="secondary">{formData.tags.length}</Badge>
                      }
                    </CardTitle>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                      expandedSections.tags ? 'rotate-180' : ''}`
                      } />
                    
                  </div>
                </CardHeader>
                {expandedSections.tags &&
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.tags.map((tag) =>
                    <Badge key={tag} variant="secondary">
                          {tag}
                          <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive">
                        
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                    )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                      placeholder={t("article_articleeditor.placeholder_ajouter_tag")}
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag(newTag);
                        }
                      }} />
                    
                      <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAddTag(newTag)}
                      disabled={!newTag}>
                      
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                }
              </Card>

              {/* Champs spécifiques selon le type */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("article_articleeditor.informations_spcifiques")}
                    {formData.type === 'article_scientifique' ? 'Article Scientifique' : 'Article'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.type === 'article' ?
                  // Champs pour Article standard
                  <>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="auteur">{t("article_articleeditor.auteur")}</Label>
                          <Input
                          id="auteur"
                          value={formData.auteur || ''}
                          onChange={(e) => setFormData({ ...formData, auteur: e.target.value })}
                          placeholder={t("article_articleeditor.placeholder_nom_lauteur")} />
                        
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="source">{t("article_articleeditor.source")}</Label>
                          <Input
                          id="source"
                          value={formData.source || ''}
                          onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                          placeholder={t("article_articleeditor.placeholder_publication_source")} />
                        
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sous_titre">{t("article_articleeditor.soustitre")}</Label>
                        <Input
                        id="sous_titre"
                        value={formData.sous_titre || ''}
                        onChange={(e) => setFormData({ ...formData, sous_titre: e.target.value })}
                        placeholder={t("article_articleeditor.placeholder_soustitre_larticle")} />
                      
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="url_source">{t("article_articleeditor.url_source")}</Label>
                        <Input
                        id="url_source"
                        type="url"
                        value={formData.url_source || ''}
                        onChange={(e) => setFormData({ ...formData, url_source: e.target.value })}
                        placeholder="https://..." />
                      
                      </div>
                    </> :

                  // Champs pour Article Scientifique
                  <>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="journal">{t("article_articleeditor.journal")}</Label>
                          <Input
                          id="journal"
                          value={formData.journal || ''}
                          onChange={(e) => setFormData({ ...formData, journal: e.target.value })}
                          placeholder={t("article_articleeditor.placeholder_nom_journal")} />
                        
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="doi">{t("article_articleeditor.doi")}</Label>
                          <Input
                          id="doi"
                          value={formData.doi || ''}
                          onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
                          placeholder={t("article_articleeditor.placeholder_101234example")} />
                        
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="volume">{t("article_articleeditor.volume")}</Label>
                          <Input
                          id="volume"
                          value={formData.volume || ''}
                          onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                          placeholder={t("article_articleeditor.placeholder_ex_12")} />
                        
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="numero">{t("article_articleeditor.numro")}</Label>
                          <Input
                          id="numero"
                          value={formData.numero || ''}
                          onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                          placeholder={t("article_articleeditor.placeholder_ex_3")} />
                        
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pages">{t("article_articleeditor.pages")}</Label>
                          <Input
                          id="pages"
                          value={formData.pages || ''}
                          onChange={(e) => setFormData({ ...formData, pages: e.target.value })}
                          placeholder={t("article_articleeditor.placeholder_123145")} />
                        
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="issn">{t("article_articleeditor.issn")}</Label>
                          <Input
                          id="issn"
                          value={formData.issn || ''}
                          onChange={(e) => setFormData({ ...formData, issn: e.target.value })}
                          placeholder={t("article_articleeditor.placeholder_xxxxxxxx")} />
                        
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="impact_factor">{t("article_articleeditor.impact_factor")}</Label>
                          <Input
                          id="impact_factor"
                          type="number"
                          step="0.01"
                          value={formData.impact_factor || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            impact_factor: parseFloat(e.target.value) || undefined
                          })}
                          placeholder={t("article_articleeditor.placeholder_375")} />
                        
                        </div>
                        <div className="space-y-2 flex items-center">
                          <Checkbox
                          id="peer_reviewed"
                          checked={formData.peer_reviewed || false}
                          onCheckedChange={(checked) =>
                          setFormData({ ...formData, peer_reviewed: checked === true })
                          } />
                        
                          <Label htmlFor="peer_reviewed" className="ml-2">{t("article_articleeditor.article_valu_par")}

                        </Label>
                        </div>
                      </div>
                    </>
                  }
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet Aperçu */}
            <TabsContent value="preview">
              <Card>
                <CardContent className="p-8">
                  <article className="article-preview max-w-3xl mx-auto">
                    <h1>{formData.titre || 'Sans titre'}</h1>
                    {formData.sous_titre &&
                    <p className="lead text-xl text-gray-600 mb-4">
                        {formData.sous_titre}
                      </p>
                    }
                    <p className="lead text-lg text-gray-600 mb-6">
                      {formData.description}
                    </p>
                    
                    {blocks.map((block, index) => renderPreviewBlock(block, index))}
                  </article>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>);

};

export default ArticleEditor;