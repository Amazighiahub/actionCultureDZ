import { describe, it, expect } from 'vitest';
import { nettoyerTexte, nettoyerBlocs } from '../nettoyageTexte';

describe('nettoyer la mise en page', () => {
  it('arabe : espaces avant la ponctuation, après la virgule, dans les guillemets', () => {
    expect(nettoyerTexte('قال الكاتب  ،وهو  يبتسم :  « شجرتان وقلب واحد » .'))
      .toBe('قال الكاتب، وهو يبتسم: «شجرتان وقلب واحد».');
    expect(nettoyerTexte('هل قرأت الرواية ؟نعم')).toBe('هل قرأت الرواية؟ نعم');
  });
  it('arabe : les chiffres ne sont pas séparés', () => {
    expect(nettoyerTexte('سنة 1944،1945 في الجزائر')).toBe('سنة 1944،1945 في الجزائر');
  });
  it('français : virgule et point, sans toucher aux règles françaises ni aux nombres', () => {
    expect(nettoyerTexte('Bonjour ,le  monde . Il dit : « oui » ! Prix 2,5 et 1.5')).toBe('Bonjour, le monde. Il dit : « oui » ! Prix 2,5 et 1.5');
  });
  it('lignes vides en trop et espaces de fin de ligne', () => {
    expect(nettoyerTexte('  Ligne 1   \n\n\n\nLigne 2  ')).toBe('Ligne 1\n\nLigne 2');
  });
  it('adresses web non modifiées', () => {
    expect(nettoyerTexte('Voir https://taladz.com/a,b . ici')).toBe('Voir https://taladz.com/a,b . ici');
  });
  it('blocs : seuls texte, intertitre et citation ; compte des blocs modifiés', () => {
    const r = nettoyerBlocs([
      { type_block: 'text', contenu: 'a  b' },
      { type_block: 'image', contenu: 'x  y' },
      { type_block: 'heading', contenu: 'Titre' },
    ]);
    expect(r.modifies).toBe(1);
    expect(r.blocs[0].contenu).toBe('a b');
    expect(r.blocs[1].contenu).toBe('x  y');
  });
});
