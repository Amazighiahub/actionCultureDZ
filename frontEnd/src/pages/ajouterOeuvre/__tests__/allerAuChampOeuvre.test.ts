import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHAMPS_OEUVRE_DANS_L_ORDRE, allerAuChampOeuvre } from '../useAjouterOeuvre';

describe('aller au champ à corriger (ajouter une œuvre)', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('titre : vise la zone de la langue ouverte (site arabe : titre-ar)', () => {
    document.body.innerHTML = '<input id="titre-ar" /><span id="titre-ar-error"></span>';
    const el = document.getElementById('titre-ar') as HTMLInputElement;
    el.scrollIntoView = vi.fn();
    allerAuChampOeuvre('titre');
    expect(el.scrollIntoView).toHaveBeenCalled();
    expect(document.activeElement).toBe(el);
  });

  it('résumé : textarea de la langue ouverte', () => {
    document.body.innerHTML = '<textarea id="description-en"></textarea>';
    const el = document.getElementById('description-en') as HTMLTextAreaElement;
    el.scrollIntoView = vi.fn();
    allerAuChampOeuvre('description');
    expect(document.activeElement).toBe(el);
  });

  it('catégories : montre le début du bloc', () => {
    document.body.innerHTML = '<div id="categories" tabindex="-1"></div>';
    const el = document.getElementById('categories') as HTMLDivElement;
    el.scrollIntoView = vi.fn();
    allerAuChampOeuvre('categories');
    expect(el.scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: 'start' }));
  });

  it('ordre de la page : le résumé avant la langue', () => {
    expect(CHAMPS_OEUVRE_DANS_L_ORDRE.indexOf('description')).toBeLessThan(CHAMPS_OEUVRE_DANS_L_ORDRE.indexOf('id_langue'));
  });
});
