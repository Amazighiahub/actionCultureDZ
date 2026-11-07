/**
 * Messages des professionnels : personnalisés, contenu vérifié, un envoi par jour, seulement à leur
 * public ; notifications de commentaire sans se prévenir soi-même, réglage de chacun respecté.
 */
jest.mock('../../utils/redisClient', () => ({ getClient: () => null }));

const messages = require('../../services/messagesProfessionnels');

let idPro = 100;
const modeles = ({ abonnes = [{ id_user: 7 }], personnes = [{ id_user: 7, prenom: { fr: 'Amina' }, langue_preferee: 'fr' }], oeuvre = { id_oeuvre: 9, titre: { fr: 'Un livre' }, id_type_oeuvre: 1 }, evenement = null, inscrits = [] } = {}) => ({
  User: {
    findByPk: jest.fn(async () => ({ nom: 'Dahmani', prenom: 'Sami' })),
    findAll: jest.fn(async () => personnes),
  },
  SuiviProfessionnel: { findAll: jest.fn(async () => abonnes), count: jest.fn(async () => abonnes.length) },
  Oeuvre: { findOne: jest.fn(async () => oeuvre), findAll: jest.fn(async () => (oeuvre ? [oeuvre] : [])) },
  Evenement: { findOne: jest.fn(async () => evenement), findAll: jest.fn(async () => (evenement ? [evenement] : [])) },
  EvenementUser: { findAll: jest.fn(async () => inscrits) },
  Notification: { bulkCreate: jest.fn(async () => []), create: jest.fn(async () => ({})) },
});
const envoyes = m => m.Notification.bulkCreate.mock.calls.flatMap(c => c[0]);

beforeEach(() => { idPro += 1; });

