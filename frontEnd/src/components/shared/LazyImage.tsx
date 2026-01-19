/**
 * LazyImage - Composant d'image avec lazy loading et gestion d'erreurs
 * À utiliser dans toutes les pages pour optimiser les performances
 */
import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  fallback?: string;
  placeholder?: 'blur' | 'skeleton' | 'none';
  aspectRatio?: 'square' | 'video' | 'portrait' | 'auto';
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  onLoad?: () => void;
  onError?: () => void;
}

const aspectRatioClasses = {
  square: 'aspect-square',
  video: 'aspect-video',
  portrait: 'aspect-[3/4]',
  auto: ''
};

const objectFitClasses = {
  cover: 'object-cover',
  contain: 'object-contain',
  fill: 'object-fill',
  none: ''
};

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  containerClassName = '',
  fallback = '/images/placeholder.png',
  placeholder = 'skeleton',
  aspectRatio = 'auto',
  objectFit = 'cover',
  onLoad,
  onError
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer pour le lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '100px', // Charger 100px avant d'être visible
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
    onError?.();
  };

  // Placeholder skeleton
  const renderPlaceholder = () => {
    if (loaded || placeholder === 'none') return null;

    if (placeholder === 'skeleton') {
      return (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-inherit" />
      );
    }

    if (placeholder === 'blur') {
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20 backdrop-blur-sm" />
      );
    }

    return null;
  };

  return (
    <div
      ref={imgRef}
      className={cn(
        'relative overflow-hidden',
        aspectRatioClasses[aspectRatio],
        containerClassName
      )}
    >
      {renderPlaceholder()}
      
      {isInView && (
        <img
          src={error ? fallback : src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'w-full h-full transition-opacity duration-300',
            objectFitClasses[objectFit],
            loaded ? 'opacity-100' : 'opacity-0',
            className
          )}
        />
      )}

      {/* Indicateur d'erreur */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <span className="text-xs text-muted-foreground">
            Image non disponible
          </span>
        </div>
      )}
    </div>
  );
};

// Version simplifiée pour les cas simples
export const SimpleImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className }) => (
  <img
    src={src}
    alt={alt}
    loading="lazy"
    decoding="async"
    className={className}
    onError={(e) => {
      e.currentTarget.src = '/images/placeholder.png';
    }}
  />
);

// Hook pour précharger des images
export const useImagePreload = (srcs: string[]) => {
  useEffect(() => {
    const images = srcs.map(src => {
      const img = new Image();
      img.src = src;
      return img;
    });

    return () => {
      images.forEach(img => {
        img.src = '';
      });
    };
  }, [srcs]);
};

export default LazyImage;