# INVENTAIRE QA COMPLET — EventCulture

**Date :** 14 mars 2026
**QA Lead :** Audit systématique
**Périmètre :** Toutes les routes, pages et éléments interactifs

---

## ÉTAPE 1 — CARTOGRAPHIE DES ROUTES

### 1.1 Routes publiques (18)

| # | Route | Composant | Description |
|---|-------|-----------|-------------|
| 1 | `/` | Index | Page d'accueil |
| 2 | `/patrimoine` | Patrimoine | Liste des sites patrimoniaux |
| 3 | `/patrimoine/:id` | PatrimoineDetail | Détail d'un site |
| 4 | `/evenements` | Evenements | Liste des événements |
| 5 | `/evenements/:id` | EventDetailsPage | Détail d'un événement |
| 6 | `/oeuvres` | Oeuvres | Liste des œuvres |
| 7 | `/oeuvres/:id` | OeuvreDetailPage | Détail d'une œuvre |
| 8 | `/artisanat` | Artisanat | Liste artisanat |
| 9 | `/artisanat/:id` | ArtisanatDetail | Détail artisanat |
| 10 | `/a-propos` | APropos | Page À propos |
| 11 | `/auth` | Auth | Connexion / Inscription |
| 12 | `/forgot-password` | ForgotPassword | Mot de passe oublié |
| 13 | `/reset-password/:token` | ResetPassword | Réinitialisation MDP |
| 14 | `/articles/:id` | ArticleViewPage | Lecture d'un article |
| 15 | `/programme/:id` | ViewProgrammePage | Consultation programme |
| 16 | `/verification-email-envoyee` | VerificationEmailEnvoyee | Confirmation envoi email |
| 17 | `/verify-email/:token` | VerifyEmailPage | Vérification email |
| 18 | `/confirm-email-change/:token` | ConfirmEmailChange | Confirmation changement email |

### 1.2 Routes protégées — Utilisateur connecté (5)

| # | Route | Composant | Guard |
|---|-------|-----------|-------|
| 1 | `/dashboard` | DashboardRouter | ProtectedRoute → redirige selon rôle |
| 2 | `/dashboard-user` | DashboardUser | ProtectedRoute |
| 3 | `/notifications` | NotificationsPage | ProtectedRoute |
| 4 | `/notifications/preferences` | NotificationPreferences | ProtectedRoute |
| 5 | `/profile` | → Redirect `/dashboard-user` | ProtectedRoute |

### 1.3 Routes protégées — Professionnel (19)

| # | Route | Composant | Mode |
|---|-------|-----------|------|
| 1 | `/dashboard-pro` | DashboardPro | Dashboard |
| 2 | `/ajouter-oeuvre` | AjouterOeuvre | Création |
| 3 | `/modifier-oeuvre/:id` | AjouterOeuvre | Édition |
| 4 | `/editer-article/:id` | EditArticle | Édition |
| 5 | `/ajouter-evenement` | AjouterEvenement | Création |
| 6 | `/modifier-evenement/:id` | AjouterEvenement | Édition |
| 7 | `/ajouter-service` | AjouterService | Création |
| 8 | `/ajouter-mon-service` | AjouterServicePro | Création |
| 9 | `/modifier-service/:id` | AjouterServicePro | Édition |
| 10 | `/ajouter-patrimoine` | AjouterPatrimoinePro | Création |
| 11 | `/modifier-patrimoine/:id` | AjouterPatrimoinePro | Édition |
| 12 | `/ajouter-artisanat` | AjouterArtisanat | Création |
| 13 | `/modifier-artisanat/:id` | AjouterArtisanat | Édition |
| 14 | `/ajouter-organisation` | AjouterOrganisation | Création |
| 15 | `/programme/creer` | CreateProgrammePage | Création |
| 16 | `/programme/modifier/:id` | EditProgrammePage | Édition |
| 17 | `/gestion-artisanat` | GestionArtisanat | Gestion |
| 18 | `/mes-favoris` | → Redirect `/dashboard-user` | Compat. |

### 1.4 Routes protégées — Admin (4)

| # | Route | Composant |
|---|-------|-----------|
| 1 | `/admin/dashboard` | DashboardAdmin |
| 2 | `/admin/patrimoine/ajouter` | AjouterPatrimoine |
| 3 | `/admin/patrimoine/modifier/:id` | AjouterPatrimoine |
| 4 | `/admin/*` | Redirects → `/admin/dashboard?tab=...` |

### 1.5 Redirections SEO (PascalCase → lowercase) (7)

| Ancienne URL | Nouvelle URL |
|-------------|-------------|
| `/Patrimoine` | `/patrimoine` |
| `/Evenements` | `/evenements` |
| `/Oeuvres` | `/oeuvres` |
| `/Artisanat` | `/artisanat` |
| `/Auth` | `/auth` |
| `/Notifications` | `/notifications` |
| `/notifications/Preferences` | `/notifications/preferences` |

### 1.6 Route catch-all

| Route | Composant |
|-------|-----------|
| `*` | NotFound (404) |

**Total : 47 routes réelles + 7 redirections SEO + 1 catch-all = 55 entrées**

---

## ÉTAPE 2 — INVENTAIRE DES ÉLÉMENTS INTERACTIFS PAR PAGE

---

### 2.1 PAGES PUBLIQUES

---

