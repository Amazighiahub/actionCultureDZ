/**
 * Tests d'integration — OeuvreService.create() pour Livre
 *
 * Verifie le vrai service (pas le controller mocke) avec les options
 * completes du formulaire : titre, isbn, nb_pages, categories, tags,
 * intervenants, editeurs, je_suis_auteur, nouveaux_intervenants.
 *
 * Points critiques couverts :
 *   - Colonne "date_creation" (pas "created_at") dans la protection anti-doublon
 *   - Pas de findWithFullDetails apres creation (pas de timeout)
 *   - Retour OeuvreDTO depuis l'entite en memoire
 */

const OeuvreService = require("../../services/oeuvre/oeuvreService");
const { subtypeRegistry, initSubtypeServices } = require("../../services/oeuvre/subtypes");

jest.setTimeout(15000);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOeuvreInstance() {
  const data = {
    id_oeuvre: 42,
    titre: { fr: "Les Mille et Une Nuits", ar: "alf layla" },
    description: { fr: "Conte classique", ar: "qissa classikiya" },
    id_type_oeuvre: 1,
    id_langue: 1,
    statut: "brouillon",
    saisi_par: 99,
    date_creation: new Date(),
  };
  return Object.assign({ get: () => data }, data);
}

function makeLivreInstance() {
  return {
    id_livre: 10,
    id_oeuvre: 42,
    isbn: "978-2-07-036822-8",
    nb_pages: 320,
    id_genre: null,
    get: (opts) => ({ id_livre: 10, id_oeuvre: 42, isbn: "978-2-07-036822-8", nb_pages: 320 }),
  };
}

function buildModels(opts) {
  const recentOeuvre = opts && opts.recentOeuvre ? opts.recentOeuvre : null;
  return {
    TypeOeuvre: {
      findByPk: jest.fn().mockResolvedValue({ id_type_oeuvre: 1, nom: { fr: "Livre" } }),
    },
    OeuvreCategorie: {
      bulkCreate: jest.fn().mockResolvedValue([]),
    },
    TagMotCle: {
      findAll: jest.fn().mockResolvedValue([
        { id_tag: 5, nom: { fr: "litterature" } },
        { id_tag: 6, nom: { fr: "patrimoine" } },
      ]),
      create: jest.fn().mockImplementation(function(data) {
        return Promise.resolve({ id_tag: 99, nom: data.nom });
      }),
      bulkCreate: jest.fn().mockImplementation(function(items) {
        return Promise.resolve(items.map((item, i) => ({ id_tag: 100 + i, nom: item.nom })));
      }),
    },
    OeuvreTag: {
      bulkCreate: jest.fn().mockResolvedValue([]),
    },
    Livre: {
      create: jest.fn().mockResolvedValue(makeLivreInstance()),
    },
    User: {
      findByPk: jest.fn().mockResolvedValue({ id_type_user: 3 }),
    },
    OeuvreUser: {
      create: jest.fn().mockResolvedValue({}),
    },
    Intervenant: {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id_intervenant: 77, nom: { fr: "Auteur Test" } }),
    },
    OeuvreIntervenant: {
      bulkCreate: jest.fn().mockResolvedValue([]),
    },
    OeuvreEditeur: {
      bulkCreate: jest.fn().mockResolvedValue([]),
    },
    _recentOeuvre: recentOeuvre,
  };
}

function buildRepository(models) {
  return {
    model: {
      sequelize: {
        transaction: jest.fn().mockResolvedValue({ commit: jest.fn(), rollback: jest.fn() }),
      },
      findOne: jest.fn().mockResolvedValue(models._recentOeuvre || null),
    },
    create: jest.fn().mockResolvedValue(makeOeuvreInstance()),
    findById: jest.fn().mockResolvedValue(makeOeuvreInstance()),
    withTransaction: jest.fn().mockImplementation(async function(callback) {
      const tx = { commit: jest.fn(), rollback: jest.fn() };
      try {
        return await callback(tx);
      } catch (e) {
        throw e;
      }
    }),
  };
}

