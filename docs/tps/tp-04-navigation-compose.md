# TP 04 — Navigation Compose entre écrans

> **Durée estimée :** 8 heures sur 2 jours
> **Niveau :** Débutant-Intermédiaire
> **Prérequis :** TP 03 terminé (thème + polices + RTL fonctionnels)

---

## Objectifs d'apprentissage

À la fin de ce TP, tu sauras :
- [ ] Comprendre le `NavController` et le `NavGraph`
- [ ] Définir des routes typesafe avec un `sealed class`
- [ ] Créer les routes principales : Splash → Auth → Home → Détail
- [ ] Passer des arguments entre écrans (bookId, userId…)
- [ ] Gérer le bouton Retour et la back stack correctement
- [ ] Implémenter la Bottom Navigation Bar avec les 4 onglets principaux

---

## Concepts théoriques

### Comment fonctionne la navigation Compose ?

La navigation Compose repose sur 3 concepts :

```
NavController ──► gère la back stack et les transitions
NavHost       ──► conteneur qui affiche le bon écran
NavGraph      ──► définit toutes les destinations et les routes
```

**Flux de navigation :**
```
Utilisateur clique
    ↓
navController.navigate("route/args")
    ↓
NavHost cherche la destination correspondante
    ↓
Compose affiche le composable correspondant
```

### Routes typesafe (Navigation 2.8+)

Depuis Navigation 2.8, on peut définir des routes comme des data classes au lieu de chaînes de caractères. C'est plus sûr :

```kotlin
// ❌ Ancienne façon — chaînes de caractères fragiles
navController.navigate("book_detail/42")

// ✅ Nouvelle façon — typesafe
navController.navigate(Screen.BookDetail(bookId = 42))
```

### Back Stack

La back stack est une pile de destinations. Quand tu navigues :
- `navigate(X)` → empile X
- `popBackStack()` → retire le sommet (équivaut au bouton Retour)
- `navigate(X) { popUpTo(Y) { inclusive = true } }` → retire tout jusqu'à Y avant d'empiler X

---

## Étape 1 — Ajouter les dépendances Navigation

### 1.1 Mettre à jour `libs.versions.toml`

```toml
[versions]
navigation = "2.8.5"

[libraries]
androidx-navigation-compose = { group = "androidx.navigation", name = "navigation-compose", version.ref = "navigation" }

[plugins]
# Pas de plugin Kotlin Serialization dans libs.versions.toml ? Ajouter :
kotlin-serialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
```

### 1.2 Mettre à jour `build-logic/src/main/kotlin/feature.gradle.kts`

Crée une convention plugin pour les modules `feature-*` qui auront tous besoin de navigation :

```kotlin
// build-logic/src/main/kotlin/feature.gradle.kts
plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.dagger.hilt.android")
    id("com.google.devtools.ksp")
}

android {
    compileSdk = 35
    defaultConfig { minSdk = 26 }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { compose = true }
}

dependencies {
    implementation(project(":core:core-ui"))
    implementation(project(":core:core-common"))
    // Navigation
    implementation(libs.androidx.navigation.compose)
    // Hilt
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    // Compose BOM
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.material3)
}
```

### 1.3 Ajouter navigation à `app/build.gradle.kts`

```kotlin
dependencies {
    implementation(libs.androidx.navigation.compose)
    // Kotlin Serialization (nécessaire pour les routes typesafe)
    implementation(libs.kotlinx.serialization.json)
}
```

Ajoute aussi dans `libs.versions.toml` :

```toml
[versions]
serialization = "1.7.3"

[libraries]
kotlinx-serialization-json = { group = "org.jetbrains.kotlinx", name = "kotlinx-serialization-json", version.ref = "serialization" }
```

Et le plugin dans le `build.gradle.kts` de l'app :

```kotlin
plugins {
    alias(libs.plugins.kotlin.serialization)
}
```

---

## Étape 2 — Définir les routes typesafe

### 2.1 Créer `Screen.kt` dans `core-common`

