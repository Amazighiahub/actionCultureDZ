/**
 * Documents PDF d'un événement : organisateur ou administration seulement, PDF mis en ligne
 * par le site seulement, 5 au plus, servis par le site.
 */
const { DocumentsEvenement, lienDocument } = require('../../services/evenement/documentsEvenement');

process.env.CLOUDINARY_CLOUD_NAME = 'demo';
const PDF = 'https://res.cloudinary.com/demo/raw/upload/v1/programme';

const modeles = ({ nombre = 0, media = null } = {}) => ({
  Evenement: { findByPk: jest.fn(async () => ({ id_evenement: 2, id_user: 37 })) },
  Media: {
    count: jest.fn(async () => nombre),
    create: jest.fn(async (d) => ({ id_media: 9, ...d })),
    destroy: jest.fn(async () => 1),
    findAll: jest.fn(async () => [{ id_media: 9, titre: { fr: 'Programme' }, url: PDF, ordre: 0 }]),
    findOne: jest.fn(async () => media)
  }
});

describe('DocumentsEvenement', () => {
  test('ajout par l\'organisateur : document enregistré, lien servi par le site', async () => {
    const m = modeles();
    const r = await new DocumentsEvenement(m).ajouter(2, { id_user: 37 }, { url: PDF, titre: ' Programme complet ' });
    expect(m.Media.create).toHaveBeenCalledWith(expect.objectContaining({ id_evenement: 2, type_media: 'document', titre: { fr: 'Programme complet' } }));
    expect(r.lien).toBe(lienDocument(2, 9));
  });

  test('refusé : autre membre, lien extérieur, sans titre, 6e document', async () => {
    await expect(new DocumentsEvenement(modeles()).ajouter(2, { id_user: 8 }, { url: PDF, titre: 'x' })).rejects.toMatchObject({ statusCode: 403 });
    await expect(new DocumentsEvenement(modeles()).ajouter(2, { id_user: 37 }, { url: 'https://exemple.dz/x.pdf', titre: 'x' })).rejects.toMatchObject({ statusCode: 400 });
    await expect(new DocumentsEvenement(modeles()).ajouter(2, { id_user: 37 }, { url: PDF, titre: '  ' })).rejects.toMatchObject({ statusCode: 400 });
    await expect(new DocumentsEvenement(modeles({ nombre: 5 })).ajouter(2, { id_user: 37 }, { url: PDF, titre: 'x' })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('l\'administration peut ajouter et retirer', async () => {
    const m = modeles();
    await expect(new DocumentsEvenement(m).ajouter(2, { id_user: 1, isAdmin: true }, { url: PDF, titre: 'x' })).resolves.toBeDefined();
    await expect(new DocumentsEvenement(m).retirer(2, 9, { id_user: 1, isAdmin: true })).resolves.toBe(true);
  });

  test('liste sans l\'adresse Cloudinary ; fichier introuvable : 404', async () => {
    const liste = await new DocumentsEvenement(modeles()).lister(2);
    expect(liste[0]).toMatchObject({ id_media: 9, lien: lienDocument(2, 9) });
    expect(liste[0].url).toBeUndefined();
    await expect(new DocumentsEvenement(modeles()).fichier(2, 9)).rejects.toMatchObject({ statusCode: 404 });
    await expect(new DocumentsEvenement(modeles({ media: { url: PDF } })).fichier(2, 9)).resolves.toBe(PDF);
  });
});
