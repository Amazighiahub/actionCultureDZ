// hooks/useConfirmedAction.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

// Types
interface UseConfirmedActionOptions {
  confirmMessage?: string;
  confirmDelay?: number; // Délai avant de pouvoir confirmer (ms)
  cooldownPeriod?: number; // Période de cooldown après l'action (ms)
  requireConfirmation?: boolean; // Demander une confirmation
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onFinally?: () => void;
}

interface ConfirmedActionState {
  isLoading: boolean;
  cooldown: boolean;
  error: Error | null;
  lastExecutionTime: number | null;
}

interface ConfirmedActionReturn<T extends (...args: any[]) => Promise<any>> {
  execute: (...args: Parameters<T>) => Promise<ReturnType<T> | undefined>;
  executeWithoutConfirmation: (...args: Parameters<T>) => Promise<ReturnType<T> | undefined>;
  isLoading: boolean;
  cooldown: boolean;
  error: Error | null;
  reset: () => void;
  canExecute: boolean;
  timeUntilNextExecution: number;
}

/**
 * Hook pour gérer les actions avec confirmation et protection anti-spam
 */
export function useConfirmedAction<T extends (...args: any[]) => Promise<any>>(
  action: T,
  options: UseConfirmedActionOptions = {}
): ConfirmedActionReturn<T> {
  const {
    confirmMessage = 'Êtes-vous sûr de vouloir effectuer cette action ?',
    confirmDelay = 0,
    cooldownPeriod = 2000,
    requireConfirmation = true,
    showSuccessToast = true,
    showErrorToast = true,
    onSuccess,
    onError,
    onFinally
  } = options;

  const [state, setState] = useState<ConfirmedActionState>({
    isLoading: false,
    cooldown: false,
    error: null,
    lastExecutionTime: null
  });
  
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Nettoyer les timers au démontage
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      if (updateTimerRef.current) clearInterval(updateTimerRef.current);
    };
  }, []);

  // Calculer le temps restant avant la prochaine exécution
  const [timeUntilNextExecution, setTimeUntilNextExecution] = useState(0);

  useEffect(() => {
    if (state.cooldown && state.lastExecutionTime) {
      const updateTime = () => {
        const elapsed = Date.now() - state.lastExecutionTime!;
        const remaining = Math.max(0, cooldownPeriod - elapsed);
        setTimeUntilNextExecution(remaining);
        
        if (remaining === 0 && updateTimerRef.current) {
          clearInterval(updateTimerRef.current);
          updateTimerRef.current = null;
        }
      };

      updateTime();
      updateTimerRef.current = setInterval(updateTime, 100);

      return () => {
        if (updateTimerRef.current) {
          clearInterval(updateTimerRef.current);
          updateTimerRef.current = null;
        }
      };
    } else {
      setTimeUntilNextExecution(0);
    }
  }, [state.cooldown, state.lastExecutionTime, cooldownPeriod]);

  // Exécuter l'action sans confirmation
  const executeWithoutConfirmation = useCallback(async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
    // Vérifier le cooldown
    if (state.cooldown) {
      const remainingTime = Math.ceil(timeUntilNextExecution / 1000);
      toast({
        title: "Action trop rapide",
        description: `Veuillez patienter ${remainingTime} seconde${remainingTime > 1 ? 's' : ''} avant de réessayer`,
        // Using default variant instead of warning
      });
      return undefined;
    }

    // Vérifier si déjà en cours
    if (state.isLoading) {
      toast({
        title: "Action en cours",
        description: "Veuillez patienter la fin de l'action précédente",
        // Using default variant instead of warning
      });
      return undefined;
    }

    // Mettre à jour l'état
    setState(prev => ({
      ...prev,
      isLoading: true,
      cooldown: true,
      error: null,
      lastExecutionTime: Date.now()
    }));

    try {
      // Exécuter l'action
      const result = await action(...args);
      
      // Succès
      if (showSuccessToast && result?.success) {
        toast({
          title: "Succès",
          description: result.message || "Action effectuée avec succès",
        });
      }
      
      onSuccess?.();
      
      return result;
    } catch (error) {
      const err = error as Error;
      console.error('Erreur action confirmée:', err);
      
      // Gérer l'erreur
      setState(prev => ({ ...prev, error: err }));
      
      if (showErrorToast) {
        toast({
          title: "Erreur",
          description: err.message || "Une erreur est survenue",
          variant: "destructive",
        });
      }
      
      onError?.(err);
      throw err;
    } finally {
      // Mettre à jour l'état de chargement
      setState(prev => ({ ...prev, isLoading: false }));
      
      // Programmer la fin du cooldown
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
      
      cooldownTimerRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, cooldown: false }));
        cooldownTimerRef.current = null;
      }, cooldownPeriod);
      
      onFinally?.();
    }
  }, [action, state.isLoading, state.cooldown, timeUntilNextExecution, cooldownPeriod, showSuccessToast, showErrorToast, onSuccess, onError, onFinally, toast]);

  // Exécuter l'action avec confirmation
  const execute = useCallback(async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
    // Si pas de confirmation requise, exécuter directement
    if (!requireConfirmation) {
      return executeWithoutConfirmation(...args);
    }

    // Demander confirmation
    return new Promise((resolve) => {
      // Utiliser une modal de confirmation personnalisée ou le confirm natif
      const confirmed = window.confirm(confirmMessage);
      
      if (confirmed) {
        if (confirmDelay > 0) {
          // Attendre le délai de confirmation
          toast({
            title: "Confirmation",
            description: `Action dans ${confirmDelay / 1000} secondes...`,
          });
          
          setTimeout(async () => {
            try {
              const result = await executeWithoutConfirmation(...args);
              resolve(result);
            } catch (error) {
              resolve(undefined);
            }
          }, confirmDelay);
        } else {
          // Exécuter immédiatement
          executeWithoutConfirmation(...args).then(resolve).catch(() => resolve(undefined));
        }
      } else {
        resolve(undefined);
      }
    });
  }, [confirmMessage, confirmDelay, requireConfirmation, executeWithoutConfirmation, toast]);

  // Réinitialiser l'état
  const reset = useCallback(() => {
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    
    setState({
      isLoading: false,
      cooldown: false,
      error: null,
      lastExecutionTime: null
    });
  }, []);

  // Vérifier si l'action peut être exécutée
  const canExecute = !state.isLoading && !state.cooldown;

  return {
    execute,
    executeWithoutConfirmation,
    isLoading: state.isLoading,
    cooldown: state.cooldown,
    error: state.error,
    reset,
    canExecute,
    timeUntilNextExecution
  };
}

