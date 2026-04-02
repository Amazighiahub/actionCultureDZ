/**
 * SectionEnrichissable - Section de contenu patrimoine qui peut être enrichie
 *
 * 2 états :
 * - Rempli → affiche le contenu
 * - Vide → invitation à contribuer (si connecté)
 *
 * Inclut un bouton "Modifier" pour les contributeurs connectés
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, Pencil } from 'lucide-react';
import MultiLangInput from '@/components/MultiLangInput';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { httpClient } from '@/services/httpClient';

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
}

const translate = (value: string | MultilingualField | null | undefined, lang: string): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[lang as keyof typeof value] || value.fr || value.ar || value.en || '';
};

const SectionEnrichissable: React.FC<SectionEnrichissableProps> = ({
  icon, title, content, lang, lieuId, fieldName, onSaved
}) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editValue, setEditValue] = useState<MultilingualField>({ fr: '', ar: '', en: '' });

  const hasContent = content && translate(content, lang).trim().length > 0;

  const openEditor = () => {
    if (typeof content === 'object' && content) {
      setEditValue({ fr: content.fr || '', ar: content.ar || '', en: content.en || '' });
    } else if (typeof content === 'string') {
      setEditValue({ fr: content, ar: '', en: '' });
    } else {
      setEditValue({ fr: '', ar: '', en: '' });
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editValue.fr?.trim() && !editValue.ar?.trim()) {
      toast({ title: t('common.error'), description: t('patrimoine.contribute.contentRequired', 'Veuillez saisir du contenu (au moins en français ou arabe)'), variant: 'destructive' });
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">{icon} {title}</CardTitle>
            {isAuthenticated && (
              <Button variant="ghost" size="sm" onClick={openEditor} className="text-muted-foreground hover:text-primary">
                <Pencil className="h-4 w-4 mr-1" />
                {t('common.edit', 'Modifier')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed text-muted-foreground whitespace-pre-wrap">{translate(content, lang)}</p>
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
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {t('common.save', 'Enregistrer')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
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
          <Button variant="outline" onClick={openEditor}>
            <Plus className="h-4 w-4 mr-2" />
            {t('patrimoine.contribute.add', 'Contribuer')}
          </Button>
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
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {t('common.save', 'Enregistrer')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SectionEnrichissable;
