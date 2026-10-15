/**
 * FormulaireInscription - Questions d'inscription propres au type d'événement
 * (ex. Chantier-école). Composant contrôlé : l'état des réponses appartient au parent.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { RequiredLabel, FieldError } from '@/components/ui/required-label';
import { useTranslateData } from '@/hooks/useTranslateData';
import { cn } from '@/lib/Utils';
import {
  estVisible,
  type ChampFormulaire,
  type ConfigInscription,
  type ErreurChamp,
  type Reponses,
  type ValeurReponse
} from '@/utils/formulaireInscription';

interface FormulaireInscriptionProps {
  config: ConfigInscription;
  reponses: Reponses;
  erreurs: Record<string, ErreurChamp>;
  onChange: (cle: string, valeur: ValeurReponse) => void;
}

const idChamp = (cle: string) => `inscription-${cle}`;
const optionClass = 'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm cursor-pointer has-[:checked]:border-primary has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5';

const FormulaireInscription: React.FC<FormulaireInscriptionProps> = ({ config, reponses, erreurs, onChange }) => {
  const { t } = useTranslation();
  const { td } = useTranslateData();

  const messageErreur = (champ: ChampFormulaire): string | undefined => {
    const erreur = erreurs[champ.cle];
    if (!erreur) return undefined;
    if (erreur === 'requis') {
      return champ.type === 'accord'
        ? t('event.registration.form.mustAccept', 'Veuillez cocher cette case')
        : t('event.registration.form.required', 'Réponse obligatoire');
    }
    if (champ.type === 'nombre' && champ.min !== undefined && champ.max !== undefined) {
      return t('event.registration.form.between', 'Entre {{min}} et {{max}}', { min: champ.min, max: champ.max });
    }
    return t('event.registration.form.invalid', 'Réponse invalide');
  };

  const renderChamp = (champ: ChampFormulaire) => {
    const id = idChamp(champ.cle);
    const erreur = messageErreur(champ);
    const erreurId = erreur ? `${id}-erreur` : undefined;
    const valeur = reponses[champ.cle];
    const label = td(champ.label);
    const placeholder = champ.placeholder ? td(champ.placeholder) : undefined;
    const aria = { 'aria-invalid': !!erreur || undefined, 'aria-describedby': erreurId };

    if (champ.type === 'accord') {
      return (
        <div key={champ.cle} className="space-y-1">
          <div className="flex items-start gap-3">
            <Checkbox
              id={id}
              checked={valeur === true}
              onCheckedChange={(c) => onChange(champ.cle, c === true)}
              className="mt-0.5"
              {...aria}
            />
            <Label htmlFor={id} className="text-sm font-normal leading-snug cursor-pointer">
              {label}
              {champ.requis && <span className="text-destructive ms-1">*</span>}
            </Label>
          </div>
          <FieldError id={erreurId} error={erreur} />
        </div>
      );
    }

    if (champ.type === 'choix' || champ.type === 'choix_multiple') {
      const labelId = `${id}-label`;
      return (
        <div key={champ.cle} className="space-y-2">
          <RequiredLabel required={champ.requis}><span id={labelId}>{label}</span></RequiredLabel>
          {champ.type === 'choix' ? (
            <RadioGroup
              value={typeof valeur === 'string' ? valeur : ''}
              onValueChange={(v) => onChange(champ.cle, v)}
              className="flex flex-wrap gap-2"
              aria-labelledby={labelId}
              {...aria}
            >
              {(champ.options || []).map((o, i) => (
                <label key={o.valeur} htmlFor={`${id}-${i}`} className={optionClass}>
                  <RadioGroupItem id={`${id}-${i}`} value={o.valeur} />
                  {td(o.label)}
                </label>
              ))}
            </RadioGroup>
          ) : (
            <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-2" {...aria}>
              {(champ.options || []).map((o, i) => {
                const choisis = Array.isArray(valeur) ? valeur : [];
                return (
                  <label key={o.valeur} htmlFor={`${id}-${i}`} className={optionClass}>
                    <Checkbox
                      id={`${id}-${i}`}
                      checked={choisis.includes(o.valeur)}
                      onCheckedChange={(c) => onChange(
                        champ.cle,
                        c === true ? [...choisis, o.valeur] : choisis.filter((v) => v !== o.valeur)
                      )}
                    />
                    {td(o.label)}
                  </label>
                );
              })}
            </div>
          )}
          <FieldError id={erreurId} error={erreur} />
        </div>
      );
    }

    const texte = typeof valeur === 'string' ? valeur : '';
    return (
      <div key={champ.cle} className="space-y-2">
        <RequiredLabel htmlFor={id} required={champ.requis}>{label}</RequiredLabel>
        {champ.type === 'texte_long' ? (
          <Textarea
            id={id}
            value={texte}
            placeholder={placeholder}
            maxLength={3000}
            onChange={(e) => onChange(champ.cle, e.target.value)}
            {...aria}
          />
        ) : (
          <Input
            id={id}
            type={champ.type === 'nombre' ? 'number' : champ.type === 'tel' ? 'tel' : champ.type === 'email' ? 'email' : 'text'}
            inputMode={champ.type === 'nombre' ? 'numeric' : undefined}
            min={champ.min}
            max={champ.max}
            maxLength={champ.type === 'nombre' ? undefined : 500}
            autoComplete={champ.type === 'tel' ? 'tel' : champ.type === 'email' ? 'email' : undefined}
            dir={champ.type === 'tel' || champ.type === 'email' ? 'ltr' : undefined}
            value={texte}
            placeholder={placeholder}
            onChange={(e) => onChange(champ.cle, e.target.value)}
            {...aria}
          />
        )}
        <FieldError id={erreurId} error={erreur} />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {config.sections.map((section, index) => {
        const champs = section.champs.filter((c) => estVisible(c, reponses));
        if (champs.length === 0) return null;
        return (
          <div key={index} className={cn(index > 0 && 'border-t pt-4')}>
            <fieldset className="space-y-4">
              {section.titre && (
                <legend className="text-base font-semibold text-primary mb-2">{td(section.titre)}</legend>
              )}
              {champs.map(renderChamp)}
            </fieldset>
          </div>
        );
      })}
    </div>
  );
};

export default FormulaireInscription;
