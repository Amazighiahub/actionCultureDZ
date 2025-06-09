// components/Cards/index.tsx - Composants cards de fallback si les vrais ne marchent pas

import React from 'react';
import { HiCalendarDays, HiMapPin, HiBookOpen, HiStar } from 'react-icons/hi2';

// ✅ Fallback pour OeuvreCard
export const OeuvreCard: React.FC<{
  oeuvre: any;
  onClick: () => void;
  compact?: boolean;
}> = ({ oeuvre, onClick, compact = false }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-lg shadow-patrimoine border border-patrimoine-canard/10 hover:shadow-patrimoine-lg transition-all duration-200 cursor-pointer ${
      compact ? 'flex items-center p-4' : 'p-6'
    }`}
  >
    {compact ? (
      <>
        <div className="flex-shrink-0 w-16 h-16 bg-patrimoine-emeraude/10 rounded-lg flex items-center justify-center mr-4">
          <HiBookOpen className="h-8 w-8 text-patrimoine-emeraude" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-patrimoine-canard truncate">
            {oeuvre.titre}
          </h3>
          <p className="text-sm text-patrimoine-sombre/70 truncate">
            {oeuvre.TypeOeuvre?.nom_type || 'Œuvre'}
          </p>
        </div>
      </>
    ) : (
      <>
        <div className="w-full h-48 bg-patrimoine-emeraude/10 rounded-lg flex items-center justify-center mb-4">
          <HiBookOpen className="h-12 w-12 text-patrimoine-emeraude" />
        </div>
        <h3 className="text-lg font-semibold text-patrimoine-canard mb-2">
          {oeuvre.titre}
        </h3>
        <p className="text-sm text-patrimoine-sombre/70 mb-3 line-clamp-2">
          {oeuvre.description || 'Aucune description disponible'}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs bg-patrimoine-emeraude/10 text-patrimoine-emeraude px-2 py-1 rounded-full">
            {oeuvre.TypeOeuvre?.nom_type || 'Œuvre'}
          </span>
          <div className="flex items-center space-x-1">
            <HiStar className="h-4 w-4 text-patrimoine-or" />
            <span className="text-sm text-patrimoine-sombre/60">4.5</span>
          </div>
        </div>
      </>
    )}
  </div>
);

// ✅ Fallback pour EvenementCard
export const EvenementCard: React.FC<{
  evenement: any;
  onClick: () => void;
  compact?: boolean;
}> = ({ evenement, onClick, compact = false }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-lg shadow-patrimoine border border-patrimoine-canard/10 hover:shadow-patrimoine-lg transition-all duration-200 cursor-pointer ${
      compact ? 'flex items-center p-4' : 'p-6'
    }`}
  >
    {compact ? (
      <>
        <div className="flex-shrink-0 w-16 h-16 bg-patrimoine-canard/10 rounded-lg flex items-center justify-center mr-4">
          <HiCalendarDays className="h-8 w-8 text-patrimoine-canard" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-patrimoine-canard truncate">
            {evenement.nom_evenement}
          </h3>
          <p className="text-sm text-patrimoine-sombre/70 truncate">
            {new Date(evenement.date_debut).toLocaleDateString('fr-FR')}
          </p>
        </div>
      </>
    ) : (
      <>
        <div className="w-full h-48 bg-patrimoine-canard/10 rounded-lg flex items-center justify-center mb-4">
          <HiCalendarDays className="h-12 w-12 text-patrimoine-canard" />
        </div>
        <h3 className="text-lg font-semibold text-patrimoine-canard mb-2">
          {evenement.nom_evenement}
        </h3>
        <p className="text-sm text-patrimoine-sombre/70 mb-3 line-clamp-2">
          {evenement.description || 'Aucune description disponible'}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs bg-patrimoine-canard/10 text-patrimoine-canard px-2 py-1 rounded-full">
            {new Date(evenement.date_debut).toLocaleDateString('fr-FR')}
          </span>
          <span className="text-xs text-patrimoine-sombre/60">
            {evenement.lieu || 'Lieu à définir'}
          </span>
        </div>
      </>
    )}
  </div>
);

// ✅ Fallback pour LieuCard
export const LieuCard: React.FC<{
  lieu: any;
  onClick: () => void;
  compact?: boolean;
}> = ({ lieu, onClick, compact = false }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-lg shadow-patrimoine border border-patrimoine-canard/10 hover:shadow-patrimoine-lg transition-all duration-200 cursor-pointer ${
      compact ? 'flex items-center p-4' : 'p-6'
    }`}
  >
    {compact ? (
      <>
        <div className="flex-shrink-0 w-16 h-16 bg-patrimoine-or/10 rounded-lg flex items-center justify-center mr-4">
          <HiMapPin className="h-8 w-8 text-patrimoine-or" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-patrimoine-canard truncate">
            {lieu.nom_lieu}
          </h3>
          <p className="text-sm text-patrimoine-sombre/70 truncate">
            {lieu.wilaya || 'Algérie'}
          </p>
        </div>
      </>
    ) : (
      <>
        <div className="w-full h-48 bg-patrimoine-or/10 rounded-lg flex items-center justify-center mb-4">
          <HiMapPin className="h-12 w-12 text-patrimoine-or" />
        </div>
        <h3 className="text-lg font-semibold text-patrimoine-canard mb-2">
          {lieu.nom_lieu}
        </h3>
        <p className="text-sm text-patrimoine-sombre/70 mb-3 line-clamp-2">
          {lieu.description || 'Site patrimonial d\'Algérie'}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs bg-patrimoine-or/10 text-patrimoine-or px-2 py-1 rounded-full">
            {lieu.wilaya || 'Algérie'}
          </span>
          <div className="flex items-center space-x-1">
            <HiStar className="h-4 w-4 text-patrimoine-or" />
            <span className="text-sm text-patrimoine-sombre/60">4.3</span>
          </div>
        </div>
      </>
    )}
  </div>
);