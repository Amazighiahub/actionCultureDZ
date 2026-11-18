/**
 * Section « Poésie » (2026-11-17) : deux réglages simples au-dessus des blocs, au lieu des options de
 * chaque bloc de l'éditeur avancé.
 * - Disposition : le poème sur une colonne, ou sur deux colonnes (grand écran) ;
 * - Image : à gauche, à droite, au-dessus du poème, ou sans image.
 * Ils modifient les blocs du modèle Poème (bloc image, bloc texte « poème »), rien d'autre.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Feather } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ArticleBlock } from '@/types/models/articles.types';
import { estBlocPoeme, enDeuxColonnes } from '@/utils/poeme';
import { generateBlockUid } from './articleEditor.constants';

type PlaceImage = 'float-left' | 'float-right' | 'full-width' | 'aucune';
const meta = (b: ArticleBlock) => (b.metadata || {}) as Record<string, unknown>;

/** Place de l'image d'après les blocs (aucun bloc image avant le poème : « aucune ») */
export function placeImage(blocks: ArticleBlock[]): PlaceImage {
  const iPoeme = blocks.findIndex((b) => b.type_block === 'text' && estBlocPoeme(b.metadata));
  const image = blocks.find((b, i) => b.type_block === 'image' && (iPoeme < 0 || i < iPoeme));
  if (!image) return 'aucune';
  const layout = String(meta(image).layout || 'float-left');
  return layout === 'float-right' || layout === 'full-width' ? layout : 'float-left';
}

/** Nouveaux blocs pour une disposition (1 ou 2 colonnes) donnée au bloc poème */
export function avecColonnes(blocks: ArticleBlock[], deux: boolean): ArticleBlock[] {
  return blocks.map((b) => {
    if (b.type_block !== 'text' || !estBlocPoeme(b.metadata)) return b;
    const { colonnes: _c, ...reste } = meta(b);
    return { ...b, metadata: deux ? { ...reste, colonnes: 2 } : reste } as ArticleBlock;
  });
}

/** Nouveaux blocs pour une place d'image : déplace, ajoute ou retire le bloc image placé avant le poème */
export function avecImage(blocks: ArticleBlock[], place: PlaceImage, indication: string): ArticleBlock[] {
  const iPoeme = blocks.findIndex((b) => b.type_block === 'text' && estBlocPoeme(b.metadata));
  const iImage = blocks.findIndex((b, i) => b.type_block === 'image' && (iPoeme < 0 || i < iPoeme));
  if (place === 'aucune') return iImage < 0 ? blocks : blocks.filter((_, i) => i !== iImage);
  if (iImage >= 0) return blocks.map((b, i) => (i === iImage ? { ...b, metadata: { ...meta(b), layout: place } } as ArticleBlock : b));
  const image = { type_block: 'image', contenu: '', metadata: { layout: place, indication }, _uid: generateBlockUid() } as unknown as ArticleBlock;
  const position = iPoeme < 0 ? 0 : iPoeme;
  return [...blocks.slice(0, position), image, ...blocks.slice(position)];
}

const ReglagesPoeme: React.FC<{ blocks: ArticleBlock[]; onChange: (b: ArticleBlock[]) => void }> = ({ blocks, onChange }) => {
  const { t } = useTranslation();
  const poeme = blocks.find((b) => b.type_block === 'text' && estBlocPoeme(b.metadata));
  if (!poeme) return null;
  const deux = enDeuxColonnes(poeme.metadata);
  return (
    <Card className="border-primary/30">
      <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
        <p className="sm:col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Feather className="h-4 w-4 text-primary" aria-hidden="true" />
          {t('poesie.aide', 'Collez le poème : un vers par ligne, une ligne vide entre deux strophes. Choisissez la disposition et la place de l’image.')}
        </p>
        <div className="space-y-2">
          <Label htmlFor="poeme-colonnes">{t('poesie.disposition', 'Disposition')}</Label>
          <Select value={deux ? '2' : '1'} onValueChange={(v) => onChange(avecColonnes(blocks, v === '2'))}>
            <SelectTrigger id="poeme-colonnes"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">{t('poesie.uneColonne', 'Une colonne')}</SelectItem>
              <SelectItem value="2">{t('poesie.deuxColonnes', 'Deux colonnes (grand écran)')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="poeme-image">{t('poesie.image', 'Image')}</Label>
          <Select value={placeImage(blocks)}
            onValueChange={(v) => onChange(avecImage(blocks, v as PlaceImage, t('modeles.poeme.image', 'Facultatif : une photo ou une œuvre qui accompagne le poème')))}>
            <SelectTrigger id="poeme-image"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="float-left">{t('poesie.imageGauche', 'À gauche du poème')}</SelectItem>
              <SelectItem value="float-right">{t('poesie.imageDroite', 'À droite du poème')}</SelectItem>
              <SelectItem value="full-width">{t('poesie.imageDessus', 'Au-dessus du poème')}</SelectItem>
              <SelectItem value="aucune">{t('poesie.sansImage', 'Sans image')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReglagesPoeme;
