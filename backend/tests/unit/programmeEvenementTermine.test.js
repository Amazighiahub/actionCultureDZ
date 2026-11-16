/**
 * Programme d'un événement : l'organisateur le complète aussi après la fin (description, intervenants,
 * photos de chaque jour) ; l'équipe peut l'aider ; annulé : refusé avec un code clair. Les inscrits sont
 * toujours prévenus d'un changement (décision de la responsable, 2026-11-16), terminé compris.
 * Titre facultatif : vide, le début de la description le remplace.
 */
const ProgrammeService = require('../../services/programmeService');

const svc = Object.create(ProgrammeService.prototype);
const refus = (evenement, userId, equipe) => svc._refusEvenement(evenement, userId, equipe);
const aNotifier = (statutEvenement, updates) => svc._changementANotifier(
  { statut: 'planifie', heure_debut: '10:00:00', date_programme: '2026-10-29', Evenement: { statut: statutEvenement } }, updates);

describe('programme d’un événement', () => {
  it('l’organisateur complète le programme d’un événement terminé', () => {
    expect(refus({ id_user: 12, statut: 'termine' }, 12)).toBeNull();
    expect(refus({ id_user: 12, statut: 'publie' }, '12')).toBeNull();
  });

  it('annulé : code clair ; autre compte : refusé ; l’équipe peut aider', () => {
    expect(refus({ id_user: 12, statut: 'annule' }, 12)).toBe('evenementAnnule');
    expect(refus({ id_user: 12, statut: 'termine' }, 99)).toBe('forbidden');
    expect(refus({ id_user: 12, statut: 'termine' }, 99, true)).toBeNull();
    expect(refus({ id_user: 12, statut: 'annule' }, 99, true)).toBe('evenementAnnule');
  });

  it('les inscrits sont prévenus d’un changement, terminé compris ; pas un brouillon', () => {
    expect(aNotifier('termine', { heure_debut: '15:00:00' })).toBe('general');
    expect(aNotifier('publie', { heure_debut: '15:00:00' })).toBe('general');
    expect(aNotifier('brouillon', { heure_debut: '15:00:00' })).toBeNull();
  });

  it('titre vide : début de la description, dans chaque langue ; titre donné : gardé', () => {
    expect(svc._titreOuDescription({}, { fr: 'Vernissage et rencontre. Puis visite guidée.', ar: 'افتتاح المعرض؟ ثم زيارة' }))
      .toEqual({ fr: 'Vernissage et rencontre.', ar: 'افتتاح المعرض؟' });
    expect(svc._titreOuDescription({ fr: 'J2' }, { fr: 'Long texte' })).toEqual({ fr: 'J2' });
    const long = 'a'.repeat(80);
    expect(svc._titreOuDescription(null, { fr: long }).fr).toHaveLength(60);
    expect(svc._titreOuDescription(null, null)).toEqual({});
  });
});
