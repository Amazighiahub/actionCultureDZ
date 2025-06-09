// components/FullPageLoader.tsx
import React, { useEffect, useState } from 'react';

interface FullPageLoaderProps {
  minDuration?: number; // Durée minimale d'affichage en ms
  text?: string;
  subText?: string;
}

export const FullPageLoader: React.FC<FullPageLoaderProps> = ({ 
  minDuration = 1500,
  text = "Chargement de la page...",
  subText = "Nous récupérons les dernières données culturelles pour vous"
}) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-[#f8fbfa] flex items-center justify-center z-50">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#eb9f13]"></div>
        </div>
        <h2 className="text-xl font-semibold text-[#0e1a13] mb-2">{text}</h2>
        <p className="text-[#51946b]">{subText}</p>
        
        {/* Motif décoratif */}
        <div className="mt-8 flex justify-center">
          <svg className="w-24 h-24 text-[#eb9f13]/20" viewBox="0 0 100 100" fill="currentColor">
            <pattern id="pattern-loader" x="0" y="0" width="25" height="25" patternUnits="userSpaceOnUse">
              <path d="M12.5 2.5 L22.5 12.5 L12.5 22.5 L2.5 12.5 Z" stroke="currentColor" strokeWidth="1" fill="none"/>
              <circle cx="12.5" cy="12.5" r="1.5" fill="currentColor"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#pattern-loader)" />
          </svg>
        </div>
      </div>
    </div>
  );
};