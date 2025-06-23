// types/index.ts

/**
 * Export principal de tous les types, interfaces et enums
 * Pour la plateforme Culture Algérie
 */

// ============================================
// EXPORT DES TYPES D'AUTHENTIFICATION
// ============================================

// Types et constantes d'authentification


// ============================================
// EXPORT DES MODÈLES
// ============================================

// Types spécifiques (remplacent les any)
export * from './models/specific-types';

// Entités principales
export * from './models/user.types';
export * from './models/oeuvre.types';
export * from './models/evenement.types';
export * from './models/lieu.types';
export * from './models/organisation.types';
export * from './models/programme.types';
export * from './models/media.types';
export * from './models/intervenant.types';

// Géographie
export * from './models/geography.types';

// Références
export * from './models/references.types';

// Tables de liaison
export * from './models/associations.types';

// Types spécialisés
export * from './models/oeuvres-specialisees.types';
export * from './models/lieux-details.types';

// Tracking et analytics
export * from './models/tracking.types';

// ============================================
// EXPORT DES ENUMS
// ============================================

// Enums utilisateur
export * from './enums/user.enums';

// Enums des entités
export * from './enums/oeuvre.enums';
export * from './enums/evenement.enums';
export * from './enums/programme.enums';
export * from './enums/media.enums';

// Enums de liaison
export * from './enums/liaison.enums';

// Enums communs
export * from './enums/common.enums';