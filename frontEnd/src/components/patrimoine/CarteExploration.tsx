/**
 * Carte d'exploration du patrimoine de l'Algérie (page Patrimoine, 1er temps, 2026-11-19).
 * - Tous les lieux publiés en une requête (/patrimoine/carte-exploration, lignes courtes) ;
 * - épingles regroupées en bulles numérotées (leaflet.markercluster), une couleur par type ;
 * - points de visite (forum, arc de Timgad…) visibles seulement en zoomant sur leur site ;
 * - filtres wilaya › daïra › commune (même sélection que le reste du site) et types (légende) ;
 * - liste reliée à la carte : les sites de la zone regardée ; fiche courte au toucher d'une épingle.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
// Ronds colorés des bulles (sans elle, les bulles n'étaient que des chiffres)
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Navigation, X, List, Map as IconeCarte, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FondDeCarte from '@/components/shared/FondDeCarte';
import { httpClient } from '@/services/httpClient';
import { getAssetUrl } from '@/helpers/assetUrl';
import { useGeographicSelection } from '@/hooks/useGeographie';
import { COULEUR_TYPE, couleurType } from '@/utils/couleursPatrimoine';

/** Ligne du serveur : [id, nom, lat, lng, type, idParent, idCommune, idDaira, idWilaya, nbPoints, image] */
type Ligne = [number, string, number, number, string, number | null, number, number, number, number, string | null];
export interface LieuCarte {
  id: number; nom: string; lat: number; lng: number; type: string; parent: number | null;
  commune: number; daira: number; wilaya: number; nbPoints: number; image: string | null;
}
const lire = (l: Ligne): LieuCarte => ({
  id: l[0], nom: l[1], lat: l[2], lng: l[3], type: l[4], parent: l[5], commune: l[6], daira: l[7], wilaya: l[8], nbPoints: l[9], image: l[10]
});

const ALGERIE = L.latLngBounds([18.9, -8.7], [37.2, 12]);
const ZOOM_POINTS = 15; // points de visite visibles à partir de ce zoom
const MAX_LISTE = 40;

/** Filtres appliqués aux lieux (fonction pure, testée) */
export function filtrerLieux(lieux: LieuCarte[], f: { wilaya?: number | null; daira?: number | null; commune?: number | null; typesCaches?: Set<string>; type?: string | null }) {
  return lieux.filter((l) => (!f.wilaya || l.wilaya === f.wilaya) && (!f.daira || l.daira === f.daira) && (!f.commune || l.commune === f.commune)
    && !(f.typesCaches?.has(l.type)) && (!f.type || l.type === f.type));
}

const icone = (type: string, petit = false) => L.divIcon({
  className: 'carte-exploration-epingle',
  html: `<span style="display:block;width:${petit ? 12 : 18}px;height:${petit ? 12 : 18}px;border-radius:9999px;background:${couleurType(type)};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.45)"></span>`,
  iconSize: petit ? [12, 12] : [18, 18], iconAnchor: petit ? [6, 6] : [9, 9]
});

/** Couche des sites principaux, regroupés en bulles ; et couche des points de visite au zoom */
/** Demande de recentrage (toucher un site de la liste, « Voir les points de visite ») */
interface Centrage { lat: number; lng: number; zoom: number; n: number }