#### 2.1.1 Index (Page d'accueil)
**Route :** `/`
**Auth :** Public

**Boutons :**
- Bouton CTA principal "Découvrir" → `/patrimoine`
- Bouton CTA secondaire "Événements" → `/evenements`
- Boutons de navigation rapide vers chaque section (Patrimoine, Événements, Œuvres, Artisanat)

**Liens :**
- Navigation header : Patrimoine, Événements, Œuvres, Artisanat, À propos
- Liens footer : mentions légales, contact, réseaux sociaux
- Liens "Voir tout" pour chaque section de contenu

**Listes :**
- Carousel/Grid des sites patrimoniaux mis en avant (cards cliquables)
- Carousel/Grid des événements à venir (cards cliquables)
- Carousel/Grid des œuvres récentes (cards cliquables)
- Grid artisanat mis en avant (cards cliquables)

**Autres :**
- Sélecteur de langue (FR/AR/EN/TZ-LTN/TZ-TFNG) dans le header
- Bouton connexion/inscription dans le header
- Menu hamburger (mobile)
- Divider avec motifs amazighs (Berber)
- Skeleton loaders pendant le chargement des données

---

#### 2.1.2 Patrimoine (Liste)
**Route :** `/patrimoine`
**Auth :** Public

**Boutons :**
- Boutons de filtre par type (Monument, Musée, Site archéologique, etc.)
- Bouton "Réinitialiser les filtres"
- Bouton pagination (Précédent / Suivant / numéros de page)

**Formulaires :**
- Barre de recherche textuelle (input + icône loupe)

**Selects/Dropdowns :**
- Filtre par wilaya (province)
- Filtre par type de patrimoine
- Filtre par période/époque
- Tri (Plus récent, Plus ancien, Alphabétique)

**Listes :**
- Grid de cards patrimoine (image, nom, type, wilaya, description tronquée)
- Chaque card est cliquable → `/patrimoine/:id`

**Autres :**
- Compteur de résultats
- Skeleton loaders
- État vide ("Aucun résultat")

---

#### 2.1.3 PatrimoineDetail
**Route :** `/patrimoine/:id`
**Auth :** Public

**Boutons :**
- Bouton retour (flèche ←)
- Bouton "Ajouter aux favoris" (cœur) — si connecté
- Boutons partage (Facebook, Twitter, copier le lien)
- Bouton "Signaler" — si connecté
- Navigation images (précédent/suivant dans la galerie)

**Liens :**
- Lien vers la visite virtuelle (si disponible)
- Liens vers les événements liés
- Liens vers les services à proximité
- Fil d'Ariane (Accueil > Patrimoine > Nom du site)

**Formulaires :**
- Formulaire d'ajout de commentaire (textarea + bouton Envoyer) — si connecté
- Formulaire de notation (étoiles 1-5) — si connecté

**Listes :**
- Galerie photos (carousel/lightbox)
- Liste des services disponibles (parking, wifi, accès PMR, etc.)
- Liste des commentaires (auteur, date, texte, note)
- Liste des événements liés au site

**Modales :**
- Lightbox galerie photos (navigation plein écran)
- Modale de confirmation signalement

**Cartes/Maps :**
- Carte Leaflet avec marqueur de localisation du site

**Autres :**
- Badges (type, période, classification UNESCO/national/régional)
- Skeleton loaders
- Informations pratiques (horaires, tarifs, adresse)

---

#### 2.1.4 Evenements (Liste)
**Route :** `/evenements`
**Auth :** Public

**Boutons :**
- Filtres par type d'événement (boutons toggle)
- Bouton "Réinitialiser"
- Boutons pagination

**Formulaires :**
- Barre de recherche textuelle

**Selects/Dropdowns :**
- Filtre par wilaya
- Filtre par type d'événement
- Filtre par date (Aujourd'hui, Cette semaine, Ce mois, Personnalisé)
- Tri (Date croissante/décroissante, Alphabétique)

**Date pickers :**
- Sélecteur de plage de dates (si filtre "Personnalisé")

**Listes :**
- Grid de cards événement (affiche, titre, date, lieu, type, prix/gratuit)
- Chaque card cliquable → `/evenements/:id`

**Autres :**
- Badge "Gratuit" sur les événements gratuits
- Badge "Virtuel" sur les événements en ligne
- Compteur de résultats
- Skeleton loaders

---

#### 2.1.5 EventDetailsPage
**Route :** `/evenements/:id`
**Auth :** Public (certaines actions nécessitent connexion)

**Boutons :**
- Bouton retour
- Bouton "S'inscrire" / "Se désinscrire" — si connecté
- Bouton "Ajouter aux favoris" (cœur) — si connecté
- Boutons partage (Facebook, Twitter, copier le lien)
- Bouton "Signaler" — si connecté
- Bouton "Modifier" — si propriétaire/admin
- Bouton "Supprimer" — si propriétaire/admin
- Bouton "Voir le programme" → section programme
- Navigation images galerie

**Liens :**
- Lien vers l'organisateur (organisation)
- Lien vers le lieu sur la carte
- Lien d'événement virtuel (URL externe)
- Fil d'Ariane
- Liens vers les programmes associés

**Formulaires :**
- Formulaire de commentaire (textarea + bouton Envoyer)
- Formulaire de notation (étoiles)

**Listes :**
- Galerie photos (carousel)
- Programme de l'événement (liste d'activités avec horaires)
- Liste des commentaires
- Liste des intervenants

