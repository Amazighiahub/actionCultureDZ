import { describe, it, expect } from 'vitest';
import { directionTexte, paragrapheNettoye } from '../directionTexte';

describe('sens d’écriture d’un contenu', () => {
  it('arabe : de droite à gauche, même avec des dates et des mots latins', () => {
    expect(directionTexte(['قراءة في رواية', 'مرورًا بـ«ثكنة القلعة أكتوبر 1944» Paris'])).toBe('rtl');
  });
  it('français ou anglais : de gauche à droite', () => {
    expect(directionTexte(['Lecture d’un roman', 'avec un mot عربي'])).toBe('ltr');
    expect(directionTexte([null, undefined, ''])).toBe('ltr');
  });
});

describe('paragraphe nettoyé', () => {
  it('retire les retours à la ligne en trop au début et à la fin, garde ceux du milieu', () => {
    expect(paragrapheNettoye('\r\n\nPremière ligne\nSeconde\n\n\n\nFin\n\n')).toBe('Première ligne\nSeconde\n\nFin');
    expect(paragrapheNettoye(null)).toBe('');
  });
});
