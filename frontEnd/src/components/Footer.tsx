import React from 'react';
import { Link } from 'react-router-dom';
import { Separator } from '@/components/UI/separator';
import { MapPin, Phone, Mail, Facebook, Instagram, Youtube, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRTL } from '@/utils/rtl';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';

const Footer = () => {
  const { t, i18n } = useTranslation();
  const { isRtl, rtlClasses } = useRTL(i18n.language);
  const { formatNumber } = useLocalizedNumber();

  const footerSections = [
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
        { label: t('footer.links.userGuide'), href: '/guide' },
        { label: t('footer.links.faq'), href: '/faq' },
        { label: t('common.contact'), href: '/contact' },
        { label: t('common.about'), href: '/a-propos' },
      ]
    },
    {
      title: t('footer.legal'),
      links: [
        { label: t('common.terms'), href: '/conditions' },
        { label: t('common.privacy'), href: '/confidentialite' },
        { label: t('footer.links.legalNotices'), href: '/mentions-legales' },
        { label: t('common.copyright'), href: '/droits-auteur' },
      ]
    }
  ];

  const phoneNumber = '+213 21 XX XX XX';
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Youtube, href: '#', label: 'YouTube' },
  ];

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
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground flex-shrink-0">
                  <span className="text-lg font-bold">🏛️</span>
                </div>
                <div>
                  <h3 className={`text-base sm:text-lg font-bold text-gradient ${isRtl ? 'font-arabic' : ''}`}>
                    {t('header.title')}
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
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                {/* ✅ CORRECTION: Numéro de téléphone toujours LTR */}
                <span dir="ltr" className="rtl-preserve">{phoneNumber}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                {/* ✅ CORRECTION: Email toujours LTR */}
                <a 
                  href="mailto:contact@echoalgerie.com" 
                  dir="ltr" 
                  className="rtl-preserve hover:text-primary transition-colors"
                >
                  contact@echoalgerie.com
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
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary inline-flex items-center gap-1 group"
                    >
                      {link.label}
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
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
          </p>
          
          {/* Réseaux sociaux - ✅ CORRECTION: Taille tactile */}
          <div className="flex items-center gap-3 order-1 sm:order-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {t('common.followUs')}
            </span>
            <div className="flex items-center gap-1">
              {socialLinks.map((social) => (
                <a 
                  key={social.label}
                  href={social.href}
                  className="p-2.5 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;