/**
 * PropositionsArticle — en bas d'un article :
 * - auteur de l'article et administration : propositions en attente, à examiner (motif, ce qui
 *   change bloc par bloc, en vert / rouge) puis accepter ou refuser avec un motif ;
 * - personne qui a proposé : l'état de ses propositions (en attente, refusée et pourquoi) ;
 * - tout le monde : l'historique des contributions acceptées (qui, quand, pourquoi).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, GitPullRequestArrow, History, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useFormatDate } from '@/hooks/useFormatDate';
import { getAssetUrl } from '@/helpers/assetUrl';
import { getLocalizedText } from '@/utils/getLocalizedText';
import {
  articleRevisionService, comparerBlocs,
  type BlocRevision, type RevisionDetail, type RevisionResume
} from '@/services/articleRevision.service';

interface Props {
  idOeuvre: number;
  /** Blocs actuels de l'article, pour la comparaison */
  blocsActuels: BlocRevision[];
  titreActuel: unknown;
  descriptionActuelle: unknown;
  /** ?proposition=… (lien de la notification) : ouvre directement cette proposition */
  propositionAOuvrir?: number | null;
  /** Après une acceptation : l'article est rechargé */
  onAcceptee: () => void;
}

const nomDe = (r: RevisionResume) => [getLocalizedText(r.Auteur?.prenom), getLocalizedText(r.Auteur?.nom)].filter(Boolean).join(' ').trim();

/** Un bloc, en résumé lisible */
const ResumeBloc: React.FC<{ bloc: BlocRevision }> = ({ bloc }) => {
  const meta = (bloc.metadata || {}) as Record<string, unknown>;
  const texte = (bloc.contenu || '').trim();
  switch (bloc.type_block) {
    case 'heading': return <p className="font-semibold">{texte}</p>;
    case 'citation': return <p className="italic">« {texte} »{meta.author ? ` — ${String(meta.author)}` : ''}</p>;
    case 'image': {
      const url = bloc.media?.url || (meta.url as string | undefined);
      return (
        <div className="flex items-center gap-3">
          {url && <img src={getAssetUrl(url, { width: 160 })} alt="" className="h-14 w-20 rounded object-cover" />}
          <span className="text-sm">{String(meta.caption || '') || 'Image'}</span>
        </div>
      );
    }
    case 'list': return <p className="text-sm">{(Array.isArray(bloc.contenu_json) ? bloc.contenu_json : []).join(' · ')}</p>;
    case 'separator': return <p className="text-sm text-muted-foreground">— séparateur —</p>;
    case 'table': return <p className="text-sm">Tableau : {((bloc.contenu_json as { headers?: string[] } | null)?.headers || []).join(', ')}</p>;
    default: return <p className="text-sm whitespace-pre-line">{texte.length > 400 ? `${texte.slice(0, 400)}…` : texte}</p>;
  }
};

