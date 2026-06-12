# TP 03 — Thème Material 3, Polices Arabes et Support RTL

> **Durée estimée :** 8 heures sur 2 jours
> **Niveau :** Débutant
> **Prérequis :** TP 02 terminé (projet multi-modules compilant avec CI verte)

---

## Objectifs d'apprentissage

À la fin de ce TP, tu sauras :
- [ ] Créer un thème Material 3 personnalisé avec les couleurs Taladz
- [ ] Intégrer 3 polices arabes (Amiri, Cairo, Tajawal) via Google Fonts
- [ ] Activer le support RTL (Right-To-Left) dans le manifeste
- [ ] Construire un composant `AdaptiveText` qui change de police selon la langue
- [ ] Implémenter un switcher entre 3 thèmes : Clair, Sombre, Sépia
- [ ] Utiliser `DataStore Preferences` pour persister le choix de thème

---

## Concepts théoriques

### Material 3 et thème dynamique

Material Design 3 (M3) est le système de design de Google. Dans Compose, le thème se définit avec `MaterialTheme` qui fournit :
- `colorScheme` → palette de couleurs (primary, secondary, background, surface…)
- `typography` → styles de texte (displayLarge, bodyMedium…)
- `shapes` → formes des composants (rounded corners…)

Un thème M3 complet définit **deux schémas de couleur** : un clair (`lightColorScheme`) et un sombre (`darkColorScheme`).

### RTL (Right-To-Left)

L'arabe s'écrit de droite à gauche. Android gère ça automatiquement si tu :
1. Déclares `android:supportsRtl="true"` dans le manifeste
2. Utilises les attributs logiques (`start`/`end`) plutôt qu'absolus (`left`/`right`)
3. Dans Compose : `Arrangement.Start`, `Alignment.Start`, `padding(start = ...)` → automatiquement inversés en RTL

### DataStore Preferences

`DataStore Preferences` est le successeur de `SharedPreferences`. Il est :
- **Coroutine-based** : suspend functions et Flow
- **Type-safe** : clés typées (`Preferences.Key<T>`)
- **Non-blocking** : opérations asynchrones sur IO dispatcher

---

## Étape 1 — Ajouter les dépendances

### 1.1 Mettre à jour `libs.versions.toml`

```toml
# gradle/libs.versions.toml
[versions]
# ... versions existantes de TP 02 ...
datastore = "1.1.1"

[libraries]
# ... bibliothèques existantes ...
androidx-datastore-preferences = { group = "androidx.datastore", name = "datastore-preferences", version.ref = "datastore" }
```

### 1.2 Mettre à jour `core/core-ui/build.gradle.kts`

```kotlin
// core/core-ui/build.gradle.kts
plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.taladz.core.ui"
    compileSdk = 35

    defaultConfig {
        minSdk = 26
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { compose = true }
}

dependencies {
    api(platform(libs.compose.bom))
    api(libs.compose.ui)
    api(libs.compose.ui.graphics)
    api(libs.compose.material3)
    api(libs.compose.ui.tooling.preview)
    debugApi(libs.compose.ui.tooling)

    // DataStore pour persister le thème
    api(libs.androidx.datastore.preferences)
}
```

---

## Étape 2 — Créer la palette de couleurs Taladz

### 2.1 Structure des fichiers dans `core-ui`

```
core/core-ui/src/main/java/com/taladz/core/ui/
├── theme/
│   ├── Color.kt          ← palette de couleurs
│   ├── Type.kt           ← typographie
│   ├── Shape.kt          ← formes
│   ├── Theme.kt          ← point d'entrée du thème
│   └── AppTheme.kt       ← enum + logique de sélection
└── components/
    └── AdaptiveText.kt   ← composant texte bilingue
```

### 2.2 `Color.kt` — Palette Taladz

