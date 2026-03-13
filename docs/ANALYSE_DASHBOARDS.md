# Analyse complète des tableaux de bord — EventCulture

## 1. Vue d'ensemble

| Dashboard | Cible | Route | Protection |
|-----------|-------|-------|------------|
| **DashboardUser** | Visiteurs / Utilisateurs lambdas | `/dashboard-user` | Auth requise |
| **DashboardPro** | Professionnels (artistes, artisans, etc.) | `/dashboard-pro` | `ProfessionalRoute` |
| **DashboardAdmin** | Administrateurs / Modérateurs | `/admin/dashboard` | `AdminRoute` + `useAdminAuth` |

Le routage automatique (`/dashboard`) redirige selon le rôle : Admin → `/admin/dashboard`, Pro → `/dashboard-pro`, Visiteur → `/dashboard-user`.

---

## 2. Dashboard User (Visiteur)

### Fonctionnalités
- **Favoris** : œuvres, événements, sites patrimoniaux (via `useFavoris`)
- **Notifications** : liste, marquer comme lu, tout marquer lu
- **Profil** : infos perso (lecture seule), lien vers modification
- **Statistiques** : total favoris, par type (oeuvre, evenement, lieu)

### Données
- `useFavoris({ grouped: true, autoFetch: true })` — favoris groupés
- `notificationService.getNotifications()` — pagination 10
- `useAuth().user` — profil

### Points forts
- UI claire, responsive
- Skeleton loaders
- Liens rapides vers exploration
- Confirmation avant retrait favori

### Points d’attention
- **Favoris** : `stats.byType` vs `mesFavoris` peut diverger si l’API ne retourne pas la même structure
- **Profil** : champs en lecture seule, pas d’édition inline
- **Route patrimoine** : `/patrimoine/${site.id}` — à confirmer vs routes réelles du projet

---

## 3. Dashboard Pro (Professionnel)

### Fonctionnalités
- **Statistiques** : œuvres, événements, artisanats, vues totales
- **Onglets** : Œuvres, Événements, Services, Artisanat, Patrimoine
- **Actions** : Voir, Modifier, Supprimer
- **Gestion d’événement** : modal `GestionEvenement` pour programmes et œuvres
- **Recherche** : filtre côté client sur titre/nom/description
- **Menu d’ajout** : œuvre, événement, patrimoine, service, artisanat

### Données (useDashboardPro)
| Source | API | Query Key |
|--------|-----|-----------|
| Stats | `professionnelService.getDashboard()` | dashboard-pro-stats |
| Œuvres | `oeuvreService.getMyOeuvres()` | dashboard-pro-oeuvres |
| Événements | `professionnelService.getEvenements()` + programmes | dashboard-pro-evenements |
| Artisanats | `professionnelService.getArtisanats()` | dashboard-pro-artisanats |
| Patrimoines | `patrimoineService.getMySites()` | dashboard-pro-patrimoines |

### Backend (professionnelController)
- `GET /professionnel/dashboard` — stats agrégées
- `GET /oeuvres/my/list` — œuvres du créateur
- `GET /professionnel/evenements` — événements du pro
- `GET /professionnel/artisanats` — artisanats du pro
- `GET /patrimoine/my` — sites patrimoniaux du pro

### Points forts
- React Query pour cache et refetch
- Gestion des erreurs avec fallback (items vides)
- Suppression avec invalidation de cache
- Lazy loading des programmes par événement

### Problèmes identifiés
1. **Console.log** : `console.log('Dashboard - Mes œuvres:', mesOeuvres)` — à retirer en prod
2. **Services vs Artisanat** : même source `mesArtisanats` pour 2 onglets (services et artisanat) — possible confusion sémantique
3. **Stats vs réalité** : `artisanatsTotal` = `dashboardStats?.artisanats?.total` alors que l’onglet “Services” affiche `mesArtisanats`
4. **deleteItem('artisanat')** : `handleDeleteItem('artisanat', item)` passe `item` mais `confirmDeleteItem` attend `ids[type]` = `item?.id_artisanat || item?.id` — à valider
5. **Route service** : `handleView('service', item)` → `/services/${item.id_service || item.id_artisanat}` — à vérifier cohérence modèle Service vs Artisanat

---

## 4. Dashboard Admin

### Structure
- **7 onglets** : Overview, Users, Œuvres, Événements, Patrimoine, Services, Modération
- **URL** : `?tab=overview|users|oeuvres|...` pour lien direct
- **Lazy loading** : tous les onglets en `React.lazy`
- **WebSocket** : indicateur connexion + alerte si déconnecté
- **Modal** : notifications admin

### Données (useDashboardAdmin)
- `loadOverview()` — vue d’ensemble
- `loadStats(period)` — stats détaillées (day/week/month/year)
- `loadPatrimoineStats()` — statistiques patrimoine
- `loadAllUsers()` — tous les utilisateurs
- `loadPendingUsers()` — utilisateurs en attente
- `loadPendingOeuvres()` — œuvres en attente
- `loadModerationQueue()` — file de modération
- `loadAlerts()` — alertes
- `loadOeuvres()` — œuvres (admin)
- `loadEvenements()` — événements (admin)
- `loadPatrimoineItems()` — sites patrimoniaux
- `loadServices()` — services

