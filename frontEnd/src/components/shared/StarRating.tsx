/**
 * StarRating - Composant étoiles de notation réutilisable
 * Remplace les duplications dans EventComments et OeuvreComments
 */
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { cn } from '@/lib/Utils';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const MAX = 5;
const STARS = [1, 2, 3, 4, 5];

const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  readonly = false,
  size = 'md'
}) => {
  const { t } = useTranslation();
  const [hoverValue, setHoverValue] = useState(0);
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const sizeClasses = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6' };

  const renderStar = (star: number) => (
    <Star
      aria-hidden="true"
      className={cn(
        sizeClasses[size],
        "transition-colors",
        (hoverValue || value) >= star
          ? "fill-yellow-400 text-yellow-400"
          : "text-gray-300"
      )}
    />
  );

  // Mode lecture seule : une image unique avec un nom accessible
  if (readonly) {
    return (
      <div
        className="flex items-center gap-0.5"
        role="img"
        aria-label={t('rating.value', 'Note : {{value}} sur {{max}}', { value, max: MAX })}
      >
        {STARS.map((star) => (
          <span key={star} className="transition-colors cursor-default">
            {renderStar(star)}
          </span>
        ))}
      </div>
    );
  }

  // Mode saisie : radiogroup avec tabindex itinérant
  const rounded = Math.round(value);
  const focusIndex = rounded >= 1 && rounded <= MAX ? rounded : 1;

  const select = (star: number) => {
    onChange?.(star);
    buttonsRef.current[star - 1]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, star: number) => {
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = star >= MAX ? 1 : star + 1;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = star <= 1 ? MAX : star - 1;
        break;
      case 'Home':
        next = 1;
        break;
      case 'End':
        next = MAX;
        break;
      case ' ':
      case 'Enter':
        e.preventDefault();
        select(star);
        return;
      default:
        return;
    }
    e.preventDefault();
    select(next);
  };

  return (
    <div
      className="flex items-center gap-0.5"
      role="radiogroup"
      aria-label={t('rating.label', 'Note')}
    >
      {STARS.map((star) => (
        <button
          key={star}
          ref={(el) => { buttonsRef.current[star - 1] = el; }}
          type="button"
          role="radio"
          aria-checked={rounded === star}
          aria-label={t('rating.star', '{{count}} étoile(s) sur 5', { count: star })}
          tabIndex={star === focusIndex ? 0 : -1}
          onClick={() => onChange?.(star)}
          onKeyDown={(e) => handleKeyDown(e, star)}
          onMouseEnter={() => setHoverValue(star)}
          onMouseLeave={() => setHoverValue(0)}
          className="transition-colors cursor-pointer hover:scale-110"
        >
          {renderStar(star)}
        </button>
      ))}
    </div>
  );
};

export default StarRating;
