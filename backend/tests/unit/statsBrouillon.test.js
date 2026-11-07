/** Chiffres de vues d'un brouillon : seulement l'auteur et l'administration */
const express = require('express');
const request = require('supertest');

jest.mock('../../controllers/vueController', () => ({ getViewStats: (req, res) => res.json({ success: true, data: { ok: true } }) }));

// Une seule application (le routeur du module est partagé) ; la personne connectée change par test
let personne;
const oeuvres = { 1: { id_oeuvre: 1, statut: 'publie', saisi_par: 5 }, 2: { id_oeuvre: 2, statut: 'brouillon', saisi_par: 5 } };
const artisanats = { 4: { id_artisanat: 4, id_oeuvre: 2 }, 6: { id_artisanat: 6, id_oeuvre: 1 } };
const models = {
  Oeuvre: { findByPk: async (id) => oeuvres[id] || null },
  Artisanat: { findByPk: async (id) => artisanats[id] || null },
  Vue: { count: async () => 3 },
};
const serveur = express();
serveur.use((req, res, next) => { req.t = (k) => k; next(); });
serveur.use('/', require('../../routes/trackingRoutes')(models, {
  authenticate: (req, res, next) => next(),
  optionalAuth: (req, res, next) => { req.user = personne; next(); },
}));
const app = (user) => { personne = user; return serveur; };

describe('statistiques de vues', () => {
  it('œuvre publiée : visible de tous', async () => {
    expect((await request(app(undefined)).get('/stats/oeuvre/1')).status).toBe(200);
    expect((await request(app(undefined)).get('/oeuvre/1/count')).body.data.views).toBe(3);
  });
  it('brouillon : 404 pour un visiteur ou un autre membre', async () => {
    expect((await request(app(undefined)).get('/stats/oeuvre/2')).status).toBe(404);
    expect((await request(app({ id_user: 8 })).get('/oeuvre/2/count')).status).toBe(404);
  });
  it('brouillon : visible de son auteur et de l’administration', async () => {
    expect((await request(app({ id_user: 5 })).get('/stats/oeuvre/2')).status).toBe(200);
    expect((await request(app({ id_user: 1, isAdmin: true })).get('/oeuvre/2/count')).status).toBe(200);
  });
  it('artisanat : état et auteur pris sur son œuvre', async () => {
    expect((await request(app(undefined)).get('/stats/artisanat/6')).status).toBe(200);
    expect((await request(app(undefined)).get('/stats/artisanat/4')).status).toBe(404);
    expect((await request(app({ id_user: 5 })).get('/artisanat/4/count')).status).toBe(200);
  });
});
