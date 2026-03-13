# Analyse approfondie des tableaux de bord — EventCulture

> Document généré pour une analyse technique détaillée des trois dashboards.

---

## 1. Architecture générale

```
/dashboard → DashboardRouter (redirige selon rôle)
├── Admin     → /admin/dashboard  (DashboardAdmin)
├── Pro       → /dashboard-pro    (DashboardPro, ProfessionalRoute)
└── Visiteur  → /dashboard-user   (DashboardUser, ProtectedRoute)
```

**Fichiers clés :**
- `frontEnd/src/App.tsx` : routes, DashboardRouter
- `frontEnd/src/pages/DashboardUser.tsx`, `DashboardPro.tsx`, `DashboardAdmin.tsx`
- `frontEnd/src/hooks/useDashboardPro.ts`, `useDashboardAdmin.ts`

---

## 2. Dashboard User (Visiteur)

### Flux de données
| Donnée | Source | API |
|--------|--------|-----|
| Favoris | `useFavoris` | favoriService (groupés par type) |
| Notifications | `useState` + `useEffect` | `notificationService.getNotifications({ page: 1, limit: 10 })` |
| Profil | `useAuth().user` | authService.getCurrentUser |

### Structure des favoris
```ts
groupedFavoris: { oeuvres, evenements, lieux }
stats.byType: { oeuvre, evenement, lieu }
```

### Points à vérifier
- Route patrimoine : `navigate(`/patrimoine/${site.id}`)` — confirmer que `site.id` = id_lieu ou id_patrimoine selon le modèle.

---

## 3. Dashboard Pro (Professionnel)

### APIs et Query Keys
| Donnée | API | Query Key | Retry |
|--------|-----|-----------|-------|
| Stats | `professionnelService.getDashboard()` | dashboard-pro-stats | - |
| Œuvres | `oeuvreService.getMyOeuvres()` | dashboard-pro-oeuvres | 1 |
| Événements | `professionnelService.getEvenements()` + `getProgrammes` par év. | dashboard-pro-evenements | 1 |
| Artisanats | `professionnelService.getArtisanats()` | dashboard-pro-artisanats | - |
| Patrimoines | `patrimoineService.getMySites()` | dashboard-pro-patrimoines | - |

### Services vs Artisanat — constat important
- **Backend** : deux entités distinctes
  - **Artisanat** : `GET /professionnel/artisanats` (produits artisanaux)
  - **Service** : `GET /services/my/list` (services culturels liés aux lieux)
- **DashboardPro** : les onglets « Services » et « Artisanat » utilisent **tous les deux** `mesArtisanats` (professionnelService.getArtisanats).
- **Conséquence** : l’onglet Services affiche des **artisanats**, pas des services. Incohérence métier.

### Mapping des routes (handleView / handleEdit)
| Type | Vue | Modification |
|------|-----|--------------|
| oeuvre | `/oeuvres/${id}` | `/editer-oeuvre/${id}` |
| evenement | `/evenements/${id}` | `/editer-evenement/${id}` |
| patrimoine | `/patrimoine/${id}` | `/modifier-patrimoine/${id}` |
| service | `/services/${id}` | `/modifier-service/${id}` |
| artisanat | `/artisanat/${id}` | `/modifier-artisanat/${id}` |

Les items de type `service` utilisent `id_service || id_artisanat` car ils proviennent de `mesArtisanats`.

### deleteItem
- `deleteItem(type, id)` attend un **number** (id), pas l’objet.
- Dans `DashboardPro`, on appelle `handleDeleteItem('artisanat', item)` puis dans le dialog `deleteItem(type, item?.id_artisanat || item?.id)` — cohérent.

### Logs de debug à retirer
- `DashboardPro.tsx` L75 : `console.log('Dashboard - Mes œuvres:', mesOeuvres)`
- `useDashboardPro.ts` : plusieurs `console.log` dans les queryFn (œuvres, événements, etc.)

### Stats vs onglets
- Carte « Services » : utilise `artisanatsTotal` = `dashboardStats?.artisanats?.total`.
- Onglet Services : affiche `mesArtisanats?.items` (même source que Artisanat).

---

## 4. Dashboard Admin

### Chargement initial (useDashboardAdmin useEffect)
**12 appels API au montage** :
1. loadOverview
2. loadStats
3. loadPatrimoineStats
4. loadAllUsers
5. loadPendingUsers
6. loadPendingOeuvres
7. loadModerationQueue
8. loadAlerts
9. loadOeuvres
10. loadEvenements
11. loadPatrimoineItems
12. loadServices

Recommandation : charger les données par onglet au focus (Overview immédiat, reste à la demande).

### Structure backend (generateOverviewStats)
```js
{
  stats: {
    totalUsers, totalOeuvres, totalEvenements, totalArtisanats,
    newUsersToday, sitesPatrimoniaux, vuesAujourdhui
  },
  pending: {
    oeuvresEnAttente, professionnelsEnAttente, signalementsEnAttente
  }
}
```

### Mapping frontend (adminService.getOverview)
```ts
overview.users.total = apiData.stats?.totalUsers
overview.users.en_attente_validation = apiData.pending?.professionnelsEnAttente
overview.content.oeuvres_total = apiData.stats?.totalOeuvres
// etc.
```

AdminOverview extrait ensuite :
```ts
stats.totalUsers = overview.users?.total
stats.pendingUsers = overview.users?.en_attente_validation
```

### Tendances en dur (AdminOverview)
```tsx
<StatCard trend={{ value: 12, label: t('admin.stats.thisMonth') }} />  // Utilisateurs
<StatCard trend={{ value: 8, label: t('admin.stats.thisMonth') }} />   // Œuvres
<StatCard trend={{ value: 5, label: t('admin.stats.thisMonth') }} />   // Événements
```
Ces valeurs (12, 8, 5) sont fixes, non issues des stats réelles.

### Onglets Admin
Overview, Users, Œuvres, Événements, Patrimoine, Services, Modération — tous en `React.lazy`.

---

## 5. Synthèse des problèmes prioritaires

| Priorité | Problème | Impact |
|----------|----------|--------|
| P1 | Services et Artisanat affichent les mêmes données (mesArtisanats) | Confusion, données incorrectes |
| P1 | 12 appels API au montage admin | Performance, charge serveur |
| P2 | console.log en prod (DashboardPro, useDashboardPro) | Fuite d’infos, bruit console |
| P2 | Tendances StatCard en dur (12, 8, 5) | Indicateurs trompeurs |
| P3 | loadStats(selectedPeriod) sans dépendance dans useEffect | Période potentiellement non prise en compte |

---

## 6. Recommandations techniques

### Court terme
1. Retirer tous les `console.log` de DashboardPro et useDashboardPro.
2. Décider : l’onglet Services doit-il afficher `GET /services/my/list` (vraies données) ou fusionner avec Artisanat ?
3. Remplacer les tendances en dur par des données de `loadStats(period)` ou équivalent.

### Moyen terme
1. Chargement admin par onglet : loadOverview + loadStats au montage ; le reste au focus de l’onglet.
2. Rendre les tendances dynamiques à partir de l’API stats.

### Long terme
1. Utiliser le WebSocket pour les alertes / pending en temps réel.
2. Pagination côté front pour les listes admin (100 items par défaut).
