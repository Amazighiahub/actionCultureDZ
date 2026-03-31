/**
 * RequiredLabel - Label avec étoile rouge pour champs obligatoires
 * + FieldError - Message d'erreur sous un champ
 * + CharCount - Compteur de caractères
 */
import React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/Utils';

interface RequiredLabelProps {
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const RequiredLabel: React.FC<RequiredLabelProps> = ({
  htmlFor,
  required = false,
  optional = false,
  children,
  className
}) => (
  <Label htmlFor={htmlFor} className={cn('text-sm font-medium', className)}>
    {children}
    {required && <span className="text-destructive ml-1">*</span>}
    {optional && <span className="text-muted-foreground font-normal ml-1">(optionnel)</span>}
  </Label>
);

interface FieldErrorProps {
  error?: string;
  id?: string;
}

export const FieldError: React.FC<FieldErrorProps> = ({ error, id }) => {
  if (!error) return null;
  return (
    <p id={id} role="alert" className="text-sm text-destructive mt-1">
      {error}
    </p>
  );
};

interface CharCountProps {
  current: number;
  min?: number;
  max: number;
}

export const CharCount: React.FC<CharCountProps> = ({ current, min, max }) => (
  <p className={cn(
    'text-xs mt-1',
    current < (min || 0) ? 'text-destructive' : current > max * 0.9 ? 'text-amber-500' : 'text-muted-foreground'
  )}>
    {current}/{max}
    {min && current < min && ` (min ${min})`}
  </p>
);

export default RequiredLabel;
