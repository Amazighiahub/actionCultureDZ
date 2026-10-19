/**
 * PointsVisite - Points de visite d'un site (Timgad : Arc de Trajan, Marché, Musée…),
 * dans l'ordre de la visite, avec une carte des points qui ont leur propre position.
 * Un point intérieur (salle d'un musée) n'a pas de GPS propre : il affiche son repère.
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Plus, ArrowUp, ArrowDown, DoorOpen, Loader2, Map as MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getAssetUrl } from '@/helpers/assetUrl';
import { patrimoineService } from '@/services/patrimoine.service';
import type { PointCarte } from './PointsVisiteCarte';

const PointsVisiteCarte = React.lazy(() => import('./PointsVisiteCarte'));

type Multilingual = string | { fr?: string; ar?: string; en?: string; [k: string]: string | undefined } | null | undefined;

export interface PointVisite {
  id_lieu: number;
  nom: Multilingual;
  typePatrimoine?: string;
  latitude: number | string;
  longitude: number | string;
  ordre_visite?: number | null;
  repere?: Multilingual;
  LieuMedia?: Array<{ url: string; type: string }>;
  LieuMedias?: Array<{ url: string; type: string }>;
  DetailLieu?: { description?: Multilingual } | null;
}

interface PointsVisiteProps {
  site: { id_lieu: number; nom: Multilingual; latitude: number | string; longitude: number | string };
  points: PointVisite[];
  lang: string;
  /** professionnel validé ou admin : peut ajouter un point */
  canAdd: boolean;
  /** créateur du site ou modération : peut changer l'ordre */
  canReorder: boolean;
  onReordered: (points: PointVisite[]) => void;
}

const texte = (value: Multilingual, lang: string): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[lang] || value.fr || value.ar || value.en || '';
};

// Même position que le site (à ~1 m près) : point intérieur, pas de marqueur à part
const memePosition = (a: { latitude: number | string; longitude: number | string }, b: { latitude: number | string; longitude: number | string }) =>
  Math.abs(Number(a.latitude) - Number(b.latitude)) < 0.00001 && Math.abs(Number(a.longitude) - Number(b.longitude)) < 0.00001;

const PointsVisite: React.FC<PointsVisiteProps> = ({ site, points, lang, canAdd, canReorder, onReordered }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [showMap, setShowMap] = useState(true);

  const pointsCarte: PointCarte[] = points
    .map((p, index) => ({ p, numero: index + 1 }))
    .filter(({ p }) => !memePosition(p, site))
    .map(({ p, numero }) => ({ id_lieu: p.id_lieu, numero, nom: texte(p.nom, lang), latitude: Number(p.latitude), longitude: Number(p.longitude) }));

  const deplacer = async (index: number, sens: -1 | 1) => {
    const cible = index + sens;
    if (cible < 0 || cible >= points.length) return;
    const nouveaux = [...points];
    [nouveaux[index], nouveaux[cible]] = [nouveaux[cible], nouveaux[index]];
    setSaving(true);
    try {
      const res = await patrimoineService.reordonnerPoints(site.id_lieu, nouveaux.map(p => p.id_lieu));
      if (!res.success) throw new Error(res.error);
      onReordered(nouveaux.map((p, i) => ({ ...p, ordre_visite: i + 1 })));
    } catch (err) {
      toast({
        title: t('common.error', 'Erreur'),
        description: err instanceof Error && err.message ? err.message : t('patrimoine.points.reorderError', "L'ordre n'a pas pu être enregistré"),
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {points.length > 0
            ? t('patrimoine.points.intro', 'Suivez la visite dans cet ordre, ou choisissez un point.')
            : t('patrimoine.points.empty', 'Aucun point de visite pour l\'instant.')}
        </p>
        <div className="flex gap-2">
          {pointsCarte.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowMap(v => !v)} aria-pressed={showMap}>
              <MapIcon className="h-4 w-4 me-1" />
              {showMap ? t('patrimoine.points.hideMap', 'Masquer la carte') : t('patrimoine.points.showMap', 'Voir la carte')}
            </Button>
          )}
          {canAdd && (
            <Button size="sm" onClick={() => navigate(`/ajouter-patrimoine?parent=${site.id_lieu}`)}>
              <Plus className="h-4 w-4 me-1" />
              {t('patrimoine.points.add', 'Ajouter un point')}
            </Button>
          )}
        </div>
      </div>

      {showMap && pointsCarte.length > 0 && (
        <React.Suspense fallback={<div className="h-[280px] bg-muted rounded-lg animate-pulse" />}>
          <PointsVisiteCarte
            site={{ nom: texte(site.nom, lang), latitude: Number(site.latitude), longitude: Number(site.longitude) }}
            points={pointsCarte}
          />
        </React.Suspense>
      )}

      {points.length > 0 && (
        <ol className="space-y-2">
          {points.map((point, index) => {
            const image = (point.LieuMedia || point.LieuMedias || []).find(m => m.type === 'image');
            const repere = texte(point.repere, lang);
            const description = texte(point.DetailLieu?.description, lang);
            const nom = texte(point.nom, lang);
            return (
              <li key={point.id_lieu} className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-muted/40 transition-colors">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-teal-700 text-white text-xs font-semibold shrink-0" aria-hidden="true">
                  {index + 1}
                </span>
                {image ? (
                  <img src={getAssetUrl(image.url)} alt="" loading="lazy" decoding="async" className="w-14 h-14 rounded-md object-cover shrink-0" />
                ) : (
                  <span className="w-14 h-14 rounded-md bg-muted flex items-center justify-center shrink-0" aria-hidden="true">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <Link to={`/patrimoine/${point.id_lieu}`} className="font-medium hover:underline">
                    <span className="sr-only">{t('patrimoine.points.number', 'Point {{n}} :', { n: index + 1 })} </span>
                    {nom}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    {point.typePatrimoine && (
                      <Badge variant="outline" className="text-xs font-normal">{t(`patrimoine.types.${point.typePatrimoine}`, point.typePatrimoine)}</Badge>
                    )}
                    {repere && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <DoorOpen className="h-3 w-3" aria-hidden="true" />
                        {repere}
                      </span>
                    )}
                  </div>
                  {description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{description}</p>}
                </div>
                {canReorder && points.length > 1 && (
                  <div className="flex flex-col shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={saving || index === 0}
                      onClick={() => deplacer(index, -1)} aria-label={t('patrimoine.points.moveUp', 'Monter « {{nom}} »', { nom })}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={saving || index === points.length - 1}
                      onClick={() => deplacer(index, 1)} aria-label={t('patrimoine.points.moveDown', 'Descendre « {{nom}} »', { nom })}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {points.length === 0 && canAdd && (
        <p className="text-xs text-muted-foreground">
          {t('patrimoine.points.emptyHint', 'Ajoutez les lieux à voir dans ce site : un monument, une salle, un grenier… chacun avec sa position, sa description et ses photos.')}
        </p>
      )}
    </div>
  );
};

export default PointsVisite;
