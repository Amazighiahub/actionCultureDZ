// components/ConnectionStatus.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Composant pour afficher le statut de connexion WebSocket.
 * Note: L'interface ExtendedSocketService est utilisée pour étendre le type
 * de socketService avec des propriétés optionnelles qui peuvent ne pas être
 * présentes dans toutes les implémentations.
 */
import React, { useEffect, useState } from 'react';
import { socketService } from '@/services/socketService';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  RefreshCw,
  Cloud,
  CloudOff,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Interface pour l'état de connexion
interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  lastError: Error | null;
  reconnectAttempts: number;
  lastActivity?: Date;
}

// Interface étendue pour socketService avec les propriétés optionnelles
interface ExtendedSocketService {
  isConnected?: boolean;
  connectionInfo?: ConnectionState | null;
  onStateChange?: (callback: (state: ConnectionState) => void) => () => void;
  reconnect?: () => void;
  isPolling?: boolean;
  socketId?: string;
  [key: string]: any; // Permet d'autres propriétés
}

// Cast du socketService avec le type étendu
const socketServiceTyped = socketService as unknown as ExtendedSocketService;

interface ConnectionStatusProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  showDetails?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  position = 'bottom-right',
  showDetails = false,
  autoHide = true,
  autoHideDelay = 3000
}) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    socketServiceTyped.connectionInfo || {
      isConnected: socketServiceTyped.isConnected || false,
      isConnecting: false,
      lastError: null,
      reconnectAttempts: 0
    }
  );
  const [isVisible, setIsVisible] = useState(false);
  const [hideTimer, setHideTimer] = useState<NodeJS.Timeout | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    // S'abonner aux changements d'état si la méthode existe
    if (socketServiceTyped.onStateChange) {
      unsubscribe = socketServiceTyped.onStateChange((state: ConnectionState) => {
        setConnectionState(state);
        
        // Afficher l'indicateur lors des changements d'état
        if (!state.isConnected || state.isConnecting || state.lastError) {
          showStatus();
        } else if (autoHide && state.isConnected) {
          // Masquer après un délai si connecté
          hideAfterDelay();
        }
      });
    }

    // Vérifier l'état initial
    const initialState = socketServiceTyped.connectionInfo || {
      isConnected: socketServiceTyped.isConnected || false,
      isConnecting: false,
      lastError: null,
      reconnectAttempts: 0
    };
    setConnectionState(initialState);
    
    if (!initialState.isConnected) {
      showStatus();
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoHide, autoHideDelay]);

  const showStatus = () => {
    setIsVisible(true);
    if (hideTimer) {
      clearTimeout(hideTimer);
    }
  };

  const hideAfterDelay = () => {
    if (hideTimer) {
      clearTimeout(hideTimer);
    }
    
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, autoHideDelay);
    
    setHideTimer(timer);
  };

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      if (socketServiceTyped.reconnect) {
        socketServiceTyped.reconnect();
      }
      // Attendre un peu pour voir le résultat
      setTimeout(() => {
        setIsReconnecting(false);
      }, 2000);
    } catch (error) {
      setIsReconnecting(false);
    }
  };

  // Positions CSS
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  // Ne rien afficher si caché et connecté
  if (!isVisible && connectionState.isConnected && !showDetails) {
    return null;
  }

  // Badge simple pour l'état connecté
  if (connectionState.isConnected && !showDetails) {
    return (
      <div className={cn('fixed z-50 transition-all duration-300', positionClasses[position])}>
        <Badge 
          variant="secondary"
          className="flex items-center gap-2 px-3 py-2 shadow-lg cursor-pointer bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/30"
          onClick={() => setIsVisible(false)}
        >
          <Cloud className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-800 dark:text-green-200">Connecté</span>
        </Badge>
      </div>
    );
  }

  // Vue détaillée ou état déconnecté
  return (
    <div 
      className={cn(
        'fixed z-50 transition-all duration-300',
        positionClasses[position],
        !isVisible && 'opacity-0 pointer-events-none'
      )}
    >
      {showDetails ? (
        // Vue détaillée avec Alert
        <Alert className={cn(
          'w-80 shadow-lg',
          connectionState.isConnected ? 'border-green-500 dark:border-green-400' : 
          connectionState.isConnecting ? 'border-yellow-500 dark:border-yellow-400' : 
          'border-red-500 dark:border-red-400'
        )}>
          <div className="space-y-3">
            {/* En-tête */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {connectionState.isConnected ? (
                  <>
                    <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-green-600 dark:text-green-400">Connecté</span>
                  </>
                ) : connectionState.isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-yellow-600 dark:text-yellow-400" />
                    <span className="font-medium text-yellow-600 dark:text-yellow-400">Connexion...</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="font-medium text-red-600 dark:text-red-400">Déconnecté</span>
                  </>
                )}
              </div>
              
              {!connectionState.isConnected && !connectionState.isConnecting && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReconnect}
                  disabled={isReconnecting}
                >
                  {isReconnecting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>

            {/* Détails */}
            <AlertDescription className="space-y-1 text-xs">
              {connectionState.lastError && (
                <p className="text-red-600 dark:text-red-400">
                  Erreur: {connectionState.lastError.message}
                </p>
              )}
              
              {connectionState.reconnectAttempts > 0 && (
                <p>
                  Tentatives de reconnexion: {connectionState.reconnectAttempts}
                </p>
              )}
              
              {socketServiceTyped.isPolling && (
                <p className="text-yellow-600 dark:text-yellow-400">
                  Mode dégradé (polling)
                </p>
              )}
              
              {socketServiceTyped.socketId && (
                <p className="text-muted-foreground">
                  ID: {socketServiceTyped.socketId.substring(0, 8)}...
                </p>
              )}
            </AlertDescription>
          </div>
        </Alert>
      ) : (
        // Badge simple pour états non connectés
        <Badge 
          variant={connectionState.isConnecting ? "secondary" : "destructive"}
          className={cn(
            "flex items-center gap-2 px-3 py-2 shadow-lg",
            connectionState.isConnecting && "bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30"
          )}
        >
          {connectionState.isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-yellow-700 dark:text-yellow-300" />
              <span className="text-sm text-yellow-900 dark:text-yellow-100">Connexion...</span>
            </>
          ) : (
            <>
              <CloudOff className="h-4 w-4" />
              <span className="text-sm">Mode hors ligne</span>
              {connectionState.reconnectAttempts > 0 && (
                <span className="text-xs opacity-75">
                  ({connectionState.reconnectAttempts})
                </span>
              )}
            </>
          )}
        </Badge>
      )}
    </div>
  );
};

