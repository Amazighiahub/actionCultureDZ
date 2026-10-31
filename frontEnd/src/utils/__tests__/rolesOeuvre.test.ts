import { describe, it, expect } from 'vitest';
import type { TFunction } from 'i18next';
import { rolesPourTypeOeuvre, libelleRole } from '../rolesOeuvre';
import type { TypeUser } from '@/types/models/type-user.types';

const types: TypeUser[] = ['visiteur', 'ecrivain', 'musicien', 'compositeur', 'interprete', 'parolier', 'autre', 'administrateur', 'realisateur']
  .map((nom_type, i) => ({ id_type_user: i + 1, nom_type }));

describe('rolesPourTypeOeuvre', () => {
  it('ne propose que les rôles de la musique, dans l’ordre prévu', () => {
    expect(rolesPourTypeOeuvre(3, types).map((t) => t.nom_type)).toEqual(['compositeur', 'interprete', 'parolier', 'musicien', 'autre']);
  });

  it('ne propose jamais visiteur ni administrateur', () => {
    const codes = rolesPourTypeOeuvre(undefined, types).map((t) => t.nom_type);
    expect(codes).not.toContain('visiteur');
    expect(codes).not.toContain('administrateur');
    expect(codes).toContain('realisateur');
  });
});

describe('libelleRole', () => {
  const traductions: Record<string, string> = { 'rolesOeuvre.interprete': 'Interprète', 'auth.sectors.musicien': 'Musicien' };
  const t = ((cle: string, options?: { defaultValue?: string }) => traductions[cle] ?? options?.defaultValue ?? cle) as unknown as TFunction;

  it('traduit un rôle d’œuvre', () => expect(libelleRole(t, 'interprete')).toBe('Interprète'));
  it('reprend les métiers déjà traduits pour l’inscription', () => expect(libelleRole(t, 'musicien')).toBe('Musicien'));
  it('affiche au moins un texte lisible pour un code inconnu', () => expect(libelleRole(t, 'directeur_photo')).toBe('directeur photo'));
});
