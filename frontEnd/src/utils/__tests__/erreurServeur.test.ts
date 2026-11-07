import { describe, it, expect } from 'vitest';
import { messageErreurServeur, detailsDesChamps } from '../erreurServeur';

describe('messageErreurServeur', () => {
  it('donne les raisons champ par champ plutôt que « Données invalides »', () => {
    const err = { message: 'Données invalides', details: [{ field: 'capacite_max', message: 'Capacité invalide' }, { field: 'x', message: 'Capacité invalide' }] };
    expect(messageErreurServeur(err, 'défaut')).toBe('Capacité invalide');
  });
  it('message du serveur quand il n’y a pas de détail', () => {
    expect(messageErreurServeur({ success: false, error: 'La date de début est passée' }, 'défaut')).toBe('La date de début est passée');
    expect(messageErreurServeur(new Error('Accès refusé'), 'défaut')).toBe('Accès refusé');
  });
  it('texte technique ou page HTML : message par défaut', () => {
    expect(messageErreurServeur(new Error('Request failed with status code 500'), 'défaut')).toBe('défaut');
    expect(messageErreurServeur({ error: '<html><body>413</body></html>' }, 'défaut')).toBe('défaut');
    expect(messageErreurServeur(null, 'défaut')).toBe('défaut');
  });
  it('détails mal formés ignorés', () => {
    expect(detailsDesChamps({ details: { a: 1 } })).toEqual([]);
    expect(detailsDesChamps({ details: [null, { field: 'a' }] })).toEqual([]);
  });
});