// Composant minimal pour afficher uniquement une icône
export const ConnectionStatusIcon: React.FC<{ className?: string }> = ({ className }) => {
  const [isConnected, setIsConnected] = useState(socketServiceTyped.isConnected || false);

  useEffect(() => {
    if (socketServiceTyped.onStateChange) {
      const unsubscribe = socketServiceTyped.onStateChange((state: ConnectionState) => {
        setIsConnected(state.isConnected);
      });

      return unsubscribe;
    }
  }, []);

  return isConnected ? (
    <Wifi className={cn('h-4 w-4 text-green-600 dark:text-green-400', className)} />
  ) : (
    <WifiOff className={cn('h-4 w-4 text-red-600 dark:text-red-400', className)} />
  );
};

// Hook pour utiliser l'état de connexion
export const useConnectionStatus = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    socketServiceTyped.connectionInfo || {
      isConnected: socketServiceTyped.isConnected || false,
      isConnecting: false,
      lastError: null,
      reconnectAttempts: 0
    }
  );

  useEffect(() => {
    if (socketServiceTyped.onStateChange) {
      const unsubscribe = socketServiceTyped.onStateChange(setConnectionState);
      return unsubscribe;
    }
  }, []);

  return {
    ...connectionState,
    reconnect: () => socketServiceTyped.reconnect?.(),
    isPolling: socketServiceTyped.isPolling || false,
    socketId: socketServiceTyped.socketId
  };
};