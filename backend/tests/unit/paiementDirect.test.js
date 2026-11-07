/**
 * Paiement direct au professionnel : Tala DZ n'encaisse rien ; le professionnel indique ses moyens
 * et confirme lui-même avoir reçu le paiement.
 */
const p = require('../../services/paiementDirect');

describe('moyens de paiement du professionnel', () => {
  it('RIP et CCP nettoyés, vides ignorés', () => {
    const m = p.normaliserMoyens({ baridimob_rip: '0079 9999 0000 1234 5678', ccp_numero: '1234567', ccp_cle: '89', especes: true, titulaire: ' Exemple ' });
    expect(m).toMatchObject({ baridimob_rip: '00799999000012345678', ccp_numero: '1234567', ccp_cle: '89', especes: true, titulaire: 'Exemple', lien_url: null });
  });

  it('rien d’utilisable : null', () => {
    expect(p.normaliserMoyens({ baridimob_rip: '', especes: false })).toBeNull();
    expect(p.normaliserMoyens(null)).toBeNull();
  });

  it.each([
    [{ baridimob_rip: '123' }],
    [{ ccp_numero: '1234567' }],
    [{ ccp_numero: 'abc', ccp_cle: '12' }],
    [{ lien_url: 'http://example.com' }],
    [{ lien_url: 'javascript:alert(1)' }],
    [{ consignes: 'x'.repeat(501), especes: true }],
    ['texte'],
    [['tableau']],
  ])('saisie invalide refusée : %j', (entree) => {
    expect(() => p.normaliserMoyens(entree)).toThrow();
  });

  it('un lien https est accepté', () => {
    expect(p.normaliserMoyens({ lien_url: 'https://example.com/payer', lien_libelle: 'Payer' }).lien_url).toBe('https://example.com/payer');
  });
});

