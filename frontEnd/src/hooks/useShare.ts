/**
 * Partage d'une page : feuille de partage du système (mobile) si disponible,
 * sinon copie du lien avec confirmation, et un bouton « WhatsApp » qui ouvre le message prêt
 * (texte + lien ; audit V11 OUT-3). Annuler la feuille de partage ne fait rien.
 */
import { createElement, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { ToastAction, type ToastActionElement } from '@/components/ui/toast';
import { lienWhatsApp } from '@/utils/textePartage';

interface ShareOptions {
  title: string;
  text?: string;
  url?: string;
}

/** Copie dans le presse-papiers (repli pour les anciens navigateurs) ; réutilisée par « Citer cette page » */
export const copyText = async (value: string): Promise<boolean> => {
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
    // Ordinateur : WhatsApp (application ou WhatsApp Web) avec le texte et le lien déjà écrits
    const whatsapp = createElement(ToastAction, {
      altText: t('share.whatsapp', 'Envoyer sur WhatsApp'),
      onClick: () => window.open(lienWhatsApp(text || title, url), '_blank', 'noopener,noreferrer')
    }, t('share.whatsappCourt', 'WhatsApp')) as unknown as ToastActionElement;
    toast(copied
      ? { title: t('share.copied', 'Lien copié'), action: whatsapp }
      : { title: t('common.error', 'Erreur'), description: url, variant: 'destructive', action: whatsapp });
  }, [t, toast]);
}
