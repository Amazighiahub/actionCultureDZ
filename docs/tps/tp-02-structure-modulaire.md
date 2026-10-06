# TP N°02 : Structure modulaire et configuration CI/CD

**Durée estimée** : 10 heures réparties sur 2-3 jours
**Niveau** : Débutant
**Prérequis** : TP 01 terminé et pushé sur GitHub

---

## 🎯 1. Objectifs de ce TP

À la fin de ce TP, tu sauras :
- [ ] Comprendre pourquoi les grandes apps sont découpées en modules
- [ ] Créer des modules Gradle (`core-common`, `core-ui`)
- [ ] Configurer un **Version Catalog** (`libs.versions.toml`) — source unique de vérité pour toutes les versions
- [ ] Mettre en place **GitHub Actions** (CI qui build et lint à chaque push)
- [ ] Configurer **ktlint** et **Detekt** pour la qualité de code

---

## 📚 2. Contexte

Une app professionnelle comme Kindle n'est pas un seul bloc de code. Elle est découpée en **modules indépendants** : le module réseau ne connaît pas le module UI, le module lecteur ne connaît pas le module catalogue. Chaque module se compile séparément, ce qui rend les builds plus rapides et le code plus maintenable.

Dans ce TP on pose la structure qui nous accompagnera jusqu'au TP 14. On ne code pas encore de fonctionnalités — on construit le **squelette de l'architecture**.

---

## 🔧 3. Concepts à comprendre AVANT de coder

### Qu'est-ce qu'un module Gradle ?
Un module est un **sous-projet indépendant** avec son propre `build.gradle.kts` et son propre code. L'app principale (`app`) dépend des modules, mais les modules ne se connaissent pas entre eux (sauf si tu le décides explicitement).

**Analogie :** Imagine une voiture. Le moteur, la carrosserie, l'électronique — ce sont des modules. Le moteur ne sait pas ce que fait la radio. On peut changer la radio sans toucher au moteur.

### Qu'est-ce qu'un Version Catalog ?
C'est un fichier **`libs.versions.toml`** qui centralise TOUTES les versions de bibliothèques au même endroit. Au lieu d'écrire `"com.squareup.retrofit2:retrofit:2.11.0"` dans 5 modules différents, tu l'écris une fois dans le catalog et tu utilises `libs.retrofit` partout.

### Qu'est-ce que GitHub Actions ?
C'est un système d'**automatisation** intégré à GitHub. À chaque fois que tu pushs du code, GitHub lance automatiquement des scripts (appelés "workflows") pour compiler, tester et vérifier ton code. Si quelque chose casse, tu reçois une notification avant que le problème arrive sur le téléphone du stagiaire suivant.

### Qu'est-ce que ktlint / Detekt ?
- **ktlint** : vérifie que ton code est **formaté** selon les conventions Kotlin (indentation, espaces, etc.)
- **Detekt** : analyse ton code pour détecter des **problèmes de qualité** (fonctions trop longues, variables inutilisées, code trop complexe)

---

## 📖 4. Ressources à consulter (30 min max)

