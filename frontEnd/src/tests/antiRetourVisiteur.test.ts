/**
 * Anti-retour (2026-11-27, analyse V12, lot visiteur et référencement) :
 * - Google voit l'auteur crédité, l'année de l'œuvre, sa langue et son nombre de pages ;
 * - « Retour » ne fait plus quitter le site à la personne arrivée directement sur une page.
 */
import { describe, test, expect, afterEach } from 'vitest';
import { buildOeuvreJsonLd } from '@/components/SEOHead';
import { aPagePrecedenteSurLeSite } from '@/hooks/useRetour';

describe('Données structurées d’un livre', () => {
  test('auteur crédité (intervenant), année, langue, pages, adresse avec le nom', () => {
    const ld = buildOeuvreJsonLd({
      id_oeuvre: 4, id_type_oeuvre: 1, titre: 'Nedjma', annee_creation: 1956, date_creation: '2026-10-01',
      Langue: { code: 'fr' }, Livre: { isbn: '978', nb_pages: 256 }, Users: [],
      OeuvreIntervenants: [{ role_principal: false, Intervenant: { prenom: 'Kateb', nom: 'Yacine' } }],
    });
    expect(ld.author).toEqual({ '@type': 'Person', name: 'Kateb Yacine' });
    expect(ld.datePublished).toBe('1956');
    expect(ld.inLanguage).toBe('fr');
    expect(ld.numberOfPages).toBe(256);
    expect(ld.url).toMatch(/\/oeuvres\/4-nedjma$/);
  });

  test('membre au rôle principal avant les intervenants', () => {
    const ld = buildOeuvreJsonLd({
      id_oeuvre: 5, titre: 'X', Users: [{ prenom: 'A', nom: 'Second' }, { prenom: 'Sara', nom: 'Principale', OeuvreUser: { role_principal: true } }],
      OeuvreIntervenants: [{ role_principal: true, Intervenant: { prenom: 'I', nom: 'Intervenant' } }],
    });
    expect(ld.author.name).toBe('Sara Principale');
  });
});

describe('Bouton « Retour »', () => {
  afterEach(() => window.history.replaceState(null, ''));
  test('première page ouverte sur le site : pas de page précédente', () => {
    window.history.replaceState({ idx: 0 }, '');
    expect(aPagePrecedenteSurLeSite()).toBe(false);
    window.history.replaceState(null, '');
    expect(aPagePrecedenteSurLeSite()).toBe(false);
  });
  test('déjà une page du site avant : retour possible', () => {
    window.history.replaceState({ idx: 2 }, '');
    expect(aPagePrecedenteSurLeSite()).toBe(true);
  });
});
