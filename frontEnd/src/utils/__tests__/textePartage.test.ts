import { describe, it, expect } from 'vitest';
import { dateLisible, texteEvenement, texteAvecLieu, lienWhatsApp } from '../textePartage';

describe('texte de partage', () => {
  it('date à l’heure d’Alger, sans heure pour un jour entier ; chiffres occidentaux en arabe', () => {
    expect(dateLisible('2026-12-22T00:00:00.000Z', 'fr')).toBe('22 décembre 2026');
    expect(dateLisible('2026-11-20T09:00:00.000Z', 'fr')).toBe('20 novembre 2026, 10:00');
    expect(dateLisible('2026-12-22T00:00:00.000Z', 'ar')).toMatch(/22/);
    expect(dateLisible(null, 'fr')).toBe('');
  });

  it('événement : titre, dates du premier au dernier jour, lieu', () => {
    expect(texteEvenement({ titre: 'Chantier-école Ghoufi', debut: '2026-12-22T00:00:00.000Z', fin: '2027-01-02T00:00:00.000Z', lieu: 'Ghoufi, Batna', langue: 'fr' }))
      .toBe('Chantier-école Ghoufi\n📅 22 décembre 2026 – 2 janvier 2027\n📍 Ghoufi, Batna');
    expect(texteEvenement({ titre: 'Conférence', debut: '2026-11-20T17:00:00.000Z', langue: 'fr' })).toBe('Conférence\n📅 20 novembre 2026, 18:00');
  });

  it('lieu et lien WhatsApp (texte puis adresse, encodés)', () => {
    expect(texteAvecLieu('Kalâa des Béni Hammad', 'Maadid, Msila')).toBe('Kalâa des Béni Hammad\n📍 Maadid, Msila');
    expect(texteAvecLieu('Sans lieu', null)).toBe('Sans lieu');
    const lien = new URL(lienWhatsApp('آفاق الواحة', 'https://taladz.com/evenements/5'));
    expect(lien.origin).toBe('https://wa.me');
    expect(lien.searchParams.get('text')).toBe('آفاق الواحة\nhttps://taladz.com/evenements/5');
  });
});
