/** Lien d'un événement en ligne : réservé aux inscrits, à l'organisateur et à l'équipe */
const express = require('express');
const request = require('supertest');
const { retirerLienEnLigne, lienPour } = require('../../utils/lienEnLigne');

const LIEN = 'https://meet.example.com/abc';

describe('réponses JSON', () => {
  const app = express();
  app.set('json replacer', retirerLienEnLigne);
  const objet = { id_evenement: 3, url_virtuel: LIEN };
  app.get('/simple', (_req, res) => res.json({ data: objet }));
  app.get('/imbrique', (_req, res) => res.json({ data: [{ Programme: { Evenement: { url_virtuel: LIEN } } }] }));
  app.get('/presentiel', (_req, res) => res.json({ id_evenement: 1, url_virtuel: null }));
  app.get('/autorise', (_req, res) => res.json({ url_virtuel: LIEN, lien_en_ligne: LIEN }));

  test('le lien ne sort jamais, en_ligne le remplace', async () => {
    const r = await request(app).get('/simple');
    expect(JSON.stringify(r.body)).not.toContain('meet.example.com');
    expect(r.body.data).toEqual({ id_evenement: 3, en_ligne: true });
  });
  test('même imbriqué dans une autre réponse', async () => {
    expect(JSON.stringify((await request(app).get('/imbrique')).body)).not.toContain('meet.example.com');
  });
  test('événement sur place : en_ligne faux', async () => {
    expect((await request(app).get('/presentiel')).body).toEqual({ id_evenement: 1, en_ligne: false });
  });
  test('personne autorisée : le lien arrive dans lien_en_ligne', async () => {
    expect((await request(app).get('/autorise')).body).toEqual({ lien_en_ligne: LIEN, en_ligne: true });
  });
  test('l’objet d’origine (cache) n’est pas modifié', async () => {
    await request(app).get('/simple');
    expect(objet.url_virtuel).toBe(LIEN);
  });
});

describe('qui reçoit le lien', () => {
  const evenement = { url_virtuel: LIEN };
  test.each(['confirme', 'present'])('inscription « %s » : oui', (statut) => {
    expect(lienPour(evenement, { inscription: { statut_participation: statut } })).toBe(LIEN);
  });
  test.each(['inscrit', 'invitation', 'annule', 'absent'])('inscription « %s » : non', (statut) => {
    expect(lienPour(evenement, { inscription: { statut_participation: statut } })).toBeNull();
  });
  test('organisateur ou équipe : oui ; visiteur : non', () => {
    expect(lienPour(evenement, { peutGerer: true })).toBe(LIEN);
    expect(lienPour(evenement)).toBeNull();
  });
  test('événement sans lien : rien', () => {
    expect(lienPour({ url_virtuel: null }, { peutGerer: true })).toBeNull();
  });
});

describe('e-mail de validation', () => {
  const emailService = require('../../services/emailService');
  const professionnel = { prenom: 'Lydia', email: 'lydia@example.com' };
  const evenement = { id_evenement: 3, nom_evenement: 'Réunion', url_virtuel: LIEN, statut: 'planifie' };
  let envoi;
  beforeEach(() => { envoi = jest.spyOn(emailService, 'sendEmail').mockResolvedValue({ success: true }); });
  afterEach(() => envoi.mockRestore());
  const corps = async (ev, statut) => {
    await emailService.notifierValidationProfessionnel(professionnel, ev, statut);
    return envoi.mock.calls[0][2];
  };

  test('acceptation : le lien est dans l’e-mail', async () => {
    const html = await corps(evenement, 'confirme');
    expect(html).toContain(`href="${LIEN}"`);
    expect(html).toContain('Rejoindre la réunion');
  });
  test('refus : pas de lien', async () => {
    expect(await corps(evenement, 'refuse')).not.toContain('meet.example.com');
  });
  test('événement sur place : pas de bloc réunion', async () => {
    expect(await corps({ ...evenement, url_virtuel: null }, 'confirme')).not.toContain('Rejoindre la réunion');
  });
  test.each(['annule', 'termine'])('événement %s : pas de lien', async (statut) => {
    expect(await corps({ ...evenement, statut }, 'confirme')).not.toContain('meet.example.com');
  });
  test('lien piégé : jamais envoyé', async () => {
    expect(await corps({ ...evenement, url_virtuel: 'javascript:alert(1)' }, 'confirme')).not.toContain('javascript:');
  });
});
