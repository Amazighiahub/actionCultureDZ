# TP 11 — Téléchargement Offline avec WorkManager

> **Durée estimée :** 12 heures sur 3 jours
> **Niveau :** Avancé
> **Prérequis :** TP 10 terminé (bibliothèque + favoris fonctionnels)

---

## Objectifs d'apprentissage

À la fin de ce TP, tu sauras :
- [ ] Comprendre WorkManager et ses différents types de tâches
- [ ] Créer un `DownloadWorker` avec reprise automatique sur coupure réseau
- [ ] Chiffrer le fichier EPUB téléchargé avec AES-256 via Android Keystore
- [ ] Afficher la progression du téléchargement (notification système + UI)
- [ ] Gérer les états : en attente / en cours / terminé / erreur
- [ ] Observer la progression depuis l'UI avec `WorkInfo`

---

## Concepts théoriques

### WorkManager vs DownloadManager vs Foreground Service

| Besoin | Solution recommandée |
|--------|---------------------|
| Téléchargement simple, pas critique | `DownloadManager` |
| Téléchargement long + contraintes + reprise | **WorkManager** ← notre cas |
| Téléchargement en temps réel (streaming) | `ForegroundService` |

**WorkManager** est la solution recommandée par Google pour les tâches qui :
- Doivent se terminer même si l'app est fermée
- Peuvent être différées (contraintes réseau, batterie)
- Doivent reprendre après un redémarrage du téléphone

### Contraintes WorkManager

```kotlin
val constraints = Constraints.Builder()
    .setRequiredNetworkType(NetworkType.CONNECTED)  // uniquement avec réseau
    .setRequiresBatteryNotLow(true)                  // batterie non critique
    .build()
```

### Chiffrement AES-256 via Keystore

Les fichiers EPUB sont des œuvres protégées. On les chiffre sur le téléphone :
1. Générer une clé AES-256 dans l'Android Keystore (sécurisée matériellement)
2. Chiffrer le fichier téléchargé avec cette clé
3. Stocker le fichier chiffré (`.epub.enc`) → illisible sans la clé Keystore
4. En lecture → déchiffrer à la volée (Readium le fait en TP 12)

---

## Étape 1 — Ajouter WorkManager

### 1.1 `libs.versions.toml`

```toml
[versions]
workmanager = "2.10.0"

[libraries]
workmanager-runtime = { group = "androidx.work", name = "work-runtime-ktx",  version.ref = "workmanager" }
workmanager-hilt    = { group = "androidx.hilt", name = "hilt-work",         version = "1.2.0" }
workmanager-testing = { group = "androidx.work", name = "work-testing",      version.ref = "workmanager" }
hilt-work-compiler  = { group = "androidx.hilt", name = "hilt-compiler",     version = "1.2.0" }
```

### 1.2 `app/build.gradle.kts`

```kotlin
dependencies {
    implementation(libs.workmanager.runtime)
    implementation(libs.workmanager.hilt)
    ksp(libs.hilt.work.compiler)
    androidTestImplementation(libs.workmanager.testing)
}
```

---

## Étape 2 — Gestionnaire de chiffrement Keystore

### 2.1 `EpubCryptoManager.kt` dans `core-security`

