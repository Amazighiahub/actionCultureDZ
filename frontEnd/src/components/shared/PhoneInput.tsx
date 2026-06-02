import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/Utils';
import { COUNTRY_CODES, type CountryCode } from '@/data/countryCodes';

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

function splitPhone(value: string): { dialCode: string; local: string } {
  const match = value.match(/^(\+\d{1,4})\s?(.*)$/);
  if (match) return { dialCode: match[1], local: match[2] };
  return { dialCode: '+213', local: value };
}

export function PhoneInput({
  value,
  onChange,
  onBlur,
  id,
  error,
  placeholder,
  className,
  searchPlaceholder = 'Rechercher un pays...',
  noResultText = 'Pays introuvable.',
  autoComplete,
  maxLength,
  'aria-describedby': ariaDescribedBy,
}: PhoneInputProps) {
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
            className="w-[130px] flex-shrink-0 justify-between font-normal"
          >
            <span>{selectedCountry.flag} {selectedCountry.code}</span>
            <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{noResultText}</CommandEmpty>
              <CommandGroup>
                {COUNTRY_CODES.map((country) => (
                  <CommandItem
                    key={`${country.code}-${country.nameEn}`}
                    value={`${country.name} ${country.nameEn} ${country.code}`}
                    onSelect={() => handleCountrySelect(country)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedCountry.code === country.code && selectedCountry.nameEn === country.nameEn
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    {country.flag} {country.name} ({country.code})
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
