# Plan des 14 TP — Application Android Taladz
> Parcours de stage (~3,5 mois) — du projet vide à une app lecteur d'ebooks niveau production.

---

## Vue d'ensemble

| # | Titre | Durée | Semaine |
|---|-------|-------|---------|
| 01 | Installation et premier projet | 8h | S1 |
| 02 | Structure modulaire et CI/CD | 10h | S2 |
| 03 | Thème, RTL, polices arabes | 8h | S3 |
| 04 | Navigation Compose | 8h | S4 |
| 05 | Injection de dépendances — Hilt | 10h | S5 |
| 06 | Couche réseau — Retrofit + OkHttp | 12h | S6 |
| 07 | Authentification complète | 12h | S7 |
| 08 | Catalogue d'ebooks | 10h | S8 |
| 09 | Détail d'un livre + cache Room | 12h | S9 |
| 10 | Bibliothèque utilisateur | 10h | S10 |
| 11 | Téléchargement offline — WorkManager | 12h | S11 |
| 12 | Lecteur EPUB — Readium | 14h | S12 |
| 13 | Annotations — surlignages et notes | 12h | S13 |
| 14 | Sécurité finale et audit | 10h | S14 |

**Total : ~148 heures de travail effectif**

---

## TP 01 — Installation et premier projet "Hello Taladz"
**Durée :** 8h sur 2 jours
**Niveau :** Débutant absolu

### Objectifs d'apprentissage
- [ ] Installer Android Studio et configurer l'émulateur
- [ ] Comprendre la structure d'un projet Android (Gradle, manifests, ressources)
- [ ] Créer un premier écran avec Jetpack Compose
- [ ] Configurer Git et faire son premier commit
- [ ] Lire les logs Logcat

### Livrable
Une app qui affiche l'écran de splash "Taladz" avec le logo, un titre en arabe et en français, et un bouton "Commencer" qui affiche un message dans Logcat.

### Dépendances
Aucune — premier TP.

---

## TP 02 — Structure modulaire et configuration CI/CD
**Durée :** 10h sur 2-3 jours
**Niveau :** Débutant

### Objectifs d'apprentissage
- [ ] Comprendre l'architecture multi-modules Android
- [ ] Créer les modules `core-common`, `core-ui` et `app`
- [ ] Configurer Gradle avec version catalogs (`libs.versions.toml`)
- [ ] Mettre en place GitHub Actions (build + lint à chaque push)
- [ ] Configurer ktlint et Detekt (qualité de code)

### Livrable
Projet multi-modules qui compile, avec CI verte sur GitHub et rapport Detekt sans erreur.

### Dépendances
TP 01 terminé.

---

## TP 03 — Thème, polices arabes et support RTL
**Durée :** 8h sur 2 jours
**Niveau :** Débutant

### Objectifs d'apprentissage
- [ ] Créer un thème Material 3 personnalisé (couleurs Taladz)
- [ ] Intégrer les polices arabes (Amiri, Cairo, Tajawal)
- [ ] Activer le support RTL dans le manifeste
- [ ] Construire un composant `AdaptiveText` qui change de police selon la langue
- [ ] Implémenter les 3 thèmes : clair, sombre, sépia

### Livrable
Écran d'accueil qui s'affiche correctement en arabe (RTL) et en français (LTR), avec switcher de thème fonctionnel.

### Dépendances
TP 02 terminé.

---

## TP 04 — Navigation Compose entre écrans
**Durée :** 8h sur 2 jours
**Niveau :** Débutant-Intermédiaire

### Objectifs d'apprentissage
- [ ] Comprendre le NavController et le NavGraph
- [ ] Créer les routes principales : Splash → Auth → Home → Détail
- [ ] Passer des arguments entre écrans (bookId, etc.)
- [ ] Gérer le bouton Retour et la back stack
- [ ] Implémenter la Bottom Navigation Bar

### Livrable
App navigable entre 4 écrans factices (Catalogue, Bibliothèque, Profil, Paramètres) avec Bottom Bar et transitions animées.

### Dépendances
TP 03 terminé.

---

## TP 05 — Injection de dépendances avec Hilt
**Durée :** 10h sur 2-3 jours
**Niveau :** Intermédiaire