const PropositionsArticle: React.FC<Props> = ({ idOeuvre, blocsActuels, titreActuel, descriptionActuelle, propositionAOuvrir, onAcceptee }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { formatDate } = useFormatDate();
  const [peutDecider, setPeutDecider] = useState(false);
  const [revisions, setRevisions] = useState<RevisionResume[]>([]);
  const [detail, setDetail] = useState<RevisionDetail | null>(null);
  const [chargementDetail, setChargementDetail] = useState(false);
  const [motifRefus, setMotifRefus] = useState('');
  const [refusOuvert, setRefusOuvert] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    try {
      const res = await articleRevisionService.lister(idOeuvre);
      if (res.success && res.data) { setRevisions(res.data.revisions); setPeutDecider(res.data.peut_decider); }
    } catch { /* section simplement absente */ }
  }, [idOeuvre]);
  useEffect(() => { charger(); }, [charger, user?.id_user]);

  const ouvrir = useCallback(async (idRevision: number) => {
    setChargementDetail(true); setRefusOuvert(false); setMotifRefus('');
    try {
      const res = await articleRevisionService.detail(idOeuvre, idRevision);
      if (res.success && res.data) setDetail(res.data);
    } finally {
      setChargementDetail(false);
    }
  }, [idOeuvre]);
  useEffect(() => { if (propositionAOuvrir && user) ouvrir(propositionAOuvrir); }, [propositionAOuvrir, user, ouvrir]);

  const comparaison = useMemo(() => (detail ? comparerBlocs(blocsActuels, detail.contenu.blocks || []) : []), [detail, blocsActuels]);
  const titreChange = detail && detail.contenu.titre != null && getLocalizedText(detail.contenu.titre) !== getLocalizedText(titreActuel);
  const chapeauChange = detail && detail.contenu.description != null && getLocalizedText(detail.contenu.description) !== getLocalizedText(descriptionActuelle);

  const decider = async (decision: 'accepter' | 'refuser') => {
    if (!detail) return;
    if (decision === 'refuser' && motifRefus.trim().length < 3) {
      toast({ title: t('revisions.raisonRequise', 'Expliquez pourquoi la proposition est refusée'), variant: 'destructive' });
      return;
    }
    setEnvoi(true);
    try {
      const res = await articleRevisionService.decider(idOeuvre, detail.id_revision, decision, motifRefus.trim() || undefined);
      if (!res.success) throw new Error(res.error);
      toast({ title: decision === 'accepter' ? t('revisions.acceptee', 'Proposition acceptée : l’article est mis à jour') : t('revisions.refusee', 'Proposition refusée') });
      setDetail(null);
      await charger();
      if (decision === 'accepter') onAcceptee();
    } catch (e) {
      toast({ title: t('common.error', 'Erreur'), description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setEnvoi(false);
    }
  };

  const enAttente = revisions.filter(r => r.statut === 'en_attente');
  const acceptees = revisions.filter(r => r.statut === 'acceptee');
  const miennes = revisions.filter(r => r.id_auteur === user?.id_user && r.statut !== 'acceptee');
  const date = (d?: string | null) => (d ? formatDate(new Date(d), { day: 'numeric', month: 'long', year: 'numeric' }) : '');

  if (!enAttente.length && !acceptees.length && !miennes.length) return null;

  return (
    <section className="mt-10 space-y-6" aria-label={t('revisions.section', 'Contributions à l’article')}>
      {peutDecider && enAttente.length > 0 && (
        <div className="rounded-xl border-2 border-amber-400/70 bg-amber-50 dark:bg-amber-950/30 p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <GitPullRequestArrow className="h-5 w-5 text-amber-600" aria-hidden="true" />
            {t('revisions.enAttente', { defaultValue: '{{count}} proposition(s) de modification en attente', count: enAttente.length })}
          </h2>
          <ul className="space-y-2">
            {enAttente.map(r => (
              <li key={r.id_revision} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background p-3 border">
                <div className="min-w-0">
                  <p className="font-medium">{r.motif}</p>
                  <p className="text-xs text-muted-foreground">{nomDe(r)} · {date(r.date_creation)}</p>
                </div>
                <Button size="sm" onClick={() => ouvrir(r.id_revision)} disabled={chargementDetail}>{t('revisions.examiner', 'Examiner')}</Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!peutDecider && miennes.length > 0 && (
        <div className="rounded-xl border p-5 space-y-2">
          <h2 className="font-semibold">{t('revisions.mesPropositions', 'Vos propositions')}</h2>
          {miennes.map(r => (
            <div key={r.id_revision} className="text-sm">
              <Badge variant={r.statut === 'refusee' ? 'destructive' : 'outline'} className="me-2">
                {r.statut === 'refusee' ? t('revisions.statutRefusee', 'Refusée') : t('revisions.statutAttente', 'En attente de validation')}
              </Badge>
              {r.motif}
              {r.statut === 'refusee' && r.motif_refus && <p className="mt-1 text-muted-foreground">{t('revisions.raison', 'Raison')} : {r.motif_refus}</p>}
            </div>
          ))}
        </div>
      )}

      {acceptees.length > 0 && (
        <div className="rounded-xl border p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-3"><History className="h-4 w-4 text-primary" aria-hidden="true" />{t('revisions.historique', 'Contributions')}</h2>
          <ul className="space-y-2 text-sm">
            {acceptees.map(r => (
              <li key={r.id_revision}><span className="font-medium">{nomDe(r)}</span> · {date(r.date_decision || r.date_creation)} — {r.motif}</li>
            ))}
          </ul>
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{t('revisions.examen', 'Proposition de modification')}</DialogTitle>
                <DialogDescription>{nomDe(detail)} · {date(detail.date_creation)}</DialogDescription>
              </DialogHeader>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('revisions.motif', 'Motif de la modification')}</p>
                <p className="font-medium">{detail.motif}</p>
              </div>

              {titreChange && (
                <div className="text-sm space-y-1">
                  <p className="font-medium">{t('revisions.titreModifie', 'Titre')}</p>
                  <p className="rounded bg-red-50 dark:bg-red-950/40 px-2 py-1 line-through">{getLocalizedText(titreActuel)}</p>
                  <p className="rounded bg-green-50 dark:bg-green-950/40 px-2 py-1">{getLocalizedText(detail.contenu.titre)}</p>
                </div>
              )}
              {chapeauChange && (
                <div className="text-sm space-y-1">
                  <p className="font-medium">{t('revisions.chapeauModifie', 'Chapeau')}</p>
                  <p className="rounded bg-red-50 dark:bg-red-950/40 px-2 py-1 line-through">{getLocalizedText(descriptionActuelle)}</p>
                  <p className="rounded bg-green-50 dark:bg-green-950/40 px-2 py-1">{getLocalizedText(detail.contenu.description)}</p>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-sm font-medium">{t('revisions.contenu', 'Ce qui change dans le contenu')}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="inline-block h-2 w-2 rounded-sm bg-green-500 me-1" />{t('revisions.legendeAjout', 'ajouté')}
                  <span className="inline-block h-2 w-2 rounded-sm bg-red-500 ms-3 me-1" />{t('revisions.legendeRetrait', 'retiré')}
                  <span className="inline-block h-2 w-2 rounded-sm bg-muted-foreground/40 ms-3 me-1" />{t('revisions.legendeIdentique', 'inchangé')}
                </p>
                <ol className="space-y-1.5 mt-2">
                  {comparaison.map((l, i) => (
                    <li key={i} className={`rounded-md border-s-4 px-3 py-2 ${l.etat === 'ajoute' ? 'border-green-500 bg-green-50 dark:bg-green-950/40' : l.etat === 'retire' ? 'border-red-500 bg-red-50 dark:bg-red-950/40 line-through opacity-80' : 'border-transparent bg-muted/40 text-muted-foreground'}`}>
                      <ResumeBloc bloc={l.bloc} />
                    </li>
                  ))}
                </ol>
              </div>

              {detail.peut_decider && detail.statut === 'en_attente' && (
                <div className="space-y-3 border-t pt-4">
                  {refusOuvert && (
                    <div className="space-y-1.5">
                      <Label htmlFor="motif-refus">{t('revisions.pourquoiRefus', 'Pourquoi refusez-vous ? (la personne recevra ce message)')}</Label>
                      <Textarea id="motif-refus" value={motifRefus} onChange={(e) => setMotifRefus(e.target.value)} rows={2} maxLength={2000} />
                    </div>
                  )}
                  <div className="flex flex-wrap justify-end gap-2">
                    {refusOuvert ? (
                      <Button variant="destructive" onClick={() => decider('refuser')} disabled={envoi}><X className="h-4 w-4 me-1" />{t('revisions.confirmerRefus', 'Confirmer le refus')}</Button>
                    ) : (
                      <Button variant="outline" onClick={() => setRefusOuvert(true)} disabled={envoi}><X className="h-4 w-4 me-1" />{t('revisions.refuser', 'Refuser')}</Button>
                    )}
                    <Button onClick={() => decider('accepter')} disabled={envoi}>
                      {envoi ? <Loader2 className="h-4 w-4 me-1 animate-spin" /> : <Check className="h-4 w-4 me-1" />}
                      {t('revisions.accepter', 'Accepter et publier')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default PropositionsArticle;
