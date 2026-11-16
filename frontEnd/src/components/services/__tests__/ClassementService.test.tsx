import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClassementService from '../ClassementService';
import { trierParNote } from '@/utils/noteServices';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'fr' },
    t: (_k: string, d?: unknown, o?: Record<string, unknown>) => {
      const s = typeof d === 'string' ? d : _k;
      return o ? s.replace(/\{\{(\w+)\}\}/g, (_, n) => String(o[n])) : s;
    }
  }),
  withTranslation: () => (C: unknown) => C,
}));

describe('classement d’un service', () => {
  it('« N° 1 sur 5 restaurants à Alger »', () => {
    render(<ClassementService classement={{ rang: 1, total: 5, wilaya: { id_wilaya: 16, nom: 'الجزائر', wilaya_name_ascii: 'Alger' } }} typeService="restaurant" />);
    expect(screen.getByTestId('classement-service').textContent).toContain('N° 1 sur 5 restaurants à Alger');
  });

  it('seul dans son groupe ou pas classé : rien', () => {
    const { container } = render(<ClassementService classement={{ rang: 1, total: 1 }} typeService="hotel" />);
    expect(container.innerHTML).toBe('');
  });
});

describe('tri par note', () => {
  const liste = [
    { id: 1, note: { moyenne: 5, nombre: 1 } },
    { id: 2, note: { moyenne: 4.8, nombre: 20 } },
    { id: 3, note: null },
    { id: 4, note: { moyenne: 3, nombre: 30 } },
  ];
  it('mieux notés : vingt avis à 4,8 devant un seul 5 ; sans avis à la fin', () => {
    expect(trierParNote(liste, 'note').map((s) => s.id)).toEqual([2, 1, 4, 3]);
  });
  it('plus d’avis', () => {
    expect(trierParNote(liste, 'avis').map((s) => s.id)).toEqual([4, 2, 1, 3]);
  });
});