### Objectifs d'apprentissage
- [ ] Comprendre le principe de l'injection de dépendances
- [ ] Configurer Hilt dans le projet multi-modules
- [ ] Créer ses premiers modules Hilt (`@Module`, `@Provides`, `@Singleton`)
- [ ] Injecter dans un ViewModel avec `@HiltViewModel`
- [ ] Écrire les premiers tests unitaires avec MockK

### Livrable
Un `ThemeViewModel` injecté dans l'écran principal via Hilt, avec test unitaire qui vérifie le changement de thème.

### Dépendances
TP 04 terminé.

---

## TP 06 — Couche réseau : Retrofit + OkHttp + Certificate Pinning
**Durée :** 12h sur 3 jours
**Niveau :** Intermédiaire

### Objectifs d'apprentissage
- [ ] Configurer Retrofit avec Kotlinx Serialization
- [ ] Construire un `NetworkModule` Hilt propre
- [ ] Implémenter le certificate pinning (sécurité TLS)
- [ ] Gérer les erreurs réseau (timeout, 4xx, 5xx) de façon uniforme
- [ ] Créer un `NetworkResult<T>` sealed class
- [ ] Appeler l'endpoint `GET /api/oeuvres` et afficher les résultats en log

### Livrable
Module `core-network` complet avec call réel vers l'API Taladz, gestion d'erreurs, et test d'intégration mocké avec MockWebServer.

### Dépendances
TP 05 terminé. Backend accessible (VPS ou local).

---

## TP 07 — Authentification complète
**Durée :** 12h sur 3 jours
**Niveau :** Intermédiaire

### Objectifs d'apprentissage
- [ ] Implémenter login + register avec les endpoints `POST /api/users/login` et `/register`
- [ ] Stocker les tokens JWT dans Android Keystore (EncryptedSharedPreferences)
- [ ] Implémenter le refresh token silencieux (OkHttp Authenticator)
- [ ] Gérer la déconnexion (révocation + nettoyage local)
- [ ] Créer l'écran Login et Register en Compose

### Livrable
Connexion réelle avec le backend Taladz, token chiffré en local, refresh automatique transparent, et redirection vers Home après login.

### Dépendances
TP 06 terminé.

---

## TP 08 — Catalogue d'ebooks
**Durée :** 10h sur 2-3 jours
**Niveau :** Intermédiaire

### Objectifs d'apprentissage
- [ ] Implémenter une liste paginée avec `LazyColumn` et Paging 3
- [ ] Appeler `GET /api/oeuvres` avec filtres (type, langue, recherche)
- [ ] Afficher les couvertures avec Coil (lazy loading + placeholder)
- [ ] Créer un composant `BookCard` réutilisable
- [ ] Implémenter la recherche avec debounce

### Livrable
Écran Catalogue avec liste réelle depuis l'API, barre de recherche fonctionnelle, et filtres par type/langue.

### Dépendances
TP 07 terminé (authentification).

---

## TP 09 — Détail d'un livre et cache local Room
**Durée :** 12h sur 3 jours
**Niveau :** Intermédiaire

### Objectifs d'apprentissage
- [ ] Configurer Room dans `core-database`
- [ ] Créer les entités `BookEntity`, `MediaEntity` et leurs DAOs
- [ ] Implémenter le pattern Repository (réseau → cache → UI)
- [ ] Stratégie offline-first : afficher cache pendant le chargement réseau
- [ ] Écran détail avec galerie d'images, synopsis, métadonnées

### Livrable
Écran détail qui s'affiche même sans connexion (depuis le cache Room), avec indicateur de fraîcheur des données.

### Dépendances
TP 08 terminé.

---

## TP 10 — Bibliothèque utilisateur
**Durée :** 10h sur 2-3 jours
**Niveau :** Intermédiaire

### Objectifs d'apprentissage
- [ ] Implémenter les favoris (`POST/DELETE /api/favoris`)
- [ ] Afficher la liste "Mes livres" depuis `GET /api/oeuvres/my/list`
- [ ] Synchroniser l'état favori entre catalogue et bibliothèque
- [ ] Implémenter les notifications in-app (`GET /api/notifications/list`)
- [ ] Badge de notifications non lues dans la Bottom Bar

