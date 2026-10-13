/**
 * Partage d'une page sur les réseaux sociaux.
 * - `full` : boutons Facebook, LinkedIn, X, WhatsApp, Telegram + copie du lien
 *   (réservé au professionnel sur ses propres contenus, pour les publier sur sa page)
 * - sinon : seulement « Copier le lien »
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Facebook, Linkedin, Twitter, MessageCircle, Send, Link2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/Utils';

interface ShareButtonsProps {
  url: string;
  title: string;
  full?: boolean;
  className?: string;
}

const NETWORKS = [
  { key: 'facebook', label: 'Facebook', icon: Facebook, href: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, href: (u: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
  { key: 'x', label: 'X', icon: Twitter, href: (u: string, t: string) => `https://x.com/intent/post?url=${u}&text=${t}` },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, href: (u: string, t: string) => `https://wa.me/?text=${t}%20${u}` },
  { key: 'telegram', label: 'Telegram', icon: Send, href: (u: string, t: string) => `https://t.me/share/url?url=${u}&text=${t}` },
];

const ShareButtons: React.FC<ShareButtonsProps> = ({ url, title, full = false, className }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const tt = encodeURIComponent(title);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Navigateurs sans presse-papiers asynchrone
      const area = document.createElement('textarea');
      area.value = url;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {full && (
        <>
          <span className="text-sm text-muted-foreground me-1">{t('share.onMyPage', 'Partager sur ma page :')}</span>
          {NETWORKS.map(({ key, label, icon: Icon, href }) => (
            <Button key={key} asChild variant="outline" size="icon" className="h-9 w-9">
              <a
                href={href(u, tt)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('share.on', 'Partager sur {{network}}', { network: label })}
                title={label}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          ))}
        </>
      )}
      <Button type="button" variant="outline" size="sm" onClick={copy} aria-live="polite">
        {copied ? <Check className="h-4 w-4 me-2" aria-hidden="true" /> : <Link2 className="h-4 w-4 me-2" aria-hidden="true" />}
        {copied ? t('share.copied', 'Lien copié') : t('common.copyLink', 'Copier le lien')}
      </Button>
    </div>
  );
};

export default ShareButtons;
