# TP 07 — Authentification complète (JWT + Keystore + Refresh silencieux)

> **Durée estimée :** 12 heures sur 3 jours
> **Niveau :** Intermédiaire
> **Prérequis :** TP 06 terminé (Retrofit, OkHttp, NetworkResult fonctionnels)

---

## Objectifs d'apprentissage

À la fin de ce TP, tu sauras :
- [ ] Appeler les endpoints `/api/users/login` et `/api/users/register`
- [ ] Stocker les tokens JWT de façon sécurisée avec `EncryptedSharedPreferences`
- [ ] Implémenter l'`AuthInterceptor` OkHttp (ajoute `Authorization: Bearer`)
- [ ] Implémenter le refresh token silencieux avec `OkHttp Authenticator`
- [ ] Gérer la déconnexion (révocation + nettoyage local)
- [ ] Créer les écrans Login et Register en Compose avec validation
- [ ] Rediriger vers Home après connexion réussie

---

## Concepts théoriques

### Flux d'authentification JWT

```
1. Login → POST /api/users/login
         ← { access_token (1h), refresh_token (7j) dans cookie httpOnly }

2. Requête authentifiée :
   Client → Authorization: Bearer <access_token>
           ← 200 OK { données }

3. Token expiré (401) → OkHttp Authenticator :
   Client → POST /api/users/refresh-token (cookie refresh automatique)
           ← nouveau access_token
   Client → rejoue la requête originale avec le nouveau token

4. Refresh échoue (401) → déconnexion forcée → écran Login
```

### Stockage sécurisé — EncryptedSharedPreferences

`EncryptedSharedPreferences` chiffre les clés ET les valeurs avec AES-256-GCM via Android Keystore :
- La clé de chiffrement est stockée dans le **Keystore matériel** (puce sécurisée)
- Impossible à extraire, même avec root
- Automatiquement liée à l'app (aucune autre app ne peut lire)

### Cookie httpOnly et CookieJar OkHttp

Le refresh token est dans un cookie `httpOnly` (ne peut pas être lu par JavaScript). OkHttp gère les cookies automatiquement si on lui fournit un `CookieJar` :

```kotlin
class PersistentCookieJar(context: Context) : CookieJar {
    // Sauvegarde et restaure les cookies entre les requêtes
}
```

---

## Étape 1 — Créer le module `core-security`

### 1.1 Structure

```
core/core-security/
├── build.gradle.kts
└── src/main/java/com/taladz/core/security/
    ├── di/
    │   └── SecurityModule.kt
    ├── token/
    │   ├── TokenManager.kt       ← EncryptedSharedPreferences
    │   └── JwtDecoder.kt         ← parse les claims JWT sans lib externe
    └── cookie/
        └── SecureCookieJar.kt    ← CookieJar persistant
```

### 1.2 `core/core-security/build.gradle.kts`

```kotlin
plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
}

android {
    namespace  = "com.taladz.core.security"
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

    // Crypto pour EncryptedSharedPreferences
    implementation(libs.androidx.security.crypto)

    // OkHttp pour CookieJar
    implementation(libs.okhttp.core)

    testImplementation("junit:junit:4.13.2")
    testImplementation(libs.test.mockk)
    testImplementation(libs.test.coroutines)
}
```

### 1.3 Ajouter dans `libs.versions.toml`

```toml
[versions]
security-crypto = "1.1.0-alpha06"  # Dernière version stable avec AES-256-GCM

[libraries]
androidx-security-crypto = { group = "androidx.security", name = "security-crypto", version.ref = "security-crypto" }
```

### 1.4 `settings.gradle.kts`

```kotlin
include(":core:core-security")
```

---

## Étape 2 — `TokenManager` — stockage sécurisé

```kotlin
// core/core-security/src/main/java/com/taladz/core/security/token/TokenManager.kt
package com.taladz.core.security.token

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenManager @Inject constructor(
    @ApplicationContext private val context: Context,
) {

    companion object {
        private const val PREFS_FILENAME   = "taladz_secure_prefs"
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_USER_ID      = "user_id"
        private const val KEY_USER_EMAIL   = "user_email"
    }

    private val prefs: SharedPreferences by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        EncryptedSharedPreferences.create(
            context,
            PREFS_FILENAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    private val _isAuthenticated = MutableStateFlow(hasValidToken())
    val isAuthenticated: Flow<Boolean> = _isAuthenticated.asStateFlow()

    fun saveAccessToken(token: String) {
        prefs.edit().putString(KEY_ACCESS_TOKEN, token).apply()
        _isAuthenticated.value = true
    }

    fun getAccessToken(): String? = prefs.getString(KEY_ACCESS_TOKEN, null)

    fun saveUserInfo(userId: Int, email: String) {
        prefs.edit()
            .putInt(KEY_USER_ID, userId)
            .putString(KEY_USER_EMAIL, email)
            .apply()
    }

    fun getUserId(): Int = prefs.getInt(KEY_USER_ID, -1)

    fun getUserEmail(): String? = prefs.getString(KEY_USER_EMAIL, null)

    fun clearAll() {
        prefs.edit().clear().apply()
        _isAuthenticated.value = false
    }

    private fun hasValidToken(): Boolean {
        val token = prefs.getString(KEY_ACCESS_TOKEN, null) ?: return false
        return !JwtDecoder.isExpired(token)
    }
}
```

---

## Étape 3 — `JwtDecoder` — parser le token sans librairie

```kotlin
// core/core-security/src/main/java/com/taladz/core/security/token/JwtDecoder.kt
package com.taladz.core.security.token

import android.util.Base64
import org.json.JSONObject

object JwtDecoder {

    data class JwtClaims(
        val userId  : Int,
        val email   : String,
        val exp     : Long,
        val jti     : String,
    )

    fun decode(token: String): JwtClaims? = try {
        val parts  = token.split(".")
        if (parts.size != 3) return null

        val payload  = parts[1]
        // JWT utilise Base64URL (sans padding) — Android Base64 gère ça avec NO_WRAP | URL_SAFE
        val decoded  = Base64.decode(payload, Base64.URL_SAFE or Base64.NO_PADDING)
        val json     = JSONObject(String(decoded, Charsets.UTF_8))

        JwtClaims(
            userId = json.optInt("userId", -1),
            email  = json.optString("email", ""),
            exp    = json.optLong("exp", 0L),
            jti    = json.optString("jti", ""),
        )
    } catch (e: Exception) {
        null
    }

    fun isExpired(token: String): Boolean {
        val claims = decode(token) ?: return true
        // exp est en secondes, System.currentTimeMillis() en millisecondes
        // On considère expiré 60s avant la vraie expiration (marge de sécurité)
        return claims.exp * 1_000 < System.currentTimeMillis() + 60_000
    }
}
```

---

## Étape 4 — `SecureCookieJar` — persistance des cookies httpOnly

```kotlin
// core/core-security/src/main/java/com/taladz/core/security/cookie/SecureCookieJar.kt
package com.taladz.core.security.cookie

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SecureCookieJar @Inject constructor(
    @ApplicationContext private val context: Context,
) : CookieJar {

    private val prefs by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            "taladz_cookies",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        cookies.forEach { cookie ->
            prefs.edit().putString(cookie.name, cookie.toString()).apply()
        }
    }

    override fun loadForRequest(url: HttpUrl): List<Cookie> =
        prefs.all.mapNotNull { (_, value) ->
            Cookie.parse(url, value as? String ?: return@mapNotNull null)
        }

    fun clearAll() {
        prefs.edit().clear().apply()
    }
}
```

---

## Étape 5 — `AuthInterceptor` et `AuthAuthenticator`

### 5.1 `AuthInterceptor` — ajoute le Bearer token

```kotlin
// core/core-security/src/main/java/com/taladz/core/security/interceptor/AuthInterceptor.kt
package com.taladz.core.security.interceptor

import com.taladz.core.security.token.TokenManager
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

class AuthInterceptor @Inject constructor(
    private val tokenManager: TokenManager,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val token = tokenManager.getAccessToken()
        val request = if (token != null) {
            chain.request().newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        } else {
            chain.request()
        }
        return chain.proceed(request)
    }
}
```

### 5.2 `AuthAuthenticator` — refresh silencieux

L'`Authenticator` est appelé **automatiquement par OkHttp** quand une réponse 401 est reçue.

```kotlin
// core/core-security/src/main/java/com/taladz/core/security/interceptor/AuthAuthenticator.kt
package com.taladz.core.security.interceptor

import com.taladz.core.security.token.TokenManager
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import retrofit2.Retrofit
import javax.inject.Inject
import javax.inject.Provider

class AuthAuthenticator @Inject constructor(
    private val tokenManager: TokenManager,
    // Provider<Retrofit> évite la dépendance circulaire Retrofit → Authenticator → Retrofit
    private val retrofitProvider: Provider<Retrofit>,
) : Authenticator {

    companion object {
        // Évite une boucle infinie de refresh
        private const val MAX_RETRY = 1
    }

    override fun authenticate(route: Route?, response: Response): Request? {
        // Si on a déjà essayé de refresh, on abandonne → déconnexion
        if (responseCount(response) >= MAX_RETRY) {
            tokenManager.clearAll()
            return null
        }

        val newToken = runBlocking { refreshToken() } ?: run {
            tokenManager.clearAll()
            return null
        }

        return response.request.newBuilder()
            .header("Authorization", "Bearer $newToken")
            .build()
    }

    private suspend fun refreshToken(): String? = try {
        val authApi = retrofitProvider.get().create(AuthApiService::class.java)
        val refreshResponse = authApi.refreshToken()

        if (refreshResponse.isSuccessful) {
            val body = refreshResponse.body()
            body?.accessToken?.also { token ->
                tokenManager.saveAccessToken(token)
            }
        } else {
            null
        }
    } catch (e: Exception) {
        null
    }

    private fun responseCount(response: Response): Int {
        var count = 1
        var prior = response.priorResponse
        while (prior != null) {
            count++
            prior = prior.priorResponse
        }
        return count
    }
}
```

---

## Étape 6 — DTOs et API d'authentification

### 6.1 `AuthDto.kt`

```kotlin
// core/core-network/src/main/java/com/taladz/core/network/model/dto/AuthDto.kt
package com.taladz.core.network.model.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(
    val email    : String,
    val password : String,
)

@Serializable
data class RegisterRequest(
    val email           : String,
    val password        : String,
    val nom             : String,
    val prenom          : String,
    val telephone       : String,
    val id_type_user    : Int,
    val wilaya_residence: Int? = null,
)

@Serializable
data class LoginResponse(
    val success : Boolean,
    val user    : UserDto,
    @SerialName("expiresIn") val expiresIn: Int,
    // L'access token est dans le cookie httpOnly OU dans ce champ selon la config serveur
    @SerialName("access_token") val accessToken: String? = null,
)

@Serializable
data class UserDto(
    @SerialName("id_user")       val idUser      : Int,
    @SerialName("email")         val email       : String,
    @SerialName("nom")           val nom         : LocalizedString? = null,
    @SerialName("prenom")        val prenom      : LocalizedString? = null,
    @SerialName("id_type_user")  val idTypeUser  : Int,
    @SerialName("statut")        val statut      : String           = "actif",
    @SerialName("photo_url")     val photoUrl    : String?          = null,
    @SerialName("email_verifie") val emailVerifie: Boolean          = false,
)

@Serializable
data class RefreshTokenResponse(
    @SerialName("access_token") val accessToken: String,
)
```

### 6.2 `AuthApiService.kt`

```kotlin
// core/core-network/src/main/java/com/taladz/core/network/api/AuthApiService.kt
package com.taladz.core.network.api

import com.taladz.core.network.model.dto.LoginRequest
import com.taladz.core.network.model.dto.LoginResponse
import com.taladz.core.network.model.dto.RefreshTokenResponse
import com.taladz.core.network.model.dto.RegisterRequest
import com.taladz.core.network.model.dto.UserDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface AuthApiService {

    @POST("users/login")
    suspend fun login(
        @Body request: LoginRequest,
    ): Response<LoginResponse>

    @POST("users/register")
    suspend fun register(
        @Body request: RegisterRequest,
    ): Response<LoginResponse>

    @POST("users/refresh-token")
    suspend fun refreshToken(): Response<RefreshTokenResponse>

    @POST("users/logout")
    suspend fun logout(): Response<Unit>

    @GET("users/profile")
    suspend fun getProfile(): Response<UserDto>
}
```

---

## Étape 7 — `AuthRepository`

```kotlin
// core/core-network/src/main/java/com/taladz/core/network/repository/AuthRepository.kt
package com.taladz.core.network.repository

import com.taladz.core.network.api.AuthApiService
import com.taladz.core.network.model.NetworkResult
import com.taladz.core.network.model.dto.LoginRequest
import com.taladz.core.network.model.dto.LoginResponse
import com.taladz.core.network.model.dto.RegisterRequest
import com.taladz.core.network.model.dto.UserDto
import com.taladz.core.network.util.safeApiCall
import com.taladz.core.security.token.TokenManager
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val authApi      : AuthApiService,
    private val tokenManager : TokenManager,
) {

    suspend fun login(email: String, password: String): NetworkResult<LoginResponse> {
        val result = safeApiCall {
            authApi.login(LoginRequest(email = email, password = password))
        }
        if (result is NetworkResult.Success) {
            val response = result.data
            // Si l'access token est dans le body (selon config backend)
            response.accessToken?.let { token ->
                tokenManager.saveAccessToken(token)
            }
            tokenManager.saveUserInfo(
                userId = response.user.idUser,
                email  = response.user.email,
            )
        }
        return result
    }

    suspend fun register(request: RegisterRequest): NetworkResult<LoginResponse> {
        val result = safeApiCall { authApi.register(request) }
        if (result is NetworkResult.Success) {
            result.data.accessToken?.let { tokenManager.saveAccessToken(it) }
            tokenManager.saveUserInfo(
                userId = result.data.user.idUser,
                email  = result.data.user.email,
            )
        }
        return result
    }

    suspend fun logout(): NetworkResult<Unit> {
        val result = safeApiCall { authApi.logout() }
        tokenManager.clearAll()
        return result
    }

    suspend fun getProfile(): NetworkResult<UserDto> =
        safeApiCall { authApi.getProfile() }

    fun isAuthenticated(): Boolean =
        tokenManager.getAccessToken() != null
}
```

---

## Étape 8 — Mettre à jour `NetworkModule` avec le client authentifié

```kotlin
// core/core-network/src/main/java/com/taladz/core/network/di/NetworkModule.kt
// Ajouter dans les @Provides existants :

@Provides
@Singleton
@AuthenticatedClient
fun provideAuthOkHttpClient(
    @UnauthenticatedClient base: OkHttpClient,
    authInterceptor: AuthInterceptor,
    authAuthenticator: AuthAuthenticator,
): OkHttpClient = base.newBuilder()
    .addInterceptor(authInterceptor)
    .authenticator(authAuthenticator)
    .build()

// Retrofit authentifié (pour les appels nécessitant un token)
@Provides
@Singleton
@AuthenticatedRetrofit
fun provideAuthRetrofit(
    @AuthenticatedClient client: OkHttpClient,
    json: Json,
): Retrofit = Retrofit.Builder()
    .baseUrl(if (BuildConfig.DEBUG) BASE_URL_DEBUG else BASE_URL)
    .client(client)
    .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
    .build()

// AuthApiService avec client authentifié (pour /profile, /logout)
@Provides
@Singleton
fun provideAuthApiService(@AuthenticatedRetrofit retrofit: Retrofit): AuthApiService =
    retrofit.create(AuthApiService::class.java)
```

---

## Étape 9 — Écran Login en Compose

### 9.1 `AuthViewModel.kt`

```kotlin
// feature/feature-account/src/main/java/com/taladz/feature/account/AuthViewModel.kt
package com.taladz.feature.account

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.taladz.core.network.model.NetworkResult
import com.taladz.core.network.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val isLoading      : Boolean = false,
    val error          : String? = null,
    val isSuccess      : Boolean = false,
    val emailError     : String? = null,
    val passwordError  : String? = null,
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _loginState    = MutableStateFlow(AuthUiState())
    val loginState = _loginState.asStateFlow()

    private val _registerState = MutableStateFlow(AuthUiState())
    val registerState = _registerState.asStateFlow()

    fun login(email: String, password: String) {
        if (!validateLogin(email, password)) return

        viewModelScope.launch {
            _loginState.value = AuthUiState(isLoading = true)
            when (val result = authRepository.login(email.trim(), password)) {
                is NetworkResult.Success ->
                    _loginState.value = AuthUiState(isSuccess = true)
                is NetworkResult.Error ->
                    _loginState.value = AuthUiState(error = result.message)
                is NetworkResult.Loading -> Unit
            }
        }
    }

    fun register(
        email     : String,
        password  : String,
        nom       : String,
        prenom    : String,
        telephone : String,
        typeUser  : Int,
        wilaya    : Int?,
    ) {
        viewModelScope.launch {
            _registerState.value = AuthUiState(isLoading = true)
            val request = com.taladz.core.network.model.dto.RegisterRequest(
                email             = email.trim(),
                password          = password,
                nom               = nom.trim(),
                prenom            = prenom.trim(),
                telephone         = telephone.trim(),
                id_type_user      = typeUser,
                wilaya_residence  = wilaya,
            )
            when (val result = authRepository.register(request)) {
                is NetworkResult.Success ->
                    _registerState.value = AuthUiState(isSuccess = true)
                is NetworkResult.Error ->
                    _registerState.value = AuthUiState(error = result.message)
                is NetworkResult.Loading -> Unit
            }
        }
    }

    fun clearLoginError() { _loginState.value = _loginState.value.copy(error = null) }

    private fun validateLogin(email: String, password: String): Boolean {
        val emailErr    = if (!email.contains("@")) "Email invalide" else null
        val passwordErr = if (password.length < 8) "Minimum 8 caractères" else null

        _loginState.value = AuthUiState(
            emailError    = emailErr,
            passwordError = passwordErr,
        )
        return emailErr == null && passwordErr == null
    }
}
```

### 9.2 Écran `LoginScreen.kt` complet

```kotlin
// app/src/main/java/com/taladz/app/screens/auth/LoginScreen.kt
package com.taladz.app.screens.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.taladz.feature.account.AuthViewModel

@Composable
fun LoginScreen(
    onLoginSuccess       : () -> Unit = {},
    onNavigateToRegister : () -> Unit = {},
    viewModel            : AuthViewModel = hiltViewModel(),
) {
    val state by viewModel.loginState.collectAsStateWithLifecycle()
    val focusManager = LocalFocusManager.current

    var email    by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }

    // Navigation après succès
    LaunchedEffect(state.isSuccess) {
        if (state.isSuccess) onLoginSuccess()
    }

    Column(
        modifier            = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("Connexion", style = MaterialTheme.typography.headlineLarge)
        Text("طالدز", style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.primary)

        Spacer(modifier = Modifier.height(40.dp))

        // ── Email ─────────────────────────────────────────────────────────
        OutlinedTextField(
            value         = email,
            onValueChange = { email = it },
            label         = { Text("Adresse email") },
            isError       = state.emailError != null,
            supportingText = { state.emailError?.let { Text(it) } },
            singleLine    = true,
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Email,
                imeAction    = ImeAction.Next,
            ),
            keyboardActions = KeyboardActions(
                onNext = { focusManager.moveFocus(FocusDirection.Down) }
            ),
            modifier = Modifier.fillMaxWidth(),
        )

        Spacer(modifier = Modifier.height(16.dp))

        // ── Mot de passe ──────────────────────────────────────────────────
        OutlinedTextField(
            value         = password,
            onValueChange = { password = it },
            label         = { Text("Mot de passe") },
            isError       = state.passwordError != null,
            supportingText = { state.passwordError?.let { Text(it) } },
            singleLine    = true,
            visualTransformation = if (showPassword) VisualTransformation.None
                                   else PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Password,
                imeAction    = ImeAction.Done,
            ),
            keyboardActions = KeyboardActions(
                onDone = {
                    focusManager.clearFocus()
                    viewModel.login(email, password)
                }
            ),
            trailingIcon = {
                IconButton(onClick = { showPassword = !showPassword }) {
                    Icon(
                        imageVector = if (showPassword) Icons.Filled.VisibilityOff
                                      else Icons.Filled.Visibility,
                        contentDescription = if (showPassword) "Masquer" else "Afficher",
                    )
                }
            },
            modifier = Modifier.fillMaxWidth(),
        )

        // ── Erreur globale ────────────────────────────────────────────────
        state.error?.let { error ->
            Spacer(modifier = Modifier.height(8.dp))
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer,
                ),
            ) {
                Text(
                    text     = error,
                    color    = MaterialTheme.colorScheme.onErrorContainer,
                    modifier = Modifier.padding(12.dp),
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // ── Bouton connexion ──────────────────────────────────────────────
        Button(
            onClick  = { viewModel.login(email, password) },
            enabled  = !state.isLoading,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
        ) {
            if (state.isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color    = MaterialTheme.colorScheme.onPrimary,
                    strokeWidth = 2.dp,
                )
            } else {
                Text("Se connecter", style = MaterialTheme.typography.labelLarge)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        TextButton(onClick = onNavigateToRegister) {
            Text("Pas encore inscrit ? Créer un compte")
        }
    }
}
```

---

## Étape 10 — Gestion de la session dans `MainActivity`

### 10.1 `SessionViewModel.kt`

```kotlin
// app/src/main/java/com/taladz/app/SessionViewModel.kt
package com.taladz.app

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.taladz.core.security.token.TokenManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

@HiltViewModel
class SessionViewModel @Inject constructor(
    tokenManager: TokenManager,
) : ViewModel() {

    val isAuthenticated: StateFlow<Boolean> = tokenManager.isAuthenticated
        .stateIn(
            scope          = viewModelScope,
            started        = SharingStarted.WhileSubscribed(5_000),
            initialValue   = tokenManager.getAccessToken() != null,
        )
}
```

### 10.2 Mettre à jour `TaladzNavHost.kt`

```kotlin
// Dans TaladzNavHost.kt :
@Composable
fun TaladzNavHost(isAuthenticated: Boolean) {
    // ...
    NavHost(
        startDestination = if (isAuthenticated) MainGraph else SplashScreen,
        // ...
    )
}

// Dans MainActivity.kt :
val sessionViewModel: SessionViewModel by viewModels()
val isAuth by sessionViewModel.isAuthenticated.collectAsStateWithLifecycle()

TaladzThemeWrapper(theme = currentTheme) {
    TaladzNavHost(isAuthenticated = isAuth)
}
```

---

## Points de contrôle — Checklist livrable

Avant de passer au TP 08, vérifie que :

- [ ] `./gradlew :core:core-security:assembleDebug` → BUILD SUCCESSFUL
- [ ] Login réel avec email/mot de passe du backend Taladz → accès HomeScreen
- [ ] Token stocké dans EncryptedSharedPreferences (vérifiable avec Device File Explorer → inaccessible)
- [ ] Après fermeture et réouverture de l'app → reste connecté (token valide)
- [ ] Après expiration du token → refresh silencieux transparent
- [ ] Bouton déconnexion (dans ProfileScreen) → efface le token, retour à Login
- [ ] En tapant un mauvais mot de passe → message d'erreur clair
- [ ] CI GitHub Actions verte

---

*TP 07 terminé. Prochain : TP 08 — Catalogue d'ebooks avec Paging 3 et Coil.*