```kotlin
// core/core-security/src/main/java/com/taladz/core/security/crypto/EpubCryptoManager.kt
package com.taladz.core.security.crypto

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.io.InputStream
import java.io.OutputStream
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.CipherInputStream
import javax.crypto.CipherOutputStream
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.IvParameterSpec
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class EpubCryptoManager @Inject constructor() {

    companion object {
        private const val KEY_ALIAS         = "taladz_epub_key"
        private const val KEYSTORE_PROVIDER = "AndroidKeyStore"
        private const val ALGORITHM         = KeyProperties.KEY_ALGORITHM_AES
        private const val BLOCK_MODE        = KeyProperties.BLOCK_MODE_CBC
        private const val PADDING           = KeyProperties.ENCRYPTION_PADDING_PKCS7
        private const val TRANSFORMATION    = "$ALGORITHM/$BLOCK_MODE/$PADDING"
        private const val IV_SIZE           = 16
    }

    private fun getOrCreateKey(): SecretKey {
        val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER).apply { load(null) }

        // Si la clé existe déjà, la retourner
        keyStore.getKey(KEY_ALIAS, null)?.let { return it as SecretKey }

        // Sinon, générer une nouvelle clé AES-256
        val keyGenerator = KeyGenerator.getInstance(ALGORITHM, KEYSTORE_PROVIDER)
        keyGenerator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            )
            .setBlockModes(BLOCK_MODE)
            .setEncryptionPaddings(PADDING)
            .setKeySize(256)
            .setUserAuthenticationRequired(false)  // pas de biométrie requise
            .build()
        )
        return keyGenerator.generateKey()
    }

    /**
     * Chiffre un flux d'entrée et écrit le résultat chiffré dans le flux de sortie.
     * Format du fichier : [16 octets IV][données chiffrées]
     */
    fun encryptStream(input: InputStream, output: OutputStream) {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())

        val iv = cipher.iv
        output.write(iv)  // écrire l'IV en tête du fichier

        CipherOutputStream(output, cipher).use { cipherOut ->
            input.copyTo(cipherOut)
        }
    }

    /**
     * Déchiffre un flux chiffré.
     * Le fichier doit commencer par les 16 octets de l'IV.
     */
    fun decryptStream(input: InputStream, output: OutputStream) {
        val iv     = ByteArray(IV_SIZE)
        input.read(iv)

        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), IvParameterSpec(iv))

        CipherInputStream(input, cipher).use { cipherIn ->
            cipherIn.copyTo(output)
        }
    }

    /**
     * Déchiffre un fichier et retourne un InputStream déchiffré (pour Readium).
     */
    fun openDecryptedStream(input: InputStream): InputStream {
        val iv = ByteArray(IV_SIZE)
        input.read(iv)
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), IvParameterSpec(iv))
        return CipherInputStream(input, cipher)
    }
}
```

---

## Étape 3 — Entité et DAO pour les téléchargements

### 3.1 `DownloadEntity.kt`

```kotlin
// core/core-database/src/main/java/com/taladz/core/database/entity/DownloadEntity.kt
package com.taladz.core.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "downloads")
data class DownloadEntity(
    @PrimaryKey
    @ColumnInfo(name = "id_oeuvre")
    val idOeuvre     : Int,

    @ColumnInfo(name = "file_path")
    val filePath     : String? = null,      // chemin vers le fichier .epub.enc

    @ColumnInfo(name = "file_size")
    val fileSize     : Long    = 0L,

    @ColumnInfo(name = "downloaded_bytes")
    val downloadedBytes : Long = 0L,

    @ColumnInfo(name = "status")
    val status       : String  = DownloadStatus.PENDING.name,

    @ColumnInfo(name = "error_message")
    val errorMessage : String? = null,

    @ColumnInfo(name = "work_id")
    val workId       : String? = null,      // UUID du WorkManager job

    @ColumnInfo(name = "created_at")
    val createdAt    : Long    = System.currentTimeMillis(),

    @ColumnInfo(name = "completed_at")
    val completedAt  : Long?   = null,
)

enum class DownloadStatus {
    PENDING,       // en attente (contraintes non remplies)
    DOWNLOADING,   // en cours
    COMPLETED,     // terminé
    FAILED,        // erreur
    CANCELLED,     // annulé
}
```

### 3.2 `DownloadDao.kt`

```kotlin
// core/core-database/src/main/java/com/taladz/core/database/dao/DownloadDao.kt
package com.taladz.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.taladz.core.database.entity.DownloadEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface DownloadDao {

    @Query("SELECT * FROM downloads WHERE id_oeuvre = :bookId")
    fun getDownload(bookId: Int): Flow<DownloadEntity?>

    @Query("SELECT * FROM downloads")
    fun getAllDownloads(): Flow<List<DownloadEntity>>

    @Query("SELECT * FROM downloads WHERE status = 'COMPLETED'")
    fun getCompletedDownloads(): Flow<List<DownloadEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(download: DownloadEntity)

    @Query("UPDATE downloads SET status = :status WHERE id_oeuvre = :bookId")
    suspend fun updateStatus(bookId: Int, status: String)

    @Query("UPDATE downloads SET downloaded_bytes = :bytes WHERE id_oeuvre = :bookId")
    suspend fun updateProgress(bookId: Int, bytes: Long)

    @Query("DELETE FROM downloads WHERE id_oeuvre = :bookId")
    suspend fun deleteDownload(bookId: Int)

    @Query("SELECT file_path FROM downloads WHERE id_oeuvre = :bookId AND status = 'COMPLETED'")
    suspend fun getFilePath(bookId: Int): String?
}
```

