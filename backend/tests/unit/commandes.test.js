/**
 * Commandes de livres, d'œuvres d'art et d'artisanat (paiement direct au professionnel).
 * Modèles en mémoire : aucune base, aucun envoi réel.
 */
const commandes = require('../../services/commandes');
const { normaliserMoyens } = require('../../services/paiementDirect');

const MOYENS = { baridimob_rip: '00799999000012345678', titulaire: 'Exemple Vendeuse', envoi_algerie: 500, envoi_etranger: 2500, main_propre: true };

function base({ oeuvre = {}, artisanat = null, moyens = MOYENS } = {}) {
  const users = {
    7: { id_user: 7, prenom: 'Lina', nom: 'Exemple', email: 'vendeuse@example.com', moyens_paiement: moyens },
    8: { id_user: 8, prenom: 'Sami', nom: 'Essai', email: 'acheteur@example.com', moyens_paiement: null },
    9: { id_user: 9, prenom: 'Autre', nom: 'Compte', email: 'autre@example.com', moyens_paiement: null },
  };
  const o = { id_oeuvre: 5, titre: { fr: 'Matriochkas' }, statut: 'publie', id_type_oeuvre: 1, prix: 1500, saisi_par: 7, id_createur: null, ...oeuvre };
  const lignes = [];
  const avecUsers = (c) => Object.assign(c, { Vendeur: users[c.id_vendeur], Acheteur: users[c.id_acheteur] });
  const Commande = {
    create: jest.fn(async (d) => {
      const c = { id_commande: lignes.length + 1, statut: 'en_attente', date_creation: new Date(), ...d };
      c.update = async (champs) => Object.assign(c, champs);
      lignes.push(c);
      return c;
    }),
    count: jest.fn(async ({ where }) => lignes.filter((c) => c.id_acheteur === where.id_acheteur && c.statut === where.statut).length),
    findOne: jest.fn(async ({ where }) => lignes.find((c) => c.id_acheteur === where.id_acheteur && c.id_oeuvre === where.id_oeuvre && c.statut === where.statut) || null),
    findByPk: jest.fn(async (id) => { const c = lignes.find((x) => x.id_commande === id); return c ? avecUsers(c) : null; }),
    findAll: jest.fn(async ({ where }) => lignes.filter((c) => (where.id_vendeur ? c.id_vendeur === where.id_vendeur : c.id_acheteur === where.id_acheteur)).map(avecUsers)),
  };
  const models = {
    Oeuvre: { findByPk: jest.fn(async (id) => (id === o.id_oeuvre ? o : null)) },
    Artisanat: { findOne: jest.fn(async () => artisanat) },
    User: { findByPk: jest.fn(async (id) => users[id] || null) },
    Commande,
  };
  const notifications = { sendToUser: jest.fn(async () => true) };
  return { models, notifications, lignes };
}
const demande = (d = {}) => ({ id_oeuvre: 5, quantite: 1, livraison: 'algerie', adresse: '12 rue Exemple, Constantine', ...d });

describe('offre d’une œuvre', () => {
  it('livre publié avec prix et moyen de paiement : commandable, sans rien de privé', async () => {
    const { models } = base();
    const o = await commandes.offre(models, 5);
    expect(o).toMatchObject({ commandable: true, prix: 1500, livraison: { algerie: 500, etranger: 2500, main_propre: 0 }, vendeur: { id: 7, nom: 'Lina Exemple' } });
    expect(JSON.stringify(o)).not.toMatch(/00799999|baridimob|example\.com/);
  });

  it('sans prix, sans moyen, non publié, autre type ou épuisé : pas commandable', async () => {
    expect((await commandes.offre(base({ oeuvre: { prix: null } }).models, 5)).raison).toBe('sans_prix');
    expect((await commandes.offre(base({ moyens: { envoi_algerie: 500 } }).models, 5)).raison).toBe('sans_moyen');
    expect((await commandes.offre(base({ oeuvre: { statut: 'en_attente' } }).models, 5)).raison).toBe('introuvable');
    expect((await commandes.offre(base({ oeuvre: { id_type_oeuvre: 2 } }).models, 5)).raison).toBe('type');
    const epuise = base({ oeuvre: { id_type_oeuvre: 7, prix: null }, artisanat: { prix: 3000, prix_max: null, en_stock: 0, sur_commande: false } });
    expect((await commandes.offre(epuise.models, 5)).raison).toBe('epuise');
  });

  it('artisanat : prix de la fiche artisanat, fourchette et sur commande', async () => {
    const { models } = base({ oeuvre: { id_type_oeuvre: 7, prix: null }, artisanat: { prix: 3000, prix_max: 4500, en_stock: 0, sur_commande: true } });
    expect(await commandes.offre(models, 5)).toMatchObject({ commandable: true, prix: 3000, prix_max: 4500, stock: null });
  });

  it('vendeur sans frais d’envoi indiqués : livraison « à convenir »', () => {
    expect(commandes.optionsLivraison({ baridimob_rip: 'x' })).toEqual({ a_convenir: null });
  });
});

