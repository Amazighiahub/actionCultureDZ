/**
 * Sitemap dynamique : seules les pages publiques sont listées, avec le domaine de production
 */
const express = require('express');
const request = require('supertest');
const { Op } = require('sequelize');
const initSitemapRoutes = require('../../routes/sitemapRoutes');

function buildModels() {
  const calls = {};
  const model = (name, rows) => ({
    findAll: jest.fn(async (opts) => { (calls[name] = calls[name] || []).push(opts); return rows; }),
  });
  const models = {
    Oeuvre: model('Oeuvre', [{ id_oeuvre: 7, date_modification: '2026-10-01' }]),
    Evenement: model('Evenement', [{ id_evenement: 3, date_modification: '2026-10-02' }]),
    Lieu: model('Lieu', [{ id_lieu: 5, updatedAt: '2026-09-01' }]),
    Artisanat: model('Artisanat', [{ id_artisanat: 9, updated_at: '2026-09-15' }]),
  };
  return { models, calls };
}

describe('GET /sitemap.xml', () => {
  const OLD = process.env.FRONTEND_URL;
  afterEach(() => { process.env.FRONTEND_URL = OLD; });

  it('liste les pages publiques avec les bons filtres', async () => {
    delete process.env.FRONTEND_URL;
    const { models, calls } = buildModels();
    const app = express();
    app.use('/sitemap.xml', initSitemapRoutes(models));

    const res = await request(app).get('/sitemap.xml');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/xml/);
    // Domaine de production par défaut (plus localhost)
    expect(res.text).toContain('<loc>https://taladz.com/evenements/3</loc>');
    expect(res.text).toContain('<loc>https://taladz.com/patrimoine/5</loc>');
    expect(res.text).toContain('<loc>https://taladz.com/artisanat/9</loc>');
    expect(res.text).not.toContain('/auth');

    // Événements : statuts publics réels (plus le statut inexistant "a_venir")
    expect(calls.Evenement[0].where.statut).toEqual(['publie', 'planifie', 'en_cours', 'termine']);
    // Lieux : publiés uniquement
    expect(calls.Lieu[0].where).toEqual({ statut: 'publie' });
    // Artisanat : seulement si l'œuvre liée est publiée
    expect(calls.Artisanat[0].include[0]).toMatchObject({ where: { statut: 'publie' }, required: true });
    // Œuvres : sans les articles (types 4 et 5), qui ont leur propre adresse
    const oeuvresWhere = calls.Oeuvre.find((o) => o.where.id_type_oeuvre && o.where.id_type_oeuvre[Op.notIn]);
    expect(oeuvresWhere.where.id_type_oeuvre[Op.notIn]).toEqual([4, 5]);
  });
});
