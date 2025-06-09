// src/components/ui/LoadingScreen.tsx - Écran de chargement
import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-blue-600 to-purple-700 flex items-center justify-center">
      <div className="text-center">
        {/* Logo animé */}
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          
          {/* Cercles animés */}
          <div className="absolute inset-0 animate-spin">
            <div className="w-24 h-24 border-4 border-white/30 border-t-white rounded-full"></div>
          </div>
        </div>

        {/* Texte */}
        <h1 className="text-3xl font-bold text-white mb-2">
          Action Culture
        </h1>
        <p className="text-blue-100 text-lg mb-8">
          Patrimoine d'Algérie
        </p>

        {/* Barre de progression */}
        <div className="w-64 mx-auto">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
          <p className="text-white/80 text-sm mt-3">
            Chargement du patrimoine culturel...
          </p>
        </div>

        {/* Points de chargement */}
        <div className="flex justify-center space-x-2 mt-6">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;