# TP 05 — Injection de dépendances avec Hilt

> **Durée estimée :** 10 heures sur 2-3 jours
> **Niveau :** Intermédiaire
> **Prérequis :** TP 04 terminé (navigation fonctionnelle entre les 4 onglets)

---

## Objectifs d'apprentissage

À la fin de ce TP, tu sauras :
- [ ] Comprendre le principe de l'injection de dépendances et pourquoi c'est essentiel
- [ ] Configurer Hilt dans tout le projet multi-modules
- [ ] Créer des modules Hilt avec `@Module`, `@Provides`, `@Singleton`
- [ ] Utiliser `@HiltViewModel` pour injecter dans des ViewModels
- [ ] Comprendre les scopes Hilt (`SingletonComponent`, `ActivityComponent`, `ViewModelComponent`)
- [ ] Écrire des tests unitaires avec MockK

---

## Concepts théoriques

### Pourquoi l'injection de dépendances ?

Sans injection de dépendances, chaque classe crée ses propres dépendances :

```kotlin
// ❌ Sans DI — couplage fort, impossible à tester
class BookRepository {
    private val api = RetrofitInstance.api  // Dépendance fixe
    private val db  = RoomDatabase.getInstance(context)  // Dépendance fixe
}
```

Avec Hilt, les dépendances sont **injectées de l'extérieur** :

```kotlin
// ✅ Avec Hilt — découplé, testable
class BookRepository @Inject constructor(
    private val api: TaladzApiService,  // Injecté automatiquement
    private val dao: BookDao,           // Injecté automatiquement
)
```

**Avantages :**
- En production → les vraies implémentations
- En test → des mocks (MockK, Fake) sans changer le code de prod
- Pas de `getInstance()` partout → cycle de vie géré par Hilt

### Comment Hilt fonctionne-t-il ?

Hilt génère du code à la compilation (via KSP) pour créer un **graphe de dépendances** :

```
@HiltAndroidApp (Application)
    ↓ fournit
SingletonComponent (durée de vie = app entière)
    ↓ fournit
ActivityComponent (durée de vie = activité)
    ↓ fournit
ViewModelComponent (durée de vie = ViewModel)
    ↓ fournit
FragmentComponent / ViewComponent
```

---

## Étape 1 — Vérifier la configuration Hilt existante

Hilt a été partiellement configuré en TP 02. Vérifions que tout est en place.

### 1.1 `build-logic` — plugins Hilt + KSP

Vérifie que `libs.versions.toml` contient :

```toml
[versions]
hilt = "2.53.1"
ksp  = "2.1.0-1.0.29"

[libraries]
hilt-android         = { group = "com.google.dagger", name = "hilt-android",          version.ref = "hilt" }
hilt-compiler        = { group = "com.google.dagger", name = "hilt-android-compiler",  version.ref = "hilt" }
hilt-testing         = { group = "com.google.dagger", name = "hilt-android-testing",   version.ref = "hilt" }

[plugins]
hilt = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
ksp  = { id = "com.google.devtools.ksp",         version.ref = "ksp"  }
```

### 1.2 `app/build.gradle.kts`

```kotlin
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.hilt)   // ← nécessaire
    alias(libs.plugins.ksp)    // ← nécessaire
    alias(libs.plugins.kotlin.serialization)
}

dependencies {
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
}
```

### 1.3 `TaladzApp.kt` — Application annotée Hilt

```kotlin
// app/src/main/java/com/taladz/app/TaladzApp.kt
package com.taladz.app

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class TaladzApp : Application()
```

Vérifie que `AndroidManifest.xml` référence cette classe :
```xml
<application android:name=".TaladzApp" ...>
```

---

## Étape 2 — Architecture des modules Hilt dans Taladz

### 2.1 Vue d'ensemble des modules

