// components/Layout/Footer.tsx
import React from 'react';
import { 
  HiMail,
  HiPhone,
  HiLocationMarker,
  HiExternalLink
} from 'react-icons/hi';
import { 
  FaFacebook, 
  FaInstagram, 
  FaTiktok, 
  FaYoutube,
  FaTwitter
} from 'react-icons/fa';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { name: 'Facebook', icon: FaFacebook, href: 'https://facebook.com/actionculture', color: 'hover:text-blue-400' },
    { name: 'Instagram', icon: FaInstagram, href: 'https://instagram.com/actionculture', color: 'hover:text-pink-400' },
    { name: 'TikTok', icon: FaTiktok, href: 'https://tiktok.com/@actionculture', color: 'hover:text-gray-100' },
    { name: 'YouTube', icon: FaYoutube, href: 'https://youtube.com/actionculture', color: 'hover:text-red-400' },
    { name: 'Twitter', icon: FaTwitter, href: 'https://twitter.com/actionculture', color: 'hover:text-blue-300' },
  ];

  const quickLinks = [
    { name: 'Œuvres', href: '/oeuvres' },
    { name: 'Événements', href: '/evenements' },
    { name: 'Patrimoine', href: '/patrimoine' },
    { name: 'À propos', href: '/a-propos' },
  ];

  const legalLinks = [
    { name: 'Mentions légales', href: '/mentions-legales' },
    { name: 'Politique de confidentialité', href: '/confidentialite' },
    { name: 'Conditions d\'utilisation', href: '/conditions' },
    { name: 'FAQ', href: '/faq' },
  ];

  return (
    <footer className="bg-gradient-to-r from-green-900 to-green-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Logo et description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-green-900 font-bold text-2xl">AC</span>
              </div>
              <div>
                <h3 className="font-bold text-2xl">Action Culture</h3>
                <p className="text-green-200 text-sm">Patrimoine Culturel d'Algérie</p>
              </div>
            </div>
            <p className="text-green-100 mb-6 max-w-md">
              Plateforme collaborative dédiée à la préservation et à la valorisation 
              du patrimoine culturel algérien. Découvrez, partagez et préservez 
              notre héritage commun.
            </p>
            
            {/* Réseaux sociaux */}
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-green-200 ${social.color} transition-colors duration-200`}
                  title={social.name}
                >
                  <social.icon className="h-6 w-6" />
                </a>
              ))}
            </div>
          </div>

          {/* Liens rapides */}
          <div>
            <h4 className="font-semibold text-lg mb-4 text-yellow-400">Liens rapides</h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-green-200 hover:text-white transition-colors duration-200 flex items-center space-x-1"
                  >
                    <HiExternalLink className="h-3 w-3" />
                    <span>{link.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-lg mb-4 text-yellow-400">Contactez-nous</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <HiMail className="h-5 w-5 text-green-300 mt-0.5" />
                <div>
                  <a href="mailto:contact@actionculture.dz" className="text-green-200 hover:text-white">
                    contact@actionculture.dz
                  </a>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <HiPhone className="h-5 w-5 text-green-300 mt-0.5" />
                <div>
                  <a href="tel:+213555123456" className="text-green-200 hover:text-white">
                    +213 555 123 456
                  </a>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <HiLocationMarker className="h-5 w-5 text-green-300 mt-0.5" />
                <div className="text-green-200">
                  <p>123 Rue de la Culture</p>
                  <p>Alger, Algérie</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Séparateur */}
        <div className="border-t border-green-700 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <div className="text-green-200 text-sm">
              © {currentYear} Action Culture. Tous droits réservés.
            </div>
            
            {/* Liens légaux */}
            <div className="flex flex-wrap justify-center space-x-4 text-sm">
              {legalLinks.map((link, index) => (
                <React.Fragment key={link.name}>
                  <a
                    href={link.href}
                    className="text-green-200 hover:text-white transition-colors duration-200"
                  >
                    {link.name}
                  </a>
                  {index < legalLinks.length - 1 && (
                    <span className="text-green-600">|</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;