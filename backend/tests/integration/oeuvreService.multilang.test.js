/**
 * Tests multilingue — OeuvreService + BaseDTO + CreateOeuvreDTO
 *
 * Verifie que les champs titre/description sont correctement :
 *   - Normalises (string, JSON string, objet fr/ar/en)
 *   - Valides (au moins fr OU ar requis)
 *   - Stockes en DB avec {fr, ar, en}
 *   - Extraits selon la langue demandee (avec fallback)
 *   - Retournes par le service apres creation
 */

const BaseDTO = require("../../dto/baseDTO");
const CreateOeuvreDTO = require("../../dto/oeuvre/createOeuvreDTO");
const OeuvreService = require("../../services/oeuvre/oeuvreService");
const { subtypeRegistry, initSubtypeServices } = require("../../services/oeuvre/subtypes");

jest.setTimeout(10000);

// ---------------------------------------------------------------------------
// Helpers service
// ---------------------------------------------------------------------------

function makeOeuvreEntity(titreStored) {
  const data = {
    id_oeuvre: 42,
    titre: titreStored,
    description: { fr: "Description", ar: "وصف", en: "Description" },
    id_type_oeuvre: 1,
    id_langue: 1,
    statut: "brouillon",
    saisi_par: 99,
    date_creation: new Date(),
  };
  return Object.assign({ get: () => data }, data);
}

function buildService(titreStored) {
  const models = {
    TypeOeuvre: { findByPk: jest.fn().mockResolvedValue({ id_type_oeuvre: 1 }) },
    OeuvreCategorie: { bulkCreate: jest.fn().mockResolvedValue([]) },
    TagMotCle: {
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id_tag: 1, nom: { fr: "nouveau-tag" } }),
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
    create: jest.fn().mockResolvedValue(makeOeuvreEntity(titreStored || { fr: "Titre", ar: "", en: "" })),
    findById: jest.fn(),
    withTransaction: jest.fn().mockImplementation(async (cb) => cb({ commit: jest.fn(), rollback: jest.fn() })),
  };
  subtypeRegistry._services.clear();
  initSubtypeServices(models);
  const service = new OeuvreService(repository, { models });
  service.cache = { invalidate: jest.fn() };
  return { service, models, repository };
}

function livrePayload(titre, description, overrides) {
  return Object.assign({
    titre: titre,
    description: description || { fr: "Description", ar: "وصف" },
    id_type_oeuvre: 1,
    id_langue: 1,
    categories: [],
    tags: [],
    details_specifiques: { livre: {} },
  }, overrides || {});
}

// ===========================================================================
// 1. BaseDTO — normalizeMultilang
// ===========================================================================

describe("BaseDTO.normalizeMultilang — toutes les formes d entree", function() {

  test("objet {fr, ar, en} => stocke tel quel", function() {
    const result = BaseDTO.normalizeMultilang({ fr: "Titre FR", ar: "عنوان", en: "Title EN" });
    expect(result.fr).toBe("Titre FR");
    expect(result.ar).toBe("عنوان");
    expect(result.en).toBe("Title EN");
  });

  test("objet {fr} seulement => ar et en vides", function() {
    const result = BaseDTO.normalizeMultilang({ fr: "Titre FR" });
    expect(result.fr).toBe("Titre FR");
    expect(result.ar).toBe("");
    expect(result.en).toBe("");
  });

  test("objet {ar} seulement => fr et en vides", function() {
    const result = BaseDTO.normalizeMultilang({ ar: "عنوان" });
    expect(result.ar).toBe("عنوان");
    expect(result.fr).toBe("");
    expect(result.en).toBe("");
  });

  test("string simple => stockee comme fr", function() {
    const result = BaseDTO.normalizeMultilang("Titre simple");
    expect(result.fr).toBe("Titre simple");
    expect(result.ar).toBe("");
  });

  test("JSON string => parse et normalise", function() {
    const json = JSON.stringify({ fr: "Titre FR", ar: "عنوان" });
    const result = BaseDTO.normalizeMultilang(json);
    expect(result.fr).toBe("Titre FR");
    expect(result.ar).toBe("عنوان");
  });

  test("null => {fr:'', ar:'', en:''}", function() {
    const result = BaseDTO.normalizeMultilang(null);
    expect(result).toEqual(expect.objectContaining({ fr: "", ar: "" }));
  });

  test("string vide => fr vide", function() {
    const result = BaseDTO.normalizeMultilang("");
    expect(result.fr).toBe("");
  });
});

// ===========================================================================
// 2. BaseDTO — extractMultilang (priorite et fallback)
// ===========================================================================

describe("BaseDTO.extractMultilang — priorite et fallback", function() {

  test("lang=fr => retourne fr", function() {
    const field = { fr: "Titre FR", ar: "عنوان", en: "Title EN" };
    expect(BaseDTO.extractMultilang(field, "fr")).toBe("Titre FR");
  });

  test("lang=ar => retourne ar", function() {
    const field = { fr: "Titre FR", ar: "عنوان", en: "Title EN" };
    expect(BaseDTO.extractMultilang(field, "ar")).toBe("عنوان");
  });

  test("lang=en => retourne en", function() {
    const field = { fr: "Titre FR", ar: "عنوان", en: "Title EN" };
    expect(BaseDTO.extractMultilang(field, "en")).toBe("Title EN");
  });

  test("lang=en mais en vide => fallback vers fr", function() {
    const field = { fr: "Titre FR", ar: "عنوان", en: "" };
    expect(BaseDTO.extractMultilang(field, "en")).toBe("Titre FR");
  });

  test("lang=fr mais fr vide => fallback vers ar", function() {
    const field = { fr: "", ar: "عنوان", en: "" };
    expect(BaseDTO.extractMultilang(field, "fr")).toBe("عنوان");
  });

  test("lang=ar mais ar vide => fallback vers fr", function() {
    const field = { fr: "Titre FR", ar: "", en: "" };
    expect(BaseDTO.extractMultilang(field, "ar")).toBe("Titre FR");
  });

  test("tous vides => retourne null", function() {
    const field = { fr: "", ar: "", en: "" };
    expect(BaseDTO.extractMultilang(field, "fr")).toBeNull();
  });

  test("string directe => retournee telle quelle", function() {
    expect(BaseDTO.extractMultilang("Titre string", "fr")).toBe("Titre string");
  });

  test("null => retourne null", function() {
    expect(BaseDTO.extractMultilang(null, "fr")).toBeNull();
  });
});

// ===========================================================================
// 3. BaseDTO — translateRaw (traduction recursive)
// ===========================================================================

describe("BaseDTO.translateRaw — traduction recursive", function() {

  test("traduit un objet contenant des champs multilingues", function() {
    const raw = {
      id_oeuvre: 42,
      titre: { fr: "Titre FR", ar: "عنوان", en: "Title EN" },
      description: { fr: "Desc FR", ar: "وصف" },
      statut: "brouillon",
    };
    const result = BaseDTO.translateRaw(raw, "fr");
    expect(result.titre).toBe("Titre FR");
    expect(result.description).toBe("Desc FR");
    expect(result.statut).toBe("brouillon");
    expect(result.id_oeuvre).toBe(42);
  });

  test("traduit en arabe", function() {
    const raw = {
      titre: { fr: "Titre FR", ar: "عنوان", en: "" },
    };
    const result = BaseDTO.translateRaw(raw, "ar");
    expect(result.titre).toBe("عنوان");
  });

  test("traduit un tableau d objets", function() {
    const raw = [
      { titre: { fr: "A", ar: "أ" } },
      { titre: { fr: "B", ar: "ب" } },
    ];
    const result = BaseDTO.translateRaw(raw, "ar");
    expect(result[0].titre).toBe("أ");
    expect(result[1].titre).toBe("ب");
  });

  test("objet vide {} => null (securite React)", function() {
    const raw = { titre: {} };
    const result = BaseDTO.translateRaw(raw, "fr");
    expect(result.titre).toBeNull();
  });

  test("champs non-multilingues (numbers, dates) passes tels quels", function() {
    const raw = { id: 1, prix: 1500, statut: "brouillon" };
    const result = BaseDTO.translateRaw(raw, "fr");
    expect(result.id).toBe(1);
    expect(result.prix).toBe(1500);
    expect(result.statut).toBe("brouillon");
  });
});

// ===========================================================================
// 4. CreateOeuvreDTO — validation multilingue
// ===========================================================================

describe("CreateOeuvreDTO — validation multilingue", function() {

  test("titre fr seul => valide", function() {
    const dto = CreateOeuvreDTO.fromRequest({
      titre: { fr: "Titre FR", ar: "", en: "" },
      description: { fr: "Desc" },
      id_type_oeuvre: 1,
      id_langue: 1,
    }, 99);
    const v = dto.validate();
    expect(v.valid).toBe(true);
  });

  test("titre ar seul => valide", function() {
    const dto = CreateOeuvreDTO.fromRequest({
      titre: { fr: "", ar: "عنوان" },
      description: { ar: "وصف" },
      id_type_oeuvre: 1,
      id_langue: 1,
    }, 99);
    const v = dto.validate();
    expect(v.valid).toBe(true);
  });

  test("titre fr + ar => valide", function() {
    const dto = CreateOeuvreDTO.fromRequest({
      titre: { fr: "Titre", ar: "عنوان", en: "Title" },
      description: { fr: "Desc", ar: "وصف" },
      id_type_oeuvre: 1,
      id_langue: 1,
    }, 99);
    const v = dto.validate();
    expect(v.valid).toBe(true);
  });

  test("titre vide fr ET ar => invalide", function() {
    const dto = CreateOeuvreDTO.fromRequest({
      titre: { fr: "", ar: "" },
      description: { fr: "Desc" },
      id_type_oeuvre: 1,
      id_langue: 1,
    }, 99);
    const v = dto.validate();
    expect(v.valid).toBe(false);
    const titreError = v.errors.find(e => e.field === "titre");
    expect(titreError).toBeTruthy();
  });

  test("description vide fr ET ar => invalide", function() {
    const dto = CreateOeuvreDTO.fromRequest({
      titre: { fr: "Titre" },
      description: { fr: "", ar: "" },
      id_type_oeuvre: 1,
      id_langue: 1,
    }, 99);
    const v = dto.validate();
    expect(v.valid).toBe(false);
    const descError = v.errors.find(e => e.field === "description");
    expect(descError).toBeTruthy();
  });

  test("toEntity() preserves {fr, ar, en} complet pour la DB", function() {
    const dto = CreateOeuvreDTO.fromRequest({
      titre: { fr: "Titre FR", ar: "عنوان", en: "Title EN" },
      description: { fr: "Desc FR", ar: "وصف", en: "Desc EN" },
      id_type_oeuvre: 1,
      id_langue: 1,
    }, 99);
    const entity = dto.toEntity();
    expect(entity.titre).toMatchObject({ fr: "Titre FR", ar: "عنوان", en: "Title EN" });
    expect(entity.description).toMatchObject({ fr: "Desc FR", ar: "وصف", en: "Desc EN" });
  });

  test("JSON string comme titre => parse et normalise avant validation", function() {
    const dto = CreateOeuvreDTO.fromRequest({
      titre: JSON.stringify({ fr: "Titre FR", ar: "عنوان" }),
      description: { fr: "Desc" },
      id_type_oeuvre: 1,
      id_langue: 1,
    }, 99);
    const v = dto.validate();
    expect(v.valid).toBe(true);
    expect(dto.titre.fr).toBe("Titre FR");
    expect(dto.titre.ar).toBe("عنوان");
  });
});

// ===========================================================================
// 5. Service end-to-end — multilingue stocke et retourne correctement
// ===========================================================================

