# TP 09 — Détail d'un Livre et Cache Local Room

> **Durée estimée :** 12 heures sur 3 jours
> **Niveau :** Intermédiaire
> **Prérequis :** TP 08 terminé (catalogue paginé fonctionnel)

---

## Objectifs d'apprentissage

À la fin de ce TP, tu sauras :
- [ ] Créer le module `core-database` avec Room
- [ ] Définir les entités `BookEntity`, `MediaEntity` et leurs DAOs
- [ ] Implémenter le pattern Repository offline-first (réseau → cache → UI)
- [ ] Afficher l'écran de détail même sans connexion (depuis le cache)
- [ ] Créer une galerie d'images horizontale pour les médias du livre
- [ ] Indiquer à l'utilisateur la fraîcheur des données (badge "mise à jour il y a X min")

---

## Concepts théoriques

### Room — ORM Android

Room est la librairie de base de données SQLite recommandée par Google pour Android. Elle se compose de 3 couches :

```
@Entity           → table SQL
@Dao              → requêtes SQL (suspend fun, Flow)
@Database         → point d'entrée, crée et gère la base
```

Room génère le code SQL à la compilation via KSP. Avantages :
- Vérification des requêtes SQL **à la compilation** (pas à l'exécution)
- Support natif des **coroutines** et **Flow**
- Migrations automatiques ou manuelles

### Pattern Offline-First

```
1. L'écran s'ouvre → afficher le cache immédiatement (même si vieux)
2. En arrière-plan → appeler l'API
3. Si succès API → mettre à jour le cache → l'UI se met à jour automatiquement
4. Si échec réseau → afficher le cache + badge "données anciennes"
```

Ce pattern utilise un **Flow Room** qui émet automatiquement à chaque mise à jour :

```kotlin
// DAO Room émet automatiquement quand les données changent
fun getBook(id: Int): Flow<BookEntity?>

// Repository — combine cache et réseau
fun getBookDetail(id: Int): Flow<BookDetail> = flow {
    emit(getFromCache(id))           // 1. cache immédiat
    val fresh = fetchFromNetwork(id)  // 2. réseau
    saveToCache(fresh)               // 3. mise à jour cache
    // Room Flow émet automatiquement la nouvelle valeur
}
```

---

## Étape 1 — Créer le module `core-database`

### 1.1 Structure

```
core/core-database/
├── build.gradle.kts
└── src/main/java/com/taladz/core/database/
    ├── di/
    │   └── DatabaseModule.kt
    ├── entity/
    │   ├── BookEntity.kt
    │   ├── MediaEntity.kt
    │   ├── AuthorEntity.kt
    │   └── CacheMetaEntity.kt    ← métadonnées de fraîcheur
    ├── dao/
    │   ├── BookDao.kt
    │   ├── MediaDao.kt
    │   └── CacheMetaDao.kt
    ├── relation/
    │   └── BookWithMedias.kt     ← relation Room
    └── TaladzDatabase.kt
```

### 1.2 `core/core-database/build.gradle.kts`

```kotlin
plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
}

android {
    namespace  = "com.taladz.core.database"
    compileSdk = 35
    defaultConfig { minSdk = 26 }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation(project(":core:core-common"))

    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)

    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    ksp(libs.room.compiler)

    testImplementation("junit:junit:4.13.2")
    testImplementation(libs.room.testing)
    testImplementation(libs.test.coroutines)
}
```

### 1.3 Ajouter dans `libs.versions.toml`

```toml
[versions]
room = "2.7.0"

[libraries]
room-runtime  = { group = "androidx.room", name = "room-runtime",  version.ref = "room" }
room-ktx      = { group = "androidx.room", name = "room-ktx",      version.ref = "room" }
room-compiler = { group = "androidx.room", name = "room-compiler",  version.ref = "room" }
room-testing  = { group = "androidx.room", name = "room-testing",   version.ref = "room" }
room-paging   = { group = "androidx.room", name = "room-paging",    version.ref = "room" }
```

### 1.4 `settings.gradle.kts`

```kotlin
include(":core:core-database")
```

---

## Étape 2 — Entités Room

### 2.1 `BookEntity.kt`

```kotlin
// core/core-database/src/main/java/com/taladz/core/database/entity/BookEntity.kt
package com.taladz.core.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "books")
data class BookEntity(
    @PrimaryKey
    @ColumnInfo(name = "id_oeuvre")
    val idOeuvre        : Int,

    @ColumnInfo(name = "titre_fr")
    val titreFr         : String? = null,

    @ColumnInfo(name = "titre_ar")
    val titreAr         : String? = null,

    @ColumnInfo(name = "description_fr")
    val descriptionFr   : String? = null,

    @ColumnInfo(name = "description_ar")
    val descriptionAr   : String? = null,

    @ColumnInfo(name = "prix")
    val prix            : Double  = 0.0,

    @ColumnInfo(name = "annee_creation")
    val anneeCreation   : Int?    = null,

    @ColumnInfo(name = "statut")
    val statut          : String  = "publie",

    @ColumnInfo(name = "nb_vues")
    val nbVues          : Int     = 0,

    @ColumnInfo(name = "est_mis_en_avant")
    val estMisEnAvant   : Boolean = false,

    @ColumnInfo(name = "type_nom_fr")
    val typeNomFr       : String? = null,

    @ColumnInfo(name = "id_langue")
    val idLangue        : Int?    = null,

    @ColumnInfo(name = "cached_at")
    val cachedAt        : Long    = System.currentTimeMillis(),
)
```

### 2.2 `MediaEntity.kt`

```kotlin
// core/core-database/src/main/java/com/taladz/core/database/entity/MediaEntity.kt
package com.taladz.core.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "medias",
    foreignKeys = [
        ForeignKey(
            entity        = BookEntity::class,
            parentColumns = ["id_oeuvre"],
            childColumns  = ["id_oeuvre_fk"],
            onDelete      = ForeignKey.CASCADE,  // si le livre est supprimé → ses médias aussi
        )
    ],
    indices = [Index(value = ["id_oeuvre_fk"])],
)
data class MediaEntity(
    @PrimaryKey
    @ColumnInfo(name = "id_media")
    val idMedia     : Int,

    @ColumnInfo(name = "id_oeuvre_fk")
    val idOeuvreFk  : Int,

    @ColumnInfo(name = "url")
    val url         : String,

    @ColumnInfo(name = "mimetype")
    val mimetype    : String? = null,

    @ColumnInfo(name = "size")
    val size        : Long?   = null,

    @ColumnInfo(name = "type_block")
    val typeBlock   : String? = null,
)
```

### 2.3 `CacheMetaEntity.kt` — fraîcheur des données

```kotlin
// core/core-database/src/main/java/com/taladz/core/database/entity/CacheMetaEntity.kt
package com.taladz.core.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "cache_meta")
data class CacheMetaEntity(
    @PrimaryKey
    @ColumnInfo(name = "cache_key")
    val cacheKey     : String,

    @ColumnInfo(name = "last_updated")
    val lastUpdated  : Long = System.currentTimeMillis(),

    @ColumnInfo(name = "is_stale")
    val isStale      : Boolean = false,
) {
    companion object {
        private const val STALE_THRESHOLD_MS = 15 * 60 * 1_000L  // 15 minutes

        fun forBook(bookId: Int) = "book_$bookId"
        fun forCatalog()         = "catalog_page_1"
    }

    fun isExpired(): Boolean =
        System.currentTimeMillis() - lastUpdated > STALE_THRESHOLD_MS
}
```

---

## Étape 3 — Relations Room

```kotlin
// core/core-database/src/main/java/com/taladz/core/database/relation/BookWithMedias.kt
package com.taladz.core.database.relation

import androidx.room.Embedded
import androidx.room.Relation
import com.taladz.core.database.entity.BookEntity
import com.taladz.core.database.entity.MediaEntity

data class BookWithMedias(
    @Embedded
    val book   : BookEntity,

    @Relation(
        parentColumn = "id_oeuvre",
        entityColumn = "id_oeuvre_fk",
    )
    val medias : List<MediaEntity>,
)
```

---

## Étape 4 — DAOs

### 4.1 `BookDao.kt`

```kotlin
// core/core-database/src/main/java/com/taladz/core/database/dao/BookDao.kt
package com.taladz.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import com.taladz.core.database.entity.BookEntity
import com.taladz.core.database.relation.BookWithMedias
import kotlinx.coroutines.flow.Flow

@Dao
interface BookDao {

    @Query("SELECT * FROM books WHERE id_oeuvre = :id")
    fun getBook(id: Int): Flow<BookEntity?>  // Flow → émission automatique

    @Transaction
    @Query("SELECT * FROM books WHERE id_oeuvre = :id")
    fun getBookWithMedias(id: Int): Flow<BookWithMedias?>

    @Query("SELECT * FROM books ORDER BY cached_at DESC LIMIT :limit")
    fun getRecentBooks(limit: Int = 20): Flow<List<BookEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBook(book: BookEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBooks(books: List<BookEntity>)

    @Query("DELETE FROM books WHERE id_oeuvre = :id")
    suspend fun deleteBook(id: Int)

    @Query("DELETE FROM books WHERE cached_at < :olderThan")
    suspend fun purgeOldCache(olderThan: Long)
}
```

### 4.2 `MediaDao.kt`

```kotlin
// core/core-database/src/main/java/com/taladz/core/database/dao/MediaDao.kt
package com.taladz.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.taladz.core.database.entity.MediaEntity

@Dao
interface MediaDao {

    @Query("SELECT * FROM medias WHERE id_oeuvre_fk = :bookId")
    suspend fun getMediasForBook(bookId: Int): List<MediaEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMedias(medias: List<MediaEntity>)

    @Query("SELECT * FROM medias WHERE id_oeuvre_fk = :bookId AND type_block = 'epub'")
    suspend fun getEpubMedia(bookId: Int): MediaEntity?

    @Query("DELETE FROM medias WHERE id_oeuvre_fk = :bookId")
    suspend fun deleteMediasForBook(bookId: Int)
}
```

### 4.3 `CacheMetaDao.kt`

```kotlin
// core/core-database/src/main/java/com/taladz/core/database/dao/CacheMetaDao.kt
package com.taladz.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.taladz.core.database.entity.CacheMetaEntity

@Dao
interface CacheMetaDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(meta: CacheMetaEntity)

    @Query("SELECT * FROM cache_meta WHERE cache_key = :key")
    suspend fun getMeta(key: String): CacheMetaEntity?

    @Query("DELETE FROM cache_meta WHERE cache_key = :key")
    suspend fun deleteMeta(key: String)
}
```

---

## Étape 5 — Base de données Room

```kotlin
// core/core-database/src/main/java/com/taladz/core/database/TaladzDatabase.kt
package com.taladz.core.database

import androidx.room.Database
import androidx.room.RoomDatabase
import com.taladz.core.database.dao.BookDao
import com.taladz.core.database.dao.CacheMetaDao
import com.taladz.core.database.dao.MediaDao
import com.taladz.core.database.entity.BookEntity
import com.taladz.core.database.entity.CacheMetaEntity
import com.taladz.core.database.entity.MediaEntity

@Database(
    entities  = [BookEntity::class, MediaEntity::class, CacheMetaEntity::class],
    version   = 1,
    exportSchema = true,
)
abstract class TaladzDatabase : RoomDatabase() {
    abstract fun bookDao(): BookDao
    abstract fun mediaDao(): MediaDao
    abstract fun cacheMetaDao(): CacheMetaDao
}
```

---

## Étape 6 — Module Hilt pour la base de données

```kotlin
// core/core-database/src/main/java/com/taladz/core/database/di/DatabaseModule.kt
package com.taladz.core.database.di

import android.content.Context
import androidx.room.Room
import com.taladz.core.database.TaladzDatabase
import com.taladz.core.database.dao.BookDao
import com.taladz.core.database.dao.CacheMetaDao
import com.taladz.core.database.dao.MediaDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): TaladzDatabase =
        Room.databaseBuilder(
            context,
            TaladzDatabase::class.java,
            "taladz_database",
        )
        .fallbackToDestructiveMigration()  // en dev : accepter la perte de données si migration manquante
        .build()

    @Provides fun provideBookDao(db: TaladzDatabase): BookDao          = db.bookDao()
    @Provides fun provideMediaDao(db: TaladzDatabase): MediaDao        = db.mediaDao()
    @Provides fun provideCacheMetaDao(db: TaladzDatabase): CacheMetaDao = db.cacheMetaDao()
}
```

---

## Étape 7 — Repository Offline-First

```kotlin
// feature/feature-catalog/src/main/java/com/taladz/feature/catalog/repository/BookDetailRepository.kt
package com.taladz.feature.catalog.repository

import com.taladz.core.database.dao.BookDao
import com.taladz.core.database.dao.CacheMetaDao
import com.taladz.core.database.dao.MediaDao
import com.taladz.core.database.entity.BookEntity
import com.taladz.core.database.entity.CacheMetaEntity
import com.taladz.core.database.entity.MediaEntity
import com.taladz.core.database.relation.BookWithMedias
import com.taladz.core.network.api.OeuvresApiService
import com.taladz.core.network.model.NetworkResult
import com.taladz.core.network.model.dto.OeuvreDto
import com.taladz.core.network.util.safeApiCall
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.onStart
import javax.inject.Inject
import javax.inject.Singleton

sealed class BookDetailState {
    data class Success(val data: BookWithMedias, val isStale: Boolean = false) : BookDetailState()
    data class Error(val message: String, val cachedData: BookWithMedias? = null) : BookDetailState()
    data object Loading : BookDetailState()
}

@Singleton
class BookDetailRepository @Inject constructor(
    private val bookDao      : BookDao,
    private val mediaDao     : MediaDao,
    private val cacheMetaDao : CacheMetaDao,
    private val api          : OeuvresApiService,
) {

    fun getBookDetail(bookId: Int): Flow<BookDetailState> =
        bookDao.getBookWithMedias(bookId).onStart {
            // À l'ouverture, déclencher un fetch réseau en parallèle
            refreshFromNetwork(bookId)
        }.let { roomFlow ->
            // Transforme le Flow<BookWithMedias?> en Flow<BookDetailState>
            kotlinx.coroutines.flow.flow {
                emit(BookDetailState.Loading)
                roomFlow.collect { cached ->
                    if (cached != null) {
                        val meta    = cacheMetaDao.getMeta(CacheMetaEntity.forBook(bookId))
                        val isStale = meta?.isExpired() ?: true
                        emit(BookDetailState.Success(data = cached, isStale = isStale))
                    }
                }
            }
        }

    private suspend fun refreshFromNetwork(bookId: Int) {
        when (val result = safeApiCall { api.getOeuvreById(bookId) }) {
            is NetworkResult.Success -> {
                saveToCache(result.data)
                cacheMetaDao.upsert(
                    CacheMetaEntity(cacheKey = CacheMetaEntity.forBook(bookId))
                )
            }
            is NetworkResult.Error -> Unit
            is NetworkResult.Loading -> Unit
        }
    }

    private suspend fun saveToCache(dto: OeuvreDto) {
        // 1. Sauvegarder le livre
        bookDao.insertBook(
            BookEntity(
                idOeuvre      = dto.idOeuvre,
                titreFr       = dto.titre.fr,
                titreAr       = dto.titre.ar,
                descriptionFr = dto.description?.fr,
                descriptionAr = dto.description?.ar,
                prix          = dto.prix,
                anneeCreation = dto.anneeCreation,
                statut        = dto.statut,
                nbVues        = dto.nbVues,
                estMisEnAvant = dto.estMisEnAvant,
                typeNomFr     = dto.type?.nom?.fr,
                idLangue      = dto.idLangue,
            )
        )
        // 2. Supprimer les anciens médias puis insérer les nouveaux
        mediaDao.deleteMediasForBook(dto.idOeuvre)
        mediaDao.insertMedias(
            dto.medias.map { media ->
                MediaEntity(
                    idMedia    = media.idMedia,
                    idOeuvreFk = dto.idOeuvre,
                    url        = media.url,
                    mimetype   = media.mimetype,
                    size       = media.size,
                    typeBlock  = media.typeBlock,
                )
            }
        )
    }
}
```

---

## Étape 8 — `BookDetailViewModel`

```kotlin
// feature/feature-catalog/src/main/java/com/taladz/feature/catalog/BookDetailViewModel.kt
package com.taladz.feature.catalog

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.taladz.feature.catalog.repository.BookDetailRepository
import com.taladz.feature.catalog.repository.BookDetailState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

@HiltViewModel
class BookDetailViewModel @Inject constructor(
    savedStateHandle : SavedStateHandle,
    repository       : BookDetailRepository,
) : ViewModel() {

    // Récupère le bookId depuis les arguments de navigation
    private val bookId: Int = checkNotNull(savedStateHandle["bookId"])

    val state: StateFlow<BookDetailState> = repository
        .getBookDetail(bookId)
        .stateIn(
            scope          = viewModelScope,
            started        = SharingStarted.WhileSubscribed(5_000),
            initialValue   = BookDetailState.Loading,
        )
}
```

---

## Étape 9 — Écran de détail complet

```kotlin
// app/src/main/java/com/taladz/app/screens/main/BookDetailScreen.kt
package com.taladz.app.screens.main

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import coil3.compose.LocalPlatformContext
import coil3.request.ImageRequest
import coil3.request.crossfade
import com.taladz.core.database.entity.MediaEntity
import com.taladz.core.database.relation.BookWithMedias
import com.taladz.core.ui.components.AdaptiveText
import com.taladz.feature.catalog.BookDetailViewModel
import com.taladz.feature.catalog.repository.BookDetailState
import java.util.concurrent.TimeUnit

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookDetailScreen(
    onBack    : () -> Unit,
    viewModel : BookDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Détail du livre") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Retour")
                    }
                },
            )
        },
    ) { innerPadding ->
        Box(modifier = Modifier.padding(innerPadding)) {
            when (val s = state) {
                is BookDetailState.Loading -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }
                is BookDetailState.Error -> {
                    if (s.cachedData != null) {
                        BookDetailContent(
                            bookWithMedias = s.cachedData,
                            isStale        = true,
                            staleMessage   = s.message,
                        )
                    } else {
                        Column(
                            modifier            = Modifier.align(Alignment.Center).padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Text(
                                text  = "Impossible de charger le livre",
                                color = MaterialTheme.colorScheme.error,
                            )
                            Text(
                                text  = s.message,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
                is BookDetailState.Success -> {
                    BookDetailContent(
                        bookWithMedias = s.data,
                        isStale        = s.isStale,
                    )
                }
            }
        }
    }
}

@Composable
private fun BookDetailContent(
    bookWithMedias : BookWithMedias,
    isStale        : Boolean = false,
    staleMessage   : String? = null,
) {
    val book   = bookWithMedias.book
    val medias = bookWithMedias.medias
    val cover  = medias.firstOrNull { it.typeBlock == "couverture" } ?: medias.firstOrNull()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
    ) {
        // ── Badge "données anciennes" ─────────────────────────────────────────
        if (isStale) {
            Surface(
                color    = MaterialTheme.colorScheme.tertiaryContainer,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    text     = staleMessage ?: "Affichage hors connexion — données peut-être obsolètes",
                    style    = MaterialTheme.typography.labelSmall,
                    color    = MaterialTheme.colorScheme.onTertiaryContainer,
                    modifier = Modifier.padding(8.dp),
                    textAlign = TextAlign.Center,
                )
            }
        }

        // ── Couverture ────────────────────────────────────────────────────────
        if (cover != null) {
            AsyncImage(
                model = ImageRequest.Builder(LocalPlatformContext.current)
                    .data(cover.url)
                    .crossfade(true)
                    .build(),
                contentDescription = "Couverture",
                contentScale       = ContentScale.FillWidth,
                modifier           = Modifier
                    .fillMaxWidth()
                    .height(300.dp),
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        Column(modifier = Modifier.padding(horizontal = 16.dp)) {
            // ── Titre ─────────────────────────────────────────────────────────
            AdaptiveText(
                text    = book.titreFr ?: book.titreAr ?: "Sans titre",
                style   = MaterialTheme.typography.headlineMedium,
                isTitle = true,
            )
            if (book.titreAr != null && book.titreFr != null) {
                AdaptiveText(
                    text    = book.titreAr,
                    style   = MaterialTheme.typography.titleLarge,
                    isTitle = true,
                    color   = MaterialTheme.colorScheme.primary,
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // ── Métadonnées ───────────────────────────────────────────────────
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                book.typeNomFr?.let { type ->
                    AssistChip(onClick = {}, label = { Text(type) })
                }
                book.anneeCreation?.let { year ->
                    AssistChip(onClick = {}, label = { Text("$year") })
                }
                if (book.prix == 0.0) {
                    AssistChip(
                        onClick = {},
                        label   = { Text("Gratuit") },
                        colors  = AssistChipDefaults.assistChipColors(
                            labelColor = MaterialTheme.colorScheme.primary,
                        ),
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ── Description ───────────────────────────────────────────────────
            val description = book.descriptionFr ?: book.descriptionAr
            if (!description.isNullOrBlank()) {
                Text(
                    text  = "Synopsis",
                    style = MaterialTheme.typography.titleMedium,
                )
                Spacer(modifier = Modifier.height(8.dp))
                AdaptiveText(
                    text      = description,
                    style     = MaterialTheme.typography.bodyMedium,
                    isReading = true,
                    color     = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // ── Galerie des autres médias ─────────────────────────────────────
            val galleryMedias = medias.filter { it.typeBlock != "couverture" && it.mimetype?.startsWith("image") == true }
            if (galleryMedias.isNotEmpty()) {
                Text("Galerie", style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(8.dp))
                MediaGallery(medias = galleryMedias)
                Spacer(modifier = Modifier.height(24.dp))
            }

            // ── Statistiques ──────────────────────────────────────────────────
            Text(
                text  = "${book.nbVues} vues",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            // ── Indicateur de fraîcheur ───────────────────────────────────────
            val ageMinutes = TimeUnit.MILLISECONDS.toMinutes(
                System.currentTimeMillis() - book.cachedAt
            )
            Text(
                text  = when {
                    ageMinutes < 1  -> "Mis à jour à l'instant"
                    ageMinutes < 60 -> "Mis à jour il y a $ageMinutes min"
                    else            -> "Mis à jour il y a ${ageMinutes / 60}h"
                },
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.outline,
            )

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
private fun MediaGallery(medias: List<MediaEntity>) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        items(medias) { media ->
            AsyncImage(
                model = ImageRequest.Builder(LocalPlatformContext.current)
                    .data(media.url)
                    .crossfade(true)
                    .build(),
                contentDescription = null,
                contentScale       = ContentScale.Crop,
                modifier           = Modifier
                    .size(120.dp)
                    .clip(MaterialTheme.shapes.small),
            )
        }
    }
}
```

---

## Étape 10 — Test Room avec base en mémoire

```kotlin
// core/core-database/src/test/java/com/taladz/core/database/BookDaoTest.kt
package com.taladz.core.database

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.taladz.core.database.dao.BookDao
import com.taladz.core.database.entity.BookEntity
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class BookDaoTest {

    private lateinit var db      : TaladzDatabase
    private lateinit var bookDao : BookDao

    @Before
    fun setUp() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        db = Room.inMemoryDatabaseBuilder(context, TaladzDatabase::class.java)
            .allowMainThreadQueries()  // OK uniquement en test
            .build()
        bookDao = db.bookDao()
    }

    @After
    fun tearDown() {
        db.close()
    }

    @Test
    fun insertBook_thenGetBook_returnsCorrectBook() = runTest {
        val book = BookEntity(
            idOeuvre = 42,
            titreFr  = "Nedjma",
            titreAr  = "نجمة",
        )
        bookDao.insertBook(book)
        val retrieved = bookDao.getBook(42).first()
        assertEquals(42, retrieved?.idOeuvre)
        assertEquals("Nedjma", retrieved?.titreFr)
        assertEquals("نجمة", retrieved?.titreAr)
    }

    @Test
    fun deleteBook_removesFromDb() = runTest {
        bookDao.insertBook(BookEntity(idOeuvre = 1, titreFr = "Test"))
        bookDao.deleteBook(1)
        val retrieved = bookDao.getBook(1).first()
        assertNull(retrieved)
    }

    @Test
    fun insertBook_replaceOnConflict() = runTest {
        bookDao.insertBook(BookEntity(idOeuvre = 1, titreFr = "V1"))
        bookDao.insertBook(BookEntity(idOeuvre = 1, titreFr = "V2"))
        val retrieved = bookDao.getBook(1).first()
        assertEquals("V2", retrieved?.titreFr)
    }

    @Test
    fun getRecentBooks_returnsInOrder() = runTest {
        bookDao.insertBooks(listOf(
            BookEntity(idOeuvre = 1, titreFr = "Old",   cachedAt = 1000L),
            BookEntity(idOeuvre = 2, titreFr = "New",   cachedAt = 3000L),
            BookEntity(idOeuvre = 3, titreFr = "Newer", cachedAt = 2000L),
        ))
        val books = bookDao.getRecentBooks(limit = 3).first()
        assertEquals(2, books[0].idOeuvre)  // le plus récent en premier
        assertEquals(3, books[1].idOeuvre)
    }
}
```

---

## Récapitulatif des fichiers créés / modifiés

```
core/core-database/                              ← nouveau module
├── build.gradle.kts
└── src/main/java/com/taladz/core/database/
    ├── TaladzDatabase.kt                         ← version 1, 3 entités
    ├── di/DatabaseModule.kt                      ← Hilt, Room.inMemory en test
    ├── entity/
    │   ├── BookEntity.kt                         ← table books
    │   ├── MediaEntity.kt                        ← table medias (FK → books)
    │   └── CacheMetaEntity.kt                    ← fraîcheur par clé
    ├── dao/
    │   ├── BookDao.kt                            ← CRUD + Flow
    │   ├── MediaDao.kt
    │   └── CacheMetaDao.kt
    └── relation/BookWithMedias.kt

feature/feature-catalog/src/.../repository/
└── BookDetailRepository.kt                       ← offline-first Flow

feature/feature-catalog/src/.../
└── BookDetailViewModel.kt                        ← SavedStateHandle bookId

app/src/.../screens/main/
└── BookDetailScreen.kt                           ← badge stale + galerie + stats

gradle/libs.versions.toml                         ← +room
settings.gradle.kts                               ← +:core:core-database
```

---

## Points de contrôle — Checklist livrable

Avant de passer au TP 10, vérifie que :

- [ ] `./gradlew :core:core-database:assembleDebug` → BUILD SUCCESSFUL
- [ ] L'écran détail affiche titre, description, couverture, galerie
- [ ] En coupant la connexion AVANT d'ouvrir un livre déjà consulté → s'affiche depuis le cache avec badge "hors connexion"
- [ ] Le badge "Mis à jour il y a X min" est précis
- [ ] `./gradlew :core:core-database:connectedAndroidTest` → 4 tests DAO passent
- [ ] CI GitHub Actions verte

---

*TP 09 terminé. Prochain : TP 10 — Bibliothèque utilisateur (favoris + notifications).*
