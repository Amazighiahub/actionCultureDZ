/**
 * Anti-retour (2026-11-17) : section « Poésie ». Les deux réglages simples changent seulement les blocs du
 * modèle Poème : disposition (colonnes du bloc poème) et place de l'image (déplacée, ajoutée ou retirée).
 */
import { describe, it, expect } from 'vitest';
import type { ArticleBlock } from '@/types/models/articles.types';
import { placeImage, avecColonnes, avecImage } from '../ReglagesPoeme';

const image = { type_block: 'image', contenu: '', metadata: { layout: 'float-left' } } as unknown as ArticleBlock;
const poeme = { type_block: 'text', contenu: 'Vers 1\nVers 2', metadata: { forme: 'poeme' } } as unknown as ArticleBlock;
const note = { type_block: 'text', contenu: 'Note', metadata: { forme: 'encadre' } } as unknown as ArticleBlock;
const modele = [image, poeme, note];
const meta = (b: ArticleBlock) => b.metadata as Record<string, unknown>;

describe('Réglages du poème', () => {
  it('deux colonnes sur le seul bloc poème, puis retour à une colonne', () => {
    const deux = avecColonnes(modele, true);
    expect(meta(deux[1]).colonnes).toBe(2);
    expect(meta(deux[2]).colonnes).toBeUndefined();
    expect(meta(avecColonnes(deux, false)[1])).toEqual({ forme: 'poeme' });
  });

  it('image déplacée, retirée, puis remise avant le poème', () => {
    expect(placeImage(modele)).toBe('float-left');
    const droite = avecImage(modele, 'float-right', 'x');
    expect(placeImage(droite)).toBe('float-right');
    const sans = avecImage(droite, 'aucune', 'x');
    expect(sans).toHaveLength(2);
    expect(placeImage(sans)).toBe('aucune');
    const dessus = avecImage(sans, 'full-width', 'Une image');
    expect(dessus[0].type_block).toBe('image');
    expect(dessus[1]).toBe(poeme);
    expect(placeImage(dessus)).toBe('full-width');
  });

  it('une image placée après le poème n’est pas celle du poème', () => {
    expect(placeImage([poeme, image])).toBe('aucune');
  });
});