```kotlin
// core/core-common/src/main/java/com/taladz/core/common/navigation/Screen.kt
package com.taladz.core.common.navigation

import kotlinx.serialization.Serializable

// ─── Routes de l'application Taladz ──────────────────────────────────────────

@Serializable
object SplashScreen

@Serializable
object LoginScreen

@Serializable
object RegisterScreen

@Serializable
object HomeScreen  // Bottom nav — onglet Catalogue

@Serializable
object LibraryScreen  // Bottom nav — onglet Bibliothèque

@Serializable
object ProfileScreen  // Bottom nav — onglet Profil

@Serializable
object SettingsScreen  // Bottom nav — onglet Paramètres

@Serializable
data class BookDetailScreen(val bookId: Int)

// ─── Graphes imbriqués ────────────────────────────────────────────────────────

@Serializable
object AuthGraph  // Graphe d'authentification (Login + Register)

@Serializable
object MainGraph  // Graphe principal (Home + Library + Profile + Settings)
```

---

## Étape 3 — Créer les écrans factices

Pour ce TP, les écrans sont des composables simples. Ils seront remplis dans les TP suivants.

### 3.1 Structure dans le module `app`

```
app/src/main/java/com/taladz/app/
├── navigation/
│   ├── TaladzNavHost.kt      ← NavGraph principal
│   ├── BottomNavBar.kt       ← barre de navigation inférieure
│   └── NavTransitions.kt     ← animations de transition
├── screens/
│   ├── SplashScreen.kt
│   ├── auth/
│   │   ├── LoginScreen.kt
│   │   └── RegisterScreen.kt
│   └── main/
│       ├── HomeScreen.kt
│       ├── LibraryScreen.kt
│       ├── ProfileScreen.kt
│       ├── SettingsScreen.kt
│       └── BookDetailScreen.kt
└── MainActivity.kt
```

### 3.2 Écrans factices

```kotlin
// app/src/main/java/com/taladz/app/screens/main/HomeScreen.kt
package com.taladz.app.screens.main

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier

@Composable
fun HomeScreen() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text  = "Catalogue — TP 08",
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.primary,
        )
    }
}
```

Crée les 4 écrans de la même façon (`LibraryScreen`, `ProfileScreen`, `SettingsScreen`) avec des textes différents.

```kotlin
// app/src/main/java/com/taladz/app/screens/main/BookDetailScreen.kt
package com.taladz.app.screens.main

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookDetailScreen(
    bookId: Int,
    onBack: () -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize()) {
        TopAppBar(
            title = { Text("Livre #$bookId") },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Retour",
                    )
                }
            },
        )
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text  = "Détail livre $bookId — TP 09",
                style = MaterialTheme.typography.bodyLarge,
            )
        }
    }
}
```

### 3.3 Écran de Splash

```kotlin
// app/src/main/java/com/taladz/app/screens/SplashScreen.kt
package com.taladz.app.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.taladz.core.ui.components.AdaptiveText
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(onNavigateToAuth: () -> Unit) {
    // Simule un chargement de 2 secondes
    LaunchedEffect(Unit) {
        delay(2_000)
        onNavigateToAuth()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.primary),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            AdaptiveText(
                text  = "طالدز",
                style = MaterialTheme.typography.displayLarge,
                color = MaterialTheme.colorScheme.onPrimary,
                isTitle = true,
            )
            AdaptiveText(
                text  = "Taladz",
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onPrimary,
            )
            Spacer(modifier = Modifier.height(32.dp))
            CircularProgressIndicator(
                color = MaterialTheme.colorScheme.onPrimary,
            )
        }
    }
}
```

---

## Étape 4 — Animations de transition

### 4.1 `NavTransitions.kt`

```kotlin
// app/src/main/java/com/taladz/app/navigation/NavTransitions.kt
package com.taladz.app.navigation

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.navigation.NavBackStackEntry

private const val ANIM_DURATION = 350

// Entrée depuis la droite (navigation en avant)
fun AnimatedContentTransitionScope<NavBackStackEntry>.slideInFromRight(): EnterTransition =
    slideInHorizontally(
        initialOffsetX = { fullWidth -> fullWidth },
        animationSpec  = tween(ANIM_DURATION),
    ) + fadeIn(animationSpec = tween(ANIM_DURATION))

// Sortie vers la gauche (navigation en avant)
fun AnimatedContentTransitionScope<NavBackStackEntry>.slideOutToLeft(): ExitTransition =
    slideOutHorizontally(
        targetOffsetX = { fullWidth -> -fullWidth / 3 },
        animationSpec = tween(ANIM_DURATION),
    ) + fadeOut(animationSpec = tween(ANIM_DURATION))

// Retour depuis la gauche (navigation en arrière)
fun AnimatedContentTransitionScope<NavBackStackEntry>.slideInFromLeft(): EnterTransition =
    slideInHorizontally(
        initialOffsetX = { fullWidth -> -fullWidth / 3 },
        animationSpec  = tween(ANIM_DURATION),
    ) + fadeIn(animationSpec = tween(ANIM_DURATION))

// Sortie vers la droite (navigation en arrière)
fun AnimatedContentTransitionScope<NavBackStackEntry>.slideOutToRight(): ExitTransition =
    slideOutHorizontally(
        targetOffsetX = { fullWidth -> fullWidth },
        animationSpec = tween(ANIM_DURATION),
    ) + fadeOut(animationSpec = tween(ANIM_DURATION))
```