```kotlin
// core/core-ui/src/main/java/com/taladz/core/ui/theme/Color.kt
package com.taladz.core.ui.theme

import androidx.compose.ui.graphics.Color

// ─── Primaire — Vert émeraude (culture, savoir) ───────────────────────────────
val TaladzGreen10  = Color(0xFF002114)
val TaladzGreen20  = Color(0xFF004228)
val TaladzGreen30  = Color(0xFF00633D)
val TaladzGreen40  = Color(0xFF008552)
val TaladzGreen80  = Color(0xFF68DCA1)
val TaladzGreen90  = Color(0xFF8FF7BC)
val TaladzGreen95  = Color(0xFFBCFFD8)
val TaladzGreen99  = Color(0xFFF3FFF6)

// ─── Secondaire — Or (calligraphie, patrimoine) ────────────────────────────────
val TaladzGold10   = Color(0xFF221B00)
val TaladzGold20   = Color(0xFF443600)
val TaladzGold40   = Color(0xFF7A5F00)
val TaladzGold80   = Color(0xFFE8C333)
val TaladzGold90   = Color(0xFFFFF0A0)
val TaladzGold99   = Color(0xFFFFFBFF)

// ─── Tertiaire — Bordeaux ──────────────────────────────────────────────────────
val TaladzRed10    = Color(0xFF410001)
val TaladzRed40    = Color(0xFFBA1A1A)
val TaladzRed80    = Color(0xFFFFB4AB)
val TaladzRed90    = Color(0xFFFFDAD6)

// ─── Neutres ───────────────────────────────────────────────────────────────────
val TaladzNeutral10 = Color(0xFF1A1C19)
val TaladzNeutral20 = Color(0xFF2F312D)
val TaladzNeutral90 = Color(0xFFE2E3DD)
val TaladzNeutral95 = Color(0xFFF1F1EB)
val TaladzNeutral99 = Color(0xFFFBFBF5)

// ─── Sépia — thème lecture ────────────────────────────────────────────────────
val SepiaBackground = Color(0xFFF5ECD7)
val SepiaSurface    = Color(0xFFEDE0C8)
val SepiaOnSurface  = Color(0xFF3B2E1A)
val SepiaPrimary    = Color(0xFF6B4C1E)
```

### 2.3 `Type.kt` — Typographie avec polices arabes

