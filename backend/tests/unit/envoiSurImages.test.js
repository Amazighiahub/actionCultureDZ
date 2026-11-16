/**
 * Envoi sûr des fichiers (2026-11-16, lot sécurité) : contrôle des vrais octets puis envoi à Cloudinary,
 * pour UN fichier, une LISTE ou PLUSIEURS CHAMPS (affiche + image de partage d'un événement). Avant,
 * seul req.file passait et l'affiche utilisait un envoi direct sans contrôle.
 */
jest.mock('../../services/upload/cloudinaryUploader', () => ({
  uploadImageBuffer: jest.fn(async (buffer, { originalname }) => ({
    secure_url: `https://res.cloudinary.com/essai/image/upload/v1/eventculture/images/${originalname}`,
    public_id: `eventculture/images/${originalname}`, resource_type: 'image', format: 'png', bytes: buffer.length
  })),
  uploadDocumentBuffer: jest.fn()
}));
jest.mock('../../services/cloudinaryService', () => ({ supprimerParUrl: jest.fn().mockResolvedValue(true) }));
const fs = require('fs');
const path = require('path');
const { uploadImageBuffer } = require('../../services/upload/cloudinaryUploader');
const { supprimerParUrl } = require('../../services/cloudinaryService');
const { validateMagicBytesBuffer, pushBufferToCloudinary } = require('../../middlewares/uploadSecurity');

// Une vraie image PNG d'un pixel, et un faux fichier « .png » (du texte)
const PNG = Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D4944415478DA63F8CFC0F01F0005000201E2A1D2A20000000049454E44AE426082', 'hex');
const FAUX = Buffer.from('<script>alert(1)</script>');
const fichier = (nom, buffer, champ = 'affiche') => ({ fieldname: champ, originalname: nom, mimetype: 'image/png', size: buffer.length, buffer });
const res = () => { const r = {}; r.status = jest.fn(() => r); r.json = jest.fn(() => r); return r; };
const passer = (mw, req) => new Promise((resolve) => { const r = res(); Promise.resolve(mw(req, r, () => resolve({ suite: true, r }))).then(() => resolve({ suite: false, r })); });

describe('envoi sûr des images', () => {
  beforeEach(() => jest.clearAllMocks());

  it('plusieurs champs (.fields) : les deux images sont contrôlées puis envoyées', async () => {
    const req = { files: { affiche: [fichier('a.png', PNG)], image_partage: [fichier('b.png', PNG, 'image_partage')] } };
    expect((await passer(validateMagicBytesBuffer(['image/png'], { maxFileSize: 1e6 }), req)).suite).toBe(true);
    expect((await passer(pushBufferToCloudinary({ type: 'image' }), req)).suite).toBe(true);
    expect(uploadImageBuffer).toHaveBeenCalledTimes(2);
    expect(req.files.affiche[0].path).toMatch(/a\.png$/);
    expect(req.files.image_partage[0].path).toMatch(/b\.png$/);
    expect(req.files.affiche[0].buffer).toBeUndefined();
  });

  it('un faux fichier « affiche » (texte nommé .png) est refusé avant Cloudinary', async () => {
    const req = { files: { affiche: [fichier('piege.png', FAUX)] } };
    const { suite, r } = await passer(validateMagicBytesBuffer(['image/png'], { maxFileSize: 1e6 }), req);
    expect(suite).toBe(false);
    expect(r.status).toHaveBeenCalledWith(expect.any(Number));
    expect(uploadImageBuffer).not.toHaveBeenCalled();
  });

  it('échec partiel : les fichiers déjà envoyés sont effacés, réponse 502', async () => {
    uploadImageBuffer.mockResolvedValueOnce({ secure_url: 'https://res.cloudinary.com/essai/image/upload/v1/eventculture/images/a.png', public_id: 'x', bytes: 1 })
      .mockRejectedValueOnce(new Error('quota'));
    const req = { files: [fichier('a.png', PNG), fichier('b.png', PNG)] };
    const { suite, r } = await passer(pushBufferToCloudinary({ type: 'image' }), req);
    expect(suite).toBe(false);
    expect(r.status).toHaveBeenCalledWith(502);
    expect(supprimerParUrl).toHaveBeenCalledWith('https://res.cloudinary.com/essai/image/upload/v1/eventculture/images/a.png');
  });

  it('un seul fichier (.single) : inchangé', async () => {
    const req = { file: fichier('c.png', PNG) };
    expect((await passer(pushBufferToCloudinary({ type: 'image' }), req)).suite).toBe(true);
    expect(req.file.path).toMatch(/c\.png$/);
  });

  it('anti-retour : aucune route n’envoie une image sans contrôle des octets', () => {
    const dossier = path.join(__dirname, '../../routes');
    const directs = fs.readdirSync(dossier).filter((f) => /uploadService\.uploadImage\(|CloudinaryStorage/.test(fs.readFileSync(path.join(dossier, f), 'utf8')));
    expect(directs).toEqual([]);
  });

  it('requête refusée après l’envoi (403) : l’image envoyée est effacée à la fin de la réponse', async () => {
    const { EventEmitter } = require('events');
    const req = { files: { affiche: [fichier('d.png', PNG)] } };
    const r = Object.assign(new EventEmitter(), { status: jest.fn(), json: jest.fn(), statusCode: 200 });
    await pushBufferToCloudinary({ type: 'image' })(req, r, () => undefined);
    r.statusCode = 403;
    r.emit('finish');
    await new Promise((ok) => setImmediate(ok));
    expect(supprimerParUrl).toHaveBeenCalledWith(expect.stringMatching(/d\.png$/));
  });

  it('type refusé (photo HEIC) : 400 « type non autorisé », pas une erreur serveur', () => {
    const uploadService = require('../../services/uploadService');
    const multer = uploadService.uploadImageSafe(1e6);
    const filtre = multer.fileFilter || multer._fileFilter;
    const appels = [];
    if (typeof filtre === 'function') {
      filtre({}, { mimetype: 'image/heic', originalname: 'photo.heic' }, (err) => appels.push(err));
      expect(appels[0]).toMatchObject({ code: 'UPLOAD_INVALID_TYPE' });
    } else {
      // multer ne montre pas son filtre : lecture du code source
      const src = require('fs').readFileSync(require.resolve('../../services/uploadService'), 'utf8');
      expect(src).toMatch(/code: 'UPLOAD_INVALID_TYPE'/);
    }
  });
});