### 3.3 Ajouter le DAO à `TaladzDatabase.kt`

```kotlin
@Database(
    entities  = [BookEntity::class, MediaEntity::class, CacheMetaEntity::class, DownloadEntity::class],
    version   = 2,  // ← incrémenter la version !
    exportSchema = true,
)
abstract class TaladzDatabase : RoomDatabase() {
    abstract fun bookDao(): BookDao
    abstract fun mediaDao(): MediaDao
    abstract fun cacheMetaDao(): CacheMetaDao
    abstract fun downloadDao(): DownloadDao  // ← ajouter
}
```

> **Migration Room :** Augmenter la version requiert une migration. En développement, `fallbackToDestructiveMigration()` est acceptable. En production, écrire une vraie migration.

---

## Étape 4 — `DownloadWorker`

```kotlin
// app/src/main/java/com/taladz/app/worker/DownloadWorker.kt
package com.taladz.app.worker

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.Data
import androidx.work.ForegroundInfo
import androidx.work.WorkerParameters
import com.taladz.core.database.dao.DownloadDao
import com.taladz.core.database.entity.DownloadEntity
import com.taladz.core.database.entity.DownloadStatus
import com.taladz.core.security.crypto.EpubCryptoManager
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File

@HiltWorker
class DownloadWorker @AssistedInject constructor(
    @Assisted context            : Context,
    @Assisted workerParams       : WorkerParameters,
    private val downloadDao      : DownloadDao,
    private val cryptoManager    : EpubCryptoManager,
    @UnauthenticatedClient
    private val okHttpClient     : OkHttpClient,
) : CoroutineWorker(context, workerParams) {

    companion object {
        const val KEY_BOOK_ID    = "book_id"
        const val KEY_BOOK_TITLE = "book_title"
        const val KEY_EPUB_URL   = "epub_url"
        const val KEY_PROGRESS   = "progress_percent"

        private const val NOTIFICATION_CHANNEL_ID = "taladz_downloads"
        private const val NOTIFICATION_ID_BASE    = 1000
        private const val BUFFER_SIZE             = 8192
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val bookId    = inputData.getInt(KEY_BOOK_ID, -1)
        val bookTitle = inputData.getString(KEY_BOOK_TITLE) ?: "Livre"
        val epubUrl   = inputData.getString(KEY_EPUB_URL) ?: return@withContext Result.failure()

        if (bookId == -1) return@withContext Result.failure()

        // Mettre à jour le statut → DOWNLOADING
        downloadDao.updateStatus(bookId, DownloadStatus.DOWNLOADING.name)

        // Afficher la notification de progression (Foreground pour éviter le kill)
        setForeground(createForegroundInfo(bookId, bookTitle, progress = 0))

        return@withContext try {
            downloadAndEncrypt(bookId, bookTitle, epubUrl)
            Result.success()
        } catch (e: Exception) {
            downloadDao.upsert(
                DownloadEntity(
                    idOeuvre     = bookId,
                    status       = DownloadStatus.FAILED.name,
                    errorMessage = e.message,
                )
            )
            // Result.retry() → WorkManager réessaiera automatiquement (avec backoff)
            if (runAttemptCount < 3) Result.retry() else Result.failure()
        }
    }

    private suspend fun downloadAndEncrypt(bookId: Int, bookTitle: String, url: String) {
        val request  = Request.Builder().url(url).build()
        val response = okHttpClient.newCall(request).execute()

        if (!response.isSuccessful) {
            throw Exception("Téléchargement échoué : HTTP ${response.code}")
        }

        val contentLength = response.body?.contentLength() ?: -1L
        val outputFile    = getOutputFile(bookId)

        response.body?.byteStream()?.use { inputStream ->
            outputFile.outputStream().use { fileOut ->
                cryptoManager.encryptStream(
                    input  = inputStream,
                    output = fileOut.also { out ->
                        // Wrapper pour tracker la progression
                        var bytesRead = 0L
                        val buffer    = ByteArray(BUFFER_SIZE)
                        var bytes     = inputStream.read(buffer)
                        while (bytes != -1) {
                            out.write(buffer, 0, bytes)
                            bytesRead += bytes
                            val progress = if (contentLength > 0) {
                                (bytesRead * 100 / contentLength).toInt()
                            } else 0

                            // Mettre à jour la notification et le ProgressBar
                            setForeground(createForegroundInfo(bookId, bookTitle, progress))
                            downloadDao.updateProgress(bookId, bytesRead)
                            setProgress(Data.Builder().putInt(KEY_PROGRESS, progress).build())

                            bytes = inputStream.read(buffer)
                        }
                    }
                )
            }
        }

        // Succès — enregistrer le chemin du fichier
        downloadDao.upsert(
            DownloadEntity(
                idOeuvre    = bookId,
                filePath    = outputFile.absolutePath,
                fileSize    = contentLength,
                status      = DownloadStatus.COMPLETED.name,
                completedAt = System.currentTimeMillis(),
            )
        )
    }

    private fun getOutputFile(bookId: Int): File {
        val dir = File(applicationContext.filesDir, "epubs")
        dir.mkdirs()
        return File(dir, "book_$bookId.epub.enc")
    }

    private fun createForegroundInfo(
        bookId    : Int,
        bookTitle : String,
        progress  : Int,
    ): ForegroundInfo {
        createNotificationChannel()

        val notification = NotificationCompat.Builder(applicationContext, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("Téléchargement en cours")
            .setContentText(bookTitle)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setProgress(100, progress, progress == 0)
            .setOngoing(true)
            .setSilent(true)
            .build()

        return ForegroundInfo(NOTIFICATION_ID_BASE + bookId, notification)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "Téléchargements Taladz",
                NotificationManager.IMPORTANCE_LOW,
            )
            val notifManager = applicationContext.getSystemService(NotificationManager::class.java)
            notifManager.createNotificationChannel(channel)
        }
    }
}
```