```kotlin
// core/core-ui/src/main/java/com/taladz/core/ui/theme/Type.kt
package com.taladz.core.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.taladz.core.ui.R

// ─── Famille de polices latines (Lato) ────────────────────────────────────────
val LatoFamily = FontFamily(
    Font(R.font.lato_regular, FontWeight.Normal),
    Font(R.font.lato_bold, FontWeight.Bold),
    Font(R.font.lato_italic, FontWeight.Normal, FontStyle.Italic),
)

// ─── Famille de polices arabes — Tajawal (UI moderne) ────────────────────────
val TajawalFamily = FontFamily(
    Font(R.font.tajawal_regular, FontWeight.Normal),
    Font(R.font.tajawal_medium, FontWeight.Medium),
    Font(R.font.tajawal_bold, FontWeight.Bold),
)

// ─── Famille de polices arabes — Amiri (lecture) ─────────────────────────────
val AmiriFamily = FontFamily(
    Font(R.font.amiri_regular, FontWeight.Normal),
    Font(R.font.amiri_bold, FontWeight.Bold),
    Font(R.font.amiri_italic, FontWeight.Normal, FontStyle.Italic),
)

// ─── Famille de polices arabes — Cairo (titres) ───────────────────────────────
val CairoFamily = FontFamily(
    Font(R.font.cairo_regular, FontWeight.Normal),
    Font(R.font.cairo_semibold, FontWeight.SemiBold),
    Font(R.font.cairo_bold, FontWeight.Bold),
)

// ─── Typographie par défaut (latin) ──────────────────────────────────────────
val TaladzTypography = Typography(
    displayLarge  = TextStyle(fontFamily = LatoFamily, fontWeight = FontWeight.Normal, fontSize = 57.sp, lineHeight = 64.sp),
    displayMedium = TextStyle(fontFamily = LatoFamily, fontWeight = FontWeight.Normal, fontSize = 45.sp, lineHeight = 52.sp),
    displaySmall  = TextStyle(fontFamily = LatoFamily, fontWeight = FontWeight.Normal, fontSize = 36.sp, lineHeight = 44.sp),
    headlineLarge = TextStyle(fontFamily = LatoFamily, fontWeight = FontWeight.Normal, fontSize = 32.sp, lineHeight = 40.sp),
    headlineMedium= TextStyle(fontFamily = LatoFamily, fontWeight = FontWeight.Normal, fontSize = 28.sp, lineHeight = 36.sp),
    headlineSmall = TextStyle(fontFamily = LatoFamily, fontWeight = FontWeight.Normal, fontSize = 24.sp, lineHeight = 32.sp),
    titleLarge    = TextStyle(fontFamily = LatoFamily, fontWeight = FontWeight.Bold,   fontSize = 22.sp, lineHeight = 28.sp),
    titleMedium   = TextStyle(fontFamily = LatoFamily, fontWeight = FontWeight.Medium, fontSize = 16.sp, lineHeight = 24.sp),
    titleSmall    = TextStyle(fontFamily = LatoFamily, fontWeight = FontWeight.Medium, fontSize = 14.sp, lineHeight = 20.sp),
    bodyLarge     = TextStyle(fontFamily = LatoFamily, fontWeight = FontWeight.Normal, fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium    = TextStyle(fontFamily = LatoFamily, fontWeight = FontWeight.Normal, fontSize = 14.sp, lineHeight = 20.sp),
    bodySmall     = TextStyle(fontFamily = LatoFamily, fontWeight = FontWeight.Normal, fontSize = 12.sp, lineHeight = 16.sp),
    labelLarge    = TextStyle(fontFamily = LatoFamily, fontWeight = FontWeight.Medium, fontSize = 14.sp, lineHeight = 20.sp),
    labelMedium   = TextStyle(fontFamily = LatoFamily, fontWeight = FontWeight.Medium, fontSize = 12.sp, lineHeight = 16.sp),
    labelSmall    = TextStyle(fontFamily = LatoFamily, fontWeight = FontWeight.Medium, fontSize = 11.sp, lineHeight = 16.sp),
)

// ─── Typographie arabe ────────────────────────────────────────────────────────
val TaladzTypographyAr = TaladzTypography.copy(
    displayLarge  = TaladzTypography.displayLarge.copy(fontFamily = CairoFamily),
    displayMedium = TaladzTypography.displayMedium.copy(fontFamily = CairoFamily),
    displaySmall  = TaladzTypography.displaySmall.copy(fontFamily = CairoFamily),
    headlineLarge = TaladzTypography.headlineLarge.copy(fontFamily = CairoFamily),
    headlineMedium= TaladzTypography.headlineMedium.copy(fontFamily = CairoFamily),
    headlineSmall = TaladzTypography.headlineSmall.copy(fontFamily = CairoFamily),
    titleLarge    = TaladzTypography.titleLarge.copy(fontFamily = CairoFamily),
    titleMedium   = TaladzTypography.titleMedium.copy(fontFamily = TajawalFamily),
    titleSmall    = TaladzTypography.titleSmall.copy(fontFamily = TajawalFamily),
    bodyLarge     = TaladzTypography.bodyLarge.copy(fontFamily = TajawalFamily),
    bodyMedium    = TaladzTypography.bodyMedium.copy(fontFamily = TajawalFamily),
    bodySmall     = TaladzTypography.bodySmall.copy(fontFamily = TajawalFamily),
    labelLarge    = TaladzTypography.labelLarge.copy(fontFamily = TajawalFamily),
    labelMedium   = TaladzTypography.labelMedium.copy(fontFamily = TajawalFamily),
    labelSmall    = TaladzTypography.labelSmall.copy(fontFamily = TajawalFamily),
)
```

---

## Étape 3 — Télécharger les polices

### 3.1 Créer le dossier de ressources

Dans Android Studio, crée le répertoire :
```
core/core-ui/src/main/res/font/
```

