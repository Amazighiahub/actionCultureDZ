/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Save, Eye, Loader2, FileText, AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { ArticleEditorProps } from '@/types/models/articles.types';

import { PREVIEW_STYLES } from './articlePreview.styles';
import { BLOCK_TEMPLATES, BLOCK_ICONS } from './articleEditor.constants';
import InsertBlockBar from './InsertBlockBar';
import ArticleBlockEditor from './ArticleBlockEditor';
import ArticleMetadataTab from './ArticleMetadataTab';
import ArticlePreview from './ArticlePreview';
import { useArticleEditor } from './useArticleEditor';

const LANG_OPTIONS = [
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
  { code: 'tz-ltn', label: 'Tamazight (Latin)' },
  { code: 'tz-tfng', label: 'ⵜⴰⵎⴰⵣⵉⵖⵜ' },
];

const ArticleEditor: React.FC<ArticleEditorProps> = ({ articleId, initialData, onBack, onSave }) => {
  const { t } = useTranslation();

  const editor = useArticleEditor({ articleId, initialData, onSave });

  if (editor.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">{t("article_articleeditor.chargement")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <style dangerouslySetInnerHTML={{ __html: PREVIEW_STYLES }} />

      <div className="container py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              {onBack && (
                <Button variant="outline" size="sm" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />{t("article_articleeditor.retour")}
                </Button>
              )}
              <div>
                <h1 className="text-3xl font-bold">
                  {articleId ? 'Modifier l\'article' : 'Créer un article'}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {editor.formData.type === 'article_scientifique' ? 'Article scientifique' : 'Article'}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => editor.setActiveTab(editor.activeTab === 'preview' ? 'content' : 'preview')}>
                <Eye className="h-4 w-4 mr-2" />
                {editor.activeTab === 'preview' ? 'Éditer' : 'Aperçu'}
              </Button>
              <Button onClick={editor.handleSave} disabled={editor.saving}>
                {editor.saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />{t("article_articleeditor.sauvegarder")}
              </Button>
            </div>
          </div>

          {editor.error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{editor.error}</AlertDescription>
            </Alert>
          )}

          <Tabs value={editor.activeTab} onValueChange={editor.setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="content">{t("article_articleeditor.contenu")}</TabsTrigger>
              <TabsTrigger value="metadata">{t("article_articleeditor.mtadonnes")}</TabsTrigger>
              <TabsTrigger value="preview">{t("article_articleeditor.aperu")}</TabsTrigger>
            </TabsList>

            {/* Tab: Content */}
            <TabsContent value="content" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("article_articleeditor.informations_principales")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Language selector */}
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Label className="text-sm text-muted-foreground">{t("article_articleeditor.langue", "Langue")} :</Label>
                    <div className="flex gap-1">
                      {LANG_OPTIONS.map((lang) => (
                        <Button
                          key={lang.code}
                          type="button"
                          size="sm"
                          variant={editor.editLang === lang.code ? 'default' : 'outline'}
                          onClick={() => editor.setEditLang(lang.code)}
                          className="text-xs px-2 py-1 h-7">
                          {lang.label}
                          {editor.translations[lang.code]?.titre ? ' ✓' : ''}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="titre">{t("article_articleeditor.titre_3")} ({editor.editLang.toUpperCase()})</Label>
                    <Input
                      id="titre"
                      dir={editor.editLang === 'ar' ? 'rtl' : 'ltr'}
                      value={editor.translations[editor.editLang]?.titre || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        editor.setTranslations(prev => ({
                          ...prev,
                          [editor.editLang]: { ...prev[editor.editLang], titre: val }
                        }));
                        if (editor.editLang === 'fr' || !editor.translations.fr?.titre) {
                          editor.setFormData(prev => ({ ...prev, titre: val }));
                        }
                      }}
                      placeholder={t("article_articleeditor.placeholder_titre_larticle")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">{t("article_articleeditor.description_chapeau")} ({editor.editLang.toUpperCase()})</Label>
                    <Textarea
                      id="description"
                      dir={editor.editLang === 'ar' ? 'rtl' : 'ltr'}
                      value={editor.translations[editor.editLang]?.description || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        editor.setTranslations(prev => ({
                          ...prev,
                          [editor.editLang]: { ...prev[editor.editLang], description: val }
                        }));
                        if (editor.editLang === 'fr' || !editor.translations.fr?.description) {
                          editor.setFormData(prev => ({ ...prev, description: val }));
                        }
                      }}
                      placeholder={t("article_articleeditor.placeholder_rsum_introduction_larticle")}
                      className="min-h-[100px]" />
                  </div>
                </CardContent>
              </Card>

              {/* Blocks */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("article_articleeditor.contenu_larticle")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editor.blocks.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{t("article_articleeditor.aucun_contenu_pour")}</p>
                      <p className="text-sm">{t("article_articleeditor.ajoutez_des_blocs")}</p>
                    </div>
                  )}

                  <div className="space-y-1">
                    {editor.blocks.length > 0 && <InsertBlockBar insertAt={0} onInsert={editor.addBlock} />}
                    {editor.blocks.map((block, index) => (
                      <React.Fragment key={(block as any)._uid || `block-${block.id_block || index}-${editor.blocks.length}`}>
                        <ArticleBlockEditor
                          block={block}
                          index={index}
                          onUpdate={editor.updateBlock}
                          onDelete={editor.deleteBlock}
                          onMoveUp={() => editor.moveBlock(index, 'up')}
                          onMoveDown={() => editor.moveBlock(index, 'down')}
                          onDuplicate={() => editor.duplicateBlock(index)}
                          canMoveUp={index > 0}
                          canMoveDown={index < editor.blocks.length - 1} />
                        <InsertBlockBar insertAt={index + 1} onInsert={editor.addBlock} />
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-3">{t("article_articleeditor.ajouter_bloc")}</p>
                    <div className="flex flex-wrap gap-2">
                      {BLOCK_TEMPLATES.map((template) => {
                        const Icon = BLOCK_ICONS[template.icon];
                        return (
                          <Button key={template.id} variant="outline" size="sm" onClick={() => editor.addBlock(template.type_block)}>
                            {Icon && <Icon className="h-4 w-4 mr-2" />}
                            {template.name}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Metadata */}
            <TabsContent value="metadata">
              <ArticleMetadataTab
                formData={editor.formData}
                setFormData={editor.setFormData}
                metadata={editor.metadata}
                expandedSections={editor.expandedSections}
                toggleSection={editor.toggleSection}
                contributeurs={editor.contributeurs}
                nouveauxIntervenants={editor.nouveauxIntervenants}
                editeurs={editor.editeurs}
                setEditeurs={editor.setEditeurs}
                handleIntervenantsChange={editor.handleIntervenantsChange}
                newTag={editor.newTag}
                setNewTag={editor.setNewTag}
                handleAddTag={editor.handleAddTag}
                handleRemoveTag={editor.handleRemoveTag} />
            </TabsContent>

            {/* Tab: Preview */}
            <TabsContent value="preview">
              <ArticlePreview
                formData={editor.formData}
                blocks={editor.blocks}
                contributeurs={editor.contributeurs}
                intervenantsExistants={editor.intervenantsExistants}
                nouveauxIntervenants={editor.nouveauxIntervenants} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ArticleEditor;
