import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import {
  HiMiniXMark as X,
  HiMiniCheckCircle as CheckCircle,
  HiMiniInformationCircle as Info,
  HiMiniExclamationCircle as AlertCircle,
  HiMiniExclamationTriangle as AlertTriangle,
  HiMiniMagnifyingGlass as Search,
  HiMiniChevronDown as ChevronDown,
  HiMiniChevronUp as ChevronUp,
  HiMiniDocumentDuplicate as Copy,
  HiMiniArrowPath as Loader,
} from 'react-icons/hi2';

// =============================================================================
// IMPORTS DES COMPOSANTS EXTERNES
// =============================================================================
export { Pagination, PaginationInfo } from './Pagination';
export { default as LoadingScreen } from './LoadingScreen';
export { Notification } from './Notification';
export { NotificationContainer } from './NotificationContainer';
export { default as PhotoUpload } from './PhotoUpload';

// =============================================================================
// NOTIFICATIONS CONTEXT & PROVIDER
// =============================================================================

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 11);
    const newNotification = { ...notification, id };
    setNotifications((prev) => [...prev, newNotification]);
    if (notification.duration !== 0) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration || 5000);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => setNotifications([]);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearAll }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

const NotificationContainer: React.FC = () => {
  const context = useContext(NotificationContext);
  if (!context) return null;
  const { notifications, removeNotification } = context;
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <NotificationItem 
          key={notification.id} 
          notification={notification} 
          onClose={() => removeNotification(notification.id)} 
        />
      ))}
    </div>
  );
};

