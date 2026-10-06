/**
 * UserRepository.hardDeleteUser — droit à l'effacement (RGPD art. 17).
 * L'ancienne version mettait id_user à NULL sur des colonnes NOT NULL
 * (Evenement, Commentaire, CritiqueEvaluation) : la suppression échouait toujours.
 */
const UserRepository = require('../../repositories/userRepository');
const { DELETED_USER_EMAIL } = require('../../repositories/userRepository');

const USER_ID = 42;
const SENTINEL_ID = 5;

const model = (name) => ({
  name,
  update: jest.fn().mockResolvedValue([1]),
  destroy: jest.fn().mockResolvedValue(1),
  create: jest.fn().mockResolvedValue({})
});

const makeRepo = ({ sentinelExists = true, user } = {}) => {
  const sentinel = { id_user: SENTINEL_ID, statut: 'inactif', update: jest.fn() };
  const target = user === undefined
    ? { id_user: USER_ID, email: 'a@b.dz', photo_url: 'https://res.cloudinary.com/x/p.jpg', documents_fournis: '["https://res.cloudinary.com/x/doc.pdf"]' }
    : user;
  const unscopedUser = {
    findByPk: jest.fn().mockResolvedValue(target),
    findOne: jest.fn().mockResolvedValue(sentinelExists ? sentinel : null),
    create: jest.fn().mockResolvedValue({ ...sentinel, statut: 'actif' }),
    destroy: jest.fn().mockResolvedValue(1)
  };
  const User = { ...model('User'), unscoped: () => unscopedUser };
  const names = ['UserRole', 'UserOrganisation', 'OeuvreUser', 'EvenementUser', 'Favori', 'Notification',
    'EmailVerification', 'CritiqueEvaluation', 'Signalement', 'Evenement', 'Commentaire', 'Parcours',
    'AuditLog', 'Oeuvre', 'EvenementOeuvre', 'DetailLieu', 'Lieu', 'LieuIntervenant', 'Service', 'Vue',
    'QRScan', 'Intervenant'];
  const models = { User };
  for (const n of names) models[n] = model(n);
  const repo = new UserRepository(models);
  repo.withTransaction = jest.fn(async (cb) => cb({ id: 'tx' }));
  return { repo, models, User, unscopedUser };
};

// Colonnes NOT NULL qui ne doivent jamais être mises à NULL
const NOT_NULL = { Evenement: 'id_user', Commentaire: 'id_user', CritiqueEvaluation: 'id_user', Parcours: 'id_createur' };

describe('hardDeleteUser', () => {
  it('ne met jamais à NULL une colonne obligatoire', async () => {
    const { repo, models } = makeRepo();
    await repo.hardDeleteUser(USER_ID, { adminId: 1 });
    for (const [name, col] of Object.entries(NOT_NULL)) {
      for (const [values] of models[name].update.mock.calls) {
        expect(values[col]).not.toBeNull();
      }
    }
  });

  it('rattache événements, commentaires et parcours au compte « Utilisateur supprimé », sans validation partielle', async () => {
    const { repo, models } = makeRepo();
    await repo.hardDeleteUser(USER_ID, { adminId: 1 });
    for (const [name, col] of [['Evenement', 'id_user'], ['Commentaire', 'id_user'], ['Parcours', 'id_createur']]) {
      expect(models[name].update).toHaveBeenCalledWith(
        { [col]: SENTINEL_ID },
        expect.objectContaining({ where: { [col]: USER_ID }, validate: false })
      );
    }
  });

  it('supprime critiques, signalements faits et reçus, favoris, notifications, jetons', async () => {
    const { repo, models } = makeRepo();
    await repo.hardDeleteUser(USER_ID, { adminId: 1 });
    expect(models.CritiqueEvaluation.destroy).toHaveBeenCalledWith(expect.objectContaining({ where: { id_user: USER_ID } }));
    expect(models.Signalement.destroy).toHaveBeenCalledWith(expect.objectContaining({ where: { id_user_signalant: USER_ID } }));
    expect(models.Signalement.destroy).toHaveBeenCalledWith(expect.objectContaining({ where: { type_entite: 'user', id_entite: USER_ID } }));
    for (const n of ['Favori', 'Notification', 'EmailVerification', 'UserRole']) {
      expect(models[n].destroy).toHaveBeenCalledWith(expect.objectContaining({ where: { id_user: USER_ID } }));
    }
  });

  it('retire les coordonnées de la fiche intervenant liée', async () => {
    const { repo, models } = makeRepo();
    await repo.hardDeleteUser(USER_ID, {});
    expect(models.Intervenant.update).toHaveBeenCalledWith(
      { id_user: null, email: null, telephone: null },
      expect.objectContaining({ where: { id_user: USER_ID } })
    );
  });

  it('journal d\'audit : bons champs, email haché, suppression par soi-même tracée', async () => {
    const { repo, models } = makeRepo();
    await repo.hardDeleteUser(USER_ID, { adminId: null, userEmail: 'a@b.dz' });
    const entry = models.AuditLog.create.mock.calls[0][0];
    expect(entry).toMatchObject({ action: 'SELF_DELETE_USER', entity_type: 'user', entity_id: USER_ID });
    expect(JSON.stringify(entry)).not.toContain('a@b.dz');
    expect(entry.details.email_sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('supprime le compte et renvoie les fichiers à effacer', async () => {
    const { repo, unscopedUser } = makeRepo();
    const res = await repo.hardDeleteUser(USER_ID, { adminId: 1 });
    expect(unscopedUser.destroy).toHaveBeenCalledWith(expect.objectContaining({ where: { id_user: USER_ID } }));
    expect(res).toEqual({
      deleted: true,
      type: 'hard',
      files: ['https://res.cloudinary.com/x/p.jpg', 'https://res.cloudinary.com/x/doc.pdf']
    });
  });

  it('crée le compte réservé s\'il n\'existe pas, et le rend inactif', async () => {
    const { repo, unscopedUser } = makeRepo({ sentinelExists: false });
    await repo.hardDeleteUser(USER_ID, { adminId: 1 });
    expect(unscopedUser.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: DELETED_USER_EMAIL, profil_public: false }),
      expect.anything()
    );
  });

  it('refuse de supprimer le compte réservé lui-même', async () => {
    const { repo } = makeRepo({ user: { id_user: SENTINEL_ID, email: DELETED_USER_EMAIL } });
    await expect(repo.hardDeleteUser(SENTINEL_ID, {})).rejects.toThrow(/ne peut pas être supprimé/);
  });
});

describe('deleteUserFiles', () => {
  const { deleteUserFiles } = require('../../services/user/userFileCleanup');
  const count = (n) => ({ count: jest.fn().mockResolvedValue(n) });

  it('ne supprime pas un fichier encore utilisé par un autre compte ou un média', async () => {
    const uploadService = { deleteFile: jest.fn().mockResolvedValue(true) };
    const models = { User: { unscoped: () => count(1) }, Media: count(0) };
    const res = await deleteUserFiles(models, ['https://res.cloudinary.com/x/autre.jpg'], { uploadService });
    expect(uploadService.deleteFile).not.toHaveBeenCalled();
    expect(res.skipped).toBe(1);
  });

  it('supprime un fichier orphelin ; une erreur Cloudinary ne bloque pas', async () => {
    const uploadService = { deleteFile: jest.fn().mockResolvedValueOnce(true).mockRejectedValueOnce(new Error('cloudinary down')) };
    const models = { User: { unscoped: () => count(0) }, Media: count(0) };
    const res = await deleteUserFiles(models, ['u1', 'u2'], { uploadService });
    expect(res).toEqual({ deleted: 1, skipped: 0, failed: 1 });
  });
});