**Modales :**
- Modale de confirmation inscription
- Modale de confirmation désinscription
- Modale de confirmation suppression
- Lightbox galerie

**Cartes/Maps :**
- Carte Leaflet avec localisation de l'événement

**Tabs/Onglets :**
- Détails | Programme | Commentaires (si structuré en onglets)

**Autres :**
- Compteur de places restantes
- Badge statut (À venir, En cours, Terminé)
- Badge prix/gratuit
- Informations organisateur

---

#### 2.1.6 Oeuvres (Liste)
**Route :** `/oeuvres`
**Auth :** Public

**Boutons :**
- Filtres par type/catégorie
- Bouton "Réinitialiser"
- Boutons pagination

**Formulaires :**
- Barre de recherche

**Selects/Dropdowns :**
- Filtre par type d'œuvre
- Filtre par période
- Filtre par technique
- Tri

**Listes :**
- Grid de cards œuvre (image, titre, type, auteur)
- Cards cliquables → `/oeuvres/:id`

**Autres :**
- Compteur de résultats
- Skeleton loaders

---

#### 2.1.7 OeuvreDetailPage
**Route :** `/oeuvres/:id`
**Auth :** Public (certaines actions nécessitent connexion)

**Boutons :**
- Bouton retour
- Bouton "Ajouter aux favoris" — si connecté
- Boutons partage
- Bouton "Signaler" — si connecté
- Bouton "Modifier" — si propriétaire
- Navigation galerie médias (images, vidéos, audio, documents)

**Liens :**
- Liens vers les articles associés
- Liens vers les œuvres liées
- Fil d'Ariane

**Formulaires :**
- Formulaire de commentaire
- Notation (étoiles)

**Listes :**
- Galerie médias (multi-type : images, vidéos, audio, PDF)
- Liste des commentaires
- Liste des intervenants/contributeurs
- Liste des tags/mots-clés
- Articles associés

**Modales :**
- Lightbox médias
- Player audio/vidéo intégré

**Autres :**
- Métadonnées détaillées (dimensions, matériaux, techniques, état de conservation)
- Badges (type, période, genre)
- Références académiques

---

#### 2.1.8 Artisanat (Liste)
**Route :** `/artisanat`
**Auth :** Public

**Boutons :**
- Filtres par matériau/technique
- Bouton "Réinitialiser"
- Boutons pagination

**Formulaires :**
- Barre de recherche

**Selects/Dropdowns :**
- Filtre par matériau
- Filtre par technique
- Tri (Prix croissant/décroissant, Plus récent)

**Listes :**
- Grid de cards artisanat (image, nom, prix, disponibilité)
- Cards cliquables → `/artisanat/:id`

**Autres :**
- Badge "Disponible sur commande"
- Fourchette de prix affichée
- Skeleton loaders

---

#### 2.1.9 ArtisanatDetail
**Route :** `/artisanat/:id`
**Auth :** Public (certaines actions nécessitent connexion)

**Boutons :**
- Bouton retour
- Bouton "Ajouter aux favoris" — si connecté
- Boutons partage
- Bouton "Contacter l'artisan" — si connecté
- Navigation galerie

**Formulaires :**
- Formulaire de commentaire
- Notation (étoiles)

**Listes :**
- Galerie photos
- Liste des commentaires
- Tags/mots-clés

**Autres :**
- Informations détaillées (matériau, technique, dimensions, prix min/max)
- Badge disponibilité
- Délai de fabrication
- Stock

---

#### 2.1.10 APropos
**Route :** `/a-propos`
**Auth :** Public

**Liens :**
- Liens vers les réseaux sociaux
- Liens vers les sections principales de l'application
- Liens de contact

**Autres :**
- Contenu statique traduit (i18n)
- Images/illustrations

---

#### 2.1.11 ArticleViewPage
**Route :** `/articles/:id`
**Auth :** Public

**Boutons :**
- Bouton retour
- Boutons partage
- Bouton "Modifier" — si auteur/admin

**Liens :**
- Lien vers l'auteur
- Lien vers l'œuvre associée
- Fil d'Ariane

**Autres :**
- Contenu riche (HTML rendu)
- Métadonnées (auteur, date, œuvre associée)

---

### 2.2 PAGES D'AUTHENTIFICATION

---

#### 2.2.1 Auth (Connexion / Inscription)
**Route :** `/auth`
**Auth :** Public (redirige si déjà connecté)

**Tabs/Onglets :**
- Onglet "Connexion"
- Onglet "Inscription"

**Formulaire Connexion :**
- Email (input email, requis)
- Mot de passe (input password, requis)
- Toggle visibilité mot de passe (icône œil)
- Bouton "Se connecter" (submit)
- Lien "Mot de passe oublié ?" → `/forgot-password`

**Formulaire Inscription :**
- Nom (input text, requis)
- Prénom (input text, requis)
- Email (input email, requis)
- Mot de passe (input password, requis, validation force)
- Confirmation mot de passe (input password, requis)
- Toggle visibilité mot de passe
- Select type de compte (Visiteur / Professionnel)
- Champs conditionnels si Professionnel :
  - Nom de l'organisation (input text)
  - Spécialité/domaine (select)
- Checkbox CGU (requis)
- Bouton "S'inscrire" (submit)

