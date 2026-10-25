import React from 'react';
import { Link } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { MapPin, Mail, ExternalLink, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRTL } from '@/utils/rtl';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { lienGuide } from '@/utils/lienGuide';

const Footer = () => {
  const { t, i18n } = useTranslation();
  const { isRtl, rtlClasses } = useRTL(i18n.language);
  const { formatNumber } = useLocalizedNumber();

  const footerSections: Array<{ title: string; links: Array<{ label: string; href: string; statique?: boolean }> }> = [
    {
      title: t('footer.navigation'),
      links: [
        { label: t('header.nav.events'), href: '/evenements' },
        { label: t('header.nav.heritage'), href: '/patrimoine' },
        { label: t('header.nav.works'), href: '/oeuvres' },
        { label: t('header.nav.crafts'), href: '/artisanat' },
      ]
    },
    {
      title: t('footer.resources'),
      links: [
        { label: t('common.about'), href: '/a-propos' },
        // Page statique (public/guide), hors de l'application : lien classique, pas <Link>
        { label: t('common.contributorGuide', 'Guide du contributeur'), href: lienGuide(i18n.language), statique: true },
      ]
    },
    {
      title: t('footer.legal'),
      links: [
        { label: t('common.terms'), href: '/a-propos#conditions' },
        { label: t('common.privacy'), href: '/a-propos#confidentialite' },
        { label: t('common.legalNotice', 'Mentions légales'), href: '/a-propos#mentions-legales' },
      ]
    }
  ];

  const contactEmail = 'contact@taladz.com';
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        
        {/* ✅ CORRECTION: Grille responsive améliorée */}
        <div className="grid gap-8 sm:gap-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Informations principales */}
          <div className="space-y-6 sm:col-span-2 lg:col-span-1">
            {/* Logo et titre */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <img src="/medracen.webp" alt="" width={96} height={96} loading="lazy" className="h-10 w-10 flex-shrink-0 rounded-full object-cover ring-2 ring-stone-200 dark:ring-stone-700" />
                <div>
                  <h3 className="mb-1">
                    <img src="/logo-taladz.webp" alt={t('header.title')} width={350} height={87} loading="lazy" className="h-7 w-auto dark:bg-stone-100 dark:rounded dark:px-1" />
                  </h3>
                  <p className="text-xs text-muted-foreground">{t('header.subtitle')}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('footer.platform')}
              </p>
            </div>
            
            {/* Coordonnées - ✅ CORRECTION: Espacement avec gap */}
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span>{t('footer.location')}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <a
                  href={`mailto:${contactEmail}`}
                  dir="ltr"
                  className="rtl-preserve hover:text-primary transition-colors"
                >
                  {contactEmail}
                </a>
              </div>
            </div>

            {/* QR code de la plateforme (image statique : l'URL taladz.com ne change pas) */}
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-white p-1.5 border flex-shrink-0">
                <img
                  src="/images/qrcode-taladz.svg"
                  alt={t('footer.qrCode.alt')}
                  width={96}
                  height={96}
                  loading="lazy"
                  className="h-24 w-24"
                />
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">{t('footer.qrCode.title')}</p>
                <a
                  href="/images/qrcode-taladz.png"
                  download="qrcode-taladz.png"
                  className="inline-flex items-center gap-1.5 hover:text-primary transition-colors min-h-[44px]"
                >
                  <Download className="h-4 w-4" />
                  {t('footer.qrCode.download')}
                </a>
              </div>
            </div>
          </div>

          {/* Sections de navigation - ✅ CORRECTION: Responsive grid */}
          {footerSections.map((section) => (
            <div key={section.title} className="space-y-4">
              <h4 className={`font-semibold text-sm sm:text-base ${isRtl ? 'font-arabic' : ''}`}>
                {section.title}
              </h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.statique ? (
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-primary inline-flex items-center gap-1 group"
                      >
                        {link.label}
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-primary inline-flex items-center gap-1 group"
                      >
                        {link.label}
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-6 sm:my-8" />
        
        {/* Pied de page - ✅ CORRECTION: Stack sur mobile, row sur desktop */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          
          {/* Copyright */}
          <p className="text-sm text-muted-foreground text-center sm:text-start order-2 sm:order-1">
            © {currentYear} {t('header.title')}. {t('common.copyright')}
            {/* Crédit exigé par la licence de la photo du logo (CC BY 4.0) */}
            <span className="block text-xs mt-1">
              {t('footer.creditLogo', 'Logo : le Madghacen, photo de Bernard Gagnon')} (
              <a href="https://commons.wikimedia.org/wiki/File:Madghacen_01.jpg" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">CC BY 4.0</a>)
            </span>
          </p>
          
          {/* Pas de réseaux sociaux du site : Tala DZ n'a pas de comptes officiels. Les réseaux
              sont ceux des professionnels, affichés sur leur fiche (components/shared/SocialLinks) */}
        </div>
      </div>
    </footer>
  );
};

export default Footer;