# TP 14 — Sécurité Finale et Audit

> **Durée estimée :** 10 heures sur 2-3 jours
> **Niveau :** Avancé
> **Prérequis :** TP 13 terminé (app complète fonctionnelle)

---

## Objectifs d'apprentissage

À la fin de ce TP, tu sauras :
- [ ] Activer R8 avec des règles ProGuard adaptées à Readium et Hilt
- [ ] Intégrer RootBeer (détection de root) et bloquer l'app si rootée
- [ ] Vérifier le certificate pinning en conditions réelles avec Burp Suite
- [ ] Auditer les fuites mémoire avec LeakCanary
- [ ] Auditer les données sensibles en clair (logs, mémoire)
- [ ] Préparer le build de release signé (keystore de production)

---

## Concepts théoriques

### R8 et ProGuard

R8 est le compilateur/obfuscateur d'Android Build Tools. Il fait 3 choses :
1. **Shrinking** : supprime le code mort (classes, méthodes non utilisées)
2. **Obfuscation** : renomme les classes/méthodes en noms courts (`a`, `b`, `c`…)
3. **Optimization** : optimise le bytecode

> **Important :** Sans règles ProGuard adaptées, R8 peut supprimer du code utilisé par réflexion (Hilt, Retrofit, Room, Readium) → crash en production.

### Root Detection

Un appareil rooté peut :
- Lire les fichiers de l'app (même EncryptedSharedPreferences si le kernel est compromis)
- Injecter du code dans l'app (hooks Xposed, Frida)
- Contourner les protections DRM

On utilise **RootBeer** (bibliothèque open source) pour détecter les appareils rootés.

### Certificate Pinning — vérification avec Burp

Burp Suite est un proxy HTTP/HTTPS de sécurité. En l'activant :
1. Tout le trafic de l'app passe par Burp
2. Burp présente son propre certificat TLS
3. Avec le pinning actif → l'app rejette le certificat Burp → SSL handshake échoue
4. C'est le comportement ATTENDU : le pinning fonctionne

---

## Étape 1 — Activer R8 en mode release

### 1.1 `app/build.gradle.kts`

```kotlin
android {
    buildTypes {
        release {
            isMinifyEnabled    = true    // active R8/ProGuard
            isShrinkResources  = true    // supprime les ressources non utilisées
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            signingConfig = signingConfigs.getByName("release")
        }
        debug {
            isMinifyEnabled   = false
            applicationIdSuffix = ".debug"
        }
    }
}
```

### 1.2 `app/proguard-rules.pro` — règles complètes

```proguard
# ─── Kotlin ────────────────────────────────────────────────────────────────────
-keep class kotlin.** { *; }
-keep class kotlinx.** { *; }
-dontwarn kotlin.**

# ─── Hilt ──────────────────────────────────────────────────────────────────────
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }
-keep @dagger.hilt.android.lifecycle.HiltViewModel class * { *; }
-keepnames @dagger.hilt.android.lifecycle.HiltViewModel class *
-keepclassmembers class * {
    @javax.inject.Inject <init>(...);
    @javax.inject.Inject <fields>;
}

# ─── Room ──────────────────────────────────────────────────────────────────────
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-keep @androidx.room.Dao interface *
-keepclassmembers class * extends androidx.room.RoomDatabase {
    abstract *** *Dao();
}

# ─── Retrofit + OkHttp ────────────────────────────────────────────────────────
-dontwarn okhttp3.**
-dontwarn okio.**
-keepattributes Signature
-keepattributes *Annotation*
-keep interface retrofit2.Call
-keep interface retrofit2.Callback
-keep interface retrofit2.Response
-keep class retrofit2.** { *; }

# ─── Kotlinx Serialization ────────────────────────────────────────────────────
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** {
    *** Companion;
}
-keepclasseswithmembers class **$$serializer {
    static **$$serializer INSTANCE;
}
-keep @kotlinx.serialization.Serializable class * {
    static final kotlinx.serialization.KSerializer serializer(...);
}

# ─── Readium ──────────────────────────────────────────────────────────────────
-keep class org.readium.** { *; }
-dontwarn org.readium.**
-keep class nl.siegmann.** { *; }  # epub4j utilisé par Readium

# ─── DataStore ────────────────────────────────────────────────────────────────
-keep class androidx.datastore.** { *; }
-keepclassmembers class * extends com.google.protobuf.MessageLite { *; }

# ─── Coil ─────────────────────────────────────────────────────────────────────
-keep class coil3.** { *; }
-dontwarn coil3.**

# ─── WorkManager ──────────────────────────────────────────────────────────────
-keep class androidx.work.** { *; }
-keep class * extends androidx.work.Worker
-keep class * extends androidx.work.CoroutineWorker
-keepclassmembers class * extends androidx.work.CoroutineWorker {
    public <init>(android.content.Context, androidx.work.WorkerParameters);
}

# ─── Modèles Taladz (ne pas obfusquer les DTOs utilisés par Retrofit) ─────────
-keep class com.taladz.core.network.model.dto.** { *; }
-keepclassmembers class com.taladz.core.network.model.dto.** {
    @kotlinx.serialization.SerialName <fields>;
}

# ─── Logs — supprimer en production ───────────────────────────────────────────
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
}
# Garder les logs error et warning :
# -assumenosideeffects class android.util.Log {
#     public static int e(...);
#     public static int w(...);
# }

# ─── Garder les stack traces lisibles (pour Crashlytics, etc.) ────────────────
-keepattributes SourceFile, LineNumberTable
-renamesourcefileattribute SourceFile
```

