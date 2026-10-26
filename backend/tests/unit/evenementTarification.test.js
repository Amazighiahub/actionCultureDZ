/**
 * Tarif d'un événement : gratuit, payant, ou selon le profil (prix pour tout le séjour,
 * part réduite pour une présence partielle). Le montant d'une inscription est calculé par le
 * serveur à partir des réponses, jamais choisi par le participant.
 */
const { lireTarification, tarificationDe, configAvecProfil, montantInscription } = require('../../services/evenement/tarification');

const PROFILS = [
  { valeur: 'Étudiant', label: { fr: 'Étudiant' }, prix: 2000 },
  { valeur: 'Artisan ou professionnel', label: { fr: 'Artisan ou professionnel' }, prix: 5000 }
];

describe('Lecture de la tarification envoyée par le formulaire', () => {
  it('gratuit, payant (prix obligatoire), selon le profil (prix le plus bas pour les listes)', () => {
    expect(lireTarification(JSON.stringify({ mode: 'gratuit' }))).toEqual({ tarification: { mode: 'gratuit' }, tarif: 0 });
    expect(lireTarification({ mode: 'payant' }, '1500')).toEqual({ tarification: { mode: 'payant' }, tarif: 1500 });
    expect(lireTarification({ mode: 'payant' }, '')).toEqual({ erreur: expect.stringMatching(/prix/) });
    expect(lireTarification({ mode: 'profil', profils: PROFILS, partiel_pourcent: 70 })).toEqual({
      tarification: { mode: 'profil', profils: PROFILS, partiel_pourcent: 70 }, tarif: 2000
    });
  });

  it('refuse un choix manquant, un profil sans prix, un doublon, une part hors 1–100 %', () => {
    expect(lireTarification({ mode: 'autre' })).toHaveProperty('erreur');
    expect(lireTarification({ mode: 'profil', profils: [] })).toHaveProperty('erreur');
    expect(lireTarification({ mode: 'profil', profils: [{ valeur: 'Étudiant', prix: '' }] })).toHaveProperty('erreur');
    expect(lireTarification({ mode: 'profil', profils: [PROFILS[0], PROFILS[0]] })).toHaveProperty('erreur');
    expect(lireTarification({ mode: 'profil', profils: PROFILS, partiel_pourcent: 120 })).toHaveProperty('erreur');
  });

  it('rien envoyé : l’ancien comportement (le tarif seul) est gardé', () => {
    expect(lireTarification(undefined, '0')).toBeNull();
    expect(tarificationDe({ tarif: '0.00', tarification: null })).toEqual({ mode: 'gratuit' });
    expect(tarificationDe({ tarif: '800.00', tarification: null })).toEqual({ mode: 'payant' });
  });
});

describe('Formulaire d’inscription posé', () => {
  const chantier = { remplace_formulaire_base: true, sections: [{ champs: [{ cle: 'profil', type: 'choix', options: [] }, { cle: 'presence', type: 'choix' }] }] };

  it('le chantier-école demande déjà « Vous êtes » : formulaire inchangé', () => {
    expect(configAvecProfil(chantier, { mode: 'profil', profils: PROFILS })).toBe(chantier);
  });

  it('sans question de profil : « Vous êtes » ajoutée en tête, avec les profils de l’événement', () => {
    const config = configAvecProfil(null, { mode: 'profil', profils: PROFILS });
    expect(config.remplace_formulaire_base).toBe(false);
    expect(config.sections[0].champs[0]).toMatchObject({ cle: 'profil', type: 'choix', requis: true });
    expect(config.sections[0].champs[0].options.map(o => o.valeur)).toEqual(['Étudiant', 'Artisan ou professionnel']);
  });

  it('gratuit ou payant : pas de question ajoutée', () => {
    expect(configAvecProfil(null, { mode: 'payant' })).toBeNull();
  });
});

describe('Montant d’une inscription', () => {
  const profil = { tarif: '2000.00', tarification: { mode: 'profil', profils: PROFILS, partiel_pourcent: 70 } };

  it('prix du profil pour tout le séjour ; 70 % pour une présence partielle', () => {
    expect(montantInscription(profil, { profil: 'Étudiant', presence: 'Toute la durée' })).toBe(2000);
    expect(montantInscription(profil, { profil: 'Étudiant', presence: 'Partielle' })).toBe(1400);
    expect(montantInscription(profil, { profil: 'Artisan ou professionnel', presence: 'Partielle' })).toBe(3500);
  });

  it('plusieurs personnes : le prix est multiplié', () => {
    expect(montantInscription(profil, { profil: 'Étudiant', nombre_personnes: 3 })).toBe(6000);
    expect(montantInscription({ tarif: '1500.00', tarification: { mode: 'payant' } }, { nombre_personnes: 2 })).toBe(3000);
  });

  it('gratuit : 0 ; profil inconnu : montant inconnu (null)', () => {
    expect(montantInscription({ tarif: 0, tarification: { mode: 'gratuit' } }, {})).toBe(0);
    expect(montantInscription(profil, { profil: 'Inconnu' })).toBeNull();
  });
});

describe('Inscription : montant enregistré par le serveur', () => {
  jest.mock('../../utils/redisClient', () => ({
    getRedisClient: jest.fn().mockResolvedValue(null), getClient: jest.fn().mockReturnValue(null), isReady: jest.fn().mockReturnValue(false)
  }));
  const EvenementService = require('../../services/evenement/evenementService');
  const inscrire = async (evenement, typeConfig, data) => {
    const svc = Object.create(EvenementService.prototype);
    svc.models = { TypeEvenement: { findByPk: jest.fn().mockResolvedValue(typeConfig ? { config_inscription: typeConfig } : null) } };
    svc.repository = {
      findById: jest.fn().mockResolvedValue({ id_evenement: 9, statut: 'publie', id_type_evenement: 3, ...evenement }),
      countParticipants: jest.fn(), registerParticipant: jest.fn().mockResolvedValue({})
    };
    svc.withTransaction = async (cb) => cb({ LOCK: { UPDATE: 'UPDATE' } });
    svc.logger = { info: jest.fn() };
    await svc.registerParticipant(9, 38, data);
    return svc.repository.registerParticipant.mock.calls[0][2];
  };

  it('profil sans question dans le formulaire : « Vous êtes » demandé, nombre de personnes gardé, montant calculé', async () => {
    const opts = await inscrire({ tarif: 2000, tarification: { mode: 'profil', profils: PROFILS } }, null,
      { reponses: { profil: 'Étudiant' }, nombre_personnes: 2, commentaire: 'Deux étudiantes' });
    expect(opts.reponses_inscription).toEqual({ profil: 'Étudiant', nombre_personnes: 2, commentaire: 'Deux étudiantes' });
    expect(opts.montant_du).toBe(4000);
  });

  it('profil non choisi : inscription refusée', async () => {
    await expect(inscrire({ tarif: 2000, tarification: { mode: 'profil', profils: PROFILS } }, null, { reponses: {} }))
      .rejects.toThrow(/Vous êtes/);
  });

  it('le prix envoyé par le navigateur est ignoré', async () => {
    const opts = await inscrire({ tarif: 1500, tarification: { mode: 'payant' } }, null, { montant_du: 1, nombre_personnes: 1 });
    expect(opts.montant_du).toBe(1500);
  });
});