```
SingletonComponent (durée de vie = Application)
├── UiModule         → ThemeRepository          (core-ui)
├── NetworkModule    → OkHttpClient, Retrofit, ApiService  (core-network — TP 06)
├── DatabaseModule   → AppDatabase, DAOs         (core-database — TP 09)
└── SecurityModule   → TokenManager              (core-security — TP 07)

ViewModelComponent (durée de vie = ViewModel, créé automatiquement)
├── ThemeViewModel   (@HiltViewModel)            (core-ui)
├── AuthViewModel    (@HiltViewModel)            (feature-account — TP 07)
├── CatalogViewModel (@HiltViewModel)            (feature-catalog — TP 08)
└── ReaderViewModel  (@HiltViewModel)            (feature-reader — TP 12)
```

### 2.2 Pourquoi `SingletonComponent` pour les repositories ?

Un repository comme `ThemeRepository` doit vivre **toute la durée de l'app** (pas créé/détruit à chaque écran). Donc `@InstallIn(SingletonComponent::class)` + `@Singleton`.

---

## Étape 3 — Refactoriser `ThemeRepository` avec Hilt proprement

### 3.1 Améliorer `UiModule.kt`

```kotlin
// core/core-ui/src/main/java/com/taladz/core/ui/di/UiModule.kt
package com.taladz.core.ui.di

import android.content.Context
import com.taladz.core.ui.theme.ThemeRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object UiModule {

    @Provides
    @Singleton
    fun provideThemeRepository(
        @ApplicationContext context: Context,
    ): ThemeRepository = ThemeRepository(context)
}
```

### 3.2 Annoter `ThemeRepository` pour l'injection directe

```kotlin
// core/core-ui/src/main/java/com/taladz/core/ui/theme/ThemeRepository.kt
package com.taladz.core.ui.theme

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.themeDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "taladz_theme"
)

private val THEME_KEY = stringPreferencesKey("selected_theme")

@Singleton
class ThemeRepository @Inject constructor(
    @ApplicationContext private val context: Context,
) {

    val themeFlow: Flow<TaladzTheme> = context.themeDataStore.data.map { prefs ->
        val name = prefs[THEME_KEY] ?: TaladzTheme.LIGHT.name
        runCatching { TaladzTheme.valueOf(name) }.getOrDefault(TaladzTheme.LIGHT)
    }

    suspend fun setTheme(theme: TaladzTheme) {
        context.themeDataStore.edit { prefs ->
            prefs[THEME_KEY] = theme.name
        }
    }
}
```

> Avec `@Inject constructor`, Hilt peut créer `ThemeRepository` **directement sans** passer par `UiModule`. Garde `UiModule` vide ou supprime-le si `@Inject constructor` suffit.

---

## Étape 4 — Créer un `SettingsRepository` pour pratiquer Hilt

Ce repository gère les préférences utilisateur (langue, taille de police, etc.).

### 4.1 Modèle des préférences

```kotlin
// core/core-common/src/main/java/com/taladz/core/common/model/UserPreferences.kt
package com.taladz.core.common.model

data class UserPreferences(
    val language: AppLanguage = AppLanguage.FRENCH,
    val fontSize: FontSize   = FontSize.MEDIUM,
    val keepScreenOn: Boolean = false,
)

enum class AppLanguage(val code: String, val nativeName: String) {
    FRENCH("fr", "Français"),
    ARABIC("ar", "العربية"),
    ENGLISH("en", "English"),
    TAMAZIGHT("tzm", "Tamaziɣt"),
}

enum class FontSize(val scale: Float, val label: String) {
    SMALL(0.85f, "Petit"),
    MEDIUM(1.0f, "Moyen"),
    LARGE(1.2f, "Grand"),
    EXTRA_LARGE(1.4f, "Très grand"),
}
```

### 4.2 `SettingsRepository.kt`

