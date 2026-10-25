import { describe, test, expect } from 'vitest';
import { comparerBlocs, type BlocRevision } from '../articleRevision.service';

const texte = (contenu: string): BlocRevision => ({ type_block: 'text', contenu });

describe('comparerBlocs (ce qui change dans une proposition)', () => {
  test('paragraphe modifié : l’ancien retiré, le nouveau ajouté ; le reste inchangé', () => {
    const lignes = comparerBlocs([texte('A'), texte('B'), texte('C')], [texte('A'), texte('B complété'), texte('C')]);
    expect(lignes.map(l => `${l.etat}:${l.bloc.contenu}`)).toEqual(['identique:A', 'retire:B', 'ajoute:B complété', 'identique:C']);
  });

  test('ajout en fin d’article et suppression d’un bloc', () => {
    expect(comparerBlocs([texte('A'), texte('B')], [texte('A'), texte('B'), texte('C')]).map(l => l.etat)).toEqual(['identique', 'identique', 'ajoute']);
    expect(comparerBlocs([texte('A'), texte('B')], [texte('B')]).map(l => l.etat)).toEqual(['retire', 'identique']);
  });

  test('image inchangée : on garde celle de l’article (avec son adresse) ; légende changée = modification', () => {
    const actuelle: BlocRevision = { type_block: 'image', id_media: 15, metadata: { caption: 'Terrasses' }, media: { url: 'https://res.cloudinary.com/x/t.jpg' } };
    const proposee: BlocRevision = { type_block: 'image', id_media: 15, metadata: { caption: 'Terrasses' } };
    expect(comparerBlocs([actuelle], [proposee])[0]).toEqual({ etat: 'identique', bloc: actuelle });
    const legende: BlocRevision = { ...proposee, metadata: { caption: 'Les terrasses au coucher du soleil' } };
    expect(comparerBlocs([actuelle], [legende]).map(l => l.etat)).toEqual(['retire', 'ajoute']);
  });
});
