/**
 * Schémas de validation Zod unifiés
 * Centralise toute la validation du frontend
 */
import { z } from 'zod';

// ============================================================================
// SCHÉMAS DE BASE RÉUTILISABLES
// ============================================================================

/**
 * Champ multilingue (fr, ar, en, tz-ltn, tz-tfng)
 */
export const multilingualFieldSchema = z.object({
  fr: z.string().optional().default(''),
  ar: z.string().optional().default(''),
  en: z.string().optional().default(''),
  'tz-ltn': z.string().optional().default(''),
  'tz-tfng': z.string().optional().default('')
});

/**
 * Champ multilingue requis (au moins FR)
 */
export const multilingualRequiredSchema = z.object({
  fr: z.string().min(1, 'Le champ en français est requis'),
  ar: z.string().optional().default(''),
  en: z.string().optional().default(''),
  'tz-ltn': z.string().optional().default(''),
  'tz-tfng': z.string().optional().default('')
});

/**
 * Email
 */
export const emailSchema = z
  .string()
  .email('Email invalide')
  .min(1, 'Email requis');

/**
 * Mot de passe fort - Aligné avec le backend (12 caractères min + caractère spécial)
 */
export const passwordSchema = z
  .string()
  .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Le mot de passe doit contenir au moins un caractère spécial');

/**
 * Téléphone algérien
 */
export const phoneSchema = z
  .string()
  .regex(/^(0|\+213)[567][0-9]{8}$/, 'Numéro de téléphone invalide')
  .optional()
  .or(z.literal(''));

/**
 * URL
 */
export const urlSchema = z
  .string()
  .url('URL invalide')
  .optional()
  .or(z.literal(''));

// ============================================================================
// SCHÉMAS AUTHENTIFICATION
// ============================================================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Mot de passe requis')
});

export const registerSchema = z.object({
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  prenom: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  telephone: phoneSchema,
  type_user: z.string().optional(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'Vous devez accepter les conditions d\'utilisation'
  })
}).refine(data => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword']
});

export const forgotPasswordSchema = z.object({
  email: emailSchema
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword']
});

// ============================================================================
// SCHÉMAS ŒUVRES
// ============================================================================

export const oeuvreSchema = z.object({
  titre: multilingualRequiredSchema,
  description: multilingualFieldSchema,
  id_type_oeuvre: z.number().min(1, 'Le type d\'œuvre est requis'),
  id_langue: z.number().optional(),
  annee_creation: z.number()
    .min(1000, 'Année invalide')
    .max(new Date().getFullYear(), 'L\'année ne peut pas être dans le futur')
    .optional(),
  prix: z.number().min(0, 'Le prix ne peut pas être négatif').optional(),
  categories: z.array(z.number()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),

  // Champs spécifiques livres
  isbn: z.string().optional(),
  nb_pages: z.number().min(1).optional(),

  // Champs spécifiques films/vidéos
  duree_minutes: z.number().min(1).optional(),
  realisateur: z.string().optional(),
  producteur: z.string().optional(),
  studio: z.string().optional(),

  // Champs spécifiques musique
  duree_album: z.string().optional(),
  label: z.string().optional(),
  nb_pistes: z.number().min(1).optional(),

  // Champs spécifiques articles
  auteur: z.string().optional(),
  source: z.string().optional(),
  resume_article: z.string().optional(),
  url_source: urlSchema,
  journal: z.string().optional(),
  doi: z.string().optional(),

  // Champs spécifiques arts plastiques
  dimensions: z.string().optional(),
  id_materiau: z.number().optional(),
  id_technique: z.number().optional(),
  poids: z.string().optional(),
  provenance: z.string().optional(),
  etat_conservation: z.string().optional()
});

// ============================================================================
// SCHÉMAS ÉVÉNEMENTS
// ============================================================================

export const evenementSchema = z.object({
  nom_evenement: multilingualRequiredSchema,
  description: multilingualFieldSchema,
  date_debut: z.string().min(1, 'La date de début est requise'),
  date_fin: z.string().min(1, 'La date de fin est requise'),
  heure_debut: z.string().optional(),
  heure_fin: z.string().optional(),
  id_lieu: z.number().optional(),
  lieu_personnalise: z.string().optional(),
  capacite_max: z.number().min(1).optional(),
  prix_entree: z.number().min(0).optional(),
  est_gratuit: z.boolean().optional().default(false),
  inscription_requise: z.boolean().optional().default(false),
  id_type_evenement: z.number().optional()
}).refine(data => {
  if (data.date_debut && data.date_fin) {
    return new Date(data.date_fin) >= new Date(data.date_debut);
  }
  return true;
}, {
  message: 'La date de fin doit être après la date de début',
  path: ['date_fin']
});

// ============================================================================
// SCHÉMAS PATRIMOINE
// ============================================================================

export const patrimoineSchema = z.object({
  nom: multilingualRequiredSchema,
  description: multilingualFieldSchema,
  id_type_patrimoine: z.number().min(1, 'Le type de patrimoine est requis'),
  id_categorie_patrimoine: z.number().optional(),
  wilaya: z.string().optional(),
  commune: z.string().optional(),
  adresse: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  date_creation_historique: z.string().optional(),
  est_classe: z.boolean().optional().default(false),
  niveau_protection: z.enum(['local', 'national', 'unesco']).optional()
});

// ============================================================================
// SCHÉMAS ARTISANAT
// ============================================================================

export const artisanatSchema = z.object({
  nom: multilingualRequiredSchema,
  description: multilingualFieldSchema,
  id_categorie_artisanat: z.number().min(1, 'La catégorie est requise'),
  region_origine: z.string().optional(),
  materiaux_utilises: z.array(z.string()).optional().default([]),
  techniques: z.array(z.string()).optional().default([]),
  prix_indicatif: z.number().min(0).optional(),
  disponible: z.boolean().optional().default(true)
});

// ============================================================================
// SCHÉMAS COMMENTAIRES
// ============================================================================

export const commentaireSchema = z.object({
  contenu: z.string()
    .min(3, 'Le commentaire doit contenir au moins 3 caractères')
    .max(2000, 'Le commentaire ne peut pas dépasser 2000 caractères'),
  note: z.number().min(1).max(5).optional()
});

// ============================================================================
// SCHÉMAS PROFIL UTILISATEUR
// ============================================================================

export const profileSchema = z.object({
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  prenom: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  email: emailSchema,
  telephone: phoneSchema,
  biographie: z.string().max(1000, 'La biographie ne peut pas dépasser 1000 caractères').optional(),
  entreprise: z.string().optional(),
  site_web: urlSchema,
  wilaya: z.string().optional(),
  commune: z.string().optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword']
});

// ============================================================================
// TYPES INFÉRÉS
// ============================================================================

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type OeuvreFormData = z.infer<typeof oeuvreSchema>;
export type EvenementFormData = z.infer<typeof evenementSchema>;
export type PatrimoineFormData = z.infer<typeof patrimoineSchema>;
export type ArtisanatFormData = z.infer<typeof artisanatSchema>;
export type CommentaireFormData = z.infer<typeof commentaireSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
