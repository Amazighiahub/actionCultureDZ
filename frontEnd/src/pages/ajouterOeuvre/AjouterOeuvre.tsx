import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RequiredLabel } from '@/components/ui/required-label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload, Save, ArrowLeft, X, Plus, AlertCircle,
  Book, Film, Music, FileText, Beaker, Palette, Hammer, Loader2, Star,
} from 'lucide-react';
import MultiLangInput from '@/components/MultiLangInput';
import ArticleEditor from '@/components/article/ArticleEditor';
import IntervenantEditeurManager from '@/components/oeuvre/IntervenantEditeurManager';
import type { TypeOeuvre, TagMotCle } from '@/types/models/references.types';
import { useAjouterOeuvre } from './useAjouterOeuvre';
import CategorySelection from './CategorySelection';
import EditorModeSelector from './EditorModeSelector';
import OeuvreSpecificFields from './OeuvreSpecificFields';
import { oeuvreService } from '@/services/oeuvre.service';
import { getLocalizedText } from '@/utils/getLocalizedText';

/* eslint-disable @typescript-eslint/no-explicit-any */

const getTypeIcon = (typeId: number): React.ReactNode => {
  const icons: Record<number, React.ReactNode> = {
    1: <Book className="h-5 w-5" />,
    2: <Film className="h-5 w-5" />,
    3: <Music className="h-5 w-5" />,
    4: <FileText className="h-5 w-5" />,
    5: <Beaker className="h-5 w-5" />,
    6: <Palette className="h-5 w-5" />,
    7: <Hammer className="h-5 w-5" />,
    8: <Palette className="h-5 w-5" />
  };
  return icons[typeId] ?? <FileText className="h-5 w-5" />;
};