---

## Étape 5 — `DownloadRepository`

```kotlin
// data/data-reader/src/main/java/com/taladz/data/reader/repository/DownloadRepository.kt
package com.taladz.data.reader.repository

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkInfo
import androidx.work.WorkManager
import com.taladz.app.worker.DownloadWorker
import com.taladz.core.database.dao.DownloadDao
import com.taladz.core.database.entity.DownloadEntity
import com.taladz.core.database.entity.DownloadStatus
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.util.UUID
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DownloadRepository @Inject constructor(
    @ApplicationContext private val context     : Context,
    private val downloadDao                     : DownloadDao,
) {

    private val workManager = WorkManager.getInstance(context)

    fun startDownload(bookId: Int, bookTitle: String, epubUrl: String) {
        val inputData = Data.Builder()
            .putInt(DownloadWorker.KEY_BOOK_ID, bookId)
            .putString(DownloadWorker.KEY_BOOK_TITLE, bookTitle)
            .putString(DownloadWorker.KEY_EPUB_URL, epubUrl)
            .build()

        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .setRequiresBatteryNotLow(false)
            .build()

        val request = OneTimeWorkRequestBuilder<DownloadWorker>()
            .setInputData(inputData)
            .setConstraints(constraints)
            .setBackoffCriteria(
                backoffPolicy = BackoffPolicy.EXPONENTIAL,
                backoffDelay  = 10,
                timeUnit      = TimeUnit.SECONDS,
            )
            .addTag("download_$bookId")
            .build()

        workManager.enqueue(request)

        // Sauvegarder l'ID du work dans la DB
        // (pour pouvoir l'annuler plus tard)
        // Note : on ne peut pas faire suspend ici → utiliser un scope séparé si besoin
    }

    fun cancelDownload(bookId: Int) {
        workManager.cancelAllWorkByTag("download_$bookId")
        // Mettre à jour le statut en DB dans le ViewModel
    }

    fun getDownloadStatus(bookId: Int): Flow<DownloadEntity?> =
        downloadDao.getDownload(bookId)

    fun getAllDownloads(): Flow<List<DownloadEntity>> =
        downloadDao.getAllDownloads()

    // Observer la progression via WorkInfo (alternatif à la DB)
    fun getWorkProgress(bookId: Int): Flow<WorkInfo?> =
        workManager.getWorkInfosByTagLiveData("download_$bookId")
            .let { liveData ->
                // Convertir LiveData → Flow (nécessite lifecycle-livedata-ktx)
                kotlinx.coroutines.flow.callbackFlow {
                    val observer = androidx.lifecycle.Observer<List<WorkInfo>> { infos ->
                        trySend(infos.firstOrNull())
                    }
                    liveData.observeForever(observer)
                    awaitClose { liveData.removeObserver(observer) }
                }
            }

    suspend fun getEpubFilePath(bookId: Int): String? =
        downloadDao.getFilePath(bookId)

    suspend fun deleteDownload(bookId: Int) {
        cancelDownload(bookId)
        downloadDao.deleteDownload(bookId)
        // Supprimer le fichier physique
        val file = java.io.File(context.filesDir, "epubs/book_$bookId.epub.enc")
        file.delete()
    }
}
```

