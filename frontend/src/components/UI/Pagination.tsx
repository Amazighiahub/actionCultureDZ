// src/components/UI/Pagination.tsx - Composant de pagination réutilisable
import React from 'react';
import { HiChevronLeft, HiChevronRight, HiChevronDoubleLeft, HiChevronDoubleRight } from 'react-icons/hi2';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  showFirstLast?: boolean;
  maxPagesToShow?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'rounded' | 'minimal';
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
  showFirstLast = true,
  maxPagesToShow = 5,
  size = 'md',
  variant = 'default'
}) => {
  // Ne pas afficher si une seule page
  if (totalPages <= 1) return null;

  // Calculer les pages à afficher
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= maxPagesToShow) {
      // Afficher toutes les pages si peu nombreuses
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Logique pour afficher les pages avec ellipses
      const halfWindow = Math.floor(maxPagesToShow / 2);
      let startPage = Math.max(currentPage - halfWindow, 1);
      let endPage = Math.min(startPage + maxPagesToShow - 1, totalPages);

      if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(endPage - maxPagesToShow + 1, 1);
      }

      // Ajouter la première page et ellipse si nécessaire
      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) pages.push('...');
      }

      // Ajouter les pages du milieu
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      // Ajouter ellipse et dernière page si nécessaire
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pages = getPageNumbers();

  // Classes selon la taille
  const sizeClasses = {
    sm: 'h-8 min-w-8 text-xs',
    md: 'h-10 min-w-10 text-sm',
    lg: 'h-12 min-w-12 text-base'
  };

  // Classes selon le variant
  const variantClasses = {
    default: 'bg-white border border-gray-300',
    rounded: 'bg-[#f4f3f0]',
    minimal: ''
  };

  const buttonClass = `
    flex items-center justify-center
    ${sizeClasses[size]}
    ${variant === 'rounded' ? 'rounded-full' : 'rounded-lg'}
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
    ${variantClasses[variant]}
  `;

  const activeClass = variant === 'minimal' 
    ? 'text-[#eb9f13] font-bold' 
    : variant === 'rounded'
    ? 'bg-[#eb9f13] text-white font-bold'
    : 'bg-[#eb9f13] text-white border-[#eb9f13]';

  const inactiveClass = variant === 'minimal'
    ? 'text-gray-600 hover:text-[#eb9f13]'
    : 'hover:bg-gray-50 text-gray-700';

  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      {/* Première page */}
      {showFirstLast && (
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={`${buttonClass} ${inactiveClass}`}
          aria-label="Première page"
        >
          <HiChevronDoubleLeft className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
        </button>
      )}

      {/* Page précédente */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`${buttonClass} ${inactiveClass}`}
        aria-label="Page précédente"
      >
        <HiChevronLeft className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      </button>

      {/* Numéros de pages */}
      <div className="flex items-center gap-1">
        {pages.map((page, index) => {
          if (page === '...') {
            return (
              <span 
                key={`ellipsis-${index}`} 
                className={`${sizeClasses[size]} flex items-center justify-center text-gray-400`}
              >
                •••
              </span>
            );
          }

          const pageNumber = page as number;
          const isActive = pageNumber === currentPage;

          return (
            <button
              key={pageNumber}
              onClick={() => onPageChange(pageNumber)}
              className={`
                ${buttonClass}
                ${isActive ? activeClass : inactiveClass}
              `}
              aria-label={`Page ${pageNumber}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {pageNumber}
            </button>
          );
        })}
      </div>

      {/* Page suivante */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`${buttonClass} ${inactiveClass}`}
        aria-label="Page suivante"
      >
        <HiChevronRight className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      </button>

      {/* Dernière page */}
      {showFirstLast && (
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={`${buttonClass} ${inactiveClass}`}
          aria-label="Dernière page"
        >
          <HiChevronDoubleRight className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
        </button>
      )}
    </div>
  );
};

// Composant pour afficher les infos de pagination
export const PaginationInfo: React.FC<{
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  itemName?: string;
}> = ({ currentPage, totalPages, totalItems, itemsPerPage, itemName = 'éléments' }) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <p className="text-sm text-gray-600">
      Affichage de <span className="font-medium">{startItem}</span> à{' '}
      <span className="font-medium">{endItem}</span> sur{' '}
      <span className="font-medium">{totalItems}</span> {itemName}
    </p>
  );
};

// Export par défaut
export default Pagination;