/**
 * Demandes « C'est mon organisation » (onglet Organisations de l'administration) :
 * accepter (le demandeur devient responsable) ou refuser avec un motif.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { httpClient } from '@/services/httpClient';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { useLocalizedDate } from '@/hooks/useLocalizedDate';
import { organisationPath } from '@/utils/slug';

interface Demande {
  id: number; message?: string | null; date_creation: string;
  id_organisation: number; organisation_nom: unknown;
  id_user: number; prenom: unknown; nom: unknown; email: string;
}

const lireJson = (v: unknown) => { if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch { return v; } };

const DemandesResponsable: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { toast } = useToast();
  const { formatDate } = useLocalizedDate();
  const queryClient = useQueryClient();
  const [refus, setRefus] = useState<Demande | null>(null);
  const [motif, setMotif] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const cle = ['admin-revendications'];

  const { data } = useQuery({
    queryKey: cle,
    queryFn: async () => (await httpClient.get<Demande[]>('/organisations/admin/revendications')).data || []
  });
  const demandes = data || [];
  if (!demandes.length) return null;

  const decider = async (d: Demande, decision: 'acceptee' | 'refusee', raison?: string) => {
    setEnvoi(true);
    try {
      const res = await httpClient.patch<unknown>(`/organisations/revendications/${d.id}`, { decision, ...(raison ? { motif: raison } : {}) });
      if (!res.success) throw new Error(res.error);
      toast({ title: decision === 'acceptee'
        ? t('admin.organisations.revendications.acceptee', 'Demande acceptée : il gère maintenant la page')
        : t('admin.organisations.revendications.refusee', 'Demande refusée : le demandeur est prévenu') });
      setRefus(null); setMotif('');
      await queryClient.invalidateQueries({ queryKey: cle });
      await queryClient.invalidateQueries({ queryKey: ['admin-organisations'] });
    } catch (e) {
      toast({ title: t('common.error', 'Erreur'), description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          {t('admin.organisations.revendications.titre', { count: demandes.length, defaultValue: 'Demandes pour gérer une page ({{count}})' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {demandes.map(d => {
          const nomOrg = getLocalizedText(lireJson(d.organisation_nom), lang, '');
          const qui = `${getLocalizedText(lireJson(d.prenom), lang, '')} ${getLocalizedText(lireJson(d.nom), lang, '')}`.trim();
          return (
            <div key={d.id} className="rounded-lg border p-3 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1 min-w-0 text-sm space-y-1">
                <p>
                  <span className="font-semibold">{qui}</span> <span className="text-muted-foreground">({d.email})</span>
                  {' → '}
                  <Link to={organisationPath(d.id_organisation, lireJson(d.organisation_nom))} className="font-medium text-primary hover:underline underline-offset-4">{nomOrg}</Link>
                </p>
                {d.message && <p className="text-muted-foreground whitespace-pre-line" dir="auto">« {d.message} »</p>}
                <p className="text-xs text-muted-foreground">{formatDate(d.date_creation, { relative: true })}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={envoi} onClick={() => decider(d, 'acceptee')}><CheckCircle className="h-4 w-4 me-1" />{t('admin.organisations.revendications.accepter', 'Accepter')}</Button>
                <Button size="sm" variant="outline" disabled={envoi} onClick={() => { setRefus(d); setMotif(''); }}><XCircle className="h-4 w-4 me-1" />{t('admin.organisations.refuser', 'Refuser')}</Button>
              </div>
            </div>
          );
        })}
      </CardContent>

      <Dialog open={!!refus} onOpenChange={(o) => { if (!o) setRefus(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.organisations.revendications.refuserTitre', 'Refuser la demande')}</DialogTitle>
            <DialogDescription>{t('admin.organisations.revendications.refuserAide', 'Le motif est envoyé au demandeur.')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motif-revendication">{t('admin.organisations.motif', 'Motif')}</Label>
            <Textarea id="motif-revendication" rows={3} maxLength={1000} value={motif} onChange={(e) => setMotif(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRefus(null)}>{t('common.cancel', 'Annuler')}</Button>
            <Button variant="destructive" disabled={!motif.trim() || envoi} onClick={() => refus && decider(refus, 'refusee', motif.trim())}>{t('admin.organisations.refuser', 'Refuser')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default DemandesResponsable;
