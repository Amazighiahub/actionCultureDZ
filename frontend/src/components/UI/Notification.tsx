
// src/components/ui/Notification.tsx - Composant notification individuelle
import React, { useEffect } from 'react';
import {
  HiCheckCircle,
  HiExclamationTriangle,
  HiInformationCircle,
  HiXCircle,
  HiXMark
} from 'react-icons/hi2';

interface NotificationProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
  onClose: () => void;
}

export const Notification: React.FC<NotificationProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  actions,
  onClose
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <HiCheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <HiXCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <HiExclamationTriangle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <HiInformationCircle className="w-5 h-5 text-blue-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className={`max-w-sm w-full bg-white border rounded-lg shadow-lg pointer-events-auto ${getBackgroundColor()}`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">
              {title}
            </p>
            <p className="mt-1 text-sm text-gray-700">
              {message}
            </p>
            
            {actions && actions.length > 0 && (
              <div className="mt-3 flex space-x-2">
                {actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      action.action();
                      onClose();
                    }}
                    className="text-sm bg-white border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={onClose}
              className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <HiXMark className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