### 3.2 Télécharger les polices depuis Google Fonts

Va sur [fonts.google.com](https://fonts.google.com) et télécharge :

**Tajawal** (UI arabe moderne) :
- `Tajawal-Regular.ttf` → renommer en `tajawal_regular.ttf`
- `Tajawal-Medium.ttf` → `tajawal_medium.ttf`
- `Tajawal-Bold.ttf` → `tajawal_bold.ttf`

**Amiri** (lecture de livres arabes, plus classique) :
- `Amiri-Regular.ttf` → `amiri_regular.ttf`
- `Amiri-Bold.ttf` → `amiri_bold.ttf`
- `Amiri-Italic.ttf` → `amiri_italic.ttf`

**Cairo** (titres arabes) :
- `Cairo-Regular.ttf` → `cairo_regular.ttf`
- `Cairo-SemiBold.ttf` → `cairo_semibold.ttf`
- `Cairo-Bold.ttf` → `cairo_bold.ttf`

**Lato** (latin) :
- `Lato-Regular.ttf` → `lato_regular.ttf`
- `Lato-Bold.ttf` → `lato_bold.ttf`
- `Lato-Italic.ttf` → `lato_italic.ttf`

Place tous ces fichiers dans `core/core-ui/src/main/res/font/`.

> **Note :** Android exige que les noms de fichiers de polices soient en minuscules avec uniquement des lettres, chiffres et underscores.

---

## Étape 4 — Créer les schémas de couleur

### 4.1 `Theme.kt` — Schémas clair et sombre

```kotlin
// core/core-ui/src/main/java/com/taladz/core/ui/theme/Theme.kt
package com.taladz.core.ui.theme

import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme

val TaladzLightColorScheme = lightColorScheme(
    primary          = TaladzGreen40,
    onPrimary        = TaladzGreen99,
    primaryContainer = TaladzGreen90,
    onPrimaryContainer = TaladzGreen10,
    secondary        = TaladzGold40,
    onSecondary      = TaladzGold99,
    secondaryContainer = TaladzGold90,
    onSecondaryContainer = TaladzGold10,
    error            = TaladzRed40,
    onError          = Color.White,
    errorContainer   = TaladzRed90,
    onErrorContainer = TaladzRed10,
    background       = TaladzNeutral99,
    onBackground     = TaladzNeutral10,
    surface          = TaladzNeutral99,
    onSurface        = TaladzNeutral10,
    surfaceVariant   = TaladzNeutral95,
    onSurfaceVariant = TaladzNeutral20,
    outline          = TaladzNeutral20,
)

val TaladzDarkColorScheme = darkColorScheme(
    primary          = TaladzGreen80,
    onPrimary        = TaladzGreen20,
    primaryContainer = TaladzGreen30,
    onPrimaryContainer = TaladzGreen90,
    secondary        = TaladzGold80,
    onSecondary      = TaladzGold20,
    secondaryContainer = TaladzGold40,
    onSecondaryContainer = TaladzGold90,
    error            = TaladzRed80,
    onError          = TaladzRed10,
    errorContainer   = TaladzRed40,
    onErrorContainer = TaladzRed90,
    background       = TaladzNeutral10,
    onBackground     = TaladzNeutral90,
    surface          = TaladzNeutral10,
    onSurface        = TaladzNeutral90,
    surfaceVariant   = TaladzNeutral20,
    onSurfaceVariant = TaladzNeutral90,
    outline          = TaladzNeutral90,
)

val TaladzSepiaColorScheme = lightColorScheme(
    primary          = SepiaPrimary,
    onPrimary        = Color.White,
    primaryContainer = SepiaSurface,
    onPrimaryContainer = SepiaOnSurface,
    secondary        = TaladzGold40,
    onSecondary      = TaladzGold99,
    secondaryContainer = TaladzGold90,
    onSecondaryContainer = TaladzGold10,
    background       = SepiaBackground,
    onBackground     = SepiaOnSurface,
    surface          = SepiaSurface,
    onSurface        = SepiaOnSurface,
    surfaceVariant   = SepiaBackground,
    onSurfaceVariant = SepiaOnSurface,
)
```

> **Import manquant :** Ajoute `import androidx.compose.ui.graphics.Color` dans `Theme.kt` pour la ligne `Color.White`.

---

## Étape 5 — Enum et logique de thème

### 5.1 `AppTheme.kt`

```kotlin
// core/core-ui/src/main/java/com/taladz/core/ui/theme/AppTheme.kt
package com.taladz.core.ui.theme

import android.content.Context
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalConfiguration
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

// ─── Enum des thèmes disponibles ─────────────────────────────────────────────
enum class TaladzTheme(val label: String, val labelAr: String) {
    LIGHT("Clair", "فاتح"),
    DARK("Sombre", "داكن"),
    SEPIA("Sépia", "سيبيا"),
}

// ─── DataStore singleton ──────────────────────────────────────────────────────
private val Context.themeDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "taladz_theme"
)

private val THEME_KEY = stringPreferencesKey("selected_theme")

// ─── Repository pour le thème ─────────────────────────────────────────────────
class ThemeRepository(private val context: Context) {

    val themeFlow: Flow<TaladzTheme> = context.themeDataStore.data.map { prefs ->
        val name = prefs[THEME_KEY] ?: TaladzTheme.LIGHT.name
        TaladzTheme.valueOf(name)
    }

    suspend fun setTheme(theme: TaladzTheme) {
        context.themeDataStore.edit { prefs ->
            prefs[THEME_KEY] = theme.name
        }
    }
}

// ─── Composable principal du thème ───────────────────────────────────────────
@Composable
fun TaladzThemeWrapper(
    theme: TaladzTheme = TaladzTheme.LIGHT,
    content: @Composable () -> Unit,
) {
    val locale = LocalConfiguration.current.locales[0]
    val isArabic = locale.language == "ar"

    val colorScheme = when (theme) {
        TaladzTheme.LIGHT -> TaladzLightColorScheme
        TaladzTheme.DARK  -> TaladzDarkColorScheme
        TaladzTheme.SEPIA -> TaladzSepiaColorScheme
    }

    val typography: Typography = if (isArabic) TaladzTypographyAr else TaladzTypography

    MaterialTheme(
        colorScheme = colorScheme,
        typography  = typography,
        content     = content,
    )
}
```

---

## Étape 6 — Composant `AdaptiveText`

Ce composant affiche automatiquement la bonne police selon la langue du texte.

```kotlin
// core/core-ui/src/main/java/com/taladz/core/ui/components/AdaptiveText.kt
package com.taladz.core.ui.components

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import com.taladz.core.ui.theme.AmiriFamily
import com.taladz.core.ui.theme.CairoFamily
import com.taladz.core.ui.theme.TajawalFamily

// Détecte si un texte contient des caractères arabes
private fun String.containsArabic(): Boolean =
    any { c -> c.code in 0x0600..0x06FF || c.code in 0xFB50..0xFDFF || c.code in 0xFE70..0xFEFF }

/**
 * Composant texte qui sélectionne automatiquement la police selon la langue.
 * - Arabe → Tajawal (corps) ou Cairo (titre) ou Amiri (lecture)
 * - Latin → police définie dans le thème
 *
 * @param text       Le texte à afficher
 * @param isTitle    true = police titre (Cairo en arabe), false = police corps (Tajawal)
 * @param isReading  true = police lecture (Amiri en arabe, serif en latin)
 */
@Composable
fun AdaptiveText(
    text: String,
    modifier: Modifier = Modifier,
    style: TextStyle = MaterialTheme.typography.bodyMedium,
    isTitle: Boolean = false,
    isReading: Boolean = false,
    color: Color = Color.Unspecified,
    fontWeight: FontWeight? = null,
    maxLines: Int = Int.MAX_VALUE,
    overflow: TextOverflow = TextOverflow.Clip,
    textAlign: TextAlign? = null,
) {
    val adaptedStyle = if (text.containsArabic()) {
        val arabicFamily = when {
            isReading -> AmiriFamily
            isTitle   -> CairoFamily
            else      -> TajawalFamily
        }
        style.copy(fontFamily = arabicFamily)
    } else {
        style
    }

    Text(
        text       = text,
        modifier   = modifier,
        style      = if (fontWeight != null) adaptedStyle.copy(fontWeight = fontWeight) else adaptedStyle,
        color      = color,
        maxLines   = maxLines,
        overflow   = overflow,
        textAlign  = textAlign,
    )
}
```

---

## Étape 7 — Activer le RTL dans le manifeste

### 7.1 Modifier `app/src/main/AndroidManifest.xml`

```xml
<application
    android:name=".TaladzApp"
    android:allowBackup="true"
    android:icon="@mipmap/ic_launcher"
    android:label="@string/app_name"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:supportsRtl="true"
    android:theme="@style/Theme.Taladz"
    tools:targetApi="34">
    <!-- ... activités ... -->
</application>
```

La clé est **`android:supportsRtl="true"`**. Sans cette ligne, même si Compose gère le RTL, certains composants natifs ne se retourneront pas.

---

## Étape 8 — Créer le `ThemeViewModel`

### 8.1 Ajouter Hilt à `core-ui`

Pour utiliser `@HiltViewModel` dans `core-ui`, ajoute d'abord Hilt au module :

```kotlin
// core/core-ui/build.gradle.kts — ajouter dans les plugins
alias(libs.plugins.hilt)
alias(libs.plugins.ksp)

// dans les dependencies
implementation(libs.hilt.android)
ksp(libs.hilt.compiler)
```

### 8.2 `ThemeViewModel.kt`

```kotlin
// core/core-ui/src/main/java/com/taladz/core/ui/theme/ThemeViewModel.kt
package com.taladz.core.ui.theme

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ThemeViewModel @Inject constructor(
    private val repository: ThemeRepository,
) : ViewModel() {

    val currentTheme: StateFlow<TaladzTheme> = repository.themeFlow
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = TaladzTheme.LIGHT,
        )

    fun setTheme(theme: TaladzTheme) {
        viewModelScope.launch {
            repository.setTheme(theme)
        }
    }
}
```

### 8.3 Fournir `ThemeRepository` via Hilt

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

---

## Étape 9 — Intégrer le thème dans `MainActivity`

### 9.1 Modifier `app/src/main/java/com/taladz/app/MainActivity.kt`

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
import com.taladz.core.ui.theme.TaladzTheme
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
                ThemePreviewScreen(
                    currentTheme = currentTheme,
                    onThemeChange = themeViewModel::setTheme,
                )
            }
        }
    }
}
```

---

## Étape 10 — Créer l'écran de prévisualisation des thèmes

Cet écran est le **livrable** de ce TP. Il permet de tester les 3 thèmes et le support RTL.

### 10.1 `ThemePreviewScreen.kt`

```kotlin
// app/src/main/java/com/taladz/app/ThemePreviewScreen.kt
package com.taladz.app

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.taladz.core.ui.components.AdaptiveText
import com.taladz.core.ui.theme.TaladzTheme

