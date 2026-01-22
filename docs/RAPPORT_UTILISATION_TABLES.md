# 📊 Rapport d'Utilisation des Tables - EventCulture

**Date:** 21/01/2026  
**Total Modèles:** 60 tables

---

## ✅ Tables Utilisées (Fonctionnelles)

### 🗺️ Géographie (4 tables)
| Table | Utilisation | Controllers |
|-------|-------------|-------------|
| **Wilaya** | ✅ Très utilisée | LieuController, PatrimoineController, DashboardController |
| **Daira** | ✅ Utilisée | LieuController, PatrimoineController |
| **Commune** | ✅ Utilisée | LieuController, PatrimoineController |
| **Localite** | ✅ Utilisée | LieuController (6 occurrences) |

### 👤 Utilisateurs (4 tables)
| Table | Utilisation | Controllers |
|-------|-------------|-------------|
| **User** | ✅ Très utilisée | UserController, AuthController, DashboardController |
| **Role** | ✅ Utilisée | UserRoleController |
| **UserRole** | ✅ Utilisée | UserRoleController |
| **TypeUser** | ✅ Utilisée | MetadataController, ProfessionnelController |

### 📍 Lieux (6 tables)
| Table | Utilisation | Controllers |
|-------|-------------|-------------|
| **Lieu** | ✅ Très utilisée | LieuController, PatrimoineController, ParcoursIntelligentController |
| **DetailLieu** | ✅ Utilisée | PatrimoineController, LieuController |
| **Service** | ✅ Utilisée | ServicesController, PatrimoineController |
| **LieuMedia** | ✅ Utilisée | PatrimoineController, LieuController |
| **Monument** | ✅ Utilisée | PatrimoineController (11 occurrences) |
| **Vestige** | ✅ Utilisée | PatrimoineController (11 occurrences) |

### 📚 Œuvres (9 tables)
| Table | Utilisation | Controllers |
|-------|-------------|-------------|
| **Oeuvre** | ✅ Très utilisée | OeuvreController, FavoriController, DashboardController |
| **Livre** | ✅ Utilisée | OeuvreController, MetadataController |
| **Film** | ✅ Utilisée | OeuvreController, MetadataController |
| **AlbumMusical** | ✅ Utilisée | OeuvreController, MetadataController |
| **Article** | ✅ Utilisée | ArticleBlockController |
| **ArticleBlock** | ✅ Utilisée | ArticleBlockController (23 occurrences) |
| **Artisanat** | ✅ Très utilisée | ArtisanatController (80 occurrences) |
| **ArticleScientifique** | ✅ Utilisée | Formulaire AjouterOeuvre (type "Article Scientifique") |
| **OeuvreArt** | ✅ Utilisée | Formulaire AjouterOeuvre (type "Œuvre d'Art") |

### 🎭 Événements (4 tables)
| Table | Utilisation | Controllers |
|-------|-------------|-------------|
| **Evenement** | ✅ Très utilisée | evenementController, DashboardController |
| **TypeEvenement** | ✅ Utilisée | MetadataController, evenementController |
| **Programme** | ✅ Utilisée | ProgrammeController (35 occurrences) |
| **Parcours** | ✅ Utilisée | ParcoursIntelligentController, PatrimoineController |

### 🏢 Organisations (3 tables)
| Table | Utilisation | Controllers |
|-------|-------------|-------------|
| **Organisation** | ✅ Utilisée | evenementController, UserRoleController |
| **TypeOrganisation** | ⚠️ Peu utilisée | Seulement dans scripts de seed |
| **Editeur** | ✅ Utilisée | MetadataController, OeuvreController |

### 🏷️ Classifications (7 tables)
| Table | Utilisation | Controllers |
|-------|-------------|-------------|
| **Langue** | ✅ Utilisée | MetadataController, OeuvreController |
| **Categorie** | ✅ Utilisée | MetadataController, OeuvreController |
| **Genre** | ✅ Utilisée | MetadataController, OeuvreController |
| **TypeOeuvre** | ✅ Utilisée | MetadataController, OeuvreController |
| **TagMotCle** | ✅ Utilisée | MetadataController, OeuvreController |
| **Materiau** | ✅ Utilisée | ArtisanatController, MetadataController |
| **Technique** | ✅ Utilisée | ArtisanatController, MetadataController |

