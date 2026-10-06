/**
 * secureDiskUpload : aucun fichier n'est envoyé vers Cloudinary avant validation
 * de sa signature binaire ; les fichiers temporaires sont toujours supprimés.
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));
const mockUploadLocalFile = jest.fn();
jest.mock('../../services/upload/cloudinaryUploader', () => ({
  uploadImageBuffer: jest.fn(),
  uploadDocumentBuffer: jest.fn(),
  uploadLocalFile: (...a) => mockUploadLocalFile(...a)
}));

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const express = require('express');
const { secureDiskUpload } = require('../../middlewares/uploadSecurity');
const { VIDEO_MIMES, MEDIA_MIMES } = require('../../constants/uploadMimes');

const TEMP_DIR = path.join(os.tmpdir(), 'eventculture-uploads');
const tempFiles = () => (fs.existsSync(TEMP_DIR) ? fs.readdirSync(TEMP_DIR) : []);

// En-tête MP4 valide (boîte ftyp) / exécutable Windows (MZ) déguisé
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypisom'), Buffer.alloc(32)]);
const EXE = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(64)]);
const DOCX = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(32)]);

const app = express();
app.post('/video', ...secureDiskUpload({ field: 'video', mimes: VIDEO_MIMES, maxFileSize: 1024 * 1024 }),
  (req, res) => res.json({ path: req.file.path, mimetype: req.file.mimetype }));
app.post('/medias', ...secureDiskUpload({ field: 'medias', mimes: MEDIA_MIMES, maxFileSize: 1024 * 1024, maxFiles: 3 }),
  (req, res) => res.json({ paths: req.files.map(f => f.path) }));

beforeEach(() => {
  mockUploadLocalFile.mockReset();
  mockUploadLocalFile.mockResolvedValue({ secure_url: 'https://res.cloudinary.com/demo/video/upload/v.mp4', public_id: 'v', bytes: 10 });
});

describe('secureDiskUpload', () => {
  it('vidéo valide : validée puis envoyée, URL Cloudinary transmise au contrôleur', async () => {
    const before = tempFiles().length;
    const res = await request(app).post('/video').attach('video', MP4, { filename: 'clip.mp4', contentType: 'video/mp4' }).expect(200);
    expect(res.body).toEqual({ path: 'https://res.cloudinary.com/demo/video/upload/v.mp4', mimetype: 'video/mp4' });
    expect(mockUploadLocalFile).toHaveBeenCalledTimes(1);
    expect(tempFiles().length).toBe(before); // fichier temporaire supprimé
  });

  it('exécutable déguisé en vidéo : refusé, jamais envoyé, fichier temporaire supprimé', async () => {
    const before = tempFiles().length;
    const res = await request(app).post('/video').attach('video', EXE, { filename: 'clip.mp4', contentType: 'video/mp4' }).expect(400);
    expect(res.body.code).toBe('UPLOAD_INVALID_TYPE');
    expect(mockUploadLocalFile).not.toHaveBeenCalled();
    expect(tempFiles().length).toBe(before);
  });

  it('type déclaré non autorisé : refusé dès la réception', async () => {
    await request(app).post('/video').attach('video', MP4, { filename: 'a.html', contentType: 'text/html' }).expect(400);
    expect(mockUploadLocalFile).not.toHaveBeenCalled();
  });

  it('lot : un seul fichier invalide fait refuser tout le lot', async () => {
    await request(app).post('/medias')
      .attach('medias', MP4, { filename: 'ok.mp4', contentType: 'video/mp4' })
      .attach('medias', EXE, { filename: 'x.pdf', contentType: 'application/pdf' })
      .expect(400);
    expect(mockUploadLocalFile).not.toHaveBeenCalled();
  });

  it('document Word reconnu grâce au nom d\'origine (fichier temporaire sans extension)', async () => {
    await request(app).post('/medias')
      .attach('medias', DOCX, { filename: 'cv.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      .expect(200);
    expect(mockUploadLocalFile).toHaveBeenCalledTimes(1);
  });

  it('échec Cloudinary : 502 et fichier temporaire supprimé', async () => {
    mockUploadLocalFile.mockRejectedValue(new Error('down'));
    const before = tempFiles().length;
    const res = await request(app).post('/video').attach('video', MP4, { filename: 'clip.mp4', contentType: 'video/mp4' }).expect(502);
    expect(res.body.code).toBe('UPLOAD_STORAGE_FAILED');
    expect(tempFiles().length).toBe(before);
  });
});