---

## Étape 5 — Bottom Navigation Bar

### 5.1 `BottomNavBar.kt`

```kotlin
// app/src/main/java/com/taladz/app/navigation/BottomNavBar.kt
package com.taladz.app.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavController
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.currentBackStackEntryAsState
import com.taladz.core.common.navigation.HomeScreen
import com.taladz.core.common.navigation.LibraryScreen
import com.taladz.core.common.navigation.ProfileScreen
import com.taladz.core.common.navigation.SettingsScreen
import androidx.compose.runtime.getValue

// Modèle d'un onglet de navigation
data class BottomNavItem(
    val label: String,
    val labelAr: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
    val route: Any,  // Destination typesafe
)

val bottomNavItems = listOf(
    BottomNavItem(
        label         = "Catalogue",
        labelAr       = "الكتالوج",
        selectedIcon  = Icons.Filled.Home,
        unselectedIcon = Icons.Outlined.Home,
        route         = HomeScreen,
    ),
    BottomNavItem(
        label         = "Bibliothèque",
        labelAr       = "مكتبتي",
        selectedIcon  = Icons.Filled.Favorite,
        unselectedIcon = Icons.Outlined.FavoriteBorder,
        route         = LibraryScreen,
    ),
    BottomNavItem(
        label         = "Profil",
        labelAr       = "الملف الشخصي",
        selectedIcon  = Icons.Filled.Person,
        unselectedIcon = Icons.Outlined.Person,
        route         = ProfileScreen,
    ),
    BottomNavItem(
        label         = "Paramètres",
        labelAr       = "الإعدادات",
        selectedIcon  = Icons.Filled.Settings,
        unselectedIcon = Icons.Outlined.Settings,
        route         = SettingsScreen,
    ),
)

@Composable
fun TaladzBottomNavBar(navController: NavController) {
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    NavigationBar {
        bottomNavItems.forEach { item ->
            val isSelected = currentRoute?.contains(
                item.route::class.qualifiedName ?: ""
            ) == true

            NavigationBarItem(
                selected = isSelected,
                onClick  = {
                    navController.navigate(item.route) {
                        // Évite d'empiler plusieurs copies du même écran
                        popUpTo(navController.graph.findStartDestination().id) {
                            saveState = true
                        }
                        launchSingleTop = true
                        restoreState    = true
                    }
                },
                icon  = {
                    Icon(
                        imageVector = if (isSelected) item.selectedIcon else item.unselectedIcon,
                        contentDescription = item.label,
                    )
                },
                label = { Text(item.label) },
            )
        }
    }
}
```

---

## Étape 6 — NavGraph principal

### 6.1 `TaladzNavHost.kt`

