# TP 10 — Bibliothèque Utilisateur (Favoris + Notifications)

> **Durée estimée :** 10 heures sur 2-3 jours
> **Niveau :** Intermédiaire
> **Prérequis :** TP 09 terminé (Room et cache offline-first fonctionnels)

---

## Objectifs d'apprentissage

À la fin de ce TP, tu sauras :
- [ ] Implémenter les favoris avec `POST/DELETE /api/favoris`
- [ ] Afficher la liste "Mes livres" depuis `GET /api/oeuvres/my/list`
- [ ] Synchroniser l'état favori en temps réel entre le catalogue et la bibliothèque
- [ ] Récupérer les notifications avec `GET /api/notifications/list`
- [ ] Afficher un badge de notifications non lues dans la Bottom Bar
- [ ] Marquer les notifications comme lues

---

## Concepts théoriques

### Synchronisation d'état entre écrans

Quand l'utilisateur met un livre en favori depuis le catalogue, le même état doit être reflété dans la bibliothèque **sans recharger**. La solution : un `FavoritesRepository` singleton qui expose un `StateFlow<Set<Int>>` (les IDs des favoris). Les deux ViewModels observent ce même flow.

```
CatalogViewModel ──observe──► FavoritesRepository.favoriteIds: StateFlow<Set<Int>>
                                         ↑
LibraryViewModel ──observe──┘           ↑
                                    InMemory Set (mis à jour quand add/remove)
```

### Badge de notification

Le badge dans la Bottom Bar doit se mettre à jour en temps réel. On utilise un `NotificationsRepository` singleton avec un `StateFlow<Int>` (nombre non lus) partagé entre tous les ViewModels.

---

## Étape 1 — Module `data-library`

### 1.1 Structure

```
data/data-library/
├── build.gradle.kts
└── src/main/java/com/taladz/data/library/
    ├── di/
    │   └── LibraryModule.kt
    ├── repository/
    │   ├── FavoritesRepository.kt
    │   └── NotificationsRepository.kt
    └── api/
        ├── FavoritesApiService.kt
        └── NotificationsApiService.kt
```

### 1.2 `data/data-library/build.gradle.kts`

```kotlin
plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
}

android {
    namespace  = "com.taladz.data.library"
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
    implementation(project(":core:core-network"))
    implementation(project(":core:core-database"))

    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)

    implementation(libs.retrofit.core)
    implementation(libs.retrofit.kotlinx.serialization)
    implementation(libs.kotlinx.serialization.json)

    testImplementation("junit:junit:4.13.2")
    testImplementation(libs.test.mockk)
    testImplementation(libs.test.coroutines)
    testImplementation(libs.test.turbine)
}
```

### 1.3 `settings.gradle.kts`

```kotlin
include(":data:data-library")
```

---

## Étape 2 — API Favoris et Notifications

### 2.1 DTOs

```kotlin
// core/core-network/src/main/java/com/taladz/core/network/model/dto/FavoritesDto.kt
package com.taladz.core.network.model.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AddFavoriteRequest(
    @SerialName("type_entite") val typeEntite : String = "oeuvre",
    @SerialName("id_entite")   val idEntite   : Int,
)

@Serializable
data class FavoriteDto(
    @SerialName("id_favori")   val idFavori   : Int,
    @SerialName("type_entite") val typeEntite : String,
    @SerialName("id_entite")   val idEntite   : Int,
    @SerialName("oeuvre")      val oeuvre     : OeuvreDto? = null,
)

@Serializable
data class FavoritesListResponse(
    val favoris    : List<FavoriteDto>,
    val pagination : PaginationDto,
)
```

```kotlin
// core/core-network/src/main/java/com/taladz/core/network/model/dto/NotificationDto.kt
package com.taladz.core.network.model.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class NotificationDto(
    @SerialName("id_notification")   val idNotification  : Int,
    @SerialName("type_notification") val typeNotification : String,
    @SerialName("titre")             val titre            : String,
    @SerialName("message")           val message          : String,
    @SerialName("lu")                val lu               : Boolean = false,
    @SerialName("date_creation")     val dateCreation     : String,
)

@Serializable
data class NotificationsListResponse(
    val notifications : List<NotificationDto>,
    val pagination    : PaginationDto,
)

@Serializable
data class NotificationsSummaryResponse(
    @SerialName("unread_count") val unreadCount : Int,
    @SerialName("has_urgent")   val hasUrgent   : Boolean = false,
)
```

### 2.2 `FavoritesApiService.kt`

```kotlin
// data/data-library/src/main/java/com/taladz/data/library/api/FavoritesApiService.kt
package com.taladz.data.library.api

import com.taladz.core.network.model.dto.AddFavoriteRequest
import com.taladz.core.network.model.dto.FavoritesListResponse
import retrofit2.Response
import retrofit2.http.*

interface FavoritesApiService {

    @GET("favoris")
    suspend fun getFavorites(
        @Query("page")  page  : Int = 1,
        @Query("limit") limit : Int = 50,
    ): Response<FavoritesListResponse>

    @GET("favoris/check/{type}/{id}")
    suspend fun checkFavorite(
        @Path("type") type : String,
        @Path("id")   id   : Int,
    ): Response<Map<String, Boolean>>

    @POST("favoris")
    suspend fun addFavorite(
        @Body request: AddFavoriteRequest,
    ): Response<Unit>

    @DELETE("favoris/{type}/{id}")
    suspend fun removeFavorite(
        @Path("type") type : String,
        @Path("id")   id   : Int,
    ): Response<Unit>
}
```

### 2.3 `NotificationsApiService.kt`

```kotlin
// data/data-library/src/main/java/com/taladz/data/library/api/NotificationsApiService.kt
package com.taladz.data.library.api

import com.taladz.core.network.model.dto.NotificationsListResponse
import com.taladz.core.network.model.dto.NotificationsSummaryResponse
import retrofit2.Response
import retrofit2.http.*

interface NotificationsApiService {

    @GET("notifications/list")
    suspend fun getNotifications(
        @Query("page")  page  : Int = 1,
        @Query("limit") limit : Int = 20,
    ): Response<NotificationsListResponse>

    @GET("notifications/summary")
    suspend fun getSummary(): Response<NotificationsSummaryResponse>

    @PUT("notifications/{id}/read")
    suspend fun markAsRead(@Path("id") id: Int): Response<Unit>

    @PUT("notifications/read-all")
    suspend fun markAllAsRead(): Response<Unit>

    @DELETE("notifications/{id}")
    suspend fun deleteNotification(@Path("id") id: Int): Response<Unit>
}
```

---

## Étape 3 — `FavoritesRepository`

```kotlin
// data/data-library/src/main/java/com/taladz/data/library/repository/FavoritesRepository.kt
package com.taladz.data.library.repository

import com.taladz.core.network.model.NetworkResult
import com.taladz.core.network.model.dto.AddFavoriteRequest
import com.taladz.core.network.model.dto.FavoriteDto
import com.taladz.core.network.util.safeApiCall
import com.taladz.data.library.api.FavoritesApiService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FavoritesRepository @Inject constructor(
    private val api: FavoritesApiService,
) {

    // IDs des livres favoris — SharedState entre CatalogViewModel et LibraryViewModel
    private val _favoriteIds = MutableStateFlow<Set<Int>>(emptySet())
    val favoriteIds: StateFlow<Set<Int>> = _favoriteIds.asStateFlow()

    private val _favorites = MutableStateFlow<List<FavoriteDto>>(emptyList())
    val favorites: StateFlow<List<FavoriteDto>> = _favorites.asStateFlow()

    suspend fun loadFavorites(): NetworkResult<List<FavoriteDto>> {
        val result = safeApiCall { api.getFavorites(limit = 100) }
        if (result is NetworkResult.Success) {
            val favs = result.data.favoris
            _favorites.value = favs
            _favoriteIds.value = favs
                .filter { it.typeEntite == "oeuvre" }
                .map { it.idEntite }
                .toSet()
        }
        return result.map { it.favoris }
    }

    suspend fun toggleFavorite(bookId: Int): NetworkResult<Unit> {
        return if (bookId in _favoriteIds.value) {
            removeFavorite(bookId)
        } else {
            addFavorite(bookId)
        }
    }

    suspend fun addFavorite(bookId: Int): NetworkResult<Unit> {
        val result = safeApiCall {
            api.addFavorite(AddFavoriteRequest(idEntite = bookId))
        }
        if (result is NetworkResult.Success) {
            _favoriteIds.update { it + bookId }
        }
        return result
    }

    suspend fun removeFavorite(bookId: Int): NetworkResult<Unit> {
        val result = safeApiCall {
            api.removeFavorite(type = "oeuvre", id = bookId)
        }
        if (result is NetworkResult.Success) {
            _favoriteIds.update { it - bookId }
            _favorites.update { list -> list.filter { it.idEntite != bookId } }
        }
        return result
    }

    fun isFavorite(bookId: Int): Boolean = bookId in _favoriteIds.value
}
```

---

## Étape 4 — `NotificationsRepository`

```kotlin
// data/data-library/src/main/java/com/taladz/data/library/repository/NotificationsRepository.kt
package com.taladz.data.library.repository

import com.taladz.core.network.model.NetworkResult
import com.taladz.core.network.model.dto.NotificationDto
import com.taladz.core.network.util.safeApiCall
import com.taladz.data.library.api.NotificationsApiService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NotificationsRepository @Inject constructor(
    private val api: NotificationsApiService,
) {

    private val _unreadCount = MutableStateFlow(0)
    val unreadCount: StateFlow<Int> = _unreadCount.asStateFlow()

    private val _notifications = MutableStateFlow<List<NotificationDto>>(emptyList())
    val notifications: StateFlow<List<NotificationDto>> = _notifications.asStateFlow()

    suspend fun loadSummary() {
        val result = safeApiCall { api.getSummary() }
        if (result is NetworkResult.Success) {
            _unreadCount.value = result.data.unreadCount
        }
    }

    suspend fun loadNotifications(): NetworkResult<List<NotificationDto>> {
        val result = safeApiCall { api.getNotifications() }
        if (result is NetworkResult.Success) {
            _notifications.value = result.data.notifications
            _unreadCount.value = result.data.notifications.count { !it.lu }
        }
        return result.map { it.notifications }
    }

    suspend fun markAsRead(notificationId: Int) {
        val result = safeApiCall { api.markAsRead(notificationId) }
        if (result is NetworkResult.Success) {
            _notifications.update { list ->
                list.map { if (it.idNotification == notificationId) it.copy(lu = true) else it }
            }
            _unreadCount.update { max(0, it - 1) }
        }
    }

    suspend fun markAllAsRead() {
        val result = safeApiCall { api.markAllAsRead() }
        if (result is NetworkResult.Success) {
            _notifications.update { list -> list.map { it.copy(lu = true) } }
            _unreadCount.value = 0
        }
    }

    suspend fun deleteNotification(notificationId: Int) {
        val result = safeApiCall { api.deleteNotification(notificationId) }
        if (result is NetworkResult.Success) {
            val wasUnread = _notifications.value.find {
                it.idNotification == notificationId
            }?.lu == false
            _notifications.update { list -> list.filter { it.idNotification != notificationId } }
            if (wasUnread) _unreadCount.update { max(0, it - 1) }
        }
    }
}

private fun max(a: Int, b: Int): Int = if (a > b) a else b
```

---

## Étape 5 — Module Hilt `LibraryModule`

```kotlin
// data/data-library/src/main/java/com/taladz/data/library/di/LibraryModule.kt
package com.taladz.data.library.di

import com.taladz.core.network.di.AuthenticatedRetrofit
import com.taladz.data.library.api.FavoritesApiService
import com.taladz.data.library.api.NotificationsApiService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import retrofit2.Retrofit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object LibraryModule {

    @Provides
    @Singleton
    fun provideFavoritesApiService(
        @AuthenticatedRetrofit retrofit: Retrofit,
    ): FavoritesApiService = retrofit.create(FavoritesApiService::class.java)

    @Provides
    @Singleton
    fun provideNotificationsApiService(
        @AuthenticatedRetrofit retrofit: Retrofit,
    ): NotificationsApiService = retrofit.create(NotificationsApiService::class.java)
}
```

---

## Étape 6 — Bottom Nav Bar avec badge

### 6.1 `AppViewModel.kt` — ViewModel global partagé

```kotlin
// app/src/main/java/com/taladz/app/AppViewModel.kt
package com.taladz.app

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.taladz.data.library.repository.FavoritesRepository
import com.taladz.data.library.repository.NotificationsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AppViewModel @Inject constructor(
    private val notificationsRepository : NotificationsRepository,
    private val favoritesRepository     : FavoritesRepository,
) : ViewModel() {

    val unreadNotificationsCount: StateFlow<Int> = notificationsRepository.unreadCount
        .stateIn(
            scope        = viewModelScope,
            started      = SharingStarted.WhileSubscribed(5_000),
            initialValue = 0,
        )

    init {
        viewModelScope.launch {
            notificationsRepository.loadSummary()
            favoritesRepository.loadFavorites()
        }
    }

    fun refreshNotifications() {
        viewModelScope.launch {
            notificationsRepository.loadSummary()
        }
    }
}
```

### 6.2 Mettre à jour `BottomNavBar.kt` avec badge

```kotlin
// app/src/main/java/com/taladz/app/navigation/BottomNavBar.kt
// Modifier NavigationBarItem pour LibraryScreen :

NavigationBarItem(
    selected = isSelected,
    onClick  = { /* ... navigation ... */ },
    icon  = {
        if (item.route == LibraryScreen && badgeCount > 0) {
            BadgedBox(badge = {
                Badge { Text(if (badgeCount > 99) "99+" else "$badgeCount") }
            }) {
                Icon(
                    imageVector    = if (isSelected) item.selectedIcon else item.unselectedIcon,
                    contentDescription = item.label,
                )
            }
        } else {
            Icon(
                imageVector    = if (isSelected) item.selectedIcon else item.unselectedIcon,
                contentDescription = item.label,
            )
        }
    },
    label = { Text(item.label) },
)
```

### 6.3 Passer le `badgeCount` dans `TaladzNavHost.kt`

```kotlin
@Composable
fun TaladzNavHost(isAuthenticated: Boolean) {
    val appViewModel: AppViewModel = hiltViewModel()
    val unreadCount by appViewModel.unreadNotificationsCount.collectAsStateWithLifecycle()

    // ...
    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                TaladzBottomNavBar(
                    navController = navController,
                    badgeCount    = unreadCount,
                )
            }
        },
    ) { ... }
}
```

---

## Étape 7 — Bouton favori dans l'écran détail

### 7.1 `FavoritesViewModel.kt`

```kotlin
// feature/feature-catalog/src/main/java/com/taladz/feature/catalog/FavoritesViewModel.kt
package com.taladz.feature.catalog

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.taladz.data.library.repository.FavoritesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class FavoritesViewModel @Inject constructor(
    private val favoritesRepository: FavoritesRepository,
) : ViewModel() {

    val favoriteIds: StateFlow<Set<Int>> = favoritesRepository.favoriteIds

    fun toggleFavorite(bookId: Int) {
        viewModelScope.launch {
            favoritesRepository.toggleFavorite(bookId)
        }
    }
}
```

### 7.2 Ajouter le bouton dans `BookDetailContent`

```kotlin
// Dans BookDetailContent, après les métadonnées :
val favoritesViewModel: FavoritesViewModel = hiltViewModel()
val favoriteIds by favoritesViewModel.favoriteIds.collectAsStateWithLifecycle()
val isFavorite = book.idOeuvre in favoriteIds

IconButton(
    onClick = { favoritesViewModel.toggleFavorite(book.idOeuvre) }
) {
    Icon(
        imageVector = if (isFavorite) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
        contentDescription = if (isFavorite) "Retirer des favoris" else "Ajouter aux favoris",
        tint = if (isFavorite) MaterialTheme.colorScheme.error else LocalContentColor.current,
    )
}
```

---

## Étape 8 — Écran Bibliothèque

```kotlin
// feature/feature-library/src/main/java/com/taladz/feature/library/LibraryScreen.kt
package com.taladz.feature.library

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LibraryScreen(
    onBookClick : (Int) -> Unit = {},
    viewModel   : LibraryViewModel = hiltViewModel(),
) {
    val favorites by viewModel.favorites.collectAsStateWithLifecycle()
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Ma bibliothèque") },
                actions = {
                    TextButton(onClick = viewModel::refresh) {
                        Text("Actualiser")
                    }
                },
            )
        },
    ) { innerPadding ->
        Box(modifier = Modifier
            .fillMaxSize()
            .padding(innerPadding)) {

            if (isLoading) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            } else if (favorites.isEmpty()) {
                Column(
                    modifier            = Modifier.align(Alignment.Center).padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        text  = "Votre bibliothèque est vide",
                        style = MaterialTheme.typography.headlineSmall,
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text  = "Ajoutez des livres en favoris depuis le catalogue",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            } else {
                LazyColumn(
                    contentPadding    = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(
                        items = favorites,
                        key   = { it.idFavori },
                    ) { favorite ->
                        val oeuvre = favorite.oeuvre ?: return@items
                        Card(
                            onClick  = { onBookClick(oeuvre.idOeuvre) },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text  = oeuvre.titre.fr ?: oeuvre.titre.ar ?: "?",
                                        style = MaterialTheme.typography.titleMedium,
                                    )
                                    oeuvre.titre.ar?.let { ar ->
                                        Text(
                                            text  = ar,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                                IconButton(
                                    onClick = { viewModel.removeFavorite(oeuvre.idOeuvre) }
                                ) {
                                    Icon(
                                        imageVector        = Icons.Filled.Favorite,
                                        contentDescription = "Retirer",
                                        tint               = MaterialTheme.colorScheme.error,
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
```

### 8.2 `LibraryViewModel.kt`

```kotlin
// feature/feature-library/src/main/java/com/taladz/feature/library/LibraryViewModel.kt
package com.taladz.feature.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.taladz.core.network.model.dto.FavoriteDto
import com.taladz.data.library.repository.FavoritesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class LibraryViewModel @Inject constructor(
    private val favoritesRepository: FavoritesRepository,
) : ViewModel() {

    // Observe le même StateFlow que CatalogViewModel → synchronisation automatique
    val favorites: StateFlow<List<FavoriteDto>> = favoritesRepository.favorites
        .stateIn(
            scope        = viewModelScope,
            started      = SharingStarted.WhileSubscribed(5_000),
            initialValue = emptyList(),
        )

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _isLoading.value = true
            favoritesRepository.loadFavorites()
            _isLoading.value = false
        }
    }

    fun removeFavorite(bookId: Int) {
        viewModelScope.launch {
            favoritesRepository.removeFavorite(bookId)
        }
    }
}
```

---

## Étape 9 — Écran Notifications

```kotlin
// feature/feature-library/src/main/java/com/taladz/feature/library/NotificationsScreen.kt
package com.taladz.feature.library

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
    viewModel: NotificationsViewModel = hiltViewModel(),
) {
    val notifications by viewModel.notifications.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Notifications") },
                actions = {
                    TextButton(onClick = viewModel::markAllAsRead) {
                        Text("Tout lire")
                    }
                },
            )
        },
    ) { innerPadding ->
        LazyColumn(
            modifier       = Modifier.padding(innerPadding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(
                items = notifications,
                key   = { it.idNotification },
            ) { notif ->
                NotificationCard(
                    notification = notif,
                    onRead       = { viewModel.markAsRead(notif.idNotification) },
                    onDelete     = { viewModel.deleteNotification(notif.idNotification) },
                )
            }
        }
    }
}

@Composable
private fun NotificationCard(
    notification : com.taladz.core.network.model.dto.NotificationDto,
    onRead       : () -> Unit,
    onDelete     : () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors   = CardDefaults.cardColors(
            containerColor = if (notification.lu) {
                MaterialTheme.colorScheme.surfaceVariant
            } else {
                MaterialTheme.colorScheme.primaryContainer
            },
        ),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier              = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text     = notification.titre,
                    style    = MaterialTheme.typography.titleSmall,
                    modifier = Modifier.weight(1f),
                )
                if (!notification.lu) {
                    TextButton(onClick = onRead) {
                        Text("Lu", style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text  = notification.message,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text  = notification.dateCreation,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.outline,
            )
        }
    }
}
```

---

## Étape 10 — Tests unitaires

```kotlin
// data/data-library/src/test/java/com/taladz/data/library/FavoritesRepositoryTest.kt
package com.taladz.data.library

import app.cash.turbine.test
import com.taladz.core.network.model.NetworkResult
import com.taladz.core.network.model.dto.AddFavoriteRequest
import com.taladz.core.network.model.dto.FavoriteDto
import com.taladz.core.network.model.dto.FavoritesListResponse
import com.taladz.core.network.model.dto.PaginationDto
import com.taladz.data.library.api.FavoritesApiService
import com.taladz.data.library.repository.FavoritesRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Response

class FavoritesRepositoryTest {

    private lateinit var api        : FavoritesApiService
    private lateinit var repository : FavoritesRepository

    @Before
    fun setUp() {
        api        = mockk(relaxed = true)
        repository = FavoritesRepository(api)
    }

    @Test
    fun `loadFavorites updates favoriteIds`() = runTest {
        val favs = listOf(
            FavoriteDto(idFavori = 1, typeEntite = "oeuvre", idEntite = 42),
            FavoriteDto(idFavori = 2, typeEntite = "oeuvre", idEntite = 99),
        )
        coEvery { api.getFavorites(any(), any()) } returns Response.success(
            FavoritesListResponse(
                favoris    = favs,
                pagination = PaginationDto(1, 50, 2, 1),
            )
        )

        repository.loadFavorites()

        repository.favoriteIds.test {
            val ids = awaitItem()
            assertTrue(42 in ids)
            assertTrue(99 in ids)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `addFavorite updates favoriteIds immediately`() = runTest {
        coEvery { api.addFavorite(any()) } returns Response.success(Unit)

        repository.addFavorite(42)

        assertTrue(repository.isFavorite(42))
    }

    @Test
    fun `removeFavorite removes from favoriteIds`() = runTest {
        coEvery { api.addFavorite(any()) } returns Response.success(Unit)
        coEvery { api.removeFavorite(any(), any()) } returns Response.success(Unit)

        repository.addFavorite(42)
        assertTrue(repository.isFavorite(42))

        repository.removeFavorite(42)
        assertFalse(repository.isFavorite(42))
    }

    @Test
    fun `toggleFavorite adds when not favorite`() = runTest {
        coEvery { api.addFavorite(any()) } returns Response.success(Unit)

        repository.toggleFavorite(42)

        coVerify { api.addFavorite(AddFavoriteRequest(idEntite = 42)) }
    }

    @Test
    fun `toggleFavorite removes when already favorite`() = runTest {
        coEvery { api.addFavorite(any()) } returns Response.success(Unit)
        coEvery { api.removeFavorite(any(), any()) } returns Response.success(Unit)

        repository.addFavorite(42)
        repository.toggleFavorite(42)  // devrait supprimer

        coVerify { api.removeFavorite(type = "oeuvre", id = 42) }
    }
}
```

---

## Récapitulatif des fichiers créés / modifiés

```
data/data-library/                              ← nouveau module
├── build.gradle.kts
└── src/main/java/com/taladz/data/library/
    ├── api/
    │   ├── FavoritesApiService.kt
    │   └── NotificationsApiService.kt
    ├── di/LibraryModule.kt
    └── repository/
        ├── FavoritesRepository.kt              ← SharedState favoriteIds
        └── NotificationsRepository.kt          ← unreadCount StateFlow

feature/feature-library/                        ← nouveau module
└── src/main/java/com/taladz/feature/library/
    ├── LibraryScreen.kt
    ├── LibraryViewModel.kt
    ├── NotificationsScreen.kt
    └── NotificationsViewModel.kt

feature/feature-catalog/                         ← +FavoritesViewModel
└── src/.../FavoritesViewModel.kt

app/src/.../
├── AppViewModel.kt                             ← unreadCount global
└── navigation/BottomNavBar.kt                  ← +badge notifications

core/core-network/.../dto/
├── FavoritesDto.kt
└── NotificationDto.kt

settings.gradle.kts                             ← +:data:data-library, +:feature:feature-library
```

---

## Points de contrôle — Checklist livrable

Avant de passer au TP 11, vérifie que :

- [ ] Ajouter un favori depuis le détail → apparaît instantanément dans la Bibliothèque
- [ ] Retirer un favori depuis la Bibliothèque → disparaît du catalogue (cœur vide)
- [ ] Le badge de notifications s'affiche dans la Bottom Bar avec le bon chiffre
- [ ] Cliquer "Tout lire" → badge disparaît
- [ ] `./gradlew :data:data-library:test` → 5 tests passent
- [ ] CI GitHub Actions verte

---

*TP 10 terminé. Prochain : TP 11 — Téléchargement offline avec WorkManager.*
