/**
 * Tests Tamazight — tz-ltn (Latin) et tz-tfng (Tifinagh)
 *
 * Verifie que les deux scripts amazigh sont correctement:
 *   - Reconnus comme langues valides
 *   - Normalises par BaseDTO
 *   - Extraits avec priorite et fallback corrects
 *   - Traduits recursivement (translateRaw)
 *   - Stockes dans la DB via le service
 *   - Traites par le builder de recherche multilingue
 */

const BaseDTO = require("../../dto/baseDTO");
const CreateOeuvreDTO = require("../../dto/oeuvre/createOeuvreDTO");
const OeuvreService = require("../../services/oeuvre/oeuvreService");
const { subtypeRegistry, initSubtypeServices } = require("../../services/oeuvre/subtypes");
const { buildMultiLangSearch, SUPPORTED_LANGUAGES } = require("../../utils/multiLangSearchBuilder");

jest.setTimeout(10000);

// ---------------------------------------------------------------------------
// Echantillons Tamazight reels
// ---------------------------------------------------------------------------
// Tamazight Latin (Kabyle) : "Azul" = Bonjour, "Tafat" = Lumiere
// Tifinagh : ⴰⵣⵓⵍ = Azul, ⵜⴰⴼⴰⵜ = Tafat

const SAMPLES = {
  ltn_bonjour: "Azul",
  ltn_culture: "Tamaziɣt n Lezzayer",
  tfng_bonjour: "ⴰⵣⵓⵍ",
  tfng_culture: "ⵜⴰⵎⴰⵣⵉⵖⵜ ⵏ ⵍⴻⵣⵣⴰⵢⴻⵔ",
};

// ---------------------------------------------------------------------------
// Helper service
// ---------------------------------------------------------------------------

function makeOeuvreEntity(titre) {
  const data = Object.assign({
    id_oeuvre: 42,
    id_type_oeuvre: 1,
    id_langue: 1,
    statut: "brouillon",
    saisi_par: 99,
    date_creation: new Date(),
    description: { fr: "Desc", ar: "وصف", en: "", "tz-ltn": "", "tz-tfng": "" },
  }, { titre: titre });
  return Object.assign({ get: () => data }, data);
}

function buildService(titreEntity) {
  const models = {
    TypeOeuvre: { findByPk: jest.fn().mockResolvedValue({ id_type_oeuvre: 1 }) },
    OeuvreCategorie: { bulkCreate: jest.fn().mockResolvedValue([]) },
    TagMotCle: {
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id_tag: 1, nom: { fr: "tag" } }),
    },
    OeuvreTag: { bulkCreate: jest.fn().mockResolvedValue([]) },
    Livre: { create: jest.fn().mockResolvedValue({ id_livre: 1, get: () => ({}) }) },
    OeuvreUser: { create: jest.fn().mockResolvedValue({}) },
    User: { findByPk: jest.fn().mockResolvedValue({ id_type_user: 1 }) },
    Intervenant: { findOne: jest.fn(), create: jest.fn() },
    OeuvreIntervenant: { bulkCreate: jest.fn().mockResolvedValue([]) },
    OeuvreEditeur: { bulkCreate: jest.fn().mockResolvedValue([]) },
  };
  const repository = {
    model: { findOne: jest.fn().mockResolvedValue(null) },
    create: jest.fn().mockResolvedValue(makeOeuvreEntity(titreEntity)),
    findById: jest.fn(),
    withTransaction: jest.fn().mockImplementation(async (cb) =>
      cb({ commit: jest.fn(), rollback: jest.fn() })
    ),
  };
  subtypeRegistry._services.clear();
  initSubtypeServices(models);
  const service = new OeuvreService(repository, { models });
  service.cache = { invalidate: jest.fn() };
  return { service, models, repository };
}

function livrePayload(titre, description, extra) {
  return Object.assign({
    titre: titre,
    description: description || { fr: "Description", ar: "وصف" },
    id_type_oeuvre: 1,
    id_langue: 1,
    categories: [],
    tags: [],
    details_specifiques: { livre: {} },
  }, extra || {});
}

// ===========================================================================
// 1. BaseDTO.createMultilang — base inclut tz-ltn et tz-tfng
// ===========================================================================

