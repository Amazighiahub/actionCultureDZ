/**
 * Import d'un relevé Excel de points de visite (modèle Taladz) :
 * lecture du classeur, choix du lieu (choisi ou feuille « Site »), plan relançable.
 */
const ExcelJS = require('exceljs');
const { lireReleve, ImportReleve, resumerPlan } = require('../../services/patrimoine/importReleve');

const ENTETES = ['ID', 'Nom du point', 'Nom en arabe', 'Nom en tamazight', 'Type', 'Description',
  'Latitude', 'Longitude', 'Repère (point intérieur)', 'Source', 'Remarque'];

async function classeur({ points = [], site = null } = {}) {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet("Mode d'emploi").getCell('A1').value = 'Mode d’emploi';
  if (site) {
    const ws = wb.addWorksheet('Site');
    ws.getCell('A1').value = 'Lieu principal';
    Object.entries(site).forEach(([libelle, valeur], i) => {
      ws.getCell(`A${i + 3}`).value = libelle;
      ws.getCell(`B${i + 3}`).value = valeur;
    });
  }
  const ws = wb.addWorksheet('Points');
  ws.addRow(ENTETES);
  ws.addRow(['Exemple', 'Arc', '', '', 'Monument', '', 35.1, 6.1]);
  for (const p of points) ws.addRow(p);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const SITE_GHOUFI = {
  'Nom du lieu (français)': 'Balcons de Ghoufi', 'Nom en arabe': 'شرفات غوفي', 'Nom en tamazight': '',
  'Type du lieu': 'Ville / village', 'Wilaya': '05 - Batna / باتنة', 'Daïra': 'Tkout / تكوت',
  'Commune': 'Ghassira / غسيرة', 'Latitude du lieu': 35.0573, 'Longitude du lieu': 6.1720
};

describe('lireReleve', () => {
  it('lit les points par le titre des colonnes et ignore la ligne Exemple', async () => {
    const buf = await classeur({ points: [
      [1, 'Arc de Trajan', 'قوس تراجان', 'Tabburt n Trajan', 'Monument', 'Arc à trois baies', 35.48501, 6.46902, '', 'Relevé 2026'],
      [2, '', '', '', '', '', '35,48612', '6,46811']
    ] });
    const { lignes, ignorees, site } = await lireReleve(buf);

    expect(site).toBeNull();
    expect(ignorees).toEqual([]);
    expect(lignes).toHaveLength(2);
    expect(lignes[0]).toMatchObject({
      id: 1, latitude: 35.48501, longitude: 6.46902, typeFinal: 'monument', statut: 'publie',
      nomObjet: { fr: 'Arc de Trajan', ar: 'قوس تراجان', 'tz-ltn': 'Tabburt n Trajan' },
      description: 'Arc à trois baies', source: 'Relevé 2026'
    });
    // Virgule décimale acceptée ; point sans nom → brouillon à identifier
    expect(lignes[1]).toMatchObject({ latitude: 35.48612, longitude: 6.46811, statut: 'brouillon', nomFinal: 'Point 2 – à identifier', typeFinal: 'site_archeologique' });
  });

  it('point intérieur sans GPS, noms en double, lignes sans position signalées', async () => {
    const { lignes, ignorees } = await lireReleve(await classeur({ points: [
      [3, 'Salle des mosaïques', '', '', 'Musée', '', '', '', 'Rez-de-chaussée, salle 1'],
      [4, 'Forum', '', '', '', '', 35.1, 6.1],
      [5, 'Forum', '', '', '', '', 35.2, 6.2],
      [6, 'Thermes', '', '', '', '', 'nord', ''],
      [7, '', '', '', '', '', '', '']
    ] }));

    expect(lignes.map(l => l.nomFinal)).toEqual(['Salle des mosaïques', 'Forum (point 4)', 'Forum (point 5)']);
    expect(lignes[0]).toMatchObject({ interieur: true, latitude: null, repere: 'Rez-de-chaussée, salle 1', typeFinal: 'musee' });
    expect(ignorees).toEqual([{ id: 6, nom: 'Thermes', raison: 'position GPS manquante ou illisible' }]);
  });

  it('lit la feuille Site', async () => {
    const { site } = await lireReleve(await classeur({ site: SITE_GHOUFI }));
    expect(site).toMatchObject({ nom: 'Balcons de Ghoufi', nomAr: 'شرفات غوفي', wilaya: '05 - Batna / باتنة', commune: 'Ghassira / غسيرة', latitude: 35.0573, longitude: 6.172, typeTaladz: 'ville_village' });
  });

  it('refuse un classeur sans colonne Latitude', async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Points').addRow(['ID', 'Nom du point']);
    await expect(lireReleve(Buffer.from(await wb.xlsx.writeBuffer()))).rejects.toThrow('Colonne « latitude » introuvable');
  });
});

