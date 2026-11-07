/**
 * Envois de fichiers : le droit est vérifié avant de recevoir le fichier, et un fichier déjà parti
 * sur Cloudinary est effacé si la requête est finalement refusée. Cloudinary est simulé.
 */
jest.mock('../../services/upload/cloudinaryUploader', () => ({
  uploadLocalFile: jest.fn(async () => ({ secure_url: 'https://res.cloudinary.com/exemple/image/upload/x.jpg', public_id: 'essai/x', resource_type: 'image', bytes: 10 })),
}));
jest.mock('../../services/cloudinaryService', () => ({ deleteAsset: jest.fn(async () => ({ result: 'ok' })) }));
const mockUrlsEnregistrees = new Set();
jest.mock('../../models', () => ({
  Media: { count: jest.fn(async ({ where }) => (mockUrlsEnregistrees.has(where.url) ? 1 : 0)) },
  LieuMedia: { count: jest.fn(async () => 0) },
}));

const express = require('express');
const request = require('supertest');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { secureDiskUpload, avantEnvoi } = require('../../middlewares/uploadSecurity');
const { uploadLocalFile } = require('../../services/upload/cloudinaryUploader');
const { deleteAsset } = require('../../services/cloudinaryService');

// Vraie image PNG minuscule (la signature est contrôlée)
const PNG = Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2DB40000000049454E44AE426082', 'hex');
const dossierTemp = path.join(os.tmpdir(), 'eventculture-uploads');
const fichiersTemp = () => (fs.existsSync(dossierTemp) ? fs.readdirSync(dossierTemp).length : 0);

function appli({ autorise, reponse = 201 }) {
  const app = express();
  app.post('/envoi',
    avantEnvoi(async () => { if (!autorise) { const e = new Error('Vous ne pouvez modifier que vos propres œuvres'); e.statusCode = 403; throw e; } }),
    ...secureDiskUpload({ field: 'medias', mimes: ['image/png'], maxFileSize: 1024 * 1024, maxFiles: 2 }),
    (req, res) => res.status(reponse).json({ success: reponse < 400 }));
  return app;
}

describe('envois de fichiers sécurisés', () => {
  beforeEach(() => { jest.clearAllMocks(); mockUrlsEnregistrees.clear(); });

  it('pas le droit : refusé avant la réception, rien n’est envoyé ni gardé', async () => {
    const avant = fichiersTemp();
    const r = await request(appli({ autorise: false })).post('/envoi').attach('medias', PNG, 'a.png');
    expect(r.status).toBe(403);
    expect(uploadLocalFile).not.toHaveBeenCalled();
    expect(fichiersTemp()).toBe(avant);
  });

  it('accepté : envoyé, rien n’est effacé', async () => {
    const r = await request(appli({ autorise: true })).post('/envoi').attach('medias', PNG, 'a.png');
    expect(r.status).toBe(201);
    expect(uploadLocalFile).toHaveBeenCalledTimes(1);
    expect(deleteAsset).not.toHaveBeenCalled();
  });

  it('refus après l’envoi (contrôle du service) : le fichier est effacé de Cloudinary', async () => {
    const r = await request(appli({ autorise: true, reponse: 403 })).post('/envoi').attach('medias', PNG, 'a.png');
    expect(r.status).toBe(403);
    await new Promise((ok) => setTimeout(ok, 20));
    expect(deleteAsset).toHaveBeenCalledWith('essai/x', 'image');
  });

  it('refus après un enregistrement partiel : un fichier déjà sur une fiche n’est pas effacé', async () => {
    mockUrlsEnregistrees.add('https://res.cloudinary.com/exemple/image/upload/x.jpg');
    const r = await request(appli({ autorise: true, reponse: 500 })).post('/envoi').attach('medias', PNG, 'a.png');
    expect(r.status).toBe(500);
    await new Promise((ok) => setTimeout(ok, 20));
    expect(deleteAsset).not.toHaveBeenCalled();
  });

  it('onglet fermé pendant l’enregistrement de la fiche : le fichier remis n’est pas effacé', async () => {
    const app = express();
    app.post('/envoi', ...secureDiskUpload({ field: 'medias', mimes: ['image/png'], maxFileSize: 1024 * 1024, maxFiles: 1 }),
      (req) => { req.socket.destroy(); });
    await request(app).post('/envoi').attach('medias', PNG, 'a.png').catch(() => {});
    await new Promise((ok) => setTimeout(ok, 50));
    expect(uploadLocalFile).toHaveBeenCalledTimes(1);
    expect(deleteAsset).not.toHaveBeenCalled();
  });

  it('taille annoncée trop grosse : refusée avant toute réception', async () => {
    const app = express();
    app.post('/envoi', ...secureDiskUpload({ field: 'medias', mimes: ['image/png'], maxFileSize: 1024, maxFiles: 1 }), (req, res) => res.status(201).json({}));
    const r = await request(app).post('/envoi').set('Content-Length', String(50 * 1024 * 1024)).send('x');
    expect(r.status).toBe(413);
    expect(uploadLocalFile).not.toHaveBeenCalled();
  });

  it('volume total trop gros : refusé, fichiers temporaires effacés', async () => {
    const app = express();
    app.post('/envoi', ...secureDiskUpload({ field: 'medias', mimes: ['image/png'], maxFileSize: 1024 * 1024, maxFiles: 3, maxTotalSize: PNG.length + 10 }),
      (req, res) => res.status(201).json({}));
    const avant = fichiersTemp();
    const r = await request(app).post('/envoi').attach('medias', PNG, 'a.png').attach('medias', PNG, 'b.png');
    expect(r.status).toBe(413);
    expect(uploadLocalFile).not.toHaveBeenCalled();
    expect(fichiersTemp()).toBe(avant);
  });
});
