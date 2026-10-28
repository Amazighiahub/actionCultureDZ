/**
 * Regrouper des organisations en double dans celle que l'on garde (modération).
 * 1. choisir les doublons (doublons probables proposés d'après le nom, ou recherche) ;
 * 2. lire le résumé (événements, membres, livres déplacés) ; 3. confirmer.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Merge, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { httpClient } from '@/services/httpClient';
import { getLocalizedText } from '@/utils/getLocalizedText';

interface Org { id_organisation: number; nom: unknown; statut?: string; TypeOrganisation?: { nom: unknown } | null }
interface Apercu { evenements: number; membres: number; livres: number }

const FusionOrganisationDialog: React.FC<{
  garde: Org | null;
  toutes: Org[];
  onClose: () => void;
  onFusionnee: () => void;
}> = ({ garde, toutes, onClose, onFusionnee }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [suggestions, setSuggestions] = useState<Org[]>([]);
  const [choisies, setChoisies] = useState<number[]>([]);
  const [recherche, setRecherche] = useState('');
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const nom = (o: Org) => getLocalizedText(o.nom, lang, t('common.unnamed', 'Sans nom'));

  // Nouvelle organisation gardée : on repart de zéro, avec les doublons probables
  useEffect(() => {
    setChoisies([]); setRecherche(''); setApercu(null); setErreur(null); setSuggestions([]);
    if (!garde) return;
    httpClient.get<Org[]>('/organisations/ressemblantes', { nom: getLocalizedText(garde.nom, 'fr'), exclure: garde.id_organisation })
      .then(res => { if (res.success && res.data) setSuggestions(res.data); })
      .catch(() => {});
  }, [garde]);

  // Toute modification du choix efface le résumé : il faut le relire avant de confirmer
  useEffect(() => { setApercu(null); }, [choisies]);

  const resultats = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q || !garde) return [];
    return toutes.filter(o => o.id_organisation !== garde.id_organisation && nom(o).toLowerCase().includes(q)).slice(0, 8);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recherche, toutes, garde, lang]);

  const basculer = (id: number) => setChoisies(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const lireResume = async () => {
    if (!garde) return;
    setErreur(null);
    try {
      const res = await httpClient.get<Apercu>(`/organisations/${garde.id_organisation}/fusion`, { doublons: choisies.join(',') });
      if (!res.success || !res.data) throw new Error(res.error);
      setApercu(res.data);
    } catch (e) {
      setErreur(e instanceof Error && e.message ? e.message : t('common.error', 'Erreur'));
    }
  };

  const confirmer = async () => {
    if (!garde) return;
    setEnvoi(true);
    try {
      const res = await httpClient.post<unknown>(`/organisations/${garde.id_organisation}/fusion`, { doublons: choisies });
      if (!res.success) throw new Error(res.error);
      onFusionnee();
    } catch (e) {
      setErreur(e instanceof Error && e.message ? e.message : t('common.error', 'Erreur'));
    } finally {
      setEnvoi(false);
    }
  };

  const ligne = (o: Org, conseil = false) => (
    <label key={o.id_organisation} className="flex items-center gap-3 rounded-md border p-2 cursor-pointer hover:bg-muted/50">
      <Checkbox checked={choisies.includes(o.id_organisation)} onCheckedChange={() => basculer(o.id_organisation)} />
      <span className="flex-1 min-w-0">
        <span className="font-medium">{nom(o)}</span>
        <span className="block text-xs text-muted-foreground">
          {[getLocalizedText(o.TypeOrganisation?.nom, lang, ''), o.statut ? t(`admin.organisations.statuts.${o.statut}`, o.statut) : '', conseil ? t('admin.organisations.fusion.probable', 'doublon probable') : '']
            .filter(Boolean).join(' · ')}
        </span>
      </span>
    </label>
  );
  const nomsChoisis = toutes.concat(suggestions).filter((o, i, liste) => choisies.includes(o.id_organisation)
    && liste.findIndex(x => x.id_organisation === o.id_organisation) === i).map(nom);

  return (
    <Dialog open={!!garde} onOpenChange={(ouvert) => { if (!ouvert) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Merge className="h-5 w-5" />
            {t('admin.organisations.fusion.titre', { nom: garde ? nom(garde) : '', defaultValue: 'Regrouper dans « {{nom}} »' })}
          </DialogTitle>
          <DialogDescription>
            {t('admin.organisations.fusion.aide', 'Cochez les pages en double. Leurs événements, membres et livres rejoindront cette page, puis elles seront supprimées ; leurs anciennes adresses mèneront ici.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('admin.organisations.fusion.suggestions', 'Doublons probables')}</p>
              {suggestions.map(o => ligne(o, true))}
            </div>
          )}
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('admin.organisations.fusion.autre', 'Autre organisation')}</p>
            <Input value={recherche} onChange={(e) => setRecherche(e.target.value)}
              placeholder={t('organisations.search', 'Rechercher une organisation…')} aria-label={t('organisations.search', 'Rechercher une organisation…')} />
            {resultats.filter(o => !suggestions.some(s => s.id_organisation === o.id_organisation)).map(o => ligne(o))}
          </div>

          {apercu && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('admin.organisations.fusion.resume', {
                  doublons: nomsChoisis.map(n => `« ${n} »`).join(', '), garde: garde ? nom(garde) : '',
                  evenements: apercu.evenements, membres: apercu.membres, livres: apercu.livres,
                  defaultValue: '{{doublons}} → « {{garde}} » : {{evenements}} événement(s), {{membres}} membre(s) et {{livres}} livre(s) déplacés. Les pages en double seront supprimées.'
                })}
              </AlertDescription>
            </Alert>
          )}
          {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>{t('common.cancel', 'Annuler')}</Button>
          {!apercu ? (
            <Button disabled={!choisies.length} onClick={lireResume}>{t('admin.organisations.fusion.voirResume', 'Voir le résumé')}</Button>
          ) : (
            <Button variant="destructive" disabled={envoi} onClick={confirmer}>
              <Merge className="h-4 w-4 me-2" />{t('admin.organisations.fusion.confirmer', 'Fusionner')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FusionOrganisationDialog;