```kotlin
// core/core-ui/src/main/java/com/taladz/core/ui/settings/SettingsRepository.kt
package com.taladz.core.ui.settings

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.taladz.core.common.model.AppLanguage
import com.taladz.core.common.model.FontSize
import com.taladz.core.common.model.UserPreferences
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.settingsDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "taladz_settings"
)

@Singleton
class SettingsRepository @Inject constructor(
    @ApplicationContext private val context: Context,
) {

    private val LANGUAGE_KEY     = stringPreferencesKey("language")
    private val FONT_SCALE_KEY   = floatPreferencesKey("font_scale")
    private val KEEP_SCREEN_KEY  = booleanPreferencesKey("keep_screen_on")

    val preferencesFlow: Flow<UserPreferences> = context.settingsDataStore.data.map { prefs ->
        UserPreferences(
            language    = runCatching {
                AppLanguage.valueOf(prefs[LANGUAGE_KEY] ?: AppLanguage.FRENCH.name)
            }.getOrDefault(AppLanguage.FRENCH),
            fontSize    = FontSize.entries.firstOrNull { it.scale == prefs[FONT_SCALE_KEY] }
                ?: FontSize.MEDIUM,
            keepScreenOn = prefs[KEEP_SCREEN_KEY] ?: false,
        )
    }

    suspend fun setLanguage(language: AppLanguage) {
        context.settingsDataStore.edit { it[LANGUAGE_KEY] = language.name }
    }

    suspend fun setFontSize(fontSize: FontSize) {
        context.settingsDataStore.edit { it[FONT_SCALE_KEY] = fontSize.scale }
    }

    suspend fun setKeepScreenOn(enabled: Boolean) {
        context.settingsDataStore.edit { it[KEEP_SCREEN_KEY] = enabled }
    }
}
```

### 4.3 `SettingsViewModel.kt`

```kotlin
// core/core-ui/src/main/java/com/taladz/core/ui/settings/SettingsViewModel.kt
package com.taladz.core.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.taladz.core.common.model.AppLanguage
import com.taladz.core.common.model.FontSize
import com.taladz.core.common.model.UserPreferences
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val settingsRepository: SettingsRepository,
    private val themeRepository: ThemeRepository,
) : ViewModel() {

    val preferences: StateFlow<UserPreferences> = settingsRepository.preferencesFlow
        .stateIn(
            scope          = viewModelScope,
            started        = SharingStarted.WhileSubscribed(5_000),
            initialValue   = UserPreferences(),
        )

    val currentTheme: StateFlow<TaladzTheme> = themeRepository.themeFlow
        .stateIn(
            scope          = viewModelScope,
            started        = SharingStarted.WhileSubscribed(5_000),
            initialValue   = TaladzTheme.LIGHT,
        )

    fun setLanguage(language: AppLanguage) {
        viewModelScope.launch { settingsRepository.setLanguage(language) }
    }

    fun setFontSize(fontSize: FontSize) {
        viewModelScope.launch { settingsRepository.setFontSize(fontSize) }
    }

    fun setKeepScreenOn(enabled: Boolean) {
        viewModelScope.launch { settingsRepository.setKeepScreenOn(enabled) }
    }

    fun setTheme(theme: TaladzTheme) {
        viewModelScope.launch { themeRepository.setTheme(theme) }
    }
}
```

---

## Étape 5 — Créer l'écran Paramètres fonctionnel

### 5.1 `SettingsScreen.kt` complet

