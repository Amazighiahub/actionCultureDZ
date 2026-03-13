/**
 * IslamicPatternDivider - Séparateur décoratif avec motifs amazighs (berbères)
 * Inspiré des tissages kabyles et touaregs : losanges, chevrons et symbole Yaz (ⵣ)
 */
import React from 'react';

interface IslamicPatternDividerProps {
  className?: string;
}

const IslamicPatternDivider: React.FC<IslamicPatternDividerProps> = ({ className = "" }) => {
  return (
    <div className={`relative py-8 ${className}`}>
      <svg
        className="w-full h-20"
        viewBox="0 0 1200 80"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Motif amazigh : losange imbriqué + chevrons */}
          <pattern id="amazigh-divider" x="0" y="0" width="120" height="80" patternUnits="userSpaceOnUse">
            {/* Losange principal — symbole central du tissage berbère */}
            <path
              d="M60 8 L84 40 L60 72 L36 40 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary/25"
            />
            {/* Losange intérieur */}
            <path
              d="M60 20 L72 40 L60 60 L48 40 Z"
              fill="currentColor"
              className="text-primary/10"
            />
            {/* Yaz central (ⵣ) — lettre tifinagh, symbole de l'homme libre */}
            <line x1="60" y1="30" x2="60" y2="50" stroke="currentColor" strokeWidth="2" className="text-accent/40" />
            <line x1="52" y1="34" x2="68" y2="46" stroke="currentColor" strokeWidth="1.5" className="text-accent/40" />
            <line x1="68" y1="34" x2="52" y2="46" stroke="currentColor" strokeWidth="1.5" className="text-accent/40" />
            {/* Chevrons haut — motif en dents de scie des tapis kabyles */}
            <polyline
              points="0,12 15,2 30,12 45,2 60,12 75,2 90,12 105,2 120,12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-accent/20"
            />
            {/* Chevrons bas */}
            <polyline
              points="0,68 15,78 30,68 45,78 60,68 75,78 90,68 105,78 120,68"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-accent/20"
            />
            {/* Points décoratifs aux sommets — rappel des tatouages amazighs */}
            <circle cx="60" cy="8" r="2" fill="currentColor" className="text-primary/30" />
            <circle cx="60" cy="72" r="2" fill="currentColor" className="text-primary/30" />
            <circle cx="36" cy="40" r="2" fill="currentColor" className="text-primary/30" />
            <circle cx="84" cy="40" r="2" fill="currentColor" className="text-primary/30" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#amazigh-divider)" />
      </svg>
    </div>
  );
};

export default IslamicPatternDivider;
