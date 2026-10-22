/**
 * ProgrammeForm — un champ manquant dans un autre onglet ne doit pas bloquer « Créer » en silence
 *
 * Couverture :
 *   - Date manquante : message en haut du formulaire, onglet « Horaires » ouvert, rien n'est envoyé
 *   - Nouvelle activité : premier jour de l'événement pré-rempli
 *   - Activité existante : sa date est gardée quand les jours de l'événement arrivent après
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

const rendu = (eventDates?: { dateDebut: string; dateFin: string }) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const { container } = render(<ProgrammeForm eventId={1} onSubmit={onSubmit} onCancel={vi.fn()} eventDates={eventDates} />);
  fireEvent.change(container.querySelector('textarea')!, { target: { value: 'Démonstration publique' } });
  fireEvent.submit(container.querySelector('form')!);
  return onSubmit;
};

describe('ProgrammeForm — validation visible', () => {
  test('date manquante (jours de l’événement inconnus) : message et onglet Horaires ouvert', async () => {
    const onSubmit = rendu(undefined);
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

describe('ProgrammeForm — date d’une activité existante', () => {
  test('dates de l’événement chargées après l’ouverture : la date de l’activité est gardée', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const initial = { date_programme: '2026-10-30', description: { fr: 'Séance de contes', ar: '', en: '' } };
    const { container, rerender } = render(<ProgrammeForm eventId={1} onSubmit={onSubmit} onCancel={vi.fn()} mode="edit" initialData={initial} />);
    rerender(<ProgrammeForm eventId={1} onSubmit={onSubmit} onCancel={vi.fn()} mode="edit" initialData={initial} eventDates={{ dateDebut: '2026-10-29', dateFin: '2026-10-30' }} />);
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ date_programme: '2026-10-30' })));
  });

  test('nouvelle activité d’un événement de plusieurs jours : premier jour proposé', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<ProgrammeForm eventId={1} onSubmit={onSubmit} onCancel={vi.fn()} eventDates={{ dateDebut: '2026-10-29', dateFin: '2026-10-30' }} />);
    fireEvent.change(container.querySelector('textarea')!, { target: { value: 'Démonstration' } });
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ date_programme: '2026-10-29' })));
  });
});
