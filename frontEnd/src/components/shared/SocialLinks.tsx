/**
 * Liens vers le site web et les réseaux sociaux d'un professionnel (profil, organisateur)
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Facebook, Instagram, Youtube, Linkedin, Twitter, Music2, Globe, type LucideIcon } from 'lucide-react';
import { safeExternalUrl } from '@/utils/safeUrl';
import { cn } from '@/lib/Utils';

// Même liste et mêmes domaines que le backend (dto/user/updateUserDTO.js)
export const SOCIAL_NETWORKS: Array<{ key: string; label: string; icon: LucideIcon; placeholder: string; domains: string[] }> = [
  { key: 'facebook', label: 'Facebook', icon: Facebook, placeholder: 'https://www.facebook.com/…', domains: ['facebook.com', 'fb.com'] },
  { key: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://www.instagram.com/…', domains: ['instagram.com'] },
  { key: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'https://www.youtube.com/@…', domains: ['youtube.com', 'youtu.be'] },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://www.linkedin.com/in/…', domains: ['linkedin.com'] },
  { key: 'tiktok', label: 'TikTok', icon: Music2, placeholder: 'https://www.tiktok.com/@…', domains: ['tiktok.com'] },
  { key: 'x', label: 'X (Twitter)', icon: Twitter, placeholder: 'https://x.com/…', domains: ['x.com', 'twitter.com'] },
];

/** Lien http(s) vers le site du réseau annoncé (vide = valide : lien retiré) */
export function isValidSocialUrl(networkKey: string, url: string): boolean {
  if (!url.trim()) return true;
  try {
    const u = new URL(url.trim());
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    const host = u.hostname.toLowerCase();
    const network = SOCIAL_NETWORKS.find((n) => n.key === networkKey);
    return !!network && network.domains.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

export type SocialLinksValue = Partial<Record<string, string>> | string | null | undefined;

/** Accepte l'objet JSON ou sa forme texte (selon la base) */
export function parseSocialLinks(value: SocialLinksValue): Record<string, string> {
  if (!value) return {};
  if (typeof value === 'string') {
    try { return parseSocialLinks(JSON.parse(value)); } catch { return {}; }
  }
  return Object.fromEntries(Object.entries(value).filter(([, v]) => typeof v === 'string' && v.trim())) as Record<string, string>;
}

interface SocialLinksProps {
  links?: SocialLinksValue;
  website?: string | null;
  /** Nom du professionnel, pour des libellés explicites (« Instagram de Amina B. ») */
  ownerName?: string;
  className?: string;
}

const SocialLinks: React.FC<SocialLinksProps> = ({ links, website, ownerName, className }) => {
  const { t } = useTranslation();
  const parsed = parseSocialLinks(links);
  const items = [
    ...(safeExternalUrl(website) ? [{ key: 'site_web', label: t('common.website', 'Site web'), icon: Globe, href: safeExternalUrl(website)! }] : []),
    ...SOCIAL_NETWORKS
      .map((n) => ({ ...n, href: safeExternalUrl(parsed[n.key]) }))
      .filter((n): n is typeof n & { href: string } => !!n.href),
  ];
  if (items.length === 0) return null;

  return (
    <ul className={cn('flex flex-wrap items-center gap-1', className)} aria-label={t('profile.socialLinks', 'Site web et réseaux sociaux')}>
      {items.map(({ key, label, icon: Icon, href }) => (
        <li key={key}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            aria-label={ownerName ? t('profile.socialOf', '{{network}} de {{name}}', { network: label, name: ownerName }) : label}
            title={label}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
};

export default SocialLinks;
