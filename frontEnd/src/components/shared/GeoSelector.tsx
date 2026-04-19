/**
 * GeoSelector - Sélecteur géographique en cascade
 * Wilaya → Daïra → Commune
 * Utilise des <select> natifs pour compatibilité mobile
 */
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useGeographicSelection } from '@/hooks/useGeographie';

interface GeoSelectorProps {
  wilayaId: number | null;
  dairaId: number | null;
  communeId: number | null;
  onWilayaChange: (id: number | null) => void;
  onDairaChange: (id: number | null) => void;
  onCommuneChange: (id: number | null) => void;
  requiredWilaya?: boolean;
  requiredDaira?: boolean;
  requiredCommune?: boolean;
  errors?: { wilaya?: string; daira?: string; commune?: string };
  disabled?: boolean;
  layout?: 'vertical' | 'horizontal';
}

const GeoSelector: React.FC<GeoSelectorProps> = ({
  wilayaId, dairaId, communeId,
  onWilayaChange, onDairaChange, onCommuneChange,
  requiredWilaya = true, requiredDaira = false, requiredCommune = false,
  errors = {}, disabled = false, layout = 'vertical',
}) => {
  const { t, i18n } = useTranslation();
  const {
    wilayas, dairas, communes,
    setSelectedWilaya, setSelectedDaira, setSelectedCommune,
    wilayasLoading, dairasLoading, communesLoading,
  } = useGeographicSelection();

  // Sync props → hook interne
  useEffect(() => { setSelectedWilaya(wilayaId); }, [wilayaId]);
  useEffect(() => { setSelectedDaira(dairaId); }, [dairaId]);
  useEffect(() => { setSelectedCommune(communeId); }, [communeId]);

  const getWilayaName = (w: Record<string, unknown>): string => {
    if (i18n.language === 'ar' && w.nom) return String(w.nom);
    return String(w.wilaya_name_ascii || w.nom || '');
  };

  const selectClass = (hasError?: string, isDisabled?: boolean) =>
    `w-full p-3 border rounded-lg bg-background hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${isDisabled ? 'opacity-50' : ''} ${hasError ? 'border-destructive' : 'border-input'}`;

  const containerClass = layout === 'horizontal'
    ? 'grid grid-cols-1 sm:grid-cols-3 gap-4'
    : 'space-y-4';

  return (
    <div className={containerClass}>
      {/* Wilaya */}
      <div className="space-y-2">
        <Label htmlFor="geo-wilaya">
          {t('common.wilaya', 'Wilaya')}
          {requiredWilaya && <span className="text-destructive ml-1">*</span>}
        </Label>
        <div className="relative">
          <select
            id="geo-wilaya"
            value={wilayaId || ''}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value) : null;
              onWilayaChange(val);
              onDairaChange(null);
              onCommuneChange(null);
            }}
            disabled={disabled || wilayasLoading}
            className={selectClass(errors.wilaya)}
          >
            <option value="">{wilayasLoading ? t('common.loading', 'Chargement...') : t('common.selectWilaya', '-- Choisir une wilaya --')}</option>
            {wilayas.map((w: any) => (
              <option key={w.id_wilaya} value={w.id_wilaya}>
                {String(w.codeW).padStart(2, '0')} - {getWilayaName(w)}
              </option>
            ))}
          </select>
          {wilayasLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        {errors.wilaya && <p role="alert" className="text-sm text-destructive">{errors.wilaya}</p>}
      </div>

      {/* Daïra */}
      <div className="space-y-2">
        <Label htmlFor="geo-daira">
          {t('common.daira', 'Daïra')}
          {requiredDaira && <span className="text-destructive ml-1">*</span>}
        </Label>
        <div className="relative">
          <select
            id="geo-daira"
            value={dairaId || ''}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value) : null;
              onDairaChange(val);
              onCommuneChange(null);
            }}
            disabled={disabled || !wilayaId || dairasLoading}
            className={selectClass(errors.daira, !wilayaId)}
          >
            <option value="">
              {!wilayaId ? t('common.selectWilayaFirst', '-- Choisir d\'abord une wilaya --')
                : dairasLoading ? t('common.loading', 'Chargement...')
                : t('common.selectDaira', '-- Choisir une daïra --')}
            </option>
            {dairas.map((d: any) => (
              <option key={d.id_daira} value={d.id_daira}>
                {d.daira_name_ascii || d.nom || `Daïra ${d.id_daira}`}
              </option>
            ))}
          </select>
          {dairasLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        {errors.daira && <p role="alert" className="text-sm text-destructive">{errors.daira}</p>}
      </div>

      {/* Commune */}
      <div className="space-y-2">
        <Label htmlFor="geo-commune">
          {t('common.commune', 'Commune')}
          {requiredCommune && <span className="text-destructive ml-1">*</span>}
        </Label>
        <div className="relative">
          <select
            id="geo-commune"
            value={communeId || ''}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value) : null;
              onCommuneChange(val);
            }}
            disabled={disabled || !dairaId || communesLoading}
            className={selectClass(errors.commune, !dairaId)}
          >
            <option value="">
              {!dairaId ? t('common.selectDairaFirst', '-- Choisir d\'abord une daïra --')
                : communesLoading ? t('common.loading', 'Chargement...')
                : t('common.selectCommune', '-- Choisir une commune --')}
            </option>
            {communes.map((c: any) => (
              <option key={c.id_commune} value={c.id_commune}>
                {c.commune_name_ascii || c.nom || `Commune ${c.id_commune}`}
              </option>
            ))}
          </select>
          {communesLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        {errors.commune && <p role="alert" className="text-sm text-destructive">{errors.commune}</p>}
      </div>
    </div>
  );
};

export default GeoSelector;