@Composable
fun ThemePreviewScreen(
    currentTheme: TaladzTheme,
    onThemeChange: (TaladzTheme) -> Unit,
) {
    Scaffold { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(modifier = Modifier.height(24.dp))

            // ── Titre bilingue ──────────────────────────────────────────────
            AdaptiveText(
                text = "Taladz",
                style = MaterialTheme.typography.displaySmall,
                isTitle = true,
                color = MaterialTheme.colorScheme.primary,
            )
            AdaptiveText(
                text = "طالدز",
                style = MaterialTheme.typography.displaySmall,
                isTitle = true,
                color = MaterialTheme.colorScheme.primary,
            )

            Spacer(modifier = Modifier.height(16.dp))

            // ── Sélecteur de thème ─────────────────────────────────────────
            Text(
                text = "Choisir le thème",
                style = MaterialTheme.typography.titleMedium,
            )
            Spacer(modifier = Modifier.height(8.dp))
            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                TaladzTheme.entries.forEachIndexed { index, theme ->
                    SegmentedButton(
                        selected = currentTheme == theme,
                        onClick  = { onThemeChange(theme) },
                        shape    = SegmentedButtonDefaults.itemShape(index, TaladzTheme.entries.size),
                        label    = { Text(theme.label) },
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // ── Aperçu d'une carte de livre ────────────────────────────────
            BookPreviewCard()

            Spacer(modifier = Modifier.height(24.dp))

            // ── Aperçu typographie ─────────────────────────────────────────
            TypographyPreview()
        }
    }
}

@Composable
private fun BookPreviewCard() {
    Card(
        modifier  = Modifier.fillMaxWidth(),
        colors    = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            AdaptiveText(
                text      = "نجمة — Nedjma",
                style     = MaterialTheme.typography.titleLarge,
                isTitle   = true,
                color     = MaterialTheme.colorScheme.onSurface,
            )
            Spacer(modifier = Modifier.height(8.dp))
            AdaptiveText(
                text  = "كاتب ياسين — Kateb Yacine",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(modifier = Modifier.height(8.dp))
            AdaptiveText(
                text      = "رواية جزائرية كلاسيكية تستكشف هوية الشخصية العربية الأمازيغية",
                style     = MaterialTheme.typography.bodySmall,
                isReading = true,
                color     = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(modifier = Modifier.height(16.dp))
            Row(
                modifier          = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
            ) {
                Button(onClick = {}) {
                    Text("قراءة / Lire")
                }
            }
        }
    }
}

@Composable
private fun TypographyPreview() {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape    = MaterialTheme.shapes.medium,
        color    = MaterialTheme.colorScheme.primaryContainer,
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Display", style = MaterialTheme.typography.displaySmall)
            Text("Headline", style = MaterialTheme.typography.headlineMedium)
            Text("Title", style = MaterialTheme.typography.titleLarge)
            Text("Body Large", style = MaterialTheme.typography.bodyLarge)
            Text("Body Medium", style = MaterialTheme.typography.bodyMedium)
            Text("Label", style = MaterialTheme.typography.labelMedium)
        }
    }
}
```

---

## Étape 11 — Vérifications et tests RTL

### 11.1 Tester en arabe sur l'émulateur

Pour simuler l'arabe sans changer la langue système :

1. Dans l'émulateur : **Settings → System → Language → Add Arabic**
2. Ou en ligne de commande :
```bash
adb shell settings put system system_locales ar
adb shell am start -a android.intent.action.REBOOT
```

Pour revenir au français :
```bash
adb shell settings put system system_locales fr-FR
```

### 11.2 Vérifier le RTL dans Layout Inspector

Dans Android Studio :
1. Lance l'app sur l'émulateur avec la locale arabe
2. **View → Tool Windows → Layout Inspector**
3. Vérifie que les textes arabes sont alignés à droite (`textDirection = RTL`)

### 11.3 Test unitaire du `ThemeViewModel`

```kotlin
// core/core-ui/src/test/java/com/taladz/core/ui/ThemeViewModelTest.kt
package com.taladz.core.ui