// Variante avec dialog de confirmation personnalisé
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';

interface UseConfirmedActionWithDialogOptions extends UseConfirmedActionOptions {
  dialogTitle?: string | ((...args: any[]) => string);
  dialogDescription?: string | ((...args: any[]) => string);
  confirmButtonText?: string | ((...args: any[]) => string);
  cancelButtonText?: string;
  confirmButtonVariant?: 'default' | 'destructive' | ((...args: any[]) => 'default' | 'destructive');
}

export function useConfirmedActionWithDialog<T extends (...args: any[]) => Promise<any>>(
  action: T,
  options: UseConfirmedActionWithDialogOptions = {}
): ConfirmedActionReturn<T> & { dialog: React.ReactNode } {
  const {
    dialogTitle = 'Confirmer l\'action',
    dialogDescription = options.confirmMessage || 'Êtes-vous sûr de vouloir effectuer cette action ?',
    confirmButtonText = 'Confirmer',
    cancelButtonText = 'Annuler',
    confirmButtonVariant = 'default',
    ...baseOptions
  } = options;

  const [showDialog, setShowDialog] = useState(false);
  // Correction : Typage correct pour pendingArgs
  const [pendingArgs, setPendingArgs] = useState<Parameters<T> | null>(null);
  
  const baseAction = useConfirmedAction(action, {
    ...baseOptions,
    requireConfirmation: false // On gère la confirmation nous-mêmes
  });

  const execute = useCallback(async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
    setPendingArgs(args);
    setShowDialog(true);
    return undefined; // La vraie exécution se fait dans le dialog
  }, []);

  const handleConfirm = useCallback(async () => {
    if (pendingArgs) {
      setShowDialog(false);
      // Correction : Assertion de type pour s'assurer que pendingArgs est du bon type
      const result = await baseAction.executeWithoutConfirmation(...(pendingArgs as Parameters<T>));
      setPendingArgs(null);
      return result;
    }
  }, [pendingArgs, baseAction]);

  const handleCancel = useCallback(() => {
    setShowDialog(false);
    setPendingArgs(null);
  }, []);

  // Fonction helper pour résoudre les valeurs dynamiques
  const resolveValue = <V,>(value: V | ((...args: any[]) => V)): V => {
    if (typeof value === 'function' && pendingArgs) {
      return (value as (...args: any[]) => V)(...pendingArgs);
    }
    return value as V;
  };

  const dialog = (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{resolveValue(dialogTitle)}</AlertDialogTitle>
          <AlertDialogDescription>{resolveValue(dialogDescription)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={baseAction.isLoading}>
            {cancelButtonText}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            disabled={baseAction.isLoading || baseAction.cooldown}
            className={resolveValue(confirmButtonVariant) === 'destructive' ? 'bg-destructive text-destructive-foreground' : ''}
          >
            {baseAction.isLoading ? 'Traitement...' : resolveValue(confirmButtonText)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return {
    ...baseAction,
    execute,
    dialog
  };
}