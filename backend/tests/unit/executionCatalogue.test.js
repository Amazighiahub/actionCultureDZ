/**
 * Import du catalogue : un livre déjà sur le site n'est relié directement à la maison que s'il n'a
 * pas d'autre éditeur et qu'il a été ajouté par ce compte ; réimporter le même fichier ne recrée rien.
 */
const { executer } = require('../../services/organisations/executionCatalogue');

const ORG = { id_organisation: 5, nom: { fr: 'Éditions Barzakh' } };
const EDITEUR = 50;

// Livres déjà sur le site : 69 (ajouté par le compte 37, sans éditeur), 70 (ajouté par 99),
// 71 (déjà publié par une autre maison), 72 (déjà relié à cette maison, titre « Le Chant des oliviers »)
const oeuvres = {
  69: { id_oeuvre: 69, saisi_par: 37, titre: { fr: 'Nedjma' } },
  70: { id_oeuvre: 70, saisi_par: 99, titre: { fr: 'La Grande Maison' } },
  71: { id_oeuvre: 71, saisi_par: 37, titre: { fr: 'Le Fleuve détourné' } },
  72: { id_oeuvre: 72, saisi_par: 37, titre: { fr: 'Le Chant des oliviers', ar: 'نشيد الزيتون' } }
};

const makeModels = () => {
  const liens = [{ id_oeuvre: 71, id_editeur: 51 }, { id_oeuvre: 72, id_editeur: EDITEUR }];
  return {
    liens,
    Editeur: { findOne: jest.fn(async () => ({ id_editeur: EDITEUR })) },
    Intervenant: { findAll: jest.fn(async () => []), create: jest.fn(async () => ({ id_intervenant: 300 })) },
    Oeuvre: {
      findByPk: jest.fn(async (id) => oeuvres[id] || null),
      findAll: jest.fn(async ({ where }) => Object.values(oeuvres).filter(o => where.id_oeuvre[Object.getOwnPropertySymbols(where.id_oeuvre)[0]].includes(o.id_oeuvre)))
    },
    OeuvreEditeur: {
      findAll: jest.fn(async ({ where }) => liens.filter(l => Object.entries(where).every(([k, v]) => l[k] === v))),
      findOrCreate: jest.fn(async ({ where }) => { liens.push({ ...where }); return [where, true]; })
    }
  };
};

const ligne = (n, champs) => ({
  ligne: n, etat: 'nouveau', isbn: null, idOeuvreExistante: null, titre: { fr: `Livre ${n}` }, resume: { fr: 'Résumé' },
  auteur: { prenom: 'Amina', nom: 'Benali' }, idLangue: 1, categories: [{ id: 3, genre: 1 }], ...champs
});
const existe = (n, idOeuvre) => ligne(n, { etat: 'existe', isbn: `978994700000${n}`, idOeuvreExistante: idOeuvre });

const makeOeuvreService = () => {
  let id = 500;
  return {
    create: jest.fn(async () => ({ oeuvre: { id_oeuvre: ++id } })),
    submitForValidation: jest.fn(async () => {})
  };
};

describe('Import du catalogue : livres déjà sur le site', () => {
  test('ajouté par ce compte et sans éditeur : relié ; ajouté par un autre ou déjà édité ailleurs : à vérifier', async () => {
    const models = makeModels();
    const bilan = await executer({ models, oeuvreService: makeOeuvreService() }, ORG,
      [existe(2, 69), existe(3, 70), existe(4, 71), existe(5, 72)], 37);
    expect(bilan.lies.map(l => l.id_oeuvre)).toEqual([69]);
    expect(bilan.aVerifier.map(l => l.id_oeuvre)).toEqual([70, 71]);
    expect(bilan.dejaPresents.map(l => l.id_oeuvre)).toEqual([72]);
    // Seul le livre 69 est relié ; sans rôle dans la recherche (clé unique : id_oeuvre + id_editeur)
    expect(models.OeuvreEditeur.findOrCreate).toHaveBeenCalledTimes(1);
    expect(models.OeuvreEditeur.findOrCreate).toHaveBeenCalledWith({
      where: { id_oeuvre: 69, id_editeur: EDITEUR }, defaults: { role_editeur: 'editeur_principal', statut_edition: 'publie' }
    });
  });

  test('la modération relie directement un livre ajouté par un autre compte', async () => {
    const models = makeModels();
    const bilan = await executer({ models, oeuvreService: makeOeuvreService() }, ORG, [existe(2, 70)], 1, { direct: true });
    expect(bilan.lies.map(l => l.id_oeuvre)).toEqual([70]);
    expect(bilan.aVerifier).toEqual([]);
  });
});

describe('Import du catalogue : le même fichier importé deux fois', () => {
  test('un livre sans ISBN déjà dans le catalogue (quelle que soit la langue du titre) n’est pas recréé', async () => {
    const oeuvreService = makeOeuvreService();
    const bilan = await executer({ models: makeModels(), oeuvreService }, ORG, [
      ligne(2, { titre: { fr: 'le chant des OLIVIERS ' } }),
      ligne(3, { titre: { fr: '', ar: 'نشيد الزيتون' } }),
      ligne(4, { titre: { fr: 'Un livre nouveau' } }),
      ligne(5, { titre: { fr: 'Un livre nouveau' } })
    ], 37);
    expect(bilan.dejaPresents.map(l => l.ligne)).toEqual([2, 3, 5]);
    expect(bilan.crees.map(l => l.ligne)).toEqual([4]);
    expect(oeuvreService.create).toHaveBeenCalledTimes(1);
  });
});
