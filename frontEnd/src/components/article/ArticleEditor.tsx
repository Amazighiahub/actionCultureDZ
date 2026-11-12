/* eslint-disable @typescript-eslint/no-explicit-any */
import { AideRedaction, ChoixModele, estBlocVide } from './ModelesEtAide';
import { SaisieConserveeAvis } from '@/hooks/useSaisieConservee';
import { directionTexte } from '@/utils/directionTexte';
import { lireArticleImporte } from '@/utils/importArticle';
import { nettoyerBlocs } from '@/utils/nettoyageTexte';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Save, Eye, Loader2, FileText, AlertCircle, Wand2, Upload
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { ArticleEditorProps } from '@/types/models/articles.types';

import { PREVIEW_STYLES } from './articlePreview.styles';
import { BLOCK_TEMPLATES, BLOCK_ICONS, nomBloc, generateBlockUid } from './articleEditor.constants';
import InsertBlockBar from './InsertBlockBar';
import ArticleBlockEditor from './ArticleBlockEditor';
import ArticleMetadataTab from './ArticleMetadataTab';
import ArticlePreview from './ArticlePreview';
import { useArticleEditor } from './useArticleEditor';
import { useUnsavedChanges, confirmerSortie } from '@/hooks/useUnsavedChanges';
import { avancement, blocDansLaLangue } from '@/utils/traductionBlocs';
import ConseilReferencement from '@/components/pro/ConseilReferencement';
import { SUPPORTED_LANGUAGES, infoLangue, nomLangue } from '@/types/common/multilingual.types';

// Langues de l'article : liste et noms communs (audit V11 COD-6 ; avant « Tamazight (Latin) » ici seulement)
const LANG_OPTIONS = SUPPORTED_LANGUAGES.map(infoLangue);

