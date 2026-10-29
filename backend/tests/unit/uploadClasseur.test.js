/**
 * Classeur Excel envoyé : la taille une fois décompressé est limitée (« bombe zip »).
 */
const ExcelJS = require('exceljs');
const { tailleDecompressee, uploadClasseurXlsx } = require('../../middlewares/uploadClasseur');

const verifierDecompression = uploadClasseurXlsx[uploadClasseurXlsx.length - 1];

async function classeur() {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet('Livres').addRow(['Titre', 'Résumé']);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Annonce une taille décompressée énorme pour le premier fichier de l'archive */
function gonfler(buffer) {
  const copie = Buffer.from(buffer);
  const pos = copie.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  copie.writeUInt32LE(0x7fffffff, pos + 24);
  return copie;
}

const appeler = (buffer) => {
  const res = { status: jest.fn(function () { return this; }), json: jest.fn() };
  const next = jest.fn();
  verifierDecompression({ file: { buffer } }, res, next);
  return { res, next };
};

describe('Classeur Excel : taille décompressée', () => {
  test('un vrai classeur passe', async () => {
    const buffer = await classeur();
    expect(tailleDecompressee(buffer)).toBeGreaterThan(0);
    expect(appeler(buffer).next).toHaveBeenCalled();
  });

  test('une archive qui se décompresse en plus de 60 Mo est refusée (400)', async () => {
    const { res, next } = appeler(gonfler(await classeur()));
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('un fichier qui n’est pas une archive zip est refusé', () => {
    expect(tailleDecompressee(Buffer.from('pas un classeur'.repeat(10)))).toBeNull();
    expect(appeler(Buffer.from('pas un classeur'.repeat(10))).next).not.toHaveBeenCalled();
  });
});