describe("BaseDTO.createMultilang — base 5 langues", function() {

  test("cree un objet avec les 5 langues par defaut", function() {
    const result = BaseDTO.createMultilang("Azul", "tz-ltn");
    expect(result).toHaveProperty("fr", "");
    expect(result).toHaveProperty("ar", "");
    expect(result).toHaveProperty("en", "");
    expect(result).toHaveProperty("tz-ltn", "Azul");
    expect(result).toHaveProperty("tz-tfng", "");
  });

  test("merge un objet existant avec la base 5 langues", function() {
    const result = BaseDTO.createMultilang({
      fr: "Bonjour",
      "tz-ltn": SAMPLES.ltn_bonjour,
      "tz-tfng": SAMPLES.tfng_bonjour,
    });
    expect(result.fr).toBe("Bonjour");
    expect(result["tz-ltn"]).toBe(SAMPLES.ltn_bonjour);
    expect(result["tz-tfng"]).toBe(SAMPLES.tfng_bonjour);
    expect(result.ar).toBe("");
  });
});

// ===========================================================================
// 2. BaseDTO.normalizeMultilang — preservation des champs tamazight
// ===========================================================================

describe("BaseDTO.normalizeMultilang — tamazight", function() {

  test("objet avec tz-ltn => preserve tz-ltn", function() {
    const result = BaseDTO.normalizeMultilang({
      fr: "",
      ar: "",
      "tz-ltn": SAMPLES.ltn_culture,
    });
    expect(result["tz-ltn"]).toBe(SAMPLES.ltn_culture);
  });

  test("objet avec tz-tfng => preserve tz-tfng", function() {
    const result = BaseDTO.normalizeMultilang({
      fr: "",
      "tz-tfng": SAMPLES.tfng_culture,
    });
    expect(result["tz-tfng"]).toBe(SAMPLES.tfng_culture);
  });

  test("objet avec les 5 langues => toutes preservees", function() {
    const input = {
      fr: "Culture algerienne",
      ar: "الثقافة الجزائرية",
      en: "Algerian culture",
      "tz-ltn": SAMPLES.ltn_culture,
      "tz-tfng": SAMPLES.tfng_culture,
    };
    const result = BaseDTO.normalizeMultilang(input);
    expect(result.fr).toBe("Culture algerienne");
    expect(result.ar).toBe("الثقافة الجزائرية");
    expect(result.en).toBe("Algerian culture");
    expect(result["tz-ltn"]).toBe(SAMPLES.ltn_culture);
    expect(result["tz-tfng"]).toBe(SAMPLES.tfng_culture);
  });

  test("JSON string avec tz-ltn => parse et preserve", function() {
    const json = JSON.stringify({
      fr: "Titre",
      "tz-ltn": SAMPLES.ltn_bonjour,
      "tz-tfng": SAMPLES.tfng_bonjour,
    });
    const result = BaseDTO.normalizeMultilang(json);
    expect(result["tz-ltn"]).toBe(SAMPLES.ltn_bonjour);
    expect(result["tz-tfng"]).toBe(SAMPLES.tfng_bonjour);
  });
});

// ===========================================================================
// 3. BaseDTO._isMultilang — reconnaitra tz-ltn et tz-tfng
// ===========================================================================

describe("BaseDTO._isMultilang — reconnaissance des cles tamazight", function() {
  var dto;
  beforeAll(function() { dto = new BaseDTO({}); });

  test("objet avec tz-ltn seulement => reconnu comme multilingue", function() {
    expect(dto._isMultilang({ "tz-ltn": "Azul" })).toBe(true);
  });

  test("objet avec tz-tfng seulement => reconnu comme multilingue", function() {
    expect(dto._isMultilang({ "tz-tfng": SAMPLES.tfng_bonjour })).toBe(true);
  });

  test("objet avec fr+tz-ltn+tz-tfng => reconnu", function() {
    expect(dto._isMultilang({ fr: "X", "tz-ltn": "Y", "tz-tfng": "Z" })).toBe(true);
  });

  test("objet sans cle multilingue => non reconnu", function() {
    expect(dto._isMultilang({ nom: "Test", id: 1 })).toBe(false);
  });
});

// ===========================================================================
// 4. BaseDTO.extractMultilang — priorite et fallback tamazight
// ===========================================================================

describe("BaseDTO.extractMultilang — tz-ltn et tz-tfng", function() {

  test("lang=tz-ltn => retourne tz-ltn", function() {
    const field = {
      fr: "Bonjour",
      ar: "مرحبا",
      "tz-ltn": SAMPLES.ltn_bonjour,
      "tz-tfng": SAMPLES.tfng_bonjour,
    };
    expect(BaseDTO.extractMultilang(field, "tz-ltn")).toBe(SAMPLES.ltn_bonjour);
  });

  test("lang=tz-tfng => retourne tz-tfng", function() {
    const field = {
      fr: "Bonjour",
      "tz-ltn": SAMPLES.ltn_bonjour,
      "tz-tfng": SAMPLES.tfng_bonjour,
    };
    expect(BaseDTO.extractMultilang(field, "tz-tfng")).toBe(SAMPLES.tfng_bonjour);
  });

  test("lang=tz-ltn mais tz-ltn vide => fallback vers fr", function() {
    const field = { fr: "Bonjour", ar: "", en: "", "tz-ltn": "", "tz-tfng": "" };
    expect(BaseDTO.extractMultilang(field, "tz-ltn")).toBe("Bonjour");
  });

  test("lang=tz-tfng mais tz-tfng vide => fallback vers fr", function() {
    const field = { fr: "Titre", ar: "", en: "", "tz-ltn": "", "tz-tfng": "" };
    expect(BaseDTO.extractMultilang(field, "tz-tfng")).toBe("Titre");
  });

  test("lang=fr mais fr vide, seul tz-ltn presente => fallback vers tz-ltn", function() {
    const field = { fr: "", ar: "", en: "", "tz-ltn": SAMPLES.ltn_bonjour, "tz-tfng": "" };
    expect(BaseDTO.extractMultilang(field, "fr")).toBe(SAMPLES.ltn_bonjour);
  });

  test("lang=ar mais ar vide, seul tz-tfng presente => fallback vers tz-tfng", function() {
    const field = { fr: "", ar: "", en: "", "tz-ltn": "", "tz-tfng": SAMPLES.tfng_bonjour };
    expect(BaseDTO.extractMultilang(field, "ar")).toBe(SAMPLES.tfng_bonjour);
  });

  test("priorite : fr > ar > en > tz-ltn > tz-tfng", function() {
    const all5 = {
      fr: "fr",
      ar: "ar",
      en: "en",
      "tz-ltn": SAMPLES.ltn_bonjour,
      "tz-tfng": SAMPLES.tfng_bonjour,
    };
    // fr demande => fr retourne
    expect(BaseDTO.extractMultilang(all5, "fr")).toBe("fr");
    // tz-ltn demande => tz-ltn retourne (priorite exacte)
    expect(BaseDTO.extractMultilang(all5, "tz-ltn")).toBe(SAMPLES.ltn_bonjour);
  });
});

// ===========================================================================
// 5. BaseDTO.translateRaw — traduction vers tz-ltn et tz-tfng
// ===========================================================================

describe("BaseDTO.translateRaw — traduction tamazight", function() {

  test("traduit un objet vers tz-ltn", function() {
    const raw = {
      id_oeuvre: 1,
      titre: {
        fr: "Bonjour",
        ar: "مرحبا",
        "tz-ltn": SAMPLES.ltn_bonjour,
        "tz-tfng": SAMPLES.tfng_bonjour,
      },
    };
    const result = BaseDTO.translateRaw(raw, "tz-ltn");
    expect(result.titre).toBe(SAMPLES.ltn_bonjour);
  });

  test("traduit un objet vers tz-tfng", function() {
    const raw = {
      titre: {
        fr: "Lumiere",
        "tz-ltn": "Tafat",
        "tz-tfng": SAMPLES.tfng_culture,
      },
    };
    const result = BaseDTO.translateRaw(raw, "tz-tfng");
    expect(result.titre).toBe(SAMPLES.tfng_culture);
  });

  test("champ tz-ltn vide => fallback vers fr lors de translateRaw", function() {
    const raw = {
      titre: { fr: "Titre FR", ar: "", "tz-ltn": "", "tz-tfng": "" },
    };
    const result = BaseDTO.translateRaw(raw, "tz-ltn");
    expect(result.titre).toBe("Titre FR");
  });

  test("tableau d objets traduit en tz-tfng", function() {
    const raw = [
      { titre: { fr: "A", "tz-tfng": "ⴰ" } },
      { titre: { fr: "B", "tz-tfng": "ⴱ" } },
    ];
    const result = BaseDTO.translateRaw(raw, "tz-tfng");
    expect(result[0].titre).toBe("ⴰ");
    expect(result[1].titre).toBe("ⴱ");
  });
});

// ===========================================================================
// 6. CreateOeuvreDTO — validation avec Tamazight
// ===========================================================================

describe("CreateOeuvreDTO — validation Tamazight", function() {

  test("titre tz-ltn seul => valide via fallback extractMultilang", function() {
    const dto = CreateOeuvreDTO.fromRequest({
      titre: { fr: "", ar: "", en: "", "tz-ltn": SAMPLES.ltn_culture, "tz-tfng": "" },
      description: { "tz-ltn": "Timghirin n Lezzayer" },
      id_type_oeuvre: 1,
      id_langue: 1,
    }, 99);
    const v = dto.validate();
    expect(v.valid).toBe(true);
  });

  test("titre tz-tfng seul => valide via fallback extractMultilang", function() {
    const dto = CreateOeuvreDTO.fromRequest({
      titre: { fr: "", ar: "", en: "", "tz-ltn": "", "tz-tfng": SAMPLES.tfng_culture },
      description: { "tz-tfng": SAMPLES.tfng_bonjour },
      id_type_oeuvre: 1,
      id_langue: 1,
    }, 99);
    const v = dto.validate();
    expect(v.valid).toBe(true);
  });

  test("toutes les 5 langues => valide, toEntity preserve tout", function() {
    const titre5 = {
      fr: "Culture",
      ar: "ثقافة",
      en: "Culture",
      "tz-ltn": SAMPLES.ltn_culture,
      "tz-tfng": SAMPLES.tfng_culture,
    };
    const dto = CreateOeuvreDTO.fromRequest({
      titre: titre5,
      description: { fr: "Desc", ar: "وصف" },
      id_type_oeuvre: 1,
      id_langue: 1,
    }, 99);
    const v = dto.validate();
    expect(v.valid).toBe(true);

    const entity = dto.toEntity();
    expect(entity.titre["tz-ltn"]).toBe(SAMPLES.ltn_culture);
    expect(entity.titre["tz-tfng"]).toBe(SAMPLES.tfng_culture);
    expect(entity.titre.fr).toBe("Culture");
  });

  test("titre tz-ltn seul => protection anti-doublon skippee (fr et ar vides)", async function() {
    // Si seul tz-ltn est fourni, titreFr et titreAr sont vides
    // => le bloc anti-doublon est skip (comportement documente)
    const titreStored = { fr: "", ar: "", "tz-ltn": SAMPLES.ltn_bonjour, "tz-tfng": "" };
    const ctx = buildService(titreStored);
    const payload = livrePayload(titreStored, { "tz-ltn": "Timghirin" });

    await ctx.service.create(payload, 99);

    // findOne (anti-doublon) non appele puisque fr et ar sont vides
    expect(ctx.repository.model.findOne).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// 7. Service end-to-end — Tamazight stocke et retourne
// ===========================================================================

describe("OeuvreService.create() — Tamazight end-to-end", function() {

  test("titre {fr, tz-ltn, tz-tfng} correctement passe a repository.create", async function() {
    const titreInput = {
      fr: "Culture algerienne",
      ar: "",
      en: "",
      "tz-ltn": SAMPLES.ltn_culture,
      "tz-tfng": SAMPLES.tfng_culture,
    };
    const ctx = buildService(titreInput);
    const payload = livrePayload(titreInput);
    await ctx.service.create(payload, 99);

    const entity = ctx.repository.create.mock.calls[0][0];
    expect(entity.titre["tz-ltn"]).toBe(SAMPLES.ltn_culture);
    expect(entity.titre["tz-tfng"]).toBe(SAMPLES.tfng_culture);
    expect(entity.titre.fr).toBe("Culture algerienne");
  });

  test("titre tz-tfng seul passe correctement a la DB", async function() {
    const titreInput = {
      fr: "",
      ar: "",
      en: "",
      "tz-ltn": "",
      "tz-tfng": SAMPLES.tfng_bonjour,
    };
    const ctx = buildService(titreInput);
    const payload = livrePayload(titreInput, { "tz-tfng": "ⴰⵙⴳⴳⵯⴰⵙ" });
    await ctx.service.create(payload, 99);

    const entity = ctx.repository.create.mock.calls[0][0];
    expect(entity.titre["tz-tfng"]).toBe(SAMPLES.tfng_bonjour);
    expect(entity.titre.fr).toBe("");
  });

  test("le DTO retourné preserve tz-ltn et tz-tfng dans titre", async function() {
    const titreStored = {
      fr: "Conte",
      "tz-ltn": SAMPLES.ltn_bonjour,
      "tz-tfng": SAMPLES.tfng_bonjour,
    };
    const ctx = buildService(titreStored);
    const payload = livrePayload({
      fr: "Conte",
      "tz-ltn": SAMPLES.ltn_bonjour,
      "tz-tfng": SAMPLES.tfng_bonjour,
    });
    const result = await ctx.service.create(payload, 99);

    expect(result.oeuvre.titre["tz-ltn"]).toBe(SAMPLES.ltn_bonjour);
    expect(result.oeuvre.titre["tz-tfng"]).toBe(SAMPLES.tfng_bonjour);
  });
});

// ===========================================================================
// 8. multiLangSearchBuilder — gestion tz-ltn et tz-tfng
// ===========================================================================

describe("multiLangSearchBuilder — codes hyphenates tz-ltn / tz-tfng", function() {

  test("SUPPORTED_LANGUAGES inclut tz-ltn et tz-tfng", function() {
    expect(SUPPORTED_LANGUAGES).toContain("tz-ltn");
    expect(SUPPORTED_LANGUAGES).toContain("tz-tfng");
    expect(SUPPORTED_LANGUAGES).toHaveLength(5);
  });

  test("buildMultiLangSearch genere $.\"tz-ltn\" avec double quotes", function() {
    const mockSequelize = {
      escape: jest.fn().mockImplementation((v) => "'" + v.replace(/'/g, "''") + "'"),
      literal: jest.fn().mockImplementation((sql) => ({ sql })),
    };

    const conditions = buildMultiLangSearch(mockSequelize, "titre", "Azul");

    // Trouver la condition tz-ltn
    const ltnCond = conditions.find(c => c.sql && c.sql.includes("tz-ltn"));
    expect(ltnCond).toBeTruthy();
    // Doit utiliser $."tz-ltn" (avec double quotes) et non $.tz-ltn
    expect(ltnCond.sql).toMatch(/'\$\."tz-ltn"'/);
  });

  test("buildMultiLangSearch genere $.\"tz-tfng\" avec double quotes", function() {
    const mockSequelize = {
      escape: jest.fn().mockImplementation((v) => "'" + v + "'"),
      literal: jest.fn().mockImplementation((sql) => ({ sql })),
    };

    const conditions = buildMultiLangSearch(mockSequelize, "titre", "ⴰⵣⵓⵍ");

    const tfngCond = conditions.find(c => c.sql && c.sql.includes("tz-tfng"));
    expect(tfngCond).toBeTruthy();
    expect(tfngCond.sql).toMatch(/'\$\."tz-tfng"'/);
  });

  test("buildMultiLangSearch genere $.fr sans double quotes (code sans tiret)", function() {
    const mockSequelize = {
      escape: jest.fn().mockImplementation((v) => "'" + v + "'"),
      literal: jest.fn().mockImplementation((sql) => ({ sql })),
    };

    const conditions = buildMultiLangSearch(mockSequelize, "titre", "test");

    const frCond = conditions.find(c => c.sql && c.sql.includes("$.fr"));
    expect(frCond).toBeTruthy();
    // fr ne doit PAS avoir de double quotes
    expect(frCond.sql).not.toMatch(/'\$\."fr"'/);
    expect(frCond.sql).toMatch(/'\$\.fr'/);
  });

  test("buildMultiLangSearch couvre les 5 langues par defaut", function() {
    const mockSequelize = {
      escape: jest.fn().mockImplementation((v) => "'" + v + "'"),
      literal: jest.fn().mockImplementation((sql) => ({ sql })),
    };

    const conditions = buildMultiLangSearch(mockSequelize, "titre", "culture");
    expect(conditions).toHaveLength(5);
  });
});
