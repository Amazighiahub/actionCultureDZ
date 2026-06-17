/**
 * Tests d integration — OeuvreService.create() pour tous les types
 *
 * Couvre : Livre(1), Film(2), Album(3), Article(4),
 *          ArticleScientifique(5), OeuvreArt(6), Artisanat(7)
 *
 * Verifie pour chaque type :
 *   - Le sous-type est cree avec les bons champs specifiques
 *   - Retour sans findWithFullDetails (pas de timeout)
 *   - Colonne date_creation utilisee dans la protection anti-doublon
 */

const OeuvreService = require("../../services/oeuvre/oeuvreService");
const { subtypeRegistry, initSubtypeServices } = require("../../services/oeuvre/subtypes");

jest.setTimeout(15000);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOeuvreInstance(typeId) {
  const data = {
    id_oeuvre: 42,
    titre: { fr: "Titre Test", ar: "عنوان" },
    description: { fr: "Description" },
    id_type_oeuvre: typeId,
    id_langue: 1,
    statut: "brouillon",
    saisi_par: 99,
    date_creation: new Date(),
  };
  return Object.assign({ get: () => data }, data);
}

function buildModels(typeId) {
  const subtypeModel = jest.fn().mockResolvedValue({
    id_oeuvre: 42,
    get: () => ({ id_oeuvre: 42 }),
  });

  const models = {
    TypeOeuvre: {
      findByPk: jest.fn().mockResolvedValue({ id_type_oeuvre: typeId }),
    },
    OeuvreCategorie: { bulkCreate: jest.fn().mockResolvedValue([]) },
    TagMotCle: {
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id_tag: 1, nom: { fr: "tag" } }),
      bulkCreate: jest.fn().mockResolvedValue([{ id_tag: 1, nom: { fr: "tag" } }]),
    },
    OeuvreTag: { bulkCreate: jest.fn().mockResolvedValue([]) },
    OeuvreUser: { create: jest.fn().mockResolvedValue({}) },
    User: { findByPk: jest.fn().mockResolvedValue({ id_type_user: 1 }) },
    Intervenant: { findOne: jest.fn().mockResolvedValue(null), create: jest.fn() },
    OeuvreIntervenant: { bulkCreate: jest.fn().mockResolvedValue([]) },
    OeuvreEditeur: { bulkCreate: jest.fn().mockResolvedValue([]) },
    // Sous-types
    Livre: { create: jest.fn().mockResolvedValue({ id_livre: 1, get: () => ({}) }) },
    Film: { create: jest.fn().mockResolvedValue({ id_film: 1, get: () => ({}) }) },
    AlbumMusical: { create: jest.fn().mockResolvedValue({ id_album: 1, get: () => ({}) }) },
    Article: { create: jest.fn().mockResolvedValue({ id_article: 1, get: () => ({}) }) },
    ArticleScientifique: { create: jest.fn().mockResolvedValue({ id_article_scientifique: 1, get: () => ({}) }) },
    OeuvreArt: { create: jest.fn().mockResolvedValue({ id_oeuvre_art: 1, get: () => ({}) }) },
    Artisanat: { create: jest.fn().mockResolvedValue({ id_artisanat: 1, get: () => ({}) }) },
    // Album specifique
    TypeOeuvreGenre: {
      findOne: jest.fn().mockResolvedValue({ id_genre: 1 }),
    },
  };

  return models;
}

function buildRepository(typeId) {
  return {
    model: {
      sequelize: { transaction: jest.fn().mockResolvedValue({}) },
      findOne: jest.fn().mockResolvedValue(null),
    },
    create: jest.fn().mockResolvedValue(makeOeuvreInstance(typeId)),
    findById: jest.fn().mockResolvedValue(makeOeuvreInstance(typeId)),
    withTransaction: jest.fn().mockImplementation(async (cb) => {
      return await cb({ commit: jest.fn(), rollback: jest.fn() });
    }),
  };
}