---

## Étape 2 — Tester le build release avant de continuer

```bash
# Générer un APK release avec un keystore de test
./gradlew :app:assembleRelease

# Vérifier que l'APK fonctionne sur l'émulateur :
adb install app/build/outputs/apk/release/app-release-unsigned.apk

# Vérifier les statistiques de shrinking :
./gradlew :app:assembleRelease --info | grep "Removing"
```

---

## Étape 3 — Intégrer RootBeer (détection root)

### 3.1 Ajouter la dépendance

```toml
# libs.versions.toml
[libraries]
rootbeer = { group = "com.scottyab", name = "rootbeer-lib", version = "0.1.0" }
```

```kotlin
// app/build.gradle.kts
releaseImplementation(libs.rootbeer)
// En debug, on ne vérifie pas (pratique pour les émulateurs rootés)
```

### 3.2 `RootDetectionManager.kt`

```kotlin
// core/core-security/src/main/java/com/taladz/core/security/root/RootDetectionManager.kt
package com.taladz.core.security.root

import android.content.Context
import com.scottyab.rootbeer.RootBeer
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RootDetectionManager @Inject constructor(
    @ApplicationContext private val context: Context,
) {

    data class RootCheckResult(
        val isRooted      : Boolean,
        val reasons       : List<String>,
    )

    fun checkRootStatus(): RootCheckResult {
        // En debug, on ne bloque jamais (pour les émulateurs)
        if (android.os.Build.TYPE == "user".uppercase().also {}) {
            // Build de production
        }

        val rootBeer = RootBeer(context)
        val reasons  = mutableListOf<String>()

        if (rootBeer.detectRootManagementApps()) reasons.add("App de gestion root détectée")
        if (rootBeer.detectPotentiallyDangerousApps()) reasons.add("App potentiellement dangereuse")
        if (rootBeer.checkForBinary("su")) reasons.add("Binaire 'su' présent")
        if (rootBeer.checkForDangerousProps()) reasons.add("Propriétés système dangereuses")
        if (rootBeer.checkForRWPaths()) reasons.add("Partitions système modifiables")
        if (rootBeer.detectTestKeys()) reasons.add("Build avec clés de test")
        if (rootBeer.checkSuExists()) reasons.add("Chemin 'su' détecté")

        return RootCheckResult(
            isRooted = reasons.isNotEmpty(),
            reasons  = reasons,
        )
    }
}
```

### 3.3 Vérification au démarrage dans `MainActivity.kt`

```kotlin
// app/src/main/java/com/taladz/app/MainActivity.kt
@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var rootDetectionManager: RootDetectionManager

    private val themeViewModel  : ThemeViewModel   by viewModels()
    private val sessionViewModel: SessionViewModel  by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Vérification root (uniquement en release)
        if (!BuildConfig.DEBUG) {
            val rootCheck = rootDetectionManager.checkRootStatus()
            if (rootCheck.isRooted) {
                showRootedDeviceDialog()
                return
            }
        }

        enableEdgeToEdge()
        setContent {
            val currentTheme by themeViewModel.currentTheme.collectAsStateWithLifecycle()
            val isAuth       by sessionViewModel.isAuthenticated.collectAsStateWithLifecycle()

            TaladzThemeWrapper(theme = currentTheme) {
                TaladzNavHost(isAuthenticated = isAuth)
            }
        }
    }

    private fun showRootedDeviceDialog() {
        setContent {
            MaterialTheme {
                AlertDialog(
                    onDismissRequest = {},
                    title   = { Text("Appareil non compatible") },
                    text    = {
                        Text(
                            "Taladz ne peut pas fonctionner sur un appareil rooté " +
                            "pour protéger les contenus numériques."
                        )
                    },
                    confirmButton = {
                        Button(onClick = { finishAffinity() }) {
                            Text("Fermer")
                        }
                    },
                )
            }
        }
    }
}
```