- [Guide officiel Version Catalogs](https://developer.android.com/build/migrate-to-catalogs) : section "Create the catalog file" uniquement
- [GitHub Actions pour Android](https://github.com/actions/setup-java) : lis le README en diagonale
- Pas de vidéo nécessaire — tout est guidé ci-dessous

---

## 🔌 5. Endpoints backend utilisés dans ce TP

**Aucun** — ce TP est 100% architecture, pas de réseau.

---

## ⚠️ Versions utilisées dans ce TP — Tableau de compatibilité

> **IMPORTANT :** Les versions ci-dessous ont été vérifiées pour leur compatibilité mutuelle.
> Avant de commencer, vérifie les dernières versions stables sur :
> - [Kotlin Releases](https://kotlinlang.org/docs/releases.html)
> - [AGP Release Notes](https://developer.android.com/build/releases/gradle-plugin)
> - [Compose BOM Mapping](https://developer.android.com/jetpack/compose/bom/bom-mapping)

| Composant | Version | Notes compatibilité |
|-----------|---------|-------------------|
| **Kotlin** | 2.1.0 | Minimum requis par Compose Compiler plugin 2.x |
| **AGP** (Android Gradle Plugin) | 8.7.3 | Requiert Gradle ≥ 8.9 |
| **Gradle Wrapper** | 8.11.1 | Requis par AGP 8.7.x |
| **KSP** | 2.1.0-1.0.29 | Doit correspondre EXACTEMENT à la version Kotlin |
| **Compose BOM** | 2025.01.00 | Gère toutes les versions Compose automatiquement |
| **Hilt** | 2.53.1 | Requiert Kotlin ≥ 2.0, KSP |
| **Room** | 2.7.0 | Requiert KSP (plus KAPT) |
| **Navigation Compose** | 2.8.5 | Inclus dans le BOM |
| **Coroutines** | 1.9.0 | Compatible Kotlin 2.1 |
| **Kotlinx Serialization** | 1.7.3 | Compatible Kotlin 2.1 |
| **Retrofit** | 2.11.0 | Stable |
| **OkHttp** | 4.12.0 | Stable |
| **Coil** | 3.0.4 | Requiert min SDK 21+ |
| **Paging 3** | 3.3.4 | Compatible Compose BOM 2025.01 |
| **WorkManager** | 2.10.0 | Stable |
| **DataStore** | 1.1.1 | Stable |
| **Detekt** | 1.23.7 | Dernière stable |
| **ktlint (plugin)** | 12.1.2 | Via plugin Gradle |

**Règle d'or KSP :** La version KSP doit toujours commencer par la même version Kotlin.
Kotlin `2.1.0` → KSP `2.1.0-X.Y.Z` (jamais `2.0.x-...`)

---

## 📝 6. Étapes détaillées

---

### Étape 1 : Mettre à jour le Gradle Wrapper

**Objectif :** s'assurer que le projet utilise une version Gradle compatible.

**Action 1.1** : Ouvre le terminal dans Android Studio (`Alt+F12`)

**Action 1.2** : Met à jour le wrapper :
```bash
./gradlew wrapper --gradle-version=8.11.1 --distribution-type=bin
```

**Action 1.3** : Vérifie le fichier `gradle/wrapper/gradle-wrapper.properties` :
```properties
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.11.1-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
```

**✅ Vérification :** Lance `./gradlew --version` → tu dois voir `Gradle 8.11.1`.

---

### Étape 2 : Créer le Version Catalog

**Objectif :** centraliser toutes les versions en un seul fichier.

**Action 2.1** : Crée le fichier `gradle/libs.versions.toml` (s'il n'existe pas déjà) :

```toml
[versions]
# ── Kotlin & Build Tools ──────────────────────────────────────────────────────
kotlin                  = "2.1.0"
agp                     = "8.7.3"
# KSP : DOIT correspondre exactement à la version Kotlin (2.1.0 → 2.1.0-x)
ksp                     = "2.1.0-1.0.29"

# ── Compose ───────────────────────────────────────────────────────────────────
# Le BOM gère les versions de tous les composants Compose automatiquement
compose-bom             = "2025.01.00"

# ── AndroidX Core ─────────────────────────────────────────────────────────────
core-ktx                = "1.15.0"
lifecycle               = "2.8.7"
activity-compose        = "1.9.3"

# ── Navigation ────────────────────────────────────────────────────────────────
navigation              = "2.8.5"

# ── DI ────────────────────────────────────────────────────────────────────────
hilt                    = "2.53.1"
hilt-navigation-compose = "1.2.0"

# ── Réseau ────────────────────────────────────────────────────────────────────
retrofit                = "2.11.0"
okhttp                  = "4.12.0"
kotlinx-serialization   = "1.7.3"

# ── Base de données ───────────────────────────────────────────────────────────
room                    = "2.7.0"

# ── Async ─────────────────────────────────────────────────────────────────────
coroutines              = "1.9.0"

# ── Stockage préférences ──────────────────────────────────────────────────────
datastore               = "1.1.1"

# ── Images ────────────────────────────────────────────────────────────────────
coil                    = "3.0.4"

# ── Pagination ────────────────────────────────────────────────────────────────
paging                  = "3.3.4"

# ── Téléchargements ───────────────────────────────────────────────────────────
work-manager            = "2.10.0"

# ── Sécurité ─────────────────────────────────────────────────────────────────
security-crypto         = "1.1.0-alpha06"

# ── Tests ─────────────────────────────────────────────────────────────────────
junit                   = "4.13.2"
junit5                  = "5.11.3"
junit5-android          = "1.5.0"      # android-junit5 plugin
mockk                   = "1.13.13"
turbine                 = "1.2.0"
coroutines-test         = "1.9.0"
compose-ui-test         = "1.7.6"
test-ext-junit          = "1.2.1"
espresso                = "3.6.1"

# ── Qualité de code ───────────────────────────────────────────────────────────
detekt                  = "1.23.7"
ktlint-gradle           = "12.1.2"

[libraries]
# ── AndroidX ──────────────────────────────────────────────────────────────────
androidx-core-ktx           = { group = "androidx.core",     name = "core-ktx",            version.ref = "core-ktx" }
androidx-lifecycle-runtime  = { group = "androidx.lifecycle", name = "lifecycle-runtime-ktx", version.ref = "lifecycle" }
androidx-lifecycle-viewmodel= { group = "androidx.lifecycle", name = "lifecycle-viewmodel-ktx", version.ref = "lifecycle" }
androidx-activity-compose   = { group = "androidx.activity", name = "activity-compose",    version.ref = "activity-compose" }

# ── Compose BOM (importer en platform) ────────────────────────────────────────
compose-bom             = { group = "androidx.compose",      name = "compose-bom",         version.ref = "compose-bom" }
compose-ui              = { group = "androidx.compose.ui",   name = "ui" }
compose-ui-graphics     = { group = "androidx.compose.ui",   name = "ui-graphics" }
compose-ui-tooling      = { group = "androidx.compose.ui",   name = "ui-tooling" }
compose-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
compose-material3       = { group = "androidx.compose.material3", name = "material3" }
compose-material-icons  = { group = "androidx.compose.material", name = "material-icons-extended" }

# ── Navigation ────────────────────────────────────────────────────────────────
navigation-compose      = { group = "androidx.navigation",   name = "navigation-compose",  version.ref = "navigation" }

# ── Hilt ──────────────────────────────────────────────────────────────────────
hilt-android            = { group = "com.google.dagger",     name = "hilt-android",        version.ref = "hilt" }
hilt-compiler           = { group = "com.google.dagger",     name = "hilt-android-compiler", version.ref = "hilt" }
hilt-navigation-compose = { group = "androidx.hilt",         name = "hilt-navigation-compose", version.ref = "hilt-navigation-compose" }

# ── Réseau ────────────────────────────────────────────────────────────────────
retrofit                = { group = "com.squareup.retrofit2", name = "retrofit",            version.ref = "retrofit" }
retrofit-kotlinx-serialization = { group = "com.jakewharton.retrofit", name = "retrofit2-kotlinx-serialization-converter", version = "1.0.0" }
okhttp                  = { group = "com.squareup.okhttp3",  name = "okhttp",              version.ref = "okhttp" }
okhttp-logging          = { group = "com.squareup.okhttp3",  name = "logging-interceptor", version.ref = "okhttp" }
kotlinx-serialization-json = { group = "org.jetbrains.kotlinx", name = "kotlinx-serialization-json", version.ref = "kotlinx-serialization" }

# ── Room ──────────────────────────────────────────────────────────────────────
room-runtime            = { group = "androidx.room",         name = "room-runtime",        version.ref = "room" }
room-ktx                = { group = "androidx.room",         name = "room-ktx",            version.ref = "room" }
room-compiler           = { group = "androidx.room",         name = "room-compiler",       version.ref = "room" }
room-paging             = { group = "androidx.room",         name = "room-paging",         version.ref = "room" }

# ── Coroutines ────────────────────────────────────────────────────────────────
coroutines-android      = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-android", version.ref = "coroutines" }
coroutines-core         = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-core",    version.ref = "coroutines" }

# ── DataStore ─────────────────────────────────────────────────────────────────
datastore-preferences   = { group = "androidx.datastore",   name = "datastore-preferences", version.ref = "datastore" }

# ── Coil ──────────────────────────────────────────────────────────────────────
coil-compose            = { group = "io.coil-kt.coil3",     name = "coil-compose",        version.ref = "coil" }
coil-okhttp             = { group = "io.coil-kt.coil3",     name = "coil-network-okhttp", version.ref = "coil" }

# ── Paging ────────────────────────────────────────────────────────────────────
paging-runtime          = { group = "androidx.paging",       name = "paging-runtime",      version.ref = "paging" }
paging-compose          = { group = "androidx.paging",       name = "paging-compose",      version.ref = "paging" }

# ── WorkManager ───────────────────────────────────────────────────────────────
work-runtime            = { group = "androidx.work",         name = "work-runtime-ktx",   version.ref = "work-manager" }
hilt-work               = { group = "androidx.hilt",         name = "hilt-work",          version = "1.2.0" }
hilt-work-compiler      = { group = "androidx.hilt",         name = "hilt-compiler",      version = "1.2.0" }

# ── Sécurité ─────────────────────────────────────────────────────────────────
security-crypto         = { group = "androidx.security",     name = "security-crypto",     version.ref = "security-crypto" }

# ── Tests ─────────────────────────────────────────────────────────────────────
junit4                  = { group = "junit",                 name = "junit",               version.ref = "junit" }
junit5-api              = { group = "org.junit.jupiter",     name = "junit-jupiter-api",   version.ref = "junit5" }
junit5-engine           = { group = "org.junit.jupiter",     name = "junit-jupiter-engine", version.ref = "junit5" }
junit5-params           = { group = "org.junit.jupiter",     name = "junit-jupiter-params", version.ref = "junit5" }
mockk                   = { group = "io.mockk",              name = "mockk",               version.ref = "mockk" }
mockk-android           = { group = "io.mockk",              name = "mockk-android",       version.ref = "mockk" }
turbine                 = { group = "app.cash.turbine",       name = "turbine",             version.ref = "turbine" }
coroutines-test         = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-test", version.ref = "coroutines-test" }
compose-ui-test-junit4  = { group = "androidx.compose.ui",  name = "ui-test-junit4" }
compose-ui-test-manifest= { group = "androidx.compose.ui",  name = "ui-test-manifest" }
test-ext-junit          = { group = "androidx.test.ext",     name = "junit",               version.ref = "test-ext-junit" }
espresso-core           = { group = "androidx.test.espresso", name = "espresso-core",      version.ref = "espresso" }

[plugins]
# Plugins Gradle appliqués dans les build.gradle.kts
android-application     = { id = "com.android.application",               version.ref = "agp" }
android-library         = { id = "com.android.library",                   version.ref = "agp" }
kotlin-android          = { id = "org.jetbrains.kotlin.android",           version.ref = "kotlin" }
kotlin-compose          = { id = "org.jetbrains.kotlin.plugin.compose",   version.ref = "kotlin" }
kotlin-serialization    = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
hilt                    = { id = "com.google.dagger.hilt.android",         version.ref = "hilt" }
ksp                     = { id = "com.google.devtools.ksp",                version.ref = "ksp" }
room                    = { id = "androidx.room",                          version.ref = "room" }
detekt                  = { id = "io.gitlab.arturbosch.detekt",            version.ref = "detekt" }
ktlint                  = { id = "org.jlleitschuh.gradle.ktlint",          version.ref = "ktlint-gradle" }

[bundles]
# Groupes de dépendances souvent utilisées ensemble
compose-ui = [
    "compose-ui",
    "compose-ui-graphics",
    "compose-ui-tooling-preview",
    "compose-material3",
    "compose-material-icons",
    "androidx-activity-compose",
]
testing-unit = [
    "junit5-api",
    "mockk",
    "turbine",
    "coroutines-test",
]
testing-android = [
    "test-ext-junit",
    "espresso-core",
    "compose-ui-test-junit4",
    "mockk-android",
]
room = [
    "room-runtime",
    "room-ktx",
    "room-paging",
]
networking = [
    "retrofit",
    "retrofit-kotlinx-serialization",
    "okhttp",
    "okhttp-logging",
    "kotlinx-serialization-json",
]
```

**⚠️ Piège :** Dans le BOM Compose, les bibliothèques comme `compose-ui` et `compose-material3` n'ont PAS de `version.ref` — le BOM gère ça automatiquement. Ne rajoute jamais de version manuellement sur ces dépendances.

---

### Étape 3 : Configurer le build.gradle.kts racine

**Objectif :** mettre à jour le fichier de build global du projet.

**Action 3.1** : Remplace le contenu de `build.gradle.kts` (racine du projet, pas celui de `app/`) par :

```kotlin
// build.gradle.kts (racine)
// Ce fichier configure les plugins disponibles pour TOUS les sous-modules
// On déclare ici, on applique dans chaque module

plugins {
    // android-application : pour le module app/ (produit un APK)
    alias(libs.plugins.android.application)  apply false
    // android-library : pour les modules core-*, feature-*, data-*, domain-*
    alias(libs.plugins.android.library)      apply false
    // kotlin-android : requis pour tout code Kotlin Android
    alias(libs.plugins.kotlin.android)       apply false
    // kotlin-compose : NOUVEAU depuis Kotlin 2.0 — remplace l'ancien compilerOptions
    alias(libs.plugins.kotlin.compose)       apply false
    // kotlin-serialization : pour la sérialisation JSON avec Retrofit
    alias(libs.plugins.kotlin.serialization) apply false
    // hilt : injection de dépendances
    alias(libs.plugins.hilt)                 apply false
    // ksp : Kotlin Symbol Processing (remplace KAPT pour Room et Hilt)
    alias(libs.plugins.ksp)                  apply false
    // room : plugin Room pour la configuration des schémas
    alias(libs.plugins.room)                 apply false
    // detekt : analyse statique du code
    alias(libs.plugins.detekt)               apply false
    // ktlint : formatage du code
    alias(libs.plugins.ktlint)               apply false
}
```

**⚠️ Piège :** `apply false` signifie "ce plugin est disponible mais pas encore appliqué ici". Chaque module l'appliquera dans son propre `build.gradle.kts` avec `alias(libs.plugins.xxx)` sans `apply false`.

---

### Étape 4 : Mettre à jour le build.gradle.kts du module app

**Objectif :** moderniser la configuration de l'app principale.

**Action 4.1** : Remplace le contenu de `app/build.gradle.kts` par :

```kotlin
// app/build.gradle.kts
// Ce module produit l'APK final — il agrège tous les autres modules

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    // Obligatoire depuis Kotlin 2.0 pour utiliser Compose
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
    alias(libs.plugins.ktlint)
    alias(libs.plugins.detekt)
}

android {
    namespace = "com.taladz.app"
    // Utilise la dernière API Android stable
    compileSdk = 35

    defaultConfig {
        applicationId = "com.taladz.app"
        minSdk = 24          // Android 7.0 — couvre ~95% des appareils
        targetSdk = 35       // Toujours égal à compileSdk pour les nouvelles apps
        versionCode = 1
        versionName = "0.1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // Active le support des vecteurs pour les API < 21 (déjà couvert, bonne pratique)
        vectorDrawables.useSupportLibrary = true
    }

    buildTypes {
        release {
            // R8 = minification + obfuscation (activé en release)
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            // Pas d'obfuscation en debug pour faciliter le débogage
            isMinifyEnabled = false
            applicationIdSuffix = ".debug"  // app distincte du release sur l'appareil
        }
    }

    compileOptions {
        // Java 17 requis par AGP 8.x
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        // Désactive les fonctionnalités inutilisées pour accélérer le build
        buildConfig = true
        viewBinding = false
        dataBinding = false
    }

    packaging {
        resources {
            // Évite les conflits de fichiers META-INF lors de la fusion des modules
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
            excludes += "/META-INF/LICENSE.md"
            excludes += "/META-INF/LICENSE-notice.md"
        }
    }
}

// Configuration ktlint pour ce module
ktlint {
    version.set("1.5.0")  // version de ktlint (l'outil, pas le plugin Gradle)
    android.set(true)
    ignoreFailures.set(false)  // le build échoue si le style n'est pas respecté
    reporters {
        reporter(org.jlleitschuh.gradle.ktlint.reporter.ReporterType.PLAIN)
        reporter(org.jlleitschuh.gradle.ktlint.reporter.ReporterType.HTML)
    }
}

// Configuration Detekt
detekt {
    config.setFrom(rootProject.files("config/detekt/detekt.yml"))
    buildUponDefaultConfig = true
    allRules = false
}

dependencies {
    // ── Compose BOM — gère automatiquement les versions de tout Compose ──
    val composeBom = platform(libs.compose.bom)
    implementation(composeBom)
    androidTestImplementation(composeBom)

    // ── AndroidX Core ─────────────────────────────────────────────────────
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime)
    implementation(libs.androidx.lifecycle.viewmodel)

    // ── Compose UI ────────────────────────────────────────────────────────
    implementation(libs.bundles.compose.ui)

    // ── Navigation ────────────────────────────────────────────────────────
    implementation(libs.navigation.compose)

    // ── Hilt ──────────────────────────────────────────────────────────────
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)  // ksp remplace kapt — plus rapide
    implementation(libs.hilt.navigation.compose)

    // ── Coroutines ────────────────────────────────────────────────────────
    implementation(libs.coroutines.android)
    implementation(libs.coroutines.core)

    // ── Debug uniquement ──────────────────────────────────────────────────
    debugImplementation(libs.compose.ui.tooling)

    // ── Tests unitaires ───────────────────────────────────────────────────
    testImplementation(libs.bundles.testing.unit)
    testRuntimeOnly(libs.junit5.engine)

    // ── Tests instrumentés (émulateur/appareil) ───────────────────────────
    androidTestImplementation(libs.bundles.testing.android)
    androidTestImplementation(composeBom)
    debugImplementation(libs.compose.ui.test.manifest)
}
```

---

### Étape 5 : Créer le module `core-common`

**Objectif :** un module pour les utilitaires partagés (extensions, constantes, modèles de base).

**Action 5.1** : Dans Android Studio, clic droit sur la racine du projet → **New → Module**

**Action 5.2** : Choisis **"Android Library"**, configure :
- Module name : `core-common`
- Package name : `com.taladz.core.common`
- Language : Kotlin
- Min SDK : API 24

**Action 5.3** : Remplace le contenu de `core-common/build.gradle.kts` par :

```kotlin
// core-common/build.gradle.kts
// Module utilitaire — pas d'interface, pas de réseau
// Contient : extensions Kotlin, constantes, modèles de domaine de base

plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.ktlint)
    alias(libs.plugins.detekt)
}

android {
    namespace = "com.taladz.core.common"
    compileSdk = 35

    defaultConfig {
        minSdk = 24
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    // Coroutines — les utilitaires async sont utilisés partout
    implementation(libs.coroutines.core)

    // Tests
    testImplementation(libs.bundles.testing.unit)
    testRuntimeOnly(libs.junit5.engine)
}
```

**Action 5.4** : Crée la première classe utilitaire dans `core-common` :

Crée le fichier `core-common/src/main/java/com/taladz/core/common/result/Result.kt` :

```kotlin
package com.taladz.core.common.result

/**
 * Sealed class représentant le résultat d'une opération.
 *
 * Utilisée dans TOUT le projet pour représenter :
 * - le succès avec des données
 * - l'échec avec une erreur
 * - le chargement en cours
 *
 * Analogie : c'est comme un colis livré (Success),
 * non livré (Error) ou en transit (Loading).
 */
sealed class Result<out T> {

    /** L'opération a réussi — [data] contient le résultat */
    data class Success<T>(val data: T) : Result<T>()

    /** L'opération a échoué — [exception] décrit l'erreur */
    data class Error(val exception: Throwable) : Result<Nothing>()

    /** L'opération est en cours */
    data object Loading : Result<Nothing>()
}

/** Extension pour simplifier le traitement du succès */
inline fun <T> Result<T>.onSuccess(action: (T) -> Unit): Result<T> {
    if (this is Result.Success) action(data)
    return this
}

/** Extension pour simplifier le traitement des erreurs */
inline fun <T> Result<T>.onError(action: (Throwable) -> Unit): Result<T> {
    if (this is Result.Error) action(exception)
    return this
}

/** Convertit un Result en son type nullable (null si Error ou Loading) */
fun <T> Result<T>.getOrNull(): T? = if (this is Result.Success) data else null
```

---

### Étape 6 : Créer le module `core-ui`

**Objectif :** un module pour les composants Compose réutilisables (boutons, typographie, couleurs).

**Action 6.1** : Répète le processus de création de module (New → Module → Android Library) :
- Module name : `core-ui`
- Package name : `com.taladz.core.ui`

**Action 6.2** : Remplace `core-ui/build.gradle.kts` par :

```kotlin
// core-ui/build.gradle.kts
// Module UI partagé — composants Compose réutilisables

plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)  // requis pour Compose dans un module library
    alias(libs.plugins.ktlint)
    alias(libs.plugins.detekt)
}

android {
    namespace = "com.taladz.core.ui"
    compileSdk = 35

    defaultConfig {
        minSdk = 24
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    val composeBom = platform(libs.compose.bom)
    implementation(composeBom)

    implementation(libs.bundles.compose.ui)
    implementation(libs.androidx.core.ktx)
    implementation(libs.coil.compose)

    debugImplementation(libs.compose.ui.tooling)

    // Tests
    testImplementation(libs.bundles.testing.unit)
    testRuntimeOnly(libs.junit5.engine)
    androidTestImplementation(composeBom)
    androidTestImplementation(libs.compose.ui.test.junit4)
    debugImplementation(libs.compose.ui.test.manifest)
}
```

**Action 6.3** : Crée un premier composant partagé `core-ui/src/main/java/com/taladz/core/ui/components/TaladzButton.kt` :

```kotlin
package com.taladz.core.ui.components

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Bouton principal réutilisable dans toute l'application Taladz.
 * Utilise les couleurs du thème Material 3 (défini au TP 03).
 */
@Composable
fun TaladzButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    Button(
        onClick = onClick,
        modifier = modifier,
        enabled = enabled,
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary,
        ),
    ) {
        Text(
            text = text,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun TaladzButtonPreview() {
    TaladzButton(text = "Commencer", onClick = {})
}
```

**Action 6.4** : Déclare les modules dans `settings.gradle.kts` (racine) :

```kotlin
// settings.gradle.kts
pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "Taladz"

// Modules déclarés — ajouter ici chaque nouveau module créé
include(":app")
include(":core:core-common")
include(":core:core-ui")
```

**⚠️ Piège :** Si tes modules sont dans des sous-dossiers (`core/core-common`), utilise `:core:core-common` avec deux-points dans `include()` ET crée un dossier `core/` avec les sous-dossiers à l'intérieur.

---

### Étape 7 : Configurer Detekt

**Objectif :** mettre en place l'analyse statique de code.

**Action 7.1** : Crée le dossier et le fichier de configuration :
```bash
mkdir -p config/detekt
```

**Action 7.2** : Crée `config/detekt/detekt.yml` :

```yaml
# config/detekt/detekt.yml
# Règles Detekt adaptées au projet Taladz

build:
  maxIssues: 0  # zéro tolérance en CI

style:
  MagicNumber:
    active: true
    ignoreNumbers: ['-1', '0', '1', '2', '100']  # les petits nombres courants sont ok
  MaxLineLength:
    active: true
    maxLineLength: 120  # 120 chars max (plus large que la défaut de 80)

complexity:
  LongMethod:
    active: true
    threshold: 40  # une fonction ne doit pas dépasser 40 lignes

naming:
  FunctionNaming:
    active: true
    # Les fonctions @Composable commencent par une majuscule — exception nécessaire
    functionPattern: '[a-zA-Z][a-zA-Z0-9]*'

comments:
  UndocumentedPublicClass:
    active: false  # on ne force pas les KDoc sur toutes les classes

formatting:
  active: true
  android: true
```

---

### Étape 8 : Configurer GitHub Actions (CI/CD)

**Objectif :** avoir une vérification automatique à chaque push.

**Action 8.1** : Crée l'arborescence :
```bash
mkdir -p .github/workflows
```

**Action 8.2** : Crée `.github/workflows/ci.yml` :

```yaml
# .github/workflows/ci.yml
# Pipeline CI — lancé automatiquement à chaque push et pull request

name: CI — Build & Quality

on:
  push:
    branches: [ main, develop, "tp-*" ]  # toutes les branches TP
  pull_request:
    branches: [ main ]

jobs:
  build-and-check:
    name: Build, Lint & Tests
    runs-on: ubuntu-latest    # machine virtuelle Linux fournie par GitHub
    timeout-minutes: 30       # arrêt si le build prend plus de 30 min

    steps:
      # 1. Récupère le code source
      - name: Checkout code
        uses: actions/checkout@v4

      # 2. Configure Java 17 (requis par AGP 8.x)
      - name: Setup JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'   # distribution OpenJDK recommandée

      # 3. Cache Gradle pour accélérer les builds suivants
      - name: Cache Gradle
        uses: actions/cache@v4
        with:
          path: |
            ~/.gradle/caches
            ~/.gradle/wrapper
          key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle.kts', '**/libs.versions.toml') }}
          restore-keys: |
            ${{ runner.os }}-gradle-

      # 4. Donne les droits d'exécution au wrapper Gradle
      - name: Make gradlew executable
        run: chmod +x ./gradlew

      # 5. Vérifie le formatage ktlint
      - name: ktlint check
        run: ./gradlew ktlintCheck

      # 6. Analyse statique Detekt
      - name: Detekt
        run: ./gradlew detekt

      # 7. Compile le projet (debug)
      - name: Build Debug
        run: ./gradlew assembleDebug

      # 8. Lance les tests unitaires
      - name: Unit Tests
        run: ./gradlew testDebugUnitTest

      # 9. Publie le rapport de tests (visible dans l'onglet Actions)
      - name: Upload Test Results
        uses: actions/upload-artifact@v4
        if: always()   # publie même si les tests échouent
        with:
          name: test-results
          path: '**/build/reports/tests/'
          retention-days: 7
```

**✅ Vérification :** Push le code sur GitHub, puis va dans l'onglet **"Actions"** de ton repo. Tu dois voir le workflow se lancer (icône orange = en cours, verte = succès, rouge = erreur).

---

## 🧪 7. Tests à écrire

Crée `core-common/src/test/java/com/taladz/core/common/ResultTest.kt` :

```kotlin
package com.taladz.core.common

import com.taladz.core.common.result.Result
import com.taladz.core.common.result.getOrNull
import com.taladz.core.common.result.onError
import com.taladz.core.common.result.onSuccess
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class ResultTest {

    @Test
    fun `Success contient la donnée correcte`() {
        val result = Result.Success(data = "Taladz")
        assertEquals("Taladz", result.data)
    }

    @Test
    fun `onSuccess est appelé uniquement sur Success`() {
        var called = false
        Result.Success("ok").onSuccess { called = true }
        assertTrue(called)
    }

    @Test
    fun `onSuccess n est pas appelé sur Error`() {
        var called = false
        Result.Error(Exception("erreur")).onSuccess { called = true }
        assertTrue(!called)
    }

    @Test
    fun `onError est appelé sur Error`() {
        var message = ""
        Result.Error(Exception("réseau indisponible")).onError { message = it.message ?: "" }
        assertEquals("réseau indisponible", message)
    }

    @Test
    fun `getOrNull retourne null sur Error`() {
        val result: Result<String> = Result.Error(Exception())
        assertNull(result.getOrNull())
    }

    @Test
    fun `getOrNull retourne null sur Loading`() {
        val result: Result<String> = Result.Loading
        assertNull(result.getOrNull())
    }

    @Test
    fun `getOrNull retourne la valeur sur Success`() {
        val result = Result.Success(42)
        assertEquals(42, result.getOrNull())
    }
}
```

---

## 💾 8. Livrable Git

**Branche :** `tp-02-structure-modulaire`

**Commits attendus :**
```bash
git commit -m "build: mettre à jour Gradle wrapper vers 8.11.1"
git commit -m "build: configurer Version Catalog (libs.versions.toml)"
git commit -m "feat(core-common): créer module avec Result sealed class"
git commit -m "feat(core-ui): créer module avec TaladzButton"
git commit -m "ci: ajouter GitHub Actions (build + lint + tests)"
git commit -m "build: configurer Detekt et ktlint"
git commit -m "test(core-common): tests unitaires Result"
```

---

## ✅ 9. Checklist d'auto-évaluation

- [ ] `./gradlew assembleDebug` passe sans erreur
- [ ] `./gradlew ktlintCheck` passe sans erreur
- [ ] `./gradlew detekt` passe sans erreur
- [ ] `./gradlew testDebugUnitTest` — tous les tests verts
- [ ] La CI GitHub Actions est verte sur le dernier push
- [ ] Le module `core-common` est visible dans Android Studio
- [ ] Le module `core-ui` est visible dans Android Studio
- [ ] `libs.versions.toml` contient toutes les versions
- [ ] `local.properties` n'est PAS sur GitHub

---

## 🤔 10. Questions de compréhension

1. **Conceptuelle :** Pourquoi `apply false` dans le `build.gradle.kts` racine ? Que se passe-t-il si tu oublies ce mot-clé ?

2. **Technique :** Quelle est la différence entre `implementation` et `api` dans les dépendances Gradle ? Lequel utilise-t-on en général dans une library et pourquoi ?

3. **Architecture :** Pourquoi le module `core-ui` dépend du Compose BOM mais pas le module `core-common` ?

4. **CI/CD :** Dans le workflow GitHub Actions, pourquoi met-on `if: always()` sur l'étape "Upload Test Results" ?

5. **Versions :** Pourquoi la version de KSP doit-elle commencer exactement par la même version que Kotlin ?

---

## 🚀 11. Bonus (optionnel)

- **Bonus 1 :** Ajoute une étape dans la CI qui génère un rapport Detekt en HTML et le publie comme artifact
- **Bonus 2 :** Configure une règle de protection de branche sur `main` dans GitHub (Settings → Branches → require CI to pass)
- **Bonus 3 :** Crée un module `core-common` test avec des helpers de test réutilisables (`TestCoroutineRule`, etc.)

---

## 📌 12. Ce qu'on fera au prochain TP

Au **TP 03**, on va donner à Taladz son identité visuelle. On créera le thème Material 3 complet avec les couleurs officielles, on intégrera les **polices arabes** (Amiri, Cairo) directement dans le projet, et on activera le support **RTL natif** pour que l'app s'affiche correctement en arabe de droite à gauche. On construira aussi le composant `AdaptiveText` qui choisit automatiquement la bonne police selon la langue affichée.