function buildService(typeId) {
  const models = buildModels(typeId);
  const repository = buildRepository(typeId);
  subtypeRegistry._services.clear();
  initSubtypeServices(models);
  const service = new OeuvreService(repository, { models });
  service.cache = { invalidate: jest.fn() };
  return { service, models, repository };
}

function basePayload(typeId, detailsSpecifiques, overrides) {
  return Object.assign({
    titre: { fr: "Titre Test", ar: "عنوان", en: "" },
    description: { fr: "Description de test" },
    id_type_oeuvre: typeId,
    id_langue: 1,
    annee_creation: 2024,
    categories: [],
    tags: [],
    details_specifiques: detailsSpecifiques || {},
    intervenants_existants: [],
    nouveaux_intervenants: [],
    utilisateurs_inscrits: [],
    editeurs: [],
  }, overrides || {});
}

// ---------------------------------------------------------------------------
// Tests par type
// ---------------------------------------------------------------------------

describe("OeuvreService — Film (type 2)", function() {
  var ctx;

  beforeEach(function() {
    jest.clearAllMocks();
    ctx = buildService(2);
  });

  test("cree un film avec duree_minutes et realisateur", async function() {
    const payload = basePayload(2, {
      film: { duree_minutes: 120, realisateur: "Mohamed Chouikh" }
    });
    const result = await ctx.service.create(payload, 99);
    expect(result.oeuvre).toHaveProperty("id", 42);
    expect(ctx.models.Film.create).toHaveBeenCalledWith(
      expect.objectContaining({ id_oeuvre: 42, duree_minutes: 120, realisateur: "Mohamed Chouikh" }),
      expect.any(Object)
    );
  });

  test("cree un film sans options optionnelles (champs null)", async function() {
    const payload = basePayload(2, { film: {} });
    const result = await ctx.service.create(payload, 99);
    expect(result.oeuvre).toHaveProperty("id", 42);
    expect(ctx.models.Film.create).toHaveBeenCalledWith(
      expect.objectContaining({ id_oeuvre: 42, duree_minutes: null, realisateur: null }),
      expect.any(Object)
    );
  });

  test("query anti-doublon utilise date_creation", async function() {
    await ctx.service.create(basePayload(2, { film: {} }), 99);
    const callArgs = ctx.repository.model.findOne.mock.calls[0][0];
    expect(callArgs.where).toHaveProperty("date_creation");
    expect(callArgs.where).not.toHaveProperty("created_at");
  });

  test("findWithFullDetails non appele apres creation", async function() {
    await ctx.service.create(basePayload(2, { film: { duree_minutes: 90 } }), 99);
    expect(ctx.repository.findById).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------

describe("OeuvreService — Album Musical (type 3)", function() {
  var ctx;

  beforeEach(function() {
    jest.clearAllMocks();
    ctx = buildService(3);
  });

  test("cree un album avec duree et label", async function() {
    const payload = basePayload(3, {
      album_musical: { duree: "45", label: "Label Algerien", id_genre: 2 }
    });
    const result = await ctx.service.create(payload, 99);
    expect(result.oeuvre).toHaveProperty("id", 42);
    expect(ctx.models.AlbumMusical.create).toHaveBeenCalledWith(
      expect.objectContaining({ id_oeuvre: 42, label: "Label Algerien" }),
      expect.any(Object)
    );
  });

  test("album sans id_genre => fallback TypeOeuvreGenre appele", async function() {
    const payload = basePayload(3, { album_musical: { duree: "30" } });
    await ctx.service.create(payload, 99);
    expect(ctx.models.TypeOeuvreGenre.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_type_oeuvre: 3, actif: 1 } })
    );
  });

  test("album avec id_genre => TypeOeuvreGenre non appele", async function() {
    const payload = basePayload(3, { album_musical: { id_genre: 5, duree: "30" } });
    await ctx.service.create(payload, 99);
    expect(ctx.models.TypeOeuvreGenre.findOne).not.toHaveBeenCalled();
  });

  test("label par defaut = Independant si absent", async function() {
    const payload = basePayload(3, { album_musical: { id_genre: 1 } });
    await ctx.service.create(payload, 99);
    expect(ctx.models.AlbumMusical.create).toHaveBeenCalledWith(
      expect.objectContaining({ label: "Indépendant" }),
      expect.any(Object)
    );
  });

  test("query anti-doublon utilise date_creation", async function() {
    await ctx.service.create(basePayload(3, { album_musical: {} }), 99);
    const callArgs = ctx.repository.model.findOne.mock.calls[0][0];
    expect(callArgs.where).toHaveProperty("date_creation");
    expect(callArgs.where).not.toHaveProperty("created_at");
  });
});

// ---------------------------------------------------------------------------

describe("OeuvreService — Article (type 4)", function() {
  var ctx;

  beforeEach(function() {
    jest.clearAllMocks();
    ctx = buildService(4);
  });

  test("cree un article avec auteur et source", async function() {
    const payload = basePayload(4, {
      article: {
        auteur: "Dr. Ahmed Benali",
        source: "Revue culturelle DZ",
        resume: "Resume de l article",
        url_source: "https://revue.dz/article"
      }
    });
    const result = await ctx.service.create(payload, 99);
    expect(result.oeuvre).toHaveProperty("id", 42);
    expect(ctx.models.Article.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id_oeuvre: 42,
        auteur: "Dr. Ahmed Benali",
        source: "Revue culturelle DZ",
        statut: "brouillon",
      }),
      expect.any(Object)
    );
  });

  test("article sans options => champs null", async function() {
    const payload = basePayload(4, { article: {} });
    await ctx.service.create(payload, 99);
    expect(ctx.models.Article.create).toHaveBeenCalledWith(
      expect.objectContaining({ id_oeuvre: 42, auteur: null, source: null }),
      expect.any(Object)
    );
  });

  test("findWithFullDetails non appele", async function() {
    await ctx.service.create(basePayload(4, { article: {} }), 99);
    expect(ctx.repository.findById).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------

describe("OeuvreService — Article Scientifique (type 5)", function() {
  var ctx;

  beforeEach(function() {
    jest.clearAllMocks();
    ctx = buildService(5);
  });

  test("cree un article scientifique avec tous les champs", async function() {
    const payload = basePayload(5, {
      article_scientifique: {
        journal: "Journal of Algerian Studies",
        doi: "10.1234/jas.2024.001",
        volume: "12",
        numero: "3",
        pages: "45-67",
        peer_reviewed: true,
        open_access: false,
        impact_factor: 2.5
      }
    });
    const result = await ctx.service.create(payload, 99);
    expect(result.oeuvre).toHaveProperty("id", 42);
    expect(ctx.models.ArticleScientifique.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id_oeuvre: 42,
        journal: "Journal of Algerian Studies",
        doi: "10.1234/jas.2024.001",
        peer_reviewed: true,
        impact_factor: 2.5,
      }),
      expect.any(Object)
    );
  });

  test("peer_reviewed vaut true par defaut si absent", async function() {
    const payload = basePayload(5, { article_scientifique: {} });
    await ctx.service.create(payload, 99);
    expect(ctx.models.ArticleScientifique.create).toHaveBeenCalledWith(
      expect.objectContaining({ peer_reviewed: true }),
      expect.any(Object)
    );
  });
});

// ---------------------------------------------------------------------------

describe("OeuvreService — Oeuvre Art (type 6)", function() {
  var ctx;

  beforeEach(function() {
    jest.clearAllMocks();
    ctx = buildService(6);
  });

  test("cree une oeuvre d art avec technique, dimensions, support", async function() {
    const payload = basePayload(6, {
      oeuvre_art: {
        technique: "Aquarelle",
        dimensions: "60x80cm",
        support: "Papier"
      }
    });
    const result = await ctx.service.create(payload, 99);
    expect(result.oeuvre).toHaveProperty("id", 42);
    expect(ctx.models.OeuvreArt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id_oeuvre: 42,
        technique: "Aquarelle",
        dimensions: "60x80cm",
        support: "Papier",
      }),
      expect.any(Object)
    );
  });

  test("oeuvre art sans options => champs null", async function() {
    const payload = basePayload(6, { oeuvre_art: {} });
    await ctx.service.create(payload, 99);
    expect(ctx.models.OeuvreArt.create).toHaveBeenCalledWith(
      expect.objectContaining({ id_oeuvre: 42, technique: null }),
      expect.any(Object)
    );
  });
});

