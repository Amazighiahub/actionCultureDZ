/**
 * Doublons de lieux : « COMMUNE  AIT SMAIL » a été créé à côté de « Aït Smaïl » (même commune),
 * car le contrôle comparait le texte exact (et, côté patrimoine, ne trouvait jamais rien).
 */
const mockContainer = {};
jest.mock('../../services/serviceContainer', () => mockContainer);
const { cleNomLieu, nomsSimilaires, textesNom } = require('../../utils/nomLieu');
const controller = require('../../controllers/patrimoineController');

describe('nomLieu', () => {
  it('accents, casse, espaces et mots génériques ignorés', () => {
    expect(cleNomLieu('COMMUNE  AIT SMAIL')).toBe('ait smail');
    expect(cleNomLieu('Aït Smaïl')).toBe('ait smail');
    expect(nomsSimilaires('COMMUNE  AIT SMAIL', 'Aït Smaïl')).toBe(true);
    expect(nomsSimilaires('Village de Tichy', 'Tichy')).toBe(true);
  });

  it('arabe : préfixe « بلدية » ignoré ; noms différents non confondus', () => {
    expect(nomsSimilaires('بلدية آيت إسماعيل', 'آيت إسماعيل')).toBe(true);
    expect(nomsSimilaires('Tichy', 'Darguina')).toBe(false);
    expect(nomsSimilaires('Commune', 'Ville')).toBe(false); // rien d'exploitable
  });

  it('textesNom : objet multilingue, JSON ou texte', () => {
    expect(textesNom({ fr: 'Aït Smaïl', ar: 'آيت إسماعيل', en: '' })).toEqual(['Aït Smaïl', 'آيت إسماعيل']);
    expect(textesNom('{"fr":"Tichy"}')).toEqual(['Tichy']);
    expect(textesNom('Tichy')).toEqual(['Tichy']);
  });
});

describe('PatrimoineController.checkDuplicate', () => {
  it('« COMMUNE AIT SMAIL » dans la commune d’« Aït Smaïl » : signalé', async () => {
    const findAll = jest.fn().mockResolvedValue([
      { id_lieu: 39, nom: { fr: 'Aït Smaïl', ar: '' }, typePatrimoine: 'ville_village' },
      { id_lieu: 50, nom: { fr: 'Fontaine du village' }, typePatrimoine: 'monument' }
    ]);
    mockContainer.patrimoineService = { models: { Lieu: { findAll } } };
    const res = { json: jest.fn(), status: jest.fn(() => res) };
    await controller.checkDuplicate({ query: { nom: 'COMMUNE  AIT SMAIL', communeId: '193' } }, res);

    expect(findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { communeId: 193, id_lieu_parent: null } }));
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { exists: true, sites: [{ id_lieu: 39, nom: { fr: 'Aït Smaïl', ar: '' }, typePatrimoine: 'ville_village' }] }
    });
  });
});
