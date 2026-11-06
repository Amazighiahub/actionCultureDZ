/**
 * Extrait d'un livre en PDF et en audio : le média devient l'extrait, l'ancien est retiré,
 * seul l'auteur (ou l'administration) peut le faire, et seulement pour un livre.
 */
const OeuvreService = require('../../services/oeuvre/oeuvreService');
const { MAX_EXTRAIT_PDF_SIZE, MAX_EXTRAIT_AUDIO_SIZE } = require('../../constants/uploadMimes');

function service({ type = 1, proprio = 7, livre } = {}) {
  const s = Object.create(OeuvreService.prototype);
  const fiche = livre || { id_media_extrait_pdf: null, id_media_extrait_audio: null };
  fiche.update = jest.fn(async (champs) => Object.assign(fiche, champs));
  let prochain = 100;
  s.repository = { findById: jest.fn(async () => ({ id_oeuvre: 5, id_type_oeuvre: type, saisi_par: proprio })) };
  s.models = { Livre: { findOne: jest.fn(async () => fiche), create: jest.fn() } };
  s.cache = { invalidate: jest.fn() };
  s.enregistrerMedias = jest.fn(async (id, f) => [{ id_media: prochain++, url: f.path, type_media: f.mimetype.startsWith('audio') ? 'audio' : 'document' }]);
  s.deleteMedia = jest.fn(async () => true);
  return { s, fiche };
}
const pdf = { path: 'https://example.com/extrait.pdf', mimetype: 'application/pdf' };
const mp3 = { path: 'https://example.com/lecture.mp3', mimetype: 'audio/mpeg' };

describe('extrait d’un livre en PDF et en audio', () => {
  it('le fichier devient l’extrait du livre', async () => {
    const { s, fiche } = service();
    const r = await s.definirExtraitFichier(5, 'audio', mp3, 7);
    expect(r).toMatchObject({ id_media: 100, type_media: 'audio' });
    expect(fiche.id_media_extrait_audio).toBe(100);
    expect(fiche.id_media_extrait_pdf).toBeNull();
    expect(s.deleteMedia).not.toHaveBeenCalled();
  });

  it('un nouveau PDF remplace l’ancien, qui est retiré', async () => {
    const { s, fiche } = service({ livre: { id_media_extrait_pdf: 40, id_media_extrait_audio: 41 } });
    await s.definirExtraitFichier(5, 'pdf', pdf, 7);
    expect(fiche.id_media_extrait_pdf).toBe(100);
    expect(fiche.id_media_extrait_audio).toBe(41);
    expect(s.deleteMedia).toHaveBeenCalledWith(5, 40, 7, false);
  });

  it('autre compte, autre type d’œuvre ou fichier absent : refusé', async () => {
    await expect(service().s.definirExtraitFichier(5, 'pdf', pdf, 8)).rejects.toThrow();
    await expect(service({ type: 2 }).s.definirExtraitFichier(5, 'pdf', pdf, 7)).rejects.toThrow();
    await expect(service().s.definirExtraitFichier(5, 'pdf', undefined, 7)).rejects.toThrow();
    // L'administration peut corriger la fiche d'un autre
    await expect(service().s.definirExtraitFichier(5, 'pdf', pdf, 8, true)).resolves.toBeTruthy();
  });

  it('retirer : la fiche est vidée et le média supprimé', async () => {
    const { s, fiche } = service({ livre: { id_media_extrait_pdf: 40, id_media_extrait_audio: null } });
    expect(await s.retirerExtraitFichier(5, 'pdf', 7)).toBe(true);
    expect(fiche.id_media_extrait_pdf).toBeNull();
    expect(s.deleteMedia).toHaveBeenCalledWith(5, 40, 7, false);
    expect(await s.retirerExtraitFichier(5, 'audio', 7)).toBe(false);
  });

  it('tailles « pas trop grandes »', () => {
    expect(MAX_EXTRAIT_PDF_SIZE).toBe(5 * 1024 * 1024);
    expect(MAX_EXTRAIT_AUDIO_SIZE).toBe(10 * 1024 * 1024);
  });
});

describe('PDF entier envoyé : le site garde les 20 premières pages', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { PDFDocument } = require('pdf-lib');
  const { garderPremieresPages } = require('../../utils/extraitPdf');
  const { MAX_EXTRAIT_PDF_PAGES } = require('../../constants/uploadMimes');

  const livre = async (pages) => {
    const doc = await PDFDocument.create();
    doc.setTitle('Livre d’essai');
    for (let i = 0; i < pages; i++) doc.addPage([300, 400]).drawText(`Page ${i + 1}`, { x: 20, y: 360 });
    const chemin = path.join(os.tmpdir(), `extrait-essai-${pages}-${Date.now()}.pdf`);
    fs.writeFileSync(chemin, await doc.save());
    return chemin;
  };

  it('livre de 25 pages : 20 gardées, le fichier est réécrit', async () => {
    const chemin = await livre(25);
    const r = await garderPremieresPages(chemin, MAX_EXTRAIT_PDF_PAGES);
    expect(r).toMatchObject({ pagesTotal: 25, pagesGardees: 20 });
    const relu = await PDFDocument.load(fs.readFileSync(chemin));
    expect(relu.getPageCount()).toBe(20);
    expect(relu.getTitle()).toBe('Livre d’essai');
    fs.unlinkSync(chemin);
  });

  it('livre court : toutes ses pages restent', async () => {
    const chemin = await livre(5);
    expect((await garderPremieresPages(chemin, 20)).pagesGardees).toBe(5);
    fs.unlinkSync(chemin);
  });

  it('fichier qui n’est pas un vrai PDF : refusé', async () => {
    const chemin = path.join(os.tmpdir(), `extrait-faux-${Date.now()}.pdf`);
    fs.writeFileSync(chemin, '%PDF-1.7 rien');
    await expect(garderPremieresPages(chemin, 20)).rejects.toThrow();
    fs.unlinkSync(chemin);
  });
});
