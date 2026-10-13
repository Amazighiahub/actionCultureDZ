/**
 * Réseaux sociaux du profil professionnel : réseaux connus, liens vers le bon site uniquement
 */
const UpdateUserDTO = require('../../dto/user/updateUserDTO');

describe('UpdateUserDTO — réseaux sociaux', () => {
  it('garde les réseaux connus et ignore le reste', () => {
    const dto = UpdateUserDTO.fromRequest({
      reseaux_sociaux: {
        facebook: ' https://www.facebook.com/taladz ',
        instagram: '',
        inconnu: 'https://example.com',
      },
    });
    expect(dto.toEntity().reseaux_sociaux).toEqual({ facebook: 'https://www.facebook.com/taladz' });
    expect(dto.validate().valid).toBe(true);
  });

  it('accepte les sous-domaines et domaines alternatifs du réseau', () => {
    const dto = UpdateUserDTO.fromRequest({
      reseaux_sociaux: {
        facebook: 'https://m.facebook.com/page',
        youtube: 'https://youtu.be/abc',
        x: 'https://twitter.com/compte',
        linkedin: 'https://dz.linkedin.com/in/nom',
      },
    });
    expect(dto.validate().valid).toBe(true);
  });

  it.each([
    ['facebook', 'javascript:alert(1)'],
    ['facebook', 'https://facebook.com.pirate.example/page'],
    ['instagram', 'https://example.com/instagram.com'],
    ['tiktok', 'ftp://tiktok.com/@nom'],
  ])('refuse %s = %s', (network, url) => {
    const dto = UpdateUserDTO.fromRequest({ reseaux_sociaux: { [network]: url } });
    const { valid, errors } = dto.validate();
    expect(valid).toBe(false);
    expect(errors[0].field).toBe(`reseaux_sociaux.${network}`);
  });

  it('objet vide si la valeur reçue est invalide ; champ absent = non modifié', () => {
    expect(UpdateUserDTO.fromRequest({ reseaux_sociaux: 'pas du json' }).toEntity().reseaux_sociaux).toEqual({});
    expect(UpdateUserDTO.fromRequest({ nom: 'A' }).toEntity()).not.toHaveProperty('reseaux_sociaux');
  });
});
