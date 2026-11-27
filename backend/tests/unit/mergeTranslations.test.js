/**
 * Fusion des traductions : une langue vide ne doit pas effacer la traduction existante
 */
const { mergeTranslations } = require('../../helpers/i18n');

describe('mergeTranslations', () => {
  it('met à jour les langues fournies et garde les autres', () => {
    expect(mergeTranslations({ fr: 'Atelier', ar: 'ورشة' }, { fr: 'Atelier poterie', en: 'Pottery' }))
      .toEqual({ fr: 'Atelier poterie', ar: 'ورشة', en: 'Pottery' });
  });

  it.each([[''], ['   '], [undefined]])('ignore une langue vide (%p)', (empty) => {
    expect(mergeTranslations({ fr: 'Atelier', ar: 'ورشة' }, { fr: 'Atelier', ar: empty }))
      .toEqual({ fr: 'Atelier', ar: 'ورشة' });
  });

  // 2026-11-27 : null = langue vidée exprès par la personne (utils/effacementLangues côté site), effacée
  it('efface une langue envoyée à null', () => {
    expect(mergeTranslations({ fr: 'Atelier', ar: 'ورشة' }, { fr: 'Atelier', ar: null }))
      .toEqual({ fr: 'Atelier' });
  });

  it('refuse les clés dangereuses', () => {
    const merged = mergeTranslations({ fr: 'a' }, JSON.parse('{"__proto__": {"x": 1}, "en": "b"}'));
    expect(merged).toEqual({ fr: 'a', en: 'b' });
    expect({}.x).toBeUndefined();
  });

  it('accepte une chaîne (langue par défaut)', () => {
    expect(mergeTranslations({ ar: 'ورشة' }, 'Atelier')).toEqual({ ar: 'ورشة', fr: 'Atelier' });
  });
});
