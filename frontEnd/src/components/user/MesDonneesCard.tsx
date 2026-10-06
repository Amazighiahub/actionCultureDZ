/**
 * MesDonneesCard — droits RGPD de l'utilisateur dans son profil :
 * export de toutes ses données (art. 15/20) et suppression du compte (art. 17).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Trash2, ShieldCheck, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/services/user.service';

export default function MesDonneesCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { logout, user } = useAuth();
  // Consentement newsletter : retirable à tout moment (RGPD art. 7.3)
  const [newsletter, setNewsletter] = useState<boolean>(
    Boolean((user as { accepte_newsletter?: boolean } | null)?.accepte_newsletter)
  );
  const [savingNewsletter, setSavingNewsletter] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    const res = await userService.exportMyData();
    setExporting(false);
    toast(res.success
      ? { title: t('myData.exportDone', 'Vos données ont été téléchargées') }
      : { title: t('myData.exportFailed', 'Export impossible, réessayez plus tard'), variant: 'destructive' });
  };

  const handleNewsletter = async (checked: boolean) => {
    setSavingNewsletter(true);
    const res = await userService.updatePreferences({ newsletter: checked });
    setSavingNewsletter(false);
    if (res.success) {
      setNewsletter(checked);
      toast({ title: checked
        ? t('myData.newsletterOn', 'Vous êtes abonné(e) à la newsletter')
        : t('myData.newsletterOff', 'Vous êtes désabonné(e) de la newsletter') });
    } else {
      toast({ title: t('myData.newsletterFailed', 'Modification impossible, réessayez'), variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!password) return;
    setDeleting(true);
    try {
      const res = await userService.deleteMyAccount(password);
      if (!res.success) throw new Error(res.error);
      setDeleteOpen(false);
      toast({ title: t('myData.deleteDone', 'Votre compte a été supprimé') });
      // Les cookies sont déjà effacés par le serveur : on nettoie l'état local
      await logout();
    } catch {
      toast({
        title: t('myData.deleteFailed', 'Suppression impossible : vérifiez votre mot de passe'),
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
      setPassword('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          {t('myData.title', 'Mes données')}
        </CardTitle>
        <CardDescription>
          {t('myData.description', 'Vous pouvez à tout moment récupérer une copie de vos données ou supprimer votre compte.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="newsletter-consent">{t('myData.newsletter', 'Newsletter')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('myData.newsletterHint', 'Recevoir chaque semaine les nouveaux événements et œuvres par email.')}
            </p>
          </div>
          <Switch
            id="newsletter-consent"
            checked={newsletter}
            disabled={savingNewsletter}
            onCheckedChange={handleNewsletter}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {t('myData.exportHint', 'Fichier JSON contenant votre profil, vos contenus, inscriptions, favoris et notifications.')}
          </p>
          <Button variant="outline" onClick={handleExport} disabled={exporting} className="shrink-0">
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            {t('myData.export', 'Exporter mes données')}
          </Button>
        </div>

        <div className="rounded-lg border border-destructive/40 p-4 space-y-3">
          <p className="text-sm font-medium text-destructive">{t('myData.dangerZone', 'Zone de danger')}</p>
          <p className="text-sm text-muted-foreground">
            {t('myData.deleteHint', 'La suppression est définitive : vos données personnelles sont effacées et vos contributions publiques deviennent anonymes.')}
          </p>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            {t('myData.delete', 'Supprimer mon compte')}
          </Button>
        </div>
      </CardContent>

      <Dialog open={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); if (!open) setPassword(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('myData.confirmTitle', 'Supprimer définitivement votre compte ?')}</DialogTitle>
            <DialogDescription>
              {t('myData.confirmText', 'Cette action est irréversible. Saisissez votre mot de passe pour confirmer.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-account-password">{t('myData.password', 'Mot de passe')}</Label>
            <Input
              id="delete-account-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleDelete(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              {t('common.cancel', 'Annuler')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!password || deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('myData.confirmDelete', 'Supprimer définitivement')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
