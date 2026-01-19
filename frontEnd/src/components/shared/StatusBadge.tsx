/**
 * StatusBadge - Badge de statut réutilisable avec styles prédéfinis
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/UI/badge';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertTriangle,
  Pause,
  Play,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from 'lucide-react';
import { cn } from '@/lib/utils';

type StatusType =
  | 'actif' | 'inactif' | 'suspendu' | 'en_attente' | 'valide' | 'rejete'
  | 'publie' | 'brouillon' | 'archive' | 'en_cours' | 'termine' | 'annule'
  | 'a_venir' | 'complet' | 'ouvert' | 'ferme' | 'planifie' | 'reporte';

interface StatusBadgeProps {
  status: StatusType | string | Record<string, unknown> | null | undefined;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface StatusConfig {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: React.ReactNode;
  className: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showIcon = true,
  size = 'md',
  className
}) => {
  const { t } = useTranslation();

  // Convertir status en string de manière robuste (peut être un objet multilingue)
  const normalizeStatus = (s: unknown): string => {
    if (s === null || s === undefined) return '';
    if (typeof s === 'string') return s;
    if (typeof s === 'object') {
      // Peut être un objet multilingue {fr: '...', ar: '...'}
      const obj = s as Record<string, unknown>;
      const keys = Object.keys(obj);
      if (keys.length === 0) return ''; // Objet vide
      // Chercher une valeur string
      const value = obj.fr || obj.ar || obj.en || obj['tz-ltn'] || obj['tz-tfng'] || Object.values(obj).find(v => typeof v === 'string');
      return typeof value === 'string' ? value : '';
    }
    return String(s);
  };

  const getStatusConfig = (statusValue: string): StatusConfig => {
    const configs: Record<string, StatusConfig> = {
      // Statuts utilisateur
      actif: {
        label: t('status.active', 'Actif'),
        variant: 'default',
        icon: <CheckCircle className="h-3 w-3" />,
        className: 'bg-green-100 text-green-800 border-green-200'
      },
      inactif: {
        label: t('status.inactive', 'Inactif'),
        variant: 'secondary',
        icon: <Pause className="h-3 w-3" />,
        className: 'bg-gray-100 text-gray-800 border-gray-200'
      },
      suspendu: {
        label: t('status.suspended', 'Suspendu'),
        variant: 'destructive',
        icon: <Lock className="h-3 w-3" />,
        className: 'bg-red-100 text-red-800 border-red-200'
      },
      en_attente: {
        label: t('status.pending', 'En attente'),
        variant: 'outline',
        icon: <Clock className="h-3 w-3" />,
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      },
      valide: {
        label: t('status.validated', 'Validé'),
        variant: 'default',
        icon: <CheckCircle className="h-3 w-3" />,
        className: 'bg-green-100 text-green-800 border-green-200'
      },
      rejete: {
        label: t('status.rejected', 'Rejeté'),
        variant: 'destructive',
        icon: <XCircle className="h-3 w-3" />,
        className: 'bg-red-100 text-red-800 border-red-200'
      },
      
      // Statuts publication
      publie: {
        label: t('status.published', 'Publié'),
        variant: 'default',
        icon: <Eye className="h-3 w-3" />,
        className: 'bg-green-100 text-green-800 border-green-200'
      },
      brouillon: {
        label: t('status.draft', 'Brouillon'),
        variant: 'secondary',
        icon: <EyeOff className="h-3 w-3" />,
        className: 'bg-gray-100 text-gray-800 border-gray-200'
      },
      archive: {
        label: t('status.archived', 'Archivé'),
        variant: 'outline',
        icon: <Lock className="h-3 w-3" />,
        className: 'bg-gray-100 text-gray-600 border-gray-200'
      },
      
      // Statuts événements
      planifie: {
        label: t('status.planned', 'Planifié'),
        variant: 'default',
        icon: <Clock className="h-3 w-3" />,
        className: 'bg-blue-100 text-blue-800 border-blue-200'
      },
      a_venir: {
        label: t('status.upcoming', 'À venir'),
        variant: 'default',
        icon: <Clock className="h-3 w-3" />,
        className: 'bg-blue-100 text-blue-800 border-blue-200'
      },
      en_cours: {
        label: t('status.ongoing', 'En cours'),
        variant: 'default',
        icon: <Play className="h-3 w-3" />,
        className: 'bg-green-100 text-green-800 border-green-200'
      },
      termine: {
        label: t('status.finished', 'Terminé'),
        variant: 'secondary',
        icon: <CheckCircle className="h-3 w-3" />,
        className: 'bg-gray-100 text-gray-800 border-gray-200'
      },
      annule: {
        label: t('status.cancelled', 'Annulé'),
        variant: 'destructive',
        icon: <XCircle className="h-3 w-3" />,
        className: 'bg-red-100 text-red-800 border-red-200'
      },
      reporte: {
        label: t('status.postponed', 'Reporté'),
        variant: 'outline',
        icon: <AlertTriangle className="h-3 w-3" />,
        className: 'bg-orange-100 text-orange-800 border-orange-200'
      },
      complet: {
        label: t('status.full', 'Complet'),
        variant: 'outline',
        icon: <AlertTriangle className="h-3 w-3" />,
        className: 'bg-orange-100 text-orange-800 border-orange-200'
      },
      ouvert: {
        label: t('status.open', 'Ouvert'),
        variant: 'default',
        icon: <Unlock className="h-3 w-3" />,
        className: 'bg-green-100 text-green-800 border-green-200'
      },
      ferme: {
        label: t('status.closed', 'Fermé'),
        variant: 'secondary',
        icon: <Lock className="h-3 w-3" />,
        className: 'bg-gray-100 text-gray-800 border-gray-200'
      }
    };

    // Utiliser la valeur normalisée
    return configs[statusValue.toLowerCase()] || {
      label: statusValue || t('status.unknown', 'Inconnu'),
      variant: 'outline',
      icon: null,
      className: ''
    };
  };

  // Normaliser le status avant de l'utiliser
  const normalizedStatus = normalizeStatus(status);
  const config = getStatusConfig(normalizedStatus);
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1'
  };

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'inline-flex items-center gap-1 font-medium',
        config.className,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && config.icon}
      {config.label}
    </Badge>
  );
};

export default StatusBadge;