import app.cash.turbine.test
import com.taladz.core.ui.theme.TaladzTheme
import com.taladz.core.ui.theme.ThemeRepository
import com.taladz.core.ui.theme.ThemeViewModel
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class ThemeViewModelTest {

    private lateinit var repository: ThemeRepository
    private lateinit var viewModel: ThemeViewModel

    @Before
    fun setUp() {
        repository = mockk(relaxed = true)
        every { repository.themeFlow } returns flowOf(TaladzTheme.LIGHT)
        viewModel = ThemeViewModel(repository)
    }

    @Test
    fun `initial theme is LIGHT`() = runTest {
        viewModel.currentTheme.test {
            assertEquals(TaladzTheme.LIGHT, awaitItem())
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `setTheme calls repository`() = runTest {
        viewModel.setTheme(TaladzTheme.DARK)
        coVerify { repository.setTheme(TaladzTheme.DARK) }
    }

    @Test
    fun `setTheme sepia calls repository with SEPIA`() = runTest {
        viewModel.setTheme(TaladzTheme.SEPIA)
        coVerify { repository.setTheme(TaladzTheme.SEPIA) }
    }
}
```

### 11.4 Ajouter les dépendances de test dans `core-ui`

```kotlin
// core/core-ui/build.gradle.kts — section testImplementation
testImplementation("junit:junit:4.13.2")
testImplementation("io.mockk:mockk:1.13.13")
testImplementation("app.cash.turbine:turbine:1.2.0")
testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.9.0")
```

Ajoute ces versions dans `libs.versions.toml` :

```toml
[versions]
mockk = "1.13.13"
turbine = "1.2.0"
coroutines-test = "1.9.0"

[libraries]
test-mockk = { group = "io.mockk", name = "mockk", version.ref = "mockk" }
test-turbine = { group = "app.cash.turbine", name = "turbine", version.ref = "turbine" }
test-coroutines = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-test", version.ref = "coroutines-test" }
```

---

## Récapitulatif des fichiers créés / modifiés

```
core/core-ui/
├── build.gradle.kts                              ← +datastore, +hilt, +ksp
└── src/main/
    ├── res/font/
    │   ├── lato_regular.ttf, lato_bold.ttf, lato_italic.ttf
    │   ├── tajawal_regular.ttf, tajawal_medium.ttf, tajawal_bold.ttf
    │   ├── amiri_regular.ttf, amiri_bold.ttf, amiri_italic.ttf
    │   └── cairo_regular.ttf, cairo_semibold.ttf, cairo_bold.ttf
    └── java/com/taladz/core/ui/
        ├── theme/
        │   ├── Color.kt          ← palette Taladz + sépia
        │   ├── Type.kt           ← Lato + Tajawal + Amiri + Cairo
        │   ├── Theme.kt          ← schémas light/dark/sepia
        │   ├── AppTheme.kt       ← enum + ThemeRepository + TaladzThemeWrapper
        │   └── ThemeViewModel.kt ← StateFlow + setTheme()
        ├── di/
        │   └── UiModule.kt       ← @Provides ThemeRepository
        └── components/
            └── AdaptiveText.kt   ← auto-détection arabe/latin

app/
├── src/main/
│   ├── AndroidManifest.xml       ← +supportsRtl="true"
│   ├── MainActivity.kt           ← collecte thème + TaladzThemeWrapper
│   └── ThemePreviewScreen.kt     ← livrable : aperçu 3 thèmes + RTL
└── build.gradle.kts              ← +hilt (déjà fait en TP 02)

gradle/
└── libs.versions.toml            ← +datastore, +mockk, +turbine, +coroutines-test
```

---

## Points de contrôle — Checklist livrable

Avant de passer au TP 04, vérifie que :

- [ ] `./gradlew :core:core-ui:assembleDebug` → BUILD SUCCESSFUL
- [ ] L'app affiche 3 boutons (Clair / Sombre / Sépia) fonctionnels
- [ ] En arabe, la police change bien (Tajawal pour le corps, Cairo pour les titres)
- [ ] En arabe, le layout est bien RTL (textes alignés à droite)
- [ ] Le thème persiste après fermeture et réouverture de l'app
- [ ] `./gradlew :core:core-ui:test` → 3 tests passent
- [ ] CI GitHub Actions verte

---

## Pour aller plus loin (hors TP)

- **Dynamic Color** : Material 3 peut générer une palette depuis le fond d'écran de l'utilisateur (`dynamicLightColorScheme(context)`) — activable sur Android 12+
- **WindowSizeClass** : adapter le layout en mode paysage (tablette Kindle)
- **LocaleManager** : changer la langue in-app sans redémarrer l'activité (Android 13+ `setApplicationLocales`)

---

*TP 03 terminé. Prochain : TP 04 — Navigation Compose entre écrans.*