describe('passer une commande', () => {
  it('montant calculé, vendeur prévenu, acheteur voit comment payer', async () => {
    const { models, notifications } = base();
    const c = await commandes.commander(models, notifications, 8, demande({ quantite: 2, telephone: '+213 555 00 00 00' }));
    expect(c).toMatchObject({ montant_total: 3500, frais_envoi: 500, statut: 'en_attente', role: 'acheteur' });
    expect(c.moyens.baridimob_rip).toBe('00799999000012345678');
    expect(c.moyens).not.toHaveProperty('envoi_algerie');
    expect(notifications.sendToUser).toHaveBeenCalledWith(7, expect.objectContaining({ titre: 'Nouvelle commande', url_action: '/mes-commandes' }));
  });

  it('refusé : sa propre œuvre, adresse manquante, mauvaise livraison, quantité, doublon', async () => {
    const { models, notifications } = base();
    await expect(commandes.commander(models, notifications, 7, demande())).rejects.toThrow(/propre/);
    await expect(commandes.commander(models, notifications, 8, demande({ adresse: '' }))).rejects.toThrow(/adresse/i);
    await expect(commandes.commander(models, notifications, 8, demande({ livraison: 'drone' }))).rejects.toThrow(/livraison/);
    await expect(commandes.commander(models, notifications, 8, demande({ quantite: 0 }))).rejects.toThrow(/Quantité/);
    await expect(commandes.commander(models, notifications, 8, demande({ quantite: 21 }))).rejects.toThrow(/Quantité/);
    await commandes.commander(models, notifications, 8, demande());
    await expect(commandes.commander(models, notifications, 8, demande())).rejects.toThrow(/déjà une commande/);
  });

  it('remise en main propre : pas d’adresse demandée ni gardée', async () => {
    const { models, notifications } = base();
    const c = await commandes.commander(models, notifications, 8, demande({ livraison: 'main_propre', adresse: 'inutile' }));
    expect(c).toMatchObject({ montant_total: 1500, adresse: null });
  });

  it('stock limité : pas plus que ce qui reste', async () => {
    const { models, notifications } = base({ oeuvre: { id_type_oeuvre: 7 }, artisanat: { prix: 1000, prix_max: null, en_stock: 2, sur_commande: false } });
    await expect(commandes.commander(models, notifications, 8, demande({ quantite: 3 }))).rejects.toThrow(/reste 2/);
  });
});

describe('confidentialité et étapes', () => {
  async function commandePassee() {
    const b = base();
    await commandes.commander(b.models, b.notifications, 8, demande());
    b.notifications.sendToUser.mockClear();
    return b;
  }

  it('le vendeur voit l’adresse et l’e-mail, pas ses propres coordonnées ; un tiers ne voit rien', async () => {
    const { models } = await commandePassee();
    const v = await commandes.detail(models, 1, { id: 7, isAdmin: false });
    expect(v).toMatchObject({ role: 'vendeur', adresse: '12 rue Exemple, Constantine', acheteur: { email: 'acheteur@example.com' } });
    expect(v).not.toHaveProperty('moyens');
    await expect(commandes.detail(models, 1, { id: 9, isAdmin: false })).rejects.toThrow();
  });

  it('paiement reçu puis envoyée : l’acheteur est prévenu, les coordonnées de paiement disparaissent', async () => {
    const { models, notifications } = await commandePassee();
    const p = await commandes.mettreAJour(models, notifications, 1, { id: 7, isAdmin: false }, { statut: 'payee' });
    expect(p.statut).toBe('payee');
    expect(notifications.sendToUser).toHaveBeenCalledWith(8, expect.objectContaining({ titre: 'Paiement reçu' }));
    expect((await commandes.detail(models, 1, { id: 8, isAdmin: false })).moyens).toBeUndefined();
    expect((await commandes.mettreAJour(models, notifications, 1, { id: 7, isAdmin: false }, { statut: 'envoyee' })).statut).toBe('envoyee');
  });

  it('l’acheteur ne peut ni confirmer le paiement, ni annuler après avoir payé', async () => {
    const { models, notifications } = await commandePassee();
    await expect(commandes.mettreAJour(models, notifications, 1, { id: 8, isAdmin: false }, { statut: 'payee' })).rejects.toThrow(/vendeur/);
    await commandes.mettreAJour(models, notifications, 1, { id: 7, isAdmin: false }, { statut: 'payee' });
    await expect(commandes.mettreAJour(models, notifications, 1, { id: 8, isAdmin: false }, { statut: 'annulee' })).rejects.toThrow(/plus possible/);
  });

  it('l’acheteur annule avant de payer : le vendeur est prévenu', async () => {
    const { models, notifications } = await commandePassee();
    const c = await commandes.mettreAJour(models, notifications, 1, { id: 8, isAdmin: false }, { statut: 'annulee' });
    expect(c).toMatchObject({ statut: 'annulee', annulee_par: 'acheteur' });
    expect(notifications.sendToUser).toHaveBeenCalledWith(7, expect.objectContaining({ titre: 'Commande annulée' }));
  });

  it('le vendeur fixe le montant avant le paiement, pas l’acheteur', async () => {
    const { models, notifications } = await commandePassee();
    await expect(commandes.mettreAJour(models, notifications, 1, { id: 8, isAdmin: false }, { montant_total: 10 })).rejects.toThrow();
    expect((await commandes.mettreAJour(models, notifications, 1, { id: 7, isAdmin: false }, { montant_total: 1800 })).montant_total).toBe(1800);
  });
});

describe('frais d’envoi dans les réglages du professionnel', () => {
  it('enregistrés en DA, vides = pas d’envoi, montant faux refusé', () => {
    const m = normaliserMoyens({ especes: true, envoi_algerie: '600', envoi_etranger: '', main_propre: true });
    expect(m).toMatchObject({ envoi_algerie: 600, envoi_etranger: null, main_propre: true });
    expect(() => normaliserMoyens({ especes: true, envoi_algerie: -5 })).toThrow();
  });
});