### Livrable
Onglet Bibliothèque avec favoris synchronisés et badge de notification dynamique.

### Dépendances
TP 09 terminé.

---

## TP 11 — Téléchargement offline avec WorkManager
**Durée :** 12h sur 3 jours
**Niveau :** Avancé

### Objectifs d'apprentissage
- [ ] Comprendre WorkManager et les contraintes (WiFi, batterie)
- [ ] Implémenter un `DownloadWorker` avec reprise sur coupure réseau
- [ ] Chiffrer le fichier EPUB téléchargé (AES-256 via Keystore)
- [ ] Afficher la progression du téléchargement (notification système)
- [ ] Gérer les états : en attente / en cours / terminé / erreur

### Livrable
Bouton "Télécharger" sur l'écran détail qui lance un download en arrière-plan avec progression visible, reprise automatique et fichier chiffré en local.

### Dépendances
TP 10 terminé.

---

## TP 12 — Lecteur EPUB avec Readium
**Durée :** 14h sur 3-4 jours
**Niveau :** Avancé

### Objectifs d'apprentissage
- [ ] Intégrer le SDK Readium Kotlin Toolkit
- [ ] Ouvrir un fichier EPUB chiffré depuis le stockage local
- [ ] Implémenter la navigation (pages suivante/précédente, table des matières)
- [ ] Personnalisation lecture : police, taille, interligne, thème (clair/sombre/sépia)
- [ ] Sauvegarder et restaurer la position de lecture (CFI)

### Livrable
Lecteur fonctionnel qui ouvre un EPUB téléchargé, avec personnalisation de l'affichage et mémorisation de la position entre les sessions.

### Dépendances
TP 11 terminé.

---

## TP 13 — Annotations : surlignages, notes, signets
**Durée :** 12h sur 3 jours
**Niveau :** Avancé

### Objectifs d'apprentissage
- [ ] Implémenter la sélection de texte dans Readium
- [ ] Créer les entités Room `HighlightEntity`, `NoteEntity`, `BookmarkEntity`
- [ ] Afficher les surlignages dans le lecteur
- [ ] Panneau "Mes annotations" avec liste et navigation directe
- [ ] Exporter les annotations en texte (partage)

### Livrable
Lecteur avec surlignages colorés persistants, notes attachées et signets navigables, stockés localement en Room.

### Dépendances
TP 12 terminé.

---

## TP 14 — Sécurité finale et audit
**Durée :** 10h sur 2-3 jours
**Niveau :** Avancé

### Objectifs d'apprentissage
- [ ] Activer R8 avec règles ProGuard/obfuscation adaptées à Readium
- [ ] Intégrer RootBeer (détection root) et bloquer l'app si rootée
- [ ] Vérifier le certificate pinning en conditions réelles (proxy Burp)
- [ ] Audit de sécurité : fuites mémoire, données sensibles en clair, logs de prod
- [ ] Préparer le build de release signé (keystore de production)

### Livrable
APK release signé, obfusqué, avec root detection active et certificat pinnant — prêt pour la soumission sur le Play Store.

### Dépendances
TP 13 terminé.

---

## Structure de projet cible (construite progressivement)

```
taladz-android/
├── app/                        ← TP 01
├── build-logic/                ← TP 02
├── core/
│   ├── core-common/            ← TP 02
│   ├── core-ui/                ← TP 03
│   ├── core-network/           ← TP 06
│   ├── core-database/          ← TP 09
│   └── core-security/          ← TP 07 + TP 14
├── data/
│   ├── data-account/           ← TP 07
│   ├── data-catalog/           ← TP 08
│   ├── data-library/           ← TP 10
│   └── data-reader/            ← TP 11
├── domain/
│   ├── domain-account/         ← TP 07
│   ├── domain-catalog/         ← TP 08
│   ├── domain-library/         ← TP 10
│   └── domain-reader/          ← TP 12
└── feature/
    ├── feature-account/        ← TP 07
    ├── feature-catalog/        ← TP 08
    ├── feature-library/        ← TP 10
    ├── feature-reader/         ← TP 12-13
    └── feature-settings/       ← TP 03
```

---

*Phase 1 complète. En attente de validation pour générer les TP en détail (Phase 2, un par un).*
