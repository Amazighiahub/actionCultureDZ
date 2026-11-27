/**
 * Aperçus pour les réseaux sociaux : balises propres à chaque page, contenus publics uniquement
 */
const express = require('express');
const request = require('supertest');
const initOgRoutes = require('../../routes/ogRoutes');
const { buildOgHtml, socialImage, summary, firstImage } = require('../../routes/ogRoutes')._internal;

const CLOUD = 'https://res.cloudinary.com/demo/image/upload/v1/taladz/medina.jpg';

function app(models) {
  const a = express();
  a.use('/api/og', initOgRoutes(models));
  return a;
}

const models = (overrides = {}) => ({
  Media: {}, DetailLieu: {}, LieuMedia: {}, Oeuvre: {},
  Evenement: { findByPk: jest.fn(async () => null) },
  Lieu: { findByPk: jest.fn(async () => null) },
  Artisanat: { findByPk: jest.fn(async () => null) },
  ...overrides,
});

describe('GET /api/og/:type/:id', () => {
  it('renvoie le titre, la description et l\'image de l\'événement', async () => {
    const m = models({
      Evenement: {
        findByPk: jest.fn(async () => ({
          statut: 'planifie',
          nom_evenement: { fr: 'Festival du "Raï" & musique', ar: 'مهرجان' },
          description: { fr: '<p>Trois jours de concerts à Oran.</p>' },
          date_debut: '2026-11-20T18:00:00Z',
          image_url: CLOUD,
          Medias: [],
        })),
      },
    });
    const res = await request(app(m)).get('/api/og/evenements/12');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    // Texte échappé (pas d'injection HTML)
    expect(res.text).toContain('<meta property="og:title" content="Festival du &quot;Raï&quot; &amp; musique | Tala DZ">');
    expect(res.text).toContain('Trois jours de concerts à Oran.');
    expect(res.text).toContain('20 novembre 2026');
    // Affiche entière (fond flouté), pas recadrée : titre et dates restent lisibles
    expect(res.text).toContain('c_fill,w_1200,h_630/e_blur:2000/e_brightness:-25/l_taladz:medina,c_fit,w_1200,h_630/fl_layer_apply/f_jpg,q_auto/v1/taladz/medina.jpg');
    // Adresse canonique lisible : numéro puis nom
    expect(res.text).toContain('<link rel="canonical" href="https://taladz.com/evenements/12-festival-du-rai-musique">');
  });

  it('ne dévoile pas un contenu non public (404 + noindex)', async () => {
    const m = models({ Evenement: { findByPk: jest.fn(async () => ({ statut: 'brouillon', nom_evenement: 'Secret' })) } });
    const res = await request(app(m)).get('/api/og/evenements/3');
    expect(res.status).toBe(404);
    expect(res.text).not.toContain('Secret');
    expect(res.text).toContain('noindex');
  });

  // Anti-retour 2026-11-27 : l'auteur est la personne créditée, pas celle qui a saisi la fiche ;
  // une œuvre au titre arabe est déclarée en arabe (lang, dir, inLanguage)
  it('œuvre : auteur crédité (intervenant principal) et langue arabe', async () => {
    const m = models({
      Oeuvre: { findByPk: jest.fn(async () => ({ id_oeuvre: 4, statut: 'publie', id_type_oeuvre: 6, titre: 'فوق ظل الدنيا', description: 'نص', saisi_par: 75, Media: [] })) },
      OeuvreUser: { findAll: jest.fn(async () => []) },
      OeuvreIntervenant: { findAll: jest.fn(async () => [{ id_oeuvre: 4, role_principal: true, Intervenant: { id_intervenant: 9, nom: 'Yacine', prenom: 'Kateb' } }]) },
      Intervenant: {}, User: { findOne: jest.fn(async () => ({ id_user: 75, nom: 'Saisie', prenom: 'Personne', profil_public: true })) },
    });
    const res = await request(app(m)).get('/api/og/oeuvres/4');
    expect(res.status).toBe(200);
    expect(res.text).toContain('"author":{"@type":"Person","name":"Kateb Yacine"}');
    expect(res.text).not.toContain('Personne Saisie');
    expect(res.text).toContain('<html lang="ar" dir="rtl">');
    expect(res.text).toContain('"inLanguage":"ar"');
  });

  it('refuse un type inconnu', async () => {
    const res = await request(app(models())).get('/api/og/utilisateurs/1');
    expect(res.status).toBe(404);
  });

  it('artisanat : visible seulement si l\'œuvre liée est publiée', async () => {
    const m = models({
      Artisanat: { findByPk: jest.fn(async () => ({ Oeuvre: { statut: 'en_attente', titre: 'Tapis', Media: [] } })) },
    });
    const res = await request(app(m)).get('/api/og/artisanat/9');
    expect(res.status).toBe(404);
  });
});

