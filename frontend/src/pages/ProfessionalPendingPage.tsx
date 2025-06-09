// src/pages/ProfessionalPendingPage.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiClock,
  HiEnvelope,
  HiCheckCircle,
  HiArrowLeft,
  HiHome,
  HiInformationCircle
} from 'react-icons/hi2';

const ProfessionalPendingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8fbfa] flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Carte principale */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header avec gradient */}
          <div className="bg-gradient-to-r from-[#51946b] to-[#eb9f13] p-8 text-white text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiClock className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Inscription réussie !</h1>
            <p className="text-lg opacity-90">Votre compte professionnel est en cours de validation</p>
          </div>

          {/* Contenu */}
          <div className="p-8">
            {/* Message principal */}
            <div className="bg-[#e8f2ec] rounded-lg p-6 mb-6">
              <div className="flex items-start gap-4">
                <HiInformationCircle className="w-6 h-6 text-[#51946b] flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-lg font-semibold text-[#0e1a13] mb-2">
                    Que se passe-t-il maintenant ?
                  </h2>
                  <ul className="space-y-2 text-[#51946b]">
                    <li className="flex items-start gap-2">
                      <span className="text-[#eb9f13] mt-1">•</span>
                      <span>Notre équipe va examiner votre profil professionnel</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#eb9f13] mt-1">•</span>
                      <span>La validation prend généralement 24 à 48 heures</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#eb9f13] mt-1">•</span>
                      <span>Vous recevrez un email de confirmation une fois validé</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Email de confirmation */}
            <div className="border border-[#e8f2ec] rounded-lg p-6 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-[#f8fbfa] rounded-full flex items-center justify-center">
                  <HiEnvelope className="w-6 h-6 text-[#eb9f13]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#0e1a13]">Vérifiez votre boîte email</h3>
                  <p className="text-sm text-[#51946b]">
                    Un email de confirmation a été envoyé à votre adresse
                  </p>
                </div>
              </div>
            </div>

            {/* Ce que vous pouvez faire */}
            <div className="mb-8">
              <h3 className="font-semibold text-[#0e1a13] mb-4">En attendant, vous pouvez :</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <HiCheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-[#0e1a13]">Explorer la plateforme</p>
                    <p className="text-sm text-[#51946b]">Découvrez les œuvres et événements culturels</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <HiCheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-[#0e1a13]">Préparer votre contenu</p>
                    <p className="text-sm text-[#51946b]">Organisez vos œuvres à partager</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/')}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#eb9f13] text-white rounded-lg font-medium hover:bg-[#d18f11] transition-colors"
              >
                <HiHome className="w-5 h-5" />
                Retour à l'accueil
              </button>
              <button
                onClick={() => navigate('/connexion')}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-[#51946b] text-[#51946b] rounded-lg font-medium hover:bg-[#f8fbfa] transition-colors"
              >
                <HiArrowLeft className="w-5 h-5" />
                Se connecter
              </button>
            </div>

            {/* Note */}
            <p className="text-center text-sm text-[#6a7581] mt-6">
              Des questions ? Contactez-nous à{' '}
              <a href="mailto:support@timlilit.dz" className="text-[#eb9f13] hover:underline">
                support@timlilit.dz
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-[#6a7581] mt-6">
          © 2024 Timlilit Culture. Tous droits réservés.
        </p>
      </div>
    </div>
  );
};

export default ProfessionalPendingPage;