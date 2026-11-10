import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/Utils';
import { useTranslation } from 'react-i18next';
import { COUNTRY_CODES, type CountryCode } from '@/data/countryCodes';
import { splitPhone } from '@/utils/telephone';

/** Code ISO du pays (« DZ ») retrouvé à partir de son drapeau (deux lettres « régionales » Unicode) */
const codeIso = (drapeau: string): string | null => {
  const lettres = Array.from(drapeau).map((c) => (c.codePointAt(0) ?? 0) - 0x1f1e6);
  return lettres.length === 2 && lettres.every((n) => n >= 0 && n < 26)
    ? String.fromCharCode(65 + lettres[0], 65 + lettres[1])
    : null;
};

type NomsDeRegions = { of: (code: string) => string | undefined };

/**
 * Nom du pays dans la langue du site : le navigateur le connaît (Intl.DisplayNames). Avant, les noms
 * étaient en français même sur le site arabe (audit V11 FRM-22). Repli : le nom de la liste.
 */
function nommeur(langue: string): (pays: CountryCode) => string {
  let noms: NomsDeRegions | null = null;
  try {
    const DisplayNames = (Intl as unknown as { DisplayNames?: new (l: string[], o: { type: string }) => NomsDeRegions }).DisplayNames;
    if (DisplayNames) noms = new DisplayNames([langue], { type: 'region' });
  } catch { noms = null; }
  return (pays) => {
    const iso = codeIso(pays.flag);
    const traduit = iso && noms ? noms.of(iso) : undefined;
    if (traduit && traduit !== iso) return traduit;
    return langue.startsWith('fr') ? pays.name : pays.nameEn;
  };
}

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  id?: string;
  error?: boolean;
  placeholder?: string;
  className?: string;
  searchPlaceholder?: string;
  noResultText?: string;
  autoComplete?: string;
  maxLength?: number;
  'aria-describedby'?: string;
}


export function PhoneInput({
  value,
  onChange,
  onBlur,
  id,
  error,
  placeholder,
  className,
  searchPlaceholder,
  noResultText,
  autoComplete,
  maxLength,
  'aria-describedby': ariaDescribedBy,
}: PhoneInputProps) {
  const { t, i18n } = useTranslation();
  const langue = i18n?.language || 'fr';
  // Tamazight : pas de noms de pays dans le navigateur, le français est utilisé comme ailleurs sur le site
  const nomDuPays = useMemo(() => nommeur(langue.startsWith('tz') ? 'fr' : langue), [langue]);
  const [open, setOpen] = useState(false);
  const { dialCode, local } = splitPhone(value);

  const selectedCountry = useMemo(
    () => COUNTRY_CODES.find((c) => c.code === dialCode) ?? COUNTRY_CODES[0],
    [dialCode]
  );

  function handleCountrySelect(country: CountryCode) {
    onChange(country.code + ' ' + local);
    setOpen(false);
  }

  function handleLocalChange(e: React.ChangeEvent<HTMLInputElement>) {
    const num = e.target.value.replace(/[^\d\s\-()]/g, '');
    onChange(dialCode + ' ' + num);
  }

  return (
    <div className={cn('flex gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            // Nom accessible : « Indicatif du pays : Algérie +213 » (avant : aucun)
            aria-label={`${t('auth.register.indicatif', 'Indicatif du pays')} : ${nomDuPays(selectedCountry)} ${selectedCountry.code}`}
            className="w-[130px] flex-shrink-0 justify-between font-normal"
            dir="ltr"
          >
            <span>{selectedCountry.flag} {selectedCountry.code}</span>
            <ChevronsUpDown className="ms-1 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder ?? t('auth.register.rechercherPays', 'Rechercher un pays…')} />
            <CommandList>
              <CommandEmpty>{noResultText ?? t('auth.register.paysIntrouvable', 'Pays introuvable.')}</CommandEmpty>
              <CommandGroup>
                {COUNTRY_CODES.map((country) => (
                  <CommandItem
                    key={`${country.code}-${country.nameEn}`}
                    // Recherche par le nom affiché, le nom français, le nom anglais ou l'indicatif
                    value={`${nomDuPays(country)} ${country.name} ${country.nameEn} ${country.code}`}
                    onSelect={() => handleCountrySelect(country)}
                  >
                    <Check
                      className={cn(
                        'me-2 h-4 w-4',
                        selectedCountry.code === country.code && selectedCountry.nameEn === country.nameEn
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    {country.flag} {nomDuPays(country)} <span dir="ltr" className="ms-1 text-muted-foreground">({country.code})</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Input
        id={id}
        type="tel"
        dir="ltr"
        value={local}
        onChange={handleLocalChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className={cn('flex-1', error ? 'border-destructive' : '')}
        aria-invalid={error}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-describedby={ariaDescribedBy}
      />
    </div>
  );
}
