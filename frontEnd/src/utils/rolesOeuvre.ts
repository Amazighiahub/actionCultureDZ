import type { TFunction } from 'i18next';
import type { TypeUser } from '@/types/models/type-user.types';

/**
 * Rôles proposés pour chaque type d'œuvre (codes `type_user.nom_type`).
 * Les rôles de compte (visiteur, administrateur) ne sont jamais proposés.
 */
const ROLES_PAR_TYPE: Record<number, string[]> = {
  1: ['auteur', 'ecrivain', 'traducteur', 'illustrateur', 'prefacier', 'autre'], // Livre
  2: ['realisateur', 'scenariste', 'acteur', 'producteur', 'directeur_photo', 'monteur', 'compositeur', 'autre'], // Film
  3: ['compositeur', 'interprete', 'parolier', 'arrangeur', 'musicien', 'producteur', 'autre'], // Musique
  4: ['journaliste', 'redacteur', 'auteur', 'photographe', 'autre'], // Article
  5: ['chercheur', 'scientifique', 'auteur', 'traducteur', 'autre'], // Article scientifique
  6: ['artiste', 'sculpteur', 'photographe', 'designer', 'autre'], // Œuvre d'art
  7: ['artisan', 'designer', 'artiste', 'autre'], // Artisanat
};

const ROLES_DE_COMPTE = ['visiteur', 'administrateur'];

const code = (type: TypeUser) => String(type.nom_type || '').toLowerCase();

/** Rôles utiles pour ce type d'œuvre, dans l'ordre de la liste ; tous les rôles d'œuvre si le type est inconnu. */
export function rolesPourTypeOeuvre(typeOeuvreId: number | undefined, typesUsers: TypeUser[]): TypeUser[] {
  const roles = (typesUsers || []).filter((type) => !ROLES_DE_COMPTE.includes(code(type)));
  const attendus = typeOeuvreId ? ROLES_PAR_TYPE[typeOeuvreId] : undefined;
  if (!attendus) return roles;
  const retenus = attendus
    .map((c) => roles.find((type) => code(type) === c))
    .filter((type): type is TypeUser => Boolean(type));
  return retenus.length > 0 ? retenus : roles;
}

/**
 * Nom lisible et traduit d'un rôle (« interprete » → « Interprète »).
 * Les métiers déjà traduits pour l'inscription (auth.sectors) servent de repli.
 */
export function libelleRole(t: TFunction, nomType: string): string {
  const c = String(nomType || '').toLowerCase();
  return t(`rolesOeuvre.${c}`, {
    defaultValue: t(`auth.sectors.${c}`, { defaultValue: c.replace(/_/g, ' ') })
  });
}