const NotificationItem: React.FC<{
  notification: Notification;
  onClose: () => void;
}> = ({ notification, onClose }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success': return CheckCircle;
      case 'error': return AlertCircle;
      case 'warning': return AlertTriangle;
      case 'info': return Info;
      default: return Info;
    }
  };
  
  const getColors = () => {
    switch (notification.type) {
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      case 'warning': return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };
  
  const Icon = getIcon();
  
  return (
    <div className={`${getColors()} border rounded-lg p-4 shadow-lg transition-all duration-300 animate-slide-up`}>
      <div className="flex items-start space-x-3">
        <Icon size={20} className="flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium">{notification.title}</h4>
          {notification.message && (
            <p className="text-sm mt-1 opacity-90">{notification.message}</p>
          )}
          {notification.action && (
            <button
              onClick={notification.action.onClick}
              className="text-sm font-medium mt-2 hover:underline"
            >
              {notification.action.label}
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};

// =============================================================================
// MODAL
// =============================================================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'max-w-md';
      case 'md': return 'max-w-lg';
      case 'lg': return 'max-w-2xl';
      case 'xl': return 'max-w-4xl';
      case 'full': return 'max-w-full m-4';
      default: return 'max-w-lg';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-patrimoine-sombre/50 transition-opacity"
          onClick={closeOnBackdrop ? onClose : undefined}
        />
        
        {/* Modal */}
        <div className={`relative bg-white rounded-lg shadow-patrimoine-lg w-full ${getSizeClasses()} max-h-[90vh] overflow-hidden animate-scale-in`}>
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-6 border-b border-patrimoine-canard/10">
              {title && (
                <h3 className="text-lg font-semibold text-patrimoine-canard">{title}</h3>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-2 text-patrimoine-canard/60 hover:text-patrimoine-canard rounded-lg hover:bg-patrimoine-creme/30 transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          )}
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// LOADING
// =============================================================================

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  overlay?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  text = 'Chargement...',
  overlay = false
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'w-4 h-4';
      case 'md': return 'w-8 h-8';
      case 'lg': return 'w-12 h-12';
      default: return 'w-8 h-8';
    }
  };

  const content = (
    <div className="flex flex-col items-center space-y-3">
      <Loader className={`${getSizeClasses()} animate-spin text-patrimoine-emeraude`} />
      {text && <p className="text-patrimoine-sombre/70 text-sm">{text}</p>}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
};

// =============================================================================
// CONFIRMATION MODAL
// =============================================================================

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'danger',
  isLoading = false
}) => {
  const getButtonColors = () => {
    switch (type) {
      case 'danger': return 'bg-patrimoine-datte hover:bg-patrimoine-datte-dark text-white';
      case 'warning': return 'bg-patrimoine-or hover:bg-patrimoine-or-dark text-white';
      case 'info': return 'bg-patrimoine-emeraude hover:bg-patrimoine-emeraude-dark text-white';
      default: return 'bg-patrimoine-datte hover:bg-patrimoine-datte-dark text-white';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'danger': return <AlertCircle className="text-patrimoine-datte" size={24} />;
      case 'warning': return <AlertTriangle className="text-patrimoine-or" size={24} />;
      case 'info': return <Info className="text-patrimoine-emeraude" size={24} />;
      default: return <AlertCircle className="text-patrimoine-datte" size={24} />;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" closeOnBackdrop={!isLoading}>
      <div className="p-6">
        <div className="flex items-center space-x-4 mb-4">
          {getIcon()}
          <h3 className="text-lg font-semibold text-patrimoine-canard">{title}</h3>
        </div>
        <p className="text-patrimoine-sombre/70 mb-6">{message}</p>
        <div className="flex space-x-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-patrimoine-canard bg-white border border-patrimoine-canard/20 rounded-lg hover:bg-patrimoine-creme/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors ${getButtonColors()}`}
          >
            {isLoading && <Loader size={16} className="animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

// =============================================================================
// DROPDOWN
// =============================================================================

interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ComponentType<any>;
  disabled?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Sélectionner...',
  searchable = false,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const selectedOption = options.find(opt => opt.value === value);
  const filteredOptions = searchable
    ? options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative dropdown-container ${className}`}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2 border border-patrimoine-canard/20 rounded-lg focus:ring-2 focus:ring-patrimoine-emeraude focus:border-patrimoine-emeraude transition-colors ${
          disabled 
            ? 'bg-patrimoine-creme/50 cursor-not-allowed text-patrimoine-sombre/40' 
            : 'bg-white hover:bg-patrimoine-creme/20 text-patrimoine-canard'
        }`}
      >
        <span className={selectedOption ? 'text-patrimoine-canard' : 'text-patrimoine-sombre/60'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-patrimoine-canard/20 rounded-lg shadow-patrimoine z-50 max-h-60 overflow-hidden">
          {searchable && (
            <div className="p-3 border-b border-patrimoine-canard/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-patrimoine-canard/60" size={16} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full pl-9 pr-3 py-2 border border-patrimoine-canard/20 rounded-lg focus:ring-2 focus:ring-patrimoine-emeraude focus:border-patrimoine-emeraude bg-patrimoine-creme/30"
                />
              </div>
            </div>
          )}
          <div className="overflow-y-auto max-h-48">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    disabled={option.disabled}
                    className={`w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-patrimoine-creme/30 transition-colors ${
                      option.value === value ? 'bg-patrimoine-emeraude/10 text-patrimoine-emeraude' : 'text-patrimoine-canard'
                    } ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {Icon && <Icon size={16} />}
                    <span>{option.label}</span>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-patrimoine-sombre/60 text-center">
                Aucun résultat trouvé
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// BADGE
// =============================================================================

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'patrimoine';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-amber-100 text-amber-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      case 'patrimoine': return 'bg-patrimoine-emeraude/10 text-patrimoine-emeraude';
      default: return 'bg-patrimoine-creme text-patrimoine-canard';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'px-2 py-1 text-xs';
      case 'md': return 'px-2.5 py-1.5 text-sm';
      case 'lg': return 'px-3 py-2 text-base';
      default: return 'px-2.5 py-1.5 text-sm';
    }
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${getVariantClasses()} ${getSizeClasses()} ${className}`}>
      {children}
    </span>
  );
};

// =============================================================================
// TABS
// =============================================================================

interface Tab {
  id: string;
  label: string;
  icon?: React.ComponentType<any>;
  count?: number;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  children,
  className = ''
}) => {
  return (
    <div className={className}>
      <div className="border-b border-patrimoine-canard/10">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && onTabChange(tab.id)}
                disabled={tab.disabled}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-patrimoine-emeraude text-patrimoine-emeraude'
                    : tab.disabled
                    ? 'border-transparent text-patrimoine-sombre/40 cursor-not-allowed'
                    : 'border-transparent text-patrimoine-sombre/70 hover:text-patrimoine-canard hover:border-patrimoine-canard/30'
                }`}
              >
                {Icon && <Icon size={16} />}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <Badge variant="patrimoine" size="sm">
                    {tab.count}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
};

// =============================================================================
// HOOKS UTILITAIRES
// =============================================================================

export const useModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalProps, setModalProps] = useState<any>({});

  const openModal = (props?: any) => {
    setModalProps(props || {});
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setModalProps({});
  };

  return {
    isOpen,
    modalProps,
    openModal,
    closeModal
  };
};

export const useConfirmation = () => {
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const confirm = (params: {
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }) => {
    setConfirmation({
      isOpen: true,
      ...params
    });
  };

  const closeConfirmation = () => {
    setConfirmation(prev => ({ ...prev, isOpen: false }));
  };

  const ConfirmationDialog = () => (
    <ConfirmationModal
      isOpen={confirmation.isOpen}
      onClose={closeConfirmation}
      onConfirm={() => {
        confirmation.onConfirm();
        closeConfirmation();
      }}
      title={confirmation.title}
      message={confirmation.message}
      type={confirmation.type}
    />
  );

  return {
    confirm,
    ConfirmationDialog
  };
};

// Note: Les exports sont déjà faits en haut du fichier et dans les déclarations