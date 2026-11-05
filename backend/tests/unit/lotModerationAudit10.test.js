/**
 * Modération : l'administrateur voit ce qu'il juge, et sa décision s'applique vraiment.
 */
jest.mock('../../utils/sessionCache', () => ({ invalidateUserSession: jest.fn() }));

const SignalementRepository = require('../../repositories/signalementRepository');
const SignalementService = require('../../services/signalement/signalementService');
const { apercuSignale } = require('../../services/signalement/apercuSignale');

describe('aperçu du contenu signalé', () => {
  const User = { findByPk: jest.fn(async () => ({ id_user: 7, nom: { fr: 'Exemple' }, prenom: 'Lina' })) };

  it('commentaire : texte, auteur et lien vers la page', async () => {
    const models = { User, Commentaire: { findByPk: jest.fn(async () => ({ contenu: 'Texte signalé', statut: 'publie', id_user: 7, id_evenement: 3 })) } };
    const a = await apercuSignale(models, 'commentaire', 1);
    expect(a.contenu).toBe('Texte signalé');
    expect(a.lien).toBe('/evenements/3');
    expect(a.auteur).toEqual({ id: 7, nom: 'Lina Exemple' });
  });

  it('artisanat : titre de son œuvre et lien vers sa fiche', async () => {
    const models = { User, Oeuvre: {}, Artisanat: { findByPk: jest.fn(async () => ({ id_artisanat: 9, Oeuvre: { titre: { fr: 'Tapis' }, description: { fr: 'Laine' }, statut: 'publie', saisi_par: 7 } })) } };
    const a = await apercuSignale(models, 'artisanat', 9);
    expect(a).toMatchObject({ titre: 'Tapis', contenu: 'Laine', lien: '/artisanat/9' });
  });

  it('contenu disparu : null, sans erreur', async () => {
    expect(await apercuSignale({ Oeuvre: { findByPk: jest.fn(async () => null) } }, 'oeuvre', 1)).toBeNull();
  });

  it('texte très long : extrait', async () => {
    const models = { Commentaire: { findByPk: jest.fn(async () => ({ contenu: 'x'.repeat(2000), statut: 'publie' })) } };
    expect((await apercuSignale(models, 'commentaire', 1)).contenu.length).toBeLessThan(700);
  });
});

describe('retrait du contenu', () => {
  const fiche = () => ({ update: jest.fn(async () => true) });

  it.each([
    ['commentaire', 'Commentaire', 'supprime'],
    ['oeuvre', 'Oeuvre', 'supprime'],
    ['evenement', 'Evenement', 'brouillon'],
  ])('%s : retiré du site sur la fiche chargée', async (type, modele, statut) => {
    const f = fiche();
    const repo = new SignalementRepository({ Signalement: {}, [modele]: { findByPk: jest.fn(async () => f) } });
    await repo.applyModerationAction({ type_entite: type, id_entite: 4 }, 'suppression_contenu');
    expect(f.update).toHaveBeenCalledWith({ statut });
  });

  it('artisanat : son œuvre est retirée', async () => {
    const f = fiche();
    const repo = new SignalementRepository({
      Signalement: {},
      Artisanat: { findByPk: jest.fn(async () => ({ id_oeuvre: 12 })) },
      Oeuvre: { findByPk: jest.fn(async () => f) },
    });
    await repo.applyModerationAction({ type_entite: 'artisanat', id_entite: 4 }, 'suppression_contenu');
    expect(f.update).toHaveBeenCalledWith({ statut: 'supprime' });
  });

  it('compte : refusé, il faut suspendre', async () => {
    const repo = new SignalementRepository({ Signalement: {} });
    await expect(repo.applyModerationAction({ type_entite: 'user', id_entite: 4 }, 'suppression_contenu')).rejects.toBeDefined();
  });
});

