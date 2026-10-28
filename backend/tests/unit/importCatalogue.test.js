/**
 * Catalogue d'une maison d'édition (Excel) : lecture et vérification ligne par ligne, sans base.
 */
const ExcelJS = require('exceljs');
const { lireCatalogue, modeleCatalogue } = require('../../services/organisations/importCatalogue');

const refs = {
  langues: new Map([['francais', 5], ['arabe', 3]]),
  categories: new Map([['roman', { id: 10, genre: 1 }], ['poesie', { id: 11, genre: 2 }]]),
  isbnExistants: new Map([['9789947012345', 69]])
};

async function classeur(lignes) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await modeleCatalogue({ langues: ['Français', 'Arabe'], categories: ['Roman', 'Poésie'] }));
  const ws = wb.getWorksheet('Livres');
  lignes.forEach((l, i) => { ws.getRow(3 + i).values = l; });
  return Buffer.from(await wb.xlsx.writeBuffer());
}
// N° · Titre · Titre ar · Titre tz · Résumé · Résumé ar · Prénom · Nom · Année · Langue · ISBN · Pages · Catégories · Prix · Couverture
const livre = (sur = {}) => Object.assign(['1', 'Le Puits', '', '', 'Nouvelles', '', 'Amina', 'Benali', 2021, 'Français', '978-9947-0-9999-1', 140, 'Roman', 900, ''], sur);

describe('Catalogue Excel', () => {
  test('modèle : feuilles Livres, Listes et Aide ; la ligne « Exemple » est ignorée', async () => {
    const lu = await lireCatalogue(await classeur([]), [], refs);
    expect(lu.lignes).toHaveLength(0);
  });

  test('livre complet : nouveau, couverture trouvée par son ISBN', async () => {
    const lu = await lireCatalogue(await classeur([livre()]), ['9789947099991.JPG', 'autre.png'], refs);
    expect(lu.lignes[0]).toMatchObject({ etat: 'nouveau', isbn: '9789947099991', idLangue: 5, couverture: '9789947099991.JPG', annee: 2021, pages: 140, prix: 900 });
    expect(lu.imagesSansLivre).toEqual(['autre.png']);
  });

  test('plusieurs catégories, langue sans accent ni majuscule', async () => {
    const lu = await lireCatalogue(await classeur([livre({ 9: 'arabe', 12: 'Roman ; poésie' })]), [], refs);
    expect(lu.lignes[0].idLangue).toBe(3);
    expect(lu.lignes[0].categories.map(c => c.id)).toEqual([10, 11]);
  });

  test('ISBN déjà sur le site : relié, pas recréé', async () => {
    const lu = await lireCatalogue(await classeur([livre({ 10: '9789947012345' })]), [], refs);
    expect(lu.lignes[0]).toMatchObject({ etat: 'existe', idOeuvreExistante: 69 });
  });

  test('erreurs expliquées ; même ISBN deux fois dans le fichier', async () => {
    const lu = await lireCatalogue(await classeur([
      livre({ 4: '', 7: '', 9: 'Klingon', 12: 'Inconnue', 8: 1700, 10: '123' }),
      livre(), livre({ 1: 'Autre titre' })
    ]), [], refs);
    expect(lu.lignes[0].erreurs).toEqual(expect.arrayContaining([
      'résumé manquant', "nom de l'auteur manquant", 'langue inconnue « Klingon »',
      'catégorie inconnue « Inconnue »', 'année invalide « 1700 »', 'ISBN invalide « 123 » (10 ou 13 chiffres)'
    ]));
    expect(lu.lignes[2].erreurs[0]).toMatch(/ISBN déjà utilisé ligne 4/);
    expect(lu.resume).toMatchObject({ total: 3, nouveaux: 1, erreurs: 2 });
  });

  test('couverture nommée dans la colonne mais non fournie : erreur', async () => {
    const lu = await lireCatalogue(await classeur([livre({ 14: 'puits.jpg' })]), ['autre.jpg'], refs);
    expect(lu.lignes[0].erreurs).toContain('image « puits.jpg » non fournie');
  });

  test('fichier qui n’est pas un Excel : message clair', async () => {
    await expect(lireCatalogue(Buffer.from('pas un excel'), [], refs)).rejects.toMatchObject({ statusCode: 400, code: 'EXCEL_ILLISIBLE' });
  });
});
