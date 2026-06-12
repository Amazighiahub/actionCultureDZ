# TP N°01 : Installation et premier projet "Hello Taladz"

**Durée estimée** : 8 heures réparties sur 2 jours
**Niveau** : Débutant absolu — aucune connaissance Android requise
**Prérequis** : Savoir utiliser un terminal, avoir Git installé

---

## 🎯 1. Objectifs de ce TP

À la fin de ce TP, tu sauras :
- [ ] Installer Android Studio et configurer un émulateur
- [ ] Comprendre la structure d'un projet Android (Gradle, manifeste, ressources)
- [ ] Créer un premier écran avec Jetpack Compose
- [ ] Utiliser Logcat pour déboguer
- [ ] Créer un dépôt Git et faire tes premiers commits propres

---

## 📚 2. Contexte

Taladz est une application de lecture d'ebooks professionnelle — l'équivalent d'un Kindle pour le marché algérien. Dans ce premier TP, on ne touche pas encore au backend ni aux livres. L'objectif est simple : **avoir un projet Android qui tourne sur ton téléphone ou émulateur**, avec un écran d'accueil aux couleurs de Taladz.

C'est la fondation sur laquelle on construira tout le reste pendant 13 semaines.

---

## 🔧 3. Concepts à comprendre AVANT de coder

### Qu'est-ce que Jetpack Compose ?
Compose est la façon moderne de construire des interfaces Android. Au lieu d'écrire du XML (l'ancienne méthode), tu écris du code Kotlin qui **décrit** ce que tu veux voir à l'écran. C'est comme dire "affiche un texte bleu de taille 24" directement en code, sans fichier séparé.

**Analogie :** Compose c'est comme cuisiner en disant les ingrédients à voix haute, plutôt que de suivre une recette écrite dans un autre fichier.

### Qu'est-ce que Gradle ?
Gradle est l'outil qui **construit** ton application. Il télécharge les bibliothèques dont tu as besoin, compile ton code, et crée le fichier `.apk` à installer sur le téléphone. Tu ne l'exécutes jamais directement — Android Studio le fait pour toi.

### Qu'est-ce que le manifeste Android ?
`AndroidManifest.xml` est la **carte d'identité** de ton application. Il dit au système Android : "cette app s'appelle Taladz, voici son icône, voici ses permissions, voici l'écran qui se lance en premier."

### Qu'est-ce que Logcat ?
Logcat est le **journal de bord** de ton application. Tout ce que tu écris avec `Log.d(...)` apparaît ici en temps réel. C'est ton outil de débogage principal.

---

## 📖 4. Ressources à consulter (30 min max)