describe('décision de modération', () => {
  const contexte = (statut = 'en_attente') => {
    const signalement = { id_signalement: 1, type_entite: 'commentaire', id_entite: 40, statut, update: jest.fn(async () => true) };
    const repository = {
      findById: jest.fn(async () => signalement),
      applyModerationAction: jest.fn(async () => {}),
      cloreSignalementsSimilaires: jest.fn(async () => {}),
    };
    return { signalement, repository, svc: new SignalementService(repository, {}) };
  };

  it('signalement déjà traité : pas de seconde sanction (409)', async () => {
    const { svc, repository } = contexte('traite');
    await expect(svc.traiterSignalement(1, { action_prise: 'suppression_contenu' }, 8)).rejects.toMatchObject({ statusCode: 409 });
    expect(repository.applyModerationAction).not.toHaveBeenCalled();
  });

  it('les autres signalements du même contenu sont clos par la même décision', async () => {
    const { svc, repository, signalement } = contexte();
    await svc.traiterSignalement(1, { action_prise: 'suppression_contenu' }, 8);
    expect(repository.cloreSignalementsSimilaires).toHaveBeenCalledWith(signalement, { action_prise: 'suppression_contenu', id_moderateur: 8 });
  });

  it('action refusée : le signalement reste ouvert', async () => {
    const { svc, repository, signalement } = contexte();
    repository.applyModerationAction.mockRejectedValue(new Error('refus'));
    await expect(svc.traiterSignalement(1, { action_prise: 'suspension_permanente' }, 8)).rejects.toBeDefined();
    expect(signalement.update).not.toHaveBeenCalled();
    expect(repository.cloreSignalementsSimilaires).not.toHaveBeenCalled();
  });
});

describe('recherche des listes admin', () => {
  const { conditionRecherche } = require('../../utils/multiLangSearchBuilder');
  const sequelize = { escape: (v) => `'${v}'`, literal: (v) => v, where: (a, b) => [a, b], fn: (...a) => a, col: (c) => c };

  it('moins de 2 caractères, ou autre chose que du texte : pas de condition', () => {
    expect(conditionRecherche(sequelize, 'titre', 'a', 'Oeuvre')).toBeNull();
    expect(conditionRecherche(sequelize, 'titre', ['x', 'y'], 'Oeuvre')).toBeNull();
    expect(conditionRecherche(sequelize, 'titre', { $ne: 1 }, 'Oeuvre')).toBeNull();
  });

  it('un terme : condition sur toutes les langues', () => {
    const { Op } = require('sequelize');
    const c = conditionRecherche(sequelize, 'titre', 'Nedjma', 'Oeuvre');
    expect(Array.isArray(c[Op.or])).toBe(true);
    expect(c[Op.or].length).toBeGreaterThan(1);
  });
});

describe('couverture d’une œuvre', () => {
  const OeuvreDTO = require('../../dto/oeuvre/oeuvreDTO');
  const doc = { url: 'https://example.com/article.pdf', type_media: 'document' };
  const image = { url: 'https://example.com/couverture.jpg', type_media: 'image' };

  it('un document joint n’est jamais pris pour la couverture', () => {
    const d = OeuvreDTO._addComputedFields({ Media: [doc] });
    expect(d.image_url).toBeUndefined();
    expect(d.image_principale).toBeUndefined();
  });

  it('une image ajoutée après des documents devient la couverture', () => {
    expect(OeuvreDTO._addComputedFields({ Media: [doc, doc, image] }).image_url).toBe(image.url);
  });

  it('l’image principale reste prioritaire', () => {
    const principale = { ...image, url: 'https://example.com/principale.jpg', is_Principale: true };
    expect(OeuvreDTO._addComputedFields({ Media: [image, principale] }).image_url).toBe(principale.url);
  });
});

describe('extrait d’un livre', () => {
  const LivreSubService = require('../../services/oeuvre/subtypes/livreSubService');
  const { normaliserExtrait } = LivreSubService;
  const svc = new LivreSubService({});

  it('texte nettoyé, vide effacé, absent inchangé', () => {
    expect(normaliserExtrait('  Il était une fois\r\nune ville.  ')).toBe('Il était une fois\nune ville.');
    expect(normaliserExtrait('   ')).toBeNull();
    expect(normaliserExtrait(undefined)).toBeUndefined();
  });

  it('trop long ou autre chose que du texte : refusé', () => {
    expect(() => normaliserExtrait('x'.repeat(20001))).toThrow();
    expect(() => normaliserExtrait({ fr: 'x' })).toThrow();
  });

  it('création et modification : l’extrait est enregistré, effacé si vidé', () => {
    expect(svc._buildCreateData(4, { extrait: 'Page 1' }).extrait).toBe('Page 1');
    expect(svc._buildUpdateData({ extrait: '' })).toEqual({ extrait: null });
    expect(svc._buildUpdateData({ isbn: undefined })).not.toHaveProperty('extrait');
  });
});
