# 📖 Documentation Fonctionnelle — Action Culture DZ

> **Plateforme de valorisation du patrimoine culturel algérien**
> Version 1.0.0 — Mars 2026

---

## Table des matières

1. [Présentation générale](#1-présentation-générale)
2. [Architecture technique](#2-architecture-technique)
3. [Rôles et permissions](#3-rôles-et-permissions)
4. [Pages publiques](#4-pages-publiques)
5. [Module Patrimoine](#5-module-patrimoine)
6. [Module Événements](#6-module-événements)
7. [Module Œuvres culturelles](#7-module-œuvres-culturelles)
8. [Module Artisanat](#8-module-artisanat)
9. [Module Services](#9-module-services)
10. [Module Parcours intelligents](#10-module-parcours-intelligents)
11. [Carte interactive unifiée](#11-carte-interactive-unifiée)
12. [Système multilingue](#12-système-multilingue)
13. [Système de notifications](#13-système-de-notifications)
14. [Système de commentaires et évaluations](#14-système-de-commentaires-et-évaluations)
15. [Système de favoris](#15-système-de-favoris)
16. [Système de signalement](#16-système-de-signalement)
17. [Dashboard Visiteur](#17-dashboard-visiteur)
18. [Dashboard Professionnel](#18-dashboard-professionnel)
19. [Dashboard Administrateur](#19-dashboard-administrateur)
20. [Authentification et sécurité](#20-authentification-et-sécurité)
21. [API Backend — Endpoints](#21-api-backend--endpoints)
22. [Modèles de données](#22-modèles-de-données)
23. [Performance et optimisation](#23-performance-et-optimisation)

---

## 1. Présentation générale

**Action Culture DZ** est une plateforme web complète dédiée à la valorisation, la découverte et la promotion du patrimoine culturel algérien. Elle réunit en un seul lieu :

- **Sites patrimoniaux** (monuments, musées, vestiges, villes/villages, sites naturels, édifices religieux)
- **Événements culturels** (festivals, expositions, conférences, ateliers)
- **Œuvres culturelles** (livres, films, albums musicaux, œuvres d'art, articles scientifiques)
- **Artisanat traditionnel** (poterie, tapis, bijoux, cuir, bois)
- **Services touristiques** (restaurants, hôtels, guides, transports, locations)
- **Parcours intelligents** (itinéraires personnalisés avec services intégrés)

La plateforme est **trilingue** (Français, Arabe, Anglais) avec support complet du RTL pour l'arabe.

---

## 2. Architecture technique

### Frontend
| Élément | Technologie |
|---------|------------|
| Framework | **React 18** + TypeScript |
| Build tool | **Vite** |
| Routing | React Router v6 |
| State management | React Query (TanStack Query) |
| Styling | **TailwindCSS** |
| Composants UI | **shadcn/ui** |
| Icônes | **Lucide React** |
| Cartes | **Leaflet** (react-leaflet) |
| i18n | **react-i18next** |
| Temps réel | **Socket.IO client** |

### Backend
| Élément | Technologie |
|---------|------------|
| Runtime | **Node.js** |
| Framework | **Express.js** |
| ORM | **Sequelize** |
| Base de données | **MySQL** 8+ |
| Auth | **JWT** (JSON Web Tokens) |
| Temps réel | **Socket.IO** |
| Upload | **Multer** |
| Cache | Middleware personnalisé |

### Architecture backend (pattern en couches)
```
Routes → Controllers → Services → Repositories → Models (Sequelize)
```

| Module | Controller | Routes | Service | Repository |
|--------|-----------|--------|---------|------------|
| Users | `userController.js` | `userRoutes.js` | `user/userService.js` | `userRepository.js` |
| Œuvres | `oeuvreController.js` | `oeuvreRoutes.js` | `oeuvre/oeuvreService.js` | `oeuvreRepository.js` |
| Événements | `evenementController.js` | `evenementRoutes.js` | `evenement/evenementService.js` | `evenementRepository.js` |
| Patrimoine | `patrimoineController.js` | `patrimoineRoutes.js` | `patrimoine/patrimoineService.js` | `patrimoineRepository.js` |
| Artisanat | `artisanatController.js` | `artisanatRoutes.js` | `artisanat/artisanatService.js` | `artisanatRepository.js` |
| Services | `serviceController.js` | `serviceRoutes.js` | `service/serviceService.js` | `serviceRepository.js` |
| Parcours | `parcoursController.js` | `parcoursRoutes.js` | `parcours/parcoursService.js` | `parcoursRepository.js` |

Point d'entrée unique : `/api` via `routes/index.js`.

---

## 3. Rôles et permissions

La plateforme gère **3 rôles principaux** :

### 3.1 Visiteur (Utilisateur authentifié)
- Consulter tout le contenu public
- Ajouter des commentaires et évaluations
- Gérer ses favoris
- Recevoir des notifications
- Accéder au dashboard visiteur
- Signaler du contenu inapproprié

### 3.2 Professionnel (validé par l'admin)
Tout ce qu'un visiteur peut faire, plus :
- Créer / modifier / supprimer ses **œuvres**
- Créer / modifier / supprimer ses **événements**
- Créer / modifier / supprimer ses **services**
- Créer / modifier / supprimer ses **patrimoines**
- Créer / modifier / supprimer ses **artisanats**
- Créer / modifier / supprimer ses **articles**
- Gérer ses **organisations**
- Gérer les **participants** et **programmes** de ses événements
- Accéder au dashboard professionnel avec statistiques

### 3.3 Administrateur
Tout ce qu'un professionnel peut faire, plus :
- Gérer tous les **utilisateurs** (activation, suspension, rôles)
- **Modérer** le contenu (validation, rejet, signalements)
- Consulter les **statistiques globales** de la plateforme
- Gérer les **notifications** système
- Envoyer des notifications aux utilisateurs
- Accéder au dashboard d'administration complet
- Connexion **WebSocket temps réel** pour le suivi en direct

### Contrôle d'accès (routes protégées)
| Route | Composant de protection |
|-------|------------------------|
| Routes visiteur | `<ProtectedRoute>` |
| Routes professionnel | `<ProfessionalRoute>` (requiert validation) |
| Routes admin | `<AdminRoute>` |

Un professionnel non encore validé voit un écran "Validation en attente" avec un message d'information.

---

## 4. Pages publiques

### 4.1 Page d'accueil (`/`)
La page d'accueil est composée de sections dynamiques chargées depuis l'API :
- **HeroSection** — Bannière principale avec statistiques en direct (sites patrimoniaux, événements, œuvres, membres)
- **IslamicPatternDivider** — Séparateur décoratif avec motifs islamiques
- **PatrimoineDynamique** — Carrousel des sites patrimoniaux mis en avant
- **EvenementsDynamique** — Événements à venir et en cours
- **OeuvresDynamique** — Sélection d'œuvres culturelles
- **ArtisanatDynamique** — Artisanat traditionnel en vedette
- **CartePatrimoine** — Carte interactive des sites (Leaflet, lazy loaded)
- **EnhancedCTASection** — Appel à l'action pour contribuer

Statistiques publiques affichées via `GET /api/stats/public`.

### 4.2 Page À propos (`/a-propos`)
Présentation de la mission et des objectifs de la plateforme.

### 4.3 Page 404 (`/*`)
Page d'erreur personnalisée pour les routes inexistantes.

---

## 5. Module Patrimoine

### 5.1 Liste des patrimoines (`/patrimoine`)
- **Grille de cartes** avec images, nom, type, localisation (wilaya)
- **Filtres** : par type de patrimoine, par wilaya, par recherche textuelle
- **Pagination** côté serveur
- **Tri** par pertinence, date, popularité

### 5.2 Détail d'un patrimoine (`/patrimoine/:id`)
Page détaillée structurée en **onglets dynamiques** selon le type de patrimoine :

| Onglet | Description | Condition |
|--------|-------------|-----------|
| **Présentation** | Description complète, galerie photos, localisation | Toujours |
| **Monuments** | Liste des monuments du site | Type ville/village |
| **Vestiges** | Liste des vestiges archéologiques | Type ville/village |
| **À Visiter** | Vue combinée monuments + vestiges | Type ville/village |
| **Services** | Services à proximité (via `ServicesProximite`) | Toujours |
| **Parcours** | Parcours associés au site | Si parcours disponibles |
| **Avis** | Commentaires et évaluations des visiteurs | Toujours |

**Fonctionnalités spéciales :**
- **Badge type patrimoine** coloré dans le header (monument → bleu, musée → violet, ville/village → vert, site naturel → émeraude, etc.)
- **QR Code** du site pour partage rapide
- **Statistiques** (nombre de vues, évaluations)
- **Planificateur de visite** (`VisitePlanner`) : génère un parcours personnalisé autour du site
- **Bouton favori** pour sauvegarder le site
- **Informations pratiques** dans la barre latérale (horaires, coordonnées, accès)
- **Lien professionnel** pour ajouter un service au lieu

### 5.3 Types de patrimoine supportés
| Type | Icône | Couleur |
|------|-------|---------|
| `monument` | Landmark | Bleu |
| `musee` | Building2 | Violet |
| `site_archeologique` | Scroll | Amber |
| `site_naturel` | Trees | Émeraude |
| `ville_village` | Home | Vert |
| `edifice_religieux` | Church | Indigo |
| `vestige` | Columns | Orange |

### 5.4 Création / Modification
- **Professionnels** : `/ajouter-patrimoine` (via `AjouterPatrimoinePro`)
- **Admins** : `/admin/patrimoine/ajouter` (via `AjouterPatrimoine`)
- Formulaire avec champs multilingues (FR, AR, EN)
- Sélection de lieu avec carte interactive (`LieuSelector`)
- Upload de médias (images, vidéos)

---

## 6. Module Événements

### 6.1 Liste des événements (`/evenements`)
- **Cartes événements** avec image, titre, date, lieu, statut
- **Filtres** : par type, par wilaya, par date, par statut
- **Recherche** textuelle
- **Pagination** côté serveur

### 6.2 Détail d'un événement (`/evenements/:id`)
Page détaillée avec sections lazy-loaded :

| Section / Onglet | Composant | Description |
|-----------------|-----------|-------------|
| **Hero** | `EventHero` | Bannière avec image, titre, dates, lieu |
| **Infos** | `EventInfo` | Description complète, organisateur, catégorie |
| **Programme** | `EventProgram` | Agenda détaillé avec intervenants et horaires |
| **Galerie** | `EventGallery` | Photos et médias de l'événement |
| **Commentaires** | `EventComments` | Avis et évaluations des participants |
| **Services** | `ServicesProximite` | Services à proximité du lieu de l'événement |
| **Organisateurs** | `EventOrganizers` | Informations sur les organisateurs |
| **Inscription** | `EventRegistration` | Formulaire d'inscription à l'événement |
| **Événements liés** | `RelatedEvents` | Événements similaires ou au même lieu |

**Fonctionnalités :**
- **Inscription en ligne** aux événements
- **Gestion des participants** (pour les organisateurs)
- **Programme détaillé** avec sessions, intervenants, horaires
- **Services à proximité** du lieu de l'événement (restaurants, hôtels, etc.)
- **Partage** et **mise en favoris**

### 6.3 Statuts d'un événement
| Statut | Description |
|--------|-------------|
| `planifie` | Événement planifié, pas encore commencé |
| `en_cours` | Événement en cours |
| `termine` | Événement terminé |
| `annule` | Événement annulé |

### 6.4 Gestion par le professionnel
- **Création** : `/ajouter-evenement`
- **Modification** : `/modifier-evenement/:id`
- **Gestion complète** : `GestionEvenement` (participants, programme, statistiques)
- **`ParticipantsManager`** : gestion des inscrits (validation, présence, export)

---

## 7. Module Œuvres culturelles

### 7.1 Liste des œuvres (`/oeuvres`)
- **Grille de cartes** avec image de couverture, titre, auteur, type
- **Filtres** : par type d'œuvre, par catégorie, par genre, par langue
- **Recherche** textuelle
- **Tri** par date, popularité, note

### 7.2 Détail d'une œuvre (`/oeuvres/:id`)
Page détaillée avec :
- **HeroSection** — Image de couverture, titre, auteur
- **OeuvreInfo** — Description, métadonnées (genre, catégorie, langue, date de publication)
- **OeuvreGallery** — Galerie de médias associés
- **OeuvreComments** — Commentaires et évaluations
- **ContributeursSection** — Contributeurs, intervenants, éditeurs
- **RelatedOeuvres** — Œuvres similaires

### 7.3 Types d'œuvres (sous-types spécialisés)
| Type | Modèle backend | Champs spécifiques |
|------|---------------|-------------------|
| **Livre** | `livre.js` | ISBN, éditeur, nombre de pages |
| **Film** | `film.js` | Durée, réalisateur, producteur |
| **Album musical** | `albumMusical.js` | Nombre de pistes, label |
| **Œuvre d'art** | `oeuvreArt.js` | Technique, matériau, dimensions |
| **Article scientifique** | `articleScientifique.js` | DOI, journal, domaine |
| **Article** | `article.js` + `articleBlock.js` | Éditeur de blocs (texte, image, code, citation) |

### 7.4 Articles — Éditeur avancé
- Éditeur de type **block-based** (similaire à Notion)
- Blocs supportés : texte, titre, image, code, citation, liste
- Composant `ArticleViewPage` pour la lecture publique
- Composant `EditArticle` pour l'édition par le professionnel

### 7.5 Création / Modification
- **`/ajouter-oeuvre`** : Formulaire multi-étapes avec sélection de catégorie
  - `CategorySelection` : choix du type d'œuvre
  - `EditorModeSelector` : choix du mode d'édition
  - `IntervenantEditeurManager` : gestion des intervenants et éditeurs associés
- Champs multilingues, tags, upload de médias

---

## 8. Module Artisanat

### 8.1 Liste des artisanats (`/artisanat`)
- **Cartes artisanat** avec images, nom, type, artisan, région
- **Filtres** par type, par wilaya
- **Recherche** textuelle

### 8.2 Détail d'un artisanat (`/artisanat/:id`)
- Description complète
- Galerie photos
- Artisan / créateur
- Matériaux et techniques utilisés
- Localisation et région d'origine
- Commentaires et évaluations

### 8.3 Création / Modification
- **`/ajouter-artisanat`** : formulaire avec champs multilingues
- Sélection des matériaux, techniques
- Upload de photos

---

## 9. Module Services

### 9.1 Types de services
| Type | Description |
|------|-------------|
| `restaurant` | Restaurants et établissements de restauration |
| `hotel` | Hôtels et hébergements |
| `guide` | Guides touristiques |
| `transport` | Services de transport |
| `location` | Location de véhicules ou équipements |
| `artisanat` | Boutiques d'artisanat |

### 9.2 Composant `ServicesProximite`
Composant réutilisable affichant les services liés à un lieu, utilisé dans :
- **EventDetailsPage** (onglet Services)
- **PatrimoineDetail** (onglet Services)

**3 variantes d'affichage :**
| Variante | Usage |
|----------|-------|
| `full` | Affichage complet avec grille de cartes détaillées |
| `compact` | Liste compacte pour les espaces restreints |
| `sidebar` | Affichage latéral avec liste simple |

**Fonctionnalités :**
- Icônes colorées par type de service
- Affichage des tarifs (min–max)
- Numéro de téléphone cliquable
- Horaires d'ouverture
- Statut de validation (badge)
- Message vide élégant si aucun service

### 9.3 Création de services
- **`/ajouter-service`** : formulaire standard
- **`/ajouter-mon-service`** : formulaire enrichi pour professionnels (`AjouterServicePro`)
- Champs : nom, type, description, tarifs, horaires, coordonnées, lieu associé

---

## 10. Module Parcours intelligents

### 10.1 Description
Le module de parcours intelligents permet de :
- **Créer** des parcours touristiques manuels (étapes ordonnées)
- **Générer** des parcours personnalisés automatiquement selon les préférences du visiteur

### 10.2 Parcours manuels
- Liste des parcours : `GET /api/parcours`
- Détail avec carte : `GET /api/parcours/:id/map`
- Création/modification par les professionnels authentifiés
- Gestion des étapes : ajout, suppression, réordonnancement
- Métadonnées : difficulté (facile/moyen/difficile), durée estimée, distance, thème

### 10.3 Parcours personnalisés — `VisitePlanner`
Le composant `VisitePlanner` est un **planificateur de visite interactif** accessible depuis la page PatrimoineDetail.

**Paramètres configurables :**
| Paramètre | Options | Par défaut |
|-----------|---------|------------|
| Durée | 1h – 8h (slider) | 4h |
| Transport | À pied, Vélo, Voiture | Voiture |
| Centres d'intérêt | Histoire, Architecture, Art, Nature, Religion, Gastronomie | Histoire, Architecture |
| Nombre de sites | 2 – 10 | 5 |
| Inclure restaurants | Oui / Non | Oui |
| Inclure hôtels | Oui / Non | Non |
| Accessibilité PMR | Oui / Non | Non |
| Adapté familles | Oui / Non | Non |

**Algorithme backend (`POST /api/parcours/personnalise`) :**
1. Calcul du rayon de recherche selon le transport (5 km à pied, 15 km vélo, 50 km voiture)
2. Recherche des lieux patrimoniaux à proximité via formule **Haversine**
3. Tri par distance croissante, limitation au nombre de sites demandé
4. Si restaurants demandés : insertion d'un restaurant au milieu du parcours (45 min pause)
5. Si hôtels demandés : ajout d'un hôtel en fin de parcours
6. Calcul des durées de trajet selon la vitesse moyenne du transport

**Résultat affiché :**
- Résumé visuel : nombre de sites, distance totale, durée estimée
- Itinéraire étape par étape avec icônes typées (monument, restaurant, hôtel…)
- Section **"Services inclus"** avec cartes colorées (orange pour restaurants, bleu pour hôtels) affichant nom, distance et tarifs
- Bouton **"Ouvrir dans Google Maps"** pour la navigation GPS
- Bouton **"Modifier"** pour ajuster les paramètres

---

## 11. Carte interactive unifiée

### Composant `CarteInteractiveUnifiee`
Carte Leaflet combinant toutes les données géographiques de la plateforme :

**Couches de données :**
| Couche | Marqueur | Couleur |
|--------|----------|---------|
| Patrimoine | Icône personnalisée | Vert |
| Services | Icône par type | Orange |
| Événements | Marqueur calendrier | Bleu |
| Parcours | Polylines | Violet |

**Fonctionnalités :**
- **Filtres toggleables** par catégorie (patrimoine, services, événements)
- **Popups** au clic avec détails et liens vers les pages de détail
- **Badges de résumé** affichant le nombre d'éléments par catégorie
- **Mode plein écran** via dialogue modal
- **Tracé des parcours** sous forme de polylignes sur la carte

---

## 12. Système multilingue

### 12.1 Langues supportées
| Langue | Code | Direction |
|--------|------|-----------|
| Français | `fr` | LTR |
| Arabe | `ar` | RTL |
| Anglais | `en` | LTR |

### 12.2 Implémentation
- **Frontend** : `react-i18next` avec fichiers de traduction
- **Backend** : champs multilingues stockés en JSON (`{ fr: "...", ar: "...", en: "..." }`)
- **Hook `useTranslateData`** : extrait automatiquement la traduction de la langue active depuis un objet multilingue
- **Hook `useRTL`** : gère les classes CSS pour le support RTL
- **`LanguagePersistenceManager`** : persiste le choix de langue entre les sessions
- **`RTLManager`** : applique automatiquement la direction RTL quand l'arabe est sélectionné
- **Hook `useLocalizedDate`** : formate les dates selon la locale active
- **Hook `useLocalizedNumber`** : formate les nombres selon la locale active

### 12.3 Contenu multilingue
Tous les champs textuels principaux sont stockés en format multilingue :
- Noms, titres, descriptions
- Champs de formulaires avec `MultiLangInput` (saisie dans les 3 langues)

---

## 13. Système de notifications

### 13.1 Types de notifications
- Notifications **système** (maintenance, mises à jour)
- Notifications **d'événements** (inscription confirmée, rappel, annulation)
- Notifications **de contenu** (commentaire reçu, œuvre validée, service approuvé)
- Notifications **administratives** (nouveau professionnel à valider, signalement)

### 13.2 Canaux
- **In-app** : badge dans le header + page dédiée
- **Temps réel** : via **Socket.IO** (toast automatique via `NotificationToastListener`)
- **Email** (vérification, réinitialisation mot de passe)

### 13.3 Préférences
Page `/notifications/Preferences` permettant de configurer :
- Activation/désactivation par type
- Fréquence de réception

---

## 14. Système de commentaires et évaluations

### 14.1 Entités commentables
- Sites patrimoniaux
- Événements
- Œuvres culturelles
- Artisanats

### 14.2 Fonctionnalités
- **Commentaire textuel** avec note (1-5 étoiles)
- **Réponses** aux commentaires (threading)
- **Modération** par l'administrateur
- **Authentification optionnelle** pour la lecture, requise pour l'écriture
- Endpoints : `POST /api/commentaires`, `GET /api/commentaires`, etc.

---

## 15. Système de favoris

- **Ajout/suppression** d'éléments en favoris (cœur cliquable)
- **Hook `useFavoris`** : gère l'état des favoris côté frontend
- **Synchronisation** avec le backend via `GET /api/favoris`, `POST /api/favoris`
- Types supportés : patrimoine, événements, œuvres, artisanat
- Accessible dans le **dashboard visiteur**

---

## 16. Système de signalement

- **Signaler** un contenu inapproprié (commentaire, œuvre, événement, etc.)
- Formulaire avec **motif** et **description**
- **File d'attente de modération** dans le dashboard admin
- Endpoints : `POST /api/signalements`, `GET /api/signalements`

---

## 17. Dashboard Visiteur (`/dashboard-user`)

Accessible à tout utilisateur authentifié :
- **Vue d'ensemble** : statistiques personnelles
- **Mes favoris** : liste de tous les éléments sauvegardés
- **Mes commentaires** : historique des commentaires postés
- **Mes inscriptions** : événements auxquels l'utilisateur est inscrit
- **Notifications** : centre de notifications

---

## 18. Dashboard Professionnel (`/dashboard-pro`)

Accessible aux professionnels validés :

### 18.1 Statistiques
Cartes de statistiques : nombre d'œuvres, événements, patrimoines, artisanats créés.

### 18.2 Onglets de gestion
| Onglet | Contenu |
|--------|---------|
| **Œuvres** | Liste des œuvres avec actions (voir, modifier, supprimer) |
| **Événements** | Liste des événements avec gestion des participants |
| **Patrimoines** | Sites patrimoniaux créés |
| **Artisanats** | Artisanats créés |

### 18.3 Actions rapides
- **Menu "Ajouter"** avec accès rapide : nouvelle œuvre, événement, patrimoine, service, artisanat
- **Bouton "Actualiser"** pour recharger les données
- **Recherche** globale dans tous les contenus
- **Gestion d'événement** via dialogue dédié (`GestionEvenement`)

### 18.4 Pour chaque item
- **Voir** : navigation vers la page publique
- **Modifier** : navigation vers le formulaire d'édition
- **Supprimer** : dialogue de confirmation avec suppression

---

## 19. Dashboard Administrateur (`/admin/dashboard`)

### 19.1 Vue d'ensemble (`AdminOverview`)
- Statistiques globales de la plateforme
- Graphiques d'activité
- Alertes et actions nécessaires

### 19.2 Onglets d'administration

| Onglet | Composant | Fonctionnalités |
|--------|-----------|----------------|
| **Vue d'ensemble** | `AdminOverview` | Stats, graphiques, activité récente |
| **Utilisateurs** | `AdminUsersTab` | Liste, recherche, activation/suspension, changement de rôle |
| **Œuvres** | `AdminOeuvresTab` | Validation, modération, statistiques |
| **Événements** | `AdminEvenementsTab` | Gestion, annulation, participants |
| **Patrimoine** | `AdminPatrimoineTab` | QR codes, parcours, statistiques |
| **Services** | `AdminServicesTab` | Validation, suspension des services |
| **Modération** | `AdminModerationTab` | Signalements, contenus à modérer |

### 19.3 Fonctionnalités spéciales
- **Indicateur WebSocket** : statut de connexion temps réel (vert/rouge)
- **Bouton de reconnexion** si la connexion temps réel est perdue
- **Modal de notifications** (`AdminNotificationsModal`) : envoi de notifications ciblées
- **URL synchronisée** : l'onglet actif est reflété dans le paramètre `?tab=` de l'URL

---

## 20. Authentification et sécurité

### 20.1 Authentification
| Fonctionnalité | Route | Description |
|---------------|-------|-------------|
| Inscription | `/auth` | Formulaire d'inscription (visiteur ou professionnel) |
| Connexion | `/auth` | Formulaire de connexion par email/mot de passe |
| Mot de passe oublié | `/forgot-password` | Envoi d'un email de réinitialisation |
| Réinitialisation | `/reset-password/:token` | Formulaire de nouveau mot de passe |
| Vérification email | `/verify-email/:token` | Validation de l'adresse email |
| Changement email | `/confirm-email-change/:token` | Confirmation du changement d'email |

### 20.2 Tokens JWT
- Token d'authentification stocké dans `localStorage` (`auth_token`)
- Header `Authorization: Bearer <token>` pour toutes les requêtes authentifiées
- Rafraîchissement de token via `POST /api/users/refresh-token`

### 20.3 Middlewares de sécurité
| Middleware | Fichier | Rôle |
|-----------|---------|------|
| Auth | `authMiddleware.js` | Vérification JWT, extraction utilisateur |
| Rate Limit | `rateLimitMiddleware.js` | Limitation du nombre de requêtes |
| CORS | `corsMiddleware.js` | Contrôle des origines autorisées |
| Validation | `validationMiddleware.js` | Validation des données entrantes |
| Security | `securityMiddleware.js` | Sanitisation des entrées |
| Audit | `auditMiddleware.js` | Journal des actions sensibles |
| Cache | `cacheMiddleware.js` | Stratégies de cache (short, medium, long) |
| HTTPS Redirect | `httpsRedirect.js` | Redirection HTTP → HTTPS |

---

## 21. API Backend — Endpoints

### 21.1 Routes système
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/` | Documentation API dynamique |
| `GET` | `/api/health` | État de santé du serveur |
| `GET` | `/api/stats/public` | Statistiques publiques (hero section) |
| `GET` | `/api/endpoints` | Liste de tous les endpoints |
| `GET` | `/api/docs/:module` | Documentation par module |

### 21.2 Utilisateurs (`/api/users`)
| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `POST` | `/register` | Non | Inscription |
| `POST` | `/login` | Non | Connexion |
| `POST` | `/refresh-token` | Oui | Rafraîchir le token |
| `GET` | `/profile` | Oui | Profil de l'utilisateur |
| `PUT` | `/profile` | Oui | Modifier le profil |

### 21.3 Œuvres (`/api/oeuvres`)
| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET` | `/` | Non | Liste des œuvres (pagination, filtres) |
| `GET` | `/:id` | Non | Détail d'une œuvre |
| `POST` | `/` | Pro | Créer une œuvre |
| `PUT` | `/:id` | Pro | Modifier une œuvre |
| `DELETE` | `/:id` | Pro | Supprimer une œuvre |

### 21.4 Événements (`/api/evenements`)
| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET` | `/` | Non | Liste des événements |
| `GET` | `/:id` | Non | Détail d'un événement |
| `POST` | `/` | Pro | Créer un événement |
| `PUT` | `/:id` | Pro | Modifier un événement |
| `DELETE` | `/:id` | Pro | Supprimer un événement |

### 21.5 Patrimoine (`/api/patrimoine`)
| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET` | `/` | Non | Liste des sites patrimoniaux |
| `GET` | `/:id` | Non | Détail d'un site |
| `POST` | `/` | Pro | Créer un site |
| `PUT` | `/:id` | Pro | Modifier un site |
| `DELETE` | `/:id` | Pro | Supprimer un site |

### 21.6 Artisanat (`/api/artisanat`)
| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET` | `/` | Non | Liste des artisanats |
| `GET` | `/:id` | Non | Détail d'un artisanat |
| `POST` | `/` | Pro | Créer un artisanat |
| `PUT` | `/:id` | Pro | Modifier un artisanat |
| `DELETE` | `/:id` | Pro | Supprimer un artisanat |

### 21.7 Services (`/api/services`)
| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET` | `/` | Non | Liste des services |
| `GET` | `/:id` | Non | Détail d'un service |
| `POST` | `/` | Pro | Créer un service |
| `PUT` | `/:id` | Pro | Modifier un service |
| `DELETE` | `/:id` | Pro | Supprimer un service |

### 21.8 Parcours (`/api/parcours`)
| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET` | `/` | Non | Liste des parcours |
| `GET` | `/search` | Non | Recherche de parcours |
| `POST` | `/personnalise` | Non | Générer un parcours personnalisé avec services |
| `GET` | `/:id` | Non | Détail d'un parcours |
| `GET` | `/:id/map` | Non | Données cartographiques d'un parcours |
| `POST` | `/` | Oui | Créer un parcours |
| `PUT` | `/:id` | Oui | Modifier un parcours |
| `DELETE` | `/:id` | Oui | Supprimer un parcours |
| `POST` | `/:id/etapes` | Oui | Ajouter une étape |
| `DELETE` | `/:id/etapes/:etapeId` | Oui | Supprimer une étape |
| `PUT` | `/:id/etapes/reorder` | Oui | Réordonner les étapes |

### 21.9 Autres modules
| Module | Base path | Description |
|--------|-----------|-------------|
| Lieux | `/api/lieux` | Gestion des lieux géographiques |
| Commentaires | `/api/commentaires` | Commentaires et évaluations |
| Favoris | `/api/favoris` | Gestion des favoris |
| Notifications | `/api/notifications` | Centre de notifications |
| Programmes | `/api/programmes` | Programmes d'événements |
| Intervenants | `/api/intervenants` | Gestion des intervenants |
| Organisations | `/api/organisations` | Organisations professionnelles |
| Upload | `/api/upload` | Upload de fichiers et médias |
| Metadata | `/api/metadata` | Données de référence (wilayas, catégories, langues, etc.) |
| Dashboard | `/api/dashboard` | Statistiques pour les dashboards |
| Professionnel | `/api/professionnel` | Espace professionnel |
| Tracking | `/api/tracking` | Suivi des vues et analytics |
| Signalements | `/api/signalements` | Signalement de contenu |
| Email verification | `/api/email-verification` | Vérification des emails |
| Article blocks | `/api/article-blocks` | Blocs d'articles (éditeur avancé) |

---

## 22. Modèles de données

### 22.1 Entités principales

```
┌─────────────────────────────────────────────────────────┐
│                     UTILISATEURS                         │
│  User, TypeUser, Specialite, Certification              │
│  Organisation, UserOrganisation                          │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│                      CONTENUS                            │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Oeuvre    │  │Evenement │  │Artisanat │              │
│  │ ├ Livre   │  │├ Programme│  │          │              │
│  │ ├ Film    │  │├ TypeEvt │  └──────────┘              │
│  │ ├ Album   │  │└ Interv. │                             │
│  │ ├ OeuvreArt│ └──────────┘                             │
│  │ ├ Article │                                           │
│  │ └ ArtScien│                                           │
│  └──────────┘                                            │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│                    GÉOGRAPHIE                            │
│  Wilaya → Daira → Commune → Localite                    │
│  Lieu → DetailLieu, LieuMedia, Monument, Vestige        │
│  Service (restaurant, hotel, guide, transport...)        │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│                   CLASSIFICATIONS                        │
│  TypeOeuvre, Genre, Categorie, Langue                   │
│  Materiau, Technique, TagMotCle                         │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│                   INTERACTIONS                           │
│  Commentaire, CritiqueEvaluation, Favori                │
│  Notification, Signalement, Vue                         │
│  QrCode, QrScan, AuditLog, Media                        │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│                    PARCOURS                              │
│  Parcours → ParcoursLieu (étapes ordonnées)             │
│  Parcours personnalisé (algorithme Haversine)           │
└─────────────────────────────────────────────────────────┘
```

### 22.2 Tables d'association
| Table | Relie | Relation |
|-------|-------|----------|
| `EvenementOeuvre` | Événement ↔ Œuvre | M:N |
| `EvenementOrganisation` | Événement ↔ Organisation | M:N |
| `EvenementUser` | Événement ↔ User (inscriptions) | M:N |
| `OeuvreCategorie` | Œuvre ↔ Catégorie | M:N |
| `OeuvreEditeur` | Œuvre ↔ User (éditeurs) | M:N |
| `OeuvreIntervenant` | Œuvre ↔ Intervenant | M:N |
| `OeuvreTag` | Œuvre ↔ TagMotCle | M:N |
| `OeuvreUser` | Œuvre ↔ User (contributeurs) | M:N |
| `ParcoursLieu` | Parcours ↔ Lieu (étapes) | M:N |
| `ProgrammeIntervenant` | Programme ↔ Intervenant | M:N |
| `GenreCategorie` | Genre ↔ Catégorie | M:N |
| `TypeOeuvreGenre` | TypeOeuvre ↔ Genre | M:N |
| `UserCertification` | User ↔ Certification | M:N |
| `UserOrganisation` | User ↔ Organisation | M:N |
| `UserSpecialite` | User ↔ Specialite | M:N |

### 22.3 Hiérarchie géographique algérienne
```
Wilaya (58) → Daira → Commune → Localite
                                    ↓
                                   Lieu → DetailLieu
                                        → LieuMedia
                                        → Monument
                                        → Vestige
                                        → Service
```

---

## 23. Performance et optimisation

### 23.1 Frontend
| Technique | Implémentation |
|-----------|---------------|
| **Code splitting** | `React.lazy()` + `Suspense` pour toutes les pages et composants lourds |
| **Lazy loading images** | Composant `LazyImage` avec chargement progressif |
| **React Query cache** | `staleTime: 5min`, `gcTime: 10min`, `refetchOnWindowFocus: false` |
| **Debounce** | Hook `useDebouncedValue` pour les champs de recherche |
| **Memoization** | `React.memo`, `useMemo`, `useCallback` sur les composants coûteux |
| **Bundle splitting** | Chunks séparés : `react-vendor`, `ui-vendor`, `maps-vendor`, `i18n-vendor`, `data-vendor` |
| **SEO** | Composant `SEOHead` avec meta tags dynamiques et JSON-LD |

### 23.2 Backend
| Technique | Implémentation |
|-----------|---------------|
| **Cache middleware** | 4 stratégies : short (1min), medium (5min), long (30min), veryLong (1h) |
| **Rate limiting** | Limites par type : general, auth, creation, sensitive actions |
| **Pagination** | Côté serveur avec `limit` + `offset` |
| **Lazy loading services** | `ServiceContainer` avec instanciation à la demande |
| **Validation middleware** | Validation des entrées avant traitement |
| **Audit logging** | Journal des actions critiques pour la traçabilité |

### 23.3 Sécurité
| Mesure | Description |
|--------|-------------|
| JWT avec expiration | Tokens à durée de vie limitée |
| Rate limiting | Protection contre le brute-force |
| Input sanitization | Nettoyage des entrées utilisateur |
| CORS configuré | Origines autorisées uniquement |
| HTTPS redirect | Redirection automatique HTTP → HTTPS |
| Audit trail | Journalisation des actions sensibles |

---

> **Document généré le 2 mars 2026**
> **Plateforme Action Culture DZ — Tous droits réservés**
