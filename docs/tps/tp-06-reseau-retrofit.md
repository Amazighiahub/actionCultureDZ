# TP 06 — Couche réseau : Retrofit + OkHttp + Certificate Pinning

> **Durée estimée :** 12 heures sur 3 jours
> **Niveau :** Intermédiaire
> **Prérequis :** TP 05 terminé (Hilt fonctionnel, SettingsViewModel injecté)

---

## Objectifs d'apprentissage

À la fin de ce TP, tu sauras :
- [ ] Créer le module `core-network` et y configurer Retrofit
- [ ] Utiliser Kotlinx Serialization pour parser le JSON
- [ ] Construire un `NetworkModule` Hilt propre avec OkHttp
- [ ] Implémenter le certificate pinning (sécurité TLS)
- [ ] Gérer les erreurs réseau de façon uniforme avec `NetworkResult<T>`
- [ ] Appeler l'endpoint `GET /api/oeuvres` et afficher les résultats en log
- [ ] Tester avec MockWebServer

---

## Concepts théoriques

### Retrofit et OkHttp — rôles distincts

```
┌─────────────────────────────────────────┐
│  Retrofit                               │
│  → Convertit les interfaces Kotlin      │
│    en appels HTTP                       │
│  → Désérialise le JSON en data class    │
│                                         │
│  ↕ délègue les appels HTTP à ↕          │
│                                         │
│  OkHttp                                 │
│  → Gère les connexions TCP/TLS          │
│  → Intercepteurs (logs, auth, cache)    │
│  → Connection pooling, retry            │
│  → Certificate pinning                  │
└─────────────────────────────────────────┘
```

### Certificate Pinning

Le certificate pinning vérifie que le **certificat TLS présenté par le serveur** correspond exactement au certificat qu'on a "épinglé" dans l'app. Cela protège contre les attaques Man-in-the-Middle même si un attaquant a un certificat signé par une CA légitime.

```
Sans pinning :
Client → vérifie que le certif est signé par une CA connue → OK (vulnérable au MITM)

Avec pinning :
Client → vérifie signature CA → vérifie que SHA-256 du certif = valeur hardcodée → OK
```

### NetworkResult sealed class

Au lieu de laisser les exceptions se propager, on les encapsule :

```kotlin
sealed class NetworkResult<out T> {
    data class Success<T>(val data: T) : NetworkResult<T>()
    data class Error(val code: Int, val message: String) : NetworkResult<Nothing>()
    data object Loading : NetworkResult<Nothing>()
}
```

---

## Étape 1 — Créer le module `core-network`

### 1.1 Structure

```
core/core-network/
├── build.gradle.kts
└── src/main/java/com/taladz/core/network/
    ├── di/
    │   └── NetworkModule.kt
    ├── model/
    │   ├── NetworkResult.kt
    │   ├── ApiResponse.kt
    │   └── dto/
    │       ├── OeuvreDto.kt
    │       ├── UserDto.kt
    │       └── PaginationDto.kt
    ├── api/
    │   ├── TaladzApiService.kt
    │   └── OeuvresApiService.kt
    ├── interceptor/
    │   ├── AuthInterceptor.kt        ← ajouté en TP 07
    │   └── LoggingInterceptor.kt
    └── util/
        └── NetworkResultCall.kt
```

### 1.2 `core/core-network/build.gradle.kts`

```kotlin
plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
}

android {
    namespace  = "com.taladz.core.network"
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

    // Hilt
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)

    // Réseau
    implementation(libs.retrofit.core)
    implementation(libs.retrofit.kotlinx.serialization)
    implementation(libs.okhttp.core)
    implementation(libs.okhttp.logging)
    implementation(libs.kotlinx.serialization.json)

    // Tests
    testImplementation(libs.test.mockwebserver)
    testImplementation("junit:junit:4.13.2")
    testImplementation(libs.test.coroutines)
}
```

### 1.3 Ajouter les dépendances réseau dans `libs.versions.toml`

```toml
[versions]
retrofit         = "2.11.0"
okhttp           = "4.12.0"
serialization    = "1.7.3"   # déjà présent depuis TP 04

[libraries]
retrofit-core               = { group = "com.squareup.retrofit2", name = "retrofit",                            version.ref = "retrofit" }
retrofit-kotlinx-serialization = { group = "com.squareup.retrofit2", name = "converter-kotlinx-serialization", version.ref = "retrofit" }
okhttp-core                 = { group = "com.squareup.okhttp3",   name = "okhttp",                             version.ref = "okhttp"   }
okhttp-logging              = { group = "com.squareup.okhttp3",   name = "logging-interceptor",                version.ref = "okhttp"   }
test-mockwebserver          = { group = "com.squareup.okhttp3",   name = "mockwebserver",                      version.ref = "okhttp"   }
```

### 1.4 Inclure le module dans `settings.gradle.kts`

```kotlin
include(":core:core-network")
```

---

## Étape 2 — Modèles réseau (DTOs)

Les DTOs (Data Transfer Objects) sont les structures qui correspondent **exactement** à ce que l'API renvoie. On ne les expose pas à l'UI — on les convertit en modèles du domaine.

### 2.1 `PaginationDto.kt`

```kotlin
// core/core-network/src/main/java/com/taladz/core/network/model/dto/PaginationDto.kt
package com.taladz.core.network.model.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class PaginationDto(
    val page   : Int,
    val limit  : Int,
    val total  : Int,
    val pages  : Int,
)
```

### 2.2 `LocalizedString.kt` — champs multilingues

L'API Taladz renvoie `titre: {"fr": "...", "ar": "..."}`. On crée un type dédié :

```kotlin
// core/core-network/src/main/java/com/taladz/core/network/model/dto/LocalizedString.kt
package com.taladz.core.network.model.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LocalizedString(
    val fr: String? = null,
    val ar: String? = null,
    val en: String? = null,
) {
    // Retourne la valeur dans la langue demandée avec fallback
    fun get(languageCode: String): String {
        return when (languageCode) {
            "ar"  -> ar ?: fr ?: en ?: ""
            "en"  -> en ?: fr ?: ar ?: ""
            else  -> fr ?: ar ?: en ?: ""  // fr par défaut
        }
    }

    // Retourne la première valeur non nulle
    fun getAny(): String = fr ?: ar ?: en ?: ""
}
```

### 2.3 `MediaDto.kt`

```kotlin
// core/core-network/src/main/java/com/taladz/core/network/model/dto/MediaDto.kt
package com.taladz.core.network.model.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class MediaDto(
    @SerialName("id_media")   val idMedia   : Int,
    @SerialName("url")        val url       : String,
    @SerialName("mimetype")   val mimetype  : String? = null,
    @SerialName("size")       val size      : Long?   = null,
    @SerialName("type_block") val typeBlock : String? = null,
)
```

### 2.4 `OeuvreDto.kt`

```kotlin
// core/core-network/src/main/java/com/taladz/core/network/model/dto/OeuvreDto.kt
package com.taladz.core.network.model.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class OeuvreDto(
    @SerialName("id_oeuvre")         val idOeuvre       : Int,
    @SerialName("titre")             val titre          : LocalizedString,
    @SerialName("description")       val description    : LocalizedString? = null,
    @SerialName("prix")              val prix           : Double           = 0.0,
    @SerialName("annee_creation")    val anneeCreation  : Int?             = null,
    @SerialName("statut")            val statut         : String           = "publie",
    @SerialName("nb_vues")           val nbVues         : Int              = 0,
    @SerialName("est_mis_en_avant")  val estMisEnAvant  : Boolean          = false,
    @SerialName("medias")            val medias         : List<MediaDto>   = emptyList(),
    @SerialName("type")              val type           : TypeOeuvreDto?   = null,
    @SerialName("id_langue")         val idLangue       : Int?             = null,
)

@Serializable
data class TypeOeuvreDto(
    @SerialName("id")  val id  : Int,
    @SerialName("nom") val nom : LocalizedString,
)
```

### 2.5 `OeuvresListResponse.kt`

```kotlin
// core/core-network/src/main/java/com/taladz/core/network/model/dto/OeuvresListResponse.kt
package com.taladz.core.network.model.dto

import kotlinx.serialization.Serializable

@Serializable
data class OeuvresListResponse(
    val oeuvres    : List<OeuvreDto>,
    val pagination : PaginationDto,
)
```

---

## Étape 3 — NetworkResult sealed class

```kotlin
// core/core-network/src/main/java/com/taladz/core/network/model/NetworkResult.kt
package com.taladz.core.network.model

sealed class NetworkResult<out T> {
    data class Success<T>(val data: T) : NetworkResult<T>()
    data class Error(
        val code    : Int    = -1,
        val message : String = "Erreur inconnue",
    ) : NetworkResult<Nothing>()
    data object Loading : NetworkResult<Nothing>()
}

// Extension functions pour utilisation fluente
inline fun <T> NetworkResult<T>.onSuccess(action: (T) -> Unit): NetworkResult<T> {
    if (this is NetworkResult.Success) action(data)
    return this
}

inline fun <T> NetworkResult<T>.onError(action: (Int, String) -> Unit): NetworkResult<T> {
    if (this is NetworkResult.Error) action(code, message)
    return this
}

inline fun <T, R> NetworkResult<T>.map(transform: (T) -> R): NetworkResult<R> = when (this) {
    is NetworkResult.Success -> NetworkResult.Success(transform(data))
    is NetworkResult.Error   -> this
    is NetworkResult.Loading -> NetworkResult.Loading
}
```

---

## Étape 4 — Interface Retrofit

### 4.1 `OeuvresApiService.kt`

```kotlin
// core/core-network/src/main/java/com/taladz/core/network/api/OeuvresApiService.kt
package com.taladz.core.network.api

import com.taladz.core.network.model.dto.OeuvreDto
import com.taladz.core.network.model.dto.OeuvresListResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface OeuvresApiService {

    @GET("oeuvres")
    suspend fun getOeuvres(
        @Query("page")    page  : Int    = 1,
        @Query("limit")   limit : Int    = 20,
        @Query("type")    type  : String? = null,
        @Query("langue")  langue: String? = null,
        @Query("search")  search: String? = null,
    ): Response<OeuvresListResponse>

    @GET("oeuvres/{id}")
    suspend fun getOeuvreById(
        @Path("id") id: Int,
    ): Response<OeuvreDto>

    @GET("oeuvres/recent")
    suspend fun getRecentOeuvres(
        @Query("limit") limit: Int = 10,
    ): Response<OeuvresListResponse>

    @GET("oeuvres/popular")
    suspend fun getPopularOeuvres(
        @Query("limit") limit: Int = 10,
    ): Response<OeuvresListResponse>

    @GET("oeuvres/{id}/medias")
    suspend fun getOeuvreMedias(
        @Path("id") id: Int,
    ): Response<List<com.taladz.core.network.model.dto.MediaDto>>

    @GET("oeuvres/search")
    suspend fun searchOeuvres(
        @Query("q")     query : String,
        @Query("page")  page  : Int = 1,
        @Query("limit") limit : Int = 20,
    ): Response<OeuvresListResponse>
}
```

---

## Étape 5 — Helper pour gérer les réponses

```kotlin
// core/core-network/src/main/java/com/taladz/core/network/util/NetworkResultCall.kt
package com.taladz.core.network.util

import com.taladz.core.network.model.NetworkResult
import retrofit2.Response

suspend fun <T> safeApiCall(
    apiCall: suspend () -> Response<T>,
): NetworkResult<T> = try {
    val response = apiCall()
    if (response.isSuccessful) {
        val body = response.body()
        if (body != null) {
            NetworkResult.Success(body)
        } else {
            NetworkResult.Error(code = response.code(), message = "Réponse vide du serveur")
        }
    } else {
        NetworkResult.Error(
            code    = response.code(),
            message = parseErrorBody(response) ?: httpErrorMessage(response.code()),
        )
    }
} catch (e: java.net.UnknownHostException) {
    NetworkResult.Error(message = "Pas de connexion internet")
} catch (e: java.net.SocketTimeoutException) {
    NetworkResult.Error(message = "Le serveur ne répond pas (timeout)")
} catch (e: java.io.IOException) {
    NetworkResult.Error(message = "Erreur réseau : ${e.message}")
} catch (e: Exception) {
    NetworkResult.Error(message = "Erreur inattendue : ${e.message}")
}

private fun <T> parseErrorBody(response: Response<T>): String? = try {
    response.errorBody()?.string()
        ?.let { kotlinx.serialization.json.Json.decodeFromString<ErrorResponse>(it).error }
} catch (e: Exception) {
    null
}

private fun httpErrorMessage(code: Int): String = when (code) {
    400 -> "Requête invalide"
    401 -> "Non authentifié — veuillez vous reconnecter"
    403 -> "Accès refusé"
    404 -> "Ressource introuvable"
    422 -> "Données invalides"
    429 -> "Trop de requêtes — réessayez dans un moment"
    500 -> "Erreur serveur interne"
    else -> "Erreur HTTP $code"
}

@kotlinx.serialization.Serializable
private data class ErrorResponse(
    val error   : String? = null,
    val message : String? = null,
)
```

---

## Étape 6 — Certificate Pinning + NetworkModule

### 6.1 Obtenir le fingerprint SHA-256 du certificat

```bash
# Sur ton PC avec OpenSSL :
echo | openssl s_client -servername api.taladz.com -connect api.taladz.com:443 2>/dev/null \
  | openssl x509 -pubkey -noout \
  | openssl pkey -pubin -outform der \
  | openssl dgst -sha256 -binary \
  | openssl enc -base64
```

Ou avec OkHttp en mode debug (sans pinning d'abord) :

```kotlin
// En mode développement : ajoute ce listener pour obtenir les pins
val client = OkHttpClient.Builder()
    .hostnameVerifier { hostname, session ->
        val pinner = CertificatePinner.Builder().build()
        // Logue les pins du serveur
        session.peerCertificates.forEach { cert ->
            android.util.Log.d("CertPin", CertificatePinner.pin(cert))
        }
        true
    }
    .build()
```

### 6.2 `NetworkModule.kt`

```kotlin
// core/core-network/src/main/java/com/taladz/core/network/di/NetworkModule.kt
package com.taladz.core.network.di

import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import com.taladz.core.network.api.OeuvresApiService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import okhttp3.CertificatePinner
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit
import javax.inject.Qualifier
import javax.inject.Singleton

// ─── Qualifiers ──────────────────────────────────────────────────────────────
@Qualifier @Retention(AnnotationRetention.BINARY) annotation class AuthenticatedClient
@Qualifier @Retention(AnnotationRetention.BINARY) annotation class UnauthenticatedClient

// ─── Configuration ────────────────────────────────────────────────────────────
private const val BASE_URL         = "https://api.taladz.com/api/"
private const val BASE_URL_DEBUG   = "http://10.0.2.2:3001/api/"
private const val CONNECT_TIMEOUT  = 30L  // secondes
private const val READ_TIMEOUT     = 30L
private const val WRITE_TIMEOUT    = 30L

// ─── Module Hilt ─────────────────────────────────────────────────────────────
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    // ── JSON Kotlinx Serialization ────────────────────────────────────────────
    @Provides
    @Singleton
    fun provideJson(): Json = Json {
        ignoreUnknownKeys = true   // tolère les champs inconnus (évolutivité API)
        isLenient         = true   // tolère les JSON mal formés
        coerceInputValues = true   // convertit null en valeur par défaut
    }

    // ── Logging ───────────────────────────────────────────────────────────────
    @Provides
    @Singleton
    fun provideLoggingInterceptor(): HttpLoggingInterceptor =
        HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

    // ── Certificate Pinning ───────────────────────────────────────────────────
    @Provides
    @Singleton
    fun provideCertificatePinner(): CertificatePinner =
        CertificatePinner.Builder()
            // Remplace par le vrai SHA-256 de ton certificat (étape 6.1)
            // En développement, tu peux désactiver en laissant le Builder vide
            .add("api.taladz.com", "sha256/REMPLACER_PAR_VRAI_HASH_BASE64==")
            // Ajouter le backup pin (rotation de certif)
            // .add("api.taladz.com", "sha256/BACKUP_HASH_BASE64==")
            .build()

    // ── OkHttpClient non authentifié (login, register, metadata) ─────────────
    @Provides
    @Singleton
    @UnauthenticatedClient
    fun provideBaseOkHttpClient(
        loggingInterceptor  : HttpLoggingInterceptor,
        certificatePinner   : CertificatePinner,
    ): OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(CONNECT_TIMEOUT, TimeUnit.SECONDS)
        .readTimeout(READ_TIMEOUT, TimeUnit.SECONDS)
        .writeTimeout(WRITE_TIMEOUT, TimeUnit.SECONDS)
        .addInterceptor(loggingInterceptor)
        // Désactive le pinning en debug local (émulateur → 10.0.2.2)
        .apply {
            if (!BuildConfig.DEBUG) certificatePinner(certificatePinner)
        }
        .build()

    // ── OkHttpClient authentifié (toutes les requêtes auth requises) ──────────
    // AuthInterceptor sera ajouté en TP 07
    @Provides
    @Singleton
    @AuthenticatedClient
    fun provideAuthOkHttpClient(
        @UnauthenticatedClient base: OkHttpClient,
    ): OkHttpClient = base.newBuilder()
        // .addInterceptor(AuthInterceptor(tokenManager))  ← TP 07
        .build()

    // ── Retrofit (non authentifié) ────────────────────────────────────────────
    @Provides
    @Singleton
    fun provideRetrofit(
        @UnauthenticatedClient client: OkHttpClient,
        json: Json,
    ): Retrofit = Retrofit.Builder()
        .baseUrl(if (BuildConfig.DEBUG) BASE_URL_DEBUG else BASE_URL)
        .client(client)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()

    // ── Service Œuvres ────────────────────────────────────────────────────────
    @Provides
    @Singleton
    fun provideOeuvresApiService(retrofit: Retrofit): OeuvresApiService =
        retrofit.create(OeuvresApiService::class.java)
}
```

> **Import manquant :** `BuildConfig` vient de `com.taladz.core.network.BuildConfig`. Ajoute `buildConfig = true` dans `android { buildFeatures { } }`.

---

## Étape 7 — Repository réseau

```kotlin
// core/core-network/src/main/java/com/taladz/core/network/repository/OeuvresRemoteRepository.kt
package com.taladz.core.network.repository

import android.util.Log
import com.taladz.core.network.api.OeuvresApiService
import com.taladz.core.network.model.NetworkResult
import com.taladz.core.network.model.dto.OeuvreDto
import com.taladz.core.network.model.dto.OeuvresListResponse
import com.taladz.core.network.util.safeApiCall
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "OeuvresRemoteRepo"

@Singleton
class OeuvresRemoteRepository @Inject constructor(
    private val api: OeuvresApiService,
) {

    suspend fun getOeuvres(
        page   : Int    = 1,
        limit  : Int    = 20,
        type   : String? = null,
        langue : String? = null,
        search : String? = null,
    ): NetworkResult<OeuvresListResponse> {
        val result = safeApiCall {
            api.getOeuvres(page = page, limit = limit, type = type, langue = langue, search = search)
        }
        result.onSuccess {
            Log.d(TAG, "getOeuvres: ${it.oeuvres.size} oeuvres, total=${it.pagination.total}")
        }
        result.onError { code, msg ->
            Log.e(TAG, "getOeuvres error $code: $msg")
        }
        return result
    }

    suspend fun getOeuvreById(id: Int): NetworkResult<OeuvreDto> =
        safeApiCall { api.getOeuvreById(id) }
}
```

---

## Étape 8 — Test avec MockWebServer

MockWebServer simule un serveur HTTP en local pour les tests — pas besoin d'un vrai backend.

### 8.1 `OeuvresRemoteRepositoryTest.kt`

```kotlin
// core/core-network/src/test/java/com/taladz/core/network/OeuvresRemoteRepositoryTest.kt
package com.taladz.core.network

import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import com.taladz.core.network.api.OeuvresApiService
import com.taladz.core.network.model.NetworkResult
import com.taladz.core.network.repository.OeuvresRemoteRepository
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit

class OeuvresRemoteRepositoryTest {

    private lateinit var server: MockWebServer
    private lateinit var repository: OeuvresRemoteRepository

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()

        val json = Json { ignoreUnknownKeys = true; isLenient = true }
        val retrofit = Retrofit.Builder()
            .baseUrl(server.url("/"))
            .client(OkHttpClient.Builder().build())
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()

        val api = retrofit.create(OeuvresApiService::class.java)
        repository = OeuvresRemoteRepository(api)
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `getOeuvres returns success with 2 items`() = runTest {
        // Arrange — préparer la réponse du serveur mock
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    {
                      "oeuvres": [
                        {
                          "id_oeuvre": 1,
                          "titre": {"fr": "Nedjma", "ar": "نجمة"},
                          "medias": []
                        },
                        {
                          "id_oeuvre": 2,
                          "titre": {"fr": "Le Polygone étoilé", "ar": null},
                          "medias": []
                        }
                      ],
                      "pagination": {"page": 1, "limit": 20, "total": 2, "pages": 1}
                    }
                    """.trimIndent()
                )
        )

        // Act
        val result = repository.getOeuvres()

        // Assert
        assertTrue(result is NetworkResult.Success)
        val data = (result as NetworkResult.Success).data
        assertEquals(2, data.oeuvres.size)
        assertEquals("Nedjma", data.oeuvres[0].titre.fr)
        assertEquals("نجمة", data.oeuvres[0].titre.ar)
        assertEquals(1, data.pagination.total)
    }

    @Test
    fun `getOeuvres returns error on 401`() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(401)
                .setBody("""{"success": false, "error": "Token invalide"}""")
        )

        val result = repository.getOeuvres()

        assertTrue(result is NetworkResult.Error)
        assertEquals(401, (result as NetworkResult.Error).code)
    }

    @Test
    fun `getOeuvres returns error on network failure`() = runTest {
        server.shutdown()  // Simuler une coupure réseau

        val result = repository.getOeuvres()

        assertTrue(result is NetworkResult.Error)
    }

    @Test
    fun `getOeuvres sends correct request`() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody("""{"oeuvres":[],"pagination":{"page":1,"limit":20,"total":0,"pages":0}}""")
        )

        repository.getOeuvres(page = 2, limit = 10, type = "livre")

        val request = server.takeRequest()
        assertEquals("GET", request.method)
        assertTrue(request.path?.contains("page=2") == true)
        assertTrue(request.path?.contains("limit=10") == true)
        assertTrue(request.path?.contains("type=livre") == true)
    }
}
```

---

## Étape 9 — Tester l'appel réel depuis un écran debug

### 9.1 Ajouter un écran de debug temporaire

```kotlin
// app/src/main/java/com/taladz/app/screens/debug/NetworkDebugScreen.kt
package com.taladz.app.screens.debug

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun NetworkDebugScreen(
    viewModel: NetworkDebugViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
    ) {
        Text("Test réseau", style = MaterialTheme.typography.headlineMedium)
        Spacer(modifier = Modifier.height(16.dp))

        Button(onClick = viewModel::loadOeuvres) {
            Text("GET /api/oeuvres")
        }

        Spacer(modifier = Modifier.height(8.dp))

        when {
            state.isLoading -> Text("Chargement...")
            state.error != null -> Text(
                text  = "Erreur : ${state.error}",
                color = MaterialTheme.colorScheme.error,
            )
            else -> state.items.forEach { item ->
                Text("• $item")
                Spacer(modifier = Modifier.height(4.dp))
            }
        }
    }
}
```

### 9.2 `NetworkDebugViewModel.kt`

```kotlin
// app/src/main/java/com/taladz/app/screens/debug/NetworkDebugViewModel.kt
package com.taladz.app.screens.debug

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.taladz.core.network.model.NetworkResult
import com.taladz.core.network.repository.OeuvresRemoteRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class NetworkDebugState(
    val isLoading : Boolean       = false,
    val error     : String?       = null,
    val items     : List<String>  = emptyList(),
)

@HiltViewModel
class NetworkDebugViewModel @Inject constructor(
    private val oeuvresRepo: OeuvresRemoteRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(NetworkDebugState())
    val state = _state.asStateFlow()

    fun loadOeuvres() {
        viewModelScope.launch {
            _state.value = NetworkDebugState(isLoading = true)
            when (val result = oeuvresRepo.getOeuvres()) {
                is NetworkResult.Success -> _state.value = NetworkDebugState(
                    items = result.data.oeuvres.map { oeuvre ->
                        "#${oeuvre.idOeuvre} — ${oeuvre.titre.fr ?: oeuvre.titre.ar ?: "?"}"
                    }
                )
                is NetworkResult.Error -> _state.value = NetworkDebugState(
                    error = "[${result.code}] ${result.message}"
                )
                is NetworkResult.Loading -> Unit
            }
        }
    }
}
```

---

## Étape 10 — Configuration réseau Android (sécurité)

### 10.1 `network_security_config.xml`

Android 9+ bloque le HTTP en clair par défaut. Pour autoriser le backend local en debug :

```xml
<!-- app/src/main/res/xml/network_security_config.xml -->
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Production : HTTPS uniquement -->
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>

    <!-- Debug uniquement : autoriser HTTP local (émulateur → 10.0.2.2) -->
    <debug-overrides>
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />   <!-- pour les proxies de débogage Burp/Charles -->
        </trust-anchors>
        <domain-config cleartextTrafficPermitted="true">
            <domain includeSubdomains="false">10.0.2.2</domain>
            <domain includeSubdomains="false">localhost</domain>
        </domain-config>
    </debug-overrides>
</network-security-config>
```

### 10.2 Référencer dans `AndroidManifest.xml`

```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ...>
```

---

## Récapitulatif des fichiers créés / modifiés

```
core/core-network/                          ← nouveau module
├── build.gradle.kts
└── src/
    ├── main/java/com/taladz/core/network/
    │   ├── api/
    │   │   └── OeuvresApiService.kt        ← interface Retrofit 6 endpoints
    │   ├── di/
    │   │   └── NetworkModule.kt            ← OkHttp, Retrofit, pinning, qualifiers
    │   ├── model/
    │   │   ├── NetworkResult.kt            ← sealed class + extensions
    │   │   └── dto/
    │   │       ├── LocalizedString.kt      ← champs multilingues {fr, ar, en}
    │   │       ├── OeuvreDto.kt
    │   │       ├── MediaDto.kt
    │   │       └── OeuvresListResponse.kt
    │   ├── repository/
    │   │   └── OeuvresRemoteRepository.kt  ← safeApiCall wrapper
    │   └── util/
    │       └── NetworkResultCall.kt        ← safeApiCall + parsing erreurs
    └── test/java/com/taladz/core/network/
        └── OeuvresRemoteRepositoryTest.kt  ← 4 tests MockWebServer

app/src/main/res/xml/
└── network_security_config.xml            ← HTTP local autorisé en debug
app/src/main/java/com/taladz/app/screens/debug/
├── NetworkDebugScreen.kt
└── NetworkDebugViewModel.kt

gradle/libs.versions.toml                  ← +retrofit, +okhttp, +mockwebserver
settings.gradle.kts                        ← +":core:core-network"
```

---

## Points de contrôle — Checklist livrable

Avant de passer au TP 07, vérifie que :

- [ ] `./gradlew :core:core-network:assembleDebug` → BUILD SUCCESSFUL
- [ ] `./gradlew :core:core-network:test` → 4 tests passent
- [ ] L'écran debug (ajouté temporairement) appelle `GET /api/oeuvres` et affiche des titres en log
- [ ] En coupant le WiFi de l'émulateur, l'erreur "Pas de connexion internet" s'affiche
- [ ] CI GitHub Actions verte

---

## Pour aller plus loin (hors TP)

- **Cache HTTP** : OkHttp peut cacher les réponses GET sur disque (`Cache` + `FORCE_CACHE`)
- **Gzip** : OkHttp active automatiquement la compression Gzip si le serveur la supporte
- **Coroutines Flow** : convertir les appels Retrofit en `Flow` avec `callbackFlow`

---

*TP 06 terminé. Prochain : TP 07 — Authentification complète (JWT + EncryptedSharedPreferences + refresh silencieux).*
