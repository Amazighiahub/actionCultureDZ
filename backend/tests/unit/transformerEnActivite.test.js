/**
 * Anti-retour (2026-11-17) : un événement créé par erreur au lieu d'une activité est transformé en
 * activité d'un autre événement du même organisateur, sans rien perdre (photos, inscrits sans
 * doublon, favoris) et en prévenant ses inscrits.
 */
const { jourEtHeure, activiteDepuis, apercu, transformer } = require('../../services/evenement/transformerEnActivite');

const ligne = (donnees) => ({ ...donnees, update: jest.fn().mockResolvedValue(), destroy: jest.fn().mockResolvedValue() });

function modeles({ source = {}, cible = {}, activites = [], inscritsSource = [], inscritsCible = [], favorisSource = [], favorisCible = [] } = {}) {
  const src = ligne({ id_evenement: 10, id_user: 37, nom_evenement: { fr: 'Atelier calligraphie' }, description: { fr: 'Initiation' },
    date_debut: '2026-11-20T09:00:00.000Z', date_fin: '2026-11-20T11:30:00.000Z', id_lieu: 4, statut: 'publie', ...source });
  const dst = ligne({ id_evenement: 20, id_user: 37, nom_evenement: { fr: 'Festival' }, statut: 'publie', ...cible });
  const query = jest.fn().mockResolvedValue([]);
  // Une inscription : un numéro de personne, ou { id_user, statut_participation, date_paiement }
  const inscription = (i) => ligne(typeof i === 'object' ? { statut_participation: 'inscrit', ...i } : { id_user: i, statut_participation: 'inscrit' });
  const lignesInscritsSource = inscritsSource.map(inscription);
  const lignesInscritsCible = inscritsCible.map(inscription);
  const models = {
    Evenement: {
      findAll: jest.fn().mockResolvedValue([src, dst].sort((a, b) => a.id_evenement - b.id_evenement)),
      findByPk: jest.fn().mockResolvedValue(src),
      sequelize: { transaction: (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }), query }
    },
    Programme: {
      max: jest.fn().mockResolvedValue(3),
      count: jest.fn().mockResolvedValue(activites.length),
      findAll: jest.fn().mockResolvedValue(activites.map(ligne)),
      create: jest.fn().mockResolvedValue({ id_programme: 99 })
    },
    Media: { update: jest.fn().mockResolvedValue([1]), count: jest.fn().mockResolvedValue(2) },
    EvenementUser: {
      findAll: jest.fn(async ({ where, raw }) => {
        const lignes = where.id_evenement === 20 ? lignesInscritsCible : lignesInscritsSource;
        return raw ? lignes.map(({ id_user, statut_participation }) => ({ id_user, statut_participation })) : lignes;
      })
    },
    EvenementOeuvre: { findAll: jest.fn().mockResolvedValue([]) },
    Commentaire: { update: jest.fn().mockResolvedValue() },
    Favori: {
      findAll: jest.fn(async ({ where }) => (where.id_entite === 20 ? favorisCible.map((id_user) => ({ id_user })) : favorisSource.map((id_user) => ligne({ id_user }))))
    },
    Vue: { getTableName: () => 'vue' }
  };
  return { models, src, dst, query, lignesInscritsSource, lignesInscritsCible };
}

describe('Transformer un événement en activité', () => {
  test('jour et heure d’Algérie ; jour sans heure reconnu', () => {
    expect(jourEtHeure('2026-11-20T09:00:00.000Z')).toEqual({ jour: '2026-11-20', heure: '10:00:00' });
    expect(jourEtHeure('2026-11-20T00:00:00.000Z')).toEqual({ jour: '2026-11-20', heure: null });
    expect(jourEtHeure('2026-11-20T23:30:00.000Z')).toEqual({ jour: '2026-11-21', heure: '00:30:00' });
  });

  test('activité faite de l’événement : titre, jour, heures, lieu ; description exigée en fr ou ar', () => {
    const { src } = modeles();
    expect(activiteDepuis(src, 20, 4)).toMatchObject({
      id_evenement: 20, titre: { fr: 'Atelier calligraphie' }, description: { fr: 'Initiation' }, id_lieu: 4,
      date_programme: '2026-11-20', heure_debut: '10:00:00', heure_fin: '12:30:00', ordre: 4
    });
    const sansDescription = activiteDepuis({ ...src, description: { en: 'Intro' } }, 20, 1);
    expect(sansDescription.description).toEqual({ en: 'Intro', fr: 'Atelier calligraphie' });
    // Fin un autre jour : pas d'heure de fin (une activité tient en une journée)
    expect(activiteDepuis({ ...src, date_fin: '2026-11-22T15:00:00.000Z' }, 20, 1).heure_fin).toBeNull();
  });

  test('refus : même événement, organisateurs différents, événement gardé annulé', async () => {
    await expect(apercu(modeles().models, 10, 10)).rejects.toMatchObject({ code: 'MEME_EVENEMENT' });
    await expect(apercu(modeles({ cible: { id_user: 8 } }).models, 10, 20)).rejects.toMatchObject({ code: 'ORGANISATEURS_DIFFERENTS' });
    await expect(transformer(modeles({ cible: { statut: 'annule' } }).models, 10, 20)).rejects.toMatchObject({ code: 'CIBLE_ANNULEE' });
  });

  test('anti-retour 2026-11-19 : destination en brouillon, en attente ou sans organisateur refusée', async () => {
    for (const statut of ['brouillon', 'en_attente']) {
      await expect(apercu(modeles({ cible: { statut } }).models, 10, 20)).rejects.toMatchObject({ code: 'CIBLE_NON_PUBLIQUE' });
    }
    await expect(apercu(modeles({ source: { id_user: null }, cible: { id_user: null } }).models, 10, 20)).rejects.toMatchObject({ code: 'ORGANISATEURS_DIFFERENTS' });
    await expect(apercu(modeles({ cible: { statut: 'termine' } }).models, 10, 20)).resolves.toBeTruthy();
  });

  test('anti-retour 2026-11-19 : une personne inscrite aux deux garde l’inscription la plus forte (payée)', async () => {
    const { models, lignesInscritsSource, lignesInscritsCible } = modeles({
      inscritsSource: [{ id_user: 1, statut_participation: 'confirme', date_paiement: '2026-11-10' }, { id_user: 2, statut_participation: 'annule' }],
      inscritsCible: [{ id_user: 1, statut_participation: 'annule' }, { id_user: 2, statut_participation: 'inscrit' }]
    });
    await transformer(models, 10, 20);
    // Personne 1 : l'inscription payée de l'événement en double remplace l'annulation
    expect(lignesInscritsCible[0].destroy).toHaveBeenCalled();
    expect(lignesInscritsSource[0].update).toHaveBeenCalledWith({ id_evenement: 20 }, expect.anything());
    // Personne 2 : son inscription à l'événement gardé reste, l'annulation part
    expect(lignesInscritsSource[1].destroy).toHaveBeenCalled();
    expect(lignesInscritsCible[1].destroy).not.toHaveBeenCalled();
  });

  test('aperçu : inscrits déplacés et déjà inscrits comptés à part', async () => {
    const { models } = modeles({ inscritsSource: [1, 2, 3], inscritsCible: [2] });
    await expect(apercu(models, 10, 20)).resolves.toMatchObject({ activites: 1, photos: 2, inscrits: 2, dejaInscrits: 1 });
  });

  test('transformation : activité créée, photos rattachées, inscrits sans doublon, favoris, vues, puis suppression', async () => {
    const { models, src, query, lignesInscritsSource } = modeles({ inscritsSource: [1, 2], inscritsCible: [2], favorisSource: [5, 6], favorisCible: [6] });
    const resultat = await transformer(models, 10, 20);

    expect(models.Programme.create).toHaveBeenCalledWith(expect.objectContaining({ id_evenement: 20, ordre: 4 }), expect.anything());
    expect(models.Media.update).toHaveBeenCalledWith({ id_programme: 99 }, expect.objectContaining({ where: { id_evenement: 10, id_programme: null } }));
    expect(models.Media.update).toHaveBeenCalledWith({ id_evenement: 20 }, expect.objectContaining({ where: { id_evenement: 10 } }));
    // Personne 1 déplacée ; personne 2 déjà inscrite à l'événement gardé : sa ligne en double part
    expect(lignesInscritsSource[0].update).toHaveBeenCalledWith({ id_evenement: 20 }, expect.anything());
    expect(lignesInscritsSource[1].destroy).toHaveBeenCalled();
    expect(models.Commentaire.update).toHaveBeenCalledWith({ id_evenement: 20 }, expect.anything());
    expect(query.mock.calls[0][0]).toMatch(/UPDATE IGNORE `vue`/);
    expect(src.destroy).toHaveBeenCalled();
    expect(resultat).toMatchObject({ aPrevenir: [1, 2], nomSource: 'Atelier calligraphie' });
  });

  test('activités existantes déplacées à la suite, aucune activité créée', async () => {
    const { models } = modeles({ activites: [{ id_programme: 1 }, { id_programme: 2 }] });
    await transformer(models, 10, 20);
    expect(models.Programme.create).not.toHaveBeenCalled();
    const deplacees = await models.Programme.findAll.mock.results[0].value;
    expect(deplacees[0].update).toHaveBeenCalledWith({ id_evenement: 20, ordre: 4 }, expect.anything());
    expect(deplacees[1].update).toHaveBeenCalledWith({ id_evenement: 20, ordre: 5 }, expect.anything());
    expect(models.Media.update).not.toHaveBeenCalledWith({ id_programme: 99 }, expect.anything());
  });
});
