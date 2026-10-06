/**
 * URL saisies par les utilisateurs et affichées comme liens : http(s) uniquement.
 */
const BaseDTO = require('../../dto/baseDTO');
const UpdateUserDTO = require('../../dto/user/updateUserDTO');
const ArticleSubService = require('../../services/oeuvre/subtypes/articleSubService');

describe('BaseDTO.isHttpUrl', () => {
  it.each(['https://musee.dz', 'http://a.dz/x?y=1'])('accepte %p', (u) => expect(BaseDTO.isHttpUrl(u)).toBe(true));
  it.each(['javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:text/html,x', 'file:///etc/passwd', '', null])('refuse %p', (u) => {
    expect(BaseDTO.isHttpUrl(u)).toBe(false);
  });
});

describe('profil : site_web', () => {
  it('refuse javascript: (était accepté)', () => {
    const errors = new UpdateUserDTO({ site_web: 'javascript:fetch(1)' }).validate().errors;
    expect(errors.some(e => e.field === 'siteWeb')).toBe(true);
  });
});

describe('article : url_source', () => {
  const svc = new ArticleSubService({});
  it('ignore une URL non http(s) à la création et à la mise à jour', () => {
    expect(svc._buildCreateData(1, { url_source: 'javascript:alert(1)' }).url_source).toBeNull();
    expect(svc._buildUpdateData({ url_source: 'javascript:alert(1)' }).url_source).toBeNull();
    expect(svc._buildUpdateData({ url_source: 'https://source.dz' }).url_source).toBe('https://source.dz');
  });
});

describe('photo de profil : médias de la plateforme uniquement', () => {
  const CreateUserDTO = require('../../dto/user/createUserDTO');
  const base = { email: 'a@b.dz', password: 'Azerty123456!', nom: 'N', prenom: 'P', accepte_conditions: 'true' };
  const photoErrors = (dto) => dto.validate().errors.filter(e => e.field === 'photo_url');

  it('inscription : URL externe refusée, Cloudinary ou chemin local accepté', () => {
    expect(photoErrors(new CreateUserDTO({ ...base, photo_url: 'https://evil.tld/pixel.png' }))).toHaveLength(1);
    expect(photoErrors(new CreateUserDTO({ ...base, photo_url: 'https://res.cloudinary.com/x/image/upload/a.jpg' }))).toHaveLength(0);
    expect(photoErrors(new CreateUserDTO({ ...base, photo_url: '/uploads/images/a.jpg' }))).toHaveLength(0);
  });

  it('profil : URL externe refusée, suppression (null) autorisée', () => {
    expect(photoErrors(new UpdateUserDTO({ photo_url: 'https://api.taladz.com.evil.tld/p.png' }))).toHaveLength(1);
    expect(photoErrors(new UpdateUserDTO({ photo_url: null }))).toHaveLength(0);
  });
});

describe('utils/csv : injection de formules', () => {
  const { csvCell, csvRow } = require('../../utils/csv');
  it('neutralise =, +, -, @ et échappe les guillemets', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(csvCell('@SUM(A1)')).toBe('"\'@SUM(A1)"');
    expect(csvRow(['Amina', null, 3])).toBe('"Amina","","3"');
  });
});