const Couches: React.FC<{ sites: LieuCarte[]; points: LieuCarte[]; onChoisir: (l: LieuCarte) => void; onZone: (b: L.LatLngBounds, z: number) => void; cadrage: LieuCarte[]; centrage: Centrage | null }> = ({ sites, points, onChoisir, onZone, cadrage, centrage }) => {
  const carte = useMap();
  const groupe = useRef<L.MarkerClusterGroup | null>(null);
  const couchePoints = useRef<L.LayerGroup | null>(null);
  const [zoom, setZoom] = useState(carte.getZoom());

  useMapEvents({
    moveend: () => { setZoom(carte.getZoom()); onZone(carte.getBounds(), carte.getZoom()); }
  });

  useEffect(() => {
    const g = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 50, chunkedLoading: true });
    for (const s of sites) {
      const m = L.marker([s.lat, s.lng], { icon: icone(s.type), title: s.nom, keyboard: true });
      m.on('click', () => onChoisir(s));
      g.addLayer(m);
    }
    carte.addLayer(g);
    groupe.current = g;
    return () => { carte.removeLayer(g); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sites, carte]);

  useEffect(() => {
    couchePoints.current?.remove();
    if (zoom < ZOOM_POINTS || !points.length) return;
    const zone = carte.getBounds().pad(0.3);
    const c = L.layerGroup();
    for (const p of points) {
      if (!zone.contains([p.lat, p.lng])) continue;
      const m = L.marker([p.lat, p.lng], { icon: icone(p.type, true), title: p.nom, keyboard: true });
      m.on('click', () => onChoisir(p));
      c.addLayer(m);
    }
    c.addTo(carte);
    couchePoints.current = c;
    return () => { c.remove(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, zoom, carte]);

  useEffect(() => {
    if (centrage) carte.flyTo([centrage.lat, centrage.lng], Math.max(centrage.zoom, carte.getZoom()), { duration: 0.8 });
  }, [centrage, carte]);

  // Cadrage : sur les lieux filtrés (wilaya, daïra, commune choisie), sinon l'Algérie
  useEffect(() => {
    if (cadrage.length) carte.fitBounds(L.latLngBounds(cadrage.map((l) => [l.lat, l.lng] as [number, number])), { padding: [24, 24], maxZoom: 14 });
    else carte.fitBounds(ALGERIE);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cadrage, carte]);
  return null;
};

const CarteExploration: React.FC<{ type?: string | null }> = ({ type = null }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const geo = useGeographicSelection();
  const [typesCaches, setTypesCaches] = useState<Set<string>>(new Set());
  const [choisi, setChoisi] = useState<LieuCarte | null>(null);
  const [zone, setZone] = useState<{ b: L.LatLngBounds; z: number } | null>(null);
  const [vue, setVue] = useState<'carte' | 'liste'>('carte');
  const [centrage, setCentrage] = useState<Centrage | null>(null);
  const centrer = (l: LieuCarte, zoom: number) => setCentrage((c) => ({ lat: l.lat, lng: l.lng, zoom, n: (c?.n || 0) + 1 }));

  const { data: lieux = [], isLoading } = useQuery({
    queryKey: ['carte-exploration', lang],
    queryFn: async () => {
      const r = await httpClient.get<Ligne[]>('/patrimoine/carte-exploration');
      return (r.success && Array.isArray(r.data) ? r.data : []).map(lire);
    },
    staleTime: 5 * 60 * 1000
  });

  const filtres = { wilaya: geo.selectedWilaya, daira: geo.selectedDaira, commune: geo.selectedCommune, typesCaches, type };
  const visibles = useMemo(() => filtrerLieux(lieux, filtres),
  // eslint-disable-next-line react-hooks/exhaustive-deps
    [lieux, geo.selectedWilaya, geo.selectedDaira, geo.selectedCommune, typesCaches, type]);
  const sites = useMemo(() => visibles.filter((l) => !l.parent), [visibles]);
  const parId = useMemo(() => new Map(lieux.map((l) => [l.id, l])), [lieux]);
  // Points de visite : ceux des sites affichés (un point suit son site, même si son propre type est caché)
  const points = useMemo(() => {
    const ids = new Set(sites.map((s) => s.id));
    return lieux.filter((l) => l.parent && ids.has(l.parent));
  }, [lieux, sites]);
  // Cadrage seulement quand la zone géographique change (pas au moindre filtre de type)
  const cadrage = useMemo(() => (geo.selectedWilaya ? filtrerLieux(lieux, { wilaya: geo.selectedWilaya, daira: geo.selectedDaira, commune: geo.selectedCommune }).filter((l) => !l.parent) : []),
  // eslint-disable-next-line react-hooks/exhaustive-deps
    [lieux, geo.selectedWilaya, geo.selectedDaira, geo.selectedCommune]);

  const typesPresents = useMemo(() => {
    const n = new Map<string, number>();
    for (const l of lieux) if (!l.parent) n.set(l.type, (n.get(l.type) || 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1]);
  }, [lieux]);

  // Liste : les sites de la zone regardée, les plus riches d'abord (points de visite, photo)
  const liste = useMemo(() => {
    const dansZone = zone ? sites.filter((s) => zone.b.contains([s.lat, s.lng])) : sites;
    return [...dansZone].sort((a, b) => (b.nbPoints - a.nbPoints) || (Number(!!b.image) - Number(!!a.image)) || a.nom.localeCompare(b.nom, lang));
  }, [sites, zone, lang]);

  const nomWilaya = (w: { nom: string; wilaya_name_ascii: string }) => (lang === 'ar' ? w.nom : w.wilaya_name_ascii);
  const nomType = (ty: string) => t(`patrimoine.types.${ty}`, ty);
  const basculerType = (ty: string) => setTypesCaches((prev) => { const n = new Set(prev); if (n.has(ty)) n.delete(ty); else n.add(ty); return n; });
  const parent = choisi?.parent ? parId.get(choisi.parent) : null;

  return (
    <div className="space-y-4">
      {/* Filtres géographiques : wilaya › daïra › commune */}
      <div className="grid gap-2 sm:grid-cols-3">
        <Select value={geo.selectedWilaya ? String(geo.selectedWilaya) : 'toutes'} onValueChange={(v) => geo.setSelectedWilaya(v === 'toutes' ? null : Number(v))}>
          <SelectTrigger aria-label={t('patrimoine.carte.wilaya', 'Wilaya')}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="toutes">{t('patrimoine.carte.toutesWilayas', 'Toute l’Algérie')}</SelectItem>
            {[...geo.wilayas].sort((a, b) => a.codeW - b.codeW).map((w) => (
              <SelectItem key={w.id_wilaya} value={String(w.id_wilaya)}>{`${String(w.codeW).padStart(2, '0')} · ${nomWilaya(w)}`}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select disabled={!geo.selectedWilaya} value={geo.selectedDaira ? String(geo.selectedDaira) : 'toutes'} onValueChange={(v) => geo.setSelectedDaira(v === 'toutes' ? null : Number(v))}>
          <SelectTrigger aria-label={t('patrimoine.carte.daira', 'Daïra')}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="toutes">{t('patrimoine.carte.toutesDairas', 'Toutes les daïras')}</SelectItem>
            {geo.dairas.map((d) => <SelectItem key={d.id_daira} value={String(d.id_daira)}>{lang === 'ar' ? d.nom : d.daira_name_ascii}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select disabled={!geo.selectedDaira} value={geo.selectedCommune ? String(geo.selectedCommune) : 'toutes'} onValueChange={(v) => geo.setSelectedCommune(v === 'toutes' ? null : Number(v))}>
          <SelectTrigger aria-label={t('patrimoine.carte.commune', 'Commune')}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="toutes">{t('patrimoine.carte.toutesCommunes', 'Toutes les communes')}</SelectItem>
            {geo.communes.map((c) => <SelectItem key={c.id_commune} value={String(c.id_commune)}>{lang === 'ar' ? c.nom : c.commune_name_ascii}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Légende : une couleur par type, toucher pour cacher ou montrer */}
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('patrimoine.carte.legende', 'Types de lieux')}>
        {typesPresents.map(([ty, n]) => (
          <button key={ty} type="button" onClick={() => basculerType(ty)} aria-pressed={!typesCaches.has(ty)}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${typesCaches.has(ty) ? 'opacity-40 line-through' : ''}`}>
            <span className="h-3 w-3 rounded-full" style={{ background: couleurType(ty) }} aria-hidden="true" />
            {nomType(ty)} <span className="text-muted-foreground">{n}</span>
          </button>
        ))}
      </div>

      {/* Téléphone : carte ou liste */}
      <div className="flex gap-2 lg:hidden">
        <Button size="sm" variant={vue === 'carte' ? 'default' : 'outline'} onClick={() => setVue('carte')}><IconeCarte className="h-4 w-4 me-1" />{t('patrimoine.carte.vueCarte', 'Carte')}</Button>
        <Button size="sm" variant={vue === 'liste' ? 'default' : 'outline'} onClick={() => setVue('liste')}><List className="h-4 w-4 me-1" />{t('patrimoine.carte.vueListe', { n: liste.length, defaultValue: 'Liste ({{n}})' })}</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className={`relative h-[60vh] min-h-[380px] overflow-hidden rounded-lg border ${vue === 'liste' ? 'hidden lg:block' : ''}`}>
          <MapContainer bounds={ALGERIE} className="h-full w-full" zoomControl={false} zoomSnap={0.5} scrollWheelZoom>
            <FondDeCarte />
            <ZoomControl zoomInTitle={t('carte.zoomAvant', 'Zoomer')} zoomOutTitle={t('carte.zoomArriere', 'Dézoomer')} />
            <Couches sites={sites} points={points} onChoisir={setChoisi} cadrage={cadrage} centrage={centrage} onZone={(b, z) => setZone({ b, z })} />
          </MapContainer>
          {isLoading && <div className="absolute inset-0 grid place-items-center bg-background/60 text-sm">{t('common.loading', 'Chargement…')}</div>}
          {zone && zone.z >= 12 && zone.z < ZOOM_POINTS && points.some((p) => zone.b.contains([p.lat, p.lng])) && (
            <p className="absolute top-2 start-2 z-[500] rounded bg-background/90 px-2 py-1 text-xs shadow">{t('patrimoine.carte.zoomerPoints', 'Zoomez pour voir les points de visite')}</p>
          )}
          {/* Fiche courte du lieu touché */}
          {choisi && (
            <div className="absolute inset-x-2 bottom-2 z-[600] flex gap-3 rounded-lg border bg-background p-3 shadow-lg sm:inset-x-auto sm:end-2 sm:w-80" role="dialog" aria-label={choisi.nom}>
              {choisi.image ? <img src={getAssetUrl(choisi.image, { width: 160 })} alt="" className="h-20 w-20 shrink-0 rounded object-cover" />
                : <span className="grid h-20 w-20 shrink-0 place-items-center rounded" style={{ background: `${couleurType(choisi.type)}22` }}><Landmark className="h-8 w-8" style={{ color: couleurType(choisi.type) }} aria-hidden="true" /></span>}
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-semibold leading-tight" dir="auto">{choisi.nom}</p>
                <p className="text-xs text-muted-foreground">{nomType(choisi.type)}</p>
                {parent && <p className="text-xs">{t('patrimoine.carte.partieDe', { site: parent.nom, defaultValue: 'Partie de « {{site}} »' })}</p>}
                {choisi.nbPoints > 0 && <Badge variant="secondary">{t('patrimoine.carte.nbPoints', { n: choisi.nbPoints, defaultValue: '{{n}} points de visite' })}</Badge>}
                <div className="flex flex-wrap gap-2 pt-1">
                  {choisi.nbPoints > 0 && (
                    <Button size="sm" variant="secondary" onClick={() => centrer(choisi, ZOOM_POINTS + 1)}>{t('patrimoine.carte.voirPoints', 'Voir les points de visite')}</Button>
                  )}
                  <Button asChild size="sm"><Link to={`/patrimoine/${choisi.id}`}>{t('patrimoine.carte.voirFiche', 'Voir la fiche')}</Link></Button>
                  <Button asChild size="sm" variant="outline">
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${choisi.lat},${choisi.lng}`} target="_blank" rel="noopener noreferrer"><Navigation className="h-3.5 w-3.5 me-1" />{t('patrimoine.carte.itineraire', 'Itinéraire')}</a>
                  </Button>
                </div>
              </div>
              <button type="button" onClick={() => setChoisi(null)} className="self-start text-muted-foreground" aria-label={t('common.close', 'Fermer')}><X className="h-4 w-4" /></button>
            </div>
          )}
        </div>

        {/* Liste reliée à la carte */}
        <div className={`flex max-h-[60vh] min-h-[380px] flex-col rounded-lg border ${vue === 'carte' ? 'hidden lg:flex' : ''}`}>
          <p className="border-b px-3 py-2 text-sm font-medium">
            {t('patrimoine.carte.dansLaZone', { n: liste.length, defaultValue: '{{n}} sites dans la zone' })}
          </p>
          <ul className="flex-1 divide-y overflow-y-auto">
            {liste.slice(0, MAX_LISTE).map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => { setChoisi(s); setVue('carte'); centrer(s, 12); }} className="flex w-full items-center gap-3 px-3 py-2 text-start hover:bg-muted/60">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: couleurType(s.type) }} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium" dir="auto">{s.nom}</span>
                    <span className="block text-xs text-muted-foreground">
                      {[nomType(s.type), s.nbPoints ? t('patrimoine.carte.nbPoints', { n: s.nbPoints, defaultValue: '{{n}} points de visite' }) : ''].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          {liste.length > MAX_LISTE && (
            <p className="border-t px-3 py-2 text-xs text-muted-foreground">{t('patrimoine.carte.zoomerPlus', { n: liste.length - MAX_LISTE, defaultValue: 'Et {{n}} autres : zoomez ou choisissez une wilaya.' })}</p>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t('patrimoine.carte.source', 'Positions des lieux : Tala DZ et © contributeurs OpenStreetMap.')}</p>
    </div>
  );
};

export { COULEUR_TYPE };
export default CarteExploration;
