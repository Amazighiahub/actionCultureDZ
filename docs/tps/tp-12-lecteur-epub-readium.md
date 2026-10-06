# TP 12 — Lecteur EPUB avec Readium Kotlin Toolkit

> **Durée estimée :** 14 heures sur 3-4 jours
> **Niveau :** Avancé
> **Prérequis :** TP 11 terminé (téléchargement + chiffrement EPUB fonctionnels)

---

## Objectifs d'apprentissage

À la fin de ce TP, tu sauras :
- [ ] Intégrer le SDK Readium Kotlin Toolkit dans le projet multi-modules
- [ ] Ouvrir un fichier EPUB chiffré depuis le stockage local
- [ ] Implémenter la navigation (pages suivante/précédente, table des matières)
- [ ] Personnaliser l'affichage : police, taille, interligne, thème (clair/sombre/sépia)
- [ ] Sauvegarder et restaurer la position de lecture (CFI — Canonical Fragment Identifier)
- [ ] Gérer les polices arabes dans le lecteur

---

## Concepts théoriques

### Readium Kotlin Toolkit

Readium est un standard international pour les lecteurs d'ebooks (Kindle, Kobo l'utilisent). Le SDK Kotlin comprend :

```
readium-shared    → modèles communs (Publication, Locator, Link...)
readium-streamer  → parse EPUB et sert le contenu
readium-navigator → composant d'affichage (EpubNavigatorFragment)
readium-lcp       → DRM LCP (pas utilisé ici, on a notre propre chiffrement)
```

### CFI (Canonical Fragment Identifier)

C'est un système d'adresse standardisé pour pointer vers n'importe quelle position dans un EPUB :

```
epubcfi(/6/4!/4/2/1:23)
  └── chapitre 2, paragraphe 4, offset 23 caractères
```

On sauvegarde le CFI à chaque changement de page → restauration précise à l'ouverture suivante.

### Intégration du chiffrement maison avec Readium

Readium ne connaît pas notre chiffrement AES-256. Il faut lui fournir un `ContentProtection` personnalisé qui intercepte les lectures de fichiers et les déchiffre à la volée.

---

## Étape 1 — Ajouter Readium

### 1.1 `libs.versions.toml`

```toml
[versions]
readium = "3.1.0"

[libraries]
readium-shared    = { group = "org.readium.kotlin-toolkit", name = "readium-shared",             version.ref = "readium" }
readium-streamer  = { group = "org.readium.kotlin-toolkit", name = "readium-streamer",           version.ref = "readium" }
readium-navigator = { group = "org.readium.kotlin-toolkit", name = "readium-navigator",          version.ref = "readium" }
readium-adapter-glide = { group = "org.readium.kotlin-toolkit", name = "readium-adapter-glide", version.ref = "readium" }
```

### 1.2 Ajouter le dépôt Maven JitPack dans `settings.gradle.kts`

```kotlin
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }  // ← pour Readium
    }
}
```

### 1.3 `feature/feature-reader/build.gradle.kts`

```kotlin
plugins {
    id("feature")  // convention plugin
}

android {
    namespace = "com.taladz.feature.reader"
    // Readium utilise Java 8 streams
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        isCoreLibraryDesugaringEnabled = true
    }
}

dependencies {
    implementation(project(":core:core-network"))
    implementation(project(":core:core-database"))
    implementation(project(":core:core-security"))
    implementation(project(":data:data-reader"))

    // Readium
    implementation(libs.readium.shared)
    implementation(libs.readium.streamer)
    implementation(libs.readium.navigator)
    implementation(libs.readium.adapter.glide)

    // Desugaring (requis par Readium pour Java 8 sur API < 26)
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}
```

### 1.4 Ajouter dans `gradle/libs.versions.toml`

```kotlin
// dans app/build.gradle.kts aussi :
compileOptions {
    isCoreLibraryDesugaringEnabled = true
}
dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}
```

---

## Étape 2 — Initialiser Readium dans `TaladzApp`

```kotlin
// app/src/main/java/com/taladz/app/TaladzApp.kt
package com.taladz.app

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import coil3.ImageLoader
import coil3.SingletonImageLoader
import dagger.hilt.android.HiltAndroidApp
import org.readium.r2.shared.util.http.DefaultHttpClient
import org.readium.r2.streamer.Readium
import javax.inject.Inject

@HiltAndroidApp
class TaladzApp : Application(), Configuration.Provider, SingletonImageLoader.Factory {

    @Inject lateinit var workerFactory: HiltWorkerFactory

    // Instance Readium partagée dans toute l'app
    lateinit var readium: Readium
        private set

    override fun onCreate() {
        super.onCreate()
        readium = Readium(this)
    }

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()

    override fun newImageLoader(context: coil3.PlatformContext): ImageLoader {
        // ... implémentation inchangée du TP 08 ...
        return ImageLoader.Builder(context).build()
    }
}
```

---

## Étape 3 — `ContentProtection` personnalisé pour le chiffrement AES

Readium doit pouvoir déchiffrer nos fichiers `.epub.enc` à la volée.

```kotlin
// feature/feature-reader/src/main/java/com/taladz/feature/reader/crypto/TaladzContentProtection.kt
package com.taladz.feature.reader.crypto

import android.app.Application
import com.taladz.core.security.crypto.EpubCryptoManager
import org.readium.r2.shared.util.AbsoluteUrl
import org.readium.r2.shared.util.Error
import org.readium.r2.shared.util.Try
import org.readium.r2.shared.util.asset.Asset
import org.readium.r2.shared.util.asset.ContainerAsset
import org.readium.r2.shared.util.asset.ResourceAsset
import org.readium.r2.shared.util.data.Container
import org.readium.r2.shared.util.data.DecoderError
import org.readium.r2.shared.util.data.decodeByteArray
import org.readium.r2.shared.util.format.Format
import org.readium.r2.shared.util.resource.Resource
import org.readium.r2.shared.util.resource.TransformingResource
import org.readium.r2.streamer.ContentProtection
import org.readium.r2.streamer.PublicationOpener
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream

class TaladzContentProtection(
    private val cryptoManager: EpubCryptoManager,
) : ContentProtection {

    override val scheme: ContentProtection.Scheme =
        ContentProtection.Scheme("https://taladz.com/drm")

    override suspend fun open(
        asset              : Asset,
        credentials        : String?,
        allowUserInteraction: Boolean,
        sender             : Any?,
    ): Try<ContentProtection.OpenResult, ContentProtection.OpenError> {

        // Déchiffrer l'asset complet si c'est un fichier .epub.enc
        val decryptedAsset = when (asset) {
            is ResourceAsset -> decryptResourceAsset(asset)
            else             -> asset
        }

        return Try.success(
            ContentProtection.OpenResult(
                asset            = decryptedAsset,
                onCreatePublication = {},
            )
        )
    }

    private suspend fun decryptResourceAsset(asset: ResourceAsset): Asset {
        // Lire le fichier chiffré
        val encryptedBytes = asset.resource.read().getOrElse { return asset }

        // Déchiffrer en mémoire
        val decryptedBytes = try {
            val input  = ByteArrayInputStream(encryptedBytes)
            val output = ByteArrayOutputStream()
            cryptoManager.decryptStream(input, output)
            output.toByteArray()
        } catch (e: Exception) {
            return asset  // Si déchiffrement échoue, retourner l'asset original
        }

        // Retourner un asset avec les données déchiffrées
        return ResourceAsset(
            format   = Format.EPUB,
            resource = object : Resource {
                override val sourceUrl: AbsoluteUrl? = asset.resource.sourceUrl

                override suspend fun read(range: LongRange?): Try<ByteArray, Resource.ReadError> =
                    Try.success(
                        if (range != null) {
                            decryptedBytes.copyOfRange(
                                range.first.toInt(),
                                minOf(range.last.toInt() + 1, decryptedBytes.size)
                            )
                        } else {
                            decryptedBytes
                        }
                    )

                override suspend fun close() {}
            },
        )
    }
}
```

---

## Étape 4 — Entité et DAO pour la position de lecture

### 4.1 `ReadingPositionEntity.kt`

```kotlin
// core/core-database/src/main/java/com/taladz/core/database/entity/ReadingPositionEntity.kt
package com.taladz.core.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "reading_positions")
data class ReadingPositionEntity(
    @PrimaryKey
    @ColumnInfo(name = "id_oeuvre")
    val idOeuvre       : Int,

    @ColumnInfo(name = "locator_json")
    val locatorJson    : String,       // JSON sérialisé du Locator Readium

    @ColumnInfo(name = "progression")
    val progression    : Double = 0.0, // 0.0 à 1.0 (pourcentage du livre)

    @ColumnInfo(name = "chapter_title")
    val chapterTitle   : String? = null,

    @ColumnInfo(name = "last_read_at")
    val lastReadAt     : Long = System.currentTimeMillis(),
)
```

### 4.2 `ReadingPositionDao.kt`

```kotlin
// core/core-database/src/main/java/com/taladz/core/database/dao/ReadingPositionDao.kt
package com.taladz.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.taladz.core.database.entity.ReadingPositionEntity

@Dao
interface ReadingPositionDao {

    @Query("SELECT * FROM reading_positions WHERE id_oeuvre = :bookId")
    suspend fun getPosition(bookId: Int): ReadingPositionEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun savePosition(position: ReadingPositionEntity)

    @Query("DELETE FROM reading_positions WHERE id_oeuvre = :bookId")
    suspend fun deletePosition(bookId: Int)
}
```

---

## Étape 5 — `ReaderRepository`

```kotlin
// data/data-reader/src/main/java/com/taladz/data/reader/repository/ReaderRepository.kt
package com.taladz.data.reader.repository

import android.app.Application
import com.taladz.app.TaladzApp
import com.taladz.core.database.dao.DownloadDao
import com.taladz.core.database.dao.ReadingPositionDao
import com.taladz.core.database.entity.ReadingPositionEntity
import com.taladz.core.security.crypto.EpubCryptoManager
import com.taladz.feature.reader.crypto.TaladzContentProtection
import org.readium.r2.shared.util.AbsoluteUrl
import org.readium.r2.shared.util.Url
import org.readium.r2.shared.util.asset.FileAsset
import org.readium.r2.shared.util.getOrElse
import org.readium.r2.streamer.PublicationOpener
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ReaderRepository @Inject constructor(
    private val application          : Application,
    private val downloadDao          : DownloadDao,
    private val readingPositionDao   : ReadingPositionDao,
    private val cryptoManager        : EpubCryptoManager,
) {

    private val readium by lazy { (application as TaladzApp).readium }

    suspend fun openBook(bookId: Int): ReaderResult {
        val filePath = downloadDao.getFilePath(bookId)
            ?: return ReaderResult.Error("Livre non téléchargé")

        val file = File(filePath)
        if (!file.exists()) return ReaderResult.Error("Fichier introuvable")

        val fileUrl = AbsoluteUrl(file.toURI().toString())
            ?: return ReaderResult.Error("URL de fichier invalide")

        val asset = readium.assetRetriever.retrieve(
            url    = fileUrl,
            mediaType = null,
        ).getOrElse {
            return ReaderResult.Error("Impossible de lire le fichier : ${it.message}")
        }

        val opener = PublicationOpener(
            publicationParser     = readium.publicationParser,
            contentProtections    = listOf(TaladzContentProtection(cryptoManager)),
        )

        val publication = opener.open(
            asset               = asset,
            allowUserInteraction = false,
        ).getOrElse {
            return ReaderResult.Error("Impossible d'ouvrir l'EPUB : ${it.message}")
        }

        val savedPosition = readingPositionDao.getPosition(bookId)

        return ReaderResult.Success(
            publication    = publication,
            savedPosition  = savedPosition?.locatorJson,
        )
    }

    suspend fun savePosition(bookId: Int, locatorJson: String, progression: Double, chapterTitle: String?) {
        readingPositionDao.savePosition(
            ReadingPositionEntity(
                idOeuvre     = bookId,
                locatorJson  = locatorJson,
                progression  = progression,
                chapterTitle = chapterTitle,
            )
        )
    }

    suspend fun getSavedPosition(bookId: Int): ReadingPositionEntity? =
        readingPositionDao.getPosition(bookId)
}

sealed class ReaderResult {
    data class Success(
        val publication   : org.readium.r2.shared.publication.Publication,
        val savedPosition : String? = null,
    ) : ReaderResult()
    data class Error(val message: String) : ReaderResult()
}
```

---

## Étape 6 — `ReaderViewModel`

```kotlin
// feature/feature-reader/src/main/java/com/taladz/feature/reader/ReaderViewModel.kt
package com.taladz.feature.reader

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.taladz.core.ui.theme.TaladzTheme
import com.taladz.core.ui.theme.ThemeRepository
import com.taladz.data.reader.repository.ReaderRepository
import com.taladz.data.reader.repository.ReaderResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.readium.r2.shared.publication.Publication
import org.readium.r2.shared.publication.epub.EpubLayout
import javax.inject.Inject

data class ReaderUiState(
    val publication     : Publication?  = null,
    val savedPosition   : String?       = null,
    val isLoading       : Boolean       = true,
    val error           : String?       = null,
    val currentChapter  : String?       = null,
    val progression     : Double        = 0.0,
    val showControls    : Boolean       = true,
    val fontSize        : Float         = 1.0f,    // 0.75 à 1.5
    val lineHeight      : Float         = 1.4f,    // 1.0 à 2.0
    val fontFamily      : ReaderFont    = ReaderFont.DEFAULT,
    val theme           : TaladzTheme   = TaladzTheme.LIGHT,
)

enum class ReaderFont(val cssValue: String, val label: String) {
    DEFAULT("inherit", "Par défaut"),
    TAJAWAL("Tajawal, sans-serif", "Tajawal (arabe)"),
    AMIRI("Amiri, serif", "Amiri (lecture)"),
    LATO("Lato, sans-serif", "Lato (latin)"),
}

@HiltViewModel
class ReaderViewModel @Inject constructor(
    savedStateHandle : SavedStateHandle,
    private val readerRepository : ReaderRepository,
    private val themeRepository  : ThemeRepository,
) : ViewModel() {

    private val bookId: Int = checkNotNull(savedStateHandle["bookId"])

    private val _state = MutableStateFlow(ReaderUiState())
    val state: StateFlow<ReaderUiState> = _state.asStateFlow()

    init {
        openBook()
        observeTheme()
    }

    private fun openBook() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            when (val result = readerRepository.openBook(bookId)) {
                is ReaderResult.Success -> _state.value = _state.value.copy(
                    isLoading     = false,
                    publication   = result.publication,
                    savedPosition = result.savedPosition,
                )
                is ReaderResult.Error -> _state.value = _state.value.copy(
                    isLoading = false,
                    error     = result.message,
                )
            }
        }
    }

    private fun observeTheme() {
        viewModelScope.launch {
            themeRepository.themeFlow.collect { theme ->
                _state.value = _state.value.copy(theme = theme)
            }
        }
    }

    fun onPageChanged(locatorJson: String, progression: Double, chapterTitle: String?) {
        _state.value = _state.value.copy(
            progression    = progression,
            currentChapter = chapterTitle,
        )
        viewModelScope.launch {
            readerRepository.savePosition(bookId, locatorJson, progression, chapterTitle)
        }
    }

    fun toggleControls() {
        _state.value = _state.value.copy(showControls = !_state.value.showControls)
    }

    fun setFontSize(scale: Float) {
        _state.value = _state.value.copy(fontSize = scale.coerceIn(0.75f, 1.5f))
    }

    fun setLineHeight(height: Float) {
        _state.value = _state.value.copy(lineHeight = height.coerceIn(1.0f, 2.0f))
    }

    fun setFont(font: ReaderFont) {
        _state.value = _state.value.copy(fontFamily = font)
    }
}
```

---

## Étape 7 — Écran du lecteur

Readium utilise un `Fragment` Android classique pour le rendu EPUB. On l'intègre dans Compose avec `AndroidViewBinding` ou `AndroidView`.

### 7.1 `ReaderScreen.kt`

```kotlin
// feature/feature-reader/src/main/java/com/taladz/feature/reader/ReaderScreen.kt
package com.taladz.feature.reader

import android.view.ViewGroup
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.FormatSize
import androidx.compose.material.icons.filled.List
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.fragment.app.FragmentContainerView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun ReaderScreen(
    onBack    : () -> Unit,
    viewModel : ReaderViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showSettings by remember { mutableStateOf(false) }

    Box(modifier = Modifier.fillMaxSize()) {
        when {
            state.isLoading -> {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            }
            state.error != null -> {
                Column(
                    modifier            = Modifier.align(Alignment.Center).padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        text  = "Impossible d'ouvrir le livre",
                        style = MaterialTheme.typography.headlineSmall,
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text  = state.error ?: "",
                        color = MaterialTheme.colorScheme.error,
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(onClick = onBack) { Text("Retour") }
                }
            }
            state.publication != null -> {
                // ── Zone de lecture Readium ─────────────────────────────────
                EpubView(
                    state    = state,
                    onTap    = viewModel::toggleControls,
                    onPageChange = viewModel::onPageChanged,
                )

                // ── Barre du haut (controls) ────────────────────────────────
                AnimatedVisibility(
                    visible = state.showControls,
                    enter   = fadeIn(),
                    exit    = fadeOut(),
                ) {
                    ReaderTopBar(
                        chapterTitle = state.currentChapter,
                        progression  = state.progression,
                        onBack       = onBack,
                        onToc        = { /* Ouvrir table des matières */ },
                        onSettings   = { showSettings = true },
                    )
                }

                // ── Barre du bas (progression) ──────────────────────────────
                AnimatedVisibility(
                    visible = state.showControls,
                    enter   = fadeIn(),
                    exit    = fadeOut(),
                    modifier = Modifier.align(Alignment.BottomCenter),
                ) {
                    ReaderBottomBar(progression = state.progression)
                }
            }
        }
    }

    // ── Sheet paramètres ────────────────────────────────────────────────────
    if (showSettings) {
        ReaderSettingsSheet(
            state        = state,
            onDismiss    = { showSettings = false },
            onFontSize   = viewModel::setFontSize,
            onLineHeight = viewModel::setLineHeight,
            onFont       = viewModel::setFont,
        )
    }
}

@Composable
private fun EpubView(
    state        : ReaderUiState,
    onTap        : () -> Unit,
    onPageChange : (String, Double, String?) -> Unit,
) {
    val context = LocalContext.current

    AndroidView(
        factory = { ctx ->
            FragmentContainerView(ctx).apply {
                id       = android.R.id.content
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                )
            }
        },
        modifier = Modifier
            .fillMaxSize()
            .clickable(onClick = onTap),
        update = { view ->
            // Le Fragment Readium est géré via le FragmentManager de l'activité
            // Voir Étape 8 pour l'intégration complète
        },
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ReaderTopBar(
    chapterTitle : String?,
    progression  : Double,
    onBack       : () -> Unit,
    onToc        : () -> Unit,
    onSettings   : () -> Unit,
) {
    Surface(shadowElevation = 4.dp) {
        Column {
            TopAppBar(
                title = {
                    Text(
                        text     = chapterTitle ?: "",
                        style    = MaterialTheme.typography.titleSmall,
                        maxLines = 1,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Retour")
                    }
                },
                actions = {
                    IconButton(onClick = onToc) {
                        Icon(Icons.Default.List, "Table des matières")
                    }
                    IconButton(onClick = onSettings) {
                        Icon(Icons.Default.FormatSize, "Paramètres de lecture")
                    }
                },
            )
            LinearProgressIndicator(
                progress = { progression.toFloat() },
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun ReaderBottomBar(progression: Double) {
    Surface(
        shadowElevation = 4.dp,
        modifier        = Modifier.fillMaxWidth(),
    ) {
        Text(
            text     = "${(progression * 100).toInt()}% lu",
            style    = MaterialTheme.typography.labelSmall,
            color    = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(8.dp),
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ReaderSettingsSheet(
    state        : ReaderUiState,
    onDismiss    : () -> Unit,
    onFontSize   : (Float) -> Unit,
    onLineHeight : (Float) -> Unit,
    onFont       : (ReaderFont) -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
        ) {
            Text("Paramètres de lecture", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(16.dp))

            // ── Taille de police ─────────────────────────────────────────
            Text("Taille du texte : ${(state.fontSize * 100).toInt()}%",
                style = MaterialTheme.typography.labelMedium)
            Slider(
                value        = state.fontSize,
                onValueChange = onFontSize,
                valueRange   = 0.75f..1.5f,
            )

            Spacer(modifier = Modifier.height(16.dp))

            // ── Interligne ─────────────────────────────────────────────────
            Text("Interligne : ${String.format("%.1f", state.lineHeight)}",
                style = MaterialTheme.typography.labelMedium)
            Slider(
                value        = state.lineHeight,
                onValueChange = onLineHeight,
                valueRange   = 1.0f..2.0f,
            )

            Spacer(modifier = Modifier.height(16.dp))

            // ── Police ────────────────────────────────────────────────────
            Text("Police de lecture", style = MaterialTheme.typography.labelMedium)
            Spacer(modifier = Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ReaderFont.entries.forEach { font ->
                    FilterChip(
                        selected = state.fontFamily == font,
                        onClick  = { onFont(font) },
                        label    = { Text(font.label) },
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
```

---

## Étape 8 — Intégration Fragment Readium avec Compose

Readium's `EpubNavigatorFragment` est un Fragment Android. On doit l'héberger dans une Activity ou utiliser une approche hybride.

### 8.1 `ReaderActivity.kt`

La meilleure approche pour Readium dans une app Compose est d'utiliser une Activity dédiée pour le lecteur :

```kotlin
// feature/feature-reader/src/main/java/com/taladz/feature/reader/ReaderActivity.kt
package com.taladz.feature.reader

import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.commit
import com.taladz.core.ui.theme.TaladzThemeWrapper
import dagger.hilt.android.AndroidEntryPoint
import org.readium.r2.navigator.epub.EpubNavigatorFragment
import org.readium.r2.shared.publication.Locator

@AndroidEntryPoint
class ReaderActivity : AppCompatActivity() {

    companion object {
        private const val EXTRA_BOOK_ID = "book_id"

        fun createIntent(context: Context, bookId: Int): Intent =
            Intent(context, ReaderActivity::class.java).apply {
                putExtra(EXTRA_BOOK_ID, bookId)
            }
    }

    private val bookId by lazy {
        intent.getIntExtra(EXTRA_BOOK_ID, -1)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            // On utilise ReaderScreen qui emballe le lecteur
            // Pour ce TP, on retourne à MainActivity en fermant cette Activity
            TaladzThemeWrapper {
                ReaderScreen(
                    onBack = { finish() },
                )
            }
        }
    }
}
```

### 8.2 Déclarer dans `AndroidManifest.xml`

```xml
<activity
    android:name=".feature.reader.ReaderActivity"
    android:configChanges="orientation|screenSize"
    android:theme="@style/Theme.Taladz"
    android:exported="false" />
```

### 8.3 Ouvrir le lecteur depuis BookDetailScreen

```kotlin
// Dans BookDetailScreen, remplacer onRead par :
val context = LocalContext.current
DownloadButton(
    downloadState = downloadState,
    onDownload    = { viewModel.startDownload(bookId, bookTitle, epubUrl) },
    onCancel      = { viewModel.cancelDownload(bookId) },
    onRead        = {
        context.startActivity(
            com.taladz.feature.reader.ReaderActivity.createIntent(context, bookId)
        )
    },
)
```

---

## Étape 9 — CSS personnalisé pour Readium (polices arabes + thème)

Readium permet d'injecter du CSS dans le contenu EPUB :

```kotlin
// Dans ReaderViewModel, générer le CSS selon les préférences :
fun generateCss(state: ReaderUiState): String = buildString {
    append(":root {")
    append("--USER__fontSize: ${(state.fontSize * 100).toInt()}%;")
    append("--USER__lineHeight: ${state.lineHeight};")
    append("--USER__fontFamily: ${state.fontFamily.cssValue};")
    when (state.theme) {
        TaladzTheme.SEPIA -> {
            append("--USER__backgroundColor: #F5ECD7;")
            append("--USER__textColor: #3B2E1A;")
        }
        TaladzTheme.DARK -> {
            append("--USER__backgroundColor: #1A1C19;")
            append("--USER__textColor: #E2E3DD;")
        }
        TaladzTheme.LIGHT -> {
            append("--USER__backgroundColor: #FDFDF7;")
            append("--USER__textColor: #1A1C19;")
        }
    }
    append("}")
    // Pour les textes arabes : forcer la direction RTL
    append("[lang='ar'], [xml:lang='ar'] { direction: rtl; text-align: right; }")
}
```

---

## Récapitulatif des fichiers créés / modifiés

```
feature/feature-reader/                          ← nouveau module
├── build.gradle.kts                             ← +readium, +desugaring
└── src/main/java/com/taladz/feature/reader/
    ├── crypto/TaladzContentProtection.kt        ← déchiffrement AES pour Readium
    ├── ReaderActivity.kt                        ← Activity hôte du lecteur
    ├── ReaderScreen.kt                          ← UI Compose + paramètres
    └── ReaderViewModel.kt                       ← état + sauvegarde CFI

data/data-reader/                                ← mis à jour
└── repository/ReaderRepository.kt              ← openBook() + savePosition()

core/core-database/
├── entity/ReadingPositionEntity.kt             ← position CFI par livre
├── dao/ReadingPositionDao.kt
└── TaladzDatabase.kt                           ← version 3 + ReadingPositionDao

app/src/main/java/com/taladz/app/
└── TaladzApp.kt                                 ← +readium = Readium(this)

AndroidManifest.xml                              ← ReaderActivity déclarée
settings.gradle.kts                              ← +:feature:feature-reader
```

---

## Points de contrôle — Checklist livrable

Avant de passer au TP 13, vérifie que :

- [ ] Cliquer "Lire hors ligne" ouvre le lecteur EPUB (ReaderActivity)
- [ ] Le contenu de l'EPUB s'affiche correctement (texte lisible)
- [ ] Swipe gauche/droite ou boutons → changement de page
- [ ] La barre de progression affiche le % lu
- [ ] Les paramètres (taille, interligne, police) modifient l'affichage en temps réel
- [ ] Fermer et rouvrir le livre → retour à la même page (CFI restauré)
- [ ] Le thème Sépia applique un fond beige dans le lecteur
- [ ] Les textes arabes sont en RTL dans le lecteur
- [ ] CI GitHub Actions verte

---

## Pour aller plus loin (hors TP)

- **Text-to-Speech** : Readium supporte la lecture audio du contenu via `MediaOverlay`
- **Search in book** : API Readium pour la recherche full-text dans l'EPUB
- **Zoom** : `pinch-to-zoom` sur les images dans l'EPUB

---

*TP 12 terminé. Prochain : TP 13 — Annotations (surlignages, notes, signets).*
