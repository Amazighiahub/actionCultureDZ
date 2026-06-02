import { useState } from 'react';
import { Plus, Trash2, Landmark, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  onItemDeleted: (id: number) => void;
  className?: string;
}

const CONFIG = {
  monument: {
    types: ['Mosquée', 'Palais', 'Statue', 'Tour', 'Musée'],
    icon: Landmark,
    labelAdd: 'Ajouter un monument',
    labelEmpty: 'Aucun monument répertorié',
    endpoint: 'monuments',
  },
  vestige: {
    types: ['Ruines', 'Murailles', 'Site archéologique'],
    icon: Building2,
    labelAdd: 'Ajouter un vestige',
    labelEmpty: 'Aucun vestige répertorié',
    endpoint: 'vestiges',
  },
} as const;

function translate(field: MultilingualField | string | undefined, lang: string): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[lang as keyof MultilingualField] || field.fr || field.ar || '';
}

export default function SectionElements({
  lieuId,
  kind,
  items,
  lang = 'fr',
  onItemAdded,
  onItemDeleted,
  className,
}: SectionElementsProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const cfg = CONFIG[kind];
  const Icon = cfg.icon;

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [nomFr, setNomFr] = useState('');
  const [nomAr, setNomAr] = useState('');
  const [type, setType] = useState('');
  const [descFr, setDescFr] = useState('');
  const [descAr, setDescAr] = useState('');

  function resetForm() {
    setNomFr(''); setNomAr(''); setType(''); setDescFr(''); setDescAr('');
  }

  async function handleAdd() {
    if (!nomFr.trim()) {
      toast({ title: 'Erreur', description: 'Le nom en français est requis', variant: 'destructive' });
      return;
    }
    if (!type) {
      toast({ title: 'Erreur', description: 'Sélectionnez un type', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const res = await httpClient.post<{ success: boolean; data: PatrimoineElement }>(
        `/patrimoine/${lieuId}/${cfg.endpoint}`,
        {
          nom: { fr: nomFr.trim(), ar: nomAr.trim(), en: '' },
          type,
          description: { fr: descFr.trim(), ar: descAr.trim(), en: '' },
        }
      );
      if (res.success && res.data) {
        onItemAdded(res.data);
        toast({ title: 'Ajouté', description: `${kind === 'monument' ? 'Monument' : 'Vestige'} ajouté avec succès` });
        setOpen(false);
        resetForm();
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible d\'ajouter l\'élément', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await httpClient.delete(`/patrimoine/${lieuId}/${cfg.endpoint}/${id}`);
      onItemDeleted(id);
      toast({ title: 'Supprimé' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex-1">{translate(item.nom, lang)}</CardTitle>
                  <Badge variant="outline" className="shrink-0">{item.type}</Badge>
                  {isAuthenticated && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                      disabled={deletingId === item.id}
                      onClick={() => handleDelete(item.id)}
                    >
                      {deletingId === item.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </CardHeader>
              {translate(item.description, lang) && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{translate(item.description, lang)}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-8">
          <CardContent>
            <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">{cfg.labelEmpty}</p>
          </CardContent>
        </Card>
      )}

      {isAuthenticated && (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {cfg.labelAdd}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{cfg.labelAdd}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label>Nom (français) <span className="text-destructive">*</span></Label>
                <Input value={nomFr} onChange={(e) => setNomFr(e.target.value)} placeholder="Nom en français" />
              </div>
              <div className="space-y-1">
                <Label>الاسم (عربي)</Label>
                <Input value={nomAr} onChange={(e) => setNomAr(e.target.value)} placeholder="الاسم بالعربية" dir="rtl" />
              </div>
              <div className="space-y-1">
                <Label>Type <span className="text-destructive">*</span></Label>
                <Select value={type} onValueChange={setType}>
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
                <Input value={descFr} onChange={(e) => setDescFr(e.target.value)} placeholder="Description courte" />
              </div>
              <div className="space-y-1">
                <Label>الوصف (عربي)</Label>
                <Input value={descAr} onChange={(e) => setDescAr(e.target.value)} placeholder="وصف مختصر" dir="rtl" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Annuler</Button>
                <Button className="flex-1" disabled={saving} onClick={handleAdd}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Ajouter
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