---

## Étape 4 — LeakCanary (détection de fuites mémoire)

```toml
# libs.versions.toml
[libraries]
leakcanary = { group = "com.squareup.leakcanary", name = "leakcanary-android", version = "2.14" }
```

```kotlin
// app/build.gradle.kts — uniquement en debug
debugImplementation(libs.leakcanary)
```

LeakCanary s'installe automatiquement via un `ContentProvider` — aucune configuration requise.

### Scénarios à tester

1. Ouvrir le lecteur EPUB → naviguer dans plusieurs chapitres → revenir → vérifier LeakCanary
2. Ouvrir une notification → la marquer comme lue → revenir → vérifier
3. Faire une recherche longue → effacer → vérifier que les coroutines sont annulées

---

## Étape 5 — Audit sécurité : logs de production

### 5.1 Vérifier qu'aucun secret ne sort dans les logs

```kotlin
// MAUVAIS — ne jamais logger un token
Log.d("Auth", "Token: $accessToken")  // ← À supprimer !

// BON — logger uniquement des infos non sensibles
Log.d("Auth", "Connexion réussie pour userId=${userId}")
```

### 5.2 Script de vérification automatique

```bash
# Rechercher des patterns sensibles dans le code :
grep -r "Log\.\(d\|v\|i\).*token\|password\|secret\|key\|Bearer" --include="*.kt" src/
grep -r "println\|System.out" --include="*.kt" src/
```

### 5.3 Vérifier les fichiers générés par Room

Room génère du code SQL. S'assurer que les champs chiffrés ne sont pas exposés :

```kotlin
// core/core-database/src/main/java/com/taladz/core/database/entity/BookEntity.kt
// ✅ Les tokens ne sont PAS dans Room — ils sont dans EncryptedSharedPreferences
// ✅ Les mots de passe ne sont jamais stockés localement
```

---

## Étape 6 — Certificate Pinning — test avec Burp Suite

### 6.1 Configuration Burp (résumé)

1. Installer **Burp Suite Community Edition** sur ton PC
2. Dans Burp : Proxy → Options → ajuster le port (ex: 8080)
3. Sur l'émulateur : WiFi → paramètres proxy → IP du PC:8080
4. Sur l'émulateur : télécharger le certificat Burp depuis http://burp → l'installer dans "Credentials" → "User Certificates"

### 6.2 Test du pinning

**Avec pinning actif (mode release) :**
```
App → requête → Burp (présente son certif) → REJET (SSLHandshakeException)
✅ Le pinning fonctionne → on voit l'erreur dans Logcat mais pas dans Burp
```

**Sans pinning (mode debug) :**
```
App → requête → Burp (présente son certif) → ACCEPTÉ (network_security_config debug)
On peut voir toutes les requêtes dans Burp → utile pour le debug
```

### 6.3 `network_security_config.xml` — configuration définitive

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Production : HTTPS uniquement + pinning -->
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">api.taladz.com</domain>
        <pin-set expiration="2027-01-01">
            <!-- Pin primaire — à remplacer par le vrai hash de ton certificat -->
            <pin digest="SHA-256">REMPLACER_PAR_VRAI_HASH_BASE64==</pin>
            <!-- Pin de backup (rotation de certificat) -->
            <pin digest="SHA-256">BACKUP_HASH_BASE64==</pin>
        </pin-set>
    </domain-config>

    <!-- Debug : autoriser HTTP local + trust user certificates -->
    <debug-overrides>
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />   <!-- Burp proxy en debug -->
        </trust-anchors>
    </debug-overrides>
</network-security-config>
```

---

## Étape 7 — Keystore de production et build signé

### 7.1 Générer un keystore de production

```bash
# Sur ton PC (GARDER CE FICHIER EN LIEU SÛR !)
keytool -genkeypair \
  -alias taladz_release \
  -keyalg RSA \
  -keysize 2048 \
  -validity 9125 \   # 25 ans
  -keystore taladz_release.keystore \
  -dname "CN=Taladz, O=ActionCulture DZ, L=Alger, ST=Alger, C=DZ"
