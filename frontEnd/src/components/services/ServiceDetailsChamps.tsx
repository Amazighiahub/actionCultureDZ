/**
 * Formulaire d'un service, lot 2 « comme TripAdvisor » : équipements, langues parlées, capacité et
 * bouton « Réserver » (lien de réservation, WhatsApp). Listes fermées (constants/serviceDetails).
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { EQUIPEMENTS_SERVICE, LANGUES_SERVICE, UNITE_CAPACITE } from '@/constants/serviceDetails';

export interface DetailsServiceForm {
  equipements: string[];
  langues: string[];
  capacite: string;
  lien_reservation: string;
  whatsapp: string;
}

export const DETAILS_VIDES: DetailsServiceForm = { equipements: [], langues: [], capacite: '', lien_reservation: '', whatsapp: '' };

interface Props {
  valeur: DetailsServiceForm;
  onChange: (v: DetailsServiceForm) => void;
  typeService: string;
  erreurs?: Partial<Record<'capacite' | 'lien_reservation' | 'whatsapp', string>>;
}

const ServiceDetailsChamps: React.FC<Props> = ({ valeur, onChange, typeService, erreurs = {} }) => {
  const { t } = useTranslation();
  const basculer = (champ: 'equipements' | 'langues', cle: string, coche: boolean) => {
    const liste = new Set(valeur[champ]);
    if (coche) liste.add(cle); else liste.delete(cle);
    onChange({ ...valeur, [champ]: [...liste] });
  };
  const unite = UNITE_CAPACITE[typeService];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('service.details.titre', 'Équipements, langues et réservation')}</CardTitle>
        <CardDescription>{t('service.details.aide', 'Les visiteurs voient en un coup d’œil ce que vous proposez, et peuvent réserver directement.')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t('service.details.equipements', 'Équipements et services')}</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {EQUIPEMENTS_SERVICE.map(({ cle, icone: Icone, libelle }) => (
              <label key={cle} className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted/50">
                <Checkbox checked={valeur.equipements.includes(cle)} onCheckedChange={(c) => basculer('equipements', cle, c === true)} />
                <Icone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {t(`servicesVisiteurs.equipements.${cle}`, libelle)}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t('service.details.langues', 'Langues parlées')}</legend>
          <div className="flex flex-wrap gap-2">
            {LANGUES_SERVICE.map(({ code, libelle }) => (
              <label key={code} className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-muted/50">
                <Checkbox checked={valeur.langues.includes(code)} onCheckedChange={(c) => basculer('langues', code, c === true)} />
                <span dir="auto">{libelle}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="max-w-xs">
          <Label htmlFor="service-capacite">
            {t('service.details.capacite', 'Capacité')}
            {unite && <span className="font-normal text-muted-foreground"> ({t(`service.details.unite.${typeService}`, unite)})</span>}
          </Label>
          <Input id="service-capacite" type="number" inputMode="numeric" min={1} max={100000} value={valeur.capacite}
            onChange={(e) => onChange({ ...valeur, capacite: e.target.value })} className="mt-1"
            aria-invalid={!!erreurs.capacite} aria-describedby={erreurs.capacite ? 'service-capacite-erreur' : undefined} />
          {erreurs.capacite && <p id="service-capacite-erreur" className="mt-1 text-sm text-destructive">{erreurs.capacite}</p>}
        </div>

        <fieldset className="space-y-3">
          <legend className="mb-1 flex items-center gap-2 text-sm font-medium">
            <CalendarCheck className="h-4 w-4" aria-hidden="true" />
            {t('service.details.reserver', 'Bouton « Réserver »')}
          </legend>
          <p className="text-xs text-muted-foreground">
            {t('service.details.reserverAide', 'Facultatif. Le bouton s’affiche sur la page de votre service avec ce que vous remplissez : WhatsApp, lien de réservation, et votre téléphone.')}
          </p>
          <div>
            <Label htmlFor="service-whatsapp">{t('service.details.whatsapp', 'Numéro WhatsApp')}</Label>
            <Input id="service-whatsapp" type="tel" inputMode="tel" value={valeur.whatsapp} placeholder="0555 12 34 56" maxLength={20}
              onChange={(e) => onChange({ ...valeur, whatsapp: e.target.value })} className="mt-1" dir="ltr"
              aria-invalid={!!erreurs.whatsapp} aria-describedby={erreurs.whatsapp ? 'service-whatsapp-erreur' : undefined} />
            {erreurs.whatsapp && <p id="service-whatsapp-erreur" className="mt-1 text-sm text-destructive">{erreurs.whatsapp}</p>}
          </div>
          <div>
            <Label htmlFor="service-lien-reservation">{t('service.details.lienReservation', 'Lien de réservation en ligne')}</Label>
            <Input id="service-lien-reservation" type="url" inputMode="url" value={valeur.lien_reservation} placeholder="https://" maxLength={500}
              onChange={(e) => onChange({ ...valeur, lien_reservation: e.target.value })} className="mt-1" dir="ltr"
              aria-invalid={!!erreurs.lien_reservation} aria-describedby={erreurs.lien_reservation ? 'service-lien-erreur' : undefined} />
            {erreurs.lien_reservation && <p id="service-lien-erreur" className="mt-1 text-sm text-destructive">{erreurs.lien_reservation}</p>}
          </div>
        </fieldset>
      </CardContent>
    </Card>
  );
};

export default ServiceDetailsChamps;