// ---------------------------------------------------------------------------

describe("OeuvreService — Artisanat (type 7)", function() {
  var ctx;

  beforeEach(function() {
    jest.clearAllMocks();
    ctx = buildService(7);
  });

  test("cree un artisanat avec materiau, technique, dimensions, poids, prix", async function() {
    const payload = basePayload(7, {
      artisanat: {
        id_materiau: 3,
        id_technique: 2,
        dimensions: "30x20x10cm",
        poids: 1.5,
        prix: 5000
      }
    });
    const result = await ctx.service.create(payload, 99);
    expect(result.oeuvre).toHaveProperty("id", 42);
    expect(ctx.models.Artisanat.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id_oeuvre: 42,
        id_materiau: 3,
        id_technique: 2,
        poids: 1.5,
        prix: 5000,
      }),
      expect.any(Object)
    );
  });

  test("artisanat sans options => champs null", async function() {
    const payload = basePayload(7, { artisanat: {} });
    await ctx.service.create(payload, 99);
    expect(ctx.models.Artisanat.create).toHaveBeenCalledWith(
      expect.objectContaining({ id_oeuvre: 42, id_materiau: null, id_technique: null }),
      expect.any(Object)
    );
  });

  test("query anti-doublon utilise date_creation", async function() {
    await ctx.service.create(basePayload(7, { artisanat: {} }), 99);
    const callArgs = ctx.repository.model.findOne.mock.calls[0][0];
    expect(callArgs.where).toHaveProperty("date_creation");
    expect(callArgs.where).not.toHaveProperty("created_at");
  });
});

