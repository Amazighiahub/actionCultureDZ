
import React from 'react';
import { Separator } from '@/components/ui/separator';
import { MapPin, Phone, Mail, Facebook, Instagram, Youtube } from 'lucide-react';

const Footer = () => {
  const footerSections = [
    {
      title: 'Navigation',
      links: [
        { label: 'Événements', href: '#evenements' },
        { label: 'Patrimoine', href: '#patrimoine' },
        { label: 'Œuvres', href: '#oeuvres' },
        { label: 'Artisanat', href: '#artisanat' },
      ]
    },
    {
      title: 'Ressources',
      links: [
        { label: 'Guide d\'utilisation', href: '#' },
        { label: 'FAQ', href: '#' },
        { label: 'Contact', href: '#' },
        { label: 'À propos', href: '#' },
      ]
    },
    {
      title: 'Légal',
      links: [
        { label: 'Conditions générales', href: '#' },
        { label: 'Politique de confidentialité', href: '#' },
        { label: 'Mentions légales', href: '#' },
        { label: 'Droits d\'auteur', href: '#' },
      ]
    }
  ];

  return (
    <footer className="bg-card border-t">
      <div className="container py-12 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Informations principales */}
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <span className="text-lg font-bold">🏛️</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gradient">Timlilit Culture</h3>
                  <p className="text-xs text-muted-foreground">L'écho d'Algérie</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Plateforme dédiée à la promotion et à la préservation 
                du riche patrimoine culturel algérien.
              </p>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>Algérie</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>+213 21 XX XX XX</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>contact@echoalgerie.com</span>
              </div>
            </div>
          </div>

          {/* Sections de navigation */}
          {footerSections.map((section) => (
            <div key={section.title} className="space-y-4">
              <h4 className="font-semibold">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
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
        
        <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
          <p className="text-sm text-muted-foreground">
            © 2024 Culture Algérie. Tous droits réservés.
          </p>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">Suivez-nous :</span>
            <div className="flex space-x-2">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
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
