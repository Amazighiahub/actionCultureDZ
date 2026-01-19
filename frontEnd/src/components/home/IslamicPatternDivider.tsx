/**
 * IslamicPatternDivider - Séparateur décoratif avec motif géométrique islamique
 */
import React from 'react';

interface IslamicPatternDividerProps {
  className?: string;
}

const IslamicPatternDivider: React.FC<IslamicPatternDividerProps> = ({ className = "" }) => {
  return (
    <div className={`relative py-8 ${className}`}>
      <svg 
        className="w-full h-16" 
        viewBox="0 0 1200 64" 
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="islamic-divider" x="0" y="0" width="100" height="64" patternUnits="userSpaceOnUse">
            <path
              d="M50 0 L70 20 L50 40 L30 20 Z"
              fill="currentColor"
              className="text-primary/20"
            />
            <circle 
              cx="50" 
              cy="20" 
              r="10" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1" 
              className="text-accent/30" 
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#islamic-divider)" />
      </svg>
    </div>
  );
};

export default IslamicPatternDivider;
