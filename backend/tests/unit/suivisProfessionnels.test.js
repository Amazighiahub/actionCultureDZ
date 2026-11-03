/**
 * Suivre un professionnel : profil public seulement, pas soi-même, notification par lots sans e-mail,
 * réglage de la personne respecté, et une panne ne bloque jamais la publication.
 */
const suivis = require('../../services/suivisProfessionnels');

const modeles = ({ pro = { id_user: 5 }, lignes = [], destinataires = [] } = {}) => ({
  User: {
    findOne: jest.fn(async () => pro),
    findAll: jest.fn(async () => destinataires),
  },
  SuiviProfessionnel: {
    findOrCreate: jest.fn(async () => [{}, true]),
    destroy: jest.fn(async () => 1),
    count: jest.fn(async () => 3),
    findOne: jest.fn(async () => ({ id_suivi: 1 })),
    findAll: jest.fn(async () => lignes),
  },
  Notification: { bulkCreate: jest.fn(async () => []) },
});

describe('suivre', () => {
  it('enregistre le suivi une seule fois', async () => {
    const m = modeles();
    await suivis.suivre(m, 7, 5);
    expect(m.SuiviProfessionnel.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({ where: { id_user: 7, id_professionnel: 5 } }));
  });

  it('on ne se suit pas soi-même', async () => {
    await expect(suivis.suivre(modeles(), 5, 5)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('un profil privé, suspendu ou non professionnel ne se suit pas', async () => {
    const m = modeles({ pro: null });
    await expect(suivis.suivre(m, 7, 5)).rejects.toMatchObject({ statusCode: 404 });
    const filtre = m.User.findOne.mock.calls[0][0].where;
    expect(filtre).toMatchObject({ statut: 'actif', profil_public: true, accepte_conditions: true });
  });

  it('l’arrêt ne touche que cette personne', async () => {
    const m = modeles();
    await suivis.nePlusSuivre(m, 7, 5);
    expect(m.SuiviProfessionnel.destroy).toHaveBeenCalledWith({ where: { id_user: 7, id_professionnel: 5 } });
  });

  it('un visiteur voit le nombre, sans savoir qui suit', async () => {
    const m = modeles();
    expect(await suivis.etat(m, 5)).toEqual({ total: 3, suit: false });
    expect(m.SuiviProfessionnel.findOne).not.toHaveBeenCalled();
  });
});

describe('prévenir les abonnés', () => {
  const contenu = { titre: 'Nouvelle publication', message: 'x', url_action: '/oeuvres/9', type_notification: 'nouvelle_oeuvre' };

  it('crée une notification par abonné, sans e-mail', async () => {
    const m = modeles({ lignes: [{ id_suivi: 1, id_user: 7 }, { id_suivi: 2, id_user: 8 }], destinataires: [{ id_user: 7 }, { id_user: 8 }] });
    expect(await suivis.prevenirAbonnes(m, 5, contenu)).toBe(2);
    const lignes = m.Notification.bulkCreate.mock.calls[0][0];
    expect(lignes.map(l => l.id_user)).toEqual([7, 8]);
    expect(lignes[0]).toMatchObject({ url_action: '/oeuvres/9', email_envoye: false });
  });

  it('respecte le réglage et le statut de la personne', async () => {
    const m = modeles({ lignes: [{ id_suivi: 1, id_user: 7 }], destinataires: [] });
    expect(await suivis.prevenirAbonnes(m, 5, contenu)).toBe(0);
    expect(m.User.findAll.mock.calls[0][0].where).toMatchObject({ statut: 'actif' });
    expect(m.Notification.bulkCreate).not.toHaveBeenCalled();
  });

  it('une panne ne fait pas échouer la publication', async () => {
    const m = modeles();
    m.SuiviProfessionnel.findAll = jest.fn(async () => { throw new Error('panne'); });
    await expect(suivis.prevenirAbonnes(m, 5, contenu)).resolves.toBe(0);
  });
});
