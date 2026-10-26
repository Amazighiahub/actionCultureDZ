/**
 * TarifEvenementFields — « Participation et tarif » du formulaire d'événement :
 * Gratuit, Payant (un prix), ou Selon le profil (un prix par profil pour tout l'événement,
 * et une part du prix pour une présence partielle quand le formulaire la demande).
 * Pour un type dont le formulaire pose « Vous êtes » (chantier-école), les profils sont ceux
 * du formulaire : l'organisateur n'indique que les prix.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { PROFIL_AUTRE, prixProfessionnel, type ModeTarif, type ProfilTarif } from '@/utils/tarifEvenement';

export interface ValeurTarif {
  mode: ModeTarif | '';
  prix: string;
  profils: ProfilTarif[];
  /** Part payée pour une présence partielle (%) ; '' = pas de réduction */
  partiel: string;
}

interface Props {
  valeur: ValeurTarif;
  onChange: (v: ValeurTarif) => void;
  /** Profils imposés par le formulaire du type (noms non modifiables) ; null = profils libres */
  profilsDuFormulaire: ProfilTarif[] | null;
  /** Le formulaire du type demande une présence « Partielle » */
  presencePartielle: boolean;
  erreur?: string;
}

const MODES: ModeTarif[] = ['gratuit', 'payant', 'profil'];

/** Un prix saisi : vide, ou un nombre de 0 à 10 000 000 (les autres frappes sont ignorées) */
const prixValide = (v: string) => v === '' || (Number(v) >= 0 && Number(v) <= 10000000);

