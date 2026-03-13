/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import CategorySelection from '@/components/CategorieSection';
import IntervenantEditeurManager from '@/components/oeuvre/IntervenantEditeurManager';

import type { ArticleFormData } from '@/types/models/articles.types';
import type {
  IntervenantExistant,
  NouvelIntervenant,
  ContributeurOeuvre,
  EditeurOeuvre,
} from '@/types/api/oeuvre-creation.types';

interface ArticleMetadataTabProps {
  formData: ArticleFormData;
  setFormData: React.Dispatch<React.SetStateAction<ArticleFormData>>;
  metadata: any;
  expandedSections: { categories: boolean; contributeurs: boolean; tags: boolean };
  toggleSection: (section: string) => void;
  contributeurs: ContributeurOeuvre[];
  nouveauxIntervenants: NouvelIntervenant[];
  editeurs: EditeurOeuvre[];
  setEditeurs: React.Dispatch<React.SetStateAction<EditeurOeuvre[]>>;
  handleIntervenantsChange: (existants: IntervenantExistant[], nouveaux: NouvelIntervenant[], contributeurs: ContributeurOeuvre[]) => void;
  newTag: string;
  setNewTag: (tag: string) => void;
  handleAddTag: (tag: string) => void;
  handleRemoveTag: (tag: string) => void;
}

const ArticleMetadataTab: React.FC<ArticleMetadataTabProps> = ({
  formData, setFormData, metadata,
  expandedSections, toggleSection,
  contributeurs, nouveauxIntervenants, editeurs, setEditeurs,
  handleIntervenantsChange,
  newTag, setNewTag, handleAddTag, handleRemoveTag,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
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
                onValueChange={(value) => setFormData(prev => ({ ...prev, id_langue: parseInt(value) }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {metadata.langues?.map((langue: any) => (
                    <SelectItem key={langue.id_langue} value={langue.id_langue.toString()}>
                      {langue.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="annee_creation">{t("article_articleeditor.anne_cration")}</Label>
              <Input
                id="annee_creation"
                type="number"
                value={formData.annee_creation || new Date().getFullYear()}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  annee_creation: parseInt(e.target.value) || undefined
                }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => toggleSection('categories')}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {t("article_articleeditor.catgories")}
              {formData.categories.length > 0 && <Badge variant="secondary">{formData.categories.length}</Badge>}
            </CardTitle>
            <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.categories ? 'rotate-180' : ''}`} />
          </div>
        </CardHeader>
        {expandedSections.categories && (
          <CardContent>
            <CategorySelection
              typeOeuvreId={formData.type === 'article_scientifique' ? 5 : 4}
              selectedCategories={formData.categories}
              onCategoriesChange={(categories) => setFormData(prev => ({ ...prev, categories }))} />
          </CardContent>
        )}
      </Card>

      {/* Contributeurs */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => toggleSection('contributeurs')}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {t("article_articleeditor.contributeurs_diteurs")}
              {contributeurs.length + nouveauxIntervenants.length + editeurs.length > 0 && (
                <Badge variant="secondary">{contributeurs.length + nouveauxIntervenants.length + editeurs.length}</Badge>
              )}
            </CardTitle>
            <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.contributeurs ? 'rotate-180' : ''}`} />
          </div>
        </CardHeader>
        {expandedSections.contributeurs && metadata.types_users && metadata.editeurs && (
          <CardContent>
            <IntervenantEditeurManager
              typeOeuvreId={formData.type === 'article_scientifique' ? 5 : 4}
              typesUsers={metadata.types_users}
              editeurs={metadata.editeurs}
              onIntervenantsChange={handleIntervenantsChange}
              onEditeursChange={setEditeurs} />
          </CardContent>
        )}
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => toggleSection('tags')}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {t("article_articleeditor.tags")}
              {formData.tags.length > 0 && <Badge variant="secondary">{formData.tags.length}</Badge>}
            </CardTitle>
            <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.tags ? 'rotate-180' : ''}`} />
          </div>
        </CardHeader>
        {expandedSections.tags && (
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
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
              <Button type="button" size="sm" onClick={() => handleAddTag(newTag)} disabled={!newTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Champs specifiques */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t("article_articleeditor.informations_spcifiques")}
            {formData.type === 'article_scientifique' ? 'Article Scientifique' : 'Article'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.type === 'article' ? (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="auteur">{t("article_articleeditor.auteur")}</Label>
                  <Input id="auteur" value={formData.auteur || ''} onChange={(e) => setFormData(prev => ({ ...prev, auteur: e.target.value }))} placeholder={t("article_articleeditor.placeholder_nom_lauteur")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source">{t("article_articleeditor.source")}</Label>
                  <Input id="source" value={formData.source || ''} onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))} placeholder={t("article_articleeditor.placeholder_publication_source")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sous_titre">{t("article_articleeditor.soustitre")}</Label>
                <Input id="sous_titre" value={formData.sous_titre || ''} onChange={(e) => setFormData(prev => ({ ...prev, sous_titre: e.target.value }))} placeholder={t("article_articleeditor.placeholder_soustitre_larticle")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url_source">{t("article_articleeditor.url_source")}</Label>
                <Input id="url_source" type="url" value={formData.url_source || ''} onChange={(e) => setFormData(prev => ({ ...prev, url_source: e.target.value }))} placeholder="https://..." />
              </div>
            </>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="journal">{t("article_articleeditor.journal")}</Label>
                <Input id="journal" value={formData.journal || ''} onChange={(e) => setFormData(prev => ({ ...prev, journal: e.target.value }))} placeholder={t("article_articleeditor.placeholder_nom_journal")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doi">{t("article_articleeditor.doi")}</Label>
                <Input id="doi" value={formData.doi || ''} onChange={(e) => setFormData(prev => ({ ...prev, doi: e.target.value }))} placeholder={t("article_articleeditor.placeholder_101234example")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="volume">{t("article_articleeditor.volume")}</Label>
                <Input id="volume" value={formData.volume || ''} onChange={(e) => setFormData(prev => ({ ...prev, volume: e.target.value }))} placeholder={t("article_articleeditor.placeholder_ex_12")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero">{t("article_articleeditor.numro")}</Label>
                <Input id="numero" value={formData.numero || ''} onChange={(e) => setFormData(prev => ({ ...prev, numero: e.target.value }))} placeholder={t("article_articleeditor.placeholder_ex_3")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pages">{t("article_articleeditor.pages")}</Label>
                <Input id="pages" value={formData.pages || ''} onChange={(e) => setFormData(prev => ({ ...prev, pages: e.target.value }))} placeholder={t("article_articleeditor.placeholder_123145")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="issn">{t("article_articleeditor.issn")}</Label>
                <Input id="issn" value={formData.issn || ''} onChange={(e) => setFormData(prev => ({ ...prev, issn: e.target.value }))} placeholder={t("article_articleeditor.placeholder_xxxxxxxx")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="impact_factor">{t("article_articleeditor.impact_factor")}</Label>
                <Input id="impact_factor" type="number" step="0.01" value={formData.impact_factor || ''} onChange={(e) => setFormData(prev => ({ ...prev, impact_factor: parseFloat(e.target.value) || undefined }))} placeholder={t("article_articleeditor.placeholder_375")} />
              </div>
              <div className="space-y-2 flex items-center">
                <Checkbox id="peer_reviewed" checked={formData.peer_reviewed || false} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, peer_reviewed: checked === true }))} />
                <Label htmlFor="peer_reviewed" className="ml-2">{t("article_articleeditor.article_valu_par")}</Label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ArticleMetadataTab;
