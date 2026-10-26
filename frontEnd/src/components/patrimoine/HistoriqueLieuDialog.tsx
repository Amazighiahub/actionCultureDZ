/**
 * HistoriqueLieuDialog — « Historique des modifications » d'un lieu (administration).
 * Chaque modification d'un texte (nom, description, histoire, sections…) : qui, quand, le texte
 * d'avant et celui d'après ; « Revenir à cette version » remet le texte d'avant (toutes les langues).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { httpClient } from '@/services/httpClient';
import { useToast } from '@/hooks/use-toast';
import { useLocalizedDate } from '@/hooks/useLocalizedDate';

type Valeur = string | Record<string, string | undefined> | null;

interface LigneHistorique {
  id_historique: number;
  champ: string;
  libelle: string;
  ancienne_valeur: Valeur;
  nouvelle_valeur: Valeur;
  date: string;
  auteur: string | null;
  id_historique_restaure: number | null;
}

const LANGUES: Record<string, string> = { fr: 'Français', ar: 'العربية', en: 'English', 'tz-ltn': 'Tamaziɣt', 'tz-tfng': 'ⵜⴰⵎⴰⵣⵉⵖⵜ' };

/** Une valeur multilingue → [langue, texte] non vides */
const textes = (v: Valeur): [string, string][] => {
  if (!v) return [];
  if (typeof v === 'string') return v.trim() ? [['fr', v]] : [];
  return Object.entries(v).filter((e): e is [string, string] => typeof e[1] === 'string' && !!e[1].trim());
};

const Texte: React.FC<{ titre: string; valeur: Valeur; vide: string }> = ({ titre, valeur, vide }) => {
  const lignes = textes(valeur);
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground mb-1">{titre}</p>
      {lignes.length === 0 ? <p className="text-sm italic text-muted-foreground">{vide}</p> : lignes.map(([langue, texte]) => (
        <div key={langue} className="mb-2">
          {lignes.length > 1 || langue !== 'fr' ? <Badge variant="outline" className="text-[10px] mb-1">{LANGUES[langue] || langue}</Badge> : null}
          <p dir={langue === 'ar' ? 'rtl' : 'ltr'} className="text-sm whitespace-pre-line line-clamp-6 break-words">{texte}</p>
        </div>
      ))}
    </div>
  );
};

interface Props {
  lieuId: number;
  /** Après un retour en arrière : recharger la page du lieu */
  onRestaure: () => void;
}

const HistoriqueLieuDialog: React.FC<Props> = ({ lieuId, onRestaure }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { formatDate } = useLocalizedDate();
  const [ouvert, setOuvert] = useState(false);
  const [lignes, setLignes] = useState<LigneHistorique[] | null>(null);
  const [aRestaurer, setARestaurer] = useState<LigneHistorique | null>(null);
  const [enCours, setEnCours] = useState(false);

  const charger = useCallback(async () => {
    const res = await httpClient.get<LigneHistorique[]>(`/patrimoine/${lieuId}/historique`);
    setLignes(res.success && Array.isArray(res.data) ? res.data : []);
  }, [lieuId]);

  useEffect(() => { if (ouvert) charger(); }, [ouvert, charger]);

  const restaurer = async () => {
    if (!aRestaurer) return;
    setEnCours(true);
    const res = await httpClient.post(`/patrimoine/${lieuId}/historique/${aRestaurer.id_historique}/restaurer`, {});
    setEnCours(false);
    setARestaurer(null);
    if (res.success) {
      toast({ title: t('patrimoine.historique.restaure', 'Version précédente remise'), description: t('patrimoine.historique.restaureDesc', 'Le texte d’avant est de nouveau affiché.') });
      await charger();
      onRestaure();
    } else {
      toast({ title: t('common.error', 'Erreur'), description: res.error || t('common.errorOccurred', 'Une erreur est survenue'), variant: 'destructive' });
    }
  };

  return (
    <>
      <Dialog open={ouvert} onOpenChange={setOuvert}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="order-last shrink-0">
            <History className="h-4 w-4 me-1" aria-hidden="true" />
            {t('patrimoine.historique.bouton', 'Historique')}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('patrimoine.historique.titre', 'Historique des modifications')}</DialogTitle>
            <DialogDescription>
              {t('patrimoine.historique.description', 'Chaque modification des textes de ce lieu, la plus récente en premier. « Revenir à cette version » remet le texte d’avant, dans toutes les langues.')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3">
            {lignes === null ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label={t('common.loading', 'Chargement…')} /></div>
            ) : lignes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">{t('patrimoine.historique.vide', 'Aucune modification enregistrée pour l’instant.')}</p>
            ) : lignes.map(l => (
              <div key={l.id_historique} className="rounded-lg border p-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">
                    {t('patrimoine.historique.ligne', '{{auteur}} a modifié {{quoi}}', {
                      auteur: l.auteur || t('patrimoine.historique.inconnu', 'Une personne'), quoi: l.libelle
                    })}
                  </span>
                  {l.id_historique_restaure && <Badge variant="secondary">{t('patrimoine.historique.retour', 'retour en arrière')}</Badge>}
                  <span className="text-muted-foreground ms-auto">{formatDate(l.date, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Texte titre={t('patrimoine.historique.avant', 'Avant')} valeur={l.ancienne_valeur} vide={t('patrimoine.historique.videTexte', '(vide)')} />
                  <Texte titre={t('patrimoine.historique.apres', 'Après')} valeur={l.nouvelle_valeur} vide={t('patrimoine.historique.videTexte', '(vide)')} />
                </div>
                <Button variant="outline" size="sm" onClick={() => setARestaurer(l)}>
                  <RotateCcw className="h-4 w-4 me-1" aria-hidden="true" />
                  {t('patrimoine.historique.revenir', 'Revenir à cette version')}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!aRestaurer} onOpenChange={(o) => { if (!o) setARestaurer(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('patrimoine.historique.confirmerTitre', 'Revenir à la version précédente ?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('patrimoine.historique.confirmerTexte', '{{quoi}} reprendra le texte « Avant », dans toutes les langues. Le texte actuel restera dans l’historique.', { quoi: aRestaurer?.libelle || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enCours}>{t('common.cancel', 'Annuler')}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); restaurer(); }} disabled={enCours}>
              {enCours && <Loader2 className="h-4 w-4 me-1 animate-spin" aria-hidden="true" />}
              {t('patrimoine.historique.revenir', 'Revenir à cette version')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default HistoriqueLieuDialog;
