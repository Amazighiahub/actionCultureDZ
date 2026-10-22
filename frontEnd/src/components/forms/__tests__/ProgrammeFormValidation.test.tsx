/**
 * ProgrammeForm — un champ manquant dans un autre onglet ne doit pas bloquer « Créer » en silence
 *
 * Couverture :
 *   - Date manquante : message en haut du formulaire, onglet « Horaires » ouvert, rien n'est envoyé
 *   - Événement d'un seul jour : la date de l'activité est pré-remplie, l'activité est envoyée
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProgrammeForm from '../ProgrammeForm';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: 'fr' },
  }),
}));

const rendu = (eventDates: { dateDebut: string; dateFin: string }) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const { container } = render(<ProgrammeForm eventId={1} onSubmit={onSubmit} onCancel={vi.fn()} eventDates={eventDates} />);
  fireEvent.change(container.querySelector('textarea')!, { target: { value: 'Démonstration publique' } });
  fireEvent.submit(container.querySelector('form')!);
  return onSubmit;
};

describe('ProgrammeForm — validation visible', () => {
  test('date manquante (événement de plusieurs jours) : message et onglet Horaires ouvert', async () => {
    const onSubmit = rendu({ dateDebut: '2026-10-29', dateFin: '2026-10-31' });
    const alerte = await screen.findByText('Le formulaire n’est pas complet :');
    expect(alerte.closest('[role=alert]')).toHaveTextContent('programme.form.errors.dateRequired');
    expect(screen.getByRole('tab', { name: 'programme.form.tabs.schedule' })).toHaveAttribute('data-state', 'active');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('événement d’un seul jour : date pré-remplie, activité envoyée', async () => {
    const onSubmit = rendu({ dateDebut: '2026-10-30', dateFin: '2026-10-30' });
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ date_programme: '2026-10-30' })));
  });
});
