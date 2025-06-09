// components/index.ts - Export central de tous les composants

// Composants UI
export {
  NotificationProvider,
  useNotifications,
  Modal,
  Loading,
  ConfirmationModal,
  Dropdown,
  Badge,
  Tabs,
  useModal,
  useConfirmation
} from './UI';

// Composants Cards
export {
  OeuvreCard,
  EvenementCard,
  LieuCard
} from './Cards';

// Composants de formulaires
export { default as OeuvreForm } from './Forms/OeuvreForms';
export { default as FileUpload } from './Upload/FileUpload';

// Layout
export { default as MainLayout } from './Layout/MainLayout';

// Types pour les composants
export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface CardProps extends ComponentProps {
  onClick?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

export interface FormProps extends ComponentProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: any;
}