describe('message déjà rédigé', () => {
  it('est personnalisé au prénom et invite à commenter', async () => {
    const m = modeles();
    expect(await messages.envoyer(m, idPro, { modele: 'oeuvre', id_oeuvre: 9 })).toEqual({ prevenus: 1 });
    expect(envoyes(m)[0]).toMatchObject({ id_user: 7, url_action: '/oeuvres/9', email_envoye: false });
    expect(envoyes(m)[0].message).toBe('Bonjour Amina, Sami Dahmani vous invite à découvrir « Un livre ». Donnez votre avis en commentaire !');
  });

  it('suit la langue de la personne', async () => {
    const m = modeles({ personnes: [{ id_user: 7, prenom: 'أمينة', langue_preferee: 'ar' }] });
    await messages.envoyer(m, idPro, { modele: 'oeuvre', id_oeuvre: 9 });
    expect(envoyes(m)[0].message).toContain('مرحبًا أمينة');
  });

  it('refuse une œuvre qui n’est pas à lui ou pas publiée', async () => {
    const m = modeles({ oeuvre: null });
    await expect(messages.envoyer(m, idPro, { modele: 'oeuvre', id_oeuvre: 9 })).rejects.toMatchObject({ statusCode: 400 });
    expect(m.Oeuvre.findOne.mock.calls[0][0].where).toMatchObject({ saisi_par: idPro, statut: 'publie' });
    expect(m.Notification.bulkCreate).not.toHaveBeenCalled();
  });

  it('refuse un message inconnu : pas de texte libre', async () => {
    await expect(messages.envoyer(modeles(), idPro, { modele: 'texte libre' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('un seul envoi par jour', async () => {
    const m = modeles();
    await messages.envoyer(m, idPro, { modele: 'profil' });
    await expect(messages.envoyer(m, idPro, { modele: 'profil' })).rejects.toMatchObject({ statusCode: 429 });
    expect(m.Notification.bulkCreate).toHaveBeenCalledTimes(1);
  });

  it('sans abonné, rien ne part et le quota du jour reste disponible', async () => {
    const m = modeles({ abonnes: [] });
    await expect(messages.envoyer(m, idPro, { modele: 'profil' })).rejects.toMatchObject({ statusCode: 400 });
    await expect(messages.envoyer(modeles(), idPro, { modele: 'profil' })).resolves.toEqual({ prevenus: 1 });
  });

  it('« Abonnez-vous » vise les participants qui ne le suivent pas encore', async () => {
    const m = modeles({
      abonnes: [{ id_user: 7 }],
      evenement: { id_evenement: 2 },
      inscrits: [{ id_user: 7 }, { id_user: 8 }, { id_user: idPro }],
      personnes: [{ id_user: 8, prenom: 'Lina', langue_preferee: 'fr' }],
    });
    await messages.envoyer(m, idPro, { modele: 'suivre' });
    expect(m.User.findAll.mock.calls[0][0].where.id_user).toEqual([8]);
    expect(envoyes(m)[0].url_action).toBe(`/professionnels/${idPro}`);
  });

  it('respecte le réglage de la personne', async () => {
    const m = modeles({ personnes: [] });
    expect(await messages.envoyer(m, idPro, { modele: 'profil' })).toEqual({ prevenus: 0 });
    expect(m.User.findAll.mock.calls[0][0].where).toMatchObject({ statut: 'actif' });
  });
});

describe('commentaire', () => {
  const contexte = (extra = {}) => {
    const m = modeles({ personnes: [{ id_user: 50, langue_preferee: 'fr' }] });
    m.Oeuvre.findByPk = jest.fn(async () => ({ id_oeuvre: 9, titre: 'Un livre', saisi_par: 50, id_type_oeuvre: 1 }));
    m.Commentaire = { findByPk: jest.fn(async () => ({ id_user: 60 })) };
    return Object.assign(m, extra);
  };

  it('prévient l’auteur de l’œuvre', async () => {
    const m = contexte();
    expect(await messages.prevenirCommentaire(m, { idAuteurCommentaire: 7, oeuvreId: 9 })).toBe(1);
    expect(envoyes(m)[0]).toMatchObject({ id_user: 50, type_notification: 'nouveau_commentaire', url_action: '/oeuvres/9' });
    expect(envoyes(m)[0].message).toBe('Sami Dahmani a commenté « Un livre ».');
  });

  it('on ne se prévient pas soi-même', async () => {
    const m = contexte();
    expect(await messages.prevenirCommentaire(m, { idAuteurCommentaire: 50, oeuvreId: 9 })).toBe(0);
    expect(m.Notification.bulkCreate).not.toHaveBeenCalled();
  });

  it('une réponse prévient aussi l’auteur du commentaire de départ', async () => {
    const m = contexte();
    await messages.prevenirCommentaire(m, { idAuteurCommentaire: 7, idParent: 3, oeuvreId: 9 });
    expect(m.User.findAll.mock.calls[0][0].where.id_user).toEqual([50, 60]);
  });

  it('une panne ne remonte jamais', async () => {
    const m = contexte();
    m.Oeuvre.findByPk = jest.fn(async () => { throw new Error('panne'); });
    await expect(messages.prevenirCommentaire(m, { idAuteurCommentaire: 7, oeuvreId: 9 })).resolves.toBe(0);
  });
});

describe('un message par jour, même avec deux clics simultanés', () => {
  it('deux envois en même temps : un seul passe', async () => {
    const id = 9001;
    const m = modeles();
    const r = await Promise.allSettled([
      messages.envoyer(m, id, { modele: 'profil' }),
      messages.envoyer(m, id, { modele: 'profil' }),
    ]);
    expect(r.filter(x => x.status === 'fulfilled')).toHaveLength(1);
    expect(r.find(x => x.status === 'rejected').reason).toMatchObject({ statusCode: 429 });
  });
  it('envoi impossible (aucun abonné) : la place du jour est rendue', async () => {
    const id = 9002;
    await expect(messages.envoyer(modeles({ abonnes: [] }), id, { modele: 'profil' })).rejects.toMatchObject({ statusCode: 400 });
    await expect(messages.envoyer(modeles(), id, { modele: 'profil' })).resolves.toEqual({ prevenus: 1 });
  });
});
