/**
 * EmptyState - Composant d'état vide réutilisable
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/UI/button';
import { cn } from '@/lib/utils';
import { 
  Inbox, 
  Search, 
  FileText, 
  Calendar, 
  Users, 
  MapPin,
  Palette,
  Package
} from 'lucide-react';

type EmptyStateType = 
  | 'default' 
  | 'search' 
  | 'documents' 
  | 'events' 
  | 'users' 
  | 'locations'
  | 'works'
  | 'products';

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const defaultIcons: Record<EmptyStateType, React.ReactNode> = {
  default: <Inbox className="h-12 w-12" />,
  search: <Search className="h-12 w-12" />,
  documents: <FileText className="h-12 w-12" />,
  events: <Calendar className="h-12 w-12" />,
  users: <Users className="h-12 w-12" />,
  locations: <MapPin className="h-12 w-12" />,
  works: <Palette className="h-12 w-12" />,
  products: <Package className="h-12 w-12" />
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'default',
  title,
  description,
  icon,
  action,
  className
}) => {
  const { t } = useTranslation();

  const defaultTitles: Record<EmptyStateType, string> = {
    default: t('emptyState.default.title', 'Aucun élément'),
    search: t('emptyState.search.title', 'Aucun résultat'),
    documents: t('emptyState.documents.title', 'Aucun document'),
    events: t('emptyState.events.title', 'Aucun événement'),
    users: t('emptyState.users.title', 'Aucun utilisateur'),
    locations: t('emptyState.locations.title', 'Aucun lieu'),
    works: t('emptyState.works.title', 'Aucune œuvre'),
    products: t('emptyState.products.title', 'Aucun produit')
  };

  const defaultDescriptions: Record<EmptyStateType, string> = {
    default: t('emptyState.default.description', 'Il n\'y a rien à afficher pour le moment.'),
    search: t('emptyState.search.description', 'Essayez de modifier vos critères de recherche.'),
    documents: t('emptyState.documents.description', 'Commencez par ajouter un document.'),
    events: t('emptyState.events.description', 'Aucun événement n\'est prévu pour le moment.'),
    users: t('emptyState.users.description', 'Aucun utilisateur ne correspond à vos critères.'),
    locations: t('emptyState.locations.description', 'Aucun lieu n\'a été trouvé.'),
    works: t('emptyState.works.description', 'Aucune œuvre n\'est disponible.'),
    products: t('emptyState.products.description', 'Aucun produit n\'est disponible.')
  };

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}>
      <div className="text-muted-foreground mb-4">
        {icon || defaultIcons[type]}
      </div>
      <h3 className="text-lg font-semibold mb-2">
        {title || defaultTitles[type]}
      </h3>
      <p className="text-muted-foreground max-w-sm mb-6">
        {description || defaultDescriptions[type]}
      </p>
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;