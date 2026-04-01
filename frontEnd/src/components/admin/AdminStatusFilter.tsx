/**
 * AdminStatusFilter - Composant de filtre par statut réutilisable
 * Utilisé dans les onglets admin (Users, Oeuvres, Evenements, etc.)
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

interface AdminStatusFilterProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  translationPrefix?: string;
  /** Label for the "tous" option (default: 'Tous les statuts') */
  allLabel?: string;
  className?: string;
}

const AdminStatusFilter: React.FC<AdminStatusFilterProps> = ({
  value,
  onChange,
  options,
  placeholder,
  translationPrefix = 'common',
  allLabel,
  className = 'w-full sm:w-[180px]'
}) => {
  const { t } = useTranslation();

  const defaultAllLabel = t('common.allStatuses', 'Tous les statuts');

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder || allLabel || defaultAllLabel} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {opt === 'tous'
              ? (allLabel || defaultAllLabel)
              : t(`${translationPrefix}.${opt}`, opt)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default AdminStatusFilter;
