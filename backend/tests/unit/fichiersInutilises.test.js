/**
 * Effacement des fichiers qui ne servent plus (2026-11-15) : la ligne « journal » d'un envoi ne compte
 * plus comme un usage, sauf si un bloc d'article ou un extrait de livre la cite ; toutes les colonnes et
 * tous les textes qui peuvent contenir l'adresse gardent le fichier ; dans le doute, il est gardé.
 */
const { Op } = require('sequelize');
const { isReferencedElsewhere, deleteUserFiles } = require('../../services/user/userFileCleanup');

const URL = 'https://res.cloudinary.com/compte-essai/image/upload/v1794738966/eventculture/images/img-salle-1794738966399-4dbf93b0.jpg';
const zero = () => ({ count: jest.fn(async () => 0) });

/** Modèles où rien n'utilise le fichier ; `lignes` = lignes Media de cette adresse */
function modeles(lignes = [], surcharges = {}) {
  return {
    User: { unscoped: () => zero() },
    Media: { findAll: jest.fn(async () => lignes), count: jest.fn(async () => 0), destroy: jest.fn(async () => 1) },
    ArticleBlock: zero(), Livre: zero(), ArticleRevision: zero(), Article: zero(),
    Evenement: zero(), Service: zero(), ServiceMedia: zero(), MessageEvenement: zero(),
    ...surcharges
  };
}

describe('fichiers qui ne servent plus', () => {
  it('une ligne « journal » seule (envoi jamais rattaché) ne garde plus le fichier', async () => {
    expect(await isReferencedElsewhere(modeles([{ id_media: 5, id_oeuvre: null, id_evenement: null }]), URL)).toBe(false);
  });

  it('gardé : média rattaché à une œuvre ou un événement', async () => {
    expect(await isReferencedElsewhere(modeles([{ id_media: 5, id_oeuvre: 3, id_evenement: null }]), URL)).toBe(true);
    expect(await isReferencedElsewhere(modeles([{ id_media: 5, id_oeuvre: null, id_evenement: 9 }]), URL)).toBe(true);
  });

  it('gardé : ligne « journal » citée par un bloc d’article ou un extrait de livre', async () => {
    const bloc = { count: jest.fn(async ({ where }) => (where.id_media?.includes?.(5) ? 1 : 0)) };
    expect(await isReferencedElsewhere(modeles([{ id_media: 5 }], { ArticleBlock: bloc }), URL)).toBe(true);
    const livre = { count: jest.fn(async ({ where }) => (where[Op.or] ? 1 : 0)) };
    expect(await isReferencedElsewhere(modeles([{ id_media: 5 }], { Livre: livre }), URL)).toBe(true);
  });

  it('gardé : image de partage d’un événement, programme PDF d’un message', async () => {
    const partage = { count: jest.fn(async ({ where }) => (where.image_partage_url === URL ? 1 : 0)) };
    expect(await isReferencedElsewhere(modeles([], { Evenement: partage }), URL)).toBe(true);
    const message = { count: jest.fn(async ({ where }) => (where.lien_programme === URL ? 1 : 0)) };
    expect(await isReferencedElsewhere(modeles([], { MessageEvenement: message }), URL)).toBe(true);
  });

  it('gardé : cité dans un texte (proposition de modification en attente), même transformé', async () => {
    // Recherche par l'identifiant du fichier, pas l'adresse exacte : une adresse /w_400/ est reconnue
    const revision = { count: jest.fn(async ({ where }) => {
      const motif = where.contenu?.[Op.like] || '';
      return motif.includes('img-salle-1794738966399') && !motif.includes('/v1794738966/') ? 1 : 0;
    }) };
    expect(await isReferencedElsewhere(modeles([], { ArticleRevision: revision }), URL)).toBe(true);
  });

  it('les jokers % et _ de l’adresse ne sont pas des jokers', async () => {
    const article = { count: jest.fn(async () => 0) };
    const avecJokers = 'https://res.cloudinary.com/compte-essai/image/upload/v1/eventculture/images/mon_fichier%25-long.jpg';
    await isReferencedElsewhere(modeles([], { Article: article }), avecJokers);
    const motif = article.count.mock.calls[0][0].where.contenu_complet[Op.like];
    expect(motif).toMatch(/^%.*%$/);
    expect(motif).toContain('mon\\_fichier');
    expect(motif).not.toMatch(/[^\\]_/);
  });

  it('colonne JSON : lue comme texte (CAST … AS CHAR)', async () => {
    const where = jest.fn((col, cond) => ({ col, cond }));
    const s = { where, cast: (c, t) => ({ cast: c, t }), col: (n) => ({ col: n }) };
    const bloc = { sequelize: s, count: jest.fn(async () => 0) };
    await isReferencedElsewhere(modeles([], { ArticleBlock: bloc }), URL);
    expect(where).toHaveBeenCalledWith({ cast: { col: 'metadata' }, t: 'CHAR' }, { [Op.like]: expect.stringContaining('img-salle-1794738966399') });
  });

  it('photo d’avis refusée : ne garde plus le fichier ; quarantaine : sans recherche dans les articles', async () => {
    const photosAvis = { count: jest.fn(async ({ where }) => (where.statut?.[Op.ne] === 'rejete' ? 0 : 1)) };
    expect(await isReferencedElsewhere(modeles([], { CommentairePhoto: photosAvis }), URL)).toBe(false);
    const article = { count: jest.fn(async () => 1) };
    expect(await isReferencedElsewhere(modeles([], { Article: article }), URL, { sansTextes: true })).toBe(false);
    expect(article.count).not.toHaveBeenCalled();
  });

  it('effacé : le fichier part de Cloudinary et ses lignes « journal » aussi', async () => {
    const m = modeles([{ id_media: 5 }]);
    const supprimerParUrl = jest.fn(async () => true);
    expect(await deleteUserFiles(m, [URL, URL, null], { supprimerParUrl })).toEqual({ deleted: 1, skipped: 0, failed: 0 });
    expect(supprimerParUrl).toHaveBeenCalledTimes(1);
    expect(m.Media.destroy).toHaveBeenCalledWith({ where: { url: URL, id_oeuvre: null, id_evenement: null } });
  });

  it('encore utilisé : rien n’est effacé, ni le fichier ni les lignes', async () => {
    const m = modeles([{ id_media: 5, id_oeuvre: 3 }]);
    const supprimerParUrl = jest.fn(async () => true);
    expect(await deleteUserFiles(m, [URL], { supprimerParUrl })).toEqual({ deleted: 0, skipped: 1, failed: 0 });
    expect(supprimerParUrl).not.toHaveBeenCalled();
    expect(m.Media.destroy).not.toHaveBeenCalled();
  });
});
