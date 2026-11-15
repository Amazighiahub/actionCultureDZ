/**
 * Programme d'un événement terminé : l'organisateur peut le compléter après coup (description,
 * intervenants et photos de chaque jour), sans notification aux inscrits. Annulé : refusé avec un
 * code clair. Un autre compte : toujours refusé.
 */
const ProgrammeService = require('../../services/programmeService');

const refus = (evenement, userId) => ProgrammeService.prototype._refusEvenement.call({}, evenement, userId);
const aNotifier = (statutEvenement, updates) => ProgrammeService.prototype._changementANotifier.call({},
  { statut: 'planifie', heure_debut: '10:00:00', date_programme: '2026-10-29', Evenement: { statut: statutEvenement } }, updates);

describe('programme d’un événement terminé', () => {
  it('l’organisateur complète le programme d’un événement terminé', () => {
    expect(refus({ id_user: 12, statut: 'termine' }, 12)).toBeNull();
    expect(refus({ id_user: 12, statut: 'publie' }, '12')).toBeNull();
  });

  it('événement annulé : code clair ; autre compte : refusé', () => {
    expect(refus({ id_user: 12, statut: 'annule' }, 12)).toBe('evenementAnnule');
    expect(refus({ id_user: 12, statut: 'termine' }, 99)).toBe('forbidden');
  });

  it('aucune notification aux inscrits pour un événement terminé, même si l’heure change', () => {
    expect(aNotifier('termine', { heure_debut: '15:00:00' })).toBeNull();
    expect(aNotifier('publie', { heure_debut: '15:00:00' })).toBe('general');
  });
});
