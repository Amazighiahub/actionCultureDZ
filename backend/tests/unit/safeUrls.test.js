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