**Autres :**
- Indicateur de force du mot de passe (barre de progression)
- Messages d'erreur par champ (validation inline)
- Messages d'erreur globaux (toast)
- Loading spinner pendant la soumission

---

#### 2.2.2 ForgotPassword
**Route :** `/forgot-password`
**Auth :** Public

**Formulaire :**
- Email (input email, requis)
- Bouton "Envoyer le lien de réinitialisation" (submit)

**Liens :**
- Retour vers `/auth`

**Autres :**
- Message de confirmation après envoi
- Loading spinner

---

#### 2.2.3 ResetPassword
**Route :** `/reset-password/:token`
**Auth :** Public (avec token valide)

**Formulaire :**
- Nouveau mot de passe (input password, requis)
- Confirmation mot de passe (input password, requis)
- Toggle visibilité
- Bouton "Réinitialiser" (submit)

**Autres :**
- Indicateur de force du mot de passe
- Message si token invalide/expiré
- Redirection vers `/auth` après succès

---

#### 2.2.4 VerifyEmailPage
**Route :** `/verify-email/:token`
**Auth :** Public

**Boutons :**
- Bouton "Renvoyer l'email" (si échec)
- Bouton "Se connecter" → `/auth` (si succès)

**Autres :**
- Vérification automatique au chargement
- Indicateur de chargement
- Message succès/échec

---

#### 2.2.5 VerificationEmailEnvoyee
**Route :** `/verification-email-envoyee`
**Auth :** Public

**Boutons :**
- Bouton "Renvoyer l'email"
- Bouton "Se connecter" → `/auth`

**Autres :**
- Message informatif avec l'adresse email
- Compteur pour renvoi (anti-spam)

---

#### 2.2.6 ConfirmEmailChange
**Route :** `/confirm-email-change/:token`
**Auth :** Public (avec token valide)

**Boutons :**
- Bouton "Se connecter" → `/auth` (après confirmation)

**Autres :**
- Confirmation automatique au chargement
- Message succès/échec
- Indicateur de chargement

---

### 2.3 DASHBOARDS

---

#### 2.3.1 DashboardAdmin (7 onglets)
**Route :** `/admin/dashboard`
**Auth :** AdminRoute

**Tabs/Onglets :**
1. **Vue d'ensemble** (overview)
2. **Utilisateurs** (users)
3. **Événements** (events)
4. **Patrimoine** (patrimoine)
5. **Œuvres** (oeuvres)
6. **Artisanat** (artisanat)
7. **Services** (services)

**Onglet 1 — Vue d'ensemble :**
- Cards statistiques (total utilisateurs, événements, patrimoine, œuvres, artisanat)
- Graphiques (Chart.js/Recharts) : inscriptions par mois, événements par type
- Listes récentes : derniers utilisateurs, derniers événements
- Liens rapides vers chaque section

**Onglet 2 — Utilisateurs :**
- Barre de recherche utilisateurs
- Filtre par rôle (Visiteur / Professionnel / Admin)
- Filtre par statut (Actif / Inactif / En attente de validation)
- Tableau : nom, email, rôle, statut, date inscription, actions
- Bouton "Valider" (pour les professionnels en attente)
- Bouton "Suspendre" / "Réactiver"
- Bouton "Supprimer"
- Modale de confirmation pour actions destructives
- Pagination du tableau

**Onglet 3 — Événements :**
- Barre de recherche
- Filtre par statut (Brouillon / Publié / Terminé)
- Filtre par type
- Tableau : titre, organisateur, date, lieu, statut, actions
- Bouton "Voir" → détail
- Bouton "Modifier" → édition
- Bouton "Supprimer"
- Bouton "Publier" / "Dépublier"
- Modale de confirmation suppression
- Pagination

**Onglet 4 — Patrimoine :**
- Barre de recherche
- Filtre par type, wilaya, statut
- Tableau : nom, type, wilaya, statut, actions
- Bouton "Voir" / "Modifier" / "Supprimer"
- Bouton "Ajouter un site" → `/admin/patrimoine/ajouter`
- Modale de confirmation
- Pagination

**Onglet 5 — Œuvres :**
- Barre de recherche
- Filtres par type, statut
- Tableau : titre, auteur, type, statut, actions
- Boutons CRUD
- Modale confirmation
- Pagination

**Onglet 6 — Artisanat :**
- Barre de recherche
- Filtres par matériau, technique, statut
- Tableau avec actions (Voir / Modifier / Vérifier / Supprimer)
- Bouton "Vérifier" → `/gestion-artisanat?mode=verify`
- Modale confirmation
- Pagination

**Onglet 7 — Services :**
- Barre de recherche
- Filtres par type de service, statut
- Tableau avec actions CRUD
- Modale confirmation
- Pagination

---

#### 2.3.2 DashboardPro (5 onglets)
**Route :** `/dashboard-pro`
**Auth :** ProfessionalRoute

**Tabs/Onglets :**
1. **Vue d'ensemble**
2. **Mes événements**
3. **Mes œuvres**
4. **Mon artisanat**
5. **Mes services**

**Onglet 1 — Vue d'ensemble :**
- Cards statistiques personnelles (mes événements, œuvres, artisanat, services)
- Graphiques d'activité
- Notifications récentes
- Liens rapides de création

