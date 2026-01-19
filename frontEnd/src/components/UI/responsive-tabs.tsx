/**
 * ResponsiveTabs.tsx - Composant Tabs responsive avec scroll horizontal sur mobile
 * Emplacement recommandé: src/components/UI/responsive-tabs.tsx
 */

import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

/**
 * Tabs Container
 */
const Tabs = TabsPrimitive.Root;

/**
 * TabsList avec scroll horizontal automatique sur mobile
 */
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    /** Activer le scroll horizontal sur mobile */
    scrollable?: boolean;
    /** Nombre de colonnes sur desktop (si pas scrollable) */
    columns?: number;
  }
>(({ className, scrollable = true, columns, children, ...props }, ref) => {
  // Classes pour le mode scrollable (mobile-first)
  const scrollableClasses = scrollable
    ? 'flex overflow-x-auto scrollbar-hide gap-1 sm:gap-1.5 pb-1 -mb-1'
    : '';

  // Classes pour le mode grille (desktop)
  const gridClasses = columns && !scrollable
    ? `grid grid-cols-${columns}`
    : scrollable
    ? 'sm:inline-flex sm:overflow-visible sm:flex-wrap'
    : '';

  return (
    <div className={cn(
      'relative w-full',
      scrollable && 'overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible'
    )}>
      <TabsPrimitive.List
        ref={ref}
        className={cn(
          'inline-flex h-auto min-h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground',
          scrollableClasses,
          gridClasses,
          // Sur mobile, la liste s'étend
          scrollable && 'w-max sm:w-full',
          className
        )}
        {...props}
      >
        {children}
      </TabsPrimitive.List>
    </div>
  );
});
TabsList.displayName = 'TabsList';

/**
 * TabsTrigger avec taille tactile et non-shrink sur mobile
 */
const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    /** Icône à afficher */
    icon?: React.ReactNode;
    /** Afficher uniquement l'icône sur mobile */
    iconOnly?: boolean;
  }
>(({ className, icon, iconOnly = false, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // Base styles
      'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-2',
      'text-sm font-medium ring-offset-background transition-all',
      // Focus styles
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      // Disabled styles
      'disabled:pointer-events-none disabled:opacity-50',
      // Active styles
      'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
      // ✅ Taille tactile minimale (44px)
      'min-h-[44px] min-w-[44px]',
      // ✅ Ne pas rétrécir sur mobile
      'flex-shrink-0',
      // Gap entre icône et texte
      icon && 'gap-2',
      className
    )}
    {...props}
  >
    {icon && <span className="flex-shrink-0">{icon}</span>}
    <span className={cn(
      // Cacher le texte sur mobile si iconOnly
      iconOnly && 'hidden sm:inline'
    )}>
      {children}
    </span>
  </TabsPrimitive.Trigger>
));
TabsTrigger.displayName = 'TabsTrigger';

/**
 * TabsContent
 */
const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-4 ring-offset-background',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      // Animation d'apparition
      'data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0',
      'data-[state=active]:animate-in data-[state=active]:fade-in-0',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };

/**
 * Exemple d'utilisation:
 * 
 * import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/UI/responsive-tabs';
 * import { Calendar, MapPin, Palette, Hammer, Info } from 'lucide-react';
 * 
 * <Tabs defaultValue="patrimoine">
 *   <TabsList scrollable>
 *     <TabsTrigger value="patrimoine" icon={<MapPin className="h-4 w-4" />}>
 *       Patrimoine
 *     </TabsTrigger>
 *     <TabsTrigger value="evenements" icon={<Calendar className="h-4 w-4" />}>
 *       Événements
 *     </TabsTrigger>
 *     <TabsTrigger value="oeuvres" icon={<Palette className="h-4 w-4" />}>
 *       Œuvres
 *     </TabsTrigger>
 *     <TabsTrigger value="artisanat" icon={<Hammer className="h-4 w-4" />}>
 *       Artisanat
 *     </TabsTrigger>
 *   </TabsList>
 * 
 *   <TabsContent value="patrimoine">
 *     Contenu patrimoine...
 *   </TabsContent>
 *   ...
 * </Tabs>
 */