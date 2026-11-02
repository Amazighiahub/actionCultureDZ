/**
 * Audit V8, lot 2 : personnes invitées masquées, plafond et statut de l'import,
 * proposition d'article sur un article qui a changé.
 */
const EvenementService = require('../../services/evenement/evenementService');
const { ImportInscriptions } = require('../../services/evenement/importInscriptions');
const ArticleRevisionService = require('../../services/oeuvre/articleRevisionService');

describe('_masquerInvitation', () => {
  const s = Object.create(EvenementService.prototype);
  const utilisateur = { id_user: 9, nom: { fr: 'Vrai Nom' }, prenom: { fr: 'Vrai' }, email: 'a@example.com', photo_url: 'x.jpg', id_type_user: 13, email_verifie: true };

  test('invitation : seulement le nom du classeur et l’e-mail', () => {
    const r = s._masquerInvitation({ statut_participation: 'invitation', reponses_inscription: { _nom_import: 'Nom du classeur' }, User: utilisateur });
    expect(r.User).toEqual({ id_user: 9, email: 'a@example.com', nom: 'Nom du classeur', prenom: '', photo_url: null, id_type_user: null });
  });

  test('invitation sans nom dans le classeur : début de l’e-mail', () => {
    const r = s._masquerInvitation({ statut_participation: 'invitation', User: utilisateur });
    expect(r.User.nom).toBe('a');
  });

  test('personne qui a confirmé : profil normal', () => {
    const ligne = { statut_participation: 'inscrit', User: utilisateur };
    expect(s._masquerInvitation(ligne)).toBe(ligne);
  });
});

describe('getParticipantProfil', () => {
  test('invitation pas encore confirmée : introuvable', async () => {
    const s = Object.create(EvenementService.prototype);
    s.repository = { getRegistration: jest.fn(async () => ({ statut_participation: 'invitation' })), getParticipantProfile: jest.fn() };
    await expect(s.getParticipantProfil(2, 9)).rejects.toMatchObject({ statusCode: 404 });
    expect(s.repository.getParticipantProfile).not.toHaveBeenCalled();
  });
});

describe('import : plafond et statut', () => {
  const service = (deja) => new ImportInscriptions({
    Evenement: { findAll: jest.fn(async () => [{ id_evenement: 2 }]) },
    EvenementUser: { count: jest.fn(async () => deja) }
  });

  test('plafond de 1 000 invitations par 24 h', async () => {
    await expect(service(900)._verifierPlafondJour(5, 100)).resolves.toBeUndefined();
    await expect(service(900)._verifierPlafondJour(5, 101)).rejects.toMatchObject({ statusCode: 429 });
  });

  test.each(['brouillon', 'en_attente', 'annule', 'termine'])('événement %s : import refusé', async (statut) => {
    const s = new ImportInscriptions({});
    s._evenement = jest.fn(async () => ({ evenement: { statut } }));
    await expect(s.importer(Buffer.from(''), 2, { id_user: 5 })).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('proposition d’article sur un article qui a changé', () => {
  const faire = ({ empreinte, forcer }) => {
    const oeuvre = { id_oeuvre: 57, titre: { fr: 'T' }, description: { fr: 'D' }, id_type_oeuvre: 4, saisi_par: 3, update: jest.fn() };
    const revision = {
      id_revision: 5, id_auteur: 8, statut: 'en_attente',
      contenu: { blocks: [{ type_block: 'text', contenu: 'Nouveau' }], empreinte_base: empreinte },
      update: jest.fn()
    };
    const models = {
      Oeuvre: { findByPk: jest.fn(async () => oeuvre), sequelize: { transaction: jest.fn(async (cb) => cb({ LOCK: { UPDATE: 'U' } })) } },
      ArticleRevision: { findOne: jest.fn(async () => revision), findByPk: jest.fn(async () => revision) },
      Article: { findOne: jest.fn(async () => ({ id_article: 9 })) },
      ArticleScientifique: {},
      ArticleBlock: { findAll: jest.fn(async () => [{ type_block: 'text', contenu: 'Ajout de l’auteur' }]), destroy: jest.fn(), create: jest.fn() },
      Media: {}
    };
    const s = Object.create(ArticleRevisionService.prototype);
    s.models = models;
    s._notifier = jest.fn();
    return { s, revision, models, oeuvre, appel: () => s.decider(57, 5, { decision: 'accepter', forcer }, { userId: 3 }) };
  };

  test('article changé : 409, rien n’est remplacé', async () => {
    const { appel, models } = faire({ empreinte: 'ancienne' });
    await expect(appel()).rejects.toMatchObject({ statusCode: 409, code: 'ARTICLE_MODIFIE' });
    expect(models.ArticleBlock.destroy).not.toHaveBeenCalled();
  });

  test('confirmé (forcer) : accepté, et l’ancienne version est gardée', async () => {
    const { appel, revision, models } = faire({ empreinte: 'ancienne', forcer: true });
    await appel();
    expect(models.ArticleBlock.destroy).toHaveBeenCalled();
    expect(revision.update.mock.calls[0][0].contenu.version_remplacee.blocks[0].contenu).toBe('Ajout de l’auteur');
  });

  test('article inchangé : accepté sans question', async () => {
    const f = faire({ empreinte: 'x' });
    f.revision.contenu.empreinte_base = f.s._empreinte(f.oeuvre, [{ type_block: 'text', contenu: 'Ajout de l’auteur' }]);
    await f.appel();
    expect(f.revision.update.mock.calls[0][0].statut).toBe('acceptee');
  });

  test('ancienne proposition sans empreinte : pas de contrôle', async () => {
    const f = faire({ empreinte: undefined });
    await expect(f.appel()).resolves.toBeDefined();
  });
});