```kotlin
// app/src/main/java/com/taladz/app/navigation/TaladzNavHost.kt
package com.taladz.app.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.navigation
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import com.taladz.core.common.navigation.AuthGraph
import com.taladz.core.common.navigation.BookDetailScreen
import com.taladz.core.common.navigation.HomeScreen
import com.taladz.core.common.navigation.LibraryScreen
import com.taladz.core.common.navigation.LoginScreen
import com.taladz.core.common.navigation.MainGraph
import com.taladz.core.common.navigation.ProfileScreen
import com.taladz.core.common.navigation.RegisterScreen
import com.taladz.core.common.navigation.SettingsScreen
import com.taladz.core.common.navigation.SplashScreen
import com.taladz.app.screens.SplashScreen
import com.taladz.app.screens.auth.LoginScreen
import com.taladz.app.screens.auth.RegisterScreen
import com.taladz.app.screens.main.BookDetailScreen
import com.taladz.app.screens.main.HomeScreen
import com.taladz.app.screens.main.LibraryScreen
import com.taladz.app.screens.main.ProfileScreen
import com.taladz.app.screens.main.SettingsScreen

// Écrans qui affichent la Bottom Bar
private val screensWithBottomBar = setOf(
    HomeScreen::class.qualifiedName,
    LibraryScreen::class.qualifiedName,
    ProfileScreen::class.qualifiedName,
    SettingsScreen::class.qualifiedName,
)

@Composable
fun TaladzNavHost() {
    val navController: NavHostController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    val showBottomBar = screensWithBottomBar.any { route ->
        currentRoute?.contains(route ?: "") == true
    }

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                TaladzBottomNavBar(navController = navController)
            }
        },
    ) { innerPadding ->
        NavHost(
            navController    = navController,
            startDestination = SplashScreen,
            modifier         = Modifier.padding(innerPadding),
        ) {
            // ── Splash ──────────────────────────────────────────────────────
            composable<SplashScreen>(
                enterTransition = { fadeIn() },
                exitTransition  = { fadeOut() },
            ) {
                SplashScreen(
                    onNavigateToAuth = {
                        navController.navigate(AuthGraph) {
                            popUpTo(SplashScreen) { inclusive = true }
                        }
                    },
                )
            }

            // ── Graphe Auth ─────────────────────────────────────────────────
            navigation<AuthGraph>(startDestination = LoginScreen) {
                composable<LoginScreen>(
                    enterTransition  = { slideInFromRight() },
                    exitTransition   = { slideOutToLeft() },
                    popEnterTransition = { slideInFromLeft() },
                    popExitTransition  = { slideOutToRight() },
                ) {
                    LoginScreen(
                        onLoginSuccess = {
                            navController.navigate(MainGraph) {
                                popUpTo(AuthGraph) { inclusive = true }
                            }
                        },
                        onNavigateToRegister = {
                            navController.navigate(RegisterScreen)
                        },
                    )
                }

                composable<RegisterScreen>(
                    enterTransition  = { slideInFromRight() },
                    exitTransition   = { slideOutToLeft() },
                    popEnterTransition = { slideInFromLeft() },
                    popExitTransition  = { slideOutToRight() },
                ) {
                    RegisterScreen(
                        onRegisterSuccess = {
                            navController.navigate(MainGraph) {
                                popUpTo(AuthGraph) { inclusive = true }
                            }
                        },
                        onNavigateToLogin = {
                            navController.popBackStack()
                        },
                    )
                }
            }

            // ── Graphe Principal ────────────────────────────────────────────
            navigation<MainGraph>(startDestination = HomeScreen) {
                composable<HomeScreen>(
                    enterTransition  = { fadeIn() },
                    exitTransition   = { fadeOut() },
                ) {
                    HomeScreen(
                        onBookClick = { bookId ->
                            navController.navigate(BookDetailScreen(bookId = bookId))
                        },
                    )
                }

                composable<LibraryScreen>(
                    enterTransition  = { fadeIn() },
                    exitTransition   = { fadeOut() },
                ) {
                    LibraryScreen()
                }

                composable<ProfileScreen>(
                    enterTransition  = { fadeIn() },
                    exitTransition   = { fadeOut() },
                ) {
                    ProfileScreen()
                }

                composable<SettingsScreen>(
                    enterTransition  = { fadeIn() },
                    exitTransition   = { fadeOut() },
                ) {
                    SettingsScreen()
                }

                composable<BookDetailScreen>(
                    enterTransition  = { slideInFromRight() },
                    exitTransition   = { slideOutToLeft() },
                    popEnterTransition = { slideInFromLeft() },
                    popExitTransition  = { slideOutToRight() },
                ) { backStackEntry ->
                    val screen = backStackEntry.toRoute<BookDetailScreen>()
                    BookDetailScreen(
                        bookId = screen.bookId,
                        onBack = { navController.popBackStack() },
                    )
                }
            }
        }
    }
}
```

---

## Étape 7 — Adapter `MainActivity`

### 7.1 `MainActivity.kt` mise à jour

```kotlin
// app/src/main/java/com/taladz/app/MainActivity.kt
package com.taladz.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.taladz.app.navigation.TaladzNavHost
import com.taladz.core.ui.theme.TaladzThemeWrapper
import com.taladz.core.ui.theme.ThemeViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private val themeViewModel: ThemeViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val currentTheme by themeViewModel.currentTheme.collectAsStateWithLifecycle()

            TaladzThemeWrapper(theme = currentTheme) {
                TaladzNavHost()
            }
        }
    }
}
```

---

## Étape 8 — Mettre à jour les écrans factices avec les bons paramètres

### 8.1 `HomeScreen` avec callback `onBookClick`

```kotlin
// app/src/main/java/com/taladz/app/screens/main/HomeScreen.kt
package com.taladz.app.screens.main

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun HomeScreen(onBookClick: (Int) -> Unit = {}) {
    Column(
        modifier              = Modifier.fillMaxSize(),
        horizontalAlignment   = Alignment.CenterHorizontally,
        verticalArrangement   = Arrangement.Center,
    ) {
        Text(
            text  = "Catalogue",
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.primary,
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text  = "Cet écran sera rempli en TP 08",
            style = MaterialTheme.typography.bodyMedium,
        )
        Spacer(modifier = Modifier.height(24.dp))
        // Test : naviguer vers le détail du livre 1
        Button(onClick = { onBookClick(1) }) {
            Text("Voir livre #1")
        }
        Spacer(modifier = Modifier.height(8.dp))
        Button(onClick = { onBookClick(42) }) {
            Text("Voir livre #42")
        }
    }
}
```

### 8.2 Écrans `LoginScreen` et `RegisterScreen` factices

```kotlin
// app/src/main/java/com/taladz/app/screens/auth/LoginScreen.kt
package com.taladz.app.screens.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit = {},
    onNavigateToRegister: () -> Unit = {},
) {
    Column(
        modifier            = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("Connexion — TP 07", style = MaterialTheme.typography.headlineMedium)
        Spacer(modifier = Modifier.height(32.dp))
        Button(
            onClick  = onLoginSuccess,
            modifier = Modifier.align(Alignment.CenterHorizontally),
        ) {
            Text("Se connecter (simulé)")
        }
        Spacer(modifier = Modifier.height(16.dp))
        TextButton(onClick = onNavigateToRegister) {
            Text("Pas encore inscrit ? Créer un compte")
        }
    }
}
```

```kotlin
// app/src/main/java/com/taladz/app/screens/auth/RegisterScreen.kt
package com.taladz.app.screens.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun RegisterScreen(
    onRegisterSuccess: () -> Unit = {},
    onNavigateToLogin: () -> Unit = {},
) {
    Column(
        modifier            = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("Inscription — TP 07", style = MaterialTheme.typography.headlineMedium)
        Spacer(modifier = Modifier.height(32.dp))
        Button(onClick = onRegisterSuccess) {
            Text("S'inscrire (simulé)")
        }
        Spacer(modifier = Modifier.height(16.dp))
        TextButton(onClick = onNavigateToLogin) {
            Text("Déjà inscrit ? Se connecter")
        }
    }
}
```

---

## Étape 9 — Points importants sur la back stack

### 9.1 Règles à retenir

**Ne jamais empiler des copies du même onglet :**
```kotlin
// ✅ Correct — paramètres de navigation pour les onglets
navController.navigate(HomeScreen) {
    popUpTo(navController.graph.findStartDestination().id) {
        saveState = true   // sauvegarde l'état de l'écran précédent
    }
    launchSingleTop = true  // n'empile pas si déjà au sommet
    restoreState    = true  // restaure l'état sauvegardé
}
```

**Nettoyer la back stack lors d'une connexion :**
```kotlin
// ✅ Correct — après login réussi, supprimer tout le graphe Auth
navController.navigate(MainGraph) {
    popUpTo(AuthGraph) { inclusive = true }
}
// inclusive = true → supprime AuthGraph lui-même de la pile
```

**Retour depuis BookDetail vers Home (pas vers Login) :**
```kotlin
// BookDetail est dans MainGraph, donc popBackStack() va bien vers HomeScreen
navController.popBackStack()
```

### 9.2 Deep Link (pour TP 07 — notification push)

