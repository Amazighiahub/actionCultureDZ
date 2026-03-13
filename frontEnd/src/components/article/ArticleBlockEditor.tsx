/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Trash2, MoveUp, MoveDown, Copy, Film, Upload, X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { getAssetUrl } from '@/helpers/assetUrl';

import type {
  ArticleBlock,
  ArticleBlockEditorProps,
  MediaInfo,
} from '@/types/models/articles.types';

import { isListBlock, isTableBlock } from '@/types/models/articles.types';

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
    const maxSize = 10 * 1024 * 1024;
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
        metadata: {
          ...block.metadata,
          tempFile: file
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const handleVideoUrl = (url: string) => {
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
            className="min-h-[100px]" />
        );

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
          </div>
        );

      case 'image':
        return (
          <div className="space-y-3">
            {block.media?.url ? (
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
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => document.getElementById(`image-upload-${index}`)?.click()}>
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-2">{t("article_articleeditor.cliquez_pour_uploader")}</p>
                <p className="text-xs text-muted-foreground">{t("article_articleeditor.jpg_png_gif")}</p>
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
            )}
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
          </div>
        );

      case 'video':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t("article_articleeditor.url_vido")}</Label>
              <Input
                value={block.contenu || ''}
                onChange={(e) => handleVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..." />
              <p className="text-xs text-muted-foreground">{t("article_articleeditor.supporte_youtube_vimeo")}</p>
            </div>
            {block.contenu && (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <Film className="h-12 w-12 text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">{t("article_articleeditor.aperu_vido")}</span>
              </div>
            )}
          </div>
        );

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
          </div>
        );

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
          </div>
        );

      case 'table':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("article_articleeditor.diteur_tableau_fonctionnalit")}</p>
            {isTableBlock(block) ? (
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
              </div>
            ) : (
              <Button onClick={() => handleTableUpdate(['Col 1', 'Col 2'], [['', '']])}>
                {t("article_articleeditor.crer_tableau")}
              </Button>
            )}
          </div>
        );

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
          </div>
        );

      case 'separator':
        return (
          <div className="py-4">
            <hr className="border-t-2" />
          </div>
        );

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
            <p className="text-xs text-muted-foreground">{t("article_articleeditor.collez_code_dintgration")}</p>
          </div>
        );

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
            <Button size="icon" variant="ghost" onClick={onMoveUp} disabled={!canMoveUp} title={t("article_articleeditor.title_monter")}>
              <MoveUp className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onMoveDown} disabled={!canMoveDown} title={t("article_articleeditor.title_descendre")}>
              <MoveDown className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onDuplicate} title={t("article_articleeditor.title_dupliquer")}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete(index)} title={t("article_articleeditor.title_supprimer")} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {renderBlockContent()}
      </CardContent>
    </Card>
  );
};

export default ArticleBlockEditor;
