/**
 * Carte d'un contenu (œuvre, événement, service…) avec image, menant à sa fiche ;
 * et la grille qui les range. Utilisées par les portfolios (professionnel, organisation).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAssetUrl } from '@/helpers/assetUrl';

export interface MediaItem { url: string; type_media?: string }

/** Première image d'une liste de médias */
export const firstImage = (medias?: MediaItem[]) => medias?.find((m) => (m.type_media || 'image') === 'image')?.url;

export const ItemCard: React.FC<{ to: string; title: string; image?: string | null; subtitle?: string; badge?: string }> = ({ to, title, image, subtitle, badge }) => (
  <Link to={to} className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
    <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md">
      <div className="aspect-[4/3] bg-muted">
        {image ? (
          <img src={getAssetUrl(image, { width: 480 })} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <img src="/images/placeholder.svg" alt="" loading="lazy" className="h-full w-full object-contain p-8 opacity-40" />
        )}
      </div>
      <CardContent className="p-4 space-y-1">
        {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
        <h3 className="font-semibold leading-snug line-clamp-2">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  </Link>
);

export const ItemGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>
);
