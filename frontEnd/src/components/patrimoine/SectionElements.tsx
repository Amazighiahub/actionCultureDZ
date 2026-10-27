import { useState } from 'react';
import { Plus, Trash2, Pencil, Landmark, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { httpClient } from '@/services/httpClient';
import { cn } from '@/lib/Utils';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import MultiLangInput from '@/components/MultiLangInput';
import { aDuTexte, getLocalizedText } from '@/utils/getLocalizedText';

type MultilingualField = Record<string, string | undefined>;

export interface PatrimoineElement {
  id: number;
  nom: MultilingualField | string;
  description?: MultilingualField | string;
  type: string;
}

interface SectionElementsProps {
  lieuId: number;
  kind: 'monument' | 'vestige';
  items: PatrimoineElement[];
  lang?: string;
  onItemAdded: (item: PatrimoineElement) => void;
  onItemUpdated?: (item: PatrimoineElement) => void;
  onItemDeleted: (id: number) => void;
  className?: string;
}

const MONUMENT_TYPES = [
  'Mosquée', 'Palais', 'Casbah', 'Ksar', 'Fort', 'Mausolée', 'Zaouia',
  'Hammam', 'Fontaine', 'Statue', 'Tour', 'Minaret', 'Musée', 'Rempart',
  'Borj', 'Pont', 'Théâtre', 'Église', 'Marché',
  'Grenier collectif', 'Ancienne maison',
  'Autre',
] as const;

const VESTIGE_TYPES = [
  'Ruines', 'Murailles',
  'Vestiges numides', 'Tombeau numide', 'Inscriptions berbères',
  'Gravures rupestres', 'Site archéologique',
  'Dolmen', 'Théâtre antique', 'Thermes romains', 'Mosaïque', 'Aqueduc', 'Tombe',
  'Autre',
] as const;

const CONFIG = {
  monument: { types: MONUMENT_TYPES, icon: Landmark, endpoint: 'monuments' },
  vestige: { types: VESTIGE_TYPES, icon: Building2, endpoint: 'vestiges' },
} as const;

/** Libellés selon le genre d'élément (traduits ; ils étaient écrits en français dans le code) */
const libelles = (t: TFunction, kind: 'monument' | 'vestige') => (kind === 'monument' ? {
  add: t('patrimoine.elements.monument.add', 'Ajouter un monument'),
  edit: t('patrimoine.elements.monument.edit', 'Modifier le monument'),
  empty: t('patrimoine.elements.monument.empty', 'Aucun monument répertorié pour ce site.'),
  emptyHint: t('patrimoine.elements.monument.emptyHint', 'Commencez par ajouter le premier monument.'),
  added: t('patrimoine.elements.monument.added', 'Monument ajouté'),
} : {
  add: t('patrimoine.elements.vestige.add', 'Ajouter un vestige'),
  edit: t('patrimoine.elements.vestige.edit', 'Modifier le vestige'),
  empty: t('patrimoine.elements.vestige.empty', 'Aucun vestige répertorié pour ce site.'),
  emptyHint: t('patrimoine.elements.vestige.emptyHint', 'Commencez par ajouter le premier vestige archéologique.'),
  added: t('patrimoine.elements.vestige.added', 'Vestige ajouté'),
});

/** Nom d'un type (la valeur enregistrée reste la même dans toutes les langues) */
const nomType = (t: TFunction, type: string) => t(`patrimoine.elements.types.${type}`, type);

const texte = (field: MultilingualField | string | undefined, lang: string) => getLocalizedText(field, lang, '');

const enObjet = (v: MultilingualField | string | undefined): MultilingualField =>
  !v ? {} : typeof v === 'string' ? { fr: v } : { ...v };

function useElementForm() {
  const [nom, setNom] = useState<MultilingualField>({});
  const [type, setType] = useState('');
  const [description, setDescription] = useState<MultilingualField>({});

  function reset() { setNom({}); setType(''); setDescription({}); }
  function load(item: PatrimoineElement) {
    setNom(enObjet(item.nom));
    setType(item.type);
    setDescription(enObjet(item.description));
  }
  // Toutes les langues sont envoyées : une traduction ajoutée ne retire pas les autres
  const payload = () => ({ nom, type, description });

  return { nom, setNom, type, setType, description, setDescription, reset, load, payload };
}

function ElementForm({
  cfg,
  form,
  saving,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  cfg: typeof CONFIG[keyof typeof CONFIG];
  form: ReturnType<typeof useElementForm>;
  saving: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4 pt-2">
      {/* Nom et description dans les 5 langues : une seule suffit, chacun peut ajouter les autres */}
      <MultiLangInput
        name="element-nom"
        label={t('patrimoine.elements.nom', 'Nom')}
        value={form.nom}
        onChange={(v) => form.setNom(v as MultilingualField)}
        required
        requiredLanguages={[]}
        maxLength={200}
      />
      <div className="space-y-1">
        <Label>{t('patrimoine.elements.type', 'Type')} <span className="text-destructive">*</span></Label>
        <Select value={form.type} onValueChange={form.setType}>
          <SelectTrigger>
            <SelectValue placeholder={t('patrimoine.elements.choisirType', 'Sélectionner un type')} />
          </SelectTrigger>
          <SelectContent>
            {cfg.types.map((ty) => (
              <SelectItem key={ty} value={ty}>{nomType(t, ty)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <MultiLangInput
        name="element-description"
        label={t('patrimoine.elements.description', 'Description')}
        value={form.description}
        onChange={(v) => form.setDescription(v as MultilingualField)}
        type="textarea"
        rows={3}
        placeholder={t('patrimoine.elements.descriptionPlaceholder', 'Décrivez ce lieu en quelques phrases…')}
      />
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>{t('common.cancel', 'Annuler')}</Button>
        <Button className="flex-1" disabled={saving} onClick={onSubmit}>
          {saving ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

export default function SectionElements({
  lieuId,
  kind,
  items,
  lang = 'fr',
  onItemAdded,
  onItemUpdated,
  onItemDeleted,
  className,
}: SectionElementsProps) {
  // La suppression est réservée à la modération (contrôlée aussi côté API)
  const { isAuthenticated, isAdmin } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const cfg = CONFIG[kind];
  const lib = libelles(t, kind);
  const langue = lang || i18n.language;
  const champManquant = (f: ReturnType<typeof useElementForm>) => {
    if (!aDuTexte(f.nom)) {
      toast({ title: t('patrimoine.elements.champManquant', 'Champ manquant'), description: t('patrimoine.elements.nomRequis', 'Écrivez le nom, dans au moins une langue'), variant: 'destructive' });
      return true;
    }
    if (!f.type) {
      toast({ title: t('patrimoine.elements.champManquant', 'Champ manquant'), description: t('patrimoine.elements.typeRequis', 'Sélectionnez un type'), variant: 'destructive' });
      return true;
    }
    return false;
  };
  const Icon = cfg.icon;

  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const addForm = useElementForm();

  const [editItem, setEditItem] = useState<PatrimoineElement | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const editForm = useElementForm();

  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleAdd() {
    if (champManquant(addForm)) return;
    setAddSaving(true);
    try {
      const res = await httpClient.post<{ success: boolean; data: PatrimoineElement }>(
        `/patrimoine/${lieuId}/${cfg.endpoint}`,
        addForm.payload()
      );
      if (res.success && res.data) {
        onItemAdded(res.data);
        toast({ title: lib.added });
        setAddOpen(false);
        addForm.reset();
      }
    } catch {
      toast({ title: t('common.error', 'Erreur'), description: t('patrimoine.elements.erreurAjout', 'Impossible d’ajouter l’élément'), variant: 'destructive' });
    } finally {
      setAddSaving(false);
    }
  }

  function openEdit(item: PatrimoineElement) {
    editForm.load(item);
    setEditItem(item);
  }

  async function handleEdit() {
    if (!editItem) return;
    if (champManquant(editForm)) return;
    setEditSaving(true);
    try {
      const res = await httpClient.patch<{ success: boolean; data: PatrimoineElement }>(
        `/patrimoine/${lieuId}/${cfg.endpoint}/${editItem.id}`,
        editForm.payload()
      );
      if (res.success && res.data) {
        onItemUpdated?.(res.data);
        toast({ title: t('patrimoine.elements.modifie', 'Modification enregistrée') });
        setEditItem(null);
      }
    } catch {
      toast({ title: t('common.error', 'Erreur'), description: t('patrimoine.elements.erreurModif', 'Impossible de modifier l’élément'), variant: 'destructive' });
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await httpClient.delete(`/patrimoine/${lieuId}/${cfg.endpoint}/${id}`);
      onItemDeleted(id);
      toast({ title: t('patrimoine.elements.supprime', 'Supprimé') });
    } catch {
      toast({ title: t('common.error', 'Erreur'), description: t('patrimoine.elements.erreurSuppr', 'Impossible de supprimer'), variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {items.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base leading-tight">{texte(item.nom, langue)}</CardTitle>
                    <Badge variant="secondary" className="mt-1 text-xs">{nomType(t, item.type)}</Badge>
                  </div>
                  {isAuthenticated && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => openEdit(item)}
                        title={t('common.edit', 'Modifier')}
                        aria-label={`${t('common.edit', 'Modifier')} ${texte(item.nom, langue)}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          disabled={deletingId === item.id}
                          onClick={() => handleDelete(item.id)}
                          title={t('common.delete', 'Supprimer')}
                          aria-label={`${t('common.delete', 'Supprimer')} ${texte(item.nom, langue)}`}
                        >
                          {deletingId === item.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              {texte(item.description, langue) && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {texte(item.description, langue)}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 border-2 border-dashed rounded-lg border-muted-foreground/20 bg-muted/20">
          <Icon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">{lib.empty}</p>
          {isAuthenticated && (
            <p className="text-xs text-muted-foreground/70 mt-1">{lib.emptyHint}</p>
          )}
        </div>
      )}

      {/* Bouton Ajouter */}
      {isAuthenticated && (
        <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) addForm.reset(); }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full border-dashed hover:border-solid hover:bg-primary/5">
              <Plus className="h-4 w-4 me-2" />
              {lib.add}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{lib.add}</DialogTitle>
            </DialogHeader>
            <ElementForm cfg={cfg} form={addForm} saving={addSaving} onSubmit={handleAdd} onCancel={() => setAddOpen(false)} submitLabel={t('patrimoine.elements.ajouter', 'Ajouter')} />
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog Modifier */}
      <Dialog open={!!editItem} onOpenChange={(v) => { if (!v) setEditItem(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{lib.edit}</DialogTitle>
          </DialogHeader>
          {editItem && (
            <ElementForm cfg={cfg} form={editForm} saving={editSaving} onSubmit={handleEdit} onCancel={() => setEditItem(null)} submitLabel={t('common.save', 'Enregistrer')} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
