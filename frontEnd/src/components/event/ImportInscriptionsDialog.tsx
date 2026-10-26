/**
 * ImportInscriptionsDialog — « Importer une liste (Excel) » dans Gérer › Participants.
 * 1. le classeur (export d'un formulaire en ligne) ; 2. l'aperçu : une ligne par personne, cochée
 * si elle sera inscrite, avec ses remarques, et le profil à choisir quand celui du classeur n'est pas
 * un des choix du formulaire (« Amateur du patrimoine ») ; 3. le bilan. Les personnes sont inscrites « En
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { httpClient } from '@/services/httpClient';
import { getLocalizedText } from '@/utils/getLocalizedText';

type Action = 'creer' | 'inscrire' | 'deja_inscrit' | 'doublon' | 'invalide';
interface LigneApercu {
  ligne: number;
  nom: string;
  email: string;
  reponses: Record<string, unknown>;
  montant: number | null;
  remarques: string[];
  action: Action;
  /** Profil écrit dans le classeur, absent des choix du formulaire : à choisir */
  profil_inconnu: string | null;
}
interface Apercu {
  profils: { valeur: string; label?: string | Record<string, string> }[];
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
  const { t, i18n } = useTranslation();
  const { formatPrice } = useLocalizedNumber();
  const [fichier, setFichier] = useState<File | null>(null);
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [cochees, setCochees] = useState<Set<number>>(new Set());
  /** Profil choisi par numéro de ligne, pour les profils du classeur absents du formulaire */
  const [profilsChoisis, setProfilsChoisis] = useState<Record<number, string>>({});
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
    setFichier(null); setApercu(null); setBilan(null); setErreur(null); setCochees(new Set()); setProfilsChoisis({});
    onFermer();
  };

  /** Aperçu ; relu à chaque profil choisi (montant et remarques recalculés), les cases cochées restent */
  const lireApercu = async (choix: Record<number, string> = profilsChoisis) => {
    if (!fichier) return;
    setEnCours(true); setErreur(null);
    const res = await httpClient.upload<Apercu>(`/evenements/${evenementId}/participants/import/apercu`,
      formulaire({ profils: JSON.stringify(choix) }));
    setEnCours(false);
    if (!res.success || !res.data) { setErreur(res.error || t('pro.participants.import.erreurLecture', 'Le fichier n’a pas pu être lu.')); return; }
    if (!apercu) setCochees(new Set(res.data.lignes.filter(l => IMPORTABLES.includes(l.action)).map(l => l.ligne)));
    setApercu(res.data);
  };

  const choisirProfil = (ligne: number, valeur: string) => {
    const choix = { ...profilsChoisis, [ligne]: valeur };
    setProfilsChoisis(choix);
    lireApercu(choix);
  };

  const importer = async () => {
    setEnCours(true); setErreur(null);
    const res = await httpClient.upload<Bilan>(`/evenements/${evenementId}/participants/import`,
      formulaire({ lignes: JSON.stringify([...cochees]), inviter: String(inviter), profils: JSON.stringify(profilsChoisis) }));
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
  // Personnes cochées dont le profil reste à choisir : l'import attend
  const profilsManquants = apercu?.lignes.filter(l => cochees.has(l.ligne) && l.profil_inconnu && !profilsChoisis[l.ligne]).length || 0;

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
                    <div key={l.ligne} className={`flex gap-3 p-3 ${importable ? '' : 'opacity-60'}`}>
                      <Checkbox
                        id={`import-ligne-${l.ligne}`}
                        checked={cochees.has(l.ligne)}
                        disabled={!importable}
                        onCheckedChange={() => basculer(l.ligne)}
                        aria-label={l.nom || l.email}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <label htmlFor={`import-ligne-${l.ligne}`} className={`font-medium ${importable ? 'cursor-pointer' : ''}`}>{l.nom || '—'}</label>
                          <span className="text-sm text-muted-foreground break-all">{l.email}</span>
                          <Badge variant={importable ? 'secondary' : 'outline'}>{libelleAction[l.action]}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {[l.reponses.profil, l.reponses.profil_autre && `(${l.reponses.profil_autre})`, l.reponses.presence].filter(Boolean).join(' · ')}
                          {l.montant !== null && l.montant !== undefined && ` · ${l.montant === 0 ? t('events.free', 'Gratuit') : formatPrice(l.montant)}`}
                        </p>
                        {l.profil_inconnu && importable && (
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span>
                              {t('pro.participants.import.profilAChoisir', 'Profil à choisir')}
                              {typeof l.reponses.metier === 'string' && l.reponses.metier && (
                                <span className="text-muted-foreground"> — {t('pro.participants.import.metier', 'métier : {{metier}}', { metier: l.reponses.metier })}</span>
                              )}
                            </span>
                            <Select value={profilsChoisis[l.ligne] || ''} onValueChange={(v) => choisirProfil(l.ligne, v)} disabled={enCours}>
                              <SelectTrigger className="w-64 h-8" aria-label={t('pro.participants.import.profilDe', 'Profil de {{nom}}', { nom: l.nom || l.email })}>
                                <SelectValue placeholder={t('pro.participants.import.choisir', 'Choisir…')} />
                              </SelectTrigger>
                              <SelectContent>
                                {apercu.profils.map(p => (
                                  <SelectItem key={p.valeur} value={p.valeur}>{getLocalizedText(p.label, i18n.language, p.valeur)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {l.remarques.length > 0 && (
                          <ul className="text-xs text-amber-700 list-disc ps-4">
                            {l.remarques.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {profilsManquants > 0 && (
                <p className="text-sm text-amber-700" role="status">
                  {t('pro.participants.import.profilsManquants', 'Choisissez le profil de {{n}} personne(s) cochée(s) avant d’inscrire.', { n: profilsManquants })}
                </p>
              )}
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
              <Button variant="outline" onClick={() => { setApercu(null); setProfilsChoisis({}); }} disabled={enCours}>{t('common.back', 'Retour')}</Button>
              <Button onClick={importer} disabled={enCours || cochees.size === 0 || profilsManquants > 0}>
                {enCours && <Loader2 className="h-4 w-4 me-2 animate-spin" aria-hidden="true" />}
                {t('pro.participants.import.confirmer', 'Inscrire {{n}} personne(s)', { n: cochees.size })}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={fermer}>{t('common.cancel', 'Annuler')}</Button>
              <Button onClick={() => lireApercu()} disabled={!fichier || enCours}>
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
