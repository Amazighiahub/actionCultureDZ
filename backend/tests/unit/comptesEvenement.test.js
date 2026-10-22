/**
 * Comptes d'inscriptions (sous-requêtes SQL) et règle de capacité :
 * une place est prise par toute inscription non annulée.
 */
const { attributsComptes, STATUTS_PLACE_PRISE } = require('../../utils/comptesEvenement');

describe('utils/comptesEvenement', () => {
  it('deux sous-requêtes : places prises (non annulées) et participants confirmés', () => {
    const [[inscrits, a1], [participants, a2]] = attributsComptes();
    expect(a1).toBe('nombre_inscrits');
    expect(a2).toBe('nombre_participants');
    expect(inscrits.val).toMatch(/FROM evenementusers eu WHERE eu\.id_evenement = `Evenement`\.`id_evenement` AND eu\.statut_participation <> 'annule'/);
    expect(participants.val).toMatch(/IN \('confirme', 'present'\)/);
  });

  it('alias de table personnalisable', () => {
    expect(attributsComptes('e')[0][0].val).toContain('`e`.`id_evenement`');
  });

  it('une inscription « inscrit » (pas encore confirmée) occupe déjà une place', () => {
    expect(STATUTS_PLACE_PRISE).toEqual(expect.arrayContaining(['inscrit', 'confirme', 'present']));
    expect(STATUTS_PLACE_PRISE).not.toContain('annule');
  });
});
