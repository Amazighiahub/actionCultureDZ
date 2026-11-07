import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EcrireAvecMessagerie from '../EcrireAvecMessagerie';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d?: unknown, o?: Record<string, unknown>) => {
    const s = typeof d === 'string' ? d : _k;
    return o ? s.replace(/\{\{(\w+)\}\}/g, (_, n) => String(o[n])) : s;
  } }),
}));

const P = (statut: string, email: string) => ({ statut_participation: statut, User: { email } });

describe('écrire aux participants avec sa messagerie', () => {
  it('seulement les inscrits, en copie cachée, sans doublon', () => {
    render(<EcrireAvecMessagerie evenementNom="Soirée contes" participants={[
      P('inscrit', 'a@example.com'), P('confirme', 'b@example.com'), P('present', 'a@example.com'),
      P('invitation', 'invite@example.com'), P('annule', 'parti@example.com'),
    ]} />);
    const lien = screen.getByText('Écrire avec ma messagerie (2)').closest('a') as HTMLAnchorElement;
    expect(lien.getAttribute('href')).toBe('mailto:?bcc=a%40example.com,b%40example.com&subject=Soir%C3%A9e%20contes');
    expect(lien.getAttribute('href')).not.toContain('invite');
  });

  it('beaucoup de participants : seulement « Copier les adresses », qui copie la liste', async () => {
    const writeText = vi.fn(async () => {});
    Object.assign(navigator, { clipboard: { writeText } });
    const nombreux = Array.from({ length: 120 }, (_, i) => P('confirme', `personne${i}@example.com`));
    render(<EcrireAvecMessagerie evenementNom="Festival" participants={nombreux} />);
    expect(screen.queryByText(/Écrire avec ma messagerie/)).toBeNull();
    fireEvent.click(screen.getByText('Copier les adresses (120)'));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('personne0@example.com, personne1@example.com')));
  });

  it('aucun inscrit : rien n’est affiché', () => {
    const { container } = render(<EcrireAvecMessagerie evenementNom="X" participants={[P('invitation', 'x@example.com')]} />);
    expect(container.textContent).toBe('');
  });
});
