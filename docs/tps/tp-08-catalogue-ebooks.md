# TP 08 — Catalogue d'Ebooks (Paging 3 + Coil + Filtres)

> **Durée estimée :** 10 heures sur 2-3 jours
> **Niveau :** Intermédiaire
> **Prérequis :** TP 07 terminé (authentification fonctionnelle)

---

## Objectifs d'apprentissage

À la fin de ce TP, tu sauras :
- [ ] Implémenter une liste paginée avec `LazyColumn` et Paging 3
- [ ] Créer un `PagingSource` qui appelle l'API Taladz
- [ ] Afficher les couvertures avec Coil 3 (lazy loading + placeholder + erreur)
- [ ] Créer un composant `BookCard` réutilisable
- [ ] Implémenter la recherche avec debounce (évite les appels à chaque frappe)
- [ ] Ajouter des filtres par type et par langue

---

## Concepts théoriques

### Paging 3 — comment ça marche ?

Paging 3 charge les données **par pages** au fur et à mesure que l'utilisateur fait défiler :

```
LazyColumn
    ↑ demande plus de données quand l'utilisateur approche de la fin
PagingDataAdapter / collectAsLazyPagingItems()
    ↑
Pager (configuration : pageSize, prefetchDistance)
    ↑
PagingSource (charge une page depuis l'API)
    ↑
API Taladz : GET /api/oeuvres?page=1&limit=20
```

**Pourquoi pas un simple `LazyColumn` avec une liste ?**
- Avec 500 livres → charger tout d'un coup = lent + gaspillage mémoire
- Paging 3 charge uniquement ce qui sera affiché + quelques éléments d'avance

### Debounce pour la recherche

Sans debounce, chaque lettre tapée déclenche un appel API :
```
"k" → appel API
"ka" → appel API
"kat" → appel API  ← seul celui-ci est utile
```

Avec debounce de 500ms :
```
"k" → attend 500ms...
"ka" → attend 500ms...
"kat" → attend 500ms → appel API  ← 1 seul appel
```

### Coil 3 — chargement d'images

Coil est une bibliothèque de chargement d'images pour Android, optimisée pour Compose :
- Téléchargement asynchrone + mise en cache mémoire et disque
- Gestion automatique du cycle de vie (annule le téléchargement si l'écran quitte)
- Support WebP, SVG, GIF, vidéo (via extensions)

---

## Étape 1 — Ajouter les dépendances

### 1.1 `libs.versions.toml`

```toml
[versions]
paging   = "3.3.4"
coil     = "3.0.4"

[libraries]
# Paging 3
paging-runtime  = { group = "androidx.paging", name = "paging-runtime",         version.ref = "paging" }
paging-compose  = { group = "androidx.paging", name = "paging-compose",         version.ref = "paging" }
paging-testing  = { group = "androidx.paging", name = "paging-testing",         version.ref = "paging" }

# Coil 3
coil-compose    = { group = "io.coil-kt.coil3", name = "coil-compose",          version.ref = "coil" }
coil-network    = { group = "io.coil-kt.coil3", name = "coil-network-okhttp",   version.ref = "coil" }
```

> **Important :** Le package est `io.coil-kt.coil3` (avec le `3`), pas `io.coil-kt.coil`.

### 1.2 Module `feature-catalog` — `build.gradle.kts`

```kotlin
plugins {
    id("feature")  // convention plugin créé en TP 04
}

android {
    namespace = "com.taladz.feature.catalog"
}

dependencies {
    implementation(project(":core:core-network"))
    implementation(libs.paging.runtime)
    implementation(libs.paging.compose)
    implementation(libs.coil.compose)
    implementation(libs.coil.network)

    testImplementation(libs.paging.testing)
    testImplementation(libs.test.coroutines)
    testImplementation(libs.test.mockk)
}
```

---

## Étape 2 — Créer le `PagingSource`

```kotlin
// feature/feature-catalog/src/main/java/com/taladz/feature/catalog/paging/OeuvresPagingSource.kt
package com.taladz.feature.catalog.paging

import androidx.paging.PagingSource
import androidx.paging.PagingState
import com.taladz.core.network.api.OeuvresApiService
import com.taladz.core.network.model.dto.OeuvreDto

class OeuvresPagingSource(
    private val api     : OeuvresApiService,
    private val type    : String? = null,
    private val langue  : String? = null,
    private val search  : String? = null,
) : PagingSource<Int, OeuvreDto>() {

    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, OeuvreDto> {
        val page = params.key ?: 1

        return try {
            val response = api.getOeuvres(
                page   = page,
                limit  = params.loadSize,
                type   = type,
                langue = langue,
                search = search,
            )

            if (response.isSuccessful) {
                val body       = response.body()!!
                val oeuvres    = body.oeuvres
                val totalPages = body.pagination.pages

                LoadResult.Page(
                    data      = oeuvres,
                    prevKey   = if (page == 1) null else page - 1,
                    nextKey   = if (page >= totalPages) null else page + 1,
                )
            } else {
                LoadResult.Error(Exception("Erreur ${response.code()}"))
            }
        } catch (e: Exception) {
            LoadResult.Error(e)
        }
    }

    override fun getRefreshKey(state: PagingState<Int, OeuvreDto>): Int? {
        return state.anchorPosition?.let { anchor ->
            state.closestPageToPosition(anchor)?.prevKey?.plus(1)
                ?: state.closestPageToPosition(anchor)?.nextKey?.minus(1)
        }
    }
}
```

---

## Étape 3 — `CatalogRepository` avec Pager

```kotlin
// feature/feature-catalog/src/main/java/com/taladz/feature/catalog/repository/CatalogRepository.kt
package com.taladz.feature.catalog.repository

import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import com.taladz.core.network.api.OeuvresApiService
import com.taladz.core.network.model.dto.OeuvreDto
import com.taladz.feature.catalog.paging.OeuvresPagingSource
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CatalogRepository @Inject constructor(
    private val api: OeuvresApiService,
) {

    companion object {
        const val PAGE_SIZE       = 20
        const val PREFETCH_DIST   = 5  // charge la page suivante quand il reste 5 éléments
    }

    fun getOeuvresPaged(
        type    : String? = null,
        langue  : String? = null,
        search  : String? = null,
    ): Flow<PagingData<OeuvreDto>> = Pager(
        config = PagingConfig(
            pageSize         = PAGE_SIZE,
            prefetchDistance = PREFETCH_DIST,
            enablePlaceholders = false,
        ),
        pagingSourceFactory = {
            OeuvresPagingSource(
                api    = api,
                type   = type?.ifBlank { null },
                langue = langue?.ifBlank { null },
                search = search?.ifBlank { null },
            )
        }
    ).flow
}
```

---

## Étape 4 — `CatalogViewModel`

```kotlin
// feature/feature-catalog/src/main/java/com/taladz/feature/catalog/CatalogViewModel.kt
package com.taladz.feature.catalog

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.paging.PagingData
import androidx.paging.cachedIn
import com.taladz.core.network.model.dto.OeuvreDto
import com.taladz.feature.catalog.repository.CatalogRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flatMapLatest
import javax.inject.Inject

data class CatalogFilters(
    val searchQuery : String  = "",
    val type        : String? = null,
    val langue      : String? = null,
)

@OptIn(FlowPreview::class, ExperimentalCoroutinesApi::class)
@HiltViewModel
class CatalogViewModel @Inject constructor(
    private val repository: CatalogRepository,
) : ViewModel() {

    private val _filters = MutableStateFlow(CatalogFilters())
    val filters = _filters.asStateFlow()

    // PagingData mis en cache dans le scope du ViewModel
    // → survit aux recompositions Compose
    val oeuvres: Flow<PagingData<OeuvreDto>> = _filters
        .debounce(500)               // debounce 500ms pour la recherche
        .distinctUntilChanged()      // n'émet que si les filtres ont vraiment changé
        .flatMapLatest { filters ->
            repository.getOeuvresPaged(
                type   = filters.type,
                langue = filters.langue,
                search = filters.searchQuery.ifBlank { null },
            )
        }
        .cachedIn(viewModelScope)    // IMPORTANT : cache la PagingData dans le ViewModel

    fun updateSearch(query: String) {
        _filters.value = _filters.value.copy(searchQuery = query)
    }

    fun updateTypeFilter(type: String?) {
        _filters.value = _filters.value.copy(type = type)
    }

    fun updateLangueFilter(langue: String?) {
        _filters.value = _filters.value.copy(langue = langue)
    }

    fun clearFilters() {
        _filters.value = CatalogFilters()
    }
}
```

---

## Étape 5 — Composant `BookCard`

```kotlin
// core/core-ui/src/main/java/com/taladz/core/ui/components/BookCard.kt
package com.taladz.core.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import coil3.compose.LocalPlatformContext
import coil3.request.ImageRequest
import coil3.request.crossfade

// Modèle léger pour la card (pas le DTO complet)
data class BookCardData(
    val id          : Int,
    val title       : String,
    val author      : String  = "",
    val coverUrl    : String? = null,
    val price       : Double  = 0.0,
    val language    : String? = null,
)

@Composable
fun BookCard(
    book      : BookCardData,
    onClick   : () -> Unit,
    modifier  : Modifier = Modifier,
) {
    Card(
        onClick    = onClick,
        modifier   = modifier.width(160.dp),
        elevation  = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Column {
            // ── Couverture ────────────────────────────────────────────────
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(220.dp),
            ) {
                AsyncImage(
                    model = ImageRequest.Builder(LocalPlatformContext.current)
                        .data(book.coverUrl)
                        .crossfade(true)
                        .build(),
                    contentDescription = book.title,
                    contentScale       = ContentScale.Crop,
                    modifier           = Modifier
                        .fillMaxWidth()
                        .height(220.dp)
                        .clip(MaterialTheme.shapes.small),
                )
            }

            // ── Titre et auteur ───────────────────────────────────────────
            Column(modifier = Modifier.padding(8.dp)) {
                AdaptiveText(
                    text      = book.title,
                    style     = MaterialTheme.typography.titleSmall,
                    isTitle   = true,
                    maxLines  = 2,
                    overflow  = TextOverflow.Ellipsis,
                )
                if (book.author.isNotBlank()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text     = book.author,
                        style    = MaterialTheme.typography.bodySmall,
                        color    = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                if (book.price == 0.0) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text  = "Gratuit",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }
        }
    }
}
```

---

## Étape 6 — Configurer Coil dans l'Application

### 6.1 `TaladzApp.kt` mise à jour

```kotlin
// app/src/main/java/com/taladz/app/TaladzApp.kt
package com.taladz.app

import android.app.Application
import coil3.ImageLoader
import coil3.PlatformContext
import coil3.SingletonImageLoader
import coil3.disk.DiskCache
import coil3.disk.directory
import coil3.memory.MemoryCache
import coil3.network.okhttp.OkHttpNetworkFetcherFactory
import coil3.request.crossfade
import dagger.hilt.android.HiltAndroidApp
import okhttp3.OkHttpClient
import javax.inject.Inject

@HiltAndroidApp
class TaladzApp : Application(), SingletonImageLoader.Factory {

    // OkHttp non authentifié (les images sont publiques sur Cloudinary)
    @Inject
    @UnauthenticatedClient
    lateinit var okHttpClient: OkHttpClient

    override fun newImageLoader(context: PlatformContext): ImageLoader =
        ImageLoader.Builder(context)
            .memoryCache {
                MemoryCache.Builder()
                    .maxSizePercent(context, 0.25)  // 25% de la RAM disponible
                    .build()
            }
            .diskCache {
                DiskCache.Builder()
                    .directory(cacheDir.resolve("image_cache"))
                    .maxSizeBytes(100L * 1024 * 1024)  // 100 MB sur disque
                    .build()
            }
            .components {
                add(OkHttpNetworkFetcherFactory(callFactory = okHttpClient))
            }
            .crossfade(true)
            .build()
}
```

---

## Étape 7 — Écran Catalogue complet

```kotlin
// feature/feature-catalog/src/main/java/com/taladz/feature/catalog/CatalogScreen.kt
package com.taladz.feature.catalog

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.paging.LoadState
import androidx.paging.compose.LazyPagingItems
import androidx.paging.compose.collectAsLazyPagingItems
import com.taladz.core.network.model.dto.OeuvreDto
import com.taladz.core.ui.components.BookCard
import com.taladz.core.ui.components.BookCardData

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CatalogScreen(
    onBookClick : (Int) -> Unit,
    viewModel   : CatalogViewModel = hiltViewModel(),
) {
    val filters       by viewModel.filters.collectAsStateWithLifecycle()
    val oeuvres       : LazyPagingItems<OeuvreDto> = viewModel.oeuvres.collectAsLazyPagingItems()
    var showFilters   by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            Column {
                TopAppBar(
                    title = { Text("Catalogue") },
                    actions = {
                        IconButton(onClick = { showFilters = !showFilters }) {
                            Icon(Icons.Default.FilterList, contentDescription = "Filtres")
                        }
                    },
                )
                // ── Barre de recherche ─────────────────────────────────────────
                SearchBar(
                    query         = filters.searchQuery,
                    onQueryChange = viewModel::updateSearch,
                    modifier      = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                )
                // ── Filtres ────────────────────────────────────────────────────
                if (showFilters) {
                    FilterRow(
                        selectedType    = filters.type,
                        selectedLangue  = filters.langue,
                        onTypeSelected  = viewModel::updateTypeFilter,
                        onLangueSelected = viewModel::updateLangueFilter,
                        onClearAll      = viewModel::clearFilters,
                    )
                }
            }
        },
    ) { innerPadding ->
        Box(modifier = Modifier.padding(innerPadding)) {
            when {
                oeuvres.loadState.refresh is LoadState.Loading -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }
                oeuvres.loadState.refresh is LoadState.Error -> {
                    val error = (oeuvres.loadState.refresh as LoadState.Error).error
                    ErrorView(
                        message = error.message ?: "Erreur de chargement",
                        onRetry = { oeuvres.retry() },
                        modifier = Modifier.align(Alignment.Center),
                    )
                }
                oeuvres.itemCount == 0 && oeuvres.loadState.refresh is LoadState.NotLoading -> {
                    EmptyView(modifier = Modifier.align(Alignment.Center))
                }
                else -> {
                    BooksGrid(
                        oeuvres     = oeuvres,
                        onBookClick = onBookClick,
                    )
                }
            }
        }
    }
}

@Composable
private fun SearchBar(
    query         : String,
    onQueryChange : (String) -> Unit,
    modifier      : Modifier = Modifier,
) {
    OutlinedTextField(
        value         = query,
        onValueChange = onQueryChange,
        placeholder   = { Text("Rechercher un livre, un auteur…") },
        leadingIcon   = { Icon(Icons.Default.Search, contentDescription = null) },
        trailingIcon  = {
            if (query.isNotBlank()) {
                IconButton(onClick = { onQueryChange("") }) {
                    Icon(Icons.Default.Clear, contentDescription = "Effacer")
                }
            }
        },
        singleLine    = true,
        modifier      = modifier,
    )
}

@Composable
private fun FilterRow(
    selectedType      : String?,
    selectedLangue    : String?,
    onTypeSelected    : (String?) -> Unit,
    onLangueSelected  : (String?) -> Unit,
    onClearAll        : () -> Unit,
) {
    val types  = listOf(null to "Tous", "livre" to "Livres", "manuscrit" to "Manuscrits")
    val langues = listOf(null to "Toutes", "ar" to "Arabe", "fr" to "Français", "en" to "English")

    Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
        Text("Type :", style = MaterialTheme.typography.labelMedium)
        Spacer(modifier = Modifier.height(4.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            types.forEach { (value, label) ->
                FilterChip(
                    selected = selectedType == value,
                    onClick  = { onTypeSelected(if (selectedType == value) null else value) },
                    label    = { Text(label) },
                )
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text("Langue :", style = MaterialTheme.typography.labelMedium)
        Spacer(modifier = Modifier.height(4.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            langues.forEach { (value, label) ->
                FilterChip(
                    selected = selectedLangue == value,
                    onClick  = { onLangueSelected(if (selectedLangue == value) null else value) },
                    label    = { Text(label) },
                )
            }
        }
        if (selectedType != null || selectedLangue != null) {
            TextButton(onClick = onClearAll) {
                Text("Effacer les filtres")
            }
        }
    }
}

@Composable
private fun BooksGrid(
    oeuvres     : LazyPagingItems<OeuvreDto>,
    onBookClick : (Int) -> Unit,
) {
    LazyVerticalGrid(
        columns             = GridCells.Adaptive(minSize = 160.dp),
        contentPadding      = PaddingValues(16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement   = Arrangement.spacedBy(16.dp),
    ) {
        items(
            count = oeuvres.itemCount,
            key   = { index -> oeuvres[index]?.idOeuvre ?: index },
        ) { index ->
            val oeuvre = oeuvres[index] ?: return@items
            val coverUrl = oeuvre.medias
                .firstOrNull { it.typeBlock == "couverture" }?.url
                ?: oeuvre.medias.firstOrNull()?.url

            BookCard(
                book    = BookCardData(
                    id       = oeuvre.idOeuvre,
                    title    = oeuvre.titre.fr ?: oeuvre.titre.ar ?: "",
                    coverUrl = coverUrl,
                    price    = oeuvre.prix,
                ),
                onClick  = { onBookClick(oeuvre.idOeuvre) },
            )
        }

        // ── Indicateur de chargement en bas de liste ──────────────────────
        if (oeuvres.loadState.append is LoadState.Loading) {
            item {
                Box(
                    modifier         = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator()
                }
            }
        }
    }
}

@Composable
private fun ErrorView(
    message  : String,
    onRetry  : () -> Unit,
    modifier : Modifier = Modifier,
) {
    Column(
        modifier            = modifier.padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text  = message,
            color = MaterialTheme.colorScheme.error,
            style = MaterialTheme.typography.bodyMedium,
        )
        Spacer(modifier = Modifier.height(16.dp))
        Button(onClick = onRetry) {
            Text("Réessayer")
        }
    }
}

@Composable
private fun EmptyView(modifier: Modifier = Modifier) {
    Column(
        modifier            = modifier.padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text  = "Aucun résultat",
            style = MaterialTheme.typography.headlineSmall,
        )
        Text(
            text  = "Essayez de modifier vos filtres",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
```

---

## Étape 8 — Intégrer dans la navigation

### 8.1 Mettre à jour `TaladzNavHost.kt`

```kotlin
// Dans navigation<MainGraph> { ... }
composable<HomeScreen> {
    CatalogScreen(
        onBookClick = { bookId ->
            navController.navigate(BookDetailScreen(bookId = bookId))
        },
    )
}
```

---

## Étape 9 — Test du `PagingSource`

```kotlin
// feature/feature-catalog/src/test/java/com/taladz/feature/catalog/OeuvresPagingSourceTest.kt
package com.taladz.feature.catalog

import androidx.paging.PagingSource
import androidx.paging.PagingConfig
import androidx.paging.testing.TestPager
import com.taladz.core.network.api.OeuvresApiService
import com.taladz.core.network.model.dto.LocalizedString
import com.taladz.core.network.model.dto.OeuvreDto
import com.taladz.core.network.model.dto.OeuvresListResponse
import com.taladz.core.network.model.dto.PaginationDto
import com.taladz.feature.catalog.paging.OeuvresPagingSource
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import retrofit2.Response

class OeuvresPagingSourceTest {

    private val api = mockk<OeuvresApiService>()

    private fun makeOeuvre(id: Int) = OeuvreDto(
        idOeuvre = id,
        titre    = LocalizedString(fr = "Livre $id", ar = "كتاب $id"),
    )

    @Test
    fun `load first page returns 20 items`() = runTest {
        val oeuvres = (1..20).map { makeOeuvre(it) }
        coEvery {
            api.getOeuvres(page = 1, limit = any(), type = null, langue = null, search = null)
        } returns Response.success(
            OeuvresListResponse(
                oeuvres    = oeuvres,
                pagination = PaginationDto(page = 1, limit = 20, total = 50, pages = 3),
            )
        )

        val pager = TestPager(
            config = PagingConfig(pageSize = 20),
            pagingSource = OeuvresPagingSource(api = api),
        )

        val page = with(pager) { refresh() } as PagingSource.LoadResult.Page
        assertEquals(20, page.data.size)
        assertNull(page.prevKey)   // première page → pas de page précédente
        assertEquals(2, page.nextKey)  // il y a 3 pages → nextKey = 2
    }

    @Test
    fun `load last page has null nextKey`() = runTest {
        val oeuvres = (41..50).map { makeOeuvre(it) }
        coEvery {
            api.getOeuvres(page = 3, limit = any(), type = null, langue = null, search = null)
        } returns Response.success(
            OeuvresListResponse(
                oeuvres    = oeuvres,
                pagination = PaginationDto(page = 3, limit = 20, total = 50, pages = 3),
            )
        )

        val pager = TestPager(
            config = PagingConfig(pageSize = 20),
            pagingSource = OeuvresPagingSource(api = api),
        )

        val page = with(pager) {
            refresh() as PagingSource.LoadResult.Page
            append() as PagingSource.LoadResult.Page
            append() as PagingSource.LoadResult.Page  // page 3 = dernière
        }
        assertNull(page.nextKey)  // dernière page → pas de suivante
    }

    @Test
    fun `load returns Error on network failure`() = runTest {
        coEvery {
            api.getOeuvres(any(), any(), any(), any(), any())
        } throws Exception("Pas de connexion")

        val pager = TestPager(
            config = PagingConfig(pageSize = 20),
            pagingSource = OeuvresPagingSource(api = api),
        )

        val result = with(pager) { refresh() }
        assertTrue(result is PagingSource.LoadResult.Error)
    }
}
```

---

## Points de contrôle — Checklist livrable

Avant de passer au TP 09, vérifie que :

- [ ] `./gradlew :feature:feature-catalog:assembleDebug` → BUILD SUCCESSFUL
- [ ] La liste des livres s'affiche avec couvertures (images Cloudinary)
- [ ] Le défilement vers le bas charge automatiquement la page suivante
- [ ] La barre de recherche avec debounce filtre bien les résultats (taper "negd" → "Nedjma")
- [ ] Les filtres Type et Langue fonctionnent
- [ ] En coupant la connexion → message d'erreur + bouton "Réessayer"
- [ ] Aucun plantage lors d'une rotation d'écran (Paging est bien cachedIn viewModelScope)
- [ ] `./gradlew :feature:feature-catalog:test` → tests PagingSource passent
- [ ] CI GitHub Actions verte

---

*TP 08 terminé. Prochain : TP 09 — Détail d'un livre et cache local Room.*
