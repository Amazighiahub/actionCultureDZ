/**
 * FormField - Composant de champ de formulaire réutilisable
 * Combine Label, Input, et gestion d'erreurs
 */
import React from 'react';
import { Label } from '@/components/UI/label';
import { Input } from '@/components/UI/input';
import { Textarea } from '@/components/UI/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/UI/select';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'textarea' | 'select';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  value?: string;
  onChange?: (value: string) => void;
  options?: Array<{ value: string; label: string }>;
  className?: string;
  rows?: number;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  error,
  value,
  onChange,
  options,
  className,
  rows = 3
}) => {
  const inputId = `field-${name}`;
  const hasError = !!error;

  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <Textarea
            id={inputId}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            rows={rows}
            className={cn(
              hasError && 'border-destructive focus:border-destructive',
              className
            )}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : undefined}
          />
        );
      
      case 'select':
        return (
          <Select value={value} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger
              className={cn(
                hasError && 'border-destructive focus:border-destructive',
                className
              )}
              aria-invalid={hasError}
              aria-describedby={hasError ? `${inputId}-error` : undefined}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      default:
        return (
          <Input
            id={inputId}
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            className={cn(
              hasError && 'border-destructive focus:border-destructive',
              className
            )}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : undefined}
          />
        );
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={inputId} required={required}>
        {label}
      </Label>
      
      {renderInput()}
      
      {hasError && (
        <p id={`${inputId}-error`} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;
