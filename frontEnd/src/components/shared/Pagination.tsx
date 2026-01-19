/**
 * Pagination - Composant de pagination réutilisable
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/UI/button';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  maxVisiblePages?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  maxVisiblePages = 5,
  className,
  size = 'md'
}) => {
  const { t } = useTranslation();

  if (totalPages <= 1) return null;

  // Calculer les pages à afficher
  const getVisiblePages = (): number[] => {
    const pages: number[] = [];
    const half = Math.floor(maxVisiblePages / 2);
    
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisiblePages - 1);
    
    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const visiblePages = getVisiblePages();
  
  const buttonSize = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10';
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <nav 
      className={cn('flex items-center justify-center gap-1', className)}
      aria-label={t('common.pagination', 'Pagination')}
    >
      {/* Premier */}
      {showFirstLast && (
        <Button
          variant="outline"
          size="icon"
          className={buttonSize}
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label={t('common.firstPage', 'Première page')}
        >
          <ChevronsLeft className={iconSize} />
        </Button>
      )}

      {/* Précédent */}
      <Button
        variant="outline"
        size="icon"
        className={buttonSize}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label={t('common.previousPage', 'Page précédente')}
      >
        <ChevronLeft className={iconSize} />
      </Button>

      {/* Ellipse début */}
      {visiblePages[0] > 1 && (
        <>
          <Button
            variant="outline"
            size="icon"
            className={buttonSize}
            onClick={() => onPageChange(1)}
          >
            1
          </Button>
          {visiblePages[0] > 2 && (
            <span className="px-2 text-muted-foreground">...</span>
          )}
        </>
      )}

      {/* Pages numérotées */}
      {visiblePages.map((page) => (
        <Button
          key={page}
          variant={page === currentPage ? 'default' : 'outline'}
          size="icon"
          className={buttonSize}
          onClick={() => onPageChange(page)}
          aria-current={page === currentPage ? 'page' : undefined}
        >
          {page}
        </Button>
      ))}

      {/* Ellipse fin */}
      {visiblePages[visiblePages.length - 1] < totalPages && (
        <>
          {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
            <span className="px-2 text-muted-foreground">...</span>
          )}
          <Button
            variant="outline"
            size="icon"
            className={buttonSize}
            onClick={() => onPageChange(totalPages)}
          >
            {totalPages}
          </Button>
        </>
      )}

      {/* Suivant */}
      <Button
        variant="outline"
        size="icon"
        className={buttonSize}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label={t('common.nextPage', 'Page suivante')}
      >
        <ChevronRight className={iconSize} />
      </Button>

      {/* Dernier */}
      {showFirstLast && (
        <Button
          variant="outline"
          size="icon"
          className={buttonSize}
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label={t('common.lastPage', 'Dernière page')}
        >
          <ChevronsRight className={iconSize} />
        </Button>
      )}
    </nav>
  );
};

export default Pagination;