```kotlin
// Dans la déclaration de la destination dans NavHost :
composable<BookDetailScreen>(
    deepLinks = listOf(
        navDeepLink<BookDetailScreen>(
            basePath = "taladz://book"
        )
    ),
) { ... }

// Dans le manifeste, ajoute dans MainActivity :
// <intent-filter>
//     <action android:name="android.intent.action.VIEW" />
//     <category android:name="android.intent.category.DEFAULT" />
//     <category android:name="android.intent.category.BROWSABLE" />
//     <data android:scheme="taladz" android:host="book" />
// </intent-filter>
```

---

## Étape 10 — Test de la navigation

### 10.1 Test manuel à faire sur l'émulateur

1. **Splash** : l'app s'ouvre sur l'écran splash, attend 2 secondes, va vers Login ✓
2. **Auth** : cliquer "Se connecter (simulé)" → va vers HomeScreen ✓
3. **Bottom Bar** : cliquer sur chaque onglet → change d'écran ✓
4. **BookDetail** : dans Home, cliquer "Voir livre #1" → ouvre détail ✓
5. **Retour** : appuyer Retour (ou bouton flèche) depuis BookDetail → revient à Home ✓
6. **Retour** depuis Home → l'app se ferme (ne revient pas à Login) ✓

### 10.2 Test unitaire du graphe de navigation

```kotlin
// app/src/test/java/com/taladz/app/NavigationTest.kt
package com.taladz.app

import androidx.navigation.testing.TestNavHostController
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.taladz.core.common.navigation.HomeScreen
import com.taladz.core.common.navigation.LoginScreen
import com.taladz.core.common.navigation.SplashScreen
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NavigationTest {

    @Test
    fun startDestination_isSplashScreen() {
        val navController = TestNavHostController(
            ApplicationProvider.getApplicationContext()
        )
        // La destination de départ doit être SplashScreen
        assertEquals(
            SplashScreen::class.qualifiedName,
            navController.currentDestination?.route
        )
    }
}
```

> **Note :** Les tests de navigation nécessitent un device/émulateur. Ils seront en `androidTest`, pas en `test`.

---

## Récapitulatif des fichiers créés / modifiés

```
core/core-common/src/main/java/com/taladz/core/common/navigation/
└── Screen.kt                         ← routes typesafe (Serializable)

app/src/main/java/com/taladz/app/
├── navigation/
│   ├── TaladzNavHost.kt              ← NavGraph complet
│   ├── BottomNavBar.kt               ← Bottom Navigation Bar
│   └── NavTransitions.kt            ← animations slide/fade
├── screens/
│   ├── SplashScreen.kt              ← splash animé 2s
│   ├── auth/
│   │   ├── LoginScreen.kt            ← factice (TP 07)
│   │   └── RegisterScreen.kt         ← factice (TP 07)
│   └── main/
│       ├── HomeScreen.kt             ← factice avec bouton test
│       ├── LibraryScreen.kt          ← factice
│       ├── ProfileScreen.kt          ← factice
│       ├── SettingsScreen.kt         ← factice
│       └── BookDetailScreen.kt       ← affiche bookId + bouton retour
└── MainActivity.kt                   ← TaladzNavHost intégré

gradle/libs.versions.toml             ← +navigation, +serialization
```

---

## Points de contrôle — Checklist livrable

Avant de passer au TP 05, vérifie que :

- [ ] `./gradlew :app:assembleDebug` → BUILD SUCCESSFUL
- [ ] L'app démarre sur SplashScreen (fond vert Taladz, titre arabe)
- [ ] Après 2 secondes, va automatiquement vers LoginScreen
- [ ] "Se connecter (simulé)" → HomeScreen avec Bottom Bar visible
- [ ] 4 onglets de la Bottom Bar fonctionnent (Catalogue/Bibliothèque/Profil/Paramètres)
- [ ] "Voir livre #1" → BookDetailScreen avec titre "Livre #1"
- [ ] Bouton Retour / flèche → revient à HomeScreen
- [ ] Retour depuis HomeScreen → ferme l'app (ne revient pas à Login)
- [ ] CI GitHub Actions verte

---

## Pour aller plus loin (hors TP)

- **Shared Element Transitions** : Compose 1.7+ permet des transitions d'éléments partagés (image de couverture qui "vole" de la liste vers le détail)
- **Predictive Back Gesture** : Android 13+ — animé quand on fait glisser le doigt depuis le bord
- **Navigation avec Hilt** : utiliser `hiltViewModel()` dans les composables pour injecter des ViewModels

---

*TP 04 terminé. Prochain : TP 05 — Injection de dépendances avec Hilt.*
