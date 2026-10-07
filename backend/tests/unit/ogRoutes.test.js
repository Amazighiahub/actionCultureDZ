/**
 * Aperçus pour les réseaux sociaux : balises propres à chaque page, contenus publics uniquement
 */
const express = require('express');
const request = require('supertest');
const initOgRoutes = require('../../routes/ogRoutes');
const { buildOgHtml, socialImage, summary } = require('../../routes/ogRoutes')._internal;

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
    expect(res.text).toContain('c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/v1/taladz/medina.jpg');
    expect(res.text).toContain('<link rel="canonical" href="https://taladz.com/evenements/12">');
  });

  it('ne dévoile pas un contenu non public (404 + noindex)', async () => {
    const m = models({ Evenement: { findByPk: jest.fn(async () => ({ statut: 'brouillon', nom_evenement: 'Secret' })) } });
    const res = await request(app(m)).get('/api/og/evenements/3');
    expect(res.status).toBe(404);
    expect(res.text).not.toContain('Secret');
    expect(res.text).toContain('noindex');
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