// ---------------------------------------------------------------------------
// Cross-type : options communes fonctionnent pour tous les types
// ---------------------------------------------------------------------------

describe("OeuvreService — Options communes (tous types)", function() {
  const TYPE_IDS = [1, 2, 3, 4, 5, 6, 7];
  const DETAILS = {
    1: { livre: {} },
    2: { film: {} },
    3: { album_musical: { id_genre: 1 } },
    4: { article: {} },
    5: { article_scientifique: {} },
    6: { oeuvre_art: {} },
    7: { artisanat: {} },
  };

  TYPE_IDS.forEach(function(typeId) {
    test("type " + typeId + " : tags resolus et inseres", async function() {
      const ctx = buildService(typeId);
      ctx.models.TagMotCle.findAll.mockResolvedValue([
        { id_tag: 10, nom: { fr: "culture" } }
      ]);
      const payload = basePayload(typeId, DETAILS[typeId], { tags: ["culture", "nouveau"] });
      await ctx.service.create(payload, 99);
      expect(ctx.models.OeuvreTag.bulkCreate).toHaveBeenCalled();
      expect(ctx.models.TagMotCle.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ nom: { fr: "nouveau" } })]),
        expect.any(Object)
      );
    });

    test("type " + typeId + " : je_suis_auteur ajoute dans OeuvreUser", async function() {
      const ctx = buildService(typeId);
      const payload = basePayload(typeId, DETAILS[typeId], { je_suis_auteur: true });
      await ctx.service.create(payload, 99);
      expect(ctx.models.OeuvreUser.create).toHaveBeenCalledWith(
        expect.objectContaining({ id_user: 99, role_principal: true }),
        expect.any(Object)
      );
    });

    test("type " + typeId + " : findWithFullDetails non appele (pas de timeout)", async function() {
      const ctx = buildService(typeId);
      const payload = basePayload(typeId, DETAILS[typeId]);
      await ctx.service.create(payload, 99);
      expect(ctx.repository.findById).not.toHaveBeenCalled();
    });
  });
});