const ArticleEditor: React.FC<ArticleEditorProps> = ({ articleId, initialData, onBack, onSave, titrePage, libelleEnregistrer }) => {
  const { t } = useTranslation();

  const editor = useArticleEditor({ articleId, initialData, onSave });

  // Nettoyage de la mise en page (gardé pour pouvoir annuler)

  const [nettoyage, setNettoyage] = useState<{ modifies: number; avant: typeof editor.blocks } | null>(null);

  // Importer un article préparé (fichier .json) : remplace le contenu de l'éditeur

  const [resultatImport, setResultatImport] = useState<{ blocs?: number; langues?: string; images?: number; erreur?: string } | null>(null);

  const importer = async (e: React.ChangeEvent<HTMLInputElement>) => {

    const fichier = e.target.files?.[0];

    e.target.value = '';

    if (!fichier) return;

    try {

      const article = lireArticleImporte(await fichier.text());

      if (editor.blocks.length > 0 && !window.confirm(t('article_articleeditor.importRemplacer', 'Le contenu actuel de l’article sera remplacé par celui du fichier. Continuer ?'))) return;

      editor.importerArticle(article);

      const langues = [...new Set([article.langue, ...Object.keys(article.titre)])].map(l => l.toUpperCase()).join(', ');

      setResultatImport({ blocs: article.blocks.length, langues, images: article.images });

    } catch (err) {

      setResultatImport({ erreur: err instanceof Error ? err.message : String(err) });

    }

  };

  const nettoyer = () => {

    const avant = editor.blocks;

    const { blocs, modifies } = nettoyerBlocs(avant);

    if (modifies > 0) editor.remplacerBlocs(blocs);

    setNettoyage({ modifies, avant });

  };
  // Un long article ne doit pas se perdre sur un clic « Retour », un lien ou la fermeture de l'onglet
  useUnsavedChanges(editor.modifie && !editor.saving);
  const retour = () => { if (onBack && (!editor.modifie || confirmerSortie())) onBack(); };
  // Autre langue que celle du texte d'origine : on traduit les blocs existants
  const enTraduction = editor.editLang !== editor.langueTexte;

  // Rien d'écrit dans la langue d'origine : choisir une langue, c'est choisir la langue de l'article
  // (avant : site en français, un clic sur « العربية » passait en mode traduction d'un article vide)
  const origine = editor.translations[editor.langueTexte];
  const origineVide = !origine?.titre?.trim() && !origine?.description?.trim() && editor.blocks.every(estBlocVide);
  const choisirLangue = (code: string) => {
    if (origineVide) editor.setLangueTexte(code);
    editor.setEditLang(code);
  };
  // Texte d'origine écrit en arabe alors que l'article est réglé sur une autre langue : on le signale
  const texteOrigine = [origine?.titre, origine?.description,
    ...editor.blocks.filter(b => ['text', 'heading', 'citation'].includes(b.type_block)).map(b => b.contenu)];
  const arabeMalRegle = !enTraduction && editor.langueTexte !== 'ar'
    && texteOrigine.some(x => String(x ?? '').trim()) && directionTexte(texteOrigine) === 'rtl';
  const passerEnArabe = () => {
    const ancienne = editor.langueTexte;
    editor.setTranslations(prev => {
      const src = prev[ancienne] || { titre: '', description: '' };
      const ar = prev.ar || { titre: '', description: '' };
      return { ...prev, ar: { titre: ar.titre || src.titre, description: ar.description || src.description }, [ancienne]: { titre: '', description: '' } };
    });
    editor.setLangueTexte('ar');
    editor.setEditLang('ar');
  };

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
    <div className="min-h-screen bg-background pb-24 sm:pb-0">
      <style dangerouslySetInnerHTML={{ __html: PREVIEW_STYLES }} />

      <div className="container py-8">
        <div className="max-w-5xl mx-auto">
          {/* Texte gardé pendant une session expirée : avis durable (le bandeau disparaît en 5 s) */}
          <div className="mb-4 empty:hidden"><SaisieConserveeAvis visible={!!editor.saisieRestauree} /></div>
          {/* Header */}
          {/* Passe à la ligne sur téléphone : « Sauvegarder » sortait de l'écran */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              {onBack && (
                <Button variant="outline" size="sm" onClick={retour}>
                  <ArrowLeft className="h-4 w-4 me-2 rtl:-scale-x-100" />{t("article_articleeditor.retour")}
                </Button>
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">
                  {titrePage || (articleId
                    ? t('article_articleeditor.modifierArticle', 'Modifier l\'article')
                    : t('article_articleeditor.creerArticle', 'Créer un article'))}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {editor.formData.type === 'article_scientifique'
                    ? t('article_articleeditor.articleScientifique', 'Article scientifique')
                    : t('article_articleeditor.article', 'Article')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => document.getElementById('import-article')?.click()}
                title={t('article_articleeditor.importerAide', 'Remplir l’article depuis un fichier préparé (.json), dans toutes ses langues')}>
                <Upload className="h-4 w-4 me-2" aria-hidden="true" />
                {t('article_articleeditor.importer', 'Importer un article')}
              </Button>
              <input id="import-article" type="file" accept=".json,application/json" className="hidden" onChange={importer} />
              <Button variant="outline" onClick={nettoyer} title={t('article_articleeditor.nettoyerAide', 'Doubles espaces, espaces autour de la ponctuation, lignes vides en trop')}>
                <Wand2 className="h-4 w-4 me-2" aria-hidden="true" />
                {t('article_articleeditor.nettoyer', 'Nettoyer la mise en page')}
              </Button>
              <Button variant="outline" onClick={() => editor.setActiveTab(editor.activeTab === 'preview' ? 'content' : 'preview')}>
                <Eye className="h-4 w-4 me-2" />
                {editor.activeTab === 'preview'
                  ? t('article_articleeditor.editer', 'Éditer')
                  : t('article_articleeditor.apercu', 'Aperçu')}
              </Button>
              <Button onClick={editor.handleSave} disabled={editor.saving}>
                {editor.saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                <Save className="h-4 w-4 me-2" />{libelleEnregistrer || t("article_articleeditor.sauvegarder")}
              </Button>
            </div>
          </div>

          {/* Téléphone : « Enregistrer » toujours visible en bas de l'écran (en haut, il sortait de l'écran) */}
          <div className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur">
            <Button className="w-full" onClick={editor.handleSave} disabled={editor.saving}>
              {editor.saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              <Save className="h-4 w-4 me-2" />{libelleEnregistrer || t("article_articleeditor.sauvegarder")}
            </Button>
          </div>

          {resultatImport && (
            <Alert className="mb-6" role="status" variant={resultatImport.erreur ? 'destructive' : 'default'}>
              <Upload className="h-4 w-4" />
              <AlertDescription>
                {resultatImport.erreur
                  ? resultatImport.erreur
                  : t('article_articleeditor.importOk', 'Article importé : {{blocs}} blocs, dans {{langues}}. Ajoutez maintenant les photos dans les {{images}} case(s) d’image, choisissez la catégorie (onglet Métadonnées), vérifiez l’Aperçu, puis enregistrez.', resultatImport)}
              </AlertDescription>
            </Alert>
          )}

          {nettoyage && (
            <Alert className="mb-6" role="status">
              <Wand2 className="h-4 w-4" />
              <AlertDescription className="flex flex-wrap items-center gap-3">
                {nettoyage.modifies > 0
                  ? t('article_articleeditor.nettoyeOk', '{{n}} paragraphe(s) corrigé(s). Vérifiez dans l’Aperçu, puis enregistrez.', { n: nettoyage.modifies })
                  : t('article_articleeditor.nettoyeRien', 'Rien à corriger : la mise en page est propre.')}
                {nettoyage.modifies > 0 && (
                  <Button type="button" size="sm" variant="outline" onClick={() => { editor.remplacerBlocs(nettoyage.avant); setNettoyage(null); }}>
                    {t('article_articleeditor.annulerNettoyage', 'Annuler')}
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {editor.error && (
            <Alert variant="destructive" className="mb-6" role="alert" aria-live="assertive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{editor.error}</AlertDescription>
            </Alert>
          )}

          <AideRedaction />

          <Tabs value={editor.activeTab} onValueChange={editor.setActiveTab}>
            <TabsList className="mb-6 h-auto flex-wrap">
              <TabsTrigger value="content">{t("article_articleeditor.contenu")}</TabsTrigger>
              <TabsTrigger value="metadata">{t("article_articleeditor.mtadonnes")}</TabsTrigger>
              <TabsTrigger value="preview">{t("article_articleeditor.aperu")}</TabsTrigger>
            </TabsList>

            {/* Tab: Content */}
            <TabsContent value="content" className="space-y-6">
              <ConseilReferencement type="article" />
              <Card>
                <CardHeader>
                  <CardTitle>{t("article_articleeditor.informations_principales")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Language selector */}
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Label className="text-sm text-muted-foreground">{t("article_articleeditor.langue", "Langue")} :</Label>
                    <div className="flex flex-wrap gap-1">
                      {LANG_OPTIONS.map((lang) => (
                        <Button
                          key={lang.code}
                          type="button"
                          size="sm"
                          variant={editor.editLang === lang.code ? 'default' : 'outline'}
                          onClick={() => choisirLangue(lang.code)}
                          className="text-xs px-2 py-1 h-7">
                          {lang.label}
                          {lang.code === editor.langueTexte
                            ? ` · ${t('article_articleeditor.traduction.origineCourt', 'origine')}`
                            : (() => {
                              const a = avancement(editor.blocks, lang.code);
                              if (a.total && a.faits) return ` ${a.faits}/${a.total}`;
                              return editor.translations[lang.code]?.titre ? ' ✓' : '';
                            })()}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Label htmlFor="langue-texte" className="text-muted-foreground">
                      {t('article_articleeditor.traduction.ecritEn', 'Le texte de l’article est écrit en')}
                    </Label>
                    <select
                      id="langue-texte"
                      value={editor.langueTexte}
                      onChange={(e) => { editor.setLangueTexte(e.target.value); editor.setEditLang(e.target.value); }}
                      className="h-8 rounded-md border bg-background px-2 text-sm">
                      {LANG_OPTIONS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                    </select>
                  </div>

                  {arabeMalRegle && (
                    <Alert role="status">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="flex flex-wrap items-center gap-3">
                        {t('article_articleeditor.traduction.arabeMalRegle', {
                          origine: nomLangue(editor.langueTexte),
                          defaultValue: 'Votre texte est écrit en arabe, mais l’article est réglé comme écrit en {{origine}}.'
                        })}
                        <Button type="button" size="sm" onClick={passerEnArabe}>
                          {t('article_articleeditor.traduction.passerArabe', 'Oui, l’article est écrit en arabe')}
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}

                  {enTraduction && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {t('article_articleeditor.traduction.aide', {
                          langue: nomLangue(editor.editLang), origine: nomLangue(editor.langueTexte),
                          defaultValue: 'Vous traduisez l’article en {{langue}}. Traduisez le titre, le chapeau puis chaque bloc : le texte d’origine ({{origine}}) est affiché au-dessus. Les images et la mise en page sont communes à toutes les langues. Pour ajouter, déplacer ou supprimer un bloc, revenez à {{origine}}.'
                        })}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="titre">{t("article_articleeditor.titre_3")} ({editor.editLang.toUpperCase()})</Label>
                    <Input
                      id="titre"
                      dir={editor.editLang === 'ar' ? 'rtl' : 'ltr'}
                      value={editor.translations[editor.editLang]?.titre || ''}
                      aria-invalid={!!editor.fieldErrors.titre}
                      aria-describedby={editor.fieldErrors.titre ? 'titre-error' : undefined}
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
                    {editor.fieldErrors.titre && (
                      <p id="titre-error" role="alert" className="text-sm text-destructive">{editor.fieldErrors.titre}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">{t("article_articleeditor.description_chapeau")} ({editor.editLang.toUpperCase()})</Label>
                    <Textarea
                      id="description"
                      dir={editor.editLang === 'ar' ? 'rtl' : 'ltr'}
                      value={editor.translations[editor.editLang]?.description || ''}
                      aria-invalid={!!editor.fieldErrors.description}
                      aria-describedby={editor.fieldErrors.description ? 'description-error' : undefined}
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
                    {editor.fieldErrors.description && (
                      <p id="description-error" role="alert" className="text-sm text-destructive">{editor.fieldErrors.description}</p>
                    )}
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
                    <>
                      {!enTraduction && (
                        <ChoixModele onChoisir={(blocs) => editor.remplacerBlocs(blocs.map(b => ({ ...b, _uid: generateBlockUid() } as typeof b)))} />
                      )}
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>{t("article_articleeditor.aucun_contenu_pour")}</p>
                        <p className="text-sm">{t("article_articleeditor.ajoutez_des_blocs")}</p>
                      </div>
                    </>
                  )}

                  <div className="space-y-1">
                    {editor.blocks.length > 0 && !enTraduction && <InsertBlockBar insertAt={0} onInsert={editor.addBlock} />}
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
                          canMoveDown={index < editor.blocks.length - 1}
                          langueTraduction={enTraduction ? editor.editLang : undefined} />
                        {!enTraduction && <InsertBlockBar insertAt={index + 1} onInsert={editor.addBlock} />}
                      </React.Fragment>
                    ))}
                  </div>

                  {!enTraduction && <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-3">{t("article_articleeditor.ajouter_bloc")}</p>
                    <div className="flex flex-wrap gap-2">
                      {BLOCK_TEMPLATES.map((template) => {
                        const Icon = BLOCK_ICONS[template.icon];
                        return (
                          <Button key={template.id} variant="outline" size="sm" onClick={() => editor.addBlock(template.type_block)}>
                            {Icon && <Icon className="h-4 w-4 me-2" />}
                            {nomBloc(t, template)}
                          </Button>
                        );
                      })}
                    </div>
                  </div>}
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
                formData={enTraduction
                  ? { ...editor.formData, titre: editor.translations[editor.editLang]?.titre || editor.formData.titre }
                  : editor.formData}
                blocks={enTraduction ? editor.blocks.map(b => blocDansLaLangue(b, editor.editLang)) : editor.blocks}
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
