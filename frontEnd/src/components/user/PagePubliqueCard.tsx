/**
 * « Ma page publique » (professionnels) : lien vers le portfolio (toujours public), QR code
 * à partager, et choix d'afficher ou non l'e-mail et le téléphone (PUT /users/privacy,
 * enregistré immédiatement).
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { httpClient } from '@/services/httpClient';
import { professionnelPath } from '@/utils/slug';
import PortfolioQRCode from '@/components/user/PortfolioQRCode';

interface PagePubliqueCardProps {
  user: {
    id_user: number;
    prenom?: unknown;
    nom?: unknown;
    email_public?: boolean;
    telephone_public?: boolean;
  };
}

type Setting = 'email_public' | 'telephone_public';
// Noms attendus par l'API /users/privacy
const API_FIELD: Record<Setting, string> = {
  email_public: 'afficher_email',
  telephone_public: 'afficher_telephone',
};

const text = (v: unknown) => (typeof v === 'object' && v ? String((v as Record<string, string>).fr || '') : String(v || ''));

const PagePubliqueCard: React.FC<PagePubliqueCardProps> = ({ user }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<Setting, boolean>>({
    email_public: !!user.email_public,
    telephone_public: !!user.telephone_public,
  });
  const [saving, setSaving] = useState<Setting | null>(null);

  const update = async (setting: Setting, value: boolean) => {
    const previous = values[setting];
    setValues((v) => ({ ...v, [setting]: value }));
    setSaving(setting);
    try {
      const response = await httpClient.put('/users/privacy', { [API_FIELD[setting]]: value });
      if (!response.success) throw new Error(response.error);
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    } catch {
      setValues((v) => ({ ...v, [setting]: previous }));
      toast({ title: t('common.error', 'Erreur'), description: t('dashboarduser.updateFailed', 'Erreur lors de la mise à jour'), variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const rows: Array<{ key: Setting; label: string; hint: string }> = [
    { key: 'email_public', label: t('publicPage.showEmail', 'Afficher mon e-mail'), hint: t('publicPage.showEmailHint', 'Les visiteurs peuvent vous écrire directement.') },
    { key: 'telephone_public', label: t('publicPage.showPhone', 'Afficher mon téléphone'), hint: t('publicPage.showPhoneHint', 'Les visiteurs peuvent vous appeler.') },
  ];

  return (
    <section className="mt-8 pt-6 border-t" aria-labelledby="page-publique-titre">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 id="page-publique-titre" className="text-lg font-semibold">{t('publicPage.title', 'Ma page publique')}</h3>
          <p className="text-sm text-muted-foreground">{t('publicPage.hint', 'Votre portfolio : profil, biographie et contenus publiés.')}</p>
        </div>
        <Button asChild variant="outline">
          <Link to={professionnelPath(user.id_user, text(user.prenom), text(user.nom))}>
            <ExternalLink className="h-4 w-4 me-2" aria-hidden="true" />
            {t('publicPage.view', 'Voir mon portfolio')}
          </Link>
        </Button>
      </div>
      {/* QR code du portfolio */}
      <div className="mb-6 rounded-lg border p-4">
        <h4 className="font-medium mb-3">{t('qrcode.title', 'Mon QR code')}</h4>
        <PortfolioQRCode userId={user.id_user} name={`${text(user.prenom)} ${text(user.nom)}`.trim()} />
      </div>

      <ul className="space-y-4">
        {rows.map(({ key, label, hint }) => (
          <li key={key} className="flex items-start justify-between gap-4">
            <div>
              <label htmlFor={`page-publique-${key}`} className="font-medium">{label}</label>
              <p id={`page-publique-${key}-aide`} className="text-sm text-muted-foreground">{hint}</p>
            </div>
            <Switch
              id={`page-publique-${key}`}
              checked={values[key]}
              disabled={saving === key}
              aria-describedby={`page-publique-${key}-aide`}
              onCheckedChange={(checked) => update(key, checked)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
};

export default PagePubliqueCard;
