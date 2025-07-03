import React from 'react';
import { Separator } from '@/components/ui/separator';
import { MapPin, Phone, Mail, Facebook, Instagram, Youtube } from 'lucide-react';
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
        { label: t('footer.links.userGuide'), href: '#' },
        { label: t('footer.links.faq'), href: '#' },
        { label: t('common.contact'), href: '#' },
        { label: t('common.about'), href: '/a-propos' },
      ]
    },
    {
      title: t('footer.legal'),
      links: [
        { label: t('common.terms'), href: '#' },
        { label: t('common.privacy'), href: '#' },
        { label: t('footer.links.legalNotices'), href: '#' },
        { label: t('common.copyright'), href: '#' },
      ]
    }
  ];

  const phoneNumber = isRtl ? formatNumber(213) + ' ' + formatNumber(21) + ' XX XX XX' : '+213 21 XX XX XX';
  const currentYear = formatNumber(new Date().getFullYear());

  return (
    <footer className="bg-card border-t">
      <div className="container py-12 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Informations principales */}
          <div className="space-y-6">
            <div className="space-y-2">
              <div className={`flex items-center ${rtlClasses.marginStart(3)}`}>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <span className="text-lg font-bold">🏛️</span>
                </div>
                <div className={rtlClasses.marginStart(3)}>
                  <h3 className={`text-lg font-bold text-gradient ${isRtl ? 'font-arabic' : ''}`}>
                    {t('header.title')}
                  </h3>
                  <p className="text-xs text-muted-foreground">{t('header.subtitle')}</p>
                </div>
              </div>
              <p className={`text-sm text-muted-foreground ${isRtl ? 'text-right' : 'text-left'}`}>
                {t('footer.platform')}
              </p>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className={`flex items-center ${rtlClasses.marginStart(2)}`}>
                <MapPin className={`h-4 w-4 text-muted-foreground ${rtlClasses.marginEnd(2)}`} />
                <span>{t('footer.location')}</span>
              </div>
              <div className={`flex items-center ${rtlClasses.marginStart(2)}`}>
                <Phone className={`h-4 w-4 text-muted-foreground ${rtlClasses.marginEnd(2)}`} />
                <span dir="ltr">{phoneNumber}</span>
              </div>
              <div className={`flex items-center ${rtlClasses.marginStart(2)}`}>
                <Mail className={`h-4 w-4 text-muted-foreground ${rtlClasses.marginEnd(2)}`} />
                <span dir="ltr">contact@echoalgerie.com</span>
              </div>
            </div>
          </div>

          {/* Sections de navigation */}
          {footerSections.map((section) => (
            <div key={section.title} className="space-y-4">
              <h4 className={`font-semibold ${isRtl ? 'font-arabic text-right' : 'text-left'}`}>
                {section.title}
              </h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className={`text-sm text-muted-foreground transition-colors hover:text-primary ${isRtl ? 'text-right' : 'text-left'}`}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />
        
        <div className={`flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0 ${isRtl ? 'md:flex-row-reverse' : ''}`}>
          <p className="text-sm text-muted-foreground">
            © {currentYear} {t('header.title')}. {t('common.copyright')}
          </p>
          
          <div className={`flex items-center ${rtlClasses.marginStart(4)}`}>
            <span className={`text-sm text-muted-foreground ${rtlClasses.marginEnd(4)}`}>
              {t('common.followUs')}
            </span>
            <div className={`flex ${rtlClasses.marginStart(2)}`}>
              <a 
                href="#" 
                className={`text-muted-foreground hover:text-primary transition-colors ${rtlClasses.marginEnd(2)}`}
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a 
                href="#" 
                className={`text-muted-foreground hover:text-primary transition-colors ${rtlClasses.marginEnd(2)}`}
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a 
                href="#" 
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;