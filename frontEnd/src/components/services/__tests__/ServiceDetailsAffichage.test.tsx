import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BoutonsReserver, EquipementsService } from '../ServiceDetailsAffichage';
import { lienWhatsapp } from '@/constants/serviceDetails';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d?: unknown, o?: Record<string, unknown>) => {
    const s = typeof d === 'string' ? d : _k;
    return o ? s.replace(/\{\{(\w+)\}\}/g, (_, n) => String(o[n])) : s;
  } }),
}));

describe('bouton « Réserver » d’un service', () => {
  it('numéro algérien en lien wa.me', () => {
    expect(lienWhatsapp('0555 12 34 56')).toBe('https://wa.me/213555123456');
    expect(lienWhatsapp('+213 555 12 34 56')).toBe('https://wa.me/213555123456');
    expect(lienWhatsapp('00213555123456')).toBe('https://wa.me/213555123456');
    expect(lienWhatsapp('12')).toBeNull();
    // Saisi sans le 0 : l'indicatif 213 est ajouté
    expect(lienWhatsapp('555 12 34 56')).toBe('https://wa.me/213555123456');
  });

  it('WhatsApp avec message prérempli, lien de réservation, téléphone', () => {
    render(<BoutonsReserver nom="Gîte des oliviers" whatsapp="0555123456" lienReservation="https://reservation.example.com/g" telephone="0555 12 34 56" />);
    const wa = screen.getByText('Réserver sur WhatsApp').closest('a') as HTMLAnchorElement;
    expect(wa.href).toContain('https://wa.me/213555123456?text=');
    expect(decodeURIComponent(wa.href)).toContain('« Gîte des oliviers »');
    expect((screen.getByText('Réserver en ligne').closest('a') as HTMLAnchorElement).href).toBe('https://reservation.example.com/g');
    expect((screen.getByText('Appeler').closest('a') as HTMLAnchorElement).href).toBe('tel:0555123456');
  });

  it('lien dangereux ignoré ; rien sans WhatsApp ni lien', () => {
    const { container } = render(<BoutonsReserver nom="X" lienReservation="javascript:alert(1)" telephone="0555" />);
    expect(container.innerHTML).toBe('');
  });
});

describe('équipements d’un service', () => {
  it('seulement les clés connues, langues et capacité avec son unité', () => {
    render(<EquipementsService equipements={['wifi', 'inconnu', 'piscine']} langues={['ar', 'fr']} capacite={12} typeService="hotel" />);
    expect(screen.getByText('Wi-Fi')).toBeTruthy();
    expect(screen.getByText('Piscine')).toBeTruthy();
    expect(screen.queryByText('inconnu')).toBeNull();
    expect(screen.getByText('Français')).toBeTruthy();
    expect(screen.getByText(/12 chambres/)).toBeTruthy();
  });

  it('rien à montrer : rien', () => {
    const { container } = render(<EquipementsService equipements={null} langues={[]} capacite={null} />);
    expect(container.innerHTML).toBe('');
  });
});
