/**
 * ConfirmDialog - Dialog de confirmation réutilisable
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/UI/dialog';
import { Button } from '@/components/UI/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive' | 'warning';
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'default',
  onConfirm,
  loading = false,
  icon
}) => {
  const { t } = useTranslation();

  const handleConfirm = async () => {
    await onConfirm();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return {
          iconColor: 'text-destructive',
          iconBg: 'bg-destructive/10',
          buttonVariant: 'destructive' as const
        };
      case 'warning':
        return {
          iconColor: 'text-yellow-600',
          iconBg: 'bg-yellow-100',
          buttonVariant: 'default' as const
        };
      default:
        return {
          iconColor: 'text-primary',
          iconBg: 'bg-primary/10',
          buttonVariant: 'default' as const
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-start gap-4">
            {(icon || variant !== 'default') && (
              <div className={cn('p-2 rounded-full', styles.iconBg)}>
                {icon || (
                  <AlertTriangle className={cn('h-5 w-5', styles.iconColor)} />
                )}
              </div>
            )}
            <div className="flex-1">
              <DialogTitle>{title}</DialogTitle>
              {description && (
                <DialogDescription className="mt-2">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel || t('common.cancel', 'Annuler')}
          </Button>
          <Button
            variant={styles.buttonVariant}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {confirmLabel || t('common.confirm', 'Confirmer')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;