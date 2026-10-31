/**
 * Musique : champs de l'album (format, titres, liens d'écoute, instruments) et genre déduit des catégories.
 */
const AlbumMusicalDTO = require('../../dto/oeuvre/subtypes/albumMusicalDTO');
const AlbumMusicalSubService = require('../../services/oeuvre/subtypes/albumMusicalSubService');

const valider = (data) => AlbumMusicalDTO.fromRequest(data).validate();

describe('AlbumMusicalDTO', () => {
  test('accepte un album complet', () => {
    const r = valider({
      format: 'single', nb_pistes: 1, label: 'Indépendant',
      pistes: [{ titre: 'Ya Rayah', duree: '4:12' }],
      liens_ecoute: [{ url: 'https://www.youtube.com/watch?v=abc' }],
      instruments: ['mandole', 'derbouka']
    });
    expect(r.valid).toBe(true);
  });

  test('refuse un format inconnu', () => {
    expect(valider({ format: 'cassette' }).valid).toBe(false);
  });

  test("refuse un lien d'écoute qui n'est pas en https", () => {
    for (const url of ['javascript:alert(1)', 'http://exemple.com', 'pas un lien']) {
      const r = valider({ liens_ecoute: [{ url }] });
      expect(r.valid).toBe(false);
      expect(r.errors[0].field).toBe('liens_ecoute');
    }
  });

  test('refuse un nombre de pistes impossible', () => {
    expect(valider({ nb_pistes: 0 }).valid).toBe(false);
    expect(valider({ nb_pistes: 'abc' }).valid).toBe(false);
    expect(valider({ nb_pistes: 12 }).valid).toBe(true);
  });

  test('nettoie titres, liens et instruments', () => {
    const e = AlbumMusicalDTO.fromRequest({
      pistes: [{ titre: '  Ya Rayah ', duree: '4:12' }, { titre: '' }, null],
      liens_ecoute: [' https://a.example.com ', { url: 'https://a.example.com' }, { url: '' }],
      instruments: [' mandole ', 'mandole', '']
    }).toEntity();
    expect(e.pistes).toEqual([{ titre: 'Ya Rayah', duree: '4:12', compositeur: '' }]);
    expect(e.liens_ecoute).toEqual([{ url: 'https://a.example.com' }]);
    expect(e.instruments).toEqual(['mandole']);
  });

  test('listes vides enregistrées comme absentes', () => {
    const e = AlbumMusicalDTO.fromRequest({ pistes: [], liens_ecoute: [], instruments: [] }).toEntity();
    expect(e.pistes).toBeNull();
    expect(e.liens_ecoute).toBeNull();
    expect(e.instruments).toBeNull();
  });
});

describe('AlbumMusicalSubService — genre et nouveaux champs', () => {
  const modeles = (categories = [], genresMusique = [], liens = []) => ({
    AlbumMusical: { create: jest.fn(async (d) => d), findOne: jest.fn() },
    OeuvreCategorie: { findAll: jest.fn(async () => categories) },
    TypeOeuvreGenre: {
      findAll: jest.fn(async () => genresMusique),
      findOne: jest.fn(async () => ({ id_genre: 26 }))
    },
    // Comme la base : seuls les liens vers un genre musical actif sont renvoyés
    GenreCategorie: { findAll: jest.fn(async ({ where }) => liens.filter((l) => where.id_genre.includes(l.id_genre))) }
  });

  test('prend le genre de la première catégorie choisie (pas « Rock » par défaut)', async () => {
    const m = modeles(
      [{ id_categorie: 500 }, { id_categorie: 501 }],
      [{ id_genre: 26 }, { id_genre: 38 }],
      [{ id_genre: 38, id_categorie: 501 }, { id_genre: 39, id_categorie: 500 }]
    );
    // 500 est reliée au genre 39, qui n'est pas un genre musical actif : on prend 38 (catégorie 501)
    const service = new AlbumMusicalSubService(m);
    await service.createForOeuvre(7, { duree: '45:30' }, {});
    expect(m.AlbumMusical.create).toHaveBeenCalledWith(expect.objectContaining({ id_oeuvre: 7, id_genre: 38, duree: 45 }), { transaction: {} });
    expect(m.TypeOeuvreGenre.findOne).not.toHaveBeenCalled();
  });

  test('sans catégorie musicale, repli sur le premier genre du type', async () => {
    const m = modeles([], [{ id_genre: 26 }], []);
    await new AlbumMusicalSubService(m).createForOeuvre(7, {}, {});
    expect(m.AlbumMusical.create).toHaveBeenCalledWith(expect.objectContaining({ id_genre: 26 }), { transaction: {} });
  });

  test('enregistre format, nombre de pistes, titres, liens et instruments', async () => {
    const m = modeles();
    await new AlbumMusicalSubService(m).createForOeuvre(7, {
      id_genre: 38, format: 'ep', nb_pistes: '4',
      pistes: [{ titre: 'Un' }], liens_ecoute: [{ url: 'https://open.spotify.com/album/x' }], instruments: ['guembri']
    }, {});
    expect(m.AlbumMusical.create).toHaveBeenCalledWith(expect.objectContaining({
      format: 'ep', nb_pistes: 4,
      pistes: [{ titre: 'Un', duree: '', compositeur: '' }],
      liens_ecoute: [{ url: 'https://open.spotify.com/album/x' }],
      instruments: ['guembri']
    }), { transaction: {} });
  });

  test('refuse un lien non https à la création', async () => {
    const m = modeles();
    await expect(new AlbumMusicalSubService(m).createForOeuvre(7, { liens_ecoute: [{ url: 'javascript:alert(1)' }] }, {}))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(m.AlbumMusical.create).not.toHaveBeenCalled();
  });

  test('modification : le genre suit les catégories et seuls les champs envoyés changent', async () => {
    const existant = { update: jest.fn() };
    const m = modeles([{ id_categorie: 501 }], [{ id_genre: 38 }], [{ id_genre: 38, id_categorie: 501 }]);
    m.AlbumMusical.findOne.mockResolvedValue(existant);
    await new AlbumMusicalSubService(m).updateForOeuvre(7, { instruments: ['imzad'] }, {});
    expect(existant.update).toHaveBeenCalledWith({ id_genre: 38, instruments: ['imzad'] }, { transaction: {} });
  });
});