**Onglet 2 — Mes événements :**
- Liste de mes événements (cards ou tableau)
- Filtre par statut (Brouillon / Publié / Terminé)
- Bouton "Créer un événement" → `/ajouter-evenement`
- Bouton "Modifier" → `/modifier-evenement/:id`
- Bouton "Supprimer"
- Bouton "Gérer le programme" → `/programme/creer?eventId=...`
- Modale confirmation suppression
- Pagination

**Onglet 3 — Mes œuvres :**
- Liste de mes œuvres
- Filtre par statut
- Bouton "Ajouter une œuvre" → `/ajouter-oeuvre`
- Bouton "Modifier" → `/modifier-oeuvre/:id`
- Bouton "Supprimer"
- Bouton "Écrire un article" → `/editer-article/:id`
- Modale confirmation
- Pagination

**Onglet 4 — Mon artisanat :**
- Liste de mon artisanat
- Filtre par statut (En attente / Approuvé / Rejeté)
- Bouton "Ajouter" → `/ajouter-artisanat`
- Bouton "Modifier" → `/modifier-artisanat/:id`
- Bouton "Supprimer"
- Modale confirmation
- Pagination

**Onglet 5 — Mes services :**
- Liste de mes services
- Bouton "Ajouter un service" → `/ajouter-mon-service`
- Bouton "Modifier" → `/modifier-service/:id`
- Bouton "Supprimer"
- Modale confirmation
- Pagination

---

#### 2.3.3 DashboardUser (3 onglets)
**Route :** `/dashboard-user`
**Auth :** ProtectedRoute

**Tabs/Onglets :**
1. **Mon profil**
2. **Mes favoris**
3. **Mes inscriptions**

**Onglet 1 — Mon profil :**
- Photo de profil avec bouton upload/modifier
- Formulaire de modification profil :
  - Nom (input text)
  - Prénom (input text)
  - Email (input email) — déclenche vérification
  - Biographie (textarea)
  - Téléphone (input tel)
- Bouton "Sauvegarder les modifications"
- Bouton "Changer le mot de passe" (ouvre section dédiée)
- Section changement de mot de passe :
  - Ancien mot de passe (input password)
  - Nouveau mot de passe (input password)
  - Confirmation (input password)
  - Bouton "Changer"
- Bouton "Exporter mes données" (RGPD Art.20)
- Bouton "Supprimer mon compte" (RGPD Art.17)
- Modale de confirmation suppression de compte

**Onglet 2 — Mes favoris :**
- Filtres par type (Patrimoine / Événements / Œuvres / Artisanat)
- Grid de cards favoris (cliquables → détail)
- Bouton "Retirer des favoris" (cœur/X) sur chaque card
- État vide si aucun favori
- Pagination

**Onglet 3 — Mes inscriptions :**
- Liste des événements auxquels l'utilisateur est inscrit
- Filtre par statut (À venir / Terminé)
- Cards avec date, lieu, statut
- Bouton "Se désinscrire"
- Bouton "Voir l'événement" → `/evenements/:id`
- Pagination

---

### 2.4 PAGES DE CRÉATION / ÉDITION

---

#### 2.4.1 AjouterOeuvre
**Route :** `/ajouter-oeuvre` (création) | `/modifier-oeuvre/:id` (édition)
**Auth :** ProfessionalRoute

**Boutons :**
- Bouton retour (←) → dashboard
- "Sauvegarder comme brouillon"
- "Publier l'œuvre"
- "Choisir des fichiers" (upload médias)
- Bouton supprimer (X) par média
- Bouton définir comme image principale (étoile) par média

**Formulaires :**
- Nom (multilingue : FR, AR, EN, TZ-LTN, TZ-TFNG)
- Description (multilingue, textarea)
- Auteur (textarea)
- Année/Date
- Dimensions (hauteur, largeur, profondeur)
- Matériaux (textarea)
- Techniques (textarea)
- État de conservation
- Droits/Permissions (textarea)
- Liens connexes (textarea)
- Références académiques (textarea)
- Mots-clés/Tags (input)

**Selects/Dropdowns :**
- Type d'œuvre
- Période/Époque
- Matériaux
- Techniques
- État de conservation
- Genre

**Uploads :**
- Zone upload médias (drag & drop) — images, vidéos, audio, PDF, DOCX
- Upload multiple avec barre de progression
- Grille de prévisualisation avec miniatures

**Toggles/Checkboxes :**
- Œuvre mise en avant (checkbox)
- Publique/Publiée (checkbox)

**Listes :**
- Grille des médias uploadés
- Liste des tags avec boutons suppression
- Liste des intervenants/éditeurs (IntervenantEditeurManager)

**Autres :**
- Éditeur d'article riche (ArticleEditor)
- Indicateur de progression upload
- Messages succès/erreur
- Loading spinner

---

#### 2.4.2 AjouterEvenement
**Route :** `/ajouter-evenement` (création) | `/modifier-evenement/:id` (édition)
**Auth :** ProfessionalRoute

**Boutons :**
- Bouton retour → dashboard
- "Sauvegarder comme brouillon"
- "Publier l'événement"
- "Changer l'image" (affiche)
- Supprimer image sélectionnée (X)
- "Changer de lieu"
- "Créer une organisation" (dans alerte)
- "Créer un événement virtuel" (dans alerte)