```

### 7.2 Configuration de signature dans `app/build.gradle.kts`

Ne jamais mettre les mots de passe en clair dans le code source. Utiliser les variables d'environnement :

```kotlin
android {
    signingConfigs {
        create("release") {
            storeFile     = file(System.getenv("KEYSTORE_PATH") ?: "keystore/taladz_release.keystore")
            storePassword = System.getenv("KEYSTORE_PASSWORD") ?: ""
            keyAlias      = System.getenv("KEY_ALIAS") ?: "taladz_release"
            keyPassword   = System.getenv("KEY_PASSWORD") ?: ""
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            // ...
        }
    }
}
```

### 7.3 Variables d'environnement GitHub Actions

Dans GitHub : Settings → Secrets → Actions → New secret :
- `KEYSTORE_BASE64` : `base64 -i taladz_release.keystore`
- `KEYSTORE_PASSWORD` : mot de passe du keystore
- `KEY_ALIAS` : `taladz_release`
- `KEY_PASSWORD` : mot de passe de la clé

### 7.4 Mise à jour du workflow GitHub Actions

```yaml
# .github/workflows/release.yml
name: Release Build

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Decode keystore
        run: |
          echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > app/keystore/taladz_release.keystore

      - name: Build release APK
        env:
          KEYSTORE_PATH: app/keystore/taladz_release.keystore
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
        run: ./gradlew :app:assembleRelease

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: taladz-release
          path: app/build/outputs/apk/release/*.apk
```

---

## Étape 8 — Checklist sécurité complète

### 8.1 OWASP Mobile Top 10 — vérification

| Vulnérabilité | Statut | Mesure |
|---------------|--------|--------|
| M1 — Credential Exposure | ✅ Protégé | EncryptedSharedPreferences + Keystore |
| M2 — Insecure Data Storage | ✅ Protégé | Room ne stocke pas les tokens; fichiers EPUB chiffrés |
| M3 — Insecure Communication | ✅ Protégé | HTTPS + Certificate Pinning + network_security_config |
| M4 — Insufficient Auth | ✅ Protégé | JWT + refresh token rotatif + logout révocation |
| M5 — Inadequate Privacy | ✅ Protégé | Pas de tracking tiers intégré |
| M6 — Outdated Components | ⚠️ À surveiller | Vérifier les dépendances régulièrement |
| M7 — Insufficient Binary Protection | ✅ Protégé | R8 + obfuscation activés en release |
| M8 — Security Misconfiguration | ✅ Protégé | network_security_config, pas de HTTP en prod |
| M9 — Insecure Data Leakage | ✅ Protégé | Logs supprimés en prod (proguard-rules) |
| M10 — Insufficient Cryptography | ✅ Protégé | AES-256 Keystore pour EPUB; AES-256-GCM pour prefs |

### 8.2 Anti-tampering (vérification de l'intégrité)

```kotlin
// Vérifier que l'app n'a pas été repaquetée (signature modifiée) :
fun verifySignature(context: Context): Boolean {
    return try {
        val packageInfo = context.packageManager.getPackageInfo(
            context.packageName,
            android.content.pm.PackageManager.GET_SIGNING_CERTIFICATES,
        )
        val signatures = packageInfo.signingInfo?.apkContentsSigners
        // Comparer le SHA-256 de la signature avec la valeur attendue
        val expectedSignatureHash = "HASH_DE_TA_CLE_DE_PROD"
        signatures?.any { sig ->
            val hash = java.security.MessageDigest.getInstance("SHA-256")
                .digest(sig.toByteArray())
                .joinToString("") { "%02x".format(it) }
            hash == expectedSignatureHash
        } ?: false
    } catch (e: Exception) {
        false
    }
}
```

---

## Étape 9 — Audit des performances

### 9.1 Android Profiler — vérifications

Dans Android Studio : **View → Tool Windows → Profiler**

Tests à effectuer :
1. **CPU** : ouvrir le catalogue → faire défiler 100 items → CPU < 30% en moyenne
2. **Memory** : ouvrir 3 livres → revenir → mémoire doit redescendre (pas de leak)
3. **Network** : vérifier que les requêtes utilisent gzip et que les images sont cachées
4. **Battery** : WorkManager ne doit pas réveiller l'app inutilement

### 9.2 Startup Time

```bash
# Mesurer le temps de démarrage (cold start) :
adb shell am start-activity -W com.taladz.app/.MainActivity

# Résultat attendu :
# ThisTime: < 1500ms (cold start)
# TotalTime: < 2000ms
```

---

## Étape 10 — Build release final et vérification APK

### 10.1 Générer l'APK de release

```bash
# Avec les variables d'environnement configurées :
export KEYSTORE_PATH=app/keystore/taladz_release.keystore
export KEYSTORE_PASSWORD=ton_mot_de_passe
export KEY_ALIAS=taladz_release
export KEY_PASSWORD=ton_mot_de_passe_cle

./gradlew :app:assembleRelease

# L'APK est dans :
# app/build/outputs/apk/release/app-release.apk
```

### 10.2 Vérifier l'APK avec `apkanalyzer`

```bash
# Analyser les classes conservées après R8 :
$ANDROID_HOME/build-tools/35.0.0/apkanalyzer dex packages app/build/outputs/apk/release/app-release.apk

# Vérifier la taille :
$ANDROID_HOME/build-tools/35.0.0/apkanalyzer apk file-size app/build/outputs/apk/release/app-release.apk
```

### 10.3 Générer un AAB (Android App Bundle) pour le Play Store

```bash
./gradlew :app:bundleRelease
# L'AAB est dans : app/build/outputs/bundle/release/app-release.aab
```

---

## Récapitulatif des fichiers créés / modifiés

```
app/
├── proguard-rules.pro                     ← règles complètes Hilt/Room/Retrofit/Readium
├── build.gradle.kts                       ← R8 activé, signingConfig
└── src/main/
    ├── AndroidManifest.xml                ← network_security_config pointé
    ├── res/xml/network_security_config.xml ← pinning production + debug override
    └── java/com/taladz/app/
        └── MainActivity.kt               ← +vérification root au démarrage

core/core-security/src/.../
└── root/RootDetectionManager.kt          ← RootBeer wrapper

.github/workflows/
├── build.yml                             ← CI debug inchangée
└── release.yml                           ← nouveau : build release + signature

gradle/libs.versions.toml                 ← +rootbeer, +leakcanary
```

---

## Points de contrôle — Checklist livrable FINAL

Félicitations — c'est le dernier TP ! Avant de soumettre sur le Play Store :

### Sécurité
- [ ] `./gradlew :app:assembleRelease` → BUILD SUCCESSFUL (APK signé)
- [ ] APK size < 50 MB (avec AAB dynamique delivery)
- [ ] Sur appareil rooté → l'app affiche le dialog de blocage et ferme
- [ ] Test Burp Suite → SSLHandshakeException en release (pinning actif)
- [ ] Aucun log sensible en release (grep dans logcat)
- [ ] LeakCanary → 0 fuite mémoire après usage normal

### Performance
- [ ] Cold start < 2 secondes
- [ ] Scrolling catalogue à 60 FPS (Android Profiler)
- [ ] Pas de ANR (Application Not Responding) lors des chargements

### Play Store
- [ ] versionCode incrémenté à chaque release
- [ ] minSdk = 26 (Android 8.0 — couverture ~95%)
- [ ] targetSdk = 35 (Android 15)
- [ ] Permissions minimales déclarées (pas de permissions inutiles)
- [ ] Politique de confidentialité (CNIL/RGPD) référencée dans le Store

---

## Résumé du parcours — 14 TP, 148 heures

```
TP 01 → Projet Android + Splash
TP 02 → Multi-modules + CI/CD
TP 03 → Thème Material 3 + RTL + Polices arabes
TP 04 → Navigation Compose + Bottom Bar
TP 05 → Hilt + injection de dépendances
TP 06 → Retrofit + OkHttp + Certificate Pinning
TP 07 → Auth JWT + EncryptedSharedPreferences + Refresh silencieux
TP 08 → Catalogue Paging 3 + Coil + Filtres
TP 09 → Détail livre + Cache Room offline-first
TP 10 → Bibliothèque + Favoris + Badge notifications
TP 11 → WorkManager + Téléchargement + Chiffrement AES-256
TP 12 → Lecteur EPUB Readium + CFI + Thèmes lecture
TP 13 → Surlignages + Notes + Signets + Export
TP 14 → R8 + ProGuard + Root Detection + Audit sécurité + Release signé
         ↓
  APK Release prêt pour le Play Store
```

---

*Parcours complet terminé. L'application Taladz est une app ebook professionnelle, sécurisée et offline-first — niveau Kindle.*
