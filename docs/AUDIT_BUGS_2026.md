# Audit des Bugs - Action Culture (Avril 2026)

> Audit complet du projet backend + frontend. Classement par **priorite** (Critique > Majeur > Mineur).

---

## RESUME EXECUTIF

| Priorite | Nombre | Impact |
|----------|--------|--------|
| Critique | 5 | Crash, securite, perte de donnees |
| Majeur | 8 | Fonctionnalite cassee, UX degradee |
| Mineur | 7 | Code smell, performance, maintenance |

---

## BUGS CRITIQUES (a traiter immediatement)

### BUG-01: Logout re-instancie authMiddleware a chaque appel
- **Fichier**: `backend/controllers/userController.js:104`
- **Probleme**: `require('../middlewares/authMiddleware')(require('../models'))` cree une **nouvelle instance** du middleware auth a chaque logout. Cela bypass le singleton et cree des connexions Redis parasites.
- **Impact**: Fuite memoire, performance degradee, Redis sature.
- **Solution**:
```js
// AVANT (bug):
const authMw = require('../middlewares/authMiddleware')(require('../models'));
await authMw.invalidateUserCache(req.user.id_user).catch(() => {});

// APRES (fix):
// Utiliser le authMiddleware deja injecte via les routes ou exposer invalidateUserCache
// depuis le userService directement
await this.userService.invalidateUserCache(req.user.id_user).catch(() => {});
```

---

### BUG-02: XSS regex sanitisation contournable (multi-line)
- **Fichier**: `backend/middlewares/securityMiddleware.js:47-52`
- **Probleme**: Les regex de sanitisation utilisent le flag `gi` mais PAS le flag `s` (dotAll). Un payload multi-ligne comme `<script>\nalert(1)\n</script>` passe au travers car `.` ne matche pas `\n` par defaut.
- **Impact**: Vulnerabilite XSS stockee.
- **Solution**:
```js
// Ajouter le flag 's' (dotAll) ou utiliser [\s\S]* au lieu de .*
.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
.replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
```

---

### BUG-03: isValidUrl rejette les URLs Cloudinary valides
- **Fichier**: `backend/middlewares/securityMiddleware.js:27`
- **Probleme**: `str.includes('//')` retourne `true` pour **toutes** les URLs (`https://...`) ce qui les fait echouer la validation. Les URLs Cloudinary et les images externes sont donc sanitisees/tronquees.
- **Impact**: Les champs `photo_url`, `image_url` etc. contenant des URLs Cloudinary sont corrompus.
- **Solution**:
```js
const isValidUrl = (str) => {
  // Path traversal seulement (pas //)
  if (str.includes('..')) {
    return false;
  }
  // Verifier contre les patterns autorises
  return URL_PATTERNS.uploads.test(str) || 
         URL_PATTERNS.external.test(str); // Toujours verifier external
};
```

---

### BUG-04: Redis `set` avec mauvaise syntaxe dans AccountRateLimiter
- **Fichier**: `backend/middlewares/rateLimitMiddleware.js:297`
- **Probleme**: `await this.redis.set('lockout:key', data, 'PX', duration)` utilise la syntaxe ioredis, mais le projet utilise `redis@5.x` (node-redis) qui attend `redis.set(key, value, { PX: duration })`.
- **Impact**: Le lockout de compte apres tentatives echouees **ne fonctionne pas** avec Redis. Seul le fallback memoire local fonctionne.
- **Solution**:
```js
async _setAttempts(key, data) {
  if (this.redis) {
    try {
      await this.redis.set(`lockout:${key}`, JSON.stringify(data), { PX: this.lockoutDuration });
      return;
    } catch { /* fallback to local */ }
  }
  this.localStore.set(key, data);
}
```

---

### BUG-05: Double Content-Type force sur toutes les reponses API
- **Fichier**: `backend/app.js:179`
- **Probleme**: `res.set('Content-Type', 'application/json; charset=utf-8')` est applique a TOUTES les requetes `/api/*` y compris les uploads de fichiers qui retournent du multipart et les streams binaires.
- **Impact**: Les reponses non-JSON (export CSV, PDF, fichiers) sont corrompues.
- **Solution**:
```js
// Seulement definir Vary, pas Content-Type (Express le gere deja pour res.json())
this.app.use('/api', (req, res, next) => {
  res.set('Vary', 'Accept-Encoding, Accept-Language');
  if (req.method !== 'GET') {
    res.set('Cache-Control', 'no-store');
  }
  next();
});
```

---

## BUGS MAJEURS (a traiter rapidement)

### BUG-06: useEffect avec dependances manquantes (useDashboardPro)
- **Fichier**: `frontEnd/src/hooks/useDashboardPro.ts:77-85`
- **Probleme**: Le `useEffect` qui affiche le toast d'erreur depend de `toast` et `t` mais `t` n'est pas dans le dependency array. Risque de stale closure.
- **Solution**: Ajouter `t` au dependency array:
```ts
}, [errorOeuvres, toast, t]);
```
- **Meme probleme a la ligne 143-151**.

