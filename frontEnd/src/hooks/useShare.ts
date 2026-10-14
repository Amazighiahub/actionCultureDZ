/**
 * Partage d'une page : feuille de partage du système (mobile) si disponible,
 * sinon copie du lien avec confirmation. Annuler la feuille de partage ne fait rien.
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

interface ShareOptions {
  title: string;
  text?: string;
  url?: string;
}

const copyText = async (value: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Navigateurs sans presse-papiers asynchrone (http, anciens navigateurs)
    const area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
};

export function useShare() {
  const { t } = useTranslation();
  const { toast } = useToast();

  return useCallback(async ({ title, text, url = window.location.href }: ShareOptions) => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        // Partage annulé par l'utilisateur : pas de repli
        if ((err as DOMException)?.name === 'AbortError') return;
      }
    }
    const copied = await copyText(url);
    toast(copied
      ? { title: t('share.copied', 'Lien copié') }
      : { title: t('common.error', 'Erreur'), description: url, variant: 'destructive' });
  }, [t, toast]);
}