describe('ImportReleve', () => {
  const point = (champs) => ({ statut: 'publie', update: jest.fn(), ...champs });
  const makeModels = ({ lieu = { id_lieu: 10, nom: { fr: 'Timgad' }, id_createur: 3 }, existants = [], details = [], communes = [], sites = [] } = {}) => ({
    Lieu: {
      findByPk: jest.fn().mockResolvedValue(lieu),
      findAll: jest.fn(async ({ where }) => (where.id_lieu_parent === null ? sites : existants))
    },
    DetailLieu: { findAll: jest.fn().mockResolvedValue(details), create: jest.fn() },
    Commune: { findAll: jest.fn().mockResolvedValue(communes) },
    Daira: {}, Wilaya: {},
    sequelize: { transaction: jest.fn(async (cb) => cb({})) }
  });

  it('plan relançable : crée les nouveaux points, met à jour les noms, laisse les autres', async () => {
    const arc = point({ id_lieu: 21, nom: { fr: 'Arc de Trajan' }, latitude: '35.48501000', longitude: '6.46902000', typePatrimoine: 'monument' });
    const brouillon = point({ id_lieu: 22, nom: { fr: 'Point 2 – à identifier' }, latitude: 35.48612, longitude: 6.46811, statut: 'brouillon', typePatrimoine: 'site_archeologique' });
    const models = makeModels({ existants: [arc, brouillon] });
    const releve = await lireReleve(await classeur({ points: [
      [1, 'Arc de Trajan', '', '', 'Monument', '', 35.48501, 6.46902],
      [2, 'Marché de Sertius', '', '', '', '', 35.48612, 6.46811],
      [3, 'Capitole', '', '', '', '', 35.4870, 6.4650]
    ] }));
    const importeur = new ImportReleve(models, { create: jest.fn().mockResolvedValue({ id_lieu: 30 }) });
    const plan = await importeur.planifier(releve, { parentId: 10 });
    const resume = resumerPlan(plan);

    expect(resume.lieu).toEqual({ id: 10, nom: 'Timgad', existe: true });
    expect(resume.bilan).toEqual({ creer: 1, maj: 1, inchanges: 1, ignorees: 0 });
    expect(resume.points.find(p => p.id === 2)).toMatchObject({ action: 'maj', champs: ['nom', 'statut'] });

    const bilan = await importeur.executer(plan);
    expect(bilan).toMatchObject({ crees: 1, maj: 1, inchanges: 1, idLieu: 10, lieuCree: false, erreurs: [] });
    expect(brouillon.update).toHaveBeenCalledWith({ nom: { fr: 'Marché de Sertius' }, statut: 'publie' }, expect.anything());
    expect(importeur.patrimoineService.create).toHaveBeenCalledWith(expect.objectContaining({
      nom: { fr: 'Capitole' }, id_lieu_parent: 10, ordre_visite: 3, id_createur: 3, statut: 'publie'
    }), { isModerator: true });
  });

  it('sans lieu choisi : crée le lieu de la feuille Site dans sa commune', async () => {
    const models = makeModels({ communes: [{ id_commune: 77, commune_name_ascii: 'Ghassira' }] });
    const create = jest.fn()
      .mockResolvedValueOnce({ id_lieu: 50 })
      .mockResolvedValue({ id_lieu: 51 });
    models.Lieu.findByPk.mockResolvedValue({ id_lieu: 50, id_createur: 9 });
    const releve = await lireReleve(await classeur({ site: SITE_GHOUFI, points: [[1, 'Maison troglodyte', '', '', '', '', 35.0575, 6.1722]] }));
    const importeur = new ImportReleve(models, { create });
    const plan = await importeur.planifier(releve);

    expect(models.Commune.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { commune_name_ascii: 'Ghassira' } }));
    expect(resumerPlan(plan).lieu).toEqual({ id: null, nom: 'Balcons de Ghoufi', existe: false, commune: 'Ghassira' });

    const bilan = await importeur.executer(plan, { createurId: 9 });
    expect(create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      nom: { fr: 'Balcons de Ghoufi', ar: 'شرفات غوفي' }, communeId: 77, latitude: 35.0573, longitude: 6.172, typePatrimoine: 'ville_village', id_createur: 9
    }), { isModerator: true });
    expect(create).toHaveBeenNthCalledWith(2, expect.objectContaining({ id_lieu_parent: 50 }), { isModerator: true });
    expect(bilan).toMatchObject({ lieuCree: true, idLieu: 50, crees: 1 });
  });

  it('daïra erronée : la commune est retrouvée dans sa wilaya si elle y est unique', async () => {
    const models = makeModels();
    models.Commune.findAll.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id_commune: 77, commune_name_ascii: 'Ghassira' }]);
    const commune = await new ImportReleve(models, {}).trouverCommune({ ...SITE_GHOUFI, wilaya: '05 - Batna / باتنة', daira: 'Arris / أريس', commune: 'Ghassira / غسيرة' });
    expect(commune.id_commune).toBe(77);
    expect(models.Commune.findAll.mock.calls[0][0].include[0].where).toEqual({ daira_name_ascii: 'Arris' });
    expect(models.Commune.findAll.mock.calls[1][0].include[0].where).toBeUndefined();
  });

  it('feuille Site : retrouve le lieu existant au lieu de le recréer', async () => {
    const existant = { id_lieu: 8, nom: { fr: 'Balcons de Ghoufi' } };
    const models = makeModels({ communes: [{ id_commune: 77 }], sites: [existant] });
    const plan = await new ImportReleve(models, {}).planifier(await lireReleve(await classeur({ site: SITE_GHOUFI })));
    expect(plan.lieu).toBe(existant);
    expect(plan.siteACreer).toBeNull();
  });

  it('erreurs : commune introuvable, ni lieu choisi ni feuille Site', async () => {
    const models = makeModels();
    const importeur = new ImportReleve(models, {});
    const avecSite = await importeur.planifier(await lireReleve(await classeur({ site: SITE_GHOUFI })));
    expect(avecSite.erreurs[0]).toMatch(/Commune de la feuille « Site » introuvable/);
    const sansSite = await importeur.planifier(await lireReleve(await classeur()));
    expect(sansSite.erreurs[0]).toMatch(/Choisissez le lieu/);
    await expect(importeur.executer(sansSite)).rejects.toThrow(/Choisissez le lieu/);
  });
});