---

### BUG-07: useAdminStats retourne `activityData?.activities` au lieu de `activityData?.items`
- **Fichier**: `frontEnd/src/hooks/useAdmin.ts:247`
- **Probleme**: La queryFn (ligne 183) retourne `response.data` qui contient `items`, mais le return (ligne 247) accede a `activityData?.activities` qui est toujours `undefined`.
- **Impact**: L'activite recente du dashboard admin est toujours vide.
- **Solution**:
```ts
recentActivity: (activityData?.items || []) as Activity[],
```

---

### BUG-08: refreshAll dans useAdminStats depend de `t` manquant
- **Fichier**: `frontEnd/src/hooks/useAdmin.ts:234-241`
- **Probleme**: `refreshAll` utilise `t('toasts.dataRefreshed')` mais `t` n'est pas dans le dependency array.
- **Solution**: Ajouter `t` aux dependances du useCallback.

---

### BUG-09: deleteItem dans useDashboardPro a des dependances incorrectes
- **Fichier**: `frontEnd/src/hooks/useDashboardPro.ts:380`
- **Probleme**: Le `useCallback` liste `refetchOeuvres, refetchEvenements...` mais utilise aussi `queryClient` et `t` qui ne sont PAS dans le dependency array.
- **Impact**: Stale closures — les toasts pourraient utiliser d'anciennes traductions ou le mauvais queryClient.
- **Solution**: Ajouter `queryClient, t` au dependency array.

---

### BUG-10: Middleware de log dev monte APRES express.static
- **Fichier**: `backend/app.js:239-244`
- **Probleme**: Le middleware de log des acces aux fichiers (`this.app.use('/uploads', ...)`) est monte APRES `express.static('/uploads')` (ligne 236). express.static repond directement, donc le middleware de log n'est jamais atteint.
- **Impact**: Pas de logs d'acces aux fichiers en dev (silencieux).
- **Solution**: Deplacer le middleware de log AVANT express.static:
```js
// Logger AVANT static
if (this.config.server.environment === 'development') {
  this.app.use('/uploads', (req, res, next) => {
    console.log(`Acces fichier: ${req.path}`);
    next();
  });
}
// Ensuite static
this.app.use('/uploads', express.static(...));
```

---

### BUG-11: `useArtisanat` useEffect ne depend pas de `loadArtisanats`
- **Fichier**: `frontEnd/src/hooks/useArtisanat.ts:226-231`
- **Probleme**: Le useEffect appelle `loadArtisanats()` au mount mais ne re-execute pas quand `sortBy` change (car `loadArtisanats` est un useCallback qui depend de `sortBy`).
- **Impact**: Le tri ne se rafraichit pas automatiquement via l'API. Le filtrage local fonctionne mais les donnees ne sont pas retriees cote serveur.
- **Solution**:
```ts
useEffect(() => {
  loadArtisanats();
}, [loadArtisanats]); // Ajout de la dependance

// Separer le chargement initial des metadata (une seule fois)
useEffect(() => {
  loadMateriaux();
  loadTechniques();
  loadStatistics();
}, []);
```

---

### BUG-12: Sequelize.literal avec des valeurs fixes mais pattern fragile
- **Fichier**: `backend/controllers/patrimoineController.js:104-105`
- **Probleme**: `Sequelize.literal("'$.fr'")` et `"'$.ar'"` — bien que les valeurs soient hardcodees (pas de SQL injection directe), ce pattern est fragile et pourrait devenir une faille si modifie sans attention.
- **Impact**: Risque faible pour l'instant, mais dette technique.
- **Solution**: Utiliser des bindings parametres ou au minimum documenter clairement.

---

### BUG-13: `useDashboardAdmin` useEffect depend de `activeTab` mais pas des fonctions de chargement
- **Fichier**: `frontEnd/src/hooks/useDashboardAdmin.ts:106-137`
- **Probleme**: Les fonctions `loadOverview`, `loadStats`, etc. sont definies comme fonctions simples (pas useCallback), elles sont recreees a chaque render. Le useEffect ne depend que de `activeTab`, donc les fonctions utilisent une closure potentiellement stale.
- **Impact**: Apres un changement de `selectedPeriod`, le loadStats utilise toujours l'ancienne valeur.
- **Solution**: Convertir `loadStats` en useCallback avec `selectedPeriod` en dependance, ou passer la periode en argument.

---

## BUGS MINEURS (a planifier)

### BUG-14: `loadStatistics` catch vide
- **Fichier**: `frontEnd/src/hooks/useArtisanat.ts:101-102`
- **Probleme**: `catch (error) {}` — erreur silencieuse sans aucun traitement.
- **Solution**: Au minimum logger l'erreur ou afficher un fallback.

---

### BUG-15: Module `appInstance` exporte un Express app non initialisee
- **Fichier**: `backend/app.js:815`
- **Probleme**: `module.exports.appInstance = new App().app` cree une instance Express sans appeler `initialize()`. L'app n'a ni middleware, ni routes, ni DB.
- **Impact**: Si un test importe `appInstance`, il obtient une coquille vide.
- **Solution**: Supprimer cette ligne ou la remplacer par un helper de test:
```js
module.exports.createTestApp = async () => {
  const app = new App();
  await app.initialize();
  return app;
};
```

---

### BUG-16: `rateLimitMiddleware.creation` est un array mais utilise comme spread
- **Fichier**: `backend/app.js:456` vs `backend/middlewares/rateLimitMiddleware.js:404`
- **Probleme**: `rateLimitMiddleware.creation` exporte `[createContentLimiter]` (array d'un seul element), et `app.js` fait `...rateLimitMiddleware.creation`. Ca fonctionne mais c'est inutilement complexe. `general` est aussi `[globalLimiter]`.
- **Impact**: Aucun bug direct, mais confusion de maintenance.
- **Solution**: Simplifier en exportant directement le middleware ou documenter pourquoi c'est un array.

---

### BUG-17: requestHistory dans ImprovedRequestQueue grandit indefiniment en theorie
- **Fichier**: `frontEnd/src/services/httpClient.ts:69`
- **Probleme**: `requestHistory` est nettoye dans `calculateAdaptiveDelay()` mais cette methode n'est appelee que quand la queue traite. Si la queue est inactive pendant longtemps puis redemarre, l'historique peut contenir des entrees perimees.
- **Impact**: Negligeable en pratique, mais fuite memoire theorique.
- **Solution**: Ajouter un nettoyage periodique ou limiter la taille du tableau.

---

### BUG-18: `loadStats` catch vide dans useDashboardAdmin
- **Fichier**: `frontEnd/src/hooks/useDashboardAdmin.ts:169-170`
- **Probleme**: `catch (error) {}` — erreur completement silencieuse.
- **Solution**: Logger ou afficher un feedback utilisateur.

---

### BUG-19: Pas de validation ID dans certains controllers
- **Fichier**: Plusieurs controllers (87 occurrences de `parseInt(req.params...`)
- **Probleme**: `parseInt(req.params.id)` retourne `NaN` si l'ID n'est pas numerique. Pas de validation systematique avant la requete DB.
- **Impact**: Erreur Sequelize au lieu d'un 400 propre.
- **Solution**: Utiliser `validationMiddleware.validateId()` de maniere systematique dans les routes, ou valider dans les controllers:
```js
const id = parseInt(req.params.id, 10);
if (isNaN(id)) return res.status(400).json({ success: false, error: 'ID invalide' });
```

---

### BUG-20: `loadPatrimoineStats` et `loadStats` n'affichent pas les erreurs
- **Fichier**: `frontEnd/src/hooks/useDashboardAdmin.ts:173-181`
- **Probleme**: Catch vide, l'utilisateur ne sait pas si les stats ont echoue.
- **Solution**: Ajouter un `setError` ou un toast.

---

## PLAN DE TRAITEMENT RECOMMANDE

### Phase 1 — Securite (cette semaine)
1. **BUG-02**: Fix XSS regex (ajouter `[\s\S]*?`) — 5 min
2. **BUG-03**: Fix `isValidUrl` pour Cloudinary — 10 min
3. **BUG-04**: Fix Redis `set` syntaxe pour account lockout — 5 min

### Phase 2 — Bugs critiques (cette semaine)
4. **BUG-01**: Refactorer logout pour ne pas re-instancier authMiddleware — 20 min
5. **BUG-05**: Supprimer le `Content-Type` force sur `/api` — 5 min

### Phase 3 — Bugs majeurs frontend (semaine prochaine)
6. **BUG-07**: Fix `activities` → `items` dans useAdmin — 2 min
7. **BUG-06, BUG-08, BUG-09**: Fix dependency arrays — 15 min
8. **BUG-10**: Reordonner middleware uploads dev log — 5 min
9. **BUG-11**: Fix useArtisanat dependencies — 10 min
10. **BUG-13**: Fix useDashboardAdmin stale closures — 15 min

### Phase 4 — Nettoyage (a planifier)
11. **BUG-14, BUG-18, BUG-20**: Remplacer les catch vides — 15 min
12. **BUG-15**: Supprimer `appInstance` ou en faire un helper test — 5 min
13. **BUG-19**: Validation systematique des IDs — 30 min

---

## BILAN GLOBAL

| Domaine | Note | Commentaire |
|---------|------|-------------|
| Architecture | B+ | Service/Repository pattern bien applique |
| Securite | B- | Bonne base (CSRF, JWT, rate limit) mais failles regex et Redis |
| Frontend | B | React Query bien utilise, mais dependency arrays a corriger |
| Error handling | B- | `_handleError` coherent mais trop de catch vides cote frontend |
| Performance | B+ | Compression, cache Redis, batch views |
| i18n | A- | 5 langues, middleware bien integre |
| Tests | C+ | Structure presente mais couverture incomplete |

**Temps estime total pour corriger tous les bugs: ~2-3 heures**
