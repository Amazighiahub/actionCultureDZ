// components/LieuSelector.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/UI/input';
import { Label } from '@/components/UI/label';
import { Button } from '@/components/UI/button';
import { Textarea } from '@/components/UI/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/UI/select';
import { Card, CardContent } from '@/components/UI/card';
import { MapPin, Search, Plus, X, Loader2, Copy, Locate } from 'lucide-react';
import { useToast } from '@/components/UI/use-toast';
import { lieuService } from '@/services/lieu.service';
import { Lieu } from '@/types/models/lieu.types';
import { TypeLieuAdministratif, TypeLieuCulturel } from '@/types/enums/lieu.enums';
import { useRTL } from '@/hooks/useRTL';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix pour les icônes Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LieuSelectorProps {
  value?: number;
  onChange: (lieuId: number | undefined, lieu?: Lieu) => void;
  wilayaId?: number;
  required?: boolean;
}

export const LieuSelector: React.FC<LieuSelectorProps> = ({
  value,
  onChange,
  wilayaId,
  required = false
}) => {
  const { t } = useTranslation();
  const { rtlClasses } = useRTL();
  const { toast } = useToast();
  
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [lieux, setLieux] = useState<Lieu[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLieu, setSelectedLieu] = useState<Lieu | null>(null);
  const [showMapPreview, setShowMapPreview] = useState(false);
  const [previewLieu, setPreviewLieu] = useState<Lieu | null>(null);
  const [filterTypeLieuCulturel, setFilterTypeLieuCulturel] = useState<TypeLieuCulturel | 'all'>('all');
  
  // État pour la création
  const [newLieu, setNewLieu] = useState({
    nom: '',
    typeLieu: TypeLieuAdministratif.COMMUNE, // Par défaut au niveau commune
    typeLieuCulturel: TypeLieuCulturel.ESPACE_CULTUREL,
    adresse: '',
    latitude: 36.7525, // Centre de l'Algérie par défaut
    longitude: 3.04197,
    description: ''
  });
  
  const [addressSearch, setAddressSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const previewMapRef = useRef<L.Map | null>(null);
  const previewMapContainerRef = useRef<HTMLDivElement>(null);

  // Charger les lieux existants
  useEffect(() => {
    loadLieux();
  }, [wilayaId, filterTypeLieuCulturel]);

  // Initialiser la carte
  useEffect(() => {
    if (mode === 'create' && mapContainerRef.current && !mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView(
        [newLieu.latitude, newLieu.longitude], 
        13
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);

      // Ajouter le marqueur initial
      markerRef.current = L.marker([newLieu.latitude, newLieu.longitude])
        .addTo(mapRef.current);

      // Gérer le clic sur la carte
      mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        updateMarkerPosition(lat, lng);
      });
    }

    return () => {
      if (mode !== 'create' && mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [mode]);

  const loadLieux = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (wilayaId) {
        params.wilayaId = wilayaId;
      }
      if (searchQuery) {
        params.q = searchQuery;
      }
      if (filterTypeLieuCulturel && filterTypeLieuCulturel !== 'all') {
        params.typeLieuCulturel = filterTypeLieuCulturel;
      }

      const response = await lieuService.search(params);
      if (response.success && response.data) {
        let lieuxList = response.data.items;
        
        // Trier par distance si la géolocalisation est disponible
        if (userLocation) {
          lieuxList = lieuxList.sort((a, b) => {
            const distA = calculateDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
            const distB = calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
            return distA - distB;
          });
        }
        
        setLieux(lieuxList);
      }
    } catch (error) {
      console.error('Erreur chargement lieux:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMarkerPosition = async (lat: number, lng: number) => {
    setNewLieu(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));

    if (markerRef.current && mapRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng], mapRef.current.getZoom());
    }

    // Reverse geocoding pour obtenir l'adresse
    const result = await lieuService.reverseGeocode(lat, lng);
    if (result) {
      setNewLieu(prev => ({
        ...prev,
        adresse: result.display_name
      }));
    }
  };

  const searchAddress = async () => {
    if (!addressSearch.trim()) return;

    setSearching(true);
    try {
      const results = await lieuService.geocodeAddress(addressSearch);
      setSearchResults(results);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('places.geocoding.error'),
        variant: "destructive"
      });
    } finally {
      setSearching(false);
    }
  };

  const selectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    updateMarkerPosition(lat, lng);
    setSearchResults([]);
    setAddressSearch('');
  };

  const copyCoordinates = (lat: number, lng: number) => {
    const coords = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    navigator.clipboard.writeText(coords).then(() => {
      toast({
        title: t('common.success'),
        description: t('places.coordinatesCopied'),
      });
    }).catch(() => {
      toast({
        title: t('common.error'),
        description: t('places.copyError'),
        variant: "destructive"
      });
    });
  };

  // Calculer la distance entre deux points (formule de Haversine)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Obtenir la position de l'utilisateur
  const getUserLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Erreur géolocalisation:", error);
        }
      );
    }
  };

  useEffect(() => {
    getUserLocation();
  }, []);

 const handleCreateLieu = async () => {
    // Validation
    const validation = await lieuService.validate(newLieu);
    if (!validation.valid) {
      toast({
        title: t('common.validationError'),
        description: validation.errors?.join('\n'),
        variant: "destructive"
      });
      return;
    }

    // Vérifier les doublons
    const duplicateCheck = await lieuService.checkDuplicate(
      newLieu.nom,
      newLieu.latitude,
      newLieu.longitude
    );

    if (duplicateCheck.success && duplicateCheck.data?.exists) {
      toast({
        title: t('places.duplicate.title'),
        description: t('places.duplicate.description'),
        variant: "warning"
      });
      
      if (duplicateCheck.data.lieu) {
        onChange(duplicateCheck.data.lieu.id_lieu, duplicateCheck.data.lieu);
        setMode('select');
      }
      return;
    }

    setLoading(true);
    try {
      const response = await lieuService.create({
        ...newLieu,
        wilayaId,
        detail: newLieu.description ? {
          description: newLieu.description
        } : undefined
      });

      if (response.success && response.data) {
        toast({
          title: t('common.success'),
          description: t('places.create.success')
        });
        
        onChange(response.data.id_lieu, response.data);
        setMode('select');
        loadLieux(); // Recharger la liste
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('places.create.error'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const typesLieuxCulturels = [
    { value: TypeLieuCulturel.SALLE_SPECTACLE, label: t('places.types.theater') },
    { value: TypeLieuCulturel.GALERIE, label: t('places.types.gallery') },
    { value: TypeLieuCulturel.ESPACE_CULTUREL, label: t('places.types.culturalSpace') },
    { value: TypeLieuCulturel.MUSEE, label: t('places.types.museum') },
    { value: TypeLieuCulturel.BIBLIOTHEQUE, label: t('places.types.library') },
    { value: TypeLieuCulturel.CINEMA, label: t('places.types.cinema') },
    { value: TypeLieuCulturel.SALLE_CONFERENCE, label: t('places.types.conferenceHall') },
    { value: TypeLieuCulturel.THEATRE, label: t('places.types.theater2') },
    { value: TypeLieuCulturel.CENTRE_CULTUREL, label: t('places.types.culturalCenter') },
    { value: TypeLieuCulturel.MAISON_CULTURE, label: t('places.types.cultureHouse') },
    { value: TypeLieuCulturel.PLEIN_AIR, label: t('places.types.outdoor') },
    { value: TypeLieuCulturel.MONUMENT_HISTORIQUE, label: t('places.types.historicalMonument') },
    { value: TypeLieuCulturel.SITE_ARCHEOLOGIQUE, label: t('places.types.archaeologicalSite') },
    { value: TypeLieuCulturel.AUTRE, label: t('places.types.other') }
  ];

  return (
    <div className="space-y-4">
      {/* Toggle mode */}
      <div className={`flex gap-2 ${rtlClasses.flexRow}`}>
        <Button
          type="button"
          variant={mode === 'select' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('select')}
        >
          <Search className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
          {t('places.selectExisting')}
        </Button>
        <Button
          type="button"
          variant={mode === 'create' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('create')}
        >
          <Plus className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
          {t('places.createNew')}
        </Button>
      </div>

      {mode === 'select' ? (
        <div className="space-y-4">
          {/* Recherche et filtres */}
          <div className="space-y-3">
            <div className={`flex gap-2 ${rtlClasses.flexRow}`}>
              <Input
                placeholder={t('places.search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && loadLieux()}
              />
              <Button onClick={loadLieux} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            
            {/* Filtre par type */}
            <Select
              value={filterTypeLieuCulturel}
              onValueChange={(value) => {
                setFilterTypeLieuCulturel(value as TypeLieuCulturel | 'all');
                // Pas d'appel à loadLieux() ici, il sera fait par l'effet
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('places.filterByType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('places.allTypes')}</SelectItem>
                {typesLieuxCulturels.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Liste des lieux */}
          {userLocation && lieux.length > 0 && (
            <p className="text-xs text-muted-foreground mb-2">
              {t('places.sortedByDistance')}
            </p>
          )}
          <div className="max-h-60 overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </div>
            ) : lieux.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                {t('places.noResults')}
              </p>
            ) : (
              lieux.map((lieu) => (
                <Card
                  key={lieu.id_lieu}
                  className={`cursor-pointer transition-colors ${
                    value === lieu.id_lieu ? 'border-primary' : ''
                  }`}
                >
                  <CardContent className="p-3">
                    <div 
                      className={`flex items-start ${rtlClasses.flexRow}`}
                      onClick={() => {
                        setSelectedLieu(lieu);
                        onChange(lieu.id_lieu, lieu);
                      }}
                    >
                      <MapPin className={`h-4 w-4 text-muted-foreground ${rtlClasses.marginEnd(2)} mt-0.5 flex-shrink-0`} />
                      <div className="flex-1">
                        <div className={`flex items-center gap-2 ${rtlClasses.flexRow}`}>
                          <p className="font-medium">{lieu.nom}</p>
                          {lieu.typeLieuCulturel && (
                            <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                              {typesLieuxCulturels.find(t => t.value === lieu.typeLieuCulturel)?.label || lieu.typeLieuCulturel}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{lieu.adresse}</p>
                        <div className={`flex items-center gap-4 mt-1 text-xs text-muted-foreground ${rtlClasses.flexRow}`}>
                          <span>Lat: {lieu.latitude.toFixed(6)}</span>
                          <span>Lng: {lieu.longitude.toFixed(6)}</span>
                          {userLocation && (
                            <span className="text-primary">
                              {calculateDistance(userLocation.lat, userLocation.lng, lieu.latitude, lieu.longitude).toFixed(1)} km
                            </span>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-5 px-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyCoordinates(lieu.latitude, lieu.longitude);
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewLieu(lieu);
                          setShowMapPreview(true);
                        }}
                        className={rtlClasses.marginStart(2)}
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Modal de prévisualisation de la carte */}
          {showMapPreview && previewLieu && (
            <Card className="mt-4">
              <CardContent className="p-4">
                <div className={`flex justify-between items-center mb-2 ${rtlClasses.flexRow}`}>
                  <h4 className="font-medium">{previewLieu.nom}</h4>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowMapPreview(false);
                      setPreviewLieu(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{previewLieu.adresse}</p>
                <div className="text-xs text-muted-foreground mb-2">
                  Coordonnées: {previewLieu.latitude.toFixed(6)}, {previewLieu.longitude.toFixed(6)}
                </div>
                <div 
                  ref={previewMapContainerRef}
                  className="h-48 rounded-lg border"
                />
                <Button
                  type="button"
                  className="w-full mt-3"
                  onClick={() => {
                    setSelectedLieu(previewLieu);
                    onChange(previewLieu.id_lieu, previewLieu);
                    setShowMapPreview(false);
                  }}
                >
                  {t('places.selectThisLocation')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nom">{t('places.name')} *</Label>
                <Input
                  id="nom"
                  value={newLieu.nom}
                  onChange={(e) => setNewLieu(prev => ({ ...prev, nom: e.target.value }))}
                  placeholder={t('places.namePlaceholder')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">{t('places.type')} *</Label>
                <Select
                  value={newLieu.typeLieuCulturel}
                  onValueChange={(value) => setNewLieu(prev => ({ ...prev, typeLieuCulturel: value as TypeLieuCulturel }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typesLieuxCulturels.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Recherche d'adresse */}
            <div className="space-y-2">
              <Label>{t('places.addressSearch')}</Label>
              <div className={`flex gap-2 ${rtlClasses.flexRow}`}>
                <Input
                  value={addressSearch}
                  onChange={(e) => setAddressSearch(e.target.value)}
                  placeholder={t('places.addressSearchPlaceholder')}
                  onKeyPress={(e) => e.key === 'Enter' && searchAddress()}
                />
                <Button type="button" onClick={searchAddress} disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
                {userLocation && (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => updateMarkerPosition(userLocation.lat, userLocation.lng)}
                    title={t('places.useCurrentLocation')}
                  >
                    <Locate className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Résultats de recherche */}
              {searchResults.length > 0 && (
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto border rounded p-2">
                  {searchResults.map((result, index) => (
                    <div
                      key={index}
                      className="p-2 hover:bg-accent cursor-pointer rounded text-sm"
                      onClick={() => selectSearchResult(result)}
                    >
                      {result.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Adresse actuelle */}
            <div className="space-y-2">
              <Label htmlFor="adresse">{t('places.address')} *</Label>
              <Textarea
                id="adresse"
                value={newLieu.adresse}
                onChange={(e) => setNewLieu(prev => ({ ...prev, adresse: e.target.value }))}
                placeholder={t('places.addressPlaceholder')}
                rows={2}
              />
            </div>

            {/* Carte */}
            <div className="space-y-2">
              <Label>{t('places.mapLocation')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('places.mapInstructions')}
              </p>
              <div 
                ref={mapContainerRef}
                className="h-64 rounded-lg border"
              />
              <div className="text-sm text-muted-foreground">
                <div className={`flex items-center gap-2 ${rtlClasses.flexRow}`}>
                  <span>{t('places.coordinates')}: {newLieu.latitude.toFixed(6)}, {newLieu.longitude.toFixed(6)}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-5 px-1"
                    onClick={() => copyCoordinates(newLieu.latitude, newLieu.longitude)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t('places.description')}</Label>
              <Textarea
                id="description"
                value={newLieu.description}
                onChange={(e) => setNewLieu(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('places.descriptionPlaceholder')}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className={`flex justify-end gap-2 ${rtlClasses.flexRow}`}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode('select')}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleCreateLieu}
                disabled={loading || !newLieu.nom || !newLieu.adresse}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
                    {t('places.create.button')}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};