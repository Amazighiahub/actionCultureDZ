/**
 * Encadré « Texte en tamazight » des formulaires (article, poème, livre, chanson…), 2026-11-20 :
 * variante, texte écrit par une personne, accord de partage ouvert sous licence CC BY-SA 4.0.
 * Le partage n'est possible que pour un texte écrit par une personne : une traduction automatique remise dans les
 * données ouvertes apprendrait ses propres erreurs aux outils.
 */
import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { VARIANTES, LIBELLE_VARIANTE, LICENCE_URL, type ChampsTamazight as Champs } from '@/utils/tamazight';

interface Props {
  valeurs: Champs;
  onChange: (valeurs: Champs) => void;
}

const ChampsTamazight: React.FC<Props> = ({ valeurs, onChange }) => {
  const { t } = useTranslation();
  const id = useId();
  const changer = (c: Partial<Champs>) => {
    const suite = { ...valeurs, ...c };
    // Plus écrit par une personne : le partage ouvert est retiré
    if (suite.ecrit_par_humain !== true) suite.partage_ouvert = false;
    onChange(suite);
  };

  return (
    <fieldset className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <legend className="px-1 text-sm font-semibold">{t('tamazight.form.titre', 'Texte en tamazight')}</legend>
      <div className="space-y-2">
        <Label htmlFor={`${id}-variante`}>{t('tamazight.form.variante', 'Variante (parler)')}</Label>
        <select id={`${id}-variante`} value={valeurs.variante_amazighe || ''} onChange={(e) => changer({ variante_amazighe: e.target.value as Champs['variante_amazighe'] })}
          className="w-full rounded-md border bg-background p-2">
          <option value="">{t('tamazight.form.choisirVariante', '— Choisir la variante —')}</option>
          {VARIANTES.map((v) => <option key={v} value={v}>{t(`tamazight.variantes.${v}`, LIBELLE_VARIANTE[v])}</option>)}
        </select>
      </div>
      <div className="flex items-start gap-3">
        <Checkbox id={`${id}-humain`} checked={valeurs.ecrit_par_humain === true} onCheckedChange={(v) => changer({ ecrit_par_humain: v === true })} className="mt-0.5" />
        <Label htmlFor={`${id}-humain`} className="text-sm font-normal leading-snug">
          {t('tamazight.form.humain', 'Ce texte et ses traductions ont été écrits par des personnes, pas par un traducteur automatique.')}
        </Label>
      </div>
      <div className="flex items-start gap-3">
        <Checkbox id={`${id}-partage`} checked={!!valeurs.partage_ouvert} disabled={valeurs.ecrit_par_humain !== true}
          onCheckedChange={(v) => changer({ partage_ouvert: v === true })} className="mt-0.5" />
        <Label htmlFor={`${id}-partage`} className="text-sm font-normal leading-snug">
          {t('tamazight.form.partage', 'J’accepte que ce texte et ses enregistrements soient partagés librement pour la recherche sur le tamazight (traduction, reconnaissance de la parole), sous licence CC BY-SA 4.0 : mon nom et Tala DZ seront cités.')}{' '}
          <a href={LICENCE_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline">{t('tamazight.form.licence', 'Lire la licence')}</a>
        </Label>
      </div>
      {valeurs.partage_ouvert && (
        <p className="text-xs text-muted-foreground">{t('tamazight.form.relecture', 'Un modérateur relit le texte avant qu’il apparaisse dans les données ouvertes. Vous pouvez retirer votre accord à tout moment.')}</p>
      )}
    </fieldset>
  );
};

export default ChampsTamazight;