**Formulaires :**
- Nom de l'événement (multilingue)
- Description (multilingue)
- URL événement virtuel (input url)
- Site web organisation (input url)
- Nombre max participants (input number)
- Tarif (input number)

**Selects/Dropdowns :**
- Type d'événement (depuis API)
- Wilaya (conditionnel : présentiel)
- Organisation (conditionnel : présentiel)
- Statut (publié/brouillon)

**Radio Buttons / Cards :**
- Format : "En présentiel" vs "Virtuel / En ligne" (cards cliquables)

**Checkboxes :**
- "Gratuit" — masque/affiche le champ tarif

**Date pickers :**
- Date de début
- Date de fin
- Heure de début
- Heure de fin

**Cartes/Maps :**
- LieuSelector (Leaflet lazy-loaded) — sélection de lieu

**Uploads :**
- Upload affiche (image unique)
- Upload médias post-événement (multiple)

**Autres :**
- Loading organisation
- Alertes organisation manquante
- Toast erreur/succès
- MultiLangInput pour les champs multilingues

---

#### 2.4.3 AjouterService
**Route :** `/ajouter-service`
**Auth :** ProfessionalRoute

**Tabs/Onglets :**
- Tab 1 : "Sélectionner un lieu"
- Tab 2 : "Ajouter des services" (désactivé tant que lieu non sélectionné)

**Boutons :**
- Bouton retour
- Boutons navigation tabs
- "Changer de lieu"
- "Ajouter à la liste" (services personnalisés)
- "Ajouter les services" (submit)

**Formulaires :**
- Recherche de lieu (input text)
- Nom du service personnalisé (multilingue)
- Description du service personnalisé (multilingue, optionnel)

**Selects/Dropdowns :**
- Filtre par type de patrimoine

**Checkboxes :**
- Services prédéfinis (12) : Parking, Toilettes, Restaurant, Café, Boutique, Guide, Audioguide, WiFi, Accès PMR, Vestiaire, Aire de pique-nique, Aire de jeux
- Disponibilité du service personnalisé
- Services déjà ajoutés (désactivés)

**Listes :**
- Grid de cards sites patrimoniaux (sélectionnables)
- Liste des services existants (lecture seule, badges disponibilité)
- Liste des services personnalisés à ajouter (avec bouton suppression)

**Autres :**
- Cards de sélection de lieu avec icônes et badges
- Loading spinners
- États vides
- Badges compteur

---

#### 2.4.4 AjouterServicePro
**Route :** `/ajouter-mon-service` (création) | `/modifier-service/:id` (édition)
**Auth :** ProfessionalRoute

**Boutons :**
- Bouton retour
- "Soumettre mon service" (submit)
- "Annuler"
- Bouton upload photo (icône caméra)
- Supprimer photo (X)

**Formulaires :**
- Type de service (7 cards icône+label cliquables : restaurant, hôtel, guide, transport, artisanat, location, autre)
- Nom du service (multilingue)
- Description (multilingue, optionnel)
- Adresse (multilingue, optionnel)
- Latitude (input number)
- Longitude (input number)
- Téléphone (input tel)
- Email (input email)
- Site web (input url)
- Horaires (multilingue, optionnel)
- Prix min (input number)
- Prix max (input number)

**Radio Buttons :**
- "Lieu existant" vs "Ajouter un nouveau lieu"

**Selects/Dropdowns :**
- Wilaya (si nouveau lieu)
- Commune (si nouveau lieu)

**Uploads :**
- Upload photo unique (JPG, PNG, max 5MB) avec prévisualisation

**Recherche lieu :**
- Input recherche avec autocomplete dropdown
- Affichage lieu sélectionné avec icône MapPin

**Formulaire imbriqué (nouveau lieu) :**
- Nom du lieu (multilingue)
- Adresse du lieu (multilingue)
- Latitude / Longitude
- Wilaya / Commune

**Autres :**
- Loading recherche lieu
- Alerte processus de validation
- Toast erreur/succès
- Vérification auth avec redirection login

---

#### 2.4.5 AjouterPatrimoinePro
**Route :** `/ajouter-patrimoine` (création) | `/modifier-patrimoine/:id` (édition)
**Auth :** ProfessionalRoute

**Boutons :**
- Bouton retour
- Bouton Créer/Mettre à jour (submit)

**Formulaires :**
- Nom du site (multilingue)
- Description (multilingue)
- Adresse (optionnel)
- URL visite virtuelle (optionnel)

**Selects/Dropdowns :**
- Type de patrimoine (Monument, Vestige archéologique, Musée, Site naturel, Ville/Village historique, Autre)
- Période/Époque (Préhistoire, Antiquité, Moyen Âge, Époque moderne, Contemporain)
- Wilaya
- Statut (Ouvert au public, Fermé, En restauration, Abandonné)
- Classification (UNESCO, National, Régional, Local)

**Date pickers :**
- Date de classification (conditionnel : si classification sélectionnée)

**Cartes/Maps :**
- LieuSelector (Leaflet lazy-loaded) — sélection/création de lieu

**Uploads :**
- Upload multiple médias (images) avec drag & drop
- Grille de prévisualisation avec miniatures
- Bouton suppression par média

**Autres :**
- Loading métadonnées
- Messages erreur/succès
- Affichage lat/lng confirmé

---

