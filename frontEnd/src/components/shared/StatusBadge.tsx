/**
 * StatusBadge - Badge de statut réutilisable avec styles prédéfinis
 *
 * Une seule table des statuts (libellé, icône, couleurs) pour tout le site : comptes, publications,
 * événements, programme et participations. Avant, la gestion des participants, l'inscription et le
 * programme avaient chacun leur table, et deux statuts de participation montraient le mauvais mot
 * (« Inscrit » affichait « En attente », « Confirmé » affichait « Validé ») (audit V11 COD-26).
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Badge } from '@/components/ui/badge';
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
  Unlock,
  Mail
} from 'lucide-react';
import { cn } from '@/lib/Utils';
import { getLocalizedText } from '@/utils/getLocalizedText';
import i18n from 'i18next';

type StatusType =
  | 'actif' | 'inactif' | 'suspendu' | 'en_attente' | 'valide' | 'rejete'
  | 'publie' | 'brouillon' | 'archive' | 'en_cours' | 'termine' | 'annule'
  | 'a_venir' | 'complet' | 'ouvert' | 'ferme' | 'planifie' | 'reporte'
  | 'en_attente_validation' | 'banni'
  | 'invitation' | 'inscrit' | 'confirme' | 'present' | 'absent';

interface StatusBadgeProps {
  status: StatusType | string | Record<string, unknown> | null | undefined;
  /** Texte à la place du libellé commun (ex. le point de vue du participant : « Non retenue ») */
  label?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface StatutConfig {
  cle: string;
  defaut: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  Icone: React.ElementType;
  couleurs: string;
}

// Couleurs communes (avec le mode sombre)
const VERT = 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900';
const GRIS = 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
const ROUGE = 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900';
const JAUNE = 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900';
const BLEU = 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900';
const ORANGE = 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-900';
const AMBRE = 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900';

const STATUTS: Record<string, StatutConfig> = {
  // Statuts utilisateur
  actif: { cle: 'status.active', defaut: 'Actif', variant: 'default', Icone: CheckCircle, couleurs: VERT },
  inactif: { cle: 'status.inactive', defaut: 'Inactif', variant: 'secondary', Icone: Pause, couleurs: GRIS },
  suspendu: { cle: 'status.suspended', defaut: 'Suspendu', variant: 'destructive', Icone: Lock, couleurs: ROUGE },
  en_attente: { cle: 'status.pending', defaut: 'En attente', variant: 'outline', Icone: Clock, couleurs: JAUNE },
  valide: { cle: 'status.validated', defaut: 'Validé', variant: 'default', Icone: CheckCircle, couleurs: VERT },
  rejete: { cle: 'status.rejected', defaut: 'Rejeté', variant: 'destructive', Icone: XCircle, couleurs: ROUGE },
  // Statuts de compte (user.statut)
  en_attente_validation: { cle: 'status.pendingValidation', defaut: 'En attente de validation', variant: 'outline', Icone: Clock, couleurs: JAUNE },
  banni: { cle: 'status.banned', defaut: 'Banni', variant: 'destructive', Icone: XCircle, couleurs: '' },

  // Statuts publication
  publie: { cle: 'status.published', defaut: 'Publié', variant: 'default', Icone: Eye, couleurs: VERT },
  brouillon: { cle: 'status.draft', defaut: 'Brouillon', variant: 'secondary', Icone: EyeOff, couleurs: GRIS },
  archive: { cle: 'status.archived', defaut: 'Archivé', variant: 'outline', Icone: Lock, couleurs: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' },

  // Statuts événements et programme
  planifie: { cle: 'status.planned', defaut: 'Planifié', variant: 'default', Icone: Clock, couleurs: BLEU },
  a_venir: { cle: 'status.upcoming', defaut: 'À venir', variant: 'default', Icone: Clock, couleurs: BLEU },
  en_cours: { cle: 'status.ongoing', defaut: 'En cours', variant: 'default', Icone: Play, couleurs: VERT },
  termine: { cle: 'status.finished', defaut: 'Terminé', variant: 'secondary', Icone: CheckCircle, couleurs: GRIS },
  annule: { cle: 'status.cancelled', defaut: 'Annulé', variant: 'destructive', Icone: XCircle, couleurs: ROUGE },
  reporte: { cle: 'status.postponed', defaut: 'Reporté', variant: 'outline', Icone: AlertTriangle, couleurs: ORANGE },
  complet: { cle: 'status.full', defaut: 'Complet', variant: 'outline', Icone: AlertTriangle, couleurs: ORANGE },
  ouvert: { cle: 'status.open', defaut: 'Ouvert', variant: 'default', Icone: Unlock, couleurs: VERT },
  ferme: { cle: 'status.closed', defaut: 'Fermé', variant: 'secondary', Icone: Lock, couleurs: GRIS },

  // Statuts de participation (EvenementUser.statut_participation)
  // invitation : ajouté par l'import d'une liste, la personne n'a pas encore confirmé
  invitation: { cle: 'status.invitation', defaut: 'Invitation envoyée', variant: 'outline', Icone: Mail, couleurs: AMBRE },
  inscrit: { cle: 'status.inscrit', defaut: 'Inscrit', variant: 'outline', Icone: Clock, couleurs: JAUNE },
  confirme: { cle: 'status.confirme', defaut: 'Confirmé', variant: 'default', Icone: CheckCircle, couleurs: VERT },
  present: { cle: 'status.present', defaut: 'Présent', variant: 'default', Icone: CheckCircle, couleurs: VERT },
  absent: { cle: 'status.absent', defaut: 'Absent', variant: 'secondary', Icone: XCircle, couleurs: GRIS }
};

/** Libellé traduit d'un statut (même texte que le badge : listes de filtres, etc.) */
export const libelleStatut = (statut: string, t: TFunction): string => {
  const config = STATUTS[statut.toLowerCase()];
  return config ? t(config.cle, config.defaut) : statut || t('status.unknown', 'Inconnu');
};

// Convertir status en string de manière robuste (peut être un objet multilingue)
const normalizeStatus = (s: unknown): string => {
  if (s === null || s === undefined) return '';
  if (typeof s === 'string') return s;
  if (typeof s === 'object') {
    const obj = s as Record<string, unknown>;
    if (Object.keys(obj).length === 0) return '';
    return getLocalizedText(obj, i18n.language);
  }
  return String(s);
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-0.5',
  lg: 'text-base px-3 py-1'
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  showIcon = true,
  size = 'md',
  className
}) => {
  const { t } = useTranslation();

  const normalizedStatus = normalizeStatus(status);
  const config = STATUTS[normalizedStatus.toLowerCase()];
  const Icone = config?.Icone;

  return (
    <Badge
      variant={config?.variant ?? 'outline'}
      className={cn(
        'inline-flex items-center gap-1 font-medium',
        config?.couleurs,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && Icone && <Icone className="h-3 w-3" aria-hidden="true" />}
      {label ?? libelleStatut(normalizedStatus, t)}
    </Badge>
  );
};

export default StatusBadge;