describe("OeuvreService.create() — multilingue end-to-end", function() {

  test("titre {fr, ar, en} correctement passe a repository.create", async function() {
    const titreInput = { fr: "Les Mille et Une Nuits", ar: "ألف ليلة وليلة", en: "One Thousand and One Nights" };
    const ctx = buildService(titreInput);
    const payload = livrePayload(titreInput);
    await ctx.service.create(payload, 99);

    const entityPassedToCreate = ctx.repository.create.mock.calls[0][0];
    expect(entityPassedToCreate.titre).toMatchObject({
      fr: "Les Mille et Une Nuits",
      ar: "ألف ليلة وليلة",
      en: "One Thousand and One Nights",
    });
  });

  test("titre fr-seul => ar et en vides dans entity", async function() {
    const titreInput = { fr: "Titre Francais Seulement", ar: "", en: "" };
    const ctx = buildService(titreInput);
    const payload = livrePayload(titreInput);
    await ctx.service.create(payload, 99);

    const entity = ctx.repository.create.mock.calls[0][0];
    expect(entity.titre.fr).toBe("Titre Francais Seulement");
    expect(entity.titre.ar).toBe("");
  });

  test("titre ar-seul => fr et en vides dans entity", async function() {
    const titreInput = { fr: "", ar: "عنوان عربي فقط" };
    const ctx = buildService(titreInput);
    const payload = livrePayload(titreInput, { fr: "", ar: "وصف عربي" });
    await ctx.service.create(payload, 99);

    const entity = ctx.repository.create.mock.calls[0][0];
    expect(entity.titre.ar).toBe("عنوان عربي فقط");
    expect(entity.titre.fr).toBe("");
  });

  test("description {fr, ar} correctement preservee", async function() {
    const ctx = buildService({ fr: "Titre" });
    const payload = livrePayload(
      { fr: "Titre", ar: "عنوان" },
      { fr: "Description française", ar: "وصف بالعربية", en: "" }
    );
    await ctx.service.create(payload, 99);

    const entity = ctx.repository.create.mock.calls[0][0];
    expect(entity.description.fr).toBe("Description française");
    expect(entity.description.ar).toBe("وصف بالعربية");
  });

  test("le DTO retourne titre normalise avec les 3 langues", async function() {
    const titreStore = { fr: "Conte", ar: "قصة", en: "Tale" };
    const ctx = buildService(titreStore);
    const payload = livrePayload({ fr: "Conte", ar: "قصة", en: "Tale" });
    const result = await ctx.service.create(payload, 99);

    // Le DTO OeuvreDTO expose this.titre comme objet multilingue
    expect(result.oeuvre.titre).toMatchObject({ fr: "Conte", ar: "قصة", en: "Tale" });
  });

  test("tags multilingues resolus par nom fr ou ar", async function() {
    const ctx = buildService({ fr: "Titre" });
    // Simuler des tags existants avec nom multilingue
    ctx.models.TagMotCle.findAll.mockResolvedValue([
      { id_tag: 5, nom: { fr: "patrimoine", ar: "تراث" } },
      { id_tag: 6, nom: { fr: "culture", ar: "ثقافة" } },
    ]);
    const payload = livrePayload({ fr: "Titre" }, undefined, {
      tags: ["patrimoine", "culture", "nouveau-tag"],
    });
    await ctx.service.create(payload, 99);

    // patrimoine et culture existent => pas de create, seulement nouveau-tag
    expect(ctx.models.TagMotCle.create).toHaveBeenCalledTimes(1);
    expect(ctx.models.TagMotCle.create).toHaveBeenCalledWith(
      expect.objectContaining({ nom: { fr: "nouveau-tag" } }),
      expect.any(Object)
    );
    expect(ctx.models.OeuvreTag.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id_tag: 5 }),
        expect.objectContaining({ id_tag: 6 }),
        expect.objectContaining({ id_tag: 1 }), // nouveau tag
      ]),
      expect.any(Object)
    );
  });
});
