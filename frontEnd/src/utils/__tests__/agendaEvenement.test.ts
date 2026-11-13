import { describe, it, expect } from 'vitest';
import { bornesAgenda, fichierIcs, lienGoogleAgenda } from '../agendaEvenement';

const base = { id: 2, titre: 'Chantier-école Ghoufi', url: 'https://taladz.com/evenements/2-chantier-ecole' };

describe('agenda d’un événement', () => {
  it('jour sans heure : journée entière, fin exclue le lendemain (convention du site)', () => {
    expect(bornesAgenda({ debut: '2026-12-22T00:00:00.000Z' })).toEqual({ journee: true, debut: '20261222', finExclue: '20261223' });
  });

  it('plusieurs jours sans heure : du premier au dernier jour inclus', () => {
    expect(bornesAgenda({ debut: '2026-12-22T00:00:00.000Z', fin: '2027-01-02T00:00:00.000Z' }))
      .toEqual({ journee: true, debut: '20261222', finExclue: '20270103' });
  });

  it('avec heure : instants UTC (10 h à Alger = 9 h UTC) ; sans fin, pas de durée', () => {
    expect(bornesAgenda({ debut: '2026-11-20T09:00:00.000Z', fin: '2026-11-20T11:30:00.000Z' }))
      .toEqual({ journee: false, debut: '20261120T090000Z', fin: '20261120T113000Z' });
    expect(bornesAgenda({ debut: '2026-11-20T17:00:00.000Z' })).toEqual({ journee: false, debut: '20261120T170000Z', fin: null });
  });

  it('sans date : rien (pas de bouton)', () => {
    expect(bornesAgenda({ debut: '' })).toBeNull();
    expect(lienGoogleAgenda({ ...base, debut: 'pas une date' })).toBeNull();
  });

  it('.ics : identifiant stable, journée entière, texte échappé, lignes de 75 octets au plus', () => {
    const ics = fichierIcs({
      ...base, debut: '2026-12-22T00:00:00.000Z', fin: '2027-01-02T00:00:00.000Z',
      lieu: 'Ghoufi, Batna; Aurès', description: 'Restauration des maisons, avec ateliers\net visites. '.repeat(4)
    }, new Date('2026-11-13T10:00:00Z'))!;
    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(ics).toContain('UID:evenement-2@taladz.com');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261222');
    expect(ics).toContain('DTEND;VALUE=DATE:20270103');
    expect(ics).toContain('LOCATION:Ghoufi\\, Batna\\; Aurès');
    expect(ics).toContain('DTSTAMP:20261113T100000Z');
    for (const ligne of ics.split('\r\n')) expect(new TextEncoder().encode(ligne).length).toBeLessThanOrEqual(75);
    // Les lignes repliées se recollent en retirant « CRLF + espace »
    expect(ics.replace(/\r\n /g, '')).toContain('avec ateliers\\net visites.');
  });

  it('.ics en arabe : caractères multioctets jamais coupés', () => {
    const ics = fichierIcs({ ...base, titre: 'آفاق الواحة '.repeat(10), debut: '2026-11-12T00:00:00.000Z' })!;
    expect(ics.replace(/\r\n /g, '')).toContain(`SUMMARY:${'آفاق الواحة '.repeat(10)}`);
  });

  it('lien Google Agenda : titre, dates, lieu et adresse de la page', () => {
    const lien = new URL(lienGoogleAgenda({ ...base, debut: '2026-11-20T09:00:00.000Z', lieu: 'Laghouat' })!);
    expect(lien.origin).toBe('https://calendar.google.com');
    expect(lien.searchParams.get('action')).toBe('TEMPLATE');
    expect(lien.searchParams.get('text')).toBe('Chantier-école Ghoufi');
    expect(lien.searchParams.get('dates')).toBe('20261120T090000Z/20261120T090000Z');
    expect(lien.searchParams.get('location')).toBe('Laghouat');
    expect(lien.searchParams.get('details')).toContain(base.url);
  });
});
