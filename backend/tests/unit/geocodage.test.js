/**
 * Recherche d'adresse par le serveur (OpenStreetMap) et commune d'un nouveau lieu.
 * Avant : appels directs du navigateur refusés ; commune cherchée sur Daira.id_wilaya (colonne
 * inexistante), chaque création de lieu échouait.
 */
const geocodage = require('../../services/geocodage');
const LieuRepository = require('../../repositories/lieuRepository');

const reponse = (donnees, ok = true, status = 200) => ({ ok, status, json: async () => donnees });

describe('géocodage par le serveur', () => {
  beforeEach(() => geocodage._viderCache());

  it('s’identifie, limite aux résultats utiles, garde en mémoire', async () => {
    const envoyer = jest.fn().mockResolvedValue(reponse([{ lat: '33.8', lon: '2.88', display_name: 'Laghouat', place_id: 1, licence: 'x', address: { town: 'Laghouat', state: 'Laghouat' } }]));
    const r = await geocodage.rechercher('Laghouat', { envoyer });
    expect(r).toEqual([{ lat: '33.8', lon: '2.88', display_name: 'Laghouat', address: { town: 'Laghouat', state: 'Laghouat' } }]);
    const [url, options] = envoyer.mock.calls[0];
    expect(url).toContain('countrycodes=dz');
    expect(options.headers['User-Agent']).toMatch(/^TalaDZ\//);
    await geocodage.rechercher('Laghouat', { envoyer });
    expect(envoyer).toHaveBeenCalledTimes(1);
  });

  it('texte trop court : rien ; Nominatim et Photon refusent : 503 lisible', async () => {
    const envoyer = jest.fn().mockResolvedValue(reponse({}, false, 429));
    await expect(geocodage.rechercher('ab', { envoyer })).resolves.toEqual([]);
    await expect(geocodage.rechercher('Aflou', { envoyer })).rejects.toMatchObject({ statusCode: 503 });
  });

  it('Nominatim refuse : Photon prend le relais (hors Algérie écarté), puis seul pendant la pause', async () => {
    const photon = { features: [
      { geometry: { coordinates: [2.18, 34.11] }, properties: { name: 'Aflou', city: 'Aflou', county: 'Daïra Aflou', state: 'Laghouat', country: 'Algérie', countrycode: 'DZ' } },
      { geometry: { coordinates: [8.1, 36.8] }, properties: { name: 'Ailleurs', countrycode: 'TN' } }
    ] };
    const envoyer = jest.fn(async (url) => (url.includes('nominatim') ? reponse({}, false, 429) : reponse(photon)));
    const r = await geocodage.rechercher('Aflou', { envoyer });
    expect(r).toEqual([{ lat: '34.11', lon: '2.18', display_name: 'Aflou, Daïra Aflou, Laghouat, Algérie',
      address: { road: undefined, city: 'Aflou', county: 'Daïra Aflou', state: 'Laghouat', postcode: undefined, country: 'Algérie' } }]);
    expect(envoyer.mock.calls[1][0]).toMatch(/^https:\/\/photon\.komoot\.io\/api\/\?/);
    await geocodage.rechercher('Laghouat centre', { envoyer });
    expect(envoyer.mock.calls.filter(([u]) => u.includes('nominatim'))).toHaveLength(1);
  });

  it('point invalide : null sans appel', async () => {
    const envoyer = jest.fn();
    await expect(geocodage.inverser('abc', 3, { envoyer })).resolves.toBeNull();
    expect(envoyer).not.toHaveBeenCalled();
  });
});

describe('commune d’un nouveau lieu', () => {
  const communes = [
    { id_commune: 301, nom: 'الأغواط', commune_name_ascii: 'Laghouat' },
    { id_commune: 302, nom: 'أفلو', commune_name_ascii: 'Aflou' }
  ];
  const depot = () => {
    const r = Object.create(LieuRepository.prototype);
    r.models = {
      Daira: {},
      Wilaya: { findAll: jest.fn().mockResolvedValue([{ id_wilaya: 3, nom: 'الأغواط', wilaya_name_ascii: 'Laghouat' }]) },
      Commune: { findAll: jest.fn().mockResolvedValue(communes) }
    };
    return r;
  };

  it('dans la wilaya : la commune du point, sinon la première ; filtre sur wilayaId', async () => {
    const r = depot();
    expect((await r.findCommuneByWilaya(3, { communeNom: 'Aflou' })).id_commune).toBe(302);
    expect(r.models.Commune.findAll.mock.calls[0][0].include[0].where).toEqual({ wilayaId: 3 });
    expect((await r.findCommuneByWilaya(3, { communeNom: 'Inconnue' })).id_commune).toBe(301);
  });

  it('sans wilaya choisie : wilaya du point (« Wilaya de Laghouat »)', async () => {
    const r = depot();
    expect((await r.findCommuneByWilaya(undefined, { communeNom: 'Aflou', wilayaNom: 'Wilaya de Laghouat' })).id_commune).toBe(302);
  });

  it('rien pour trouver : null (le contrôleur répond 400)', async () => {
    const r = depot();
    r.models.Wilaya.findAll.mockResolvedValue([]);
    await expect(r.findCommuneByWilaya(undefined, {})).resolves.toBeNull();
  });
});
