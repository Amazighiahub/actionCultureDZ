// types/utils/type-helpers.ts

/**
 * Rendre tous les champs optionnels sauf ceux spécifiés
 */
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Rendre tous les champs optionnels sauf l'ID
 */
export type PartialExceptId<T extends { id: number | string }> = PartialExcept<T, 'id'>;

/**
 * Type pour les formulaires de création (sans ID ni timestamps)
 */
export type CreateDTO<T> = Omit<T, 
  | 'id' 
  | 'createdAt' 
  | 'updatedAt' 
  | 'date_creation' 
  | 'date_modification'
  | 'created_at'
  | 'updated_at'
>;

/**
 * Type pour les formulaires de mise à jour
 */
export type UpdateDTO<T> = Partial<CreateDTO<T>>;

/**
 * Extraire les clés d'un type qui ont une valeur spécifique
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/**
 * Type pour les champs de formulaire avec erreurs
 */
export type FormField<T> = {
  value: T;
  error?: string;
  touched?: boolean;
};

/**
 * Type pour un formulaire complet avec erreurs
 */
export type FormState<T> = {
  [K in keyof T]: FormField<T[K]>;
};

/**
 * Type utilitaire pour les réponses d'API qui peuvent être null
 */
export type Nullable<T> = T | null;

/**
 * Type pour les options de select/dropdown
 */
export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

/**
 * Type pour les arbres (hiérarchies)
 */
export interface TreeNode<T> {
  data: T;
  children?: TreeNode<T>[];
  expanded?: boolean;
  selected?: boolean;
}

/**
 * Type pour les timestamps
 */
export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

/**
 * Type pour les timestamps en français
 */
export interface TimestampsFr {
  date_creation: string;
  date_modification: string;
}

/**
 * Helper pour vérifier si un objet a des timestamps
 */
export function hasTimestamps(obj: unknown): obj is (Timestamps | TimestampsFr) {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    ('createdAt' in o && 'updatedAt' in o) ||
    ('date_creation' in o && 'date_modification' in o)
  );
}

/**
 * Type guard pour vérifier si une valeur est définie
 */
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

/**
 * Type guard pour vérifier si c'est une erreur d'API
 */
export function isApiError(error: unknown): error is { code: string; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as Record<string, unknown>).code === 'string' &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

/**
 * Extraire le type des éléments d'un tableau
 */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/**
 * Deep Partial - rendre tous les champs optionnels récursivement
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

/**
 * Deep Required - rendre tous les champs requis récursivement
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends (infer U)[]
    ? DeepRequired<U>[]
    : T[P] extends object | undefined
    ? DeepRequired<NonNullable<T[P]>>
    : T[P];
};

/**
 * Type pour les maps clé-valeur
 */
export type Dictionary<T = unknown> = Record<string, T>;

/**
 * Type pour les enums inversés
 */
export type ReverseMap<T extends Record<string | number, string | number>> = {
  [V in T[keyof T]]: {
    [K in keyof T]: T[K] extends V ? K : never;
  }[keyof T];
};;