/**
 * PersonnaliteDialog — fiche d'une personnalité liée à un site : photo, dates, biographie, lien avec
 * le site et ses œuvres. Celui qui l'a ajoutée (ou la modération) peut modifier la fiche et relier
 * ses œuvres ; le serveur le vérifie (GET /intervenants/:id/edition).
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Pencil, User } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import FicheIntervenantDialog from '@/components/forms/FicheIntervenantDialog';
import OeuvresPersonnalite from '@/components/patrimoine/OeuvresPersonnalite';
import { httpClient } from '@/services/httpClient';
import { usePermissions } from '@/hooks/usePermissions';
import { useFormatDate } from '@/hooks/useFormatDate';
import { texteLangue } from '@/utils/programmeIntervenants';
import type { LieuIntervenant } from '@/services/lieuIntervenant.service';

interface Props {
  lien: LieuIntervenant | null;
  lang: string;
  onClose: () => void;
  /** Fiche modifiée : la liste des personnalités est rechargée */
  onModifiee: () => void;
}

const PersonnaliteDialog: React.FC<Props> = ({ lien, lang, onClose, onModifiee }) => {
  const { t } = useTranslation();
  const { isAdmin, isValidatedProfessional } = usePermissions();
  const { formatDate } = useFormatDate();
  const [peutModifier, setPeutModifier] = useState(false);
  const [ficheOuverte, setFicheOuverte] = useState(false);
  const inv = lien?.Intervenant;

  // Droit de modifier : demandé au serveur seulement pour un professionnel ou l'administration
  useEffect(() => {
    setPeutModifier(false);
    if (!inv || !(isAdmin || isValidatedProfessional())) return;
    let actif = true;
    httpClient.get<{ peut_modifier: boolean }>(`/intervenants/${inv.id_intervenant}/edition`)
      .then(res => { if (actif) setPeutModifier(!!res.data?.peut_modifier); })
      .catch(() => { /* lecture seule */ });
    return () => { actif = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inv?.id_intervenant, isAdmin]);

  if (!lien || !inv) return null;
  const nom = `${texteLangue(inv.prenom, lang)} ${texteLangue(inv.nom, lang)}`.trim();
  const date = (d?: string | null) => (d ? formatDate(new Date(d), { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const naissance = [date(inv.date_naissance), inv.lieu_naissance].filter(Boolean).join(', ');
  const deces = [date(inv.date_deces), inv.lieu_deces].filter(Boolean).join(', ');
  const biographie = texteLangue(inv.biographie, lang);

  return (
    <>
      <Dialog open={!ficheOuverte} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-4">
              {inv.photo_url
                ? <img src={inv.photo_url} alt="" className="h-20 w-20 rounded-full object-cover border shrink-0" />
                : <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center shrink-0"><User className="h-8 w-8 text-muted-foreground" aria-hidden="true" /></div>}
              <div className="min-w-0">
                <DialogTitle className="text-xl">{nom}</DialogTitle>
                {inv.titre_professionnel && <DialogDescription>{inv.titre_professionnel}</DialogDescription>}
                <div className="flex flex-wrap gap-1 mt-2">
                  {lien.role_sur_site && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{lien.role_sur_site}</span>}
                  {lien.periode && <span className="text-xs bg-muted px-2 py-0.5 rounded">{lien.periode}</span>}
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5">
            {(naissance || deces) && (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {naissance && <div><dt className="text-muted-foreground">{t('personnalites.naissance', 'Naissance')}</dt><dd>{naissance}</dd></div>}
                {deces && <div><dt className="text-muted-foreground">{t('personnalites.deces', 'Décès')}</dt><dd>{deces}</dd></div>}
              </dl>
            )}
            {lien.contexte && (
              <div>
                <h4 className="font-medium mb-1">{t('personnalites.lienSite', 'Son lien avec ce lieu')}</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{lien.contexte}</p>
              </div>
            )}
            {biographie && (
              <div>
                <h4 className="font-medium mb-1">{t('personnalites.biographie', 'Biographie')}</h4>
                <p className="text-sm leading-relaxed whitespace-pre-line">{biographie}</p>
              </div>
            )}
            {inv.wikipedia_url && (
              <a href={inv.wikipedia_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary underline">
                {t('personnalites.wikipedia', 'Page Wikipédia')}<ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}

            <OeuvresPersonnalite idIntervenant={inv.id_intervenant} peutAjouter={isAdmin || isValidatedProfessional()} />

            {peutModifier && (
              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={() => setFicheOuverte(true)}>
                  <Pencil className="h-4 w-4 me-2" aria-hidden="true" />{t('personnalites.modifierFiche', 'Modifier la fiche')}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <FicheIntervenantDialog
        idIntervenant={ficheOuverte ? inv.id_intervenant : null}
        description={t('personnalites.ficheDescription', 'Présentation affichée sur la page du site.')}
        onClose={() => setFicheOuverte(false)}
        onSaved={() => { onModifiee(); onClose(); }}
      />
    </>
  );
};

export default PersonnaliteDialog;