- [Guide officiel Compose — Premiers pas](https://developer.android.com/jetpack/compose/tutorial) : lis uniquement la section "Composable functions"
- [Présentation de Gradle](https://developer.android.com/studio/build) : lis uniquement le schéma en haut de page
- Pas de vidéo pour ce TP — tout est expliqué pas à pas ci-dessous

---

## 🔌 5. Endpoints backend utilisés dans ce TP

**Aucun** — ce TP est 100% local, pas de connexion réseau.

---

## 📝 6. Étapes détaillées

---

### Étape 1 : Installer Android Studio

**Objectif :** avoir l'environnement de développement prêt.

**Action 1.1** : Télécharge Android Studio
- Va sur [https://developer.android.com/studio](https://developer.android.com/studio)
- Clique sur **"Download Android Studio"**
- Choisis la version pour ton système (Windows / macOS / Linux)

**Action 1.2** : Installe Android Studio
- **Windows** : lance le `.exe`, clique "Next" à chaque étape, garde les options par défaut
- **macOS** : glisse l'icône dans le dossier Applications
- **Linux** : décompresse l'archive, puis dans un terminal :
```bash
cd android-studio/bin
./studio.sh
```

**Action 1.3** : Premier lancement — suis l'assistant de configuration
- Choisis **"Standard"** quand il te demande le type d'installation
- Accepte les licences (clique "Accept" pour chacune)
- Laisse-le télécharger les composants (ça peut prendre 10-20 minutes)

**✅ Vérification :** Android Studio s'ouvre sur un écran "Welcome to Android Studio".

---

### Étape 2 : Créer le projet

**Objectif :** générer la structure de base du projet Taladz.

**Action 2.1** : Clique sur **"New Project"** dans l'écran d'accueil

**Action 2.2** : Choisis le template **"Empty Activity"**
- C'est la première option en haut à gauche
- Clique **"Next"**

**Action 2.3** : Configure le projet avec ces valeurs **exactes** :

| Champ | Valeur |
|-------|--------|
| Name | `Taladz` |
| Package name | `com.taladz.app` |
| Save location | un dossier de ton choix, ex: `~/projets/taladz-android` |
| Language | `Kotlin` |
| Minimum SDK | `API 24 ("Nougat"; Android 7.0)` |

**Action 2.4** : Clique **"Finish"**

Android Studio va générer le projet et télécharger les dépendances. Attends que la barre de progression en bas disparaisse (2-5 minutes).

**⚠️ Piège à éviter :** Ne change JAMAIS le Package name après la création. C'est l'identifiant unique de ton app sur le Play Store — le modifier plus tard casse tout.

**✅ Vérification :** Tu vois dans la colonne de gauche une arborescence avec `app/`, `Gradle Scripts/`, etc.

---

### Étape 3 : Créer et configurer l'émulateur

**Objectif :** avoir un "téléphone virtuel" pour tester l'app.

**Action 3.1** : Ouvre le gestionnaire d'émulateurs
- Menu en haut : **Tools → Device Manager**
- Un panneau s'ouvre à droite

**Action 3.2** : Crée un nouvel émulateur
- Clique le bouton **"+"** (Create Virtual Device)
- Choisis **"Phone"** dans la colonne de gauche
- Sélectionne **"Pixel 6"** dans la liste
- Clique **"Next"**

**Action 3.3** : Choisis l'image système
- Sélectionne **"API 34 (Android 14)"** — si elle n'est pas téléchargée, clique la flèche de téléchargement à côté
- Attends le téléchargement (peut prendre 5-10 minutes)
- Clique **"Next"** puis **"Finish"**

**Action 3.4** : Lance l'émulateur
- Dans Device Manager, clique le bouton ▶ à côté de "Pixel 6 API 34"
- Attends que l'écran Android apparaisse (30-60 secondes)

**⚠️ Piège à éviter :** Si l'émulateur est très lent, vérifie que la virtualisation matérielle est activée dans le BIOS (Intel VT-x ou AMD-V). Cherche "enable virtualization BIOS [ta marque PC]" si besoin.

**✅ Vérification :** Tu vois un téléphone Android virtuel avec l'écran d'accueil.

---

### Étape 4 : Comprendre la structure du projet

**Objectif :** savoir où se trouvent les fichiers importants.

**Action 4.1** : Dans la colonne de gauche, assure-toi d'être en vue **"Android"** (sélecteur en haut de la colonne).

Voici ce que tu dois connaître :

```
app/
├── manifests/
│   └── AndroidManifest.xml      ← carte d'identité de l'app
├── kotlin+java/
│   └── com.taladz.app/
│       └── MainActivity.kt      ← point d'entrée de l'app
└── res/
    ├── drawable/                ← icônes et images
    ├── values/
    │   ├── colors.xml           ← couleurs
    │   ├── strings.xml          ← textes (pour la traduction)
    │   └── themes.xml           ← thème visuel
    └── mipmap/                  ← icône de l'app (différentes tailles)

Gradle Scripts/
├── build.gradle.kts (Project)   ← configuration globale
└── build.gradle.kts (Module :app) ← dépendances de l'app
```

**Action 4.2** : Ouvre `MainActivity.kt` en double-cliquant dessus

Tu vois du code généré automatiquement. Ne le modifie pas encore — on va le remplacer à l'étape suivante.

**✅ Vérification :** Tu peux ouvrir chaque fichier sans erreur.

---

### Étape 5 : Lancer l'app pour la première fois

**Objectif :** voir l'app tourner sur l'émulateur.

**Action 5.1** : Clique le bouton ▶ vert en haut d'Android Studio (ou `Shift+F10`)

**Action 5.2** : Attends que l'app se compile et s'installe sur l'émulateur (1-2 minutes la première fois)

Tu dois voir apparaître sur l'émulateur un texte "Hello Android!" sur fond blanc.

**⚠️ Piège à éviter :** Si tu vois l'erreur `Gradle sync failed`, clique sur **"Try again"** dans le bandeau jaune. Si ça échoue encore, va dans **File → Invalidate Caches → Invalidate and Restart**.

**✅ Vérification :** L'app s'ouvre sur l'émulateur avec "Hello Android!".

---

### Étape 6 : Créer l'écran d'accueil Taladz

**Objectif :** remplacer l'écran générique par un vrai écran aux couleurs de Taladz.

**Action 6.1** : Ouvre `app/res/values/colors.xml` et remplace le contenu par :

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Couleurs principales Taladz -->
    <color name="taladz_primary">#1B4332</color>      <!-- vert foncé -->
    <color name="taladz_primary_light">#2D6A4F</color> <!-- vert moyen -->
    <color name="taladz_accent">#D4AC0D</color>        <!-- or -->
    <color name="taladz_background">#FAFAFA</color>    <!-- blanc cassé -->
    <color name="taladz_text_primary">#1A1A1A</color>  <!-- presque noir -->
    <color name="taladz_text_secondary">#666666</color><!-- gris -->
</resources>
```

**Action 6.2** : Ouvre `app/res/values/strings.xml` et remplace le contenu :

```xml
<resources>
    <string name="app_name">Taladz</string>
    <string name="welcome_title_fr">Bienvenue sur Taladz</string>
    <string name="welcome_title_ar">مرحباً بك في تلادز</string>
    <string name="welcome_subtitle">Votre bibliothèque numérique algérienne</string>
    <string name="btn_start">Commencer</string>
</resources>
```

**Action 6.3** : Ouvre `MainActivity.kt` et remplace **tout** le contenu par :

```kotlin
package com.taladz.app

import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// TAG utilisé pour identifier les logs de cette activité dans Logcat
private const val TAG = "MainActivity"

// ComponentActivity est la classe de base pour toute activité Compose moderne
class MainActivity : ComponentActivity() {

    // onCreate est appelée une seule fois quand l'activité est créée
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // enableEdgeToEdge permet à l'app d'aller jusqu'aux bords de l'écran
        enableEdgeToEdge()

        // Log pour vérifier que l'activité démarre correctement
        Log.d(TAG, "Taladz démarré avec succès !")

        // setContent définit ce qui s'affiche à l'écran
        // Tout ce qui est dans ce bloc EST l'interface utilisateur
        setContent {
            WelcomeScreen(
                onStartClicked = {
                    // Pour l'instant on log juste — la navigation viendra au TP 04
                    Log.d(TAG, "Bouton Commencer cliqué !")
                }
            )
        }
    }
}

// @Composable = cette fonction décrit un morceau d'interface
// Elle peut être réutilisée et combinée avec d'autres @Composable
@Composable
fun WelcomeScreen(onStartClicked: () -> Unit) {

    // Couleurs extraites de colors.xml — on les définit ici en dur pour l'instant
    // Au TP 03 on utilisera le système de thème Material 3
    val colorPrimary = Color(0xFF1B4332)   // vert foncé
    val colorAccent  = Color(0xFFD4AC0D)   // or
    val colorBg      = Color(0xFFFAFAFA)   // blanc cassé

    // Column = conteneur vertical (les enfants s'empilent de haut en bas)
    Column(
        modifier = Modifier
            .fillMaxSize()                  // occupe tout l'écran
            .background(colorBg)            // fond blanc cassé
            .padding(horizontal = 32.dp),   // marges gauche et droite
        verticalArrangement = Arrangement.Center,   // centré verticalement
        horizontalAlignment = Alignment.CenterHorizontally // centré horizontalement
    ) {

        // Emoji livre comme logo provisoire — remplacé au TP 03
        Text(
            text = "📚",
            fontSize = 80.sp
        )

        Spacer(modifier = Modifier.height(32.dp)) // espace vertical de 32dp

        // Titre en arabe
        Text(
            text = stringResource(R.string.welcome_title_ar),
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = colorPrimary,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Titre en français
        Text(
            text = stringResource(R.string.welcome_title_fr),
            fontSize = 22.sp,
            fontWeight = FontWeight.SemiBold,
            color = colorPrimary,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Sous-titre descriptif
        Text(
            text = stringResource(R.string.welcome_subtitle),
            fontSize = 16.sp,
            color = Color(0xFF666666),  // gris
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(48.dp))

        // Bouton principal — appelle onStartClicked quand l'utilisateur appuie
        Button(
            onClick = onStartClicked,
            colors = ButtonDefaults.buttonColors(
                containerColor = colorPrimary  // fond vert foncé
            ),
            shape = RoundedCornerShape(12.dp)  // coins arrondis
        ) {
            Text(
                text = stringResource(R.string.btn_start),
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.White,
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp)
            )
        }
    }
}

// @Preview permet de voir l'écran dans Android Studio sans lancer l'émulateur
// NE sert que pendant le développement — ignoré dans l'APK final
@Preview(showBackground = true)
@Composable
fun WelcomeScreenPreview() {
    WelcomeScreen(onStartClicked = {})
}
```

**Explication des lignes clés :**
- `@Composable` : marque une fonction qui décrit de l'interface — c'est le cœur de Compose
- `Modifier` : permet de styler et positionner les composants (comme CSS pour le web)
- `Column` : conteneur vertical — équivalent d'un `div flex-direction:column`
- `stringResource(R.string.xxx)` : lit une chaîne depuis `strings.xml` (pour la traduction future)
- `Log.d(TAG, "...")` : écrit un message dans Logcat (niveau Debug)

**Action 6.4** : Lance l'app (`Shift+F10`)

**⚠️ Piège à éviter :** Si tu vois `Unresolved reference: R`, c'est que le projet n'a pas fini de se synchroniser. Attends 30 secondes et réessaie.

**✅ Vérification :** Tu vois l'écran d'accueil avec le livre 📚, les deux titres (arabe et français), et le bouton vert "Commencer".

---

### Étape 7 : Lire les logs dans Logcat

**Objectif :** savoir utiliser Logcat pour déboguer.

**Action 7.1** : En bas d'Android Studio, clique sur l'onglet **"Logcat"**

**Action 7.2** : Dans la barre de filtre en haut de Logcat, tape `MainActivity`

**Action 7.3** : Clique le bouton "Commencer" sur l'émulateur

Tu dois voir apparaître dans Logcat :
```
D  Taladz démarré avec succès !
D  Bouton Commencer cliqué !
```

**Explication des niveaux de log :**
- `Log.v(TAG, "...")` → **Verbose** (très détaillé, en production on les désactive)
- `Log.d(TAG, "...")` → **Debug** (utile pendant le développement)
- `Log.i(TAG, "...")` → **Info** (informations importantes)
- `Log.w(TAG, "...")` → **Warning** (quelque chose d'anormal mais pas bloquant)
- `Log.e(TAG, "...")` → **Error** (une erreur s'est produite)

**✅ Vérification :** Tu vois tes deux messages dans Logcat avec le niveau "D" (Debug).

---

### Étape 8 : Initialiser Git et faire les premiers commits

**Objectif :** versionner le projet dès le début.

**Action 8.1** : Ouvre un terminal dans le dossier du projet
- Dans Android Studio : **Terminal** (onglet en bas) ou `Alt+F12`

**Action 8.2** : Initialise Git
```bash
git init
git branch -M main
```

**Action 8.3** : Crée le fichier `.gitignore` à la racine du projet.

Crée le fichier `taladz-android/.gitignore` avec ce contenu :
```
# Android générés
*.iml
.gradle/
local.properties
.DS_Store
build/
captures/
.externalNativeBuild/
.cxx/
*.apk
*.aab
*.ap_
*.dex

# Android Studio
.idea/
*.iws
*.ipr

# Keystore (NE JAMAIS committer)
*.jks
*.keystore
keystore.properties
```

**Action 8.4** : Fais le premier commit
```bash
git add .
git commit -m "feat(app): init projet Taladz avec écran d'accueil"
```

**Action 8.5** : Crée un dépôt sur GitHub
- Va sur [github.com](https://github.com) → "New repository"
- Nom : `taladz-android`
- Visibilité : Private
- **Ne coche PAS** "Add a README" (on en a déjà un)
- Clique "Create repository"

**Action 8.6** : Connecte ton dépôt local au dépôt GitHub (remplace `TON_USERNAME` par ton pseudo GitHub)
```bash
git remote add origin https://github.com/TON_USERNAME/taladz-android.git
git push -u origin main
```

**⚠️ Piège à éviter :** Ne committe JAMAIS le fichier `local.properties` — il contient le chemin vers ton SDK Android qui est différent sur chaque machine.

**✅ Vérification :** Ton code est visible sur GitHub à `github.com/TON_USERNAME/taladz-android`.

---

## 🧪 7. Tests à écrire

Pour ce premier TP, on écrit un test simple pour vérifier que l'interface se compose sans erreur.

Ouvre `app/src/androidTest/java/com/taladz/app/MainActivityTest.kt` et remplace son contenu par :

```kotlin
package com.taladz.app

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class WelcomeScreenTest {

    // createComposeRule crée un environnement de test pour Compose
    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun welcomeScreen_affiche_titre_arabe() {
        // GIVEN : on affiche l'écran d'accueil
        composeTestRule.setContent {
            WelcomeScreen(onStartClicked = {})
        }

        // THEN : le titre arabe est visible
        composeTestRule
            .onNodeWithText("مرحباً بك في تلادز")
            .assertIsDisplayed()
    }

    @Test
    fun bouton_commencer_est_cliquable() {
        var clicked = false

        // GIVEN
        composeTestRule.setContent {
            WelcomeScreen(onStartClicked = { clicked = true })
        }

        // WHEN : on clique le bouton
        composeTestRule
            .onNodeWithText("Commencer")
            .performClick()

        // THEN : le callback a été appelé
        assert(clicked) { "Le bouton Commencer n'a pas déclenché le callback" }
    }
}
```

**Pour lancer les tests :**
```bash
# Dans Android Studio : clic droit sur le fichier → "Run tests"
# Ou via terminal (avec l'émulateur lancé) :
./gradlew connectedAndroidTest
```

---

## 💾 8. Livrable Git

**Branche :** `tp-01-setup`

**Commits attendus :**
```bash
git commit -m "feat(app): init projet Taladz avec écran d'accueil"
git commit -m "feat(app): écran WelcomeScreen avec titre bilingue AR/FR"
git commit -m "test(app): tests UI WelcomeScreen"
```

**Pull Request :**
- Depuis `tp-01-setup` vers `main`
- Titre : `TP 01 — Setup projet Android Taladz`
- Description :
  ```
  ## Ce qui a été fait
  - Création du projet Android avec Jetpack Compose
  - Écran d'accueil bilingue (arabe / français)
  - Couleurs Taladz (vert + or)
  - Git initialisé + .gitignore

  ## Tests
  - WelcomeScreen s'affiche sans crash
  - Bouton Commencer déclenche le callback

  ## Capture d'écran
  [joindre une capture de l'émulateur]
  ```

---

## ✅ 9. Checklist d'auto-évaluation

Avant de soumettre, vérifie :
- [ ] L'app se lance sans crash sur l'émulateur
- [ ] Le titre arabe s'affiche (pas des carrés □□□)
- [ ] Le titre français s'affiche
- [ ] Le bouton "Commencer" est visible et cliquable
- [ ] Le message apparaît dans Logcat quand on clique le bouton
- [ ] `.gitignore` est présent et `local.properties` N'est PAS commité
- [ ] Les tests passent (verts dans Android Studio)
- [ ] Le code est pushé sur GitHub

---

## 🤔 10. Questions de compréhension

Réponds par écrit dans un fichier `tp-01-reponses.md` :

1. **Conceptuelle :** Quelle est la différence entre une `Activity` et une fonction `@Composable` ?

2. **Technique :** Dans Compose, à quoi sert le `Modifier` ? Donne deux exemples de ce qu'on peut faire avec.

3. **Architecture :** Pourquoi met-on les textes dans `strings.xml` plutôt que directement dans le code Kotlin ?

4. **Piège :** Pourquoi le fichier `local.properties` ne doit-il jamais être commité sur Git ?

5. **Alternative :** On a utilisé `Column` pour disposer les éléments verticalement. Quel composant Compose utiliserais-tu pour les disposer horizontalement ?

---

## 🚀 11. Bonus (optionnel)

Si tu finis en avance :

- **Bonus 1 :** Ajoute un `AnimatedVisibility` sur le sous-titre — il apparaît avec un fondu au bout de 500ms
- **Bonus 2 :** Fais en sorte que le fond change de couleur entre le mode clair et sombre (`isSystemInDarkTheme()`)
- **Bonus 3 :** Ajoute un vrai logo SVG Taladz à la place de l'emoji 📚 (crée un Vector Asset dans Android Studio)

---

## 📌 12. Ce qu'on fera au prochain TP

Au **TP 02**, on va transformer ce projet "app unique" en **projet multi-modules** — comme les grandes applications professionnelles. On créera les modules `core-common` et `core-ui`, on configurera un **Version Catalog** pour gérer toutes les dépendances en un seul fichier, et on mettra en place une **CI/CD avec GitHub Actions** qui vérifie automatiquement que le code compile à chaque push. C'est la fondation de l'architecture qui nous suivra jusqu'au TP 14.