describe('ce que voit le participant', () => {
  const modeles = (inscription, moyens) => ({
    EvenementUser: { findOne: jest.fn(async () => inscription) },
    Evenement: { findByPk: jest.fn(async () => ({ id_user: 3 })) },
    User: { findByPk: jest.fn(async () => ({ id_user: 3, nom: 'Exemple', prenom: 'Lina', moyens_paiement: moyens })) },
  });

  it('inscrit à un événement payant : montant, moyens et organisateur', async () => {
    const r = await p.paiementDuParticipant(modeles({ statut_participation: 'inscrit', montant_du: '1500.00', date_paiement: null }, { especes: true }), 9, 5);
    expect(r).toMatchObject({ montant: 1500, paye: false, moyens: { especes: true }, organisateur: { id: 3, nom: 'Lina Exemple' } });
  });

  it('gratuit : aucune coordonnée', async () => {
    const r = await p.paiementDuParticipant(modeles({ statut_participation: 'inscrit', montant_du: 0 }, { especes: true }), 9, 5);
    expect(r.moyens).toBeNull();
  });

  it.each([null, { statut_participation: 'annule' }, { statut_participation: 'invitation' }])('pas inscrit (%j) : refusé', async (ins) => {
    await expect(p.paiementDuParticipant(modeles(ins, { especes: true }), 9, 5)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('confirmation par l’organisateur', () => {
  const contexte = (statut = 'inscrit') => {
    const inscription = { statut_participation: statut, date_paiement: null, update: jest.fn(async function (d) { Object.assign(this, d); }) };
    const models = { EvenementUser: { findOne: jest.fn(async () => inscription) } };
    const evenementService = {
      _assertEventOwnerOrAdmin: jest.fn(async () => ({ nom_evenement: { fr: 'Concert' } })),
      validateParticipation: jest.fn(async () => ({})),
    };
    const notificationService = { sendToUser: jest.fn(async () => {}) };
    return { inscription, models, evenementService, notificationService };
  };

  it('paiement reçu d’une inscription en attente : confirmée par la validation habituelle', async () => {
    const c = contexte('inscrit');
    await p.confirmerPaiement(c.models, c.evenementService, c.notificationService, { idEvenement: 9, idParticipant: 5, recu: true, par: { id: 3, isAdmin: false } });
    expect(c.inscription.date_paiement).toBeInstanceOf(Date);
    expect(c.evenementService.validateParticipation).toHaveBeenCalledWith(9, 5, true, { id: 3, isAdmin: false }, '');
  });

  it('participant déjà confirmé : simple notification « Paiement reçu »', async () => {
    const c = contexte('confirme');
    await p.confirmerPaiement(c.models, c.evenementService, c.notificationService, { idEvenement: 9, idParticipant: 5, recu: true, par: { id: 3, isAdmin: false } });
    expect(c.evenementService.validateParticipation).not.toHaveBeenCalled();
    expect(c.notificationService.sendToUser).toHaveBeenCalledWith(5, expect.objectContaining({ titre: 'Paiement reçu' }));
  });

  it('un autre compte : refusé avant toute écriture', async () => {
    const c = contexte();
    c.evenementService._assertEventOwnerOrAdmin.mockRejectedValue(Object.assign(new Error('Accès non autorisé'), { statusCode: 403 }));
    await expect(p.confirmerPaiement(c.models, c.evenementService, c.notificationService, { idEvenement: 9, idParticipant: 5, recu: true, par: { id: 8, isAdmin: false } })).rejects.toBeDefined();
    expect(c.inscription.update).not.toHaveBeenCalled();
  });

  it('correction : paiement retiré, sans message', async () => {
    const c = contexte('confirme');
    c.inscription.date_paiement = new Date();
    await p.confirmerPaiement(c.models, c.evenementService, c.notificationService, { idEvenement: 9, idParticipant: 5, recu: false, par: { id: 3, isAdmin: false } });
    expect(c.inscription.date_paiement).toBeNull();
    expect(c.notificationService.sendToUser).not.toHaveBeenCalled();
  });
});

describe('changement des coordonnées de paiement (protection contre le détournement)', () => {
  const bcrypt = require('bcrypt');
  const MDP = 'Essai-Exemple-2026!';
  function modeles(moyens = { baridimob_rip: '00799999000012345678' }) {
    const u = { id_user: 7, email: 'vendeuse@example.com', nom: 'Exemple', prenom: 'Lina', password: bcrypt.hashSync(MDP, 4), moyens_paiement: moyens };
    return {
      u,
      models: {
        User: {
          unscoped: () => ({ findByPk: async () => u }),
          update: jest.fn(async (ch) => { Object.assign(u, ch); return [1]; }),
        },
        AuditLog: { create: jest.fn(async () => ({})) },
      },
      notificationService: { sendToUser: jest.fn(async () => true) },
      emailService: { sendEmail: jest.fn(async () => ({ success: true })) },
    };
  }
  const NOUVEAU = { baridimob_rip: '00799999000099999999' };

  it('changer le RIP sans mot de passe, ou avec un faux : refusé, rien n’est changé', async () => {
    const m = modeles();
    await expect(p.enregistrerMoyens(m.models, 7, NOUVEAU, {})).rejects.toMatchObject({ code: 'MOT_DE_PASSE_REQUIS' });
    await expect(p.enregistrerMoyens(m.models, 7, NOUVEAU, { motDePasse: 'faux' })).rejects.toMatchObject({ code: 'MOT_DE_PASSE_INCORRECT' });
    expect(m.models.User.update).not.toHaveBeenCalled();
  });

  it('avec le bon mot de passe : changé, titulaire prévenu (notification et e-mail), changement journalisé', async () => {
    const m = modeles();
    await p.enregistrerMoyens(m.models, 7, NOUVEAU, { motDePasse: MDP, notificationService: m.notificationService, emailService: m.emailService });
    expect(m.u.moyens_paiement.baridimob_rip).toBe('00799999000099999999');
    expect(m.notificationService.sendToUser).toHaveBeenCalledWith(7, expect.objectContaining({ titre: 'Coordonnées de paiement modifiées' }));
    expect(m.emailService.sendEmail).toHaveBeenCalledWith('vendeuse@example.com', expect.any(String), expect.any(String), null, null, { type: 'securite' });
    expect(m.models.AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'moyens_paiement_modifies', details: { champs: ['baridimob_rip'] } }));
  });

  it('frais d’envoi seuls : pas de mot de passe demandé, personne n’est dérangé', async () => {
    const m = modeles();
    await p.enregistrerMoyens(m.models, 7, { baridimob_rip: '00799999000012345678', envoi_algerie: 500 }, { notificationService: m.notificationService, emailService: m.emailService });
    expect(m.u.moyens_paiement.envoi_algerie).toBe(500);
    expect(m.emailService.sendEmail).not.toHaveBeenCalled();
  });

  it('noms et liens qui imitent Tala DZ, ou adresses déguisées : refusés', () => {
    expect(() => p.normaliserMoyens({ especes: true, titulaire: 'Tala DZ paiements' })).toThrow(/Tala DZ/);
    expect(() => p.normaliserMoyens({ lien_url: 'https://paiement-taladz.example.com/x' })).toThrow(/pas accepté/);
    expect(() => p.normaliserMoyens({ lien_url: 'https://xn--pypal-4ve.com/x' })).toThrow(/pas accepté/);
    expect(() => p.normaliserMoyens({ lien_url: 'https://www.paypal.me/exemple', lien_libelle: 'ثالا' })).toThrow();
    expect(p.normaliserMoyens({ lien_url: 'https://www.paypal.me/exemple', lien_libelle: 'PayPal' }).lien_url).toBe('https://www.paypal.me/exemple');
  });
});

describe('après la relecture : consignes et noms', () => {
  const bcrypt = require('bcrypt');
  it('changer seulement les consignes demande aussi le mot de passe', async () => {
    const u = { id_user: 7, email: 'v@example.com', password: bcrypt.hashSync('Essai-2026!x', 4), moyens_paiement: { especes: true } };
    const models = { User: { unscoped: () => ({ findByPk: async () => u }), update: jest.fn() } };
    await expect(p.enregistrerMoyens(models, 7, { especes: true, consignes: 'Notre RIP a changé : 0079…' }, {})).rejects.toMatchObject({ code: 'MOT_DE_PASSE_REQUIS' });
    expect(models.User.update).not.toHaveBeenCalled();
  });

  it('nom déguisé (caractère invisible, tatouil) refusé ; un nom ordinaire accepté', () => {
    expect(() => p.normaliserMoyens({ especes: true, titulaire: 'Tala\u200B DZ' })).toThrow(/Tala DZ/);
    expect(() => p.normaliserMoyens({ especes: true, titulaire: 'ثـالا' })).toThrow(/Tala DZ/);
    expect(p.normaliserMoyens({ especes: true, titulaire: 'Ait Ala Dziri' }).titulaire).toBe('Ait Ala Dziri');
    expect(p.normaliserMoyens({ especes: true, consignes: 'Merci\u202E !' }).consignes).toBe('Merci !');
  });
});

describe('après la deuxième relecture : nom de la plateforme', () => {
  it('« Thala DZ », voyelles arabes et nom dans les consignes : refusés', () => {
    expect(() => p.normaliserMoyens({ especes: true, titulaire: 'Thala DZ' })).toThrow(/Tala DZ/);
    expect(() => p.normaliserMoyens({ especes: true, titulaire: 'ثَالا' })).toThrow(/Tala DZ/);
    expect(() => p.normaliserMoyens({ especes: true, consignes: 'Virement à Tala DZ, compte officiel' })).toThrow(/Consignes/);
    expect(p.normaliserMoyens({ especes: true, consignes: 'Indiquez votre nom dans le motif.' }).consignes).toBe('Indiquez votre nom dans le motif.');
  });
});

describe('après la troisième relecture : nom de la plateforme', () => {
  it('le prénom تالا est permis dans un nom de titulaire ; « تالا دي زد » ne l’est pas', () => {
    expect(p.normaliserMoyens({ especes: true, titulaire: 'تالا بن علي' }).titulaire).toBe('تالا بن علي');
    expect(() => p.normaliserMoyens({ especes: true, titulaire: 'ثالا دي زد' })).toThrow(/Tala DZ/);
    expect(() => p.normaliserMoyens({ lien_url: 'https://www.paypal.me/exemple', lien_libelle: 'ثالا' })).toThrow(/Tala DZ/);
  });
  it('adresse « paytala-dz.com », lettres cyrilliques, marque arabe invisible : refusées', () => {
    expect(() => p.normaliserMoyens({ lien_url: 'https://paytala-dz.com/x' })).toThrow(/pas accepté/);
    expect(() => p.normaliserMoyens({ especes: true, titulaire: 'T\u0430la DZ' })).toThrow(/Tala DZ/);
    expect(() => p.normaliserMoyens({ especes: true, consignes: 'ثا\u061Cلا دي زد' })).toThrow(/Consignes/);
  });
});
