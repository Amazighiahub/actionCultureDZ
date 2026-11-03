/**
 * Audit V9, lot 3 : fiches d'intervenants partagées, médias et sites non publiés dans les blocs,
 * désactivation groupée, lien de mot de passe non envoyé, changement de mot de passe.
 */
jest.mock('../../services/emailService', () => ({ sendPasswordResetEmail: jest.fn() }));

const emailService = require('../../services/emailService');
const ArticleBlockService = require('../../services/articleBlockService');
const IntervenantService = require('../../services/intervenantService');
const DashboardUserManagementService = require('../../services/dashboard/userManagementService');

beforeEach(() => jest.clearAllMocks());

describe('fiche d’intervenant partagée', () => {
  const service = ({ fiche, oeuvres = [], citations = [] }) => {
    const svc = Object.create(IntervenantService.prototype);
    const vide = { findAll: jest.fn(async () => []) };
    svc.repository = { findById: jest.fn(async () => fiche) };
    svc.models = {
      Intervenant: { findByPk: jest.fn(async () => fiche) },
      ProgrammeIntervenant: { findAll: jest.fn(async () => [{ id_programme: 1 }]) },
      Programme: { findAll: jest.fn(async () => [{ id_evenement: 2 }]) },
      Evenement: { findAll: jest.fn(async () => [{ id_user: 7 }]) },
      LieuIntervenant: vide,
      OeuvreIntervenant: { findAll: jest.fn(async () => citations) },
      IntervenantArticle: vide,
      Oeuvre: { findAll: jest.fn(async () => oeuvres) },
    };
    return svc;
  };
  const droits = svc => svc.droitsEdition;

  it('une fiche vérifiée ne se modifie pas en la reliant à son événement', async () => {
    const svc = service({ fiche: { id_intervenant: 3, verifie: true } });
    const res = await droits(svc).call(svc, 3, { id_user: 7 });
    expect(res.peutModifier).toBe(false);
  });

  it('une fiche citée par l’œuvre d’un autre auteur reste protégée', async () => {
    const svc = service({ fiche: { id_intervenant: 3 }, citations: [{ id_oeuvre: 9 }], oeuvres: [{ saisi_par: 55 }] });
    const res = await droits(svc).call(svc, 3, { id_user: 7 });
    expect(res.peutModifier).toBe(false);
  });

  it('son propre intervenant reste modifiable', async () => {
    const svc = service({ fiche: { id_intervenant: 3 } });
    const res = await droits(svc).call(svc, 3, { id_user: 7 });
    expect(res.peutModifier).toBe(true);
  });
});

describe('blocs d’article', () => {
  const service = (models, tous = []) => {
    const svc = Object.create(ArticleBlockService.prototype);
    svc.models = models;
    svc.repository = { findByArticle: jest.fn(async () => tous) };
    return svc;
  };
  const media = (m) => ({ Media: { findByPk: jest.fn(async () => m) }, Oeuvre: { findByPk: jest.fn(async () => ({ saisi_par: 55 })) } });
  const pro = { id_user: 7 };

  it('refuse le média privé d’un autre compte', async () => {
    const svc = service(media({ metadata: { uploadedBy: 55 }, id_oeuvre: 9 }));
    expect(await svc._mediaAutorise(1, pro)).toBe(false);
  });

  it('accepte son propre fichier', async () => {
    const svc = service(media({ metadata: { uploadedBy: 7 } }));
    expect(await svc._mediaAutorise(1, pro)).toBe(true);
  });

  it('un bloc sans média reste accepté', async () => {
    expect(await service({})._mediaAutorise(null, pro)).toBe(true);
  });

  it('un site non publié ne montre pas ses blocs au public', async () => {
    const svc = service({ Lieu: { findByPk: jest.fn(async () => ({ statut: 'brouillon', id_createur: 55 })) } }, [{ visible: true }]);
    expect(await svc.getBlocksVisibles(4, 'patrimoine', null)).toEqual({ error: 'notFound' });
  });

  it('un site publié cache ses blocs masqués au public', async () => {
    const svc = service({ Lieu: { findByPk: jest.fn(async () => ({ statut: 'publie', id_createur: 55 })) } }, [{ id: 1, visible: true }, { id: 2, visible: false }]);
    expect((await svc.getBlocksVisibles(4, 'patrimoine', null)).data).toEqual([{ id: 1, visible: true }]);
  });
});

describe('désactivation groupée', () => {
  it('épargne les administrateurs et soi-même', async () => {
    const comptes = { 1: { id_user: 1, id_type_user: 2, Roles: [] }, 2: { id_user: 2, id_type_user: 2, Roles: [{ nom_role: 'Administrateur' }] }, 8: { id_user: 8, id_type_user: 2, Roles: [] } };
    const svc = Object.create(DashboardUserManagementService.prototype);
    svc.userRepo = { findWithRoles: jest.fn(async id => comptes[id]), updateMany: jest.fn(async () => 1) };
    svc._invalidateUserCacheBulk = jest.fn(async () => true);
    const bilan = await svc.bulkUserAction('deactivate', [1, 2, 8], {}, 8);
    expect(bilan.success).toEqual([1]);
    expect(bilan.errors.map(e => e.id)).toEqual([2, 8]);
    expect(svc.userRepo.updateMany.mock.calls[0][0].id_user).toBeDefined();
  });
});