#### 2.4.6 AjouterArtisanat
**Route :** `/ajouter-artisanat` (création) | `/modifier-artisanat/:id` (édition)
**Auth :** ProfessionalRoute

**Boutons :**
- Bouton retour
- "Ajouter à la liste" (tags)
- "Créer l'artisanat" (submit)

**Formulaires :**
- Nom (multilingue)
- Description (multilingue)
- Prix min (input number)
- Prix max (input number)
- Délai de fabrication (input number, jours)
- Stock (input number)
- Input tag (avec Enter)

**Selects/Dropdowns :**
- Matériau (depuis métadonnées API)
- Technique (depuis métadonnées API)

**Checkboxes :**
- "Disponible sur commande"

**Tags :**
- Input avec déclenchement Enter
- Badges tags avec bouton suppression (X)
- Bouton ajouter (icône +)

**Uploads :**
- Upload multiple médias (images) avec drag & drop
- Grille prévisualisation (2 colonnes) avec bouton suppression

**Autres :**
- Loading métadonnées
- Alertes erreur
- Loading spinner soumission

---

#### 2.4.7 AjouterOrganisation
**Route :** `/ajouter-organisation`
**Auth :** ProfessionalRoute

**Boutons :**
- Bouton retour → page création événement
- "Annuler"
- "Créer l'organisation" (submit)

**Formulaires :**
- Nom de l'organisation (multilingue)
- Description (multilingue, optionnel)
- Site web (input url, optionnel)

**Selects/Dropdowns :**
- Type d'organisation (depuis API)

**Autres :**
- Loading
- Toast erreur/succès

---

#### 2.4.8 EditArticle
**Route :** `/editer-article/:id`
**Auth :** ProfessionalRoute

**Boutons :**
- Bouton retour
- "Sauvegarder" (submit)
- "Publier" / "Dépublier"

**Formulaires :**
- Titre de l'article (multilingue)
- Contenu riche (éditeur WYSIWYG)

**Autres :**
- Éditeur riche intégré
- Prévisualisation
- Loading
- Toast erreur/succès

---

#### 2.4.9 CreateProgrammePage
**Route :** `/programme/creer?eventId={id}`
**Auth :** ProfessionalRoute

**Boutons :**
- Bouton retour → événement
- Submit (dans ProgrammeForm)
- Annuler (dans ProgrammeForm)
- Ajouter un intervenant

**Formulaires (ProgrammeForm) :**
- Titre (multilingue)
- Description (multilingue)
- Lieu spécifique (optionnel)
- Max participants (input number)
- Équipement requis
- Notes (textarea)
- Ordre (input number)

**Selects/Dropdowns :**
- Type d'activité
- Lieu (select)
- Niveau requis
- Langue principale

**Date pickers :**
- Date
- Heure début
- Heure fin

**Checkboxes :**
- Traduction disponible
- Enregistrement autorisé
- Diffusion en direct
- Support numérique

**Gestion intervenants (sous-formulaire répétable) :**
- Select intervenant
- Select rôle
- Sujet d'intervention (input text)
- Biographie courte (textarea)
- Ordre d'intervention (input number)
- Durée (input number)
- Honoraires (input number)
- Frais de déplacement (input number)
- Bouton supprimer intervenant

**Autres :**
- Cards info
- Loading
- Messages erreur/succès

---

#### 2.4.10 EditProgrammePage
**Route :** `/programme/modifier/:id`
**Auth :** ProfessionalRoute

Identique à CreateProgrammePage mais :
- Données pré-remplies
- Bouton "Mettre à jour" au lieu de "Créer"
- Peut modifier les intervenants existants

---

#### 2.4.11 ViewProgrammePage
**Route :** `/programme/:id`
**Auth :** Public

**Boutons :**
- Bouton retour → événement
- "Éditer" — si autorisé
- "Supprimer" — si autorisé
- Actions rapides en bas : Éditer / Ajouter un autre programme / Retour événement

**Formulaire :**
- ProgrammeForm en mode lecture seule (tous les champs désactivés)

**Modales :**
- Modale de confirmation suppression

**Autres :**
- Cards métadonnées (date, heure, lieu, nombre intervenants)
- Affichage statut

---

#### 2.4.12 GestionArtisanat
**Route :** `/gestion-artisanat`
**Auth :** ProfessionalRoute
**Modes :** Création | Modification | Consultation | Vérification (admin)

**Boutons :**
- Bouton retour
- "Créer l'artisanat" (mode création)
- "Mettre à jour" (mode modification)
- "Vérifier et sauvegarder" (mode vérification admin)
- Bouton upload photo
- Supprimer photo (X)
- Supprimer tag (X)
- Ajouter tag (+)

**Badge mode :**
- Badge dynamique : Création / Modification / Consultation / Vérification

**Formulaires :**
- Nom (multilingue, désactivé en consultation)
- Description (multilingue, désactivé en consultation)
- Prix min/max (désactivés en consultation)
- Délai fabrication (désactivé en consultation)
- Stock (désactivé en consultation)
- Input tag (désactivé en consultation)

**Selects/Dropdowns :**
- Matériau (désactivé en consultation)
- Technique (désactivé en consultation)
- Statut admin (En attente / Approuvé / Rejeté) — mode vérification uniquement

**Checkboxes :**
- "Disponible sur commande" (désactivé en consultation)

**Section vérification admin (mode vérification) :**
- Select statut
- Textarea raison de rejet (conditionnel : si statut = rejeté)

