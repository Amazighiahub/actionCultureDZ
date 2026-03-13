/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Type, Heading1, Image, Film, Quote, List,
  Grid3X3, Code, Minus, Link2
} from 'lucide-react';

import type { BlockTemplate } from '@/types/models/articles.types';

// Generateur d'ID unique pour les blocs (cote client uniquement)
let _blockUidCounter = 0;
export const generateBlockUid = () => `block-uid-${Date.now()}-${++_blockUidCounter}`;

// Templates de blocs
export const BLOCK_TEMPLATES: BlockTemplate[] = [
  { id: 'text', name: 'Paragraphe', type_block: 'text', icon: 'Type' },
  { id: 'heading', name: 'Titre', type_block: 'heading', icon: 'Heading1' },
  { id: 'image', name: 'Image', type_block: 'image', icon: 'Image' },
  { id: 'video', name: 'Vidéo', type_block: 'video', icon: 'Film' },
  { id: 'citation', name: 'Citation', type_block: 'citation', icon: 'Quote' },
  { id: 'list', name: 'Liste', type_block: 'list', icon: 'List' },
  { id: 'table', name: 'Tableau', type_block: 'table', icon: 'Grid3X3' },
  { id: 'code', name: 'Code', type_block: 'code', icon: 'Code' },
  { id: 'separator', name: 'Séparateur', type_block: 'separator', icon: 'Minus' },
  { id: 'embed', name: 'Intégration', type_block: 'embed', icon: 'Link2' },
];

// Mapping des icones
export const BLOCK_ICONS: Record<string, any> = {
  Type, Heading1, Image, Film, Quote, List, Grid3X3, Code, Minus, Link2
};
