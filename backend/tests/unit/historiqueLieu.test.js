/**
 * Modifications des textes d'un lieu : historique (anciennes valeurs gardées), notifications
 * (créateur + administration, sauf l'auteur) et retour à une version précédente.
 * Personnes fictives.
 */
jest.mock('../../utils/notifierModeration', () => ({
  idsAdministrateurs: jest.fn().mockResolvedValue([1, 7]),
  notifier: jest.fn().mockResolvedValue(undefined)
}));
const { idsAdministrateurs, notifier } = require('../../utils/notifierModeration');
const {
  enregistrerModifications, notifierTextes, notifierModification, listerHistorique, restaurer
} = require('../../services/patrimoine/historiqueLieu');

const modeles = (extra = {}) => {
  const lignes = [];
  return {
    lignes,
    HistoriqueLieu: {
      bulkCreate: jest.fn(async (rows) => { lignes.push(...rows); return rows; }),
      findOne: jest.fn(),
      findAll: jest.fn()
    },
    Lieu: { findByPk: jest.fn().mockResolvedValue({ id_lieu: 5, nom: { fr: 'Tkout', ar: 'تكوت' }, id_createur: 12 }) },
    User: { findByPk: jest.fn().mockResolvedValue({ nom: { fr: 'Bensaid' }, prenom: { fr: 'Karim' } }) },
    DetailLieu: { findOne: jest.fn() },
    sequelize: { transaction: jest.fn(async (cb) => cb('t')) },
    ...extra
  };
};

beforeEach(() => jest.clearAllMocks());

describe('Historique des textes', () => {
  it('seuls les textes réellement changés sont gardés, avec leur ancienne valeur', async () => {
    const m = modeles();
    const champs = await enregistrerModifications(m, {
      idLieu: 5, idUser: 40,
      avant: { histoire: { fr: 'Les origines' }, description: { fr: 'Village' }, horaires: null },
      apres: { histoire: { fr: 'Les origines', ar: 'الأصول' }, description: { fr: 'Village' }, latitude: 35 },
      transaction: 't'
    });
    expect(champs).toEqual(['histoire']);
    expect(m.lignes).toEqual([{
      id_lieu: 5, champ: 'histoire', ancienne_valeur: { fr: 'Les origines' }, nouvelle_valeur: { fr: 'Les origines', ar: 'الأصول' },
      id_user: 40, id_historique_restaure: null
    }]);
    expect(m.HistoriqueLieu.bulkCreate).toHaveBeenCalledWith(expect.any(Array), { transaction: 't' });
  });

  it('rien de changé : aucune ligne', async () => {
    const m = modeles();
    expect(await enregistrerModifications(m, { idLieu: 5, avant: { histoire: '{"fr":"A"}' }, apres: { histoire: { fr: 'A' } } })).toEqual([]);
    expect(m.HistoriqueLieu.bulkCreate).not.toHaveBeenCalled();
  });
});

describe('Notifications', () => {
  it('créateur et administrateurs prévenus, pas l’auteur : qui, quoi, quel lieu', async () => {
    const m = modeles();
    await notifierTextes(m, 'service', { idLieu: 5, idUser: 7, champs: ['histoire', 'referencesHistoriques'] });
    expect(idsAdministrateurs).toHaveBeenCalled();
    expect(notifier.mock.calls.map(c => c[1]).sort()).toEqual([1, 12]);
    expect(notifier).toHaveBeenCalledWith('service', 12, expect.objectContaining({
      titre: 'Modification d’un lieu',
      message: 'Karim Bensaid a modifié l’histoire et les références historiques de « Tkout ».',
      url_action: '/patrimoine/5'
    }));
  });

  it('aucun texte changé : personne n’est prévenu', async () => {
    await notifierTextes(modeles(), 'service', { idLieu: 5, idUser: 7, champs: [] });
    expect(notifier).not.toHaveBeenCalled();
  });

  it('une erreur de notification n’empêche rien', async () => {
    const m = modeles({ Lieu: { findByPk: jest.fn().mockRejectedValue(new Error('base indisponible')) } });
    await expect(notifierModification(m, 'service', { idLieu: 5, idUser: 7, action: 'a ajouté le monument « Bassin » à' })).resolves.toBeUndefined();
  });
});

describe('Retour à une version précédente', () => {
  it('le texte reprend exactement son ancienne valeur, et ce retour est lui-même gardé', async () => {
    const detail = { histoire: { fr: 'Texte abîmé' }, update: jest.fn() };
    const m = modeles();
    m.HistoriqueLieu.findOne.mockResolvedValue({ id_historique: 9, id_lieu: 5, champ: 'histoire', ancienne_valeur: { fr: 'Les origines', ar: 'الأصول' } });
    m.DetailLieu.findOne.mockResolvedValue(detail);
    expect(await restaurer(m, { idLieu: 5, idHistorique: 9, idUser: 1 })).toEqual({ champ: 'histoire' });
    expect(detail.update).toHaveBeenCalledWith({ histoire: { fr: 'Les origines', ar: 'الأصول' } }, { transaction: 't' });
    expect(m.lignes[0]).toMatchObject({ champ: 'histoire', ancienne_valeur: { fr: 'Texte abîmé' }, id_historique_restaure: 9, id_user: 1 });
  });

  it('le nom se restaure sur le lieu ; une version sans nom est refusée', async () => {
    const lieu = { nom: { fr: 'Tkoutt' }, update: jest.fn() };
    const m = modeles();
    m.Lieu.findByPk.mockResolvedValue(lieu);
    m.HistoriqueLieu.findOne.mockResolvedValue({ id_historique: 3, champ: 'nom', ancienne_valeur: { fr: 'Tkout' } });
    await restaurer(m, { idLieu: 5, idHistorique: 3, idUser: 1 });
    expect(lieu.update).toHaveBeenCalledWith({ nom: { fr: 'Tkout' } }, { transaction: 't' });

    m.HistoriqueLieu.findOne.mockResolvedValue({ id_historique: 4, champ: 'nom', ancienne_valeur: null });
    await expect(restaurer(m, { idLieu: 5, idHistorique: 4, idUser: 1 })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('ligne d’un autre lieu : introuvable', async () => {
    const m = modeles();
    m.HistoriqueLieu.findOne.mockResolvedValue(null);
    expect(await restaurer(m, { idLieu: 5, idHistorique: 99, idUser: 1 })).toBeNull();
    expect(m.HistoriqueLieu.findOne).toHaveBeenCalledWith({ where: { id_historique: 99, id_lieu: 5 } });
  });
});

describe('Liste', () => {
  it('auteur lisible et libellé du texte', async () => {
    const m = modeles();
    m.HistoriqueLieu.findAll.mockResolvedValue([{
      id_historique: 2, champ: 'referencesHistoriques', ancienne_valeur: '{"fr":"[1] Wikipédia"}', nouvelle_valeur: { fr: '' },
      date_creation: new Date('2026-10-26T19:13:19Z'), id_historique_restaure: null, Auteur: { nom: { fr: 'Ferhat' }, prenom: { fr: 'Nadia' } }
    }]);
    const [ligne] = await listerHistorique(m, 5);
    expect(ligne).toMatchObject({ libelle: 'les références historiques', auteur: 'Nadia Ferhat', ancienne_valeur: { fr: '[1] Wikipédia' } });
  });
});
