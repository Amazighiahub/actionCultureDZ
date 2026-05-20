import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Pencil, FileText, Trash2, User, Search } from 'lucide-react';
import MultiLangInput from '@/components/MultiLangInput';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { httpClient } from '@/services/httpClient';
import SectionArticleEditor from '@/components/patrimoine/SectionArticleEditor';
import { PATRIMOINE_SECTIONS, type PatrimoineSection } from '@/services/patrimoineArticles.service';
import {
  lieuIntervenantService,
  getIntervenantNom,
  type LieuIntervenant,
} from '@/services/lieuIntervenant.service';

type MultilingualField = { fr?: string; ar?: string; en?: string; [key: string]: string | undefined };

interface SectionPersonnalitesProps {
  icon: React.ReactNode;
  title: string;
  content?: string | MultilingualField | null;
  lang: string;
  lieuId: number;
  onSaved?: (newContent: MultilingualField) => void;
}

const translate = (v: string | MultilingualField | null | undefined, lang: string): string => {
  if (!v) return '';
  if (typeof v === 'string') return v;
  return v[lang] || v.fr || v.ar || v.en || '';
};

const patrimoineSection: PatrimoineSection | null = (PATRIMOINE_SECTIONS as readonly string[]).includes('personnalites')
  ? 'personnalites' as PatrimoineSection
  : null;

