/**
 * Organisations partenaires d'un événement (co-organisateur, partenaire, sponsor, média, soutien), en
 * plus de l'organisation principale ; et avertissement du professionnel au nom duquel l'administration
 * a ajouté un événement.
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));
const EvenementService = require('../../services/evenement/evenementService');

const service = ({ orgs = [], membreDe = [] } = {}) => {
  const s = Object.create(EvenementService.prototype);
  s.models = {
    Organisation: { findAll: jest.fn().mockResolvedValue(orgs) },
    UserOrganisation: { findAll: jest.fn().mockResolvedValue(membreDe.map((id) => ({ id_organisation: id }))) },
    EvenementOrganisation: { destroy: jest.fn().mockResolvedValue(0), bulkCreate: jest.fn().mockResolvedValue([]) }
  };
  return s;
};

describe('partenaires : lecture du formulaire', () => {
  it('champ absent : rien ne change (null) ; texte JSON lu, doublons fusionnés', async () => {
    const s = service({ orgs: [{ id_organisation: 30, statut: 'valide' }] });
    await expect(s._lirePartenaires(undefined, 9, false)).resolves.toBeNull();
    await expect(s._lirePartenaires('[]', 9, false)).resolves.toEqual([]);
    await expect(s._lirePartenaires('[{"id_organisation":30,"role":"partenaire"},{"id_organisation":"30","role":"sponsor"}]', 9, false))
      .resolves.toEqual([{ id_organisation: 30, role: 'sponsor' }]);
  });

  it('refusé (400) : texte illisible, rôle inconnu ou principal, plus de dix, organisation absente ou refusée', async () => {
    const s = service({ orgs: [{ id_organisation: 30, statut: 'rejete' }] });
    await expect(s._lirePartenaires('{pas du json', 9, false)).rejects.toMatchObject({ statusCode: 400 });
    await expect(s._lirePartenaires([{ id_organisation: 30, role: 'organisateur_principal' }], 9, false)).rejects.toMatchObject({ statusCode: 400 });
    await expect(s._lirePartenaires([{ id_organisation: 0, role: 'partenaire' }], 9, false)).rejects.toMatchObject({ statusCode: 400 });
    const onze = Array.from({ length: 11 }, (_, i) => ({ id_organisation: i + 1, role: 'partenaire' }));
    await expect(s._lirePartenaires(onze, 9, true)).rejects.toMatchObject({ statusCode: 400 });
    await expect(s._lirePartenaires([{ id_organisation: 30, role: 'partenaire' }], 9, true)).rejects.toMatchObject({ statusCode: 400 });
    await expect(service()._lirePartenaires([{ id_organisation: 31, role: 'partenaire' }], 9, true)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('organisation en attente : acceptée pour l’administration, un membre, ou si déjà liée ; refusée sinon', async () => {
    const enAttente = { orgs: [{ id_organisation: 30, statut: 'en_attente' }] };
    const liste = [{ id_organisation: 30, role: 'soutien' }];
    await expect(service(enAttente)._lirePartenaires(liste, 9, false)).rejects.toMatchObject({ statusCode: 400 });
    await expect(service(enAttente)._lirePartenaires(liste, 75, true)).resolves.toEqual(liste);
    await expect(service({ ...enAttente, membreDe: [30] })._lirePartenaires(liste, 9, false)).resolves.toEqual(liste);
    await expect(service(enAttente)._lirePartenaires(liste, 9, false, [30])).resolves.toEqual(liste);
  });
});

describe('partenaires : enregistrement', () => {
  it('remplace les partenaires sans toucher l’organisation principale, qui n’est pas recopiée', async () => {
    const s = service();
    await s._syncPartenaires(5, [{ id_organisation: 10, role: 'partenaire' }, { id_organisation: 30, role: 'sponsor' }], '10', 'tx');
    const filtre = s.models.EvenementOrganisation.destroy.mock.calls[0][0].where;
    expect(filtre.id_evenement).toBe(5);
    expect(filtre.role[require('sequelize').Op.ne]).toBe('organisateur_principal');
    expect(s.models.EvenementOrganisation.bulkCreate).toHaveBeenCalledWith(
      [{ id_evenement: 5, id_organisation: 30, role: 'sponsor' }], { transaction: 'tx', ignoreDuplicates: true });
  });

  it('champ absent : aucune écriture', async () => {
    const s = service();
    await s._syncPartenaires(5, null, 10, 'tx');
    expect(s.models.EvenementOrganisation.destroy).not.toHaveBeenCalled();
  });
});

describe('organisateur désigné : averti', () => {
  const evenement = (statut) => ({ id_evenement: 5, id_user: 21, statut, nom_evenement: { fr: 'Horizons de l’Oasis' } });

  it('événement publié : notification et abonnés prévenus', async () => {
    const s = Object.create(EvenementService.prototype);
    s.notificationService = { sendToUser: jest.fn().mockResolvedValue({}) };
    s._prevenirAbonnes = jest.fn().mockResolvedValue();
    await s._prevenirOrganisateurDesigne(evenement('publie'));
    expect(s.notificationService.sendToUser).toHaveBeenCalledWith(21, expect.objectContaining({
      titre: 'Événement ajouté à votre nom', url_action: '/modifier-evenement/5'
    }));
    expect(s.notificationService.sendToUser.mock.calls[0][1].message).toMatch(/a publié « Horizons de l’Oasis »/);
    expect(s._prevenirAbonnes).toHaveBeenCalledWith(21, 'Horizons de l’Oasis', expect.any(String), 5);
  });

  it('brouillon : notification seulement', async () => {
    const s = Object.create(EvenementService.prototype);
    s.notificationService = { sendToUser: jest.fn().mockResolvedValue({}) };
    s._prevenirAbonnes = jest.fn();
    await s._prevenirOrganisateurDesigne(evenement('brouillon'));
    expect(s.notificationService.sendToUser.mock.calls[0][1].message).toMatch(/a préparé/);
    expect(s._prevenirAbonnes).not.toHaveBeenCalled();
  });
});
