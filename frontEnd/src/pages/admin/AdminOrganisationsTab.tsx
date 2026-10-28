/**
 * AdminOrganisationsTab - Vérification des pages d'organisations (associations, maisons d'édition…)
 * « Publier la page », ou « Refuser » avec un motif envoyé aux responsables de l'organisation.
 */
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building, CheckCircle, XCircle, Eye, RefreshCw, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { EmptyState, LoadingSkeleton } from '@/components/shared';
import { httpClient } from '@/services/httpClient';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { getAssetUrl } from '@/helpers/assetUrl';
import { organisationPath } from '@/utils/slug';

interface OrganisationModeration {
  id_organisation: number;
  nom: unknown;
  description?: unknown;
  statut: 'en_attente' | 'valide' | 'rejete';
  logo_url?: string | null;
  TypeOrganisation?: { nom: unknown } | null;
  Wilaya?: { nom?: string; wilaya_name_ascii?: string } | null;
}

const STATUTS = ['tous', 'en_attente', 'valide', 'rejete'] as const;
const COULEUR: Record<string, 'default' | 'secondary' | 'destructive'> = { valide: 'default', en_attente: 'secondary', rejete: 'destructive' };

const AdminOrganisationsTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [recherche, setRecherche] = useState('');
  const [statut, setStatut] = useState<string>('en_attente');
  const [refus, setRefus] = useState<{ id: number; nom: string } | null>(null);
  const [motif, setMotif] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const cle = ['admin-organisations'];
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: cle,
    queryFn: async () => {
      const res = await httpClient.get<OrganisationModeration[]>('/organisations/admin/liste');
      if (!res.success) throw new Error(res.error || 'erreur');
      return res.data || [];
    }
  });

  const toutes = useMemo(() => data || [], [data]);
  const enAttente = toutes.filter(o => o.statut === 'en_attente').length;
  const liste = useMemo(() => toutes.filter(o => {
    if (statut !== 'tous' && o.statut !== statut) return false;
    const q = recherche.trim().toLowerCase();
    return !q || getLocalizedText(o.nom, lang).toLowerCase().includes(q);
  }), [toutes, statut, recherche, lang]);

  const decider = async (id: number, decision: 'valide' | 'rejete', raison?: string) => {
    setEnvoi(true);
    try {
      const res = await httpClient.patch<unknown>(`/organisations/${id}/statut`, { statut: decision, ...(raison ? { motif: raison } : {}) });
      if (!res.success) throw new Error(res.error);
      toast({ title: decision === 'valide' ? t('admin.organisations.publiee', 'Page publiée') : t('admin.organisations.refusee', 'Page refusée : les responsables sont prévenus') });
      setRefus(null);
      setMotif('');
      await queryClient.invalidateQueries({ queryKey: cle });
    } catch (e) {
      toast({ title: t('common.error', 'Erreur'), description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building className="h-6 w-6" />
            {t('admin.organisations.titre', 'Organisations')}
          </h2>
          <p className="text-muted-foreground">
            {t('admin.organisations.enAttente', { count: enAttente, defaultValue: '{{count}} page(s) à vérifier' })}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 me-2" />
          {t('common.refresh', 'Actualiser')}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input className="ps-9" value={recherche} onChange={(e) => setRecherche(e.target.value)}
            placeholder={t('organisations.search', 'Rechercher une organisation…')} aria-label={t('organisations.search', 'Rechercher une organisation…')} />
        </div>
        <Select value={statut} onValueChange={setStatut}>
          <SelectTrigger className="sm:w-[200px]" aria-label={t('admin.organisations.statut', 'Statut')}><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUTS.map(s => <SelectItem key={s} value={s}>{s === 'tous' ? t('common.all', 'Tous') : t(`admin.organisations.statuts.${s}`, s)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSkeleton type="list" count={4} />
      ) : isError ? (
        <Card className="p-6 text-center text-destructive">{t('common.loadError', 'Erreur de chargement')}</Card>
      ) : liste.length === 0 ? (
        <EmptyState type="documents" title={t('admin.organisations.aucune', 'Aucune organisation dans cette liste')} />
      ) : (
        <div className="space-y-3">
          {liste.map(o => {
            const nom = getLocalizedText(o.nom, lang, t('common.unnamed', 'Sans nom'));
            return (
              <Card key={o.id_organisation}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="h-14 w-14 shrink-0 rounded-lg border bg-white flex items-center justify-center overflow-hidden">
                    {o.logo_url ? <img src={getAssetUrl(o.logo_url, { width: 112 })} alt="" className="h-full w-full object-contain" /> : <Building className="h-6 w-6 text-muted-foreground" aria-hidden="true" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{nom}</p>
                      <Badge variant={COULEUR[o.statut]}>{t(`admin.organisations.statuts.${o.statut}`, o.statut)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {[getLocalizedText(o.TypeOrganisation?.nom, lang, ''), o.Wilaya ? (lang.startsWith('ar') && o.Wilaya.nom) || o.Wilaya.wilaya_name_ascii : ''].filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{getLocalizedText(o.description, lang, '')}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link to={organisationPath(o.id_organisation, o.nom)}><Eye className="h-4 w-4 me-1" />{t('admin.organisations.voir', 'Voir la page')}</Link>
                    </Button>
                    {o.statut !== 'valide' && (
                      <Button size="sm" disabled={envoi} onClick={() => decider(o.id_organisation, 'valide')}>
                        <CheckCircle className="h-4 w-4 me-1" />{t('admin.organisations.publier', 'Publier la page')}
                      </Button>
                    )}
                    {o.statut !== 'rejete' && (
                      <Button size="sm" variant="outline" disabled={envoi} onClick={() => { setRefus({ id: o.id_organisation, nom }); setMotif(''); }}>
                        <XCircle className="h-4 w-4 me-1" />{t('admin.organisations.refuser', 'Refuser')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!refus} onOpenChange={(ouvert) => { if (!ouvert) setRefus(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.organisations.refuserTitre', { nom: refus?.nom, defaultValue: 'Refuser « {{nom}} »' })}</DialogTitle>
            <DialogDescription>{t('admin.organisations.refuserAide', 'Le motif est envoyé aux responsables de l’organisation : ils pourront corriger la page, qui repartira en vérification.')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motif-refus">{t('admin.organisations.motif', 'Motif')}</Label>
            <Textarea id="motif-refus" value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={1000} rows={4} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRefus(null)}>{t('common.cancel', 'Annuler')}</Button>
            <Button variant="destructive" disabled={!motif.trim() || envoi} onClick={() => refus && decider(refus.id, 'rejete', motif.trim())}>
              {t('admin.organisations.refuser', 'Refuser')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrganisationsTab;
