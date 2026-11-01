/**
 * CreditPhotoChamps — photographe ou source, droits de la photo, et (à l'envoi) confirmation du
 * droit de publier. Utilisé pour les photos d'un lieu : création, ajout et correction d'un crédit.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LICENCES_PHOTO, type LicencePhoto } from '@/utils/creditPhoto';

export interface ValeurCreditPhoto {
  credit: string;
  licence: LicencePhoto | '';
  autorise: boolean;
}

export const CREDIT_VIDE: ValeurCreditPhoto = { credit: '', licence: '', autorise: false };

const CreditPhotoChamps: React.FC<{
  valeur: ValeurCreditPhoto;
  onChange: (v: ValeurCreditPhoto) => void;
  /** Case « j'ai le droit de publier » : à l'envoi de nouvelles photos seulement */
  avecAutorisation?: boolean;
  id?: string;
}> = ({ valeur, onChange, avecAutorisation = true, id = 'credit-photo' }) => {
  const { t } = useTranslation();
  const maj = (champs: Partial<ValeurCreditPhoto>) => onChange({ ...valeur, ...champs });

  return (
    <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
      <div>
        <Label htmlFor={`${id}-auteur`}>
          {t('credit.photographe', 'Photographe ou source')} <span className="text-muted-foreground font-normal">({t('common.optional', 'Optionnel')})</span>
        </Label>
        <Input id={`${id}-auteur`} value={valeur.credit} maxLength={150} className="mt-1"
          onChange={e => maj({ credit: e.target.value })}
          placeholder={t('credit.photographeExemple', 'ex. Amina Brahimi, ou Wikimedia Commons')} />
        <p className="text-xs text-muted-foreground mt-1">{t('credit.photographeAide', 'Affiché sur la photo : « © Nom ».')}</p>
      </div>
      <div>
        <Label htmlFor={`${id}-licence`}>{t('credit.droits', 'Droits de la photo')}</Label>
        <Select value={valeur.licence || undefined} onValueChange={(v) => maj({ licence: v as LicencePhoto })}>
          <SelectTrigger id={`${id}-licence`} className="mt-1">
            <SelectValue placeholder={t('credit.droitsChoisir', 'Choisir (facultatif)')} />
          </SelectTrigger>
          <SelectContent>
            {LICENCES_PHOTO.map(l => (
              <SelectItem key={l.valeur} value={l.valeur}>{t(l.cle, l.defaut)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {avecAutorisation && (
        <div className="flex items-start gap-2">
          <Checkbox id={`${id}-autorise`} checked={valeur.autorise} className="mt-0.5"
            onCheckedChange={(c) => maj({ autorise: c === true })} />
          <Label htmlFor={`${id}-autorise`} className="font-normal leading-snug">
            {t('credit.autorisation', 'J’ai le droit de publier ces photos : j’en suis l’auteur, j’ai l’accord du photographe, ou elles sont libres de droits.')}
          </Label>
        </div>
      )}
    </div>
  );
};

export default CreditPhotoChamps;