---

## Étape 6 — Bouton Télécharger dans l'écran Détail

### 6.1 `DownloadViewModel.kt`

```kotlin
// feature/feature-catalog/src/main/java/com/taladz/feature/catalog/DownloadViewModel.kt
package com.taladz.feature.catalog

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.taladz.core.database.entity.DownloadEntity
import com.taladz.core.database.entity.DownloadStatus
import com.taladz.data.reader.repository.DownloadRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DownloadViewModel @Inject constructor(
    private val downloadRepository: DownloadRepository,
) : ViewModel() {

    fun getDownloadState(bookId: Int): StateFlow<DownloadEntity?> =
        downloadRepository.getDownloadStatus(bookId)
            .stateIn(
                scope        = viewModelScope,
                started      = SharingStarted.WhileSubscribed(5_000),
                initialValue = null,
            )

    fun startDownload(bookId: Int, bookTitle: String, epubUrl: String) {
        downloadRepository.startDownload(bookId, bookTitle, epubUrl)
    }

    fun cancelDownload(bookId: Int) {
        viewModelScope.launch {
            downloadRepository.deleteDownload(bookId)
        }
    }
}
```

### 6.2 Composant `DownloadButton`

```kotlin
// core/core-ui/src/main/java/com/taladz/core/ui/components/DownloadButton.kt
package com.taladz.core.ui.components

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Error
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.taladz.core.database.entity.DownloadEntity
import com.taladz.core.database.entity.DownloadStatus

@Composable
fun DownloadButton(
    downloadState : DownloadEntity?,
    onDownload    : () -> Unit,
    onCancel      : () -> Unit,
    onRead        : () -> Unit,
    modifier      : Modifier = Modifier,
) {
    when {
        downloadState == null || downloadState.status == DownloadStatus.FAILED.name -> {
            Button(onClick = onDownload, modifier = modifier) {
                Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Télécharger")
            }
        }
        downloadState.status == DownloadStatus.PENDING.name ||
        downloadState.status == DownloadStatus.DOWNLOADING.name -> {
            val progress = if (downloadState.fileSize > 0) {
                downloadState.downloadedBytes.toFloat() / downloadState.fileSize
            } else null

            OutlinedButton(onClick = onCancel, modifier = modifier) {
                CircularProgressIndicator(
                    progress       = { progress ?: 0f },
                    modifier       = Modifier.size(18.dp),
                    strokeWidth    = 2.dp,
                    color          = MaterialTheme.colorScheme.primary,
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = if (progress != null) "${(progress * 100).toInt()}%" else "En attente…"
                )
                Spacer(modifier = Modifier.width(8.dp))
                Icon(Icons.Default.Cancel, contentDescription = "Annuler", modifier = Modifier.size(18.dp))
            }
        }
        downloadState.status == DownloadStatus.COMPLETED.name -> {
            Button(
                onClick = onRead,
                colors  = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.secondary,
                ),
                modifier = modifier,
            ) {
                Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Lire hors ligne")
            }
        }
    }
}
```

---

## Étape 7 — Initialiser Hilt WorkManager

### 7.1 `HiltWorkerFactory` dans `TaladzApp.kt`