const AjouterOeuvre: React.FC = () => {
  const hook = useAjouterOeuvre();
  const {
    t, direction, navigate,
    loading, loadingMetadata,
    submitError, setSubmitError, fieldErrors,
    uploadProgress,
    isAuthenticated, user,
    formData, metadata, setLoadingMetadata,
    searchOeuvreResults, setSearchOeuvreResults,
    medias, isDragging,
    suggestedTags, newTag, setNewTag, showTagSuggestions, setShowTagSuggestions,
    useArticleEditor, setUseArticleEditor, showEditorChoice,
    handleInputChange,
    handleTagAdd, handleTagRemove,
    handleMediaUpload, handleDragOver, handleDragLeave, handleDrop,
    handleMediaRemove, handleSetPrincipalMedia,
    handleIntervenantsChange, handleEditeursChange,
    handleArticleEditorSave,
    handleSubmit,
    loadMetadata,
    getTagName,
  } = hook;

  // ============================================================================
  // RENDU CONDITIONNEL SELON L'ÉTAT
  // ============================================================================
  if (loadingMetadata) {
    return (
      <div className="min-h-screen bg-background pattern-geometric flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">{t("ajouteroeuvre.chargement_des_donnes")}</p>
        </div>
      </div>);
  }

  if (!loadingMetadata && (!metadata.types_oeuvres || metadata.types_oeuvres.length === 0)) {
    return (
      <div className="min-h-screen bg-background pattern-geometric">
        <div className="container py-12">
          <div className="max-w-4xl mx-auto">
            <Alert variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {submitError || t('oeuvre.errors.loadMetadataFailed', 'Impossible de charger les données nécessaires au formulaire.')}
                <Button type="button" variant="link" className="ms-2 px-0"
                  onClick={() => { setLoadingMetadata(true); setSubmitError(null); loadMetadata(); }}>
                  {t("ajouteroeuvre.ressayer")}
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>);
  }

  // ============================================================================
  // RENDU PRINCIPAL
  // ============================================================================
  return (
    <div dir={direction} className="min-h-screen bg-background pattern-geometric">
      <div className="container py-12">
        <div className="max-w-4xl mx-auto">
          {/* Si l'éditeur d'article est activé ET qu'un type article est sélectionné */}
          {useArticleEditor && formData.id_type_oeuvre > 0 && showEditorChoice ?
          <ArticleEditor
            initialData={{
              titre: formData.titre.fr || '',
              description: formData.description.fr || '',
              id_langue: formData.id_langue,
              categories: formData.categories,
              tags: formData.tags,
              type: formData.id_type_oeuvre === 4 ? 'article' : 'article_scientifique',
              auteur: formData.auteur,
              source: formData.source,
              resume: formData.resume_article,
              url_source: formData.url_source,
              journal: formData.journal,
              doi: formData.doi,
              pages: formData.pages,
              volume: formData.volume,
              numero: formData.numero,
              peer_reviewed: formData.peer_reviewed
            }}
            onBack={() => setUseArticleEditor(false)}
            onSave={handleArticleEditorSave} /> :

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(false); }}>
              {/* En-tête */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <Button type="button" variant="outline" size="sm" className="hover-lift"
                    onClick={() => window.history.back()}>
                    <ArrowLeft className="h-4 w-4 me-2" />{t("ajouteroeuvre.retour")}
                  </Button>
                  <div>
                    <h1 className="text-4xl font-bold tracking-tight font-serif text-gradient">{t("ajouteroeuvre.ajouter_une_uvre")}</h1>
                    <p className="text-lg text-muted-foreground mt-2">{t("ajouteroeuvre.partagez_votre_cration")}</p>
                  </div>
                </div>
                {isAuthenticated && user &&
                <div className="text-end text-sm text-muted-foreground">
                    <p>{t("ajouteroeuvre.connect_tant_que")}</p>
                    <p className="font-medium text-foreground">
                      {user.prenom || ''} {user.nom || user.email || 'Utilisateur'}
                    </p>
                  </div>
                }
              </div>

              {!isAuthenticated &&
              <Alert className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{t("ajouteroeuvre.vous_devez_tre")}
                    <Button type="button" variant="link" className="px-1" onClick={() => navigate('/auth')}>{t("ajouteroeuvre.connecter")}</Button>
                  </AlertDescription>
                </Alert>
              }

              {submitError &&
              <Alert variant="destructive" className="mb-6" role="alert" aria-live="assertive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              }

              <p className="text-sm text-muted-foreground mb-2">{t('common.requiredFieldsLegend')}</p>
              <div className="space-y-8">
                {/* Type d'œuvre */}
                <Card className="shadow-cultural">
                  <CardHeader>
                    <CardTitle className="text-2xl font-serif">{t("ajouteroeuvre.type_duvre")}<span className="text-destructive ml-1">*</span></CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t("ajouteroeuvre.type_hint", "Sélectionnez le type qui correspond le mieux à votre œuvre. Pour les articles et articles scientifiques, l'éditeur avancé permet une mise en page riche avec blocs (titres, images, citations, tableaux).")}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div id="id_type_oeuvre" role="group" aria-label={t("ajouteroeuvre.type_duvre")} className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-4" tabIndex={-1}>
                      {metadata.types_oeuvres?.map((type: TypeOeuvre) =>
                      <Button type="button"
                        key={type.id_type_oeuvre}
                        variant={formData.id_type_oeuvre === type.id_type_oeuvre ? "default" : "outline"}
                        className={`h-auto py-4 flex flex-col items-center space-y-2 hover-lift ${
                        formData.id_type_oeuvre === type.id_type_oeuvre ?
                        'bg-primary text-primary-foreground' :
                        'hover:bg-secondary hover:text-secondary-foreground'}`}
                        onClick={() => {
                          handleInputChange('id_type_oeuvre', type.id_type_oeuvre);
                          if ([6, 7].includes(type.id_type_oeuvre)) { // Œuvre d'Art, Artisanat
                            handleInputChange('je_suis_auteur', true);
                          }
                        }}>
                          {getTypeIcon(type.id_type_oeuvre)}
                          <span className="font-medium">{getLocalizedText(type.nom_type)}</span>
                        </Button>
                      )}
                    </div>
                    {fieldErrors.id_type_oeuvre && <p id="id_type_oeuvre-error" role="alert" className="mt-2 text-sm text-destructive">{fieldErrors.id_type_oeuvre}</p>}
                  </CardContent>
                </Card>

                {formData.id_type_oeuvre > 0 && showEditorChoice &&
                <EditorModeSelector metadata={metadata} formData={formData} showEditorChoice={showEditorChoice} useArticleEditor={useArticleEditor} setUseArticleEditor={setUseArticleEditor} />
                }

                {formData.id_type_oeuvre > 0 && !useArticleEditor &&
                <>
                    {/* Informations générales */}
                    <Card className="shadow-cultural">
                      <CardHeader>
                        <CardTitle className="text-2xl font-serif">{t("ajouteroeuvre.informations_gnrales")}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-6">
                          <div>
                            <MultiLangInput name="titre" label={t("ajouteroeuvre.titre_luvre")} value={formData.titre}
                              onChange={(value: any) => handleInputChange('titre', value)} required requiredLanguages={['fr']}
                              placeholder={t("ajouteroeuvre.placeholder_lart_calligraphie_maghrebine")}
                              maxLength={500} showCharCount
                              errors={fieldErrors.titre ? { fr: fieldErrors.titre, ar: fieldErrors.titre } : {}} />
                          </div>
                          <div>
                            <MultiLangInput name="description" label={t("ajouteroeuvre.description_label", "Résumé de l'œuvre")} value={formData.description}
                              onChange={(value: any) => handleInputChange('description', value)} type="textarea" rows={4} required requiredLanguages={['fr']}
                              placeholder={t("ajouteroeuvre.placeholder_dcrivez_votre_uvre")}
                              maxLength={5000} showCharCount
                              errors={fieldErrors.description ? { fr: fieldErrors.description, ar: fieldErrors.description } : {}} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="annee_creation" className="text-base">{t("ajouteroeuvre.anne_cration")} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                            <Input id="annee_creation" type="number" min="1800" max={new Date().getFullYear() + 1}
                              placeholder={new Date().getFullYear().toString()} value={formData.annee_creation || ''}
                              aria-invalid={!!fieldErrors.annee_creation || undefined}
                              aria-describedby={fieldErrors.annee_creation ? 'annee_creation-error' : undefined}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') { handleInputChange('annee_creation', undefined); return; }
                                const num = parseInt(val);
                                if (!isNaN(num) && num >= 0) handleInputChange('annee_creation', num);
                              }} className="hover:border-primary focus:border-primary" />
                            {fieldErrors.annee_creation && <p id="annee_creation-error" role="alert" className="text-sm text-destructive">{fieldErrors.annee_creation}</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="prix" className="text-base">{t("ajouteroeuvre.prix")} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                            <Input id="prix" type="number" min="0" step="0.01" placeholder={t("ajouteroeuvre.placeholder_1200")}
                              value={formData.prix || ''} aria-invalid={!!fieldErrors.prix || undefined}
                              aria-describedby={fieldErrors.prix ? 'prix-error' : undefined}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') { handleInputChange('prix', undefined); return; }
                                const num = parseFloat(val);
                                if (!isNaN(num) && num >= 0) handleInputChange('prix', num);
                              }} className="hover:border-primary focus:border-primary" />
                            {fieldErrors.prix && <p id="prix-error" role="alert" className="text-sm text-destructive">{fieldErrors.prix}</p>}
                          </div>
                        </div>
                        <div className="space-y-2 mt-4">
                          <RequiredLabel htmlFor="id_langue" required className="text-base">{t("ajouteroeuvre.langueOriginale", "Langue originale de l'œuvre")}</RequiredLabel>
                          <select id="id_langue" value={formData.id_langue > 0 ? formData.id_langue : ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              handleInputChange('id_langue', isNaN(val) ? 0 : val);
                            }}
                            className={`w-full p-3 border rounded-lg hover:border-primary focus:border-primary ${fieldErrors.id_langue ? 'border-destructive' : ''}`}>
                            <option value="">{t("ajouteroeuvre.choisirLangue", "-- Choisir la langue --")}</option>
                            {metadata.langues?.map((langue: any) => (
                              <option key={langue.id_langue} value={langue.id_langue}>
                                {typeof langue.nom === 'object' ? langue.nom.fr || langue.nom.ar || Object.values(langue.nom)[0] : langue.nom}
                              </option>
                            ))}
                          </select>
                          {fieldErrors.id_langue && <p id="id_langue-error" role="alert" className="text-sm text-destructive">{fieldErrors.id_langue}</p>}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Traduction */}
                    <Card className="shadow-cultural">
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id="is_traduction" checked={formData.is_traduction || false}
                            onChange={(e) => {
                              handleInputChange('is_traduction', e.target.checked);
                              if (!e.target.checked) {
                                handleInputChange('id_oeuvre_originale', undefined);
                                handleInputChange('oeuvre_originale_titre', undefined);
                              }
                            }} className="h-4 w-4 rounded border-gray-300" />
                          <Label htmlFor="is_traduction" className="text-base cursor-pointer">
                            {t('ajouteroeuvre.isTraduction', 'Cette œuvre est une traduction')}
                          </Label>
                        </div>
                        {formData.is_traduction && (
                          <div className="space-y-2 pl-7">
                            <Label>{t('ajouteroeuvre.oeuvreOriginale', 'Œuvre originale')}</Label>
                            <Input placeholder={t('ajouteroeuvre.rechercherOeuvre', 'Rechercher l\'œuvre originale par titre...')}
                              value={formData.oeuvre_originale_titre || ''}
                              onChange={async (e) => {
                                handleInputChange('oeuvre_originale_titre', e.target.value);
                                if (e.target.value.length >= 3) {
                                  try {
                                    const res = await oeuvreService.searchOeuvres({ q: e.target.value, limit: 5 });
                                    if (res.success && res.data) {
                                      const items = Array.isArray(res.data) ? res.data : (res.data as any).oeuvres || [];
                                      setSearchOeuvreResults(items);
                                    }
                                  } catch { /* ignore */ }
                                }
                              }} />
                            {searchOeuvreResults.length > 0 && !formData.id_oeuvre_originale && (
                              <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                                {searchOeuvreResults.map((o: any) => (
                                  <button key={o.id_oeuvre} type="button" className="w-full text-left p-2 hover:bg-muted text-sm"
                                    onClick={() => {
                                      handleInputChange('id_oeuvre_originale', o.id_oeuvre);
                                      const titre = typeof o.titre === 'object' ? o.titre.fr || Object.values(o.titre)[0] : o.titre;
                                      handleInputChange('oeuvre_originale_titre', titre);
                                      setSearchOeuvreResults([]);
                                    }}>
                                    {typeof o.titre === 'object' ? o.titre.fr || Object.values(o.titre)[0] : o.titre}
                                    {o.Langue && <span className="text-muted-foreground ml-2">({getLocalizedText(o.Langue.nom)})</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                            {formData.id_oeuvre_originale && (
                              <p className="text-sm text-green-600">✓ {t('ajouteroeuvre.oeuvreSelectionnee', 'Œuvre originale sélectionnée')}</p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Champs spécifiques */}
                    <Card className="shadow-cultural">
                      <CardHeader>
                        <CardTitle className="text-2xl font-serif">{t("ajouteroeuvre.informations_spcifiques")}
                          {getLocalizedText(metadata.types_oeuvres?.find((type: TypeOeuvre) => type.id_type_oeuvre === formData.id_type_oeuvre)?.nom_type)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <OeuvreSpecificFields metadata={metadata} formData={formData} fieldErrors={fieldErrors} handleInputChange={handleInputChange} />
                      </CardContent>
                    </Card>

                    {/* Catégories */}
                    <CategorySelection typeOeuvreId={formData.id_type_oeuvre} selectedCategories={formData.categories}
                      onCategoriesChange={(categories) => handleInputChange('categories', categories)} />
                    {fieldErrors.categories && <p id="categories-error" role="alert" className="text-sm text-destructive mt-2">{fieldErrors.categories}</p>}

                    {/* Qui est l'auteur ? */}
                    <Card className="shadow-cultural">
                      <CardHeader>
                        <CardTitle className="text-2xl font-serif">{t('ajouteroeuvre.quiEstAuteur', 'Qui est l\'auteur ?')}<span className="text-destructive ml-1">*</span></CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div role="button" tabIndex={0}
                            className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${formData.je_suis_auteur === true ? 'border-primary bg-primary/5' : ''}`}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleInputChange('je_suis_auteur', true); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleInputChange('je_suis_auteur', true); } }}>
                            <div className={`mt-1 h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${formData.je_suis_auteur === true ? 'border-primary' : 'border-gray-300'}`}>
                              {formData.je_suis_auteur === true && <div className="h-2 w-2 rounded-full bg-primary" />}
                            </div>
                            <div>
                              <p className="font-medium">{t('ajouteroeuvre.jeSuisAuteur', 'Je suis l\'auteur de cette œuvre')}</p>
                              <p className="text-sm text-muted-foreground">{t('ajouteroeuvre.jeSuisAuteurDesc', 'Votre nom sera affiché comme auteur principal')}</p>
                            </div>
                          </div>
                          <div role="button" tabIndex={0}
                            className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${formData.je_suis_auteur === false ? 'border-primary bg-primary/5' : ''}`}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleInputChange('je_suis_auteur', false); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleInputChange('je_suis_auteur', false); } }}>
                            <div className={`mt-1 h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${formData.je_suis_auteur === false ? 'border-primary' : 'border-gray-300'}`}>
                              {formData.je_suis_auteur === false && <div className="h-2 w-2 rounded-full bg-primary" />}
                            </div>
                            <div>
                              <p className="font-medium">{t('ajouteroeuvre.autreAuteur', 'J\'ajoute l\'œuvre d\'un autre auteur')}</p>
                              <p className="text-sm text-muted-foreground">{t('ajouteroeuvre.autreAuteurDesc', 'Vous êtes le contributeur qui référence cette œuvre sur la plateforme')}</p>
                            </div>
                          </div>
                        </div>
                        {formData.je_suis_auteur === false && metadata.types_users && metadata.editeurs && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm text-muted-foreground mb-4">{t('ajouteroeuvre.ajouterAuteurObligatoire', 'Ajoutez au moins l\'auteur principal de l\'œuvre, puis les éventuels contributeurs (traducteur, illustrateur...)')}</p>
                            <IntervenantEditeurManager typeOeuvreId={formData.id_type_oeuvre} typesUsers={metadata.types_users} editeurs={metadata.editeurs}
                              onIntervenantsChange={handleIntervenantsChange} onEditeursChange={handleEditeursChange} />
                          </div>
                        )}
                        {formData.je_suis_auteur === true && metadata.types_users && metadata.editeurs && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm text-muted-foreground mb-4">{t('ajouteroeuvre.coAuteursOptionnel', 'Vous pouvez aussi ajouter des co-auteurs ou contributeurs (traducteur, illustrateur, préfacier...)')}</p>
                            <IntervenantEditeurManager typeOeuvreId={formData.id_type_oeuvre} typesUsers={metadata.types_users} editeurs={metadata.editeurs}
                              onIntervenantsChange={handleIntervenantsChange} onEditeursChange={handleEditeursChange} />
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Tags */}
                    <Card className="shadow-cultural">
                      <CardHeader>
                        <CardTitle className="text-2xl font-serif">{t("ajouteroeuvre.tags")}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {formData.tags.map((tag) =>
                          <Badge key={tag} variant="secondary" className="ps-3 pe-1 bg-secondary hover:bg-secondary/80">
                              {tag}
                              <Button type="button" variant="ghost" size="sm" className="h-auto p-1 ms-1 hover:bg-transparent"
                                onClick={() => handleTagRemove(tag)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          )}
                        </div>
                        <div className="relative">
                          <div className="flex gap-2">
                            <Input placeholder={t("ajouteroeuvre.placeholder_ajouter_tag")} value={newTag}
                              onChange={(e) => { setNewTag(e.target.value); setShowTagSuggestions(e.target.value.length > 0); }}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleTagAdd(newTag); } }}
                              className="hover:border-primary focus:border-primary" />
                            <Button type="button" size="sm" onClick={() => handleTagAdd(newTag)}
                              disabled={!newTag || formData.tags.length >= 10} className="bg-primary hover:bg-primary/90">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          {showTagSuggestions && newTag && metadata.tags &&
                          <div className="absolute top-full start-0 end-0 mt-1 bg-background border rounded-md shadow-lg z-10 max-h-48 overflow-auto">
                              {metadata.tags
                                .filter((tag: TagMotCle) => {
                                  const tagName = getTagName(tag.nom);
                                  return tagName.toLowerCase().includes(newTag.toLowerCase()) && !formData.tags.includes(tagName.toLowerCase());
                                })
                                .slice(0, 5)
                                .map((tag: TagMotCle) =>
                                <button key={tag.id_tag} type="button" className="w-full text-start px-3 py-2 hover:bg-secondary transition-colors"
                                  onClick={() => handleTagAdd(getTagName(tag.nom))}>
                                  {getTagName(tag.nom)}
                                </button>
                                )}
                            </div>
                          }
                        </div>
                        {suggestedTags.length > 0 &&
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">{t("ajouteroeuvre.tags_suggrs")}</p>
                            <div className="flex flex-wrap gap-2">
                              {suggestedTags
                                .filter((tag) => !formData.tags.includes(tag))
                                .map((tag) =>
                                <Button type="button" key={tag} variant="outline" size="sm" onClick={() => handleTagAdd(tag)}
                                  className="hover:bg-primary hover:text-primary-foreground hover:border-primary">
                                  <Plus className="h-3 w-3 me-1" />{tag}
                                </Button>
                                )}
                            </div>
                          </div>
                        }
                      </CardContent>
                    </Card>

                    {/* Fichiers et médias */}
                    <Card className="shadow-cultural">
                      <CardHeader>
                        <CardTitle className="text-2xl font-serif">{t("ajouteroeuvre.fichiers_mdias")}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-2">{t("ajouteroeuvre.premire_image_ajoute")}</p>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {medias.length > 0 &&
                        <div className="space-y-4">
                            <h4 className="font-medium text-lg">{t("ajouteroeuvre.mdias_ajouts")}</h4>
                            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-4">
                              {medias.map((media) =>
                              <div key={media.id} className="relative group">
                                  <div className={`border-2 rounded-lg p-4 space-y-2 hover-lift bg-card transition-all ${media.isPrincipal ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}>
                                    {media.isPrincipal &&
                                    <div className="absolute -top-2 -end-2 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg z-10">
                                        <Star className="h-4 w-4 fill-current" />
                                      </div>
                                    }
                                    {media.type === 'image' && media.preview ?
                                    <div className="relative">
                                        <img src={media.preview} alt={media.titre || 'Aperçu'} className="w-full h-32 object-cover rounded" />
                                        {!media.isPrincipal && media.type === 'image' &&
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded cursor-pointer flex items-center justify-center"
                                          onClick={() => handleSetPrincipalMedia(media.id)} role="button" tabIndex={0}
                                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSetPrincipalMedia(media.id); } }}>
                                            <div className="text-white text-center">
                                              <Star className="h-6 w-6 mx-auto mb-1" />
                                              <p className="text-xs">{t("ajouteroeuvre.dfinir_comme_principale")}</p>
                                            </div>
                                          </div>
                                        }
                                      </div> :
                                    <div className="w-full h-32 bg-muted rounded flex items-center justify-center">
                                        {media.type === 'video' && <Film className="h-8 w-8 text-muted-foreground" />}
                                        {media.type === 'audio' && <Music className="h-8 w-8 text-muted-foreground" />}
                                        {media.type === 'document' && <FileText className="h-8 w-8 text-muted-foreground" />}
                                      </div>
                                    }
                                    <p className="text-sm truncate">{media.file.name}</p>
                                    <p className="text-xs text-muted-foreground">{(media.file.size / 1024 / 1024).toFixed(2)}{t("ajouteroeuvre.mb")}</p>
                                    <Button type="button" size="sm" variant="ghost"
                                      className="absolute top-2 end-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                                      onClick={() => handleMediaRemove(media.id)}>
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        }
                        <div className="space-y-2">
                          <Label className="text-base">{t("ajouteroeuvre.ajouter_des_mdias")} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                          <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
                            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-foreground mb-2">{t("ajouteroeuvre.glissezdposez_vos_fichiers")}</p>
                            <p className="text-sm text-muted-foreground mb-4">{t("ajouteroeuvre.images_vidos_audio")}</p>
                            <input type="file" multiple accept="image/*,video/*,audio/*,.pdf"
                              onChange={(e) => e.target.files && handleMediaUpload(e.target.files)} className="hidden" id="media-upload" />
                            <Button type="button" variant="outline" onClick={() => document.getElementById('media-upload')?.click()}
                              className="hover:bg-primary hover:text-primary-foreground hover:border-primary">
                              {t("ajouteroeuvre.choisir_des_fichiers")}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="space-y-4">
                      {uploadProgress &&
                      <div className="text-center text-sm text-muted-foreground animate-pulse">{uploadProgress}</div>
                      }
                      <div className="flex justify-end gap-4">
                        <Button type="button" variant="outline" onClick={() => handleSubmit(true)}
                          disabled={loading || !isAuthenticated} className="hover:bg-secondary hover:text-secondary-foreground hover:border-secondary">
                          {loading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}{t("ajouteroeuvre.sauvegarder_comme_brouillon")}
                        </Button>
                        <Button type="submit" size="lg" disabled={loading || !isAuthenticated} className="w-full">
                          {loading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                          <Save className="h-4 w-4 me-2" />{t("ajouteroeuvre.publier_luvre")}
                        </Button>
                      </div>
                    </div>
                  </>
                }
              </div>
            </form>
          }
        </div>
      </div>
    </div>);
};

export default AjouterOeuvre;
