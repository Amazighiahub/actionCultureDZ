/**
 * IntervenantSaisie — prénom et nom d'un intervenant, avec suggestions des fiches existantes.
 * Choisir une suggestion rattache la fiche (id_intervenant) : la même personne n'est pas
 * créée deux fois. Sinon, le serveur crée la fiche (ou réutilise une fiche de même prénom + nom).
 */
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserCheck, PencilLine } from 'lucide-react';
import FicheIntervenantDialog from './FicheIntervenantDialog';
import { httpClient } from '@/services/httpClient';
import type { IntervenantData } from '@/services/programme.service';

interface Suggestion { id: number; label: string; prenom?: string; nom?: string; organisation?: string }

interface Props {
  index: number;
  valeur: IntervenantData;
  onChange: (maj: Partial<IntervenantData>) => void;
  disabled?: boolean;
}

const IntervenantSaisie: React.FC<Props> = ({ index, valeur, onChange, disabled }) => {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [ficheOuverte, setFicheOuverte] = useState(false);
  const minuterie = useRef<ReturnType<typeof setTimeout>>();

  // Recherche des fiches existantes à partir de 2 caractères (nom ou prénom)
  useEffect(() => {
    if (valeur.id_intervenant || disabled) { setSuggestions([]); return; }
    const q = `${valeur.prenom || ''} ${valeur.nom || ''}`.trim();
    const terme = (valeur.nom || '').trim().length >= 2 ? valeur.nom!.trim() : q;
    if (terme.length < 2) { setSuggestions([]); return; }
    clearTimeout(minuterie.current);
    minuterie.current = setTimeout(async () => {
      try {
        const res = await httpClient.get<Suggestion[]>('/intervenants/search', { q: terme, limit: 6 });
        setSuggestions(Array.isArray(res.data) ? res.data : []);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(minuterie.current);
  }, [valeur.prenom, valeur.nom, valeur.id_intervenant, disabled]);

  const choisir = (s: Suggestion) => {
    onChange({ id_intervenant: s.id, prenom: s.prenom || '', nom: s.nom || s.label });
    setOuvert(false);
  };

  const saisir = (champ: 'prenom' | 'nom', v: string) => {
    // Modifier le nom détache la fiche choisie : ce sera une autre personne
    onChange({ [champ]: v, id_intervenant: undefined });
    setOuvert(true);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`intervenant-${index}-prenom`}>{t('programme.form.participants.firstName', 'Prénom')}</Label>
          <Input
            id={`intervenant-${index}-prenom`}
            value={valeur.prenom || ''}
            onChange={(e) => saisir('prenom', e.target.value)}
            onFocus={() => setOuvert(true)}
            disabled={disabled}
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`intervenant-${index}-nom`}>
            {t('programme.form.participants.lastName', 'Nom (ou nom de l’organisme)')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`intervenant-${index}-nom`}
            value={valeur.nom || ''}
            onChange={(e) => saisir('nom', e.target.value)}
            onFocus={() => setOuvert(true)}
            disabled={disabled}
            autoComplete="off"
          />
        </div>
      </div>

      {valeur.id_intervenant && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1 font-normal">
            <UserCheck className="h-3 w-3" aria-hidden="true" />
            {t('programme.form.participants.existingSpeaker', 'Intervenant déjà connu sur Tala DZ')}
          </Badge>
          {!disabled && (
            <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setFicheOuverte(true)}>
              <PencilLine className="h-3.5 w-3.5 me-1" aria-hidden="true" />
              {t('programme.speakerCard.edit', 'Fiche de l’intervenant (photo, biographie…)')}
            </Button>
          )}
        </div>
      )}

      <FicheIntervenantDialog
        idIntervenant={ficheOuverte && valeur.id_intervenant ? valeur.id_intervenant : null}
        onClose={() => setFicheOuverte(false)}
        onSaved={({ prenom, nom }) => onChange({ prenom, nom })}
      />

      {ouvert && suggestions.length > 0 && !valeur.id_intervenant && (
        <div role="listbox" aria-label={t('programme.form.participants.suggestions', 'Intervenants existants')} className="rounded-md border bg-background divide-y">
          <p className="px-3 py-1.5 text-xs text-muted-foreground">
            {t('programme.form.participants.suggestionsHint', 'Déjà sur Tala DZ — choisissez pour éviter un doublon :')}
          </p>
          {suggestions.map(s => (
            <button
              key={s.id}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => choisir(s)}
              className="w-full text-start px-3 py-2 text-sm hover:bg-muted"
            >
              <span className="font-medium">{s.label}</span>
              {s.organisation && <span className="text-muted-foreground"> · {s.organisation}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default IntervenantSaisie;