const TarifEvenementFields: React.FC<Props> = ({ valeur, onChange, profilsDuFormulaire, presencePartielle, erreur }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const maj = (partiel: Partial<ValeurTarif>) => onChange({ ...valeur, ...partiel });
  const majProfil = (i: number, champ: Partial<ProfilTarif>) =>
    maj({ profils: valeur.profils.map((p, j) => (j === i ? { ...p, ...champ } : p)) });
  const fixes = !!profilsDuFormulaire;
  const prixPro = prixProfessionnel(valeur.profils);

  const libelles: Record<ModeTarif, [string, string]> = {
    gratuit: [t('events.tarif.gratuit', 'Gratuit'), t('events.tarif.gratuitDesc', 'Aucun paiement')],
    payant: [t('events.tarif.payant', 'Payant'), t('events.tarif.payantDesc', 'Un seul prix, par personne')],
    profil: [t('events.tarif.profil', 'Selon le profil'), t('events.tarif.profilDesc', 'Un prix par profil (étudiant, professionnel…), pour tout l’événement')],
  };

  return (
    <div className="space-y-4">
      <RadioGroup
        value={valeur.mode}
        onValueChange={(v) => maj({ mode: v as ModeTarif })}
        className="grid gap-3 sm:grid-cols-3"
        aria-label={t('events.tarif.titre', 'Tarif')}
        aria-invalid={!!erreur}
      >
        {MODES.map((m) => (
          <Label
            key={m}
            htmlFor={`tarif-${m}`}
            className={`flex items-start gap-3 rounded-lg border-2 p-3 cursor-pointer ${valeur.mode === m ? 'border-primary bg-primary/5' : 'border-border'}`}
          >
            <RadioGroupItem id={`tarif-${m}`} value={m} className="mt-0.5" />
            <span>
              <span className="block font-medium">{libelles[m][0]}</span>
              <span className="block text-sm font-normal text-muted-foreground">{libelles[m][1]}</span>
            </span>
          </Label>
        ))}
      </RadioGroup>

      {valeur.mode === 'payant' && (
        <div className="space-y-2 max-w-xs">
          <Label htmlFor="tarif">{t('events.tarif.prixParPersonne', 'Prix par personne (DA)')}</Label>
          <Input id="tarif" type="number" min="1" max="10000000" step="1" inputMode="numeric"
            value={valeur.prix} onChange={(e) => { if (prixValide(e.target.value)) maj({ prix: e.target.value }); }} placeholder="1500" />
        </div>
      )}

      {valeur.mode === 'profil' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {fixes
              ? t('events.tarif.profilsFormulaire', 'Les profils sont ceux du formulaire d’inscription : indiquez le prix de chacun, pour tout l’événement.')
              : t('events.tarif.profilsLibres', 'Indiquez le prix de chaque profil, pour tout l’événement. Vous pouvez renommer, retirer ou ajouter des profils.')}
          </p>
          <div className="space-y-2">
            {valeur.profils.map((p, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                {fixes ? (
                  <span className="flex-1 min-w-[10rem] font-medium">{getLocalizedText(p.label, lang, p.valeur)}</span>
                ) : (
                  <Input
                    className="flex-1 min-w-[10rem]"
                    aria-label={t('events.tarif.nomProfil', 'Nom du profil')}
                    value={getLocalizedText(p.label, lang, p.valeur)}
                    onChange={(e) => majProfil(i, { valeur: e.target.value, label: { fr: e.target.value } })}
                  />
                )}
                <div className="flex items-center gap-2">
                  <Input
                    className="w-32"
                    type="number" min="0" max="10000000" step="1" inputMode="numeric"
                    aria-label={t('events.tarif.prixDe', 'Prix pour « {{profil}} » (DA)', { profil: getLocalizedText(p.label, lang, p.valeur) })}
                    value={String(p.prix ?? '')}
                    onChange={(e) => { if (prixValide(e.target.value)) majProfil(i, { prix: e.target.value }); }}
                    placeholder={p.valeur === PROFIL_AUTRE ? (prixPro !== null ? String(prixPro) : t('events.tarif.aConvenir', 'à convenir')) : '0'}
                  />
                  <span className="text-sm text-muted-foreground">DA</span>
                  {!fixes && valeur.profils.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => maj({ profils: valeur.profils.filter((_, j) => j !== i) })}
                      aria-label={t('events.tarif.retirer', 'Retirer ce profil')}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {!fixes && (
            <Button type="button" variant="outline" size="sm" onClick={() => maj({ profils: [...valeur.profils, { valeur: '', label: { fr: '' }, prix: '' }] })}>
              <Plus className="h-4 w-4 me-1" />{t('events.tarif.ajouterProfil', 'Ajouter un profil')}
            </Button>
          )}
          {presencePartielle && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Checkbox
                id="tarif-partiel"
                checked={valeur.partiel !== ''}
                onCheckedChange={(c) => maj({ partiel: c === true ? '70' : '' })}
              />
              <Label htmlFor="tarif-partiel">{t('events.tarif.partiel', 'Présence partielle : on paie')}</Label>
              <Input
                className="w-20" type="number" min="1" max="100" step="1" inputMode="numeric"
                aria-label={t('events.tarif.partielPourcent', 'Part du prix pour une présence partielle (%)')}
                disabled={valeur.partiel === ''}
                value={valeur.partiel}
                onChange={(e) => maj({ partiel: e.target.value })}
              />
              <span className="text-sm">{t('events.tarif.duPrix', '% du prix')}</span>
            </div>
          )}
          {valeur.profils.some(p => p.valeur === PROFIL_AUTRE) && (
            <p className="text-sm text-muted-foreground">
              {t('events.tarif.autreProfessionnel', 'Le prix de « Autre » est facultatif : vide ou plus bas, la personne paie le prix professionnel.')}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {t('events.tarif.profilVisiteur', 'Sur la page de l’événement, le visiteur lit « Tarif selon votre profil » ; il voit son prix en remplissant l’inscription.')}
          </p>
        </div>
      )}

      {erreur && <p className="text-sm text-destructive" role="alert">{erreur}</p>}
    </div>
  );
};

export default TarifEvenementFields;