```kotlin
// app/src/main/java/com/taladz/app/screens/main/SettingsScreen.kt
package com.taladz.app.screens.main

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.taladz.core.common.model.AppLanguage
import com.taladz.core.common.model.FontSize
import com.taladz.core.ui.settings.SettingsViewModel
import com.taladz.core.ui.theme.TaladzTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel = hiltViewModel(),
) {
    val preferences by viewModel.preferences.collectAsStateWithLifecycle()
    val currentTheme by viewModel.currentTheme.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
    ) {
        TopAppBar(title = { Text("Paramètres · الإعدادات") })

        Spacer(modifier = Modifier.height(8.dp))

        // ── Section Thème ───────────────────────────────────────────────────
        SettingsSection(title = "Thème d'affichage") {
            SingleChoiceSegmentedButtonRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
            ) {
                TaladzTheme.entries.forEachIndexed { index, theme ->
                    SegmentedButton(
                        selected = currentTheme == theme,
                        onClick  = { viewModel.setTheme(theme) },
                        shape    = SegmentedButtonDefaults.itemShape(index, TaladzTheme.entries.size),
                        label    = { Text(theme.label) },
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // ── Section Langue ──────────────────────────────────────────────────
        SettingsSection(title = "Langue de l'interface") {
            AppLanguage.entries.forEach { language ->
                ListItem(
                    headlineContent = { Text(language.nativeName) },
                    trailingContent = {
                        Switch(
                            checked  = preferences.language == language,
                            onCheckedChange = { if (it) viewModel.setLanguage(language) },
                        )
                    },
                )
                HorizontalDivider()
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // ── Section Police ──────────────────────────────────────────────────
        SettingsSection(title = "Taille de police (lecture)") {
            SingleChoiceSegmentedButtonRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
            ) {
                FontSize.entries.forEachIndexed { index, size ->
                    SegmentedButton(
                        selected = preferences.fontSize == size,
                        onClick  = { viewModel.setFontSize(size) },
                        shape    = SegmentedButtonDefaults.itemShape(index, FontSize.entries.size),
                        label    = { Text(size.label) },
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // ── Section Lecture ─────────────────────────────────────────────────
        SettingsSection(title = "Options de lecture") {
            ListItem(
                headlineContent   = { Text("Garder l'écran allumé") },
                supportingContent = { Text("Désactive la mise en veille pendant la lecture") },
                trailingContent   = {
                    Switch(
                        checked         = preferences.keepScreenOn,
                        onCheckedChange = viewModel::setKeepScreenOn,
                    )
                },
            )
        }

        Spacer(modifier = Modifier.height(32.dp))
    }
}

@Composable
private fun SettingsSection(
    title: String,
    content: @Composable () -> Unit,
) {
    Text(
        text     = title,
        style    = MaterialTheme.typography.labelLarge,
        color    = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
    )
    Card(
        modifier  = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        colors    = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant,
        ),
    ) {
        content()
    }
}
```

### 5.2 Mettre à jour la navigation pour SettingsScreen avec Hilt

Dans `TaladzNavHost.kt`, remplace l'écran factice par le vrai :

```kotlin
// Dans navigation<MainGraph> { ... }
composable<SettingsScreen> {
    SettingsScreen()  // hiltViewModel() est appelé à l'intérieur
}
```

---

## Étape 6 — Comprendre `hiltViewModel()` vs `viewModels()`

```kotlin
// ✅ Dans une Activity ou un Fragment :
val viewModel: ThemeViewModel by viewModels()  // standard Android

// ✅ Dans un composable Compose avec Hilt :
val viewModel: SettingsViewModel = hiltViewModel()
// → Hilt injecte les dépendances automatiquement
// → Le ViewModel est scopé à la back stack entry (route actuelle)

// ✅ Partager un ViewModel entre composables d'un graphe imbriqué :
val viewModel: AuthViewModel = hiltViewModel(
    viewModelStoreOwner = navController.getBackStackEntry(AuthGraph)
)
// → Le ViewModel reste vivant tant qu'on est dans AuthGraph
```

---

## Étape 7 — Tests unitaires avec MockK

### 7.1 Tester `SettingsViewModel`

