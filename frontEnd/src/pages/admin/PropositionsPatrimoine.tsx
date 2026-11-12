/**
 * Propositions de modification des sites patrimoine (onglet Patrimoine de l'administration) :
 * hors équipe et créateur du site, une modification attend ici. Accepter la publie (avec l'historique
 * habituel) ; refuser envoie le motif à son auteur.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { messageErreurServeur } from '@/utils/erreurServeur';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Inbox, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { httpClient } from '@/services/httpClient';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { useFormatDate } from '@/hooks/useFormatDate';

interface Proposition {
  id: number; id_lieu: number; lieu_nom: unknown; action: 'detail' | 'personnalite' | 'element_ajout' | 'element_modif' | 'creation';
  donnees: { corps?: Record<string, unknown>; genre?: 'monument' | 'vestige'; idElement?: number; intervenant?: string | null };
  date_creation: string; id_user: number; prenom: unknown; nom: unknown; email: string;
}

// Nom des champs proposés (textes du site, monument ou vestige)
const CHAMPS: Record<string, string> = {
  histoire: 'Histoire', gastronomie: 'Gastronomie', traditions: 'Traditions', artisanat_local: 'Artisanat local',
  personnalites: 'Personnalités', architecture: 'Architecture', infos_pratiques: 'Infos pratiques',
  referencesHistoriques: 'Références historiques', description: 'Description', horaires: 'Horaires', nom: 'Nom', type: 'Type'
};

const lireJson = (v: unknown) => { if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch { return v; } };

const PropositionsPatrimoine: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { toast } = useToast();
  const { formatDate } = useFormatDate();
  const queryClient = useQueryClient();
  const [refus, setRefus] = useState<Proposition | null>(null);
  const [motif, setMotif] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const cle = ['admin-propositions-patrimoine'];

  const { data, isError } = useQuery({
    queryKey: cle,
    queryFn: async () => {
      const reponse = await httpClient.get<Proposition[]>('/patrimoine/admin/propositions');
      if (!reponse.success) throw new Error(reponse.error);
      return reponse.data || [];
    }
  });
  const propositions = data || [];
  if (isError) return <p role="alert" className="text-sm text-destructive">{t('admin.patrimoine.propositions.erreurChargement', 'Les propositions n’ont pas pu être chargées. Rechargez la page.')}</p>;
  if (!propositions.length) return null;

  const texte = (v: unknown) => getLocalizedText(lireJson(v), lang, '');

  const titreAction = (p: Proposition) => {
    const genre = p.donnees.genre === 'vestige' ? t('admin.patrimoine.propositions.vestige', 'vestige') : t('admin.patrimoine.propositions.monument', 'monument');
    switch (p.action) {
      // Lieu ajouté par un membre : « Accepter » le publie, « Refuser » l'archive
      case 'creation': return t('admin.patrimoine.propositions.creation', 'Nouveau lieu proposé par un membre (ouvrez-le pour le vérifier)');
      case 'detail': return t('admin.patrimoine.propositions.detail', 'Textes du site');
      case 'personnalite': return t('admin.patrimoine.propositions.personnalite', 'Personnalité à rattacher');
      case 'element_ajout': return t('admin.patrimoine.propositions.ajout', 'Nouveau {{genre}}', { genre });
      default: return t('admin.patrimoine.propositions.modif', 'Modification d’un {{genre}}', { genre });
    }
  };

  // Contenu proposé, lisible : chaque texte (dans la langue de l'écran, sinon la première remplie)
  const contenu = (p: Proposition) => {
    const corps = p.donnees.corps || {};
    if (p.action === 'personnalite') {
      return [p.donnees.intervenant, corps.role_sur_site, corps.periode, corps.contexte].filter(Boolean).map(String);
    }
    return Object.entries(corps)
      .filter(([cle]) => cle !== 'id_intervenant')
      .map(([cle, valeur]) => `${t(`admin.patrimoine.propositions.champs.${cle}`, CHAMPS[cle] || cle)} : ${typeof valeur === 'string' ? valeur : texte(valeur)}`)
      .filter(ligne => !ligne.endsWith(': '));
  };

  const decider = async (p: Proposition, decision: 'acceptee' | 'refusee', raison?: string) => {
    setEnvoi(true);
    try {
      const res = await httpClient.patch<unknown>(`/patrimoine/propositions/${p.id}`, { decision, ...(raison ? { motif: raison } : {}) });
      if (!res.success) throw new Error(messageErreurServeur(res, t('common.errorOccurred', 'Une erreur est survenue')));
      toast({ title: decision === 'acceptee'
        ? t('admin.patrimoine.propositions.acceptee', 'Proposition publiée : son auteur est prévenu')
        : t('admin.patrimoine.propositions.refusee', 'Proposition refusée : son auteur est prévenu') });
      setRefus(null); setMotif('');
      await queryClient.invalidateQueries({ queryKey: cle });
    } catch (e) {
      toast({ title: t('common.error', 'Erreur'), description: messageErreurServeur(e, t('common.errorOccurred', 'Une erreur est survenue')), variant: 'destructive' });
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Inbox className="h-5 w-5" />
          {t('admin.patrimoine.propositions.titre', { count: propositions.length, defaultValue: 'Propositions à relire ({{count}})' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {propositions.map(p => {
          const qui = `${texte(p.prenom)} ${texte(p.nom)}`.trim();
          return (
            <div key={p.id} className="rounded-lg border p-3 flex flex-col md:flex-row md:items-start gap-3">
              <div className="flex-1 min-w-0 text-sm space-y-1">
                <p>
                  <span className="font-semibold">{titreAction(p)}</span>
                  {' — '}
                  <Link to={`/patrimoine/${p.id_lieu}`} className="font-medium text-primary hover:underline underline-offset-4">{texte(p.lieu_nom)}</Link>
                </p>
                <ul className="text-muted-foreground space-y-1">
                  {contenu(p).map((ligne, i) => (
                    <li key={i} dir="auto">
                      {/* Texte entier avant de publier : un clic l'ouvre */}
                      <details>
                        <summary className="whitespace-pre-line break-words cursor-pointer list-none line-clamp-6 [details[open]>&]:hidden">{ligne}</summary>
                        <p className="whitespace-pre-line break-words">{ligne}</p>
                      </details>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">{qui} ({p.email}) · {formatDate(p.date_creation, { relative: true })}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={envoi} onClick={() => decider(p, 'acceptee')}><CheckCircle className="h-4 w-4 me-1" />{t('admin.patrimoine.propositions.accepter', 'Publier')}</Button>
                <Button size="sm" variant="outline" disabled={envoi} onClick={() => { setRefus(p); setMotif(''); }}><XCircle className="h-4 w-4 me-1" />{t('admin.organisations.refuser', 'Refuser')}</Button>
              </div>
            </div>
          );
        })}
      </CardContent>

      <Dialog open={!!refus} onOpenChange={(o) => { if (!o) setRefus(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.patrimoine.propositions.refuserTitre', 'Refuser la proposition')}</DialogTitle>
            <DialogDescription>{t('admin.organisations.revendications.refuserAide', 'Le motif est envoyé au demandeur.')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motif-proposition">{t('admin.organisations.motif', 'Motif')}</Label>
            <Textarea id="motif-proposition" rows={3} maxLength={1000} value={motif} onChange={(e) => setMotif(e.target.value)} />
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

export default PropositionsPatrimoine;
