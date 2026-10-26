/**
 * SectionEnrichissable - Section de contenu patrimoine qui peut être enrichie
 *
 * 2 états :
 * - Rempli → affiche le contenu
 * - Vide → invitation à contribuer (si connecté)
 *
 * Inclut un bouton "Modifier" pour les contributeurs connectés
 */
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, FileText, ChevronRight } from 'lucide-react';
import MultiLangInput from '@/components/MultiLangInput';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { httpClient } from '@/services/httpClient';
import SectionArticleEditor from '@/components/patrimoine/SectionArticleEditor';
import BlocsArticle from '@/components/patrimoine/BlocsArticle';
import PagesDetaillees from '@/components/patrimoine/PagesDetaillees';
import { getLocalizedText, aDuTexte } from '@/utils/getLocalizedText';
import {
  PATRIMOINE_SECTIONS,
  type PatrimoineSection,
  type PatrimoineBlock,
  type PagePatrimoine,
  lienEcrirePage, retirerPagePatrimoine,
} from '@/services/patrimoineArticles.service';

type MultilingualField = { fr?: string; ar?: string; en?: string; [key: string]: string | undefined };

interface SectionEnrichissableProps {
  /** Icône ou emoji à afficher */
  icon: React.ReactNode;
  /** Titre de la section */
  title: string;
  /** Contenu multilingue actuel */
  content?: string | MultilingualField | null;
  /** Langue courante */
  lang: string;
  /** ID du lieu pour l'API */
  lieuId: number;
  /** Nom du champ dans detail_lieux (ex: 'gastronomie', 'traditions') */
  fieldName: string;
  /** Callback après sauvegarde réussie */
  onSaved?: (newContent: MultilingualField) => void;
  /** Blocs « Écrire un article » de cette section, affichés sous le texte */
  blocs?: PatrimoineBlock[];
  /** Bouton « Écrire un article » : modération et professionnels validés (règle du serveur) */
  peutEcrireArticle?: boolean;
  /** Après ajout ou suppression d'un bloc d'article */
  onArticlesChange?: () => void;
  /** Articles complets (éditeur avancé) reliés à cette section : cartes « En savoir plus » */
  pages?: PagePatrimoine[];
  /** Après le retrait d'une page détaillée */
  onPagesChange?: () => void;
}

const translate = (value: string | MultilingualField | null | undefined, lang: string): string => {
  if (!value) return '';
  return getLocalizedText(value, lang);
};

