/**
 * Audit V11 COD-26 : une seule table des statuts. Avec les vraies traductions (et non le texte de
 * secours), « inscrit » doit afficher « Inscrit » et « confirme » « Confirmé » ; avant, la gestion
 * des participants lisait status.pending (« En attente ») et status.validated (« Validé »).
 */
import { describe, test, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from '../../../../i18n/locales/fr/translation.json';
import ar from '../../../../i18n/locales/ar/translation.json';
import en from '../../../../i18n/locales/en/translation.json';
import StatusBadge, { libelleStatut } from '../StatusBadge';

beforeAll(async () => {
  await i18next.use(initReactI18next).init({
    lng: 'fr',
    fallbackLng: false,
    resources: { fr: { translation: fr }, ar: { translation: ar }, en: { translation: en } },
    interpolation: { escapeValue: false },
  });
});

const PARTICIPATION = ['invitation', 'inscrit', 'confirme', 'present', 'absent', 'annule'];

describe('StatusBadge — statuts de participation', () => {
  test.each([
    ['inscrit', 'Inscrit'],
    ['confirme', 'Confirmé'],
    ['present', 'Présent'],
    ['absent', 'Absent'],
    ['invitation', 'Invitation envoyée'],
    ['annule', 'Annulé'],
  ])('%s → « %s »', (statut, texte) => {
    render(<StatusBadge status={statut} />);
    expect(screen.getByText(texte)).toBeInTheDocument();
  });

  test('chaque statut de participation a sa traduction en arabe et en anglais (pas de repli français)', () => {
    const cles = ['status.invitation', 'status.inscrit', 'status.confirme', 'status.present', 'status.absent', 'status.cancelled'];
    for (const lng of ['fr', 'ar', 'en']) {
      for (const cle of cles) expect(i18next.exists(cle, { lng }), `${lng} ${cle}`).toBe(true);
    }
    expect(libelleStatut('inscrit', i18next.getFixedT('ar'))).toBe('مسجَّل');
    expect(PARTICIPATION.map((s) => libelleStatut(s, i18next.getFixedT('en')))).toEqual(
      ['Invitation sent', 'Registered', 'Confirmed', 'Present', 'Absent', 'Cancelled']
    );
  });

  test('libellé imposé (point de vue du participant) : remplace le texte, garde les couleurs', () => {
    const { container } = render(<StatusBadge status="annule" label="Non retenue" />);
    expect(screen.getByText('Non retenue')).toBeInTheDocument();
    expect(container.firstElementChild?.className).toContain('bg-red-100');
  });

  test('statut inconnu : affiché tel quel, sans icône', () => {
    const { container } = render(<StatusBadge status="autre_chose" />);
    expect(screen.getByText('autre_chose')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });
});
