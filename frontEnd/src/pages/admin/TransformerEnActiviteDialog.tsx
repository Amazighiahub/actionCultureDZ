/**
 * Événement créé par erreur au lieu d'une activité (2026-11-17) : l'administration le transforme en
 * activité d'un autre événement du même organisateur. 1. choisir l'événement gardé ; 2. lire le
 * résumé (activités, photos, inscrits déplacés) ; 3. confirmer. Les inscrits sont prévenus.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ListPlus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { httpClient } from '@/services/httpClient';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { messageErreurServeur } from '@/utils/erreurServeur';
import { useFormatDate } from '@/hooks/useFormatDate';

interface EvenementCourt { id_evenement: number; nom_evenement: unknown; date_debut?: string | null; statut?: string }
interface Apercu { activites: number; photos: number; inscrits: number; dejaInscrits: number }
/** Résumé lu pour un événement précis : seul celui de l'événement coché est montré et confirmé */
interface ApercuPour { pour: number; donnees: Apercu }

const TransformerEnActiviteDialog: React.FC<{
  source: EvenementCourt | null;
  onClose: () => void;
  onTransforme: () => void;
}> = ({ source, onClose, onTransforme }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { formatDate } = useFormatDate();
  const [cibles, setCibles] = useState<EvenementCourt[] | null>(null);
  const [cible, setCible] = useState<number | null>(null);
  const [resume, setResume] = useState<ApercuPour | null>(null);
  const choixActuel = useRef<{ source?: number; cible: number | null }>({ cible: null });
  choixActuel.current = { source: source?.id_evenement, cible };
  const apercu = resume && resume.pour === cible ? resume.donnees : null;
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const nom = (e: EvenementCourt) => getLocalizedText(e.nom_evenement, lang, t('common.unnamed', 'Sans nom'));
  const echec = t('common.errorOccurred', 'Une erreur est survenue');

  // Autre événement à transformer : on repart de zéro
  useEffect(() => {
    setCibles(null); setCible(null); setResume(null); setErreur(null);
    if (!source) return;
    let actuel = true;
    httpClient.get<EvenementCourt[]>(`/evenements/${source.id_evenement}/transformer`)
      .then(res => {
        if (!res.success) throw res;
        if (actuel) setCibles(res.data || []);
      })
      .catch((e) => { if (actuel) { setCibles([]); setErreur(messageErreurServeur(e, echec)); } });
    return () => { actuel = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  // Un autre choix efface le résumé : il faut le relire avant de confirmer
  useEffect(() => { setResume(null); setErreur(null); }, [cible]);

  // Une réponse arrivée après un autre choix (ou un autre événement) est ignorée
  const encoreActuel = (idSource: number, idCible: number) =>
    choixActuel.current.source === idSource && choixActuel.current.cible === idCible;

  const lireResume = async () => {
    if (!source || !cible) return;
    const idSource = source.id_evenement;
    const idCible = cible;
    try {
      const res = await httpClient.get<Apercu>(`/evenements/${idSource}/transformer/apercu`, { cible: idCible });
      if (!res.success || !res.data) throw res;
      if (encoreActuel(idSource, idCible)) setResume({ pour: idCible, donnees: res.data });
    } catch (e) {
      if (encoreActuel(idSource, idCible)) setErreur(messageErreurServeur(e, echec));
    }
  };

  const confirmer = async () => {
    // Seul l'événement dont le résumé est affiché peut être confirmé
    if (!source || !resume || resume.pour !== cible) return;
    setEnvoi(true);
    try {
      const res = await httpClient.post<unknown>(`/evenements/${source.id_evenement}/transformer`, { cible: resume.pour });
      if (!res.success) throw res;
      onTransforme();
    } catch (e) {
      setErreur(messageErreurServeur(e, echec));
    } finally {
      setEnvoi(false);
    }
  };

  const nomCible = cibles?.find(c => c.id_evenement === cible);

  return (
    <Dialog open={!!source} onOpenChange={(ouvert) => { if (!ouvert && !envoi) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ListPlus className="h-5 w-5" />
            {t('admin.events.transformer.titre', 'Transformer en activité')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.events.transformer.aide', {
              nom: source ? nom(source) : '',
              defaultValue: '« {{nom}} » deviendra une activité du programme de l’événement choisi. Ses photos, inscrits et commentaires y seront déplacés, puis il sera supprimé. Les inscrits sont prévenus.'
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t('admin.events.transformer.choisir', 'Événement qui reçoit l’activité (même organisateur)')}</p>
          {cibles === null && <p className="text-sm text-muted-foreground">{t('common.loading', 'Chargement…')}</p>}
          {cibles?.length === 0 && !erreur && (
            <p className="text-sm text-muted-foreground">{t('admin.events.transformer.aucun', 'Cet organisateur n’a pas d’autre événement.')}</p>
          )}
          <div role="radiogroup" className="space-y-2">
            {cibles?.map(c => (
              <label key={c.id_evenement} className="flex items-center gap-3 rounded-md border p-2 cursor-pointer hover:bg-muted/50">
                <input type="radio" name="cible" className="h-4 w-4" checked={cible === c.id_evenement} onChange={() => setCible(c.id_evenement)} />
                <span className="flex-1 min-w-0">
                  <span className="font-medium">{nom(c)}</span>
                  {c.date_debut && <span className="block text-xs text-muted-foreground">{formatDate(c.date_debut)}</span>}
                </span>
              </label>
            ))}
          </div>

          {apercu && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('admin.events.transformer.resume', {
                  cible: nomCible ? nom(nomCible) : '', activites: apercu.activites, photos: apercu.photos,
                  inscrits: apercu.inscrits, deja: apercu.dejaInscrits,
                  defaultValue: 'Vers « {{cible}} » : {{activites}} activité(s), {{photos}} photo(s) ou document(s), {{inscrits}} inscrit(s) déplacé(s) ; {{deja}} personne(s) y étaient déjà inscrites. L’événement en double sera supprimé.'
                })}
              </AlertDescription>
            </Alert>
          )}
          {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" disabled={envoi} onClick={onClose}>{t('common.cancel', 'Annuler')}</Button>
          {!apercu ? (
            <Button disabled={!cible} onClick={lireResume}>{t('admin.events.transformer.voirResume', 'Voir le résumé')}</Button>
          ) : (
            <Button variant="destructive" disabled={envoi} onClick={confirmer}>
              <ListPlus className="h-4 w-4 me-2" />{t('admin.events.transformer.confirmer', 'Transformer')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransformerEnActiviteDialog;
