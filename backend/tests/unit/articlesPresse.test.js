/**
 * Articles de presse du profil : liste nettoyée et bornée, lien http(s) obligatoire.
 */
const UpdateUserDTO = require('../../dto/user/updateUserDTO');

describe('articles de presse (profil)', () => {
  it('garde les lignes avec un lien, au plus 20, champs bornés, date AAAA-MM-JJ seulement', () => {
    const liste = UpdateUserDTO.normalizeArticlesPresse([
      { titre: 'Le chantier-école de Ghoufi', media: 'El Watan', url: 'https://www.elwatan-dz.com/article', date: '2026-10-20' },
      { titre: 'Sans lien', media: 'APS', url: '' },
      { titre: 'x'.repeat(300), url: 'https://exemple.dz/a', date: '20/10/2026' },
      ...Array.from({ length: 25 }, (_, i) => ({ url: `https://exemple.dz/${i}` }))
    ]);
    expect(liste).toHaveLength(20);
    expect(liste[0]).toEqual({ titre: 'Le chantier-école de Ghoufi', media: 'El Watan', url: 'https://www.elwatan-dz.com/article', date: '2026-10-20' });
    expect(liste[1].titre).toHaveLength(200);
    expect(liste[1].date).toBeNull();
  });

  it('lien sans https : refusé avec un message clair', () => {
    const dto = new UpdateUserDTO({ articles_presse: [{ titre: 'A', url: 'javascript:alert(1)' }] });
    const { valid, errors } = dto.validate();
    expect(valid).toBe(false);
    expect(errors[0].field).toBe('articles_presse.0.url');
    expect(new UpdateUserDTO({ articles_presse: [{ url: 'https://exemple.dz/a' }] }).toEntity().articles_presse).toHaveLength(1);
  });
});