**Uploads :**
- Upload multiple médias (désactivé en consultation)
- Grille prévisualisation avec suppression (désactivé en consultation)

**Autres :**
- Opacité réduite en mode consultation
- Contrôle d'accès par rôle et propriété
- Loading spinner
- Alertes erreur/succès

---

#### 2.4.13 AjouterPatrimoine (Admin)
**Route :** `/admin/patrimoine/ajouter` (création) | `/admin/patrimoine/modifier/:id` (édition)
**Auth :** AdminRoute

Similaire à AjouterPatrimoinePro avec potentiellement des champs supplémentaires d'administration (statut de publication, validation directe).

---

### 2.5 NOTIFICATIONS & PRÉFÉRENCES

---

#### 2.5.1 NotificationsPage
**Route :** `/notifications`
**Auth :** ProtectedRoute

**Boutons :**
- "Tout marquer comme lu"
- Bouton supprimer par notification (X ou icône poubelle)
- Bouton "Préférences" → `/notifications/preferences`
- Boutons pagination

**Filtres :**
- Filtre par type (Toutes / Non lues / Événements / Commentaires / Système)
- Filtre par statut (Lues / Non lues)

**Listes :**
- Liste des notifications (icône, titre, message, date, statut lu/non lu)
- Chaque notification cliquable → page concernée

**Autres :**
- Badge compteur non lues
- État vide
- Marquage lu au clic
- Loading skeleton

---

#### 2.5.2 NotificationPreferences
**Route :** `/notifications/preferences`
**Auth :** ProtectedRoute

**Boutons :**
- Bouton retour → `/notifications`
- "Sauvegarder les préférences" (submit)

**Toggles/Switches :**
- Activer/désactiver par type de notification :
  - Nouveaux événements
  - Commentaires sur mes contenus
  - Réponses à mes commentaires
  - Inscriptions à mes événements
  - Mises à jour système
  - Rappels d'événements
- Notifications email (on/off)
- Notifications push navigateur (on/off)

**Autres :**
- Loading
- Toast succès/erreur

---

### 2.6 PAGE 404

---

#### 2.6.1 NotFound
**Route :** `*` (catch-all)
**Auth :** Public

**Boutons :**
- "Retour à l'accueil" → `/`

**Liens :**
- Liens vers les sections principales (Patrimoine, Événements, etc.)

**Autres :**
- Illustration 404
- Message traduit (i18n)

---

### 2.7 COMPOSANTS PARTAGÉS (LAYOUT)

---

#### 2.7.1 Header / Navbar
**Présent sur :** Toutes les pages

**Boutons :**
- Logo (lien → `/`)
- Menu hamburger (mobile)
- Bouton connexion → `/auth` (si non connecté)
- Bouton profil/avatar (si connecté) → dropdown
- Bouton notifications (cloche avec badge compteur) → `/notifications`

**Liens navigation :**
- Patrimoine → `/patrimoine`
- Événements → `/evenements`
- Œuvres → `/oeuvres`
- Artisanat → `/artisanat`
- À propos → `/a-propos`

**Dropdowns :**
- Sélecteur de langue (FR / AR / EN / TZ-LTN / TZ-TFNG)
- Menu utilisateur (si connecté) : Mon Dashboard, Mon Profil, Mes Favoris, Préférences, Déconnexion

**Autres :**
- Badge notification non lues (compteur)
- Indicateur de langue active
- Navigation responsive (desktop : horizontal, mobile : drawer)

---

#### 2.7.2 Footer
**Présent sur :** Toutes les pages

**Liens :**
- Sections principales (Patrimoine, Événements, Œuvres, Artisanat)
- À propos
- Contact
- Mentions légales
- Politique de confidentialité
- Réseaux sociaux (icônes)

---

#### 2.7.3 OfflineBanner
**Présent sur :** Toutes les pages (conditionnel)

- Bannière fixe en haut : "Connexion réseau perdue" (affiché automatiquement si hors ligne)

---

#### 2.7.4 Toaster
**Présent sur :** Toutes les pages

- Notifications toast (succès, erreur, info, warning)
- Auto-dismiss après timeout
- Bouton fermer (X)

---

## RÉSUMÉ STATISTIQUE

| Métrique | Nombre |
|----------|--------|
| **Routes réelles** | 47 |
| **Redirections SEO** | 7 |
| **Pages distinctes** | 33 |
| **Onglets dashboard** | 15 (Admin 7 + Pro 5 + User 3) |
| **Formulaires** | ~35 |
| **Champs de formulaire** | ~200+ |
| **Boutons d'action** | ~120+ |
| **Selects/Dropdowns** | ~40+ |
| **Zones d'upload** | 10 |
| **Composants carte (Leaflet)** | 4 |
| **Date pickers** | 6 |
| **Modales** | ~15 |
| **Tabs/Onglets** | 18 |
| **Toggles/Switches** | ~12 |
| **Systèmes de tags** | 3 |
| **Barres de recherche** | ~10 |
| **Systèmes de pagination** | ~12 |
| **Systèmes de filtres** | ~10 |

---

*Inventaire généré le 14 mars 2026*
*Basé sur l'analyse exhaustive de : 33 pages, 47 routes, 15 onglets dashboard, ~200 champs de formulaire, tous les composants partagés*
