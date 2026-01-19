/**
 * LoadingSkeleton - Squelettes de chargement réutilisables
 */
import React from 'react';
import { Skeleton } from '@/components/UI/skeleton';
import { Card, CardContent, CardHeader } from '@/components/UI/card';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  type?: 'card' | 'list' | 'table' | 'form' | 'profile' | 'gallery' | 'stats';
  count?: number;
  className?: string;
}

// Squelette pour une carte
const CardSkeleton: React.FC = () => (
  <Card className="overflow-hidden">
    <Skeleton className="h-48 w-full" />
    <CardHeader className="pb-2">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2 mt-2" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3 mt-2" />
      <Skeleton className="h-10 w-full mt-4" />
    </CardContent>
  </Card>
);

// Squelette pour une ligne de liste
const ListItemSkeleton: React.FC = () => (
  <div className="flex items-center gap-4 p-4 border-b">
    <Skeleton className="h-12 w-12 rounded-full" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <Skeleton className="h-8 w-20" />
  </div>
);

// Squelette pour un tableau
const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="border rounded-lg overflow-hidden">
    <div className="bg-muted p-4 flex gap-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="p-4 flex gap-4 border-t">
        {[...Array(4)].map((_, j) => (
          <Skeleton key={j} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

// Squelette pour un formulaire
const FormSkeleton: React.FC = () => (
  <div className="space-y-6">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    ))}
    <div className="flex justify-end gap-2 pt-4">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-32" />
    </div>
  </div>
);

// Squelette pour un profil
const ProfileSkeleton: React.FC = () => (
  <div className="flex flex-col items-center p-6">
    <Skeleton className="h-24 w-24 rounded-full" />
    <Skeleton className="h-6 w-32 mt-4" />
    <Skeleton className="h-4 w-48 mt-2" />
    <div className="flex gap-4 mt-4">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-20" />
    </div>
  </div>
);

// Squelette pour une galerie
const GallerySkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
    {[...Array(count)].map((_, i) => (
      <Skeleton key={i} className="aspect-square rounded-lg" />
    ))}
  </div>
);

// Squelette pour les statistiques
const StatsSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {[...Array(4)].map((_, i) => (
      <Card key={i}>
        <CardContent className="p-4">
          <Skeleton className="h-8 w-8 mb-2" />
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-6 w-12" />
        </CardContent>
      </Card>
    ))}
  </div>
);

// Composant principal
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = 'card',
  count = 1,
  className
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return [...Array(count)].map((_, i) => <CardSkeleton key={i} />);
      case 'list':
        return [...Array(count)].map((_, i) => <ListItemSkeleton key={i} />);
      case 'table':
        return <TableSkeleton rows={count} />;
      case 'form':
        return <FormSkeleton />;
      case 'profile':
        return <ProfileSkeleton />;
      case 'gallery':
        return <GallerySkeleton count={count} />;
      case 'stats':
        return <StatsSkeleton />;
      default:
        return <CardSkeleton />;
    }
  };

  const wrapperClass = type === 'card' 
    ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3' 
    : '';

  return (
    <div className={cn(wrapperClass, className)}>
      {renderSkeleton()}
    </div>
  );
};

// Exports individuels
export { CardSkeleton, ListItemSkeleton, TableSkeleton, FormSkeleton, ProfileSkeleton, GallerySkeleton, StatsSkeleton };

export default LoadingSkeleton;