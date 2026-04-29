/**
 * SectionArticleEditor
 * ----------------------------------------------------------------------------
 * Modal d'edition des blocs riches (article_block) pour une SECTION d'un lieu
 * patrimoine (histoire, gastronomie, traditions, ...).
 *
 * Couple a :
 *   - patrimoineArticlesService (frontEnd/src/services/patrimoineArticles.service.ts)
 *   - backend/routes/patrimoineRoutes.js : GET/POST/DELETE /patrimoine/:id/articles
 *
 * Comportement :
 *   1. A l'ouverture, charge les blocs existants (filtres par section).
 *   2. Affiche la liste des blocs avec apercu + bouton "Supprimer".
 *   3. Permet d'ajouter un nouveau bloc via un formulaire (type + contenu).
 *   4. Notifie le parent via onSaved() apres chaque modification.
 *
 * MVP : supporte 6 types (text, heading, citation, image, video, separator).
 *   - image / video : URL externe en metadata.url (pas d'upload direct ici).
 *   - Les types code/list/table/embed pourront etre ajoutes plus tard.
 * ----------------------------------------------------------------------------
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Plus,
  Trash2,
  Type,
  Heading,
  Quote,
  Image as ImageIcon,
  Video,
  Minus,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  patrimoineArticlesService,
  type PatrimoineSection,
  type PatrimoineBlock,
  type PatrimoineBlockType,
  type CreatePatrimoineBlockPayload,
} from '@/services/patrimoineArticles.service';

// ============================================================================
// Props
// ============================================================================

interface SectionArticleEditorProps {
  /** Id du lieu patrimoine */
  lieuId: number;
  /** Section editee (histoire, gastronomie, ...) */
  section: PatrimoineSection;
  /** Titre lisible de la section (deja traduit/affichable) */
  sectionTitle: string;
  /** Icone de la section */
  sectionIcon: React.ReactNode;
  /** Etat ouvert/ferme du modal */
  isOpen: boolean;
  /** Callback fermeture (clic exterieur, croix, bouton Annuler) */
  onClose: () => void;
  /** Callback apres sauvegarde reussie (creation ou suppression) */
  onSaved?: () => void;
}

// ============================================================================
// Constantes UI
// ============================================================================

interface BlockTypeOption {
  value: PatrimoineBlockType;
  labelKey: string;
  fallbackLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SUPPORTED_TYPES: BlockTypeOption[] = [
  { value: 'text', labelKey: 'patrimoine.editor.types.text', fallbackLabel: 'Texte', icon: Type },
  { value: 'heading', labelKey: 'patrimoine.editor.types.heading', fallbackLabel: 'Titre', icon: Heading },
  { value: 'citation', labelKey: 'patrimoine.editor.types.citation', fallbackLabel: 'Citation', icon: Quote },
  { value: 'image', labelKey: 'patrimoine.editor.types.image', fallbackLabel: 'Image (URL)', icon: ImageIcon },
  { value: 'video', labelKey: 'patrimoine.editor.types.video', fallbackLabel: 'Video (URL)', icon: Video },
  { value: 'separator', labelKey: 'patrimoine.editor.types.separator', fallbackLabel: 'Separateur', icon: Minus },
];

// Helper apercu d'un bloc dans la liste
function blockPreview(block: PatrimoineBlock, fallback = ''): string {
  if (block.type_block === 'separator') return '— — —';
  if (block.type_block === 'image' || block.type_block === 'video') {
    const url = (block.metadata?.url as string | undefined) || block.contenu || fallback;
    return url || fallback;
  }
  return (block.contenu || fallback).slice(0, 200);
}

// ============================================================================
// Composant
// ============================================================================

const SectionArticleEditor: React.FC<SectionArticleEditorProps> = ({
  lieuId,
  section,
  sectionTitle,
  sectionIcon,
  isOpen,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [blocks, setBlocks] = useState<PatrimoineBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Formulaire d'ajout
  const [newType, setNewType] = useState<PatrimoineBlockType>('text');
  const [newContent, setNewContent] = useState('');
  const [newAuthor, setNewAuthor] = useState(''); // citation
  const [newLevel, setNewLevel] = useState<'h2' | 'h3' | 'h4'>('h2'); // heading
  const [newAlt, setNewAlt] = useState(''); // image

  const resetForm = useCallback(() => {
    setNewType('text');
    setNewContent('');
    setNewAuthor('');
    setNewLevel('h2');
    setNewAlt('');
  }, []);

  // ---------------------------------------------------------------- chargement
  const loadBlocks = useCallback(async () => {
    setLoading(true);
    const res = await patrimoineArticlesService.getBlocks(lieuId, section);
    setLoading(false);
    if (res.success && res.data) {
      setBlocks(res.data);
    } else {
      toast({
        title: t('common.error', 'Erreur'),
        description: res.error || t('patrimoine.editor.loadError', 'Impossible de charger les blocs'),
        variant: 'destructive',
      });
    }
  }, [lieuId, section, toast, t]);

  useEffect(() => {
    if (isOpen) {
      loadBlocks();
      resetForm();
    }
  }, [isOpen, loadBlocks, resetForm]);

  // ---------------------------------------------------------------- creation
  const buildPayload = (): CreatePatrimoineBlockPayload | null => {
    const trimmed = newContent.trim();

    switch (newType) {
      case 'text':
      case 'heading':
      case 'citation': {
        if (!trimmed) {
          toast({
            title: t('common.error', 'Erreur'),
            description: t('patrimoine.editor.contentRequired', 'Le contenu est obligatoire'),
            variant: 'destructive',
          });
          return null;
        }
        const metadata: Record<string, unknown> = {};
        if (newType === 'heading') metadata.level = newLevel;
        if (newType === 'citation' && newAuthor.trim()) metadata.author = newAuthor.trim();
        return {
          type_block: newType,
          section_patrimoine: section,
          contenu: trimmed,
          ...(Object.keys(metadata).length ? { metadata } : {}),
        };
      }

      case 'image':
      case 'video': {
        if (!trimmed) {
          toast({
            title: t('common.error', 'Erreur'),
            description: t('patrimoine.editor.urlRequired', 'L\'URL est obligatoire'),
            variant: 'destructive',
          });
          return null;
        }
        const metadata: Record<string, unknown> = { url: trimmed };
        if (newType === 'image' && newAlt.trim()) metadata.alt = newAlt.trim();
        return {
          type_block: newType,
          section_patrimoine: section,
          contenu: trimmed,
          metadata,
        };
      }

      case 'separator':
        return {
          type_block: 'separator',
          section_patrimoine: section,
          contenu: '',
        };

      default:
        return null;
    }
  };

  const handleAdd = async () => {
    const payload = buildPayload();
    if (!payload) return;

    setSaving(true);
    const res = await patrimoineArticlesService.createBlock(lieuId, payload);
    setSaving(false);

    if (res.success && res.data) {
      setBlocks((prev) => [...prev, res.data as PatrimoineBlock]);
      resetForm();
      toast({
        title: t('patrimoine.editor.added', 'Bloc ajoute'),
        description: t('patrimoine.contribute.thanks', 'Merci pour votre contribution'),
      });
      onSaved?.();
    } else {
      toast({
        title: t('common.error', 'Erreur'),
        description: res.error || t('patrimoine.editor.addError', 'Impossible d\'ajouter le bloc'),
        variant: 'destructive',
      });
    }
  };

  // ---------------------------------------------------------------- suppression
  const handleDelete = async (block: PatrimoineBlock) => {
    if (!window.confirm(t('patrimoine.editor.confirmDelete', 'Supprimer ce bloc ?') as string)) return;

    setDeletingId(block.id_block);
    const res = await patrimoineArticlesService.deleteBlock(lieuId, block.id_block);
    setDeletingId(null);

    if (res.success) {
      setBlocks((prev) => prev.filter((b) => b.id_block !== block.id_block));
      toast({
        title: t('patrimoine.editor.deleted', 'Bloc supprime'),
      });
      onSaved?.();
    } else {
      toast({
        title: t('common.error', 'Erreur'),
        description: res.error || t('patrimoine.editor.deleteError', 'Impossible de supprimer le bloc'),
        variant: 'destructive',
      });
    }
  };

  // ---------------------------------------------------------------- rendu
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {sectionIcon}
            {t('patrimoine.editor.title', { defaultValue: 'Articles enrichis : {{section}}', section: sectionTitle })}
          </DialogTitle>
          <DialogDescription>
            {t(
              'patrimoine.editor.description',
              'Ajoutez du texte, des titres, des citations, des images et videos pour enrichir cette section.'
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Liste des blocs existants */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {t('patrimoine.editor.existingBlocks', { defaultValue: 'Blocs existants ({{count}})', count: blocks.length })}
          </h3>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('common.loading', 'Chargement...')}
            </div>
          ) : blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4">
              {t('patrimoine.editor.noBlocks', 'Aucun bloc dans cette section pour le moment.')}
            </p>
          ) : (
            <ul className="space-y-2">
              {blocks.map((block) => (
                <li
                  key={block.id_block}
                  className="flex items-start justify-between gap-3 p-3 border rounded-md bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {block.type_block}
                      </Badge>
                      <span className="text-xs text-muted-foreground">#{block.ordre}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words text-foreground/90">
                      {blockPreview(block, t('patrimoine.editor.empty', '(vide)') as string)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(block)}
                    disabled={deletingId === block.id_block}
                    aria-label={t('common.delete', 'Supprimer') as string}
                  >
                    {deletingId === block.id_block ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Formulaire d'ajout */}
        <section className="space-y-3 mt-6 pt-6 border-t">
          <h3 className="text-sm font-semibold">{t('patrimoine.editor.addBlock', 'Ajouter un bloc')}</h3>

          <div className="space-y-2">
            <Label htmlFor="patrimoine-block-type">{t('patrimoine.editor.blockType', 'Type de bloc')}</Label>
            <Select
              value={newType}
              onValueChange={(v) => {
                setNewType(v as PatrimoineBlockType);
                setNewContent('');
                setNewAuthor('');
                setNewAlt('');
              }}
            >
              <SelectTrigger id="patrimoine-block-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_TYPES.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {t(opt.labelKey, opt.fallbackLabel)}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Champs adaptes au type */}
          {newType === 'heading' && (
            <div className="space-y-2">
              <Label htmlFor="patrimoine-heading-level">{t('patrimoine.editor.headingLevel', 'Niveau de titre')}</Label>
              <Select value={newLevel} onValueChange={(v) => setNewLevel(v as 'h2' | 'h3' | 'h4')}>
                <SelectTrigger id="patrimoine-heading-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="h2">H2 — {t('patrimoine.editor.headingMain', 'Principal')}</SelectItem>
                  <SelectItem value="h3">H3 — {t('patrimoine.editor.headingSub', 'Secondaire')}</SelectItem>
                  <SelectItem value="h4">H4 — {t('patrimoine.editor.headingMinor', 'Mineur')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {newType !== 'separator' && (
            <div className="space-y-2">
              <Label htmlFor="patrimoine-block-content">
                {newType === 'image' || newType === 'video'
                  ? t('patrimoine.editor.url', 'URL')
                  : t('patrimoine.editor.content', 'Contenu')}
              </Label>
              {newType === 'text' || newType === 'citation' ? (
                <Textarea
                  id="patrimoine-block-content"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={newType === 'citation' ? 3 : 5}
                  maxLength={5000}
                  placeholder={
                    newType === 'citation'
                      ? (t('patrimoine.editor.citationPlaceholder', '« Citation... »') as string)
                      : (t('patrimoine.editor.textPlaceholder', 'Saisir le texte...') as string)
                  }
                />
              ) : (
                <Input
                  id="patrimoine-block-content"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  maxLength={500}
                  placeholder={
                    newType === 'image'
                      ? 'https://exemple.com/image.jpg'
                      : newType === 'video'
                        ? 'https://youtube.com/watch?v=...'
                        : (t('patrimoine.editor.headingPlaceholder', 'Titre de section') as string)
                  }
                />
              )}
            </div>
          )}

          {newType === 'citation' && (
            <div className="space-y-2">
              <Label htmlFor="patrimoine-citation-author">{t('patrimoine.editor.author', 'Auteur (optionnel)')}</Label>
              <Input
                id="patrimoine-citation-author"
                value={newAuthor}
                onChange={(e) => setNewAuthor(e.target.value)}
                maxLength={200}
                placeholder={t('patrimoine.editor.authorPlaceholder', 'Nom de l\'auteur') as string}
              />
            </div>
          )}

          {newType === 'image' && (
            <div className="space-y-2">
              <Label htmlFor="patrimoine-image-alt">{t('patrimoine.editor.alt', 'Texte alternatif (accessibilite)')}</Label>
              <Input
                id="patrimoine-image-alt"
                value={newAlt}
                onChange={(e) => setNewAlt(e.target.value)}
                maxLength={200}
                placeholder={t('patrimoine.editor.altPlaceholder', 'Description de l\'image') as string}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.close', 'Fermer')}
            </Button>
            <Button type="button" onClick={handleAdd} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {t('patrimoine.editor.add', 'Ajouter le bloc')}
            </Button>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
};

export default SectionArticleEditor;