```kotlin
// core/core-ui/src/test/java/com/taladz/core/ui/SettingsViewModelTest.kt
package com.taladz.core.ui

import app.cash.turbine.test
import com.taladz.core.common.model.AppLanguage
import com.taladz.core.common.model.FontSize
import com.taladz.core.common.model.UserPreferences
import com.taladz.core.ui.settings.SettingsRepository
import com.taladz.core.ui.settings.SettingsViewModel
import com.taladz.core.ui.theme.TaladzTheme
import com.taladz.core.ui.theme.ThemeRepository
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SettingsViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var settingsRepository: SettingsRepository
    private lateinit var themeRepository: ThemeRepository
    private lateinit var viewModel: SettingsViewModel

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)

        settingsRepository = mockk(relaxed = true)
        themeRepository    = mockk(relaxed = true)

        every { settingsRepository.preferencesFlow } returns flowOf(UserPreferences())
        every { themeRepository.themeFlow } returns flowOf(TaladzTheme.LIGHT)

        viewModel = SettingsViewModel(settingsRepository, themeRepository)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `initial preferences are default`() = runTest {
        viewModel.preferences.test {
            val initial = awaitItem()
            assertEquals(AppLanguage.FRENCH, initial.language)
            assertEquals(FontSize.MEDIUM, initial.fontSize)
            assertEquals(false, initial.keepScreenOn)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `setLanguage calls repository`() = runTest {
        viewModel.setLanguage(AppLanguage.ARABIC)
        testDispatcher.scheduler.advanceUntilIdle()
        coVerify { settingsRepository.setLanguage(AppLanguage.ARABIC) }
    }

    @Test
    fun `setFontSize calls repository`() = runTest {
        viewModel.setFontSize(FontSize.LARGE)
        testDispatcher.scheduler.advanceUntilIdle()
        coVerify { settingsRepository.setFontSize(FontSize.LARGE) }
    }

    @Test
    fun `setTheme calls themeRepository`() = runTest {
        viewModel.setTheme(TaladzTheme.SEPIA)
        testDispatcher.scheduler.advanceUntilIdle()
        coVerify { themeRepository.setTheme(TaladzTheme.SEPIA) }
    }

    @Test
    fun `setKeepScreenOn enables screen lock`() = runTest {
        viewModel.setKeepScreenOn(true)
        testDispatcher.scheduler.advanceUntilIdle()
        coVerify { settingsRepository.setKeepScreenOn(true) }
    }
}
```

### 7.2 Tester avec Hilt (test d'intégration)

```kotlin
// app/src/androidTest/java/com/taladz/app/HiltViewModelTest.kt
package com.taladz.app

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.taladz.core.ui.settings.SettingsViewModel
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import javax.inject.Inject

@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class HiltViewModelTest {

    @get:Rule
    val hiltRule = HiltAndroidRule(this)

    @Inject
    lateinit var settingsRepository: com.taladz.core.ui.settings.SettingsRepository

    @Before
    fun init() {
        hiltRule.inject()
    }

    @Test
    fun settingsRepository_isInjected() {
        assert(::settingsRepository.isInitialized)
    }
}
```

Pour que le test Hilt fonctionne, ajoute dans `app/build.gradle.kts` :

```kotlin
androidTest {
    dependencies {
        implementation(libs.hilt.testing)
        ksp(libs.hilt.compiler)
    }
}
```

---

## Étape 8 — Pattern complet : Repository → ViewModel → UI

C'est l'architecture que tu répéteras dans **chaque feature** des TP suivants.

### Schéma de flux

```
DataStore / Room / Retrofit
    ↓ Flow<T> / suspend fun
Repository (Singleton, @Inject constructor)
    ↓ Flow<T>
ViewModel (@HiltViewModel, scope = ViewModelComponent)
    ↓ StateFlow<UiState>
Composable (collectAsStateWithLifecycle)
    ↓ UiState
UI (Text, Button, LazyColumn...)
    ↑ events (onClickBook, onSearch...)
    │
    └─→ ViewModel.onEvent() → Repository
```

### Règles à suivre

| Couche | Dépendances autorisées | Dépendances interdites |
|--------|------------------------|------------------------|
| Repository | DataStore, Room, Retrofit | ViewModel, Context UI, Compose |
| ViewModel | Repository uniquement | Context, Room direct, Retrofit direct |
| Composable | ViewModel (via hiltViewModel) | Repository direct |

---

