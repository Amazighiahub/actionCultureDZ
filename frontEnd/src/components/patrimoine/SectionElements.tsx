import { useState } from 'react';
import { Plus, Trash2, Pencil, Landmark, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { httpClient } from '@/services/httpClient';
import { cn } from '@/lib/Utils';

type MultilingualField = { fr?: string; ar?: string; en?: string };

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
  monument: {
    types: MONUMENT_TYPES,
    icon: Landmark,
    labelAdd: 'Ajouter un monument',
    labelEdit: 'Modifier le monument',
    labelEmpty: 'Aucun monument répertorié pour ce site.',
    labelEmptyHint: 'Commencez par ajouter le premier monument.',
    endpoint: 'monuments',
  },
  vestige: {
    types: VESTIGE_TYPES,
    icon: Building2,
    labelAdd: 'Ajouter un vestige',
    labelEdit: 'Modifier le vestige',
    labelEmpty: 'Aucun vestige répertorié pour ce site.',
    labelEmptyHint: 'Commencez par ajouter le premier vestige archéologique.',
    endpoint: 'vestiges',
  },
} as const;

function translate(field: MultilingualField | string | undefined, lang: string): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[lang as keyof MultilingualField] || field.fr || field.ar || '';
}

function useElementForm(initial?: PatrimoineElement, lang = 'fr') {
  const [nomFr, setNomFr] = useState(initial ? translate(initial.nom, 'fr') : '');
  const [nomAr, setNomAr] = useState(initial ? translate(initial.nom, 'ar') : '');
  const [type, setType] = useState(initial?.type ?? '');
  const [descFr, setDescFr] = useState(initial ? translate(initial.description, 'fr') : '');
  const [descAr, setDescAr] = useState(initial ? translate(initial.description, 'ar') : '');

  function reset() { setNomFr(''); setNomAr(''); setType(''); setDescFr(''); setDescAr(''); }
  function load(item: PatrimoineElement) {
    setNomFr(translate(item.nom, 'fr'));
    setNomAr(translate(item.nom, 'ar'));
    setType(item.type);
    setDescFr(translate(item.description, 'fr'));
    setDescAr(translate(item.description, 'ar'));
  }
  const payload = () => ({
    nom: { fr: nomFr.trim(), ar: nomAr.trim(), en: '' },
    type,
    description: { fr: descFr.trim(), ar: descAr.trim(), en: '' },
  });

  return { nomFr, setNomFr, nomAr, setNomAr, type, setType, descFr, setDescFr, descAr, setDescAr, reset, load, payload };
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
  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1">
        <Label>Nom (français) <span className="text-destructive">*</span></Label>
        <Input value={form.nomFr} onChange={(e) => form.setNomFr(e.target.value)} placeholder="Nom en français" autoFocus />
      </div>
      <div className="space-y-1">
        <Label>الاسم (عربي)</Label>
        <Input value={form.nomAr} onChange={(e) => form.setNomAr(e.target.value)} placeholder="الاسم بالعربية" dir="rtl" />
      </div>
      <div className="space-y-1">
        <Label>Type <span className="text-destructive">*</span></Label>
        <Select value={form.type} onValueChange={form.setType}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un type" />
          </SelectTrigger>
          <SelectContent>
            {cfg.types.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Description (français)</Label>
        <Textarea
          value={form.descFr}
          onChange={(e) => form.setDescFr(e.target.value)}
          placeholder="Décrivez ce lieu en quelques phrases…"
          rows={3}
          className="resize-none"
        />
      </div>
      <div className="space-y-1">
        <Label>الوصف (عربي)</Label>
        <Textarea
          value={form.descAr}
          onChange={(e) => form.setDescAr(e.target.value)}
          placeholder="وصف مختصر بالعربية"
          dir="rtl"
          rows={3}
          className="resize-none"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Annuler</Button>
        <Button className="flex-1" disabled={saving} onClick={onSubmit}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
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
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const cfg = CONFIG[kind];
  const Icon = cfg.icon;

  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const addForm = useElementForm();

  const [editItem, setEditItem] = useState<PatrimoineElement | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const editForm = useElementForm();

  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleAdd() {
    if (!addForm.nomFr.trim()) {
      toast({ title: 'Champ manquant', description: 'Le nom en français est requis', variant: 'destructive' });
      return;
    }
    if (!addForm.type) {
      toast({ title: 'Champ manquant', description: 'Sélectionnez un type', variant: 'destructive' });
      return;
    }
    setAddSaving(true);
    try {
      const res = await httpClient.post<{ success: boolean; data: PatrimoineElement }>(
        `/patrimoine/${lieuId}/${cfg.endpoint}`,
        addForm.payload()
      );
      if (res.success && res.data) {
        onItemAdded(res.data);
        toast({ title: '✓ Ajouté', description: `${kind === 'monument' ? 'Monument' : 'Vestige'} ajouté avec succès` });
        setAddOpen(false);
        addForm.reset();
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible d\'ajouter l\'élément', variant: 'destructive' });
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
    if (!editForm.nomFr.trim()) {
      toast({ title: 'Champ manquant', description: 'Le nom en français est requis', variant: 'destructive' });
      return;
    }
    if (!editForm.type) {
      toast({ title: 'Champ manquant', description: 'Sélectionnez un type', variant: 'destructive' });
      return;
    }
    setEditSaving(true);
    try {
      const res = await httpClient.patch<{ success: boolean; data: PatrimoineElement }>(
        `/patrimoine/${lieuId}/${cfg.endpoint}/${editItem.id}`,
        editForm.payload()
      );
      if (res.success && res.data) {
        onItemUpdated?.(res.data);
        toast({ title: '✓ Modifié', description: 'Élément mis à jour' });
        setEditItem(null);
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de modifier l\'élément', variant: 'destructive' });
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await httpClient.delete(`/patrimoine/${lieuId}/${cfg.endpoint}/${id}`);
      onItemDeleted(id);
      toast({ title: '✓ Supprimé' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' });
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
                    <CardTitle className="text-base leading-tight">{translate(item.nom, lang)}</CardTitle>
                    <Badge variant="secondary" className="mt-1 text-xs">{item.type}</Badge>
                  </div>
                  {isAuthenticated && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => openEdit(item)}
                        title="Modifier"
                        aria-label={`Modifier ${translate(item.nom, lang)}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        disabled={deletingId === item.id}
                        onClick={() => handleDelete(item.id)}
                        title="Supprimer"
                        aria-label={`Supprimer ${translate(item.nom, lang)}`}
                      >
                        {deletingId === item.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              {translate(item.description, lang) && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {translate(item.description, lang)}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 border-2 border-dashed rounded-lg border-muted-foreground/20 bg-muted/20">
          <Icon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">{cfg.labelEmpty}</p>
          {isAuthenticated && (
            <p className="text-xs text-muted-foreground/70 mt-1">{cfg.labelEmptyHint}</p>
          )}
        </div>
      )}

      {/* Bouton Ajouter */}
      {isAuthenticated && (
        <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) addForm.reset(); }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full border-dashed hover:border-solid hover:bg-primary/5">
              <Plus className="h-4 w-4 mr-2" />
              {cfg.labelAdd}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{cfg.labelAdd}</DialogTitle>
            </DialogHeader>
            <ElementForm cfg={cfg} form={addForm} saving={addSaving} onSubmit={handleAdd} onCancel={() => setAddOpen(false)} submitLabel="Ajouter" />
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog Modifier */}
      <Dialog open={!!editItem} onOpenChange={(v) => { if (!v) setEditItem(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{cfg.labelEdit}</DialogTitle>
          </DialogHeader>
          {editItem && (
            <ElementForm cfg={cfg} form={editForm} saving={editSaving} onSubmit={handleEdit} onCancel={() => setEditItem(null)} submitLabel="Enregistrer" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