describe('outils', () => {
  it('firstImage : l’image principale, sinon la première dans l’ordre (pas une ancienne image restée en tête)', () => {
    const ancienne = { type_media: 'image', url: 'https://example.com/ancienne.jpg', is_Principale: false, ordre: 0 };
    const nouvelle = { type_media: 'image', url: 'https://example.com/nouvelle.jpg', is_Principale: true, ordre: 3 };
    expect(firstImage([ancienne, nouvelle])).toBe('https://example.com/nouvelle.jpg');
    expect(firstImage([
      { type_media: 'video', url: 'https://example.com/v.mp4', ordre: 0 },
      { type_media: 'image', url: 'https://example.com/b.jpg', ordre: 2 },
      { type_media: 'image', url: 'https://example.com/a.jpg', ordre: 1 },
    ])).toBe('https://example.com/a.jpg');
    expect(firstImage([{ type_media: 'image', url: 'https://example.com/seule.jpg' }])).toBe('https://example.com/seule.jpg');
    expect(firstImage([])).toBeUndefined();
  });

  it('socialImage : image par défaut pour les SVG, PDF et absences', () => {
    expect(socialImage(null)).toBe('https://taladz.com/og-image.jpg');
    expect(socialImage('/images/placeholder.svg')).toBe('https://taladz.com/og-image.jpg');
    expect(socialImage('/uploads/a.jpg')).toBe('https://taladz.com/uploads/a.jpg');
  });

  it('summary : coupe sur un mot et retire les balises', () => {
    const long = `<b>${'mot '.repeat(80)}</b>`;
    const s = summary(long, 50);
    expect(s.length).toBeLessThanOrEqual(51);
    expect(s.endsWith('…')).toBe(true);
    expect(s).not.toContain('<');
  });

  it('buildOgHtml : page générique sans titre', () => {
    expect(buildOgHtml({ path: '/' })).toContain('<title>Tala DZ</title>');
  });
});

describe('GET /api/og/professionnels/:id', () => {
  it('aperçu du portfolio avec adresse lisible', async () => {
    const m = models({
      User: {
        findOne: jest.fn(async () => ({
          id_user: 17, prenom: { fr: 'Amina' }, nom: 'Bénali',
          biographie: { fr: 'Céramiste à Tlemcen.' }, photo_url: '/uploads/p.jpg',
        })),
      },
    });
    const res = await request(app(m)).get('/api/og/professionnels/17');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<meta property="og:title" content="Amina Bénali | Tala DZ">');
    expect(res.text).toContain('<link rel="canonical" href="https://taladz.com/professionnels/17-amina-benali">');
    expect(res.text).toContain('og:type" content="profile"');
    // Seuls les profils publics actifs sont cherchés
    expect(m.User.findOne.mock.calls[0][0].where).toMatchObject({ statut: 'actif' });
  });

  it('404 pour un compte qui n\'est pas un professionnel validé', async () => {
    const m = models({ User: { findOne: jest.fn(async () => null) } });
    const res = await request(app(m)).get('/api/og/professionnels/3');
    expect(res.status).toBe(404);
  });
});

/**
 * Anti-retour (2026-11-19, référencement) : ~1 000 fiches de lieux importées sans texte partageaient la même
 * description. Chaque fiche a maintenant la sienne (type, commune, wilaya, points de visite), et les pages des
 * wilayas listent leurs sites.
 */
describe('GET /api/og/patrimoine et /api/og/wilayas', () => {
  const timgad = {
    id_lieu: 24, statut: 'publie', nom: { fr: 'Timgad' }, typePatrimoine: 'site_archeologique', latitude: '35.48', longitude: '6.46',
    id_lieu_parent: null, DetailLieu: null, LieuMedia: [],
    Commune: { commune_name_ascii: 'Timgad', Daira: { Wilaya: { id_wilaya: 5, wilaya_name_ascii: 'Batna' } } },
  };
  const lieux = (lieu, points = [], parent = null) => ({
    Commune: {}, Daira: {}, Wilaya: {},
    Lieu: { findByPk: jest.fn(async () => lieu), findAll: jest.fn(async () => points), findOne: jest.fn(async () => parent) },
  });

  it('lieu sans texte : description propre, commune, wilaya, points de visite et données structurées', async () => {
    const res = await request(app(models(lieux(timgad, [{ id_lieu: 30, nom: { fr: 'Capitole' } }, { id_lieu: 31, nom: { fr: 'Arc de Trajan' } }]))))
      .get('/api/og/patrimoine/24');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<meta name="description" content="Site archéologique à Timgad, wilaya de Batna, en Algérie. 2 points de visite.');
    expect(res.text).toContain('<a href="https://taladz.com/patrimoine/31-arc-de-trajan">Arc de Trajan</a>');
    expect(res.text).toContain('https://taladz.com/wilayas/5-batna');
    expect(res.text).toContain('"addressLocality":"Timgad","addressRegion":"Batna"');
    expect(res.text).toContain('"containsPlace"');
  });

  it('point de visite : rattaché à son site, et une vraie description passe avant la phrase automatique', async () => {
    const capitole = { ...timgad, id_lieu: 30, nom: { fr: 'Capitole' }, id_lieu_parent: 24, DetailLieu: { description: { fr: 'Temple de la triade capitoline.' } } };
    const res = await request(app(models(lieux(capitole, [], { id_lieu: 24, nom: { fr: 'Timgad' } })))).get('/api/og/patrimoine/30');
    expect(res.text).toContain('<meta name="description" content="Temple de la triade capitoline.">');
    expect(res.text).toContain('Fait partie de');
    expect(res.text).toContain('"containedInPlace"');
  });

  it('page d’une wilaya : ses sites avec un lien chacun', async () => {
    const m = models({
      Wilaya: { findByPk: jest.fn(async () => ({ id_wilaya: 5, wilaya_name_ascii: 'Batna', codeW: 5 })) },
      sequelize: { QueryTypes: { SELECT: 'SELECT' }, query: jest.fn(async () => [{ id_lieu: 24, nom: '{"fr":"Timgad"}', typePatrimoine: 'site_archeologique', commune: 'Timgad' }]) },
    });
    const res = await request(app(m)).get('/api/og/wilayas/5');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Patrimoine de la wilaya de Batna (05) : 1 site');
    expect(res.text).toContain('<a href="https://taladz.com/patrimoine/24-timgad">Timgad</a> — Site archéologique, Timgad');
    expect(res.text).toContain('<link rel="canonical" href="https://taladz.com/wilayas/5-batna">');
  });
});
