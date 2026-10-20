/**
 * ImportReleveDialog — import d'un relevé Excel de points de visite (administration)
 *
 * Couverture :
 *   - « Vérifier » inactif sans fichier ; fichier non .xlsx refusé
 *   - Aperçu avec le lieu de la feuille « Site » (lieu à créer, lignes ignorées, brouillon)
 *   - Rattachement à un lieu existant : parentId envoyé
 *   - Import : bilan, rafraîchissement de la liste, lien vers le lieu
 *   - Erreurs de l'aperçu : import impossible
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

const { mockNavigate, mockApercu, mockImporter, mockCarte } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockApercu: vi.fn(),
  mockImporter: vi.fn(),
  mockCarte: vi.fn(),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string, opts?: Record<string, unknown>) =>
      (fallback ?? key).replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts?.[k] ?? '')),
    i18n: { language: 'fr' },
  }),
}));
vi.mock('@/services/patrimoine.service', () => ({
  patrimoineService: { apercuReleve: mockApercu, importerReleve: mockImporter, getCarte: mockCarte },
}));

import ImportReleveDialog from '../ImportReleveDialog';

const xlsx = (nom = 'releve.xlsx') => new File(['PK'], nom, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
const choisir = (f: File) => fireEvent.change(document.getElementById('releve-fichier') as HTMLInputElement, { target: { files: [f] } });

const APERCU = {
  lieu: { id: null, nom: 'Balcons de Ghoufi', existe: false, commune: 'Ghassira' },
  erreurs: [],
  bilan: { creer: 2, maj: 0, inchanges: 0, ignorees: 1 },
  points: [
    { id: 1, action: 'creer', nom: 'Maison troglodyte', nomAr: null, type: 'ville_village', statut: 'publie', interieur: false, repere: null, latitude: 35.0575, longitude: 6.1722, champs: [] },
    { id: 2, action: 'creer', nom: 'Point 2 – à identifier', nomAr: null, type: 'site_archeologique', statut: 'brouillon', interieur: false, repere: null, latitude: 35.058, longitude: 6.173, champs: [] },
  ],
  ignorees: [{ id: 3, nom: 'Belvédère', raison: 'position GPS manquante ou illisible' }],
};

describe('ImportReleveDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCarte.mockResolvedValue({ success: true, data: [{ id_lieu: 4, nom: { fr: 'Timgad' } }, { id_lieu: 9, nom: { fr: 'Djemila' } }] });
  });

  test('« Vérifier » inactif sans fichier ; un fichier non .xlsx est refusé', () => {
    render(<ImportReleveDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Vérifier le fichier' })).toBeDisabled();
    expect(screen.getByRole('link', { name: /Télécharger le modèle/ })).toHaveAttribute('href', '/modeles/Modele_points_GPS_Taladz.xlsx');

    choisir(new File(['x'], 'releve.ods'));
    expect(screen.getByText('Choisissez un fichier Excel (.xlsx).')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vérifier le fichier' })).toBeDisabled();
  });

  test('aperçu puis import avec le lieu de la feuille « Site »', async () => {
    const onImported = vi.fn();
    const onOpenChange = vi.fn();
    mockApercu.mockResolvedValue({ success: true, data: APERCU });
    mockImporter.mockResolvedValue({ success: true, data: { idLieu: 50, lieuCree: true, crees: 2, maj: 0, inchanges: 0, erreurs: [] } });
    render(<ImportReleveDialog open onOpenChange={onOpenChange} onImported={onImported} />);

    const f = xlsx();
    choisir(f);
    fireEvent.click(screen.getByRole('button', { name: 'Vérifier le fichier' }));

    expect(await screen.findByText('Balcons de Ghoufi')).toBeInTheDocument();
    expect(mockApercu).toHaveBeenCalledWith(f, null);
    expect(screen.getByText('sera créé — commune Ghassira')).toBeInTheDocument();
    expect(screen.getByText(/N° 3 — Belvédère : position GPS manquante/)).toBeInTheDocument();
    expect(screen.getByText('brouillon — invisible tant qu’il n’a pas de nom')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Importer 2 point(s)' }));
    expect(await screen.findByText('Relevé importé')).toBeInTheDocument();
    expect(mockImporter).toHaveBeenCalledWith(f, null);
    expect(onImported).toHaveBeenCalled();
    expect(screen.getByText(/Lieu créé\. 2 point\(s\) créé\(s\), 0 mis à jour/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Voir le lieu et ses points/ }));
    expect(mockNavigate).toHaveBeenCalledWith('/patrimoine/50', expect.anything());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('rattachement à un lieu existant : le lieu choisi est envoyé', async () => {
    mockApercu.mockResolvedValue({ success: true, data: { ...APERCU, lieu: { id: 4, nom: 'Timgad', existe: true } } });
    render(<ImportReleveDialog open onOpenChange={vi.fn()} />);
    const f = xlsx();
    choisir(f);
    fireEvent.click(screen.getByLabelText('Un lieu déjà sur Taladz'));

    // Sans lieu choisi, impossible de vérifier
    await screen.findByRole('option', { name: 'Timgad' });
    expect(screen.getByRole('button', { name: 'Vérifier le fichier' })).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText('Rechercher un site...'), { target: { value: 'dje' } });
    expect(screen.queryByRole('option', { name: 'Timgad' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Rechercher un site...'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('option', { name: 'Timgad' }));

    fireEvent.click(screen.getByRole('button', { name: 'Vérifier le fichier' }));
    await waitFor(() => expect(mockApercu).toHaveBeenCalledWith(f, 4));
  });

  test('erreurs de l’aperçu : affichées, import impossible', async () => {
    mockApercu.mockResolvedValue({ success: true, data: { ...APERCU, lieu: null, erreurs: ['Commune de la feuille « Site » introuvable'] } });
    render(<ImportReleveDialog open onOpenChange={vi.fn()} />);
    choisir(xlsx());
    fireEvent.click(screen.getByRole('button', { name: 'Vérifier le fichier' }));

    expect(await screen.findByText('Commune de la feuille « Site » introuvable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Importer 2 point(s)' })).toBeDisabled();
  });

  test('fichier refusé par le serveur : message affiché, on reste sur le formulaire', async () => {
    mockApercu.mockRejectedValue(new Error('Colonne « latitude » introuvable dans la feuille « Points »'));
    render(<ImportReleveDialog open onOpenChange={vi.fn()} />);
    choisir(xlsx());
    fireEvent.click(screen.getByRole('button', { name: 'Vérifier le fichier' }));

    expect(await screen.findByText(/Colonne « latitude » introuvable/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vérifier le fichier' })).toBeEnabled();
  });
});
