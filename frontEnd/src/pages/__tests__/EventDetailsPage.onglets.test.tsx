/**
 * Fiche événement : onglets accessibles (audit V11 UX-21) et QR code replié sur téléphone (UX-19).
 */
import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, d?: unknown) => (typeof d === 'string' ? d : (d as { defaultValue?: string })?.defaultValue ?? k),
    i18n: { language: 'fr', dir: () => 'ltr' },
  }),
}));
vi.mock('@/components/Header', () => ({ default: () => <header /> }));
vi.mock('@/components/Footer', () => ({ default: () => <footer /> }));
vi.mock('@/components/shared/SignalerContenu', () => ({ default: () => null }));
vi.mock('@/components/SEOHead', () => ({
  default: () => null, buildEvenementJsonLd: () => ({}), buildBreadcrumbJsonLd: () => ({}),
}));
vi.mock('@/components/shared', () => ({ LoadingSkeleton: () => <div data-testid="chargement" /> }));
vi.mock('@/components/shared/ErrorBoundary', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/shared/LiensExternes', () => ({ LiensDuContenu: () => null }));
vi.mock('@/components/shared/ContenuIntrouvable', () => ({ default: () => <p>introuvable</p> }));
vi.mock('@/hooks/useSaisieConservee', () => ({ saisieEnAttente: () => false }));
vi.mock('@/providers/PermissionsProvider', () => ({ useUtilisateurOptionnel: () => null }));
vi.mock('../event/EventHero', () => ({ default: () => <h1>Salon de la poterie</h1> }));
vi.mock('../event/EventInfo', () => ({ default: () => <p>contenu-infos</p> }));
vi.mock('@/components/event/EventDocuments', () => ({ default: () => null }));
vi.mock('../event/EventProgram', () => ({ default: () => <p>contenu-programme</p> }));
vi.mock('../event/EventGallery', () => ({ default: () => <p>contenu-galerie</p> }));
vi.mock('../event/EventComments', () => ({ default: () => <p>contenu-avis</p> }));
vi.mock('../event/EventOrganizers', () => ({ default: () => null }));
vi.mock('../event/EventRegistration', () => ({ default: () => null }));
vi.mock('../event/EventParticipants', () => ({ default: () => <p>contenu-participants</p> }));
vi.mock('../event/EventMetadata', () => ({ default: () => <p>contenu-metadonnees</p> }));
vi.mock('../event/EventQRCode', () => ({ default: () => <p>qr-evenement</p> }));
vi.mock('../event/RelatedEvents', () => ({ default: () => null }));
vi.mock('@/components/shared/ServicesProximite', () => ({ default: () => null }));
vi.mock('@/components/CarteInteractiveUnifiee', () => ({ default: () => null }));

vi.mock('@/hooks/useEventDetails', () => ({
  useEventDetails: () => ({
    event: { id_evenement: 1, nom_evenement: 'Salon de la poterie', description: 'Un salon' },
    programs: [], medias: [], comments: [{ id: 1 }, { id: 2 }],
    publicParticipants: { participants: [], total: 3 }, organizers: [],
    loading: false, error: null, erreurChargement: null, recharger: vi.fn(),
    isFavorite: false, toggleFavorite: vi.fn(), addComment: vi.fn(), rafraichirCommentaires: vi.fn(),
    registerToEvent: vi.fn(), unregisterFromEvent: vi.fn(), isRegistered: false, registrationStatus: null,
  }),
}));

import EventDetailsPage from '../EventDetailsPage';

const afficher = () => render(
  <MemoryRouter initialEntries={['/evenements/1-salon-de-la-poterie']}>
    <Routes><Route path="/evenements/:id" element={<EventDetailsPage />} /></Routes>
  </MemoryRouter>
);

describe('Fiche événement : onglets', () => {
  test('liste d’onglets nommée, chaque onglet a le rôle « tab » et un seul est sélectionné', async () => {
    afficher();
    const liste = screen.getByRole('tablist', { name: 'Rubriques de l’événement' });
    expect(liste).toBeInTheDocument();
    const onglets = screen.getAllByRole('tab');
    // Infos, Programme, Galerie, Participants, Avis, Métadonnées (pas de lieu : pas de « Services »)
    expect(onglets).toHaveLength(6);
    expect(screen.getByRole('tab', { name: /Informations/ })).toHaveAttribute('aria-selected', 'true');
    expect(onglets.filter(o => o.getAttribute('aria-selected') === 'true')).toHaveLength(1);
    // Onglet des informations complémentaires, proposé au public sous le nom « Plus d’infos »
    // (avant : « Métadonnées », du jargon ; audit V11)
    expect(screen.getByRole('tab', { name: /Plus d’infos|event\.tabs\.metadata/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Avis (2)' })).toBeInTheDocument();
    expect(await screen.findByText('contenu-infos')).toBeInTheDocument();
  });

  test('flèche droite : l’onglet suivant prend le focus et s’ouvre', async () => {
    const user = userEvent.setup();
    afficher();
    const infos = screen.getByRole('tab', { name: /Informations/ });
    act(() => infos.focus());
    await user.keyboard('{ArrowRight}');
    const programme = screen.getByRole('tab', { name: /Programme/ });
    expect(programme).toHaveFocus();
    expect(programme).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('contenu-programme')).toBeInTheDocument();
    expect(screen.queryByText('contenu-infos')).not.toBeInTheDocument();
  });

  test('clic sur un onglet : son panneau est relié à l’onglet', async () => {
    const user = userEvent.setup();
    afficher();
    const avis = screen.getByRole('tab', { name: 'Avis (2)' });
    await user.click(avis);
    expect(avis).toHaveAttribute('aria-selected', 'true');
    const panneau = screen.getByRole('tabpanel');
    expect(panneau).toHaveAttribute('aria-labelledby', avis.id);
    expect(await screen.findByText('contenu-avis')).toBeInTheDocument();
  });

  test('QR code : un bouton « QR code à imprimer » pour le téléphone, le QR lui-même dans un dialogue', async () => {
    const user = userEvent.setup();
    afficher();
    const bouton = screen.getByRole('button', { name: 'QR code à imprimer' });
    // La carte (ordinateur) est seule dans la page tant que le dialogue est fermé
    expect(await screen.findAllByText('qr-evenement')).toHaveLength(1);
    await user.click(bouton);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