### Backend (dashboardController)
- **Overview** : `generateOverviewStats()` — users, oeuvres, événements, artisanats, pending, signalements, vues
- **Stats** : `getDetailedStats(period)` — évolution temporelle
- **Permissions** : Admin, Super Admin, Moderateur (liste d’actions)
- **Cache** : mémoire, TTL 5–10 min
- **Services** : StatsService, ModerationService, UserManagementService, AnalyticsService

### Points forts
- Architecture modulaire (services dédiés)
- Gestion des permissions par rôle
- Cache backend pour limiter les requêtes
- ErrorBoundary + Suspense par onglet
- Actions utilisateur : valider, rejeter, suspendre, réactiver, reset MDP, export

### Problèmes identifiés
1. **Chargement initial** : 12 appels API au montage (`useEffect` sans deps) — risque de surcharge
2. **AdminOverview** : `stats` dérivé de `overview` avec mapping `overview.users?.total` vs `generateOverviewStats` qui renvoie `stats.totalUsers` — incohérence possible de structure
3. **Trends statiques** : `StatCard` utilise `trend={{ value: 12, label: 'Ce mois' }}` en dur — pas de vraie évolution
4. **validateOeuvre** : admin utilise `PATCH /dashboard/oeuvres/:id/validate` alors que les routes oeuvre utilisent `POST /oeuvres/:id/validate` — vérifier unicité des endpoints
5. **loadStats(selectedPeriod)** : `loadStats` dépend de `selectedPeriod` mais celui-ci n’est pas dans les deps du `useEffect` initial

---

## 5. Flux de données et API

### Endpoints Dashboard Admin
| Endpoint | Méthode | Usage |
|----------|---------|--------|
| `/dashboard/overview` | GET | Vue d’ensemble |
| `/dashboard/stats?period=` | GET | Stats détaillées |
| `/dashboard/patrimoine/stats` | GET | Stats patrimoine |
| `/dashboard/users` | GET | Tous utilisateurs |
| `/dashboard/users/pending` | GET | Utilisateurs en attente |
| `/dashboard/content/pending-oeuvres` | GET | Œuvres en attente |
| `/dashboard/moderation/queue` | GET | File modération |
| `/dashboard/monitoring/alerts` | GET | Alertes |
| `/dashboard/users/:id/validate` | PATCH | Valider utilisateur |
| `/dashboard/oeuvres/:id/validate` | PATCH | Valider œuvre |

### Endpoints Professionnel
| Endpoint | Méthode | Usage |
|----------|---------|--------|
| `/professionnel/dashboard` | GET | Stats dashboard |
| `/oeuvres/my/list` | GET | Mes œuvres |
| `/professionnel/evenements` | GET | Mes événements |
| `/professionnel/artisanats` | GET | Mes artisanats |
| `/patrimoine/my` | GET | Mes sites patrimoine |

---

## 6. Sécurité et contrôle d’accès

### Frontend
- **DashboardUser** : `useAuth` — accès si connecté
- **DashboardPro** : `ProfessionalRoute` — `statut_validation === 'valide'`
- **DashboardAdmin** : `AdminRoute` + `useAdminAuth` — redirection si non admin

### Backend
- Routes dashboard : middleware `requireRole(['Admin', 'Moderateur'])` selon endpoint
- `checkAdminPermission(userId, action)` : vérifie rôles User (Admin, Super Admin, Moderateur)
- Routes professionnel : `requireValidatedProfessional` ou équivalent

---

## 7. Recommandations

### Court terme
1. **Retirer les console.log** du DashboardPro
2. **Clarifier Services vs Artisanat** : deux entités ou une seule avec filtres ?
3. **Harmoniser la structure overview** entre backend et AdminOverview
4. **Remplacer les tendances statiques** par des données réelles (requête stats par période)

### Moyen terme
1. **Réduire les appels au chargement admin** : chargement à la demande par onglet (load on tab focus)
2. **Pagination** : Admin charge 100 items par liste — ajouter pagination côté front
3. **Optimistic updates** : après validation/rejet, mise à jour UI sans refetch complet
4. **Tests** : tests E2E pour les parcours critiques (validation œuvre, suppression)

### Long terme
1. **WebSocket** : utiliser le socket pour mettre à jour les pending/alertes en temps réel
2. **Export** : permettre export CSV/Excel depuis chaque onglet
3. **Filtres avancés** : dates, statuts, types sur chaque liste admin
4. **Tableaux de bord personnalisables** : widgets déplaçables, choix des KPIs

---

## 8. Synthèse

| Critère | Dashboard User | Dashboard Pro | Dashboard Admin |
|---------|----------------|---------------|-----------------|
| **Complexité** | Faible | Moyenne | Élevée |
| **Performance** | Bonne | Bonne | À améliorer |
| **UX** | Bonne | Bonne | Bonne |
| **Cohérence données** | Correcte | Quelques écarts | À vérifier |
| **Maintenabilité** | Bonne | Bonne | Correcte |

L’ensemble est fonctionnel. Les améliorations prioritaires concernent la réduction des appels au chargement du dashboard admin, la clarification Services/Artisanat côté pro, et l’alignement des structures de données entre backend et frontend pour l’overview admin.
