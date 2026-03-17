# Audit UX — Formulaires EventCulture

> Date : 15 mars 2026
> Auditeur : Senior UX Designer (12 ans exp. SaaS)
> Methode : Audit heuristique (Nielsen) + lois de Hick/Fitts + inspection code source
> Langues testees : FR, AR (RTL), EN, TZ-LTN, TZ-TFNG

---

## Table des matieres

1. [Synthese executive](#synthese-executive)
2. [Fiches par formulaire](#fiches-par-formulaire)
3. [Problemes transversaux](#problemes-transversaux)
4. [Matrice de priorite](#matrice-de-priorite)
5. [Plan d'action recommande](#plan-daction-recommande)

---

## Synthese executive

| Formulaire | Clarte | Organisation | Feedback | Actions | Multilingue | **Global /50** |
|---|---|---|---|---|---|---|
| AjouterEvenement | 6 | 7 | 5 | 7 | 3 | **28** |
| AjouterArtisanat | 5 | 6 | 4 | 4 | 1 | **20** |
| AjouterOrganisation | 6 | 8 | 5 | 6 | 1 | **26** |
| AjouterOeuvre | 6 | 7 | 6 | 7 | 3 | **29** |
| AjouterServicePro | 4 | 5 | 5 | 6 | 1 | **21** |
| AjouterPatrimoine (admin) | 5 | 7 | 3 | 6 | 2 | **23** |
| AjouterPatrimoinePro | 7 | 8 | 6 | 7 | 5 | **33** |
| Auth (Login) | 7 | 8 | 6 | 7 | 4 | **32** |
| Auth (Register) | 6 | 6 | 5 | 6 | 3 | **26** |
| ForgotPassword | 8 | 9 | 7 | 8 | 4 | **36** |
| ResetPassword | 7 | 9 | 6 | 7 | 4 | **33** |

**Moyenne : 27/50** — En dessous du seuil acceptable (35/50) pour une application grand public.

**3 problemes systemiques** impactent TOUS les formulaires :
1. **i18n cassee** — La majorite des formulaires affichent du francais hardcode pour les utilisateurs AR/EN/TZ
2. **RTL non fonctionnel** — Les pages ont `dir="ltr"` en dur ou aucun support RTL
3. **Validation uniquement au submit** — Aucun formulaire ne valide en temps reel (onBlur)

---

## Fiches par formulaire

---

### ═══════════════════════════════════════
### FORMULAIRE : Ajouter un Evenement
### Page : `/ajouter-evenement`
### Fichier : `frontEnd/src/pages/AjouterEvenement.tsx`
### ═══════════════════════════════════════

**CLARTE : 6/10** — Titre clair, labels corrects. Mais le champ "Lieu" n'affiche jamais son erreur inline (seulement en toast). Le drag-and-drop annonce "Glissez-deposez" mais n'est pas implemente.

**ORGANISATION : 7/10** — 6 sections bien separees en Cards. Ordre logique (format > organisation > infos > dates > tarifs > image). La section organisation s'affiche/masque selon le format. Mais formulaire long (~15 champs visibles) sans stepper.

**FEEDBACK : 5/10** — Validation seulement au submit. Erreurs en toast (premier message) + inline par champ. Pas de validation onBlur. L'erreur du champ "Lieu" est stockee dans `fieldErrors.lieu` mais **jamais rendue dans le JSX** — l'utilisateur ne sait pas quel champ corriger. Pas de compteur de caracteres.

**ACTIONS : 7/10** — Deux boutons clairs : "Sauvegarder en brouillon" (outline) et "Publier l'evenement" (primary). Labels explicites. Le brouillon a une validation allege. Redirection immediate apres succes.

**MULTILINGUE : 3/10** — Le champ `nom` requiert correctement `['fr', 'ar']`. Mais `description` utilise le defaut du composant (les 5 langues marquees requises) alors qu'elle est optionnelle — les points rouges trompent l'utilisateur. EN montre des **cles i18n brutes** (`"events.create.title"` affiche a l'ecran). ~25 cles manquent dans tous les fichiers de traduction. `dir="ltr"` hardcode sur la page.

**SCORE GLOBAL : 28/50**

**PROBLEMES :**
- :red_circle: **Erreur lieu invisible** — `fieldErrors.lieu` n'est jamais rendu inline. L'utilisateur voit le toast disparaitre et ne sait pas ou corriger.
- :red_circle: **EN affiche des cles brutes** — Un anglophone voit `"events.create.title"` comme titre de page.
- :red_circle: **`dir="ltr"` en dur** — Un utilisateur arabe a toute la page en LTR, mise en page inversee incorrecte.
- :orange_circle: **Drag-and-drop factice** — Le texte dit "Glissez-deposez l'image ici" mais aucun handler `onDrop` n'existe. Promesse non tenue.
- :orange_circle: **Description marquee "requise" dans les 5 langues** — Les points rouges sur tous les onglets alors que le champ est optionnel.
- :orange_circle: **Pas de limite taille fichier** — Aucune validation cote client sur le poids de l'image.
- :yellow_circle: **Fallback "Saving..."/"Publication..."** — Langues melangees dans les fallbacks (EN vs FR).
- :yellow_circle: **Pas de confirmation si l'utilisateur quitte** — Donnees perdues sans avertissement.

**CE QUI FONCTIONNE BIEN :**
- :white_check_mark: Sections Cards bien separees avec icones
- :white_check_mark: Mode virtuel/presentiel avec affichage conditionnel
- :white_check_mark: Organisation absente = alerte rouge avec CTA "Creer une organisation"
- :white_check_mark: `aria-invalid` + `aria-describedby` sur la plupart des champs
- :white_check_mark: Scroll + focus vers le premier champ en erreur

**RECOMMANDATIONS PRIORITAIRES :**
1. Rendre `fieldErrors.lieu` en inline sous le `LieuSelector`
2. Passer `requiredLanguages={['fr','ar']}` sur le champ description (ou retirer le required du default)
3. Traduire les ~25 cles manquantes dans les fichiers EN/AR/TZ
4. Supprimer le `dir="ltr"` hardcode, utiliser `dir={isRTL ? 'rtl' : 'ltr'}` dynamiquement

---

### ═══════════════════════════════════════
### FORMULAIRE : Ajouter un Artisanat
### Page : `/ajouter-artisanat`
### Fichier : `frontEnd/src/pages/AjouterArtisanat.tsx`
### ═══════════════════════════════════════

**CLARTE : 5/10** — Titre et sous-titre clairs. Labels lisibles. Mais le champ `nom` affiche des points rouges sur les 5 onglets de langue alors que la validation accepte N'IMPORTE QUELLE langue (une seule suffit). L'utilisateur ne sait pas quoi remplir. Aucun helper text sur les champs prix.

**ORGANISATION : 6/10** — Layout 3 colonnes (2/3 form + 1/3 sidebar media) est bien. 3 Cards logiques (Infos, Prix, Tags). Mais pas de separateur clair entre champs optionnels et requis dans la section Prix.

**FEEDBACK : 4/10** — Validation au submit uniquement. Erreurs en **Alert in-page** (different de toast dans les autres forms — inconsistant). Le message d'erreur "Le nom est requis" ne precise pas quelle langue. L'erreur `nom` ne s'affiche que sur l'onglet FR du MultiLangInput. Aucune validation prix_min <= prix_max.

**ACTIONS : 4/10** — Un seul bouton "Creer l'artisanat". **Pas de brouillon, pas d'annuler.** Le bouton "Retour" fait `navigate(-1)` (historique navigateur) — impredictible. Apres succes : alert verte visible 2 secondes puis redirection — le formulaire reste interactif pendant ces 2 secondes.

**MULTILINGUE : 1/10** — **TOUTES les cles `ajouterArtisanat.*` sont absentes de TOUS les fichiers de traduction.** Le formulaire est 100% francais hardcode. Un utilisateur arabe ou anglais voit tout en francais. Zero support RTL (pas de `useRTL`, pas de `dir`). Placeholders "0.00" hardcodes.

**SCORE GLOBAL : 20/50**

**PROBLEMES :**
- :red_circle: **i18n completement cassee** — 0 cle traduite. Le formulaire est francais-only.
- :red_circle: **Zero RTL** — Ni `dir`, ni `useRTL()`. Un arabophone a une page inversee avec du texte francais.
- :red_circle: **Pas de bouton Annuler** — L'utilisateur ne peut pas annuler proprement.
- :orange_circle: **requiredLanguages par defaut (5)** mais validation accepte 1 — Les points rouges mentent.
- :orange_circle: **Pas de validation prix_min <= prix_max** — L'utilisateur peut saisir un prix min de 5000 et un max de 100 sans erreur.
- :orange_circle: **Succes = alert + delai 2s** — Formulaire interactif pendant le delai, l'utilisateur peut re-soumettre.
- :orange_circle: **Pas de limite upload** — Ni taille max, ni nombre max d'images.
- :yellow_circle: **Erreur edit mode hardcodee** — `'Artisanat introuvable'` et `'Erreur lors de la mise a jour'` en francais dans le code.
- :yellow_circle: **Pas de cache invalidation** — Le dashboard peut afficher des donnees perimees.

**CE QUI FONCTIONNE BIEN :**
- :white_check_mark: Layout 3 colonnes avec sidebar media
- :white_check_mark: Systeme de tags avec prevention des doublons
- :white_check_mark: Checkbox "Sur commande" cochee par defaut
- :white_check_mark: Loading spinner pendant le chargement metadata

**RECOMMANDATIONS PRIORITAIRES :**
1. Creer et traduire les cles `ajouterArtisanat.*` dans les 5 fichiers de traduction
2. Ajouter `useRTL()` + `dir` dynamique sur la page
3. Passer `requiredLanguages={[]}` ou `['fr']` sur le MultiLangInput `nom` pour correspondre a la validation
4. Ajouter validation prix_min <= prix_max
5. Ajouter un bouton "Annuler" qui redirige vers `/dashboard-pro`

---

### ═══════════════════════════════════════
### FORMULAIRE : Creer une Organisation
### Page : `/ajouter-organisation`
### Fichier : `frontEnd/src/pages/AjouterOrganisation.tsx`
### ═══════════════════════════════════════

**CLARTE : 6/10** — Titre, sous-titre et labels clairs. 4 champs seulement — formulaire simple. Le double label sur `nom` (un externe "Nom de l'organisation *" + un interne "Nom" dans le MultiLangInput) est une source de confusion legere.

**ORGANISATION : 8/10** — Formulaire simple, une seule Card, 4 champs. Ordre logique (nom > type > description > site web). `max-w-2xl` pour un formulaire centre et lisible.

**FEEDBACK : 5/10** — Validation au submit (toast + inline). Messages d'erreur clairs. Mais **si le chargement des types echoue, le dropdown reste vide sans aucune indication** (erreur logguee en console seulement). L'utilisateur ne comprend pas pourquoi il ne peut pas choisir un type.

**ACTIONS : 6/10** — "Annuler" + "Creer l'organisation" bien distingues (outline vs primary). Mais le label de loading est "Chargement..." (generique) au lieu de "Creation..." comme dans les autres forms. Redirection vers `/ajouter-evenement` apres succes (logique car l'orga est creee pour un evenement).

**MULTILINGUE : 1/10** — **TOUTES les cles `organisations.create.*` absentes de TOUS les fichiers.** 100% francais hardcode. `dir="ltr"` en dur. Le bouton submit a `mr-2` (pas RTL-safe) alors que le header utilise `rtlClasses.marginEnd()` — inconsistance dans le meme fichier.

**SCORE GLOBAL : 26/50**

**PROBLEMES :**
- :red_circle: **i18n completement cassee** — 0 cle traduite. Francais-only.
- :red_circle: **`dir="ltr"` hardcode** — Pas de RTL.
- :orange_circle: **Types non charges = dropdown vide sans explication** — L'utilisateur voit un select vide.
- :orange_circle: **Description marquee requise dans 5 langues** — `requiredLanguages` par defaut mais description optionnelle.
- :yellow_circle: **Loading label generique** — "Chargement..." au lieu de "Creation en cours..."
- :yellow_circle: **Pas de cache invalidation** — Dashboard affiche des donnees stale.

**CE QUI FONCTIONNE BIEN :**
- :white_check_mark: Formulaire simple et court (4 champs)
- :white_check_mark: `requiredLanguages={['fr','ar']}` correct sur le nom
- :white_check_mark: Bouton "Annuler" present
- :white_check_mark: `aria-invalid` + `aria-describedby` corrects

**RECOMMANDATIONS PRIORITAIRES :**
1. Creer les cles `organisations.create.*` dans les 5 fichiers de traduction
2. Ajouter un etat d'erreur visible quand les types ne se chargent pas
3. Passer `requiredLanguages={[]}` sur description ou retirer le composant MultiLangInput pour un textarea simple

---

### ═══════════════════════════════════════
### FORMULAIRE : Ajouter une Oeuvre
### Page : `/ajouter-oeuvre`
### Fichier : `frontEnd/src/pages/AjouterOeuvre.tsx`
### ═══════════════════════════════════════

**CLARTE : 6/10** — Titre et instructions clairs. Selection du type en boutons visuels (excellent pour Hick). Champs specifiques par type (livre, film, album...) bien adaptes. Mais `requiredLanguages` par defaut = tous les 5 onglets marques requis pour titre ET description alors que seul fr/ar est valide.

**ORGANISATION : 7/10** — Cards bien separees par section. Champs contextuels par type d'oeuvre (livre = ISBN, film = realisateur, etc.). Layout 2 colonnes pour les paires de champs. Mais formulaire TRES long (~20+ champs selon le type) sans stepper ni progression visible.

**FEEDBACK : 6/10** — Validation au submit avec **scroll + focus vers le premier champ en erreur** (bon). Erreurs inline avec `role="alert"` + `aria-live="assertive"` sur l'alert generale. Messages humains. Mais "Tout selectionner"/"Tout deselectionner" les categories est **hardcode en francais**.

**ACTIONS : 7/10** — "Sauvegarder comme brouillon" (outline) + "Publier l'oeuvre" (primary). Labels clairs. Mode editeur avance (article) disponible. Redirection apres 1500ms.

**MULTILINGUE : 3/10** — `requiredLanguages` par defaut (all 5) sur titre et description alors que seul fr/ar est valide. Plusieurs strings hardcoded : `"Tout selectionner"`, `"Fichier trop volumineux (max 100MB)"`, `"Impossible de charger les categories"`. Pas de RTL page-level.

**SCORE GLOBAL : 29/50**

**PROBLEMES :**
- :red_circle: **requiredLanguages all-5 mais validation fr/ar** — 3 onglets marquees "requis" a tort pour titre et description.
- :red_circle: **Strings FR hardcodes** — "Tout selectionner", "Fichier trop volumineux", erreurs de creation.
- :orange_circle: **Formulaire tres long sans stepper** — Risque d'abandon (loi de Hick : trop de choix = paralysie).
- :orange_circle: **Pas de limite de fichier visible** — Max 100MB mais affiche seulement en toast apres la tentative.
- :yellow_circle: **Pas de confirmation quitter** — Formulaire long, donnees perdues facilement.

**CE QUI FONCTIONNE BIEN :**
- :white_check_mark: Selection du type par boutons visuels avec icones (excellente affordance)
- :white_check_mark: Champs adaptatifs par type (livre, film, album, article...)
- :white_check_mark: Scroll + focus vers le premier champ en erreur
- :white_check_mark: Mode editeur avance pour les articles
- :white_check_mark: `aria-live="assertive"` sur l'alert d'erreur generale
- :white_check_mark: Autocomplete tags avec suggestions serveur

**RECOMMANDATIONS PRIORITAIRES :**
1. Passer `requiredLanguages={['fr','ar']}` sur titre et description
2. Traduire les strings hardcodes ("Tout selectionner", messages d'erreur fichier, etc.)
3. Envisager un stepper pour les types complexes (Livre = 15+ champs)
4. Afficher la limite de taille AVANT l'upload (helper text permanent)

---

### ═══════════════════════════════════════
### FORMULAIRE : Ajouter un Service Pro
### Page : `/ajouter-service-pro`
### Fichier : `frontEnd/src/pages/AjouterServicePro.tsx`
### ═══════════════════════════════════════

**CLARTE : 4/10** — En mode "nouveau lieu", l'utilisateur voit **DEUX champs latitude et DEUX champs longitude** (un set dans la card "nouveau lieu" avec *, un set en dehors sans *). Confusion garantie. L'icone AlertCircle pour supprimer la photo est semantiquement incorrecte (AlertCircle = avertissement, pas suppression). Le titre reste "Ajouter" meme en mode edition.

**ORGANISATION : 5/10** — 4 Cards verticales. Mais la section Localisation est confuse : un RadioGroup (lieu existant/nouveau) puis un separateur puis des champs adresse/GPS supplementaires qui semblent redondants. Les champs Contact et Tarif sont melanges dans la meme Card.

**FEEDBACK : 5/10** — Alert destructive en haut + inline par champ + scroll/focus au premier champ en erreur. Messages d'erreur humains (ex: "Le tarif minimum ne peut pas etre superieur au tarif maximum"). Mais **aucune des cles `service.errors.*` n'existe dans les fichiers de traduction** — seuls les fallbacks FR apparaissent.

**ACTIONS : 6/10** — "Annuler" (outline) + "Soumettre mon service" (vert emeraude). Info Alert ambree prevenant que le service sera valide par un admin (bon). Mais pas de brouillon possible.

**MULTILINGUE : 1/10** — **Tout le namespace `service.*` est absent des fichiers de traduction.** Formulaire 100% francais. `newLieu.nom` et `newLieu.adresse` ont `requiredLanguages` par defaut (5) mais validation ne verifie que fr/ar. Pas de `useRTL`. Search icon positionnee en `left-3` (casse en RTL). `space-x-2` au lieu de `gap-2` sur le RadioGroup.

**SCORE GLOBAL : 21/50**

**PROBLEMES :**
- :red_circle: **Double champs latitude/longitude** — En mode "nouveau lieu", 2 sets de GPS affiches. L'utilisateur ne sait pas lequel remplir.
- :red_circle: **i18n completement cassee** — 0 cle traduite. Francais-only.
- :red_circle: **Titre "Ajouter" en mode edition** — L'utilisateur pense creer un nouveau service alors qu'il modifie l'existant.
- :orange_circle: **newLieu.nom requiredLanguages=all-5** mais validation fr/ar — Points rouges trompeurs.
- :orange_circle: **Erreur tarif_max non affichee inline** — La validation `tarif_min > tarif_max` montre l'erreur sous `tarif_min` mais pas sous `tarif_max`.
- :orange_circle: **Photo upload silencieusement echoue** — Si l'upload photo echoue apres la creation du service, aucune erreur n'est montree.
- :yellow_circle: **Icone AlertCircle pour supprimer** — Semantique incorrecte (devrait etre X ou Trash).
- :yellow_circle: **Placeholder recherche lieu en `left-3`** — Icone mal placee en RTL.

**CE QUI FONCTIONNE BIEN :**
- :white_check_mark: Selection type par boutons visuels avec icones (7 types)
- :white_check_mark: Recherche lieu avec autocomplete
- :white_check_mark: Validation regex email, phone, URL
- :white_check_mark: `aria-invalid` + `aria-describedby` sur les champs erreur
- :white_check_mark: Alert ambree "service sera valide par un admin"
- :white_check_mark: Guard d'authentification avec message et lien login

**RECOMMANDATIONS PRIORITAIRES :**
1. Supprimer les champs latitude/longitude en double (garder seulement ceux dans la card "nouveau lieu")
2. Creer les cles `service.*` dans les 5 fichiers de traduction
3. Changer le titre en mode edition : "Modifier mon service"
4. Passer `requiredLanguages={['fr','ar']}` sur newLieu.nom et newLieu.adresse
5. Remplacer l'icone AlertCircle par X ou Trash2 pour la suppression photo

---

### ═══════════════════════════════════════
### FORMULAIRE : Ajouter un Patrimoine (Admin)
### Page : `/admin/patrimoine/ajouter`
### Fichier : `frontEnd/src/pages/admin/AjouterPatrimoine.tsx`
### ═══════════════════════════════════════

**CLARTE : 5/10** — 7 onglets offrent une bonne structure. Mais les messages d'erreur de validation (`validation.required`, `validation.fixErrors`) **affichent les cles i18n brutes** a l'ecran car elles n'existent pas dans les fichiers de traduction. Un admin voit `"validation.required"` comme message d'erreur. Les types de monument/vestige sont en francais hardcode.

**ORGANISATION : 7/10** — Structure en 7 onglets (Info, Details, Services, Programmes, Parcours, Medias, QR Code) avec compteurs. Barre de progression dans le header. Bouton Save toujours visible en haut. Mais pas d'avertissement si l'utilisateur change d'onglet avec des donnees non sauvegardees.

**FEEDBACK : 3/10** — **CRITIQUE** : `t('validation.required')` sans fallback affiche la cle brute `"validation.required"` comme message d'erreur. `t('validation.frOrArRequired')` affiche `"validation.frOrArRequired"` pour les champs nom/adresse (le fallback n'est pas garanti). Les toasts de succes (`patrimoine.createSuccess`) affichent aussi des cles brutes.

**ACTIONS : 6/10** — Bouton "Enregistrer" toujours visible dans le header (bonne loi de Fitts). Chaque onglet a des boutons "Ajouter" pour les sous-items. Mais pas de "Annuler" global ni de confirmation de sortie.

**MULTILINGUE : 2/10** — `nom` et `adresse` correctement `['fr','ar']`. Mais les sous-items (services, programmes, monuments, vestiges, parcours) n'exigent que `['fr']` — **inconsistance** : pourquoi l'arabe est requis pour le patrimoine mais pas pour ses sous-elements ? Types monument/vestige hardcodes en francais. `patrimoine.*` largement absent des fichiers de traduction. `mr-2` partout (pas RTL-safe).

**SCORE GLOBAL : 23/50**

**PROBLEMES :**
- :red_circle: **Cles i18n brutes affichees** — `"validation.required"`, `"validation.fixErrors"`, `"patrimoine.createSuccess"` affiches tel quel a l'utilisateur.
- :red_circle: **Types monument/vestige en francais hardcode** — "Mosquee", "Palais", "Ruines" non traduisibles.
- :red_circle: **Pas de RTL** — Ni `useRTL()`, ni `dir` dynamique. `mr-2` partout.
- :orange_circle: **"Glissez vos fichiers ici" sans drag-and-drop** — Comme AjouterEvenement, le texte promet du D&D qui n'existe pas.
- :orange_circle: **Sous-items requiredLanguages=['fr'] seulement** — Inconsistant avec le main form qui exige fr+ar.
- :orange_circle: **Pas d'avertissement donnees non sauvegardees** — L'utilisateur peut changer d'onglet ou quitter la page et tout perdre.
- :yellow_circle: **Description et histoire utilisent la meme cle i18n** — `patrimoine.description` sert de label pour la Card ET le champ.
- :yellow_circle: **Types patrimoine sans tz-ltn/tz-tfng** — Labels multilingues hardcodes seulement en fr/ar/en.

**CE QUI FONCTIONNE BIEN :**
- :white_check_mark: Structure en 7 onglets avec compteurs
- :white_check_mark: Barre de progression visible
- :white_check_mark: Bouton Save toujours accessible en haut
- :white_check_mark: Dialogs modales pour les sous-items (moins de surcharge cognitive)
- :white_check_mark: Titre change entre "Ajouter" et "Modifier" selon le mode
- :white_check_mark: QR Code auto-genere avec instructions d'utilisation

**RECOMMANDATIONS PRIORITAIRES :**
1. Ajouter des fallbacks FRANCAIS a TOUS les `t('validation.xxx')` : `t('validation.required', 'Ce champ est requis')`
2. Creer le namespace `patrimoine.*` dans les 5 fichiers de traduction
3. Traduire les types monument/vestige via i18n au lieu de strings hardcodes
4. Ajouter un avertissement avant de quitter si des modifications non sauvegardees existent
5. Harmoniser `requiredLanguages` : sous-items devraient aussi etre `['fr','ar']`

---

### ═══════════════════════════════════════
### FORMULAIRE : Ajouter un Patrimoine (Pro)
### Page : `/ajouter-patrimoine-pro`
### Fichier : `frontEnd/src/pages/AjouterPatrimoinePro.tsx`
### ═══════════════════════════════════════

**CLARTE : 7/10** — Titre clair avec icone. Labels lisibles. `requiredLanguages={['fr','ar']}` correct sur nom. Champs requis marques " *". Helper text sous le type patrimoine expliquant l'impact du choix. Bonne description dans la Card localisation.

**ORGANISATION : 8/10** — Layout 3 colonnes (2 form + 1 sidebar media/submit). 3 Cards bien separees (Infos, Localisation, Statut). Sidebar avec upload + bouton submit. Responsive `lg:col-span-2`.

**FEEDBACK : 6/10** — Validation au submit. Erreurs inline avec `role="alert"` + `aria-live="assertive"`. Scroll + focus vers le premier champ en erreur via refs (bon). Messages d'erreur clairs. Mais erreurs uniquement au submit — pas de onBlur.

**ACTIONS : 7/10** — "Retour" (ghost) + "Enregistrer" (primary, full-width, `size="lg"`). Loading = "Enregistrement en cours..." avec spinner. Bonne distinction visuelle.

**MULTILINGUE : 5/10** — `requiredLanguages={['fr','ar']}` correct sur nom. Cles bien structurees avec fallbacks. Utilise `me-2` (RTL-safe) au lieu de `mr-2` sur les icones — **meilleur formulaire pour RTL**. Mais `description` a `requiredLanguages` par defaut (5 langues). Options type/epoque/statut/classement traduites via i18n.

**SCORE GLOBAL : 33/50**

**PROBLEMES :**
- :orange_circle: **Description requiredLanguages=all-5** mais non requise — Points rouges trompeurs.
- :orange_circle: **Pas de validation taille fichier media** — Aucune limite cote client pour les images.
- :orange_circle: **Echec upload media silencieux** — Si l'upload echoue, pas d'erreur (catch block vide).
- :yellow_circle: **Validation uniquement au submit** — Pas de onBlur.
- :yellow_circle: **Suspense fallback basique** — Skeleton `animate-pulse` sans texte explicatif pour le LieuSelector.

**CE QUI FONCTIONNE BIEN :**
- :white_check_mark: **Meilleur support RTL** — Utilise `me-2` au lieu de `mr-2`
- :white_check_mark: `requiredLanguages={['fr','ar']}` correct sur nom
- :white_check_mark: `aria-live="assertive"` sur l'alert d'erreur
- :white_check_mark: Scroll + focus via refs vers le premier champ en erreur
- :white_check_mark: Helper text sous le type patrimoine
- :white_check_mark: Card Localisation avec description utile
- :white_check_mark: Layout 3 colonnes avec sidebar coherente
- :white_check_mark: Toutes les options de type/epoque/statut passees par i18n

**RECOMMANDATIONS PRIORITAIRES :**
1. Passer `requiredLanguages={['fr','ar']}` sur description ou retirer le required par defaut
2. Ajouter validation taille fichier (ex: max 10 MB) avec message avant l'upload
3. Gerer l'echec upload media avec un toast d'erreur

---

### ═══════════════════════════════════════
### FORMULAIRE : Connexion
### Page : `/auth` (onglet Connexion)
### Fichier : `frontEnd/src/pages/Auth.tsx`
### ═══════════════════════════════════════

**CLARTE : 7/10** — 2 champs seulement (email, password). Labels clairs avec icones. Lien "Mot de passe oublie" bien place. Placeholder "........" pour le mot de passe est inhabituel mais acceptable.

**ORGANISATION : 8/10** — Formulaire minimal dans une Card. Tabs Connexion/Inscription bien visibles avec icones. `max-w-md` centre.

**FEEDBACK : 6/10** — Validation au submit avec scroll/focus vers le premier champ. Messages d'erreur backend traduits (invalid credentials, account suspended, email not verified). Distinction semantique des erreurs (toast destructive pour echec login).

**ACTIONS : 7/10** — "Se connecter" (primary) avec icone LogIn. Loading = "Connexion en cours..." Lien "Mot de passe oublie" visible. Redirection automatique si deja authentifie.

**MULTILINGUE : 4/10** — Cles `auth.login.*` presentes dans les traductions. Mais **TOUS les `mr-2` sur les icones** ne sont pas RTL-safe. Pas de `dir` dynamique.

**SCORE GLOBAL : 32/50**

**PROBLEMES :**
- :orange_circle: **`mr-2` partout** — Icones mal espacees en RTL.
- :yellow_circle: **Pas de show/hide password** — Le formulaire login n'a pas de toggle visibilite (ResetPassword en a un, pas login).
- :yellow_circle: **Placeholder "........"** — Inhabituel, pourrait etre "Votre mot de passe".

**CE QUI FONCTIONNE BIEN :**
- :white_check_mark: Formulaire minimal, rapide a completer
- :white_check_mark: Erreurs backend semantiques (compte suspendu, email non verifie)
- :white_check_mark: Tabs Connexion/Inscription clairs
- :white_check_mark: Redirect si deja authentifie
- :white_check_mark: `autoComplete` correct sur email et password

**RECOMMANDATIONS PRIORITAIRES :**
1. Remplacer `mr-2` par `me-2` sur toutes les icones
2. Ajouter un toggle show/hide password
3. Remplacer placeholder "........" par un texte descriptif

---

### ═══════════════════════════════════════
### FORMULAIRE : Inscription
### Page : `/auth` (onglet Inscription)
### Fichier : `frontEnd/src/pages/Auth.tsx`
### ═══════════════════════════════════════

**CLARTE : 6/10** — Champs bien labelises avec " *" pour les requis. Choix visiteur/professionnel en boutons visuels (bonne affordance). Mais **aucun indicateur de force du mot de passe** malgre des regles complexes (12 chars, majuscule, minuscule, chiffre, special). L'utilisateur decouvre les regles UNE PAR UNE au submit. Pas de helper text sur le champ password expliquant les regles.

**ORGANISATION : 6/10** — Grid 2 colonnes pour paires (nom/prenom, password/confirm, wilaya/telephone). Section pro conditionnelle dans une box coloree. Mais **formulaire long** (~12 champs visiteur, ~15 pro) sur une seule page sans stepper.

**FEEDBACK : 5/10** — Validation au submit UNIQUEMENT. Les regles mot de passe sont verifiees **sequentiellement** — l'utilisateur ne voit que la PREMIERE erreur, pas toutes. Pas de barre de force. Pas de validation temps reel sur l'email (doublons detectes seulement au submit).

**ACTIONS : 6/10** — "Creer mon compte" (primary). Distinction visiteur/pro claire. Mais pas de "retour a la connexion" evident dans la meme vue (faut changer d'onglet).

**MULTILINGUE : 3/10** — Cles `auth.register.*` presentes. Mais **il existe DEUX formulaires d'inscription** (`Auth.tsx` et `RegisterForm.tsx`) avec des **namespaces i18n differents**, des **validations differentes**, et des **messages de succes contradictoires** ("Bienvenue !" vs "Verifiez votre email"). `mr-2` partout. Pas de `dir`.

**SCORE GLOBAL : 26/50**

**PROBLEMES :**
- :red_circle: **Pas d'indicateur de force mot de passe** — 5 regles complexes decouvertes une par une au submit. Frustrant.
- :red_circle: **DEUX formulaires inscription** coexistent — `Auth.tsx` et `RegisterForm.tsx` avec regles et messages differents. Lequel est utilise ? Confusion.
- :orange_circle: **Regles password pas expliquees** — Aucun helper text AVANT la saisie. L'utilisateur decouvre "12 caracteres minimum" apres avoir tape "monmotdepasse".
- :orange_circle: **Messages succes contradictoires** — Auth.tsx : "Bienvenue !" / RegisterForm.tsx : "Verifiez votre email". Lequel est vrai ?
- :orange_circle: **`mr-2` partout** — RTL casse.
- :orange_circle: **Secteurs hardcodes en FR** dans RegisterForm.tsx — "Artiste", "Musicien", "Cineaste" non traduisibles.
- :yellow_circle: **Formulaire long sans stepper** — 15 champs pour un pro.
- :yellow_circle: **Date naissance sans date picker** — `type=date` natif (experience variable selon navigateur/mobile).

**CE QUI FONCTIONNE BIEN :**
- :white_check_mark: Choix visiteur/professionnel en cards visuelles
- :white_check_mark: Section pro conditionnelle bien delimitee
- :white_check_mark: Upload photo avec preview et taille max 5MB
- :white_check_mark: Helper text biographie "X/500 caracteres"
- :white_check_mark: Alert ambree "compte pro valide par admin"
- :white_check_mark: `autoComplete` correct sur tous les champs

**RECOMMANDATIONS PRIORITAIRES :**
1. Ajouter un indicateur de force du mot de passe (barre visuelle + checklist des 5 regles)
2. **Supprimer l'un des deux formulaires d'inscription** ou les fusionner
3. Ajouter un helper text permanent sous le champ password : "12 caracteres min., 1 majuscule, 1 minuscule, 1 chiffre, 1 special"
4. Remplacer `mr-2` par `me-2` partout

---

### ═══════════════════════════════════════
### FORMULAIRE : Mot de passe oublie
### Page : `/forgot-password`
### Fichier : `frontEnd/src/pages/ForgotPassword.tsx`
### ═══════════════════════════════════════

**CLARTE : 8/10** — Un seul champ (email). Titre avec icone. Description expliquant la procedure. Ecran de succes separee avec instructions claires ("Verifiez vos spams").

**ORGANISATION : 9/10** — Formulaire minimaliste. Un champ, un bouton. `max-w-md` centre. Parfait.

**FEEDBACK : 7/10** — **Securite exemplaire** : toujours affiche le succes meme si l'email n'existe pas (ne revele pas l'existence du compte). Messages d'erreur traduits. Alert info bleue "Verifiez vos spams". Bouton "Renvoyer" visible.

**ACTIONS : 8/10** — "Envoyer" (primary, full-width). "Retour a la connexion" (lien avec ArrowLeft). Loading = "Envoi en cours..." Input desactive pendant l'envoi.

**MULTILINGUE : 4/10** — Cles `auth.forgotPassword.*` presentes. Mais `mr-2` sur les icones (pas RTL). Messages d'erreur email sans fallback (dependent 100% des fichiers de traduction).

**SCORE GLOBAL : 36/50** — **Meilleur formulaire du projet.**

**PROBLEMES :**
- :orange_circle: **`mr-2` pas RTL-safe** — Icones mal espacees en arabe.
- :yellow_circle: **Pas de fallback sur les erreurs email** — Si la cle manque, l'erreur est vide.

**CE QUI FONCTIONNE BIEN :**
- :white_check_mark: **Securite anti-enumeration** — Toujours montre le succes
- :white_check_mark: Ecran de succes separe avec instructions
- :white_check_mark: "Verifiez vos spams" en alert info
- :white_check_mark: Bouton "Renvoyer" + retour connexion
- :white_check_mark: Input desactive pendant l'envoi
- :white_check_mark: Formulaire minimaliste et clair

**RECOMMANDATIONS PRIORITAIRES :**
1. Remplacer `mr-2` par `me-2`
2. Ajouter des fallbacks FR aux cles d'erreur : `t('auth.errors.emailRequired', 'L\'email est requis')`

---

### ═══════════════════════════════════════
### FORMULAIRE : Reinitialiser le mot de passe
### Page : `/reset-password`
### Fichier : `frontEnd/src/pages/ResetPassword.tsx`
### ═══════════════════════════════════════

**CLARTE : 7/10** — 2 champs (nouveau password + confirmation). Toggle show/hide. Helper text `t('auth.resetPassword.passwordHint')` sous le premier champ (mieux que l'inscription !). Ecran token invalide avec CTA.

**ORGANISATION : 9/10** — Deux champs, un bouton. `max-w-md` centre. Simple et efficace.

**FEEDBACK : 6/10** — Memes regles password que l'inscription mais au moins le helper text explique les attentes. Erreurs inline. Ecran succes avec "Redirection en cours..." + auto-redirect 3s. Mais **les boutons toggle password n'ont pas d'`aria-label`** — inaccessible au screen reader.

**ACTIONS : 7/10** — "Reinitialiser" (primary, full-width). "Retour a la connexion" (lien). Ecran succes avec redirection auto 3s. Ecran token invalide avec "Demander un nouveau lien".

**MULTILINGUE : 4/10** — Cles `auth.resetPassword.*` presentes. Mais `mr-2` (pas RTL). Certaines cles d'erreur sans fallback (`passwordRequired`, `confirmPasswordRequired`, `passwordMismatch`).

**SCORE GLOBAL : 33/50**

**PROBLEMES :**
- :orange_circle: **Toggle password sans `aria-label`** — Inaccessible pour les lecteurs d'ecran.
- :orange_circle: **`mr-2` pas RTL-safe**.
- :yellow_circle: **Certaines cles sans fallback** — `passwordRequired`, `confirmPasswordRequired` sans default.
- :yellow_circle: **Pas de barre de force password** — Meme si le helper text existe, une barre visuelle serait meilleure.

**CE QUI FONCTIONNE BIEN :**
- :white_check_mark: Toggle show/hide password (Eye/EyeOff)
- :white_check_mark: Helper text expliquant les regles
- :white_check_mark: Ecran token invalide avec CTA
- :white_check_mark: Auto-redirect 3s apres succes avec message "Redirection..."
- :white_check_mark: Inputs desactives pendant le loading

**RECOMMANDATIONS PRIORITAIRES :**
1. Ajouter `aria-label={t('auth.togglePassword', 'Afficher/masquer le mot de passe')}` sur les toggles
2. Remplacer `mr-2` par `me-2`
3. Ajouter des fallbacks aux cles d'erreur manquantes

---

## Problemes transversaux

### 1. i18n systematiquement cassee

| Formulaire | Cles traduites | Impact |
|---|---|---|
| AjouterEvenement | Partiellement (~60%) | EN affiche des cles brutes, AR recoit des erreurs en FR |
| AjouterArtisanat | **0%** | 100% francais pour tous les utilisateurs |
| AjouterOrganisation | **0%** | 100% francais pour tous les utilisateurs |
| AjouterOeuvre | ~70% | Strings hardcodes FR restants |
| AjouterServicePro | **0%** | 100% francais pour tous les utilisateurs |
| AjouterPatrimoine (admin) | ~20% | Cles brutes affichees (`validation.required`) |
| AjouterPatrimoinePro | ~80% | Meilleur form |
| Auth | ~75% | 2 forms avec namespaces differents |

### 2. RTL non fonctionnel

| Pattern | Occurrences | Impact |
|---|---|---|
| `dir="ltr"` hardcode | AjouterEvenement, AjouterOrganisation | Page entiere en LTR |
| `mr-2` au lieu de `me-2` | Auth, RegisterForm, ForgotPassword, ResetPassword, AjouterPatrimoine, AjouterServicePro | Icones mal espacees en RTL |
| `space-x-2` au lieu de `gap-2` | AjouterServicePro RadioGroup | RadioGroup mal aligne en RTL |
| `left-3` au lieu de `start-3` | AjouterServicePro search icon | Icone invisible en RTL |
| Pas de `useRTL()` | AjouterArtisanat, AjouterServicePro, AjouterPatrimoine | Aucune adaptation RTL |

**Seul AjouterPatrimoinePro utilise correctement `me-2`.**

### 3. Validation seulement au submit

**AUCUN formulaire ne valide en temps reel (onBlur).** Tous attendent le clic "Submit" pour montrer les erreurs. C'est une regression UX majeure — les bonnes pratiques (Nielsen Heuristic #1: Visibility of system status) recommandent un feedback immediat.

### 4. MultiLangInput requiredLanguages incoherent

| Formulaire | Champ | requiredLanguages | Validation reelle | Coherent ? |
|---|---|---|---|---|
| Evenement | nom | `['fr','ar']` | fr OR ar | :white_check_mark: |
| Evenement | description | all 5 (defaut) | Non validee | :red_circle: |
| Artisanat | nom | all 5 (defaut) | N'importe quelle langue | :red_circle: |
| Artisanat | description | all 5 (defaut) | Non validee | :red_circle: |
| Organisation | nom | `['fr','ar']` | fr OR ar | :white_check_mark: |
| Organisation | description | all 5 (defaut) | Non validee | :red_circle: |
| Oeuvre | titre | all 5 (defaut) | fr OR ar | :red_circle: |
| Oeuvre | description | all 5 (defaut) | fr OR ar | :red_circle: |
| ServicePro | nom | `['fr','ar']` | fr OR ar | :white_check_mark: |
| ServicePro | newLieu.nom | all 5 (defaut) | fr OR ar | :red_circle: |
| Patrimoine | nom | `['fr','ar']` | fr OR ar | :white_check_mark: |
| PatrimoinePro | nom | `['fr','ar']` | fr OR ar | :white_check_mark: |

**9 champs sur 12 ont des indicateurs visuels trompeurs.**

### 5. Pas de protection contre la perte de donnees

**AUCUN formulaire n'avertit l'utilisateur s'il quitte avec des donnees non sauvegardees.** C'est critique pour les formulaires longs (Oeuvre, ServicePro, Patrimoine) ou l'utilisateur peut avoir passe 10+ minutes a remplir.

### 6. Drag-and-drop fictif

AjouterEvenement et AjouterPatrimoine affichent "Glissez-deposez vos fichiers ici" mais **aucun handler `onDrop` n'est implemente**. Le texte promet une fonctionnalite qui n'existe pas.

---

## Matrice de priorite

### Impact eleve + Effort faible (Quick wins)

| # | Action | Formulaires | Effort |
|---|---|---|---|
| 1 | Remplacer `mr-2` par `me-2` sur toutes les icones | Tous sauf PatrimoinePro | 1h |
| 2 | Supprimer `dir="ltr"` hardcode, utiliser `dir` dynamique | Evenement, Organisation | 30min |
| 3 | Passer `requiredLanguages={['fr','ar']}` sur TOUS les MultiLangInput non-optionnels | 6 formulaires | 1h |
| 4 | Retirer `requiredLanguages` (passer `[]`) sur les champs optionnels (description) | 6 formulaires | 30min |
| 5 | Ajouter fallback FR a TOUS les `t()` sans default | Patrimoine admin | 1h |
| 6 | Rendre `fieldErrors.lieu` inline dans AjouterEvenement | Evenement | 15min |

### Impact eleve + Effort moyen

| # | Action | Effort |
|---|---|---|
| 7 | Creer les namespaces i18n manquants (artisanat, organisation, service) dans les 5 fichiers | 4h |
| 8 | Ajouter indicateur de force password (barre + checklist) | 2h |
| 9 | Supprimer les champs GPS en double dans AjouterServicePro | 1h |
| 10 | Ajouter `beforeunload` warning sur les formulaires longs | 2h |
| 11 | Fusionner ou supprimer le double formulaire d'inscription | 3h |

### Impact moyen + Effort moyen

| # | Action | Effort |
|---|---|---|
| 12 | Implementer validation onBlur sur les champs critiques (email, password, nom) | 4h |
| 13 | Ajouter helper text password sur le formulaire inscription | 30min |
| 14 | Implementer le drag-and-drop reel ou retirer le texte prometteur | 3h |
| 15 | Ajouter validation taille fichier cote client sur tous les uploads | 2h |
| 16 | Uniformiser error handling (toast vs alert in-page) sur tous les formulaires | 3h |

---

## Plan d'action recommande

### Sprint 1 — Quick wins critiques (1-2 jours)

- [ ] #1 — `mr-2` -> `me-2` partout
- [ ] #2 — Supprimer `dir="ltr"` hardcode
- [ ] #3 + #4 — Corriger `requiredLanguages` sur tous les MultiLangInput
- [ ] #5 — Ajouter fallbacks FR aux `t()` sans default
- [ ] #6 — Rendre `fieldErrors.lieu` inline

### Sprint 2 — i18n et coherence (3-4 jours)

- [ ] #7 — Creer les namespaces i18n manquants dans les 5 fichiers
- [ ] #9 — Supprimer GPS en double ServicePro
- [ ] #11 — Fusionner les formulaires d'inscription
- [ ] #16 — Uniformiser error handling (choisir toast partout ou alert partout)

### Sprint 3 — UX avancee (3-4 jours)

- [ ] #8 — Indicateur de force password
- [ ] #10 — `beforeunload` warning
- [ ] #12 — Validation onBlur
- [ ] #13 — Helper text password inscription
- [ ] #14 — Drag-and-drop reel
- [ ] #15 — Validation taille fichier
