/**
 * Lot 2 des services : équipements et langues en listes fermées, capacité entière, lien de réservation
 * en http(s) seulement, WhatsApp ; un champ absent n'est pas remplacé.
 */
const { detailsService, EQUIPEMENTS, LANGUES } = require('../../services/service/detailsService');

describe('détails d’un service', () => {
  it('listes fermées : clés inconnues ignorées, sans doublon, dans l’ordre de la liste', () => {
    expect(detailsService({ equipements: ['piscine', 'wifi', 'wifi', '<script>', 'sauna'] }).equipements).toEqual(['wifi', 'piscine']);
    expect(detailsService({ langues: ['fr', 'ar', 'klingon'] }).langues).toEqual(['ar', 'fr']);
    expect(detailsService({ equipements: [] }).equipements).toBeNull();
    expect(EQUIPEMENTS).toContain('acces_handicape');
    expect(LANGUES).toEqual(expect.arrayContaining(['ar', 'dz', 'tz', 'fr', 'en']));
  });

  it('champ absent : rien n’est remplacé ; vide : effacé', () => {
    expect(detailsService({ nom: 'x' })).toEqual({});
    expect(detailsService({ capacite: '', lien_reservation: '', whatsapp: '' })).toEqual({ capacite: null, lien_reservation: null, whatsapp: null });
  });

  it('capacité : entier de 1 à 100 000', () => {
    expect(detailsService({ capacite: '40' }).capacite).toBe(40);
    for (const v of [0, -3, 2.5, 'beaucoup', 100001]) expect(() => detailsService({ capacite: v })).toThrow(/Capacité invalide/);
  });

  it('réservation : seulement http(s) ; WhatsApp : un numéro', () => {
    expect(detailsService({ lien_reservation: ' https://reservation.example.com/hotel ' }).lien_reservation).toBe('https://reservation.example.com/hotel');
    for (const v of ['javascript:alert(1)', 'data:text/html,x', 'pas un lien']) expect(() => detailsService({ lien_reservation: v })).toThrow(/Lien de réservation invalide/);
    expect(detailsService({ whatsapp: '+213 555 12 34 56' }).whatsapp).toBe('+213 555 12 34 56');
    expect(() => detailsService({ whatsapp: 'appelez-moi' })).toThrow(/WhatsApp/);
    expect(() => detailsService({ capacite: 0 })).toThrow(expect.objectContaining({ statusCode: 400 }));
  });

  it('liste reçue en texte JSON (formulaire multipart)', () => {
    expect(detailsService({ equipements: '["wifi","piscine"]' }).equipements).toEqual(['wifi', 'piscine']);
    expect(detailsService({ langues: 'fr' }).langues).toEqual(['fr']);
  });
});
