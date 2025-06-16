// services/index.ts

// Import des services depuis leurs fichiers
import { authService } from './auth.service';
import { userService } from './user.service';
import { metadataService } from './metadata.service';
import { oeuvreService } from './oeuvre.service';
import { evenementService } from './evenement.service';
import { patrimoineService } from './patrimoine.service';
import { artisanatService } from './artisanat.service';
import { commentaireService } from './commentaire.service';
import { favoriService } from './favori.service';
import { notificationService } from './notification.service';
import { programmeService } from './programme.service';
import { uploadService } from './upload.service';
import { professionnelService } from './professionnel.service';
import { dashboardService } from './dashboard.service';

// Export des services individuels
export { authService } from './auth.service';
export { userService } from './user.service';
export { metadataService } from './metadata.service';
export { oeuvreService } from './oeuvre.service';
export { evenementService } from './evenement.service';
export { patrimoineService } from './patrimoine.service';
export { artisanatService } from './artisanat.service';
export { commentaireService } from './commentaire.service';
export { favoriService } from './favori.service';
export { notificationService } from './notification.service';
export { programmeService } from './programme.service';
export { uploadService } from './upload.service';
export { professionnelService } from './professionnel.service';
export { dashboardService } from './dashboard.service';

// Export groupé pour import destructuré
export const services = {
  auth: authService,
  user: userService,
  metadata: metadataService,
  oeuvre: oeuvreService,
  evenement: evenementService,
  patrimoine: patrimoineService,
  artisanat: artisanatService,
  commentaire: commentaireService,
  favori: favoriService,
  notification: notificationService,
  programme: programmeService,
  upload: uploadService,
  professionnel: professionnelService,
  dashboard: dashboardService,
} as const;

// Export des types
export type {
  // Auth types
  RegisterVisitorData,
  RegisterProfessionalData,
  CurrentUser
} from './auth.service';

export type {
  // User types
  User,
  UpdateProfileData,
  ChangePasswordData,
  ProfessionalSubmissionData,
  UserStatistics,
  UserPreferences,
  PrivacySettings
} from './user.service';

export type {
  // Metadata types
  Materiau,
  Technique,
  Langue,
  Categorie,
  TypeOeuvre,
  Genre,
  Editeur,
  TypeOrganisation,
  Wilaya,
  Daira,
  Commune,
  Localite,
  Tag,
 
} from '@/types';

export type {
  // Oeuvre types
  Oeuvre,
  CreateOeuvreData,
  UpdateOeuvreData,
  Media,
  OeuvreStatistics,
  ShareLinks,
  SearchOeuvresParams
} from './oeuvre.service';

export type {
  // Evenement types
  Evenement,
  CreateEvenementData,
  UpdateEvenementData,
  EventMedia,
  Participant,
  ShareData,
  NotificationData,
  SearchEvenementsParams
} from './evenement.service';

export type {
  // Patrimoine types
  SitePatrimoine,
  CreateSiteData,
  UpdateSiteData,
  HoraireSite,
  TarifSite,
  MediaSite,
  Parcours,
  CreateParcoursData,
  CarteVisite,
  SearchPatrimoineParams,
  OfflineData
} from './patrimoine.service';

export type {
  // Artisanat types
  Artisanat,
  CreateArtisanatData,
  UpdateArtisanatData,
  MediaArtisanat,
  Artisan,
  SearchArtisanatParams,
  ArtisanatStatistics
} from './artisanat.service';

export type {
  // Commentaire types
  Commentaire,
  CreateCommentaireData,
  UpdateCommentaireData,
  ModerateCommentaireData
} from './commentaire.service';

export type {
  // Favori types
  Favori,
  AddFavoriData,
  FavoriStats,
  PopularItem,
  GroupedFavoris
} from './favori.service';

export type {
  // Notification types
  Notification,
  NotificationSummary,
  NotificationPreferences,
  UpdatePreferencesData,
  BroadcastNotificationData
} from './notification.service';

export type {
  // Programme types
  Programme,
  CreateProgrammeData,
  UpdateProgrammeData,
  Intervenant,
  ReorderData,
  ExportOptions as ProgrammeExportOptions
} from './programme.service';

export type {
  // Upload types
  UploadResponse,
  ChunkUploadResponse,
  CompleteChunkUploadData,
  UploadInfo,
  UploadOptions
} from './upload.service';

export type {
  // Professionnel types
  DashboardStats,
  CalendarEvent,
  AnalyticsOverview,
  AnalyticsTrends,
  Demographics,
  BenchmarkData,
  Recommendation,
  CollaborationSuggestion,
  ExportOptions,
  SupportTicket
} from './professionnel.service';

export type {
  // Dashboard types
  OverviewStats,
  DetailedStats,
  PatrimoineStats,
  QRStats,
  PendingUser,
  PendingOeuvre,
  Signalement,
  ModerationAction,
  AuditLog,
  AdvancedAnalytics,
  SystemHealth,
  Alert
} from './dashboard.service';

// Utilitaire pour vérifier l'authentification
export const requireAuth = async <T>(
  serviceCall: () => Promise<T>
): Promise<T> => {
  if (!authService.isAuthenticated()) {
    throw new Error('Authentication required');
  }
  return serviceCall();
};

// Hook helper pour les services (à utiliser dans les composants React)
export const useService = <T extends keyof typeof services>(
  serviceName: T
): typeof services[T] => {
  return services[serviceName];
};

// Export par défaut
export default services;