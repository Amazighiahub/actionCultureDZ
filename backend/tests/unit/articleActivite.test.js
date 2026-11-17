/**
 * Anti-retour (2026-11-17) : un article (compte rendu) rattaché à une activité du programme s'affiche
 * sous cette activité ; l'activité doit appartenir au même événement.
 */
const EvenementService = require('../../services/evenement/evenementService');
const ProgrammeService = require('../../services/programmeService');

describe('Article rattaché à une activité', () => {
  test('l’activité doit faire partie de l’événement ; vide = tout l’événement', async () => {
    const findOne = jest.fn(async ({ where }) => (where.id_programme === 5 && where.id_evenement === 70 ? { id_programme: 5 } : null));
    const service = Object.create(EvenementService.prototype);
    service.models = { Programme: { findOne } };
    service._validationError = (m) => Object.assign(new Error(m), { statusCode: 400 });
    await expect(service._activiteDeLEvenement(70, null)).resolves.toBeNull();
    await expect(service._activiteDeLEvenement(70, '')).resolves.toBeNull();
    await expect(service._activiteDeLEvenement(70, '5')).resolves.toBe(5);
    await expect(service._activiteDeLEvenement(71, 5)).rejects.toMatchObject({ statusCode: 400 });
    await expect(service._activiteDeLEvenement(70, 'abc')).rejects.toMatchObject({ statusCode: 400 });
  });

  test('le programme donne à chaque activité ses articles publiés', async () => {
    const lien = (id_programme, id_oeuvre) => ({ id_programme, Oeuvre: { get: () => ({ id_oeuvre, titre: { ar: 'آفاق الواحة' }, id_type_oeuvre: 4 }) } });
    const findAll = jest.fn().mockResolvedValue([lien(5, 900), lien(5, 901), lien(6, 902)]);
    const service = Object.create(ProgrammeService.prototype);
    service.models = { EvenementOeuvre: { findAll, rawAttributes: { id_programme: {} } }, Oeuvre: {} };
    const programmes = [5, 6, 7].map((id) => {
      const valeurs = { id_programme: id };
      return { id_programme: id, setDataValue: (k, v) => { valeurs[k] = v; }, valeurs };
    });
    await service._ajouterOeuvresLiees(70, programmes);
    expect(programmes[0].valeurs.oeuvres_liees.map((o) => o.id_oeuvre)).toEqual([900, 901]);
    expect(programmes[1].valeurs.oeuvres_liees.map((o) => o.id_oeuvre)).toEqual([902]);
    expect(programmes[2].valeurs.oeuvres_liees).toEqual([]);
    // Seulement les articles publiés de cet événement
    const options = findAll.mock.calls[0][0];
    expect(options.where.id_evenement).toBe(70);
    expect(options.include[0].where).toEqual({ statut: 'publie' });
  });
});