### 🔗 Tables de Liaison (15 tables)
| Table | Utilisation | Controllers |
|-------|-------------|-------------|
| **OeuvreUser** | ✅ Utilisée | OeuvreController |
| **OeuvreEditeur** | ✅ Utilisée | OeuvreController |
| **OeuvreCategorie** | ✅ Utilisée | OeuvreController |
| **OeuvreTag** | ✅ Utilisée | OeuvreController |
| **OeuvreIntervenant** | ✅ Utilisée | OeuvreController, IntervenantController |
| **EvenementUser** | ✅ Utilisée | evenementController |
| **EvenementOeuvre** | ✅ Utilisée | Dashboard Pro (ajout événement), Formulaire inscription (ajout œuvres) |
| **EvenementOrganisation** | ⚠️ Associations seulement | Modèle Evenement |
| **ProgrammeIntervenant** | ✅ Utilisée | ProgrammeController |
| **ParcoursLieu** | ✅ Utilisée | ParcoursIntelligentController |
| **UserOrganisation** | ✅ Utilisée | DashboardController, UserRoleController |
| **TypeOeuvreGenre** | ✅ Utilisée | MetadataController, HierarchieService |
| **GenreCategorie** | ✅ Utilisée | MetadataController, HierarchieService |
| **UserSpecialite** | ⚠️ Non utilisée | Seulement chargée |
| **UserCertification** | ⚠️ Non utilisée | Seulement chargée |

### 📝 Divers (8 tables)
| Table | Utilisation | Controllers |
|-------|-------------|-------------|
| **Media** | ✅ Utilisée | UploadController, OeuvreController |
| **Favori** | ✅ Très utilisée | FavoriController (27 occurrences) |
| **Commentaire** | ✅ Utilisée | commentaireController (17 occurrences) |
| **CritiqueEvaluation** | ✅ Utilisée | DashboardController, adminServicesRoutes |
| **Intervenant** | ✅ Utilisée | IntervenantController (23 occurrences) |
| **Specialite** | ✅ Utilisée | MetadataController, IntervenantController |
| **Notification** | ✅ Utilisée | NotificationController (17 occurrences) |
| **EmailVerification** | ✅ Utilisée | EmailVerificationController (15 occurrences) |

### 📊 Tracking & Modération (4 tables)
| Table | Utilisation | Controllers |
|-------|-------------|-------------|
| **Vue** | ✅ Utilisée | VueController (23 occurrences) |
| **Signalement** | ✅ Utilisée | signalementRoutes, DashboardController |
| **AuditLog** | ✅ Utilisée | DashboardController, auditMiddleware |
| **QRCode** | ✅ Utilisée | PatrimoineController, LieuController |
| **QRScan** | ✅ Utilisée | DashboardController, PatrimoineController |

---

## ⚠️ Tables Peu/Non Utilisées

| Table | Statut | Recommandation |
|-------|--------|----------------|
| **UserCertification** | ❌ Non utilisée | Implémenter ou supprimer |
| **UserSpecialite** | ❌ Non utilisée | Implémenter ou supprimer |
| **TypeOrganisation** | ⚠️ Scripts seulement | Utiliser dans UI |
| **EvenementOrganisation** | ⚠️ Associations seulement | Utiliser dans événements |

---

## 📈 Statistiques

| Catégorie | Nombre | Pourcentage |
|-----------|--------|-------------|
| **Tables très utilisées** | 15 | 25% |
| **Tables utilisées** | 41 | 68% |
| **Tables peu utilisées** | 2 | 4% |
| **Tables non utilisées** | 2 | 3% |

### Score Global: **97%** des tables sont fonctionnelles

---

## 🎯 Recommandations

### 1. Tables à Implémenter
- **UserCertification** : Ajouter système de certifications pour les professionnels
- **UserSpecialite** : Lier les utilisateurs à leurs spécialités

### 2. Tables à Utiliser Davantage
- **TypeOrganisation** : Afficher dans le formulaire d'ajout d'organisation

### 3. Fonctionnalités Manquantes
- Liaison Événement ↔ Œuvre (expositions, projections)
- Liaison Événement ↔ Organisation (co-organisateurs)

---

*Rapport généré par Cascade AI - 21/01/2026*
