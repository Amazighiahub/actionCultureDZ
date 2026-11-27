/**
 * Anti-retour sécurité (2026-11-27, analyse V12, publié avec l'accord de la responsable) :
 * S1 un parcours n'accepte que des lieux publiés et des événements publics ;
 * S3 l'avis « programme modifié » part une fois par événement toutes les 3 heures ;
 * S4 une fiche intervenant liée à un compte n'est jamais « confirmée » par l'organisateur ;
 * S9 la liste publique des intervenants ne se trie pas par une colonne privée.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret-de-test';
const ParcoursService = require('../../services/parcours/parcoursService');
const ProgrammeService = require('../../services/programmeService');

const erreur400 = () => Object.assign(new Error('refus'), { statusCode: 400 });

describe('S1 parcours : étapes publiques seulement', () => {
  const service = (lieu, evenement) => {
    const s = Object.create(ParcoursService.prototype);
    s.repository = { models: { Lieu: { findByPk: jest.fn(async () => lieu) }, Evenement: { findByPk: jest.fn(async () => evenement) } } };
    s._validationError = erreur400;
    return s;
  };
  test('lieu en brouillon : refusé', async () => {
    await expect(service({ statut: 'brouillon' }, null)._verifierEtapes([{ id_lieu: 3 }])).rejects.toMatchObject({ statusCode: 400 });
  });
  test('événement non public : refusé ; publié : accepté', async () => {
    await expect(service({ statut: 'publie' }, { statut: 'brouillon' })._verifierEtapes([{ id_lieu: 3, id_evenement: 9 }])).rejects.toMatchObject({ statusCode: 400 });
    await expect(service({ statut: 'publie' }, { statut: 'publie' })._verifierEtapes([{ id_lieu: 3, id_evenement: 9 }])).resolves.toBeUndefined();
  });
});

describe('S4 intervenant : confirmation', () => {
  const service = (fiche) => {
    const s = Object.create(ProgrammeService.prototype);
    s.models = { Intervenant: { findByPk: jest.fn(async () => fiche) } };
    return s;
  };
  test('fiche liée à un compte : « en attente » même si l’organisateur envoie « confirmé »', async () => {
    expect(await service({ id_user: 42 })._statutInitialIntervenant(5, 'confirme', undefined)).toBe('en_attente');
  });
  test('fiche sans compte : l’organisateur peut confirmer ; statut déjà enregistré gardé', async () => {
    expect(await service({ id_user: null })._statutInitialIntervenant(5, 'confirme', undefined)).toBe('confirme');
    expect(await service({ id_user: 42 })._statutInitialIntervenant(5, 'en_attente', 'confirme')).toBe('confirme');
  });
});

describe('S9 intervenants : tri par colonne publique seulement', () => {
  test('tri par e-mail ou date de naissance refusé ; tri par date de création accepté', async () => {
    const IntervenantRepository = require('../../repositories/intervenantRepository');
    const findAll = jest.fn(async () => []);
    const repo = Object.create(IntervenantRepository.prototype);
    repo.model = { count: jest.fn(async () => 1), findAll, rawAttributes: { email: {}, date_naissance: {}, nom: {} }, name: 'Intervenant' };
    repo.models = {};
    for (const colonne of ['email', 'date_naissance']) {
      await repo.findFiltered({ order: colonne }).catch(() => {});
    }
    await repo.findFiltered({ order: 'date_creation' }).catch(() => {});
    const ordres = findAll.mock.calls.map((c) => JSON.stringify(c[0].order));
    expect(ordres.length).toBeGreaterThan(0);
    for (const o of ordres) expect(o).not.toMatch(/"(email|date_naissance)"/);
    expect(ordres.some((o) => o.includes('date_creation'))).toBe(true);
  });
});