function buildService(models, repository) {
  subtypeRegistry._services.clear();
  initSubtypeServices(models);
  const service = new OeuvreService(repository, { models });
  service.cache = { invalidate: jest.fn(), getOrSet: jest.fn() };
  return service;
}

function livrePayloadComplet(overrides) {
  const base = {
    titre: { fr: "Les Mille et Une Nuits", ar: "alf layla", en: "" },
    description: { fr: "Conte classique de la litterature arabe", ar: "qissa min al-adab al-arabi" },
    id_type_oeuvre: 1,
    id_langue: 1,
    annee_creation: 2023,
    prix: 1500,
    categories: [2, 5],
    tags: ["litterature", "patrimoine", "nouveau-tag"],
    je_suis_auteur: true,
    details_specifiques: {
      livre: {
        isbn: "978-2-07-036822-8",
        nb_pages: 320,
      },
    },
    intervenants_existants: [],
    nouveaux_intervenants: [
      { nom: "Auteur Externe", prenom: "Prenom", id_type_user: 2, email: "auteur@test.dz" },
    ],
    utilisateurs_inscrits: [],
    editeurs: [{ id_editeur: 3, role_editeur: "principal", statut_edition: "publie" }],
  };
  return Object.assign({}, base, overrides || {});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("OeuvreService.create() — Livre (integration)", function() {
  var models, repository, service;

  beforeEach(function() {
    jest.clearAllMocks();
    models = buildModels();
    repository = buildRepository(models);
    service = buildService(models, repository);
  });

  // =========================================================================
  // Creation normale
  // =========================================================================

  test("cree un livre complet et retourne oeuvre + subtype sans findWithFullDetails", async function() {
    const result = await service.create(livrePayloadComplet(), 99);

    expect(result).toHaveProperty("oeuvre");
    expect(result).toHaveProperty("subtype");
    expect(result.oeuvre).toHaveProperty("id", 42);
    expect(result.subtype).toBeTruthy();

    // findWithFullDetails ne doit PAS etre appele
    expect(repository.findById).not.toHaveBeenCalled();
  });

  test("TypeOeuvre.findByPk est appele avec id_type_oeuvre=1", async function() {
    await service.create(livrePayloadComplet(), 99);
    expect(models.TypeOeuvre.findByPk).toHaveBeenCalledWith(1);
  });

  test("insere les categories via OeuvreCategorie.bulkCreate", async function() {
    await service.create(livrePayloadComplet(), 99);
    expect(models.OeuvreCategorie.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id_oeuvre: 42, id_categorie: 2 }),
        expect.objectContaining({ id_oeuvre: 42, id_categorie: 5 }),
      ]),
      expect.any(Object)
    );
  });

  test("resout les tags existants et cree le nouveau tag", async function() {
    await service.create(livrePayloadComplet(), 99);
    expect(models.TagMotCle.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ nom: { fr: "nouveau-tag" } })]),
      expect.any(Object)
    );
    expect(models.OeuvreTag.bulkCreate).toHaveBeenCalled();
  });

  test("cree le sous-type Livre avec isbn et nb_pages", async function() {
    await service.create(livrePayloadComplet(), 99);
    expect(models.Livre.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id_oeuvre: 42,
        isbn: "978-2-07-036822-8",
        nb_pages: 320,
      }),
      expect.any(Object)
    );
  });

  test("je_suis_auteur => ajoute utilisateur dans OeuvreUser", async function() {
    await service.create(livrePayloadComplet({ je_suis_auteur: true }), 99);
    expect(models.OeuvreUser.create).toHaveBeenCalledWith(
      expect.objectContaining({ id_oeuvre: 42, id_user: 99, role_principal: true }),
      expect.any(Object)
    );
  });

  test("sans je_suis_auteur => OeuvreUser.create non appele", async function() {
    await service.create(livrePayloadComplet({ je_suis_auteur: false }), 99);
    expect(models.OeuvreUser.create).not.toHaveBeenCalled();
  });

  test("cree le nouvel intervenant externe et l associe", async function() {
    await service.create(livrePayloadComplet(), 99);
    expect(models.Intervenant.create).toHaveBeenCalledWith(
      expect.objectContaining({ nom: expect.objectContaining({ fr: "Auteur Externe" }) }),
      expect.any(Object)
    );
    expect(models.OeuvreIntervenant.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id_oeuvre: 42, id_intervenant: 77 }),
      ]),
      expect.any(Object)
    );
  });

  test("associe l editeur existant avec role et statut", async function() {
    await service.create(livrePayloadComplet(), 99);
    expect(models.OeuvreEditeur.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id_oeuvre: 42,
          id_editeur: 3,
          role_editeur: "principal",
          statut_edition: "publie",
        }),
      ]),
      expect.any(Object)
    );
  });

  // =========================================================================
  // Protection anti-doublon — date_creation (pas created_at)
  // =========================================================================

  test("la query anti-doublon utilise date_creation et non created_at", async function() {
    await service.create(livrePayloadComplet(), 99);

    expect(repository.model.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          saisi_par: 99,
          id_type_oeuvre: 1,
          date_creation: expect.any(Object),
        }),
      })
    );

    const callArgs = repository.model.findOne.mock.calls[0][0];
    expect(callArgs.where).not.toHaveProperty("created_at");
  });

  test("double-envoi detecte => retourne oeuvre existante sans re-creer", async function() {
    const recentInstance = {
      id_oeuvre: 42,
      titre: { fr: "Les Mille et Une Nuits", ar: "alf layla" },
    };

    const models2 = buildModels({ recentOeuvre: recentInstance });
    const repository2 = buildRepository(models2);
    repository2.model.findOne = jest.fn().mockResolvedValue(recentInstance);

    const service2 = buildService(models2, repository2);
    service2.cache = { invalidate: jest.fn() };
    service2.findWithFullDetails = jest.fn().mockResolvedValue({
      id_oeuvre: 42,
      titre: { fr: "Les Mille et Une Nuits" },
    });

    const result = await service2.create(livrePayloadComplet(), 99);

    expect(result.duplicate).toBe(true);
    expect(result.oeuvre.id_oeuvre).toBe(42);
    expect(repository2.withTransaction).not.toHaveBeenCalled();
  });

  // =========================================================================
  // Validation
  // =========================================================================

  test("titre manquant => erreur de validation lancee", async function() {
    await expect(
      service.create(livrePayloadComplet({ titre: { fr: "", ar: "" } }), 99)
    ).rejects.toThrow();
  });

  test("type_oeuvre invalide => TypeOeuvre null => erreur lancee", async function() {
    models.TypeOeuvre.findByPk.mockResolvedValue(null);
    await expect(
      service.create(livrePayloadComplet({ id_type_oeuvre: 999 }), 99)
    ).rejects.toThrow();
  });

  // =========================================================================
  // Livre minimal (sans options optionnelles)
  // =========================================================================

  test("livre minimal sans tags ni categories ni intervenants fonctionne", async function() {
    const minimal = {
      titre: { fr: "Livre Minimal", ar: "" },
      description: { fr: "Description" },
      id_type_oeuvre: 1,
      id_langue: 1,
      categories: [],
      tags: [],
      details_specifiques: { livre: {} },
    };

    const result = await service.create(minimal, 99);
    expect(result.oeuvre).toHaveProperty("id", 42);
    expect(models.OeuvreCategorie.bulkCreate).not.toHaveBeenCalled();
    expect(models.OeuvreTag.bulkCreate).not.toHaveBeenCalled();
    expect(models.OeuvreUser.create).not.toHaveBeenCalled();
    expect(models.OeuvreIntervenant.bulkCreate).not.toHaveBeenCalled();
    expect(models.OeuvreEditeur.bulkCreate).not.toHaveBeenCalled();
  });
});
