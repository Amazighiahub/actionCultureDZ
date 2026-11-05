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
