import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LireAVoixHaute, { texteLisible, decouperPhrases, choisirVoix, textesParLangue } from '../LireAVoixHaute';
import MissionModule from '../MissionModule';

describe('lecture à voix haute : préparation du texte', () => {
  it('retire les balises et la mise en forme', () => {
    expect(texteLisible('<p>Timgad</p><p>Ville <b>romaine</b>&nbsp;**fondée**</p>')).toBe('Timgad. Ville romaine fondée.');
  });
  it('découpe en phrases, y compris en arabe, et coupe les phrases trop longues', () => {
    expect(decouperPhrases('Première phrase. Deuxième ? هذه جملة؟ وأخرى.')).toEqual(['Première phrase.', 'Deuxième ?', 'هذه جملة؟', 'وأخرى.']);
    const longue = decouperPhrases(`${'mot '.repeat(120)}fin.`, 100);
    expect(longue.every((p) => p.length <= 101)).toBe(true);
    expect(longue.join(' ').split(/\s+/).length).toBe(121);
  });
  it('choisit la voix arabe d’Algérie d’abord, sinon une autre voix arabe', () => {
    const v = (lang: string) => ({ lang, name: lang }) as SpeechSynthesisVoice;
    expect(choisirVoix([v('fr-FR'), v('ar-SA'), v('ar-DZ')], 'ar')?.lang).toBe('ar-DZ');
    expect(choisirVoix([v('fr-FR'), v('ar_EG')], 'ar')?.lang).toBe('ar_EG');
    expect(choisirVoix([v('fr-FR')], 'ar')).toBeNull();
  });
  it('textes par langue : objet multilingue, JSON, ou texte simple rangé selon son écriture', () => {
    expect(textesParLangue({ fr: 'Histoire', ar: 'تاريخ', 'tz-ltn': 'x' }, { fr: 'Timgad', ar: 'تيمقاد' })).toEqual({ fr: 'Timgad. Histoire', ar: 'تيمقاد. تاريخ' });
    expect(textesParLangue('{"fr":"Texte"}')).toEqual({ fr: 'Texte' });
    expect(textesParLangue('مدينة قديمة')).toEqual({ ar: 'مدينة قديمة' });
    expect(textesParLangue('Ville ancienne')).toEqual({ fr: 'Ville ancienne' });
    expect(textesParLangue(null)).toEqual({});
  });
});

describe('bouton Écouter', () => {
  it('un bouton par langue disponible ; message clair sans synthèse vocale', () => {
    render(<LireAVoixHaute textes={{ fr: 'Bonjour.', ar: 'مرحبا.', en: '' }} langueDePreference="ar" />);
    const boutons = screen.getAllByRole('button');
    expect(boutons).toHaveLength(2);
    expect(boutons[0].textContent).toContain('العربية');
    fireEvent.click(boutons[0]);
    expect(screen.getByRole('status').textContent).toMatch(/pas disponible|not available|غير متاحة/);
  });
  it('rien sans texte', () => {
    const { container } = render(<LireAVoixHaute textes={{ fr: '  ' }} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('À quoi sert cette page ?', () => {
  beforeEach(() => {
    // Mémoire simple à la place du faux stockage des tests (qui ne retient rien)
    const memoire = new Map<string, string>();
    vi.mocked(localStorage.getItem).mockImplementation((k: string) => memoire.get(k) ?? null);
    vi.mocked(localStorage.setItem).mockImplementation((k: string, v: string) => { memoire.set(k, v); });
  });
  it('s’affiche, puis reste fermé après « Fermer »', () => {
    const { unmount } = render(<MissionModule module="patrimoine" />);
    expect(screen.getByRole('complementary')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /fermer|close|إغلاق/i }));
    expect(screen.queryByRole('complementary')).toBeNull();
    unmount();
    render(<MissionModule module="patrimoine" />);
    expect(screen.queryByRole('complementary')).toBeNull();
    render(<MissionModule module="oeuvres" />);
    expect(screen.getByRole('complementary')).toBeTruthy();
  });
});