const SectionPersonnalites: React.FC<SectionPersonnalitesProps> = ({
  icon, title, content, lang, lieuId, onSaved
}) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  // ── texte libre ──
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editValue, setEditValue] = useState<MultilingualField>({ fr: '', ar: '', en: '' });
  const [isArticleEditorOpen, setIsArticleEditorOpen] = useState(false);

  // ── intervenants liés ──
  const [intervenants, setIntervenants] = useState<LieuIntervenant[]>([]);
  const [loadingIntervenants, setLoadingIntervenants] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // ── recherche intervenant ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [roleSurSite, setRoleSurSite] = useState('');
  const [periode, setPeriode] = useState('');
  const [adding, setAdding] = useState(false);

  const hasContent = content && translate(content, lang).trim().length > 0;

  // Charger les intervenants liés
  useEffect(() => {
    setLoadingIntervenants(true);
    lieuIntervenantService.getByLieu(lieuId)
      .then(setIntervenants)
      .catch(() => setIntervenants([]))
      .finally(() => setLoadingIntervenants(false));
  }, [lieuId]);

  // Recherche avec debounce
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await lieuIntervenantService.searchIntervenants(searchQuery);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const handleSaveText = async () => {
    if (!editValue.fr?.trim() && !editValue.ar?.trim()) {
      toast({ title: t('common.error'), description: 'Veuillez saisir du contenu (au moins en français ou arabe)', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const response = await httpClient.patch(`/patrimoine/${lieuId}/detail`, { personnalites: editValue });
      if ((response as any).success) {
        toast({ title: 'Contribution enregistrée !', description: 'Merci pour votre contribution' });
        setIsEditing(false);
        onSaved?.(editValue);
      } else {
        toast({ title: t('common.error'), description: (response as any).error || 'Erreur lors de la sauvegarde', variant: 'destructive' });
      }
    } catch (err: unknown) {
      toast({ title: t('common.error'), description: err instanceof Error ? err.message : 'Erreur lors de la sauvegarde', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const resetAddForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelected(null);
    setRoleSurSite('');
    setPeriode('');
  };

  const handleAdd = async () => {
    if (!selected) return;
    setAdding(true);
    try {
      const lien = await lieuIntervenantService.add(lieuId, {
        id_intervenant: selected.id_intervenant,
        role_sur_site: roleSurSite || undefined,
        periode: periode || undefined,
      });
      setIntervenants(prev => [...prev, lien]);
      setIsAddOpen(false);
      resetAddForm();
      toast({ title: 'Personnalité ajoutée', description: `${getIntervenantNom(selected.prenom, lang)} ${getIntervenantNom(selected.nom, lang)} a été associé à ce site` });
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.error || (err instanceof Error ? err.message : 'Erreur');
      toast({ title: t('common.error'), description: msg, variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (lieuIntervenantId: number, nom: string) => {
    try {
      await lieuIntervenantService.remove(lieuId, lieuIntervenantId);
      setIntervenants(prev => prev.filter(i => i.id_lieu_intervenant !== lieuIntervenantId));
      toast({ title: 'Personnalité retirée', description: `${nom} a été retiré de ce site` });
    } catch {
      toast({ title: t('common.error'), description: 'Impossible de retirer cette personnalité', variant: 'destructive' });
    }
  };

  const alreadyLinkedIds = useMemo(() => new Set(intervenants.map(i => i.id_intervenant)), [intervenants]);

  return (
    <>
      {/* ── Section texte libre ── */}
      {hasContent ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">{icon} {title}</CardTitle>
              {isAuthenticated && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={openEditor} className="text-muted-foreground hover:text-primary">
                    <Pencil className="h-4 w-4 mr-1" />{t('common.edit', 'Modifier')}
                  </Button>
                  {patrimoineSection && (
                    <Button variant="ghost" size="sm" onClick={() => setIsArticleEditorOpen(true)} className="text-muted-foreground hover:text-primary">
                      <FileText className="h-4 w-4 mr-1" />{t('patrimoine.contribute.addArticle', 'Article')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed text-muted-foreground whitespace-pre-wrap">{translate(content, lang)}</p>
          </CardContent>
        </Card>
      ) : isAuthenticated ? (
        <Card className="border-dashed border-2 border-muted-foreground/20 bg-muted/30">
          <CardContent className="py-8 text-center">
            <div className="text-4xl mb-3">{icon}</div>
            <h3 className="font-medium mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground mb-4">Cette section n'est pas encore documentée.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={openEditor}>
                <Plus className="h-4 w-4 mr-2" />Texte rapide
              </Button>
              {patrimoineSection && (
                <Button variant="default" onClick={() => setIsArticleEditorOpen(true)}>
                  <FileText className="h-4 w-4 mr-2" />Écrire un article
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Liste des intervenants liés ── */}
      {(intervenants.length > 0 || isAuthenticated) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-primary" />
                Personnalités liées à ce site
                {intervenants.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">({intervenants.length})</span>
                )}
              </CardTitle>
              {isAuthenticated && (
                <Button size="sm" variant="outline" onClick={() => setIsAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />Ajouter
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingIntervenants ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : intervenants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune personnalité associée pour l'instant.
              </p>
            ) : (
              <div className="grid gap-3">
                {intervenants.map(lien => {
                  const inv = lien.Intervenant;
                  const nomComplet = inv
                    ? `${getIntervenantNom(inv.prenom, lang)} ${getIntervenantNom(inv.nom, lang)}`.trim()
                    : `Intervenant #${lien.id_intervenant}`;
                  return (
                    <div key={lien.id_lieu_intervenant} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                      {inv?.photo_url ? (
                        <img src={inv.photo_url} alt={nomComplet} className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{nomComplet}</p>
                        {inv?.titre_professionnel && (
                          <p className="text-xs text-muted-foreground">{inv.titre_professionnel}</p>
                        )}
                        {lien.role_sur_site && (
                          <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded mt-1 mr-1">
                            {lien.role_sur_site}
                          </span>
                        )}
                        {lien.periode && (
                          <span className="inline-block text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded mt-1">
                            {lien.periode}
                          </span>
                        )}
                      </div>
                      {isAuthenticated && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemove(lien.id_lieu_intervenant, nomComplet)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Modal texte libre ── */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">{icon} {title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <MultiLangInput
              name="personnalites"
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
              <Button onClick={handleSaveText} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('common.save', 'Enregistrer')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal ajout intervenant ── */}
      <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetAddForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Ajouter une personnalité
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Recherche */}
            {!selected ? (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher une personnalité (nom, prénom…)"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9"
                    autoFocus
                  />
                </div>

                {searching && (
                  <div className="flex justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-56 overflow-y-auto">
                    {searchResults.map(inv => {
                      const nom = `${getIntervenantNom(inv.prenom, lang)} ${getIntervenantNom(inv.nom, lang)}`.trim();
                      const alreadyLinked = alreadyLinkedIds.has(inv.id_intervenant);
                      return (
                        <button
                          key={inv.id_intervenant}
                          disabled={alreadyLinked}
                          onClick={() => setSelected(inv)}
                          className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {inv.photo_url ? (
                            <img src={inv.photo_url} alt={nom} className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{nom}</p>
                            {inv.titre_professionnel && <p className="text-xs text-muted-foreground truncate">{inv.titre_professionnel}</p>}
                          </div>
                          {alreadyLinked && <span className="text-xs text-muted-foreground">Déjà lié</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

                {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Aucun résultat. Créez d'abord la personnalité dans la section Intervenants.
                  </p>
                )}
              </>
            ) : (
              /* Personnalité sélectionnée — champs optionnels */
              <>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  {selected.photo_url ? (
                    <img src={selected.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {`${getIntervenantNom(selected.prenom, lang)} ${getIntervenantNom(selected.nom, lang)}`.trim()}
                    </p>
                    {selected.titre_professionnel && <p className="text-xs text-muted-foreground">{selected.titre_professionnel}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="text-muted-foreground">
                    Changer
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="role_sur_site">Rôle sur ce site <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
                    <Input
                      id="role_sur_site"
                      placeholder="ex : figure_historique, fondateur, artiste…"
                      value={roleSurSite}
                      onChange={e => setRoleSurSite(e.target.value)}
                      maxLength={80}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="periode">Période <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
                    <Input
                      id="periode"
                      placeholder="ex : XIIIe siècle, 1830–1962…"
                      value={periode}
                      onChange={e => setPeriode(e.target.value)}
                      maxLength={100}
                      className="mt-1"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setIsAddOpen(false); resetAddForm(); }}>
                {t('common.cancel', 'Annuler')}
              </Button>
              {selected && (
                <Button onClick={handleAdd} disabled={adding}>
                  {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Associer
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal articles riches ── */}
      {patrimoineSection && (
        <SectionArticleEditor
          lieuId={lieuId}
          section={patrimoineSection}
          sectionTitle={title}
          sectionIcon={icon}
          isOpen={isArticleEditorOpen}
          onClose={() => setIsArticleEditorOpen(false)}
          onSaved={() => onSaved?.(editValue)}
        />
      )}
    </>
  );
};

export default SectionPersonnalites;
