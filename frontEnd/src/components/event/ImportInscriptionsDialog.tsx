/**
 * ImportInscriptionsDialog — « Importer une liste (Excel) » dans Gérer › Participants.
 * 1. le classeur (export d'un formulaire en ligne) ; 2. l'aperçu : une ligne par personne, cochée
 * si elle sera inscrite, avec ses remarques ; 3. le bilan. Les personnes sont inscrites « En
 * attente » (l'organisateur confirme ensuite) ; un compte visiteur est créé pour qui n'en a pas,
 * avec un email d'invitation pour choisir son mot de passe.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { httpClient } from '@/services/httpClient';

type Action = 'creer' | 'inscrire' | 'deja_inscrit' | 'doublon' | 'invalide';
interface LigneApercu {
  ligne: number;
  nom: string;
  email: string;
  reponses: Record<string, unknown>;
  montant: number | null;
  remarques: string[];
  action: Action;
}
interface Apercu {
  colonnes: { titre: string; cible: string | null }[];
  lignes: LigneApercu[];
}
interface Bilan { comptes_crees: number; inscrits: number; invitations: number; erreurs: string[] }

const IMPORTABLES: Action[] = ['creer', 'inscrire'];

interface Props {
  evenementId: number;
  ouvert: boolean;
  onFermer: () => void;
  onImporte: () => void;
}

const ImportInscriptionsDialog: React.FC<Props> = ({ evenementId, ouvert, onFermer, onImporte }) => {
  const { t } = useTranslation();
  const { formatPrice } = useLocalizedNumber();
  const [fichier, setFichier] = useState<File | null>(null);
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [cochees, setCochees] = useState<Set<number>>(new Set());
  const [inviter, setInviter] = useState(true);
  const [bilan, setBilan] = useState<Bilan | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const formulaire = (extra: Record<string, string> = {}) => {
    const fd = new FormData();
    if (fichier) fd.append('fichier', fichier);
    for (const [k, v] of Object.entries(extra)) fd.append(k, v);
    return fd;
  };

  const fermer = () => {
    setFichier(null); setApercu(null); setBilan(null); setErreur(null); setCochees(new Set());
    onFermer();
  };

  const lireApercu = async () => {
    if (!fichier) return;
    setEnCours(true); setErreur(null);
    const res = await httpClient.upload<Apercu>(`/evenements/${evenementId}/participants/import/apercu`, formulaire());
    setEnCours(false);
    if (!res.success || !res.data) { setErreur(res.error || t('pro.participants.import.erreurLecture', 'Le fichier n’a pas pu être lu.')); return; }
    setApercu(res.data);
    setCochees(new Set(res.data.lignes.filter(l => IMPORTABLES.includes(l.action)).map(l => l.ligne)));
  };

  const importer = async () => {
    setEnCours(true); setErreur(null);
    const res = await httpClient.upload<Bilan>(`/evenements/${evenementId}/participants/import`,
      formulaire({ lignes: JSON.stringify([...cochees]), inviter: String(inviter) }));
    setEnCours(false);
    if (!res.success || !res.data) { setErreur(res.error || t('pro.participants.import.erreurImport', 'L’import a échoué.')); return; }
    setBilan(res.data);
    onImporte();
  };

  const basculer = (ligne: number) => setCochees(prev => {
    const s = new Set(prev);
    if (s.has(ligne)) s.delete(ligne); else s.add(ligne);
    return s;
  });

  const libelleAction: Record<Action, string> = {
    creer: t('pro.participants.import.creer', 'Nouveau compte'),
    inscrire: t('pro.participants.import.inscrire', 'Compte existant'),
    deja_inscrit: t('pro.participants.import.dejaInscrit', 'Déjà inscrit'),
    doublon: t('pro.participants.import.doublon', 'Email en double'),
    invalide: t('pro.participants.import.invalide', 'Email non valable'),
  };
  const nonReprises = apercu?.colonnes.filter(c => !c.cible).map(c => c.titre) || [];

  return (
    <Dialog open={ouvert} onOpenChange={(o) => { if (!o) fermer(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
            {t('pro.participants.import.titre', 'Importer une liste d’inscriptions')}
          </DialogTitle>
          <DialogDescription>
            {t('pro.participants.import.description', 'Le classeur Excel de votre formulaire en ligne : une ligne par personne, les titres des colonnes sur la première ligne. Les personnes sont inscrites « En attente » : vous confirmez ensuite.')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {!apercu && !bilan && (
            <div className="space-y-3">
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                aria-label={t('pro.participants.import.fichier', 'Classeur Excel (.xlsx)')}
                onChange={(e) => setFichier(e.target.files?.[0] || null)}
                className="block w-full text-sm file:me-3 file:rounded-md file:border file:bg-background file:px-3 file:py-2"
              />
              <p className="text-sm text-muted-foreground">
                {t('pro.participants.import.aide', 'Rien n’est enregistré à cette étape : vous verrez d’abord la liste.')}
              </p>
            </div>
          )}

          {apercu && !bilan && (
            <>
              <p className="text-sm">
                {t('pro.participants.import.resume', '{{n}} personne(s) cochée(s) sur {{total}}.', { n: cochees.size, total: apercu.lignes.length })}
              </p>
              {nonReprises.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {t('pro.participants.import.colonnesIgnorees', 'Colonnes non reprises :')} {nonReprises.join(', ')}
                </p>
              )}
              <div className="divide-y rounded-lg border">
                {apercu.lignes.map(l => {
                  const importable = IMPORTABLES.includes(l.action);
                  return (
                    <label key={l.ligne} className={`flex gap-3 p-3 ${importable ? 'cursor-pointer' : 'opacity-60'}`}>
                      <Checkbox
                        checked={cochees.has(l.ligne)}
                        disabled={!importable}
                        onCheckedChange={() => basculer(l.ligne)}
                        aria-label={l.nom || l.email}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{l.nom || '—'}</span>
                          <span className="text-sm text-muted-foreground break-all">{l.email}</span>
                          <Badge variant={importable ? 'secondary' : 'outline'}>{libelleAction[l.action]}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {[l.reponses.profil, l.reponses.profil_autre && `(${l.reponses.profil_autre})`, l.reponses.presence].filter(Boolean).join(' · ')}
                          {l.montant !== null && l.montant !== undefined && ` · ${l.montant === 0 ? t('events.free', 'Gratuit') : formatPrice(l.montant)}`}
                        </p>
                        {l.remarques.length > 0 && (
                          <ul className="text-xs text-amber-700 list-disc ps-4">
                            {l.remarques.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="flex items-start gap-2">
                <Checkbox id="import-inviter" checked={inviter} onCheckedChange={(c) => setInviter(c === true)} className="mt-0.5" />
                <Label htmlFor="import-inviter" className="font-normal">
                  {t('pro.participants.import.inviter', 'Envoyer à chaque nouveau compte un email pour choisir son mot de passe (lien valable 7 jours)')}
                </Label>
              </div>
            </>
          )}

          {bilan && (
            <div className="space-y-2" role="status">
              <p className="font-medium">{t('pro.participants.import.termine', 'Import terminé')}</p>
              <ul className="text-sm list-disc ps-5">
                <li>{t('pro.participants.import.bilanInscrits', '{{n}} personne(s) inscrite(s) « En attente »', { n: bilan.inscrits })}</li>
                <li>{t('pro.participants.import.bilanComptes', '{{n}} compte(s) créé(s)', { n: bilan.comptes_crees })}</li>
                <li>{t('pro.participants.import.bilanInvitations', '{{n}} invitation(s) envoyée(s)', { n: bilan.invitations })}</li>
              </ul>
              {bilan.erreurs.length > 0 && (
                <ul className="text-sm text-destructive list-disc ps-5">{bilan.erreurs.map((e, i) => <li key={i}>{e}</li>)}</ul>
              )}
            </div>
          )}

          {erreur && <p className="text-sm text-destructive" role="alert">{erreur}</p>}
        </div>

        <DialogFooter className="gap-2">
          {bilan ? (
            <Button onClick={fermer}>{t('common.close', 'Fermer')}</Button>
          ) : apercu ? (
            <>
              <Button variant="outline" onClick={() => setApercu(null)} disabled={enCours}>{t('common.back', 'Retour')}</Button>
              <Button onClick={importer} disabled={enCours || cochees.size === 0}>
                {enCours && <Loader2 className="h-4 w-4 me-2 animate-spin" aria-hidden="true" />}
                {t('pro.participants.import.confirmer', 'Inscrire {{n}} personne(s)', { n: cochees.size })}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={fermer}>{t('common.cancel', 'Annuler')}</Button>
              <Button onClick={lireApercu} disabled={!fichier || enCours}>
                {enCours ? <Loader2 className="h-4 w-4 me-2 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4 me-2" aria-hidden="true" />}
                {t('pro.participants.import.voir', 'Voir la liste')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportInscriptionsDialog;