const SectionEnrichissable: React.FC<SectionEnrichissableProps> = ({
  icon, title, content, lang, lieuId, fieldName, onSaved,
  blocs = [], peutEcrireArticle = false, onArticlesChange, pages = [], onPagesChange
}) => {
  const { t } = useTranslation();
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editValue, setEditValue] = useState<MultilingualField>({ fr: '', ar: '', en: '' });
  const [isArticleEditorOpen, setIsArticleEditorOpen] = useState(false);

  // fieldName n'est typé `string` côté API mais doit correspondre aux 8 sections
  // patrimoine valides côté backend. On filtre defensivement : si la section
  // n'est pas reconnue, on masque simplement le bouton "Article".
  const sectionValide = useMemo<PatrimoineSection | null>(() => {
    return (PATRIMOINE_SECTIONS as readonly string[]).includes(fieldName)
      ? (fieldName as PatrimoineSection)
      : null;
  }, [fieldName]);
  // « Écrire un article » : l'éditeur avancé, article relié ensuite à cette section
  const patrimoineSection = peutEcrireArticle ? sectionValide : null;
  const ecrireArticle = () => { if (patrimoineSection) navigate(lienEcrirePage(lieuId, patrimoineSection)); };
  // Anciens blocs (éditeur simple) : gérés par la modération seulement
  const sectionBlocs = isAdmin && blocs.length > 0 ? sectionValide : null;

  const texte = translate(content, lang).trim();
  const hasContent = texte.length > 0 || blocs.length > 0 || pages.length > 0;

  const openEditor = () => {
    if (typeof content === 'object' && content) {
      setEditValue({ fr: '', ar: '', en: '', ...content });
    } else if (typeof content === 'string') {
      // La page reçoit la section traduite dans la langue affichée : le texte est rangé sous
      // cette langue (il partait en « fr ») ; le serveur garde les autres traductions
      setEditValue({ fr: '', ar: '', en: '', [lang]: content });
    } else {
      setEditValue({ fr: '', ar: '', en: '' });
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!aDuTexte(editValue)) {
      toast({ title: t('common.error'), description: t('patrimoine.contribute.contentRequired', 'Veuillez saisir du contenu, dans au moins une langue'), variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const response = await httpClient.patch(`/patrimoine/${lieuId}/detail`, {
        [fieldName]: editValue
      });

      if ((response as any).success) {
        toast({ title: t('patrimoine.contribute.saved', 'Contribution enregistrée !'), description: t('patrimoine.contribute.thanks', 'Merci pour votre contribution') });
        setIsEditing(false);
        onSaved?.(editValue);
      } else {
        toast({ title: t('common.error'), description: (response as any).error || t('patrimoine.contribute.saveFailed'), variant: 'destructive' });
      }
    } catch (err: unknown) {
      toast({ title: t('common.error'), description: err instanceof Error ? err.message : t('patrimoine.contribute.saveFailed', 'Erreur lors de la sauvegarde'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Section remplie
  if (hasContent) {
    return (
      <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <CardTitle className="flex items-center gap-2">{icon} {title}</CardTitle>
            {isAuthenticated && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={openEditor} className="text-muted-foreground hover:text-primary">
                  <Pencil className="h-4 w-4 me-1" />
                  {t('common.edit', 'Modifier')}
                </Button>
                {patrimoineSection && (
                  <Button variant="ghost" size="sm" onClick={ecrireArticle} className="text-muted-foreground hover:text-primary">
                    <FileText className="h-4 w-4 me-1" />
                    {t('patrimoine.contribute.addArticle', 'Article')}
                  </Button>
                )}
                {sectionBlocs && (
                  <Button variant="ghost" size="sm" onClick={() => setIsArticleEditorOpen(true)} className="text-muted-foreground hover:text-primary">
                    {t('patrimoine.contribute.anciensBlocs', 'Blocs')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {texte && <p className="leading-relaxed text-muted-foreground whitespace-pre-wrap">{texte}</p>}
          <BlocsArticle blocs={blocs} />
          <PagesDetaillees pages={pages} retirer={(pg) => retirerPagePatrimoine(lieuId, pg.id_lien)} onChange={onPagesChange} />
          {/* Gastronomie : vers les plats de toute l'Algérie (sous-page de l'Artisanat) */}
          {fieldName === 'gastronomie' && (
            <Link to="/artisanat/gastronomie" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
              {t('gastronomie.voirTous', 'Voir tous les plats d’Algérie')}<ChevronRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
          )}
        </CardContent>

        {/* Modal d'édition */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">{icon} {title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <MultiLangInput
                name={fieldName}
                label={title}
                value={editValue}
                onChange={(val: any) => setEditValue(val)}
                type="textarea"
                rows={6}
                requiredLanguages={['fr']}
                maxLength={5000}
                showCharCount
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>{t('common.cancel', 'Annuler')}</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : null}
                  {t('common.save', 'Enregistrer')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </Card>

      {/* Modal blocs riches (articles) */}
      {sectionBlocs && (
        <SectionArticleEditor
          lieuId={lieuId}
          section={sectionBlocs}
          sectionTitle={title}
          sectionIcon={icon}
          isOpen={isArticleEditorOpen}
          onClose={() => setIsArticleEditorOpen(false)}
          onSaved={onArticlesChange}
        />
      )}
      </>
    );
  }

  // Section vide - invitation à contribuer
  if (!isAuthenticated) return null; // Visiteur non connecté → pas de section vide

  return (
    <>
      <Card className="border-dashed border-2 border-muted-foreground/20 bg-muted/30">
        <CardContent className="py-8 text-center">
          <div className="text-4xl mb-3">{icon}</div>
          <h3 className="font-medium mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('patrimoine.contribute.empty', 'Cette section n\'est pas encore documentée.')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={openEditor}>
              <Plus className="h-4 w-4 me-2" />
              {t('patrimoine.contribute.addQuick', 'Texte rapide')}
            </Button>
            {patrimoineSection && (
              <Button variant="default" onClick={ecrireArticle}>
                <FileText className="h-4 w-4 me-2" />
                {t('patrimoine.contribute.writeArticle', 'Écrire un article')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal d'édition */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">{icon} {title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <MultiLangInput
              name={fieldName}
              label={title}
              value={editValue}
              onChange={(val: any) => setEditValue(val)}
              type="textarea"
              rows={6}
              requiredLanguages={['fr']}
              maxLength={5000}
              showCharCount
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>{t('common.cancel', 'Annuler')}</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : null}
                {t('common.save', 'Enregistrer')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal blocs riches (articles) */}
      {sectionBlocs && (
        <SectionArticleEditor
          lieuId={lieuId}
          section={sectionBlocs}
          sectionTitle={title}
          sectionIcon={icon}
          isOpen={isArticleEditorOpen}
          onClose={() => setIsArticleEditorOpen(false)}
          onSaved={onArticlesChange}
        />
      )}
    </>
  );
};

export default SectionEnrichissable;
