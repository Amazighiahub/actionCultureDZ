/**
 * Module de validation unifié
 * Utilise Zod pour toute la validation du frontend
 */

export * from './schemas';

import { z } from 'zod';

/**
 * Helper pour valider des données avec un schéma Zod
 * Retourne un objet avec success, data et errors
 */
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T>; errors: null } | { success: false; data: null; errors: z.ZodError['errors'] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data, errors: null };
  }

  return { success: false, data: null, errors: result.error.errors };
}

/**
 * Helper pour obtenir les messages d'erreur formatés
 */
export function getErrorMessages(errors: z.ZodError['errors']): Record<string, string> {
  const messages: Record<string, string> = {};

  for (const error of errors) {
    const path = error.path.join('.');
    if (!messages[path]) {
      messages[path] = error.message;
    }
  }

  return messages;
}

/**
 * Hook helper pour utiliser avec React Hook Form
 */
export function zodResolver<T extends z.ZodTypeAny>(schema: T) {
  return async (data: unknown) => {
    const result = schema.safeParse(data);

    if (result.success) {
      return { values: result.data, errors: {} };
    }

    const errors: Record<string, { message: string; type: string }> = {};

    for (const error of result.error.errors) {
      const path = error.path.join('.');
      if (!errors[path]) {
        errors[path] = {
          message: error.message,
          type: error.code
        };
      }
    }

    return { values: {}, errors };
  };
}

/**
 * Valide un champ individuel
 */
export function validateField<T extends z.ZodTypeAny>(
  schema: T,
  value: unknown
): { valid: boolean; error?: string } {
  const result = schema.safeParse(value);

  if (result.success) {
    return { valid: true };
  }

  return { valid: false, error: result.error.errors[0]?.message };
}

/**
 * Crée un schéma partiel pour la validation en temps réel
 */
export function createPartialSchema<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.partial();
}

// Re-export z pour faciliter l'utilisation
export { z } from 'zod';
