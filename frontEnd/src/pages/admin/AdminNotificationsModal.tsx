/**
 * AdminNotificationsModal - Modal d'envoi de notifications admin
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Bell, Send, Users, User, AlertTriangle, Info,
  CheckCircle, Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { adminService } from '@/services/admin.service';

interface AdminNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Props optionnels pour pré-remplir
  targetType?: 'user' | 'group' | 'all';
  targetId?: number;
  targetName?: string;
  presetTitle?: string;
  presetMessage?: string;
}

// Types de notifications - will be translated in component
const NOTIFICATION_TYPES_CONFIG = [
  { value: 'info', key: 'admin.notifications.types.info', icon: Info, color: 'text-blue-600' },
  { value: 'validation', key: 'admin.notifications.types.validation', icon: CheckCircle, color: 'text-green-600' },
  { value: 'warning', key: 'admin.notifications.types.warning', icon: AlertTriangle, color: 'text-yellow-600' },
  { value: 'custom', key: 'admin.notifications.types.custom', icon: Bell, color: 'text-gray-600' }
];

// Groupes cibles — valeurs alignées sur le backend (all/professionals/visitors)
const TARGET_GROUPS_CONFIG = [
  { value: 'all', key: 'admin.notifications.targetGroups.all' },
  { value: 'professionals', key: 'admin.notifications.targetGroups.professionals' },
  { value: 'visitors', key: 'admin.notifications.targetGroups.visitors' }
];

const AdminNotificationsModal: React.FC<AdminNotificationsModalProps> = ({
  isOpen,
  onClose,
  targetType = 'all',
  targetId,
  targetName,
  presetTitle,
  presetMessage
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();

  // États du formulaire
  const [formData, setFormData] = useState({
    type: 'info',
    target: targetType,
    targetGroup: 'all',
    targetUserId: targetId,
    title: presetTitle || '',
    message: presetMessage || '',
    sendEmail: true,
    sendPush: true
  });

  const [sending, setSending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Mise à jour des champs
  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
  };

  // Envoi de la notification
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errs: Record<string, string> = {};
    if (!formData.title?.trim()) {
      errs.title = t('admin.notifications.titleRequired', 'Le titre est requis');
    }
    if (!formData.message?.trim()) {
      errs.message = t('admin.notifications.messageRequired', 'Le message est requis');
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast({
        title: t('admin.notifications.requiredFields'),
        description: Object.values(errs)[0],
        variant: 'destructive'
      });
      setTimeout(() => {
        const el = document.querySelector('[aria-invalid="true"]');
        if (el) {
          (el as HTMLElement).focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 0);
      return;
    }

    setSending(true);

    try {
      const target = formData.target === 'user' ? 'all' : (formData.targetGroup as 'all' | 'professionals' | 'visitors');
      const result = await adminService.broadcastNotification({
        title: formData.title,
        message: formData.message,
        target,
        type: formData.type,
        sendEmail: formData.sendEmail
      });

      if (result.success) {
        toast({
          title: t('admin.notifications.sent'),
          description: t('admin.notifications.sentCount', {
            count: result.data?.notified ?? 0,
            defaultValue: `Envoyé à ${result.data?.notified ?? 0} utilisateur(s)`
          })
        });
        onClose();
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('admin.notifications.sendError', 'Erreur lors de l\'envoi'),
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  // Templates prédéfinis
  const applyTemplate = (type: string) => {
    const templates: Record<string, { titleKey?: string; messageKey?: string; title?: string; message?: string; targetGroup?: string }> = {
      validation: {
        titleKey: 'admin.notifications.templates.validation.title',
        messageKey: 'admin.notifications.templates.validation.message'
      },
      rejection: {
        titleKey: 'admin.notifications.templates.rejection.title',
        messageKey: 'admin.notifications.templates.rejection.message'
      },
      maintenance: {
        titleKey: 'admin.notifications.templates.maintenance.title',
        messageKey: 'admin.notifications.templates.maintenance.message'
      },
      nouveaute: {
        titleKey: 'admin.notifications.templates.nouveaute.title',
        messageKey: 'admin.notifications.templates.nouveaute.message'
      },
      oeuvres: {
        title: t('admin.notifications.templates.oeuvres.title', 'Ajoutez vos œuvres sur Taladz !'),
        message: t('admin.notifications.templates.oeuvres.message',
          'Bonjour,\n\nNous avons le plaisir de vous informer que vous pouvez désormais ajouter vos œuvres sur notre plateforme Taladz.\n\nConnectez-vous à votre espace professionnel et commencez à partager votre travail avec notre communauté.\n\nL\'équipe Taladz'),
        targetGroup: 'professionals'
      }
    };

    const tpl = templates[type];
    if (tpl) {
      setFormData(prev => ({
        ...prev,
        title: tpl.title ?? (tpl.titleKey ? t(tpl.titleKey) : prev.title),
        message: tpl.message ?? (tpl.messageKey ? t(tpl.messageKey) : prev.message),
        ...(tpl.targetGroup ? { target: 'group', targetGroup: tpl.targetGroup } : {})
      }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('admin.notifications.modal.title')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.notifications.modal.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type de notification */}
          <div className="space-y-3">
            <Label>{t('admin.notifications.form.notificationType')}</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {NOTIFICATION_TYPES_CONFIG.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => updateField('type', type.value)}
                  className={`
                    flex flex-col items-center gap-1 p-3 border rounded-lg transition-all
                    ${formData.type === type.value
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted'
                    }
                  `}
                >
                  <type.icon className={`h-5 w-5 ${type.color}`} />
                  <span className="text-xs">{t(type.key)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cible */}
          <div className="space-y-3">
            <Label>{t('admin.notifications.form.recipient')}</Label>
            <RadioGroup
              value={formData.target}
              onValueChange={(v) => updateField('target', v)}
              className="flex flex-col sm:flex-row gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="user" id="target-user" />
                <Label htmlFor="target-user" className="flex items-center gap-1 cursor-pointer">
                  <User className="h-4 w-4" />
                  {t('admin.notifications.form.user')}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="group" id="target-group" />
                <Label htmlFor="target-group" className="flex items-center gap-1 cursor-pointer">
                  <Users className="h-4 w-4" />
                  {t('admin.notifications.form.group')}
                </Label>
              </div>
            </RadioGroup>

            {formData.target === 'user' && targetName && (
              <Alert>
                <User className="h-4 w-4" />
                <AlertDescription>
                  {t('admin.notifications.form.notificationFor')} <strong>{targetName}</strong>
                </AlertDescription>
              </Alert>
            )}

            {formData.target === 'group' && (
              <Select
                value={formData.targetGroup}
                onValueChange={(v) => updateField('targetGroup', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.notifications.form.selectGroup')} />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_GROUPS_CONFIG.map((group) => (
                    <SelectItem key={group.value} value={group.value}>
                      {t(group.key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Templates rapides */}
          <div className="space-y-2">
            <Label>{t('admin.notifications.form.quickTemplates')}</Label>
            <div className="flex flex-wrap gap-2">
              {['oeuvres', 'validation', 'rejection', 'maintenance', 'nouveaute'].map((tpl) => (
                <Button
                  key={tpl}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate(tpl)}
                >
                  {t(`admin.notifications.templates.${tpl}.label`)}
                </Button>
              ))}
            </div>
          </div>

          {/* Titre */}
          <div className="space-y-2">
            <Label htmlFor="title">{t('admin.notifications.form.title')} *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder={t('admin.notifications.form.titlePlaceholder')}
              required
              className={fieldErrors.title ? 'border-destructive' : ''}
              aria-invalid={!!fieldErrors.title}
              aria-describedby={fieldErrors.title ? 'notif-title-error' : undefined}
            />
            {fieldErrors.title && (
              <p id="notif-title-error" role="alert" className="text-sm text-destructive">{fieldErrors.title}</p>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">{t('admin.notifications.form.message')} *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => updateField('message', e.target.value)}
              placeholder={t('admin.notifications.form.messagePlaceholder')}
              className={`min-h-[120px] ${fieldErrors.message ? 'border-destructive' : ''}`}
              required
              aria-invalid={!!fieldErrors.message}
              aria-describedby={fieldErrors.message ? 'notif-message-error' : undefined}
            />
            {fieldErrors.message && (
              <p id="notif-message-error" role="alert" className="text-sm text-destructive">{fieldErrors.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {t('admin.notifications.form.characterCount', { count: formData.message.length, max: 500 })}
            </p>
          </div>

          {/* Options d'envoi */}
          <div className="space-y-3">
            <Label>{t('admin.notifications.form.sendChannels')}</Label>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sendEmail"
                  checked={formData.sendEmail}
                  onCheckedChange={(c) => updateField('sendEmail', !!c)}
                />
                <Label htmlFor="sendEmail" className="cursor-pointer">
                  {t('admin.notifications.form.email')}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sendPush"
                  checked={formData.sendPush}
                  onCheckedChange={(c) => updateField('sendPush', !!c)}
                />
                <Label htmlFor="sendPush" className="cursor-pointer">
                  {t('admin.notifications.form.pushNotification')}
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={sending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  {t('admin.notifications.form.sending')}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 me-2" />
                  {t('admin.notifications.form.send')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminNotificationsModal;