```kotlin
// app/src/main/java/com/taladz/app/TaladzApp.kt
package com.taladz.app

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import coil3.ImageLoader
// ... autres imports ...
import javax.inject.Inject

@HiltAndroidApp
class TaladzApp : Application(), Configuration.Provider, SingletonImageLoader.Factory {

    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()

    // ... newImageLoader() inchangé ...
}
```

### 7.2 Désactiver l'initialisation automatique de WorkManager dans `AndroidManifest.xml`

```xml
<!-- app/src/main/AndroidManifest.xml -->
<provider
    android:name="androidx.startup.InitializationProvider"
    android:authorities="${applicationId}.androidx-startup"
    android:exported="false"
    tools:node="merge">
    <meta-data
        android:name="androidx.work.WorkManagerInitializer"
        android:value="androidx.startup"
        tools:node="remove" />
</provider>
```

---

## Étape 8 — Permission de notification (Android 13+)

### 8.1 Déclarer la permission dans `AndroidManifest.xml`

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
```

### 8.2 Demander la permission dans l'app

```kotlin
// À appeler depuis BookDetailScreen avant le premier téléchargement :
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    val permissionState = rememberPermissionState(Manifest.permission.POST_NOTIFICATIONS)
    LaunchedEffect(Unit) {
        if (!permissionState.status.isGranted) {
            permissionState.launchPermissionRequest()
        }
    }
}
```

Ajouter dans `libs.versions.toml` :
```toml
[libraries]
accompanist-permissions = { group = "com.google.accompanist", name = "accompanist-permissions", version = "0.36.0" }
```

---

## Étape 9 — Tests WorkManager

```kotlin
// app/src/androidTest/java/com/taladz/app/DownloadWorkerTest.kt
package com.taladz.app

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.ListenableWorker.Result
import androidx.work.testing.TestListenableWorkerBuilder
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class DownloadWorkerTest {

    private val context = ApplicationProvider.getApplicationContext<Context>()

    @Test
    fun workerFailsWithMissingUrl() = runTest {
        val worker = TestListenableWorkerBuilder<DownloadWorker>(context)
            .setInputData(
                androidx.work.Data.Builder()
                    .putInt(DownloadWorker.KEY_BOOK_ID, 42)
                    // URL manquante volontairement
                    .build()
            )
            .build()

        val result = worker.startWork().get()
        assertEquals(Result.failure(), result)
    }
}
```

---

## Récapitulatif des fichiers créés / modifiés

```
core/core-security/.../crypto/
└── EpubCryptoManager.kt              ← AES-256-GCM Keystore

core/core-database/
├── entity/DownloadEntity.kt          ← table downloads avec statuts
├── dao/DownloadDao.kt
└── TaladzDatabase.kt                 ← version 2 + DownloadDao

data/data-reader/                      ← nouveau module
└── repository/DownloadRepository.kt  ← WorkManager + DB

app/src/main/java/com/taladz/app/
├── TaladzApp.kt                      ← Configuration.Provider Hilt
├── worker/DownloadWorker.kt          ← @HiltWorker, chiffrement, notification

core/core-ui/.../components/
└── DownloadButton.kt                 ← composant état téléchargement

feature/feature-catalog/.../
└── DownloadViewModel.kt

gradle/libs.versions.toml             ← +workmanager, +hilt-work
AndroidManifest.xml                   ← permissions + désactivation WorkManager auto
```

---

## Points de contrôle — Checklist livrable

Avant de passer au TP 12, vérifie que :

- [ ] Bouton "Télécharger" visible sur l'écran détail pour les livres ayant un EPUB
- [ ] La notification de progression s'affiche dans la barre de notifications
- [ ] Le téléchargement reprend automatiquement après coupure WiFi
- [ ] Le fichier `.epub.enc` est bien créé dans `filesDir/epubs/`
- [ ] Après téléchargement → bouton "Lire hors ligne" apparaît
- [ ] "Annuler" pendant le téléchargement → fichier partiellement supprimé
- [ ] `./gradlew :app:connectedAndroidTest` → test Worker passe
- [ ] CI GitHub Actions verte

---

*TP 11 terminé. Prochain : TP 12 — Lecteur EPUB avec Readium.*