## Étape 9 — Qualifier : plusieurs implémentations du même type

Parfois on a besoin de deux instances du même type. Exemple : un OkHttpClient authentifié et un non authentifié.

```kotlin
// ─── Définir les qualifiers ─────────────────────────────────────────────────
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class AuthenticatedClient

@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class UnauthenticatedClient

// ─── Fournir les deux instances ─────────────────────────────────────────────
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    @UnauthenticatedClient
    fun provideBaseOkHttpClient(): OkHttpClient =
        OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .build()

    @Provides
    @Singleton
    @AuthenticatedClient
    fun provideAuthOkHttpClient(
        @UnauthenticatedClient base: OkHttpClient,
        // tokenManager: TokenManager,  ← sera ajouté en TP 07
    ): OkHttpClient =
        base.newBuilder()
            // .addInterceptor(AuthInterceptor(tokenManager))
            .build()
}

// ─── Injecter le bon client ─────────────────────────────────────────────────
class BookRepository @Inject constructor(
    @AuthenticatedClient private val client: OkHttpClient,
)
```

Ce pattern sera utilisé en TP 06 et TP 07.

---

## Récapitulatif des fichiers créés / modifiés

```
core/core-common/src/main/java/com/taladz/core/common/model/
├── UserPreferences.kt          ← UserPreferences, AppLanguage, FontSize

core/core-ui/src/main/java/com/taladz/core/ui/
├── theme/
│   ├── ThemeRepository.kt      ← @Singleton @Inject constructor
│   └── ThemeViewModel.kt       ← @HiltViewModel (inchangé)
├── settings/
│   ├── SettingsRepository.kt   ← @Singleton, DataStore 2 fichiers
│   └── SettingsViewModel.kt    ← @HiltViewModel, 2 repos injectés
└── di/
    └── UiModule.kt             ← simplifié (ThemeRepository auto-injectable)

app/src/main/java/com/taladz/app/
├── TaladzApp.kt                ← @HiltAndroidApp (inchangé depuis TP 04)
├── MainActivity.kt             ← @AndroidEntryPoint (inchangé)
└── screens/main/
    └── SettingsScreen.kt       ← écran paramètres complet avec hiltViewModel()

app/src/androidTest/java/com/taladz/app/
└── HiltViewModelTest.kt        ← test d'intégration Hilt

core/core-ui/src/test/java/com/taladz/core/ui/
└── SettingsViewModelTest.kt    ← 5 tests unitaires MockK
```

---

## Points de contrôle — Checklist livrable

Avant de passer au TP 06, vérifie que :

- [ ] `./gradlew :app:assembleDebug` → BUILD SUCCESSFUL (Hilt compile sans erreur)
- [ ] L'écran Paramètres s'affiche avec les 3 sections (Thème, Langue, Police)
- [ ] Changer le thème depuis Paramètres change bien l'apparence de toute l'app
- [ ] Le thème persiste après fermeture et réouverture
- [ ] `./gradlew :core:core-ui:test` → tous les tests passent
- [ ] Pas d'erreur `@HiltAndroidApp not found` ni `Hilt components not generated`
- [ ] CI GitHub Actions verte

---

## Erreurs fréquentes Hilt

| Erreur | Cause | Solution |
|--------|-------|----------|
| `@HiltAndroidApp not found` | Application non annotée | Vérifier `TaladzApp.kt` et `AndroidManifest.xml` |
| `Hilt components were not generated` | KSP pas exécuté | `./gradlew clean build` |
| `Cannot inject into X` | X n'est pas `@AndroidEntryPoint` | Annoter Activity/Fragment |
| `Multiple binding`  | Deux `@Provides` pour le même type sans qualifier | Ajouter `@Named` ou qualifier personnalisé |
| `Circular dependency` | A dépend de B qui dépend de A | Restructurer → extraire une interface |

---

*TP 05 terminé. Prochain : TP 06 — Couche réseau Retrofit + OkHttp + Certificate Pinning.*
