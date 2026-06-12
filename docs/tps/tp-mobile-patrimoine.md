# TP Mobile — Application Patrimoine Algérien
## « Explore Algérie » — Application React Native / Expo

> **Niveau requis :** Intermédiaire (connaît React/JavaScript, jamais fait React Native)  
> **Durée totale :** ~30 heures (TP 0 + 7 TP de 3 à 6h)  
> **Backend :** API REST déjà en production — `http://[IP_SERVEUR]:3001/api`  
> **Repo GitHub :** [https://github.com/Amazighiahub/explore-algerie-mobile](https://github.com/Amazighiahub/explore-algerie-mobile)

---

---

# TP 0 — Initialisation du dépôt Git & Premier Push
**Durée :** 30 min  
> À faire AVANT tout autre TP — le repo GitHub est vide, il faut l'initialiser correctement.

## Objectifs
- Cloner le repo vide depuis GitHub
- Initialiser le projet Expo dedans
- Configurer `.gitignore` correctement
- Faire le premier commit et push

## Prérequis
- Git installé : `git --version`
- Node.js 18+ : `node --version`
- Compte GitHub configuré avec SSH ou token HTTPS
- Expo CLI : `npm install -g expo-cli` (optionnel, `npx` suffit)

## Étapes

### 0.1 — Cloner le repo vide

```bash
git clone https://github.com/Amazighiahub/explore-algerie-mobile.git
cd explore-algerie-mobile
```

### 0.2 — Créer le projet Expo dans le repo

> ⚠️ Le repo est déjà cloné, on initialise Expo **dans le dossier courant** (`.`)

```bash
npx create-expo-app@latest . --template tabs
```

Quand il demande si tu veux écraser le dossier existant (`.git`) → répondre **Yes**.

### 0.3 — Configurer `.gitignore`

Vérifie que `.gitignore` contient bien ces lignes (le template Expo les inclut déjà) :

```
node_modules/
.expo/
dist/
build/
.env.local
*.orig.*
web-build/
```

> ⚠️ **`.env.local` doit être dans `.gitignore`** — ce fichier contient l'URL de l'API et ne doit JAMAIS être pushé.

### 0.4 — Créer le fichier `.env.local`

```bash
# Créer le fichier de config locale (NON versionné)
echo "EXPO_PUBLIC_API_URL=http://[IP_SERVEUR]:3001/api" > .env.local
```

Remplace `[IP_SERVEUR]` par l'IP fournie par ton encadrant.

### 0.5 — Créer un `.env.example` (versionné, sans valeurs sensibles)

```bash
echo "EXPO_PUBLIC_API_URL=http://[IP_SERVEUR]:3001/api" > .env.example
```

Ce fichier sert de documentation pour les autres développeurs.

### 0.6 — Premier commit et push

```bash
# Vérifier l'état
git status

# Ajouter tous les fichiers (sauf ceux dans .gitignore)
git add .

# Commit initial
git commit -m "feat: init Expo project with tabs template"

# Pousser sur la branche principale
git push origin main
```

> Si la branche par défaut est `master` au lieu de `main` :
> ```bash
> git branch -M main
> git push -u origin main
> ```

### 0.7 — Vérifier sur GitHub

Aller sur [https://github.com/Amazighiahub/explore-algerie-mobile](https://github.com/Amazighiahub/explore-algerie-mobile) et vérifier que les fichiers apparaissent.

### 0.8 — Stratégie de branches (bonne pratique)

Pour chaque TP, créer une branche dédiée :

```bash
# TP 1
git checkout -b tp1/setup-navigation

# Une fois le TP terminé
git add .
git commit -m "feat(tp1): navigation Expo Router + NativeWind"
git push origin tp1/setup-navigation

# Fusionner dans main quand validé
git checkout main
git merge tp1/setup-navigation
git push origin main
```

**Nommage des branches conseillé :**
| TP | Branche |
|----|---------|
| TP 1 | `tp1/setup-navigation` |
| TP 2 | `tp2/auth-jwt` |
| TP 3 | `tp3/liste-detail` |
| TP 4 | `tp4/carte-gps` |
| TP 5 | `tp5/parcours` |
| TP 6 | `tp6/offline` |
| TP 7 | `tp7/qrcode-partage` |

## Livrable
- Repo GitHub non vide : projet Expo visible sur [https://github.com/Amazighiahub/explore-algerie-mobile](https://github.com/Amazighiahub/explore-algerie-mobile)
- `.env.local` absent du repo (ne doit PAS apparaître sur GitHub)
- `.env.example` présent dans le repo
- `README.md` mis à jour (voir étape bonus ci-dessous)

## Bonus — Mettre à jour le README

Remplacer le contenu de `README.md` par :

```markdown
# Explore Algérie Mobile

Application mobile React Native / Expo pour découvrir le patrimoine culturel algérien.

## Setup

1. Cloner le repo
   ```bash
   git clone https://github.com/Amazighiahub/explore-algerie-mobile.git
   cd explore-algerie-mobile
   ```

2. Installer les dépendances
   ```bash
   npm install
   ```

3. Configurer l'environnement
   ```bash
   cp .env.example .env.local
   # Éditer .env.local avec l'IP du serveur backend
   ```

4. Lancer
   ```bash
   npx expo start
   ```

## Tech stack
- Expo + TypeScript + Expo Router
- NativeWind (Tailwind CSS)
- React Query + Zustand
- react-native-maps + expo-location
- Backend : API EventCulture (port 3001)
```

## Critères de notation
| Critère | Points |
|---------|--------|
| Repo non vide avec projet Expo | 4 |
| `.env.local` absent, `.env.example` présent | 3 |
| Stratégie de branches utilisée | 2 |
| README mis à jour | 1 |
| **Total** | **10** |

---

---

## Contexte du projet

Tu vas construire une application mobile pour découvrir le **patrimoine culturel algérien** :
monuments, villes historiques, sites naturels, vestiges numides et berbères.

L'application permettra de :
- 🗺️ Visualiser les sites sur une **carte GPS interactive**
- 📍 Trouver les sites **proches de sa position**
- 🏛️ Consulter les fiches détaillées (monuments, vestiges, histoire)
- 🧭 **Créer et suivre des parcours** (randonnée, visite culturelle, gastronomique)
- 📴 Fonctionner **hors-ligne** par wilaya
- 📱 Scanner les **QR Codes** des sites

---

## Architecture du projet

```
explore-algerie-mobile/
├── app/                          ← Expo Router (navigation par fichiers)
│   ├── _layout.tsx               ← Layout racine + providers
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx           ← Barre d'onglets
│   │   ├── index.tsx             ← Carte principale (GPS)
│   │   ├── explorer.tsx          ← Liste des sites
│   │   ├── parcours.tsx          ← Mes parcours
│   │   └── profil.tsx            ← Profil utilisateur
│   └── patrimoine/
│       └── [id].tsx              ← Fiche détail
├── src/
│   ├── api/
│   │   ├── client.ts             ← Axios + interceptors JWT
│   │   ├── auth.api.ts
│   │   ├── patrimoine.api.ts
│   │   └── parcours.api.ts
│   ├── stores/
│   │   ├── authStore.ts          ← Zustand : user, token
│   │   └── mapStore.ts           ← Zustand : markers, filtres
│   ├── hooks/
│   │   ├── useLocation.ts        ← GPS temps réel
│   │   ├── useNearby.ts          ← Sites proches
│   │   └── useParcours.ts
│   ├── components/
│   │   ├── map/
│   │   │   ├── SiteMarker.tsx
│   │   │   └── UserDot.tsx
│   │   ├── cards/
│   │   │   ├── SiteCard.tsx
│   │   │   └── ParcoursCard.tsx
│   │   └── ui/
│   │       ├── Badge.tsx
│   │       └── SkeletonCard.tsx
│   └── types/
│       ├── patrimoine.types.ts
│       └── parcours.types.ts
├── .env.local                    ← API_URL=http://[IP]:3001/api
└── app.json
```

---

## Endpoints backend utilisés

| Méthode | URL | Auth | Description |
|---------|-----|------|-------------|
| `POST` | `/api/users/login` | — | Connexion → token JWT |
| `POST` | `/api/users/register` | — | Inscription |
| `GET` | `/api/users/profile` | ✅ | Profil connecté |
| `POST` | `/api/users/refresh-token` | — | Renouveler le token |
| `GET` | `/api/patrimoine/` | — | Liste des sites |
| `GET` | `/api/patrimoine/map` | — | Tous les sites avec GPS |
| `GET` | `/api/patrimoine/mobile/nearby` | — | Sites proches (`?latitude=&longitude=&rayon=`) |
| `GET` | `/api/patrimoine/mobile/offline/:wilayaId` | — | Données offline par wilaya |
| `GET` | `/api/patrimoine/:id` | — | Fiche complète d'un site |
| `GET` | `/api/patrimoine/search` | — | Recherche (`?q=`) |
| `POST` | `/api/patrimoine/mobile/qr-scan` | — | Scanner QR Code |
| `POST` | `/api/patrimoine/:id/favoris` | ✅ | Ajouter aux favoris |
| `DELETE` | `/api/patrimoine/:id/favoris` | ✅ | Retirer des favoris |
| `GET` | `/api/parcours/` | — | Liste des parcours |
| `GET` | `/api/parcours/:id` | — | Détail d'un parcours |
| `GET` | `/api/parcours/:id/map` | — | Parcours avec coordonnées GPS |
| `GET` | `/api/parcours/my/list` | ✅ | Mes parcours |
| `POST` | `/api/parcours/` | ✅ | Créer un parcours |
| `POST` | `/api/parcours/:id/etapes` | ✅ | Ajouter une étape |
| `POST` | `/api/parcours/personnalise` | — | Parcours intelligent automatique |

---

---

# TP 1 — Setup, Navigation & Design System
**Durée :** 3h

## Objectifs
- Initialiser un projet Expo avec TypeScript
- Mettre en place la navigation par onglets (Expo Router)
- Configurer NativeWind (Tailwind CSS pour React Native)
- Créer les 5 écrans squelettes

## Prérequis
- Node.js 18+ installé
- Compte Expo Go sur téléphone (iOS/Android)
- VS Code + extension Expo Tools

## Étapes

### 1.1 — Créer le projet

```bash
npx create-expo-app explore-algerie-mobile --template tabs
cd explore-algerie-mobile

# Installer les dépendances
npx expo install expo-router react-native-safe-area-context react-native-screens
npm install nativewind@^4.0 tailwindcss
npm install zustand @tanstack/react-query axios
npm install expo-secure-store expo-location
```

### 1.2 — Configurer NativeWind

Créer `tailwind.config.js` :
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#1B6CA8",
        heritage: "#C17B1D",
        nature: "#2D7D46",
      },
    },
  },
};
```

Modifier `babel.config.js` :
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

### 1.3 — Variables d'environnement

Créer `.env.local` :
```
EXPO_PUBLIC_API_URL=http://192.168.X.X:3001/api
```

> ⚠️ Remplace `192.168.X.X` par l'adresse IP de ta machine sur le réseau local.  
> Sur Mac/Linux : `ifconfig` — Sur Windows : `ipconfig`

### 1.4 — Layout racine `app/_layout.tsx`

```tsx
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
```

### 1.5 — Navigation par onglets `app/(tabs)/_layout.tsx`

```tsx
import { Tabs } from 'expo-router';
import { Map, Compass, Route, User } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1B6CA8',
        tabBarStyle: { paddingBottom: 5 },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Carte', tabBarIcon: ({ color }) => <Map color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="explorer"
        options={{ title: 'Explorer', tabBarIcon: ({ color }) => <Compass color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="parcours"
        options={{ title: 'Parcours', tabBarIcon: ({ color }) => <Route color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="profil"
        options={{ title: 'Profil', tabBarIcon: ({ color }) => <User color={color} size={22} /> }}
      />
    </Tabs>
  );
}
```

### 1.6 — Composant `SiteCard` réutilisable

Créer `src/components/cards/SiteCard.tsx` :
```tsx
import { View, Text, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { SitePatrimoine } from '@/types/patrimoine.types';

const TYPE_COLORS: Record<string, string> = {
  ville_village: 'bg-emerald-100 text-emerald-800',
  monument: 'bg-amber-100 text-amber-800',
  site_naturel: 'bg-green-100 text-green-800',
  site_archeologique: 'bg-orange-100 text-orange-800',
};

interface Props {
  site: SitePatrimoine;
  lang?: string;
}

export function SiteCard({ site, lang = 'fr' }: Props) {
  const router = useRouter();
  const nom = typeof site.nom === 'string' ? site.nom : site.nom?.[lang] || site.nom?.fr || '';
  const colorClass = TYPE_COLORS[site.typePatrimoine] || 'bg-gray-100 text-gray-800';

  return (
    <Pressable
      className="bg-white rounded-xl shadow-sm mb-3 overflow-hidden active:opacity-80"
      onPress={() => router.push(`/patrimoine/${site.id_lieu}`)}
    >
      <Image
        source={{ uri: site.mainImage || 'https://via.placeholder.com/400x200' }}
        className="w-full h-40"
        resizeMode="cover"
      />
      <View className="p-3">
        <Text className="text-base font-semibold text-gray-900 mb-1">{nom}</Text>
        <View className={`self-start px-2 py-0.5 rounded-full ${colorClass}`}>
          <Text className="text-xs font-medium">{site.typePatrimoine}</Text>
        </View>
        {site.wilaya && (
          <Text className="text-xs text-gray-500 mt-1">📍 {site.wilaya.nom}</Text>
        )}
      </View>
    </Pressable>
  );
}
```

## Livrable
- Projet lancé sur Expo Go (`npx expo start`)
- 4 onglets visibles avec icônes
- Composant `SiteCard` fonctionnel avec navigation
- Aucune erreur TypeScript

## Critères de notation
| Critère | Points |
|---------|--------|
| Projet compile sans erreur | 3 |
| Navigation 4 onglets fonctionnelle | 3 |
| NativeWind configuré et utilisé | 2 |
| Composant SiteCard propre et réutilisable | 2 |
| **Total** | **10** |

---

---

# TP 2 — Authentification JWT
**Durée :** 4h

## Objectifs
- Créer le client HTTP Axios avec interceptors (auto-refresh token)
- Implémenter Login / Register avec les vrais endpoints
- Stocker le JWT de façon sécurisée (`expo-secure-store`)
- Créer un store Zustand pour l'état d'authentification
- Protéger les routes qui nécessitent d'être connecté

## Étapes

### 2.1 — Client Axios `src/api/client.ts`

```typescript
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL!;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor : ajoute le token à chaque requête
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor : auto-refresh si 401
let isRefreshing = false;
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && !isRefreshing) {
      original._retry = true;
      isRefreshing = true;
      try {
        const token = await SecureStore.getItemAsync('access_token');
        const { data } = await axios.post(`${BASE_URL}/users/refresh-token`, { token });
        await SecureStore.setItemAsync('access_token', data.token);
        original.headers.Authorization = `Bearer ${data.token}`;
        return apiClient(original);
      } catch {
        await SecureStore.deleteItemAsync('access_token');
        // Rediriger vers login — géré par le store
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
```

### 2.2 — API Auth `src/api/auth.api.ts`

```typescript
import { apiClient } from './client';

export interface LoginPayload { email: string; password: string; }
export interface RegisterPayload { email: string; password: string; nom: string; prenom: string; }

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient.post<{ token: string; user: any }>('/users/login', payload),

  register: (payload: RegisterPayload) =>
    apiClient.post('/users/register', payload),

  profile: () =>
    apiClient.get('/users/profile'),

  logout: () =>
    apiClient.post('/users/logout'),
};
```

### 2.3 — Store Zustand `src/stores/authStore.ts`

```typescript
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authApi, LoginPayload, RegisterPayload } from '@/api/auth.api';

interface AuthState {
  user: any | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (payload) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.login(payload);
      await SecureStore.setItemAsync('access_token', data.token);
      set({ token: data.token, user: data.user, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (payload) => {
    set({ isLoading: true });
    try {
      await authApi.register(payload);
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('access_token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadFromStorage: async () => {
    const token = await SecureStore.getItemAsync('access_token');
    if (!token) return;
    try {
      const { data } = await authApi.profile();
      set({ token, user: data, isAuthenticated: true });
    } catch {
      await SecureStore.deleteItemAsync('access_token');
    }
  },
}));
```

### 2.4 — Écran Login `app/(auth)/login.tsx`

```tsx
import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Email et mot de passe requis');
      return;
    }
    try {
      await login({ email, password });
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert(
        'Connexion impossible',
        err.response?.data?.error || 'Vérifiez vos identifiants'
      );
    }
  };

  return (
    <View className="flex-1 bg-white justify-center px-6">
      <Text className="text-3xl font-bold text-primary mb-2">Explore Algérie</Text>
      <Text className="text-gray-500 mb-8">Connectez-vous pour enrichir le patrimoine</Text>

      <TextInput
        className="border border-gray-200 rounded-xl px-4 py-3 mb-4 text-base"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        className="border border-gray-200 rounded-xl px-4 py-3 mb-6 text-base"
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Pressable
        className="bg-primary rounded-xl py-4 items-center active:opacity-80"
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading
          ? <ActivityIndicator color="white" />
          : <Text className="text-white font-semibold text-base">Se connecter</Text>}
      </Pressable>

      <Pressable className="mt-4 items-center" onPress={() => router.push('/(auth)/register')}>
        <Text className="text-gray-500">Pas de compte ? <Text className="text-primary font-medium">S'inscrire</Text></Text>
      </Pressable>
    </View>
  );
}
```

## Livrable
- Login fonctionnel avec le vrai backend
- Token stocké dans SecureStore
- Auto-refresh transparent
- Redirection automatique si déjà connecté

## Critères de notation
| Critère | Points |
|---------|--------|
| Axios client avec interceptors | 3 |
| Store Zustand bien structuré | 3 |
| Écran Login fonctionnel (vrai appel API) | 2 |
| Gestion des erreurs (mauvais identifiants) | 2 |
| **Total** | **10** |

---

---

# TP 3 — Liste & Détail des sites patrimoniaux
**Durée :** 4h

## Objectifs
- Appeler `GET /api/patrimoine/` avec React Query
- Afficher une liste filtrée par type
- Créer l'écran détail avec monuments, vestiges, galerie
- Typer correctement les données TypeScript

## Étapes

### 3.1 — Types TypeScript `src/types/patrimoine.types.ts`

```typescript
export type MultilingualField = { fr?: string; ar?: string; en?: string };
export type TypePatrimoine = 
  'ville_village' | 'monument' | 'musee' | 'site_archeologique' |
  'site_naturel' | 'edifice_religieux' | 'palais_forteresse' | 'autre';

export interface SitePatrimoine {
  id_lieu: number;
  nom: MultilingualField | string;
  adresse?: MultilingualField | string;
  latitude: number;
  longitude: number;
  typePatrimoine?: TypePatrimoine;
  typeLieu: string;
  mainImage?: string;
  wilaya?: { id_wilaya: number; nom: string };
  commune?: { id_commune: number; nom: string };
  stats?: {
    noteMoyenne: number | null;
    totalMedias: number;
    totalMonuments: number;
  };
}

export interface SiteDetail extends SitePatrimoine {
  DetailLieu?: {
    description?: MultilingualField | string;
    histoire?: MultilingualField | string;
    horaires?: MultilingualField | string;
    gastronomie?: MultilingualField | string;
    traditions?: MultilingualField | string;
  };
  monuments?: Array<{ id: number; nom: MultilingualField | string; type: string; description?: MultilingualField | string }>;
  vestiges?: Array<{ id: number; nom: MultilingualField | string; type: string; description?: MultilingualField | string }>;
  medias?: Array<{ id: number; url: string; type: string }>;
  services?: Array<{ id: number; nom: MultilingualField | string; disponible: boolean }>;
}

// Helper de traduction
export const t = (field: MultilingualField | string | null | undefined, lang = 'fr'): string => {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[lang as keyof MultilingualField] || field.fr || field.ar || '';
};
```

### 3.2 — API Patrimoine `src/api/patrimoine.api.ts`

```typescript
import { apiClient } from './client';
import type { SiteDetail, SitePatrimoine } from '@/types/patrimoine.types';

export const patrimoineApi = {
  list: (params?: { type?: string; wilaya?: string; page?: number }) =>
    apiClient.get<{ data: SitePatrimoine[]; total: number }>('/patrimoine', { params }),

  map: () =>
    apiClient.get<{ data: SitePatrimoine[] }>('/patrimoine/map'),

  nearby: (latitude: number, longitude: number, rayon = 30) =>
    apiClient.get<{ data: SitePatrimoine[] }>('/patrimoine/mobile/nearby', {
      params: { latitude, longitude, rayon },
    }),

  detail: (id: number) =>
    apiClient.get<{ data: SiteDetail }>(`/patrimoine/${id}`),

  search: (q: string) =>
    apiClient.get<{ data: SitePatrimoine[] }>('/patrimoine/search', { params: { q } }),

  addFavori: (id: number) =>
    apiClient.post(`/patrimoine/${id}/favoris`),

  removeFavori: (id: number) =>
    apiClient.delete(`/patrimoine/${id}/favoris`),
};
```

### 3.3 — Écran Explorer `app/(tabs)/explorer.tsx`

```tsx
import { useState } from 'react';
import { View, Text, FlatList, TextInput, ScrollView, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { patrimoineApi } from '@/api/patrimoine.api';
import { SiteCard } from '@/components/cards/SiteCard';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { SafeAreaView } from 'react-native-safe-area-context';

const TYPES = [
  { key: '', label: 'Tous' },
  { key: 'ville_village', label: '🏘 Villes' },
  { key: 'monument', label: '🏛 Monuments' },
  { key: 'site_archeologique', label: '🪨 Vestiges' },
  { key: 'site_naturel', label: '🌿 Nature' },
];

export default function ExplorerScreen() {
  const [selectedType, setSelectedType] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['patrimoine', selectedType],
    queryFn: () => patrimoineApi.list({ type: selectedType || undefined }),
  });

  const sites = data?.data.data ?? [];

  const filtered = search.trim()
    ? sites.filter(s => {
        const nom = typeof s.nom === 'string' ? s.nom : s.nom?.fr || '';
        return nom.toLowerCase().includes(search.toLowerCase());
      })
    : sites;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-900 mb-3">Explorer</Text>

        {/* Barre de recherche */}
        <TextInput
          className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-3"
          placeholder="🔍 Rechercher un site…"
          value={search}
          onChangeText={setSearch}
        />

        {/* Filtres par type */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TYPES.map(type => (
            <Pressable
              key={type.key}
              className={`mr-2 px-4 py-2 rounded-full border ${
                selectedType === type.key
                  ? 'bg-primary border-primary'
                  : 'bg-white border-gray-200'
              }`}
              onPress={() => setSelectedType(type.key)}
            >
              <Text className={selectedType === type.key ? 'text-white font-medium' : 'text-gray-700'}>
                {type.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={isLoading ? Array(4).fill(null) : filtered}
        keyExtractor={(item, i) => item ? String(item.id_lieu) : String(i)}
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        renderItem={({ item }) =>
          isLoading || !item
            ? <SkeletonCard />
            : <SiteCard site={item} />
        }
        ListEmptyComponent={
          <View className="items-center py-16">
            <Text className="text-4xl mb-3">🏛</Text>
            <Text className="text-gray-500 text-center">Aucun site trouvé</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
```

## Livrable
- Liste des sites chargée depuis le vrai backend
- Filtres par type fonctionnels
- Skeleton loading pendant le chargement
- Navigation vers l'écran détail

## Critères de notation
| Critère | Points |
|---------|--------|
| Types TypeScript complets | 2 |
| React Query avec cache | 3 |
| Filtres et recherche | 3 |
| Skeleton loading | 2 |
| **Total** | **10** |

---

---

# TP 4 — Carte GPS Interactive
**Durée :** 6h  
> C'est le cœur de l'application

## Objectifs
- Afficher tous les sites sur une carte `react-native-maps`
- Géolocaliser l'utilisateur en temps réel
- Charger les sites proches via `GET /api/patrimoine/mobile/nearby`
- Filtrer par rayon (5km, 20km, 50km)
- Ouvrir la fiche d'un site depuis la carte

## Installation

```bash
npx expo install react-native-maps expo-location
```

### 4.1 — Hook GPS `src/hooks/useLocation.ts`

```typescript
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export function useLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: Location.LocationSubscription;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission GPS refusée. Certaines fonctionnalités sont limitées.');
        // Position par défaut : Alger
        setLocation({ latitude: 36.7538, longitude: 3.0588 });
        setLoading(false);
        return;
      }

      // Position initiale rapide
      const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ latitude: initial.coords.latitude, longitude: initial.coords.longitude });
      setLoading(false);

      // Mise à jour continue (toutes les 10 secondes)
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 50 },
        (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
      );
    })();

    return () => subscription?.remove();
  }, []);

  return { location, error, loading };
}
```

### 4.2 — Hook Sites Proches `src/hooks/useNearby.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { patrimoineApi } from '@/api/patrimoine.api';
import type { UserLocation } from './useLocation';

export function useNearby(location: UserLocation | null, rayon: number) {
  return useQuery({
    queryKey: ['nearby', location?.latitude, location?.longitude, rayon],
    queryFn: () => patrimoineApi.nearby(location!.latitude, location!.longitude, rayon),
    enabled: !!location,
    staleTime: 2 * 60 * 1000, // Recharge si plus de 2 min
    select: (data) => data.data.data ?? [],
  });
}
```

### 4.3 — Composant Marqueur `src/components/map/SiteMarker.tsx`

```tsx
import { View, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import type { SitePatrimoine } from '@/types/patrimoine.types';

const MARKER_COLORS: Record<string, string> = {
  ville_village: '#10B981',
  monument: '#F59E0B',
  site_archeologique: '#EF4444',
  site_naturel: '#22C55E',
  palais_forteresse: '#8B5CF6',
};

interface Props {
  site: SitePatrimoine;
  onPress: (site: SitePatrimoine) => void;
}

export function SiteMarker({ site, onPress }: Props) {
  const color = MARKER_COLORS[site.typePatrimoine || ''] || '#3B82F6';
  const nom = typeof site.nom === 'string' ? site.nom : site.nom?.fr || '';

  return (
    <Marker
      coordinate={{ latitude: site.latitude, longitude: site.longitude }}
      onPress={() => onPress(site)}
      title={nom}
    >
      <View
        style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: color, borderWidth: 2, borderColor: 'white',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
        }}
      >
        <Text style={{ fontSize: 16 }}>
          {site.typePatrimoine === 'ville_village' ? '🏘' :
           site.typePatrimoine === 'monument' ? '🏛' :
           site.typePatrimoine === 'site_archeologique' ? '🪨' :
           site.typePatrimoine === 'site_naturel' ? '🌿' : '📍'}
        </Text>
      </View>
    </Marker>
  );
}
```

### 4.4 — Écran Carte `app/(tabs)/index.tsx`

```tsx
import { useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { SiteMarker } from '@/components/map/SiteMarker';
import { useLocation } from '@/hooks/useLocation';
import { useNearby } from '@/hooks/useNearby';
import { useRouter } from 'expo-router';
import type { SitePatrimoine } from '@/types/patrimoine.types';

const RAYONS = [{ km: 5, label: '5 km' }, { km: 20, label: '20 km' }, { km: 50, label: '50 km' }];

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [rayon, setRayon] = useState(20);
  const { location, loading: locLoading } = useLocation();
  const { data: sites = [], isLoading } = useNearby(location, rayon);

  const handleMarkerPress = (site: SitePatrimoine) => {
    router.push(`/patrimoine/${site.id_lieu}`);
  };

  const centerOnUser = () => {
    if (!location) return;
    mapRef.current?.animateToRegion({
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }, 800);
  };

  if (locLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#1B6CA8" />
        <Text className="text-gray-500 mt-3">Localisation en cours…</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        className="flex-1"
        initialRegion={{
          latitude: location?.latitude ?? 36.7538,
          longitude: location?.longitude ?? 3.0588,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {sites.map(site => (
          <SiteMarker key={site.id_lieu} site={site} onPress={handleMarkerPress} />
        ))}
      </MapView>

      {/* Filtres rayon — flottants en haut */}
      <View className="absolute top-14 left-0 right-0 px-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {RAYONS.map(r => (
            <Pressable
              key={r.km}
              className={`mr-2 px-4 py-2 rounded-full shadow-sm ${
                rayon === r.km ? 'bg-primary' : 'bg-white'
              }`}
              onPress={() => setRayon(r.km)}
            >
              <Text className={rayon === r.km ? 'text-white font-medium' : 'text-gray-700'}>
                {r.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Compteur de sites */}
      <View className="absolute top-28 right-4">
        <View className="bg-white rounded-xl px-3 py-2 shadow-sm">
          {isLoading
            ? <ActivityIndicator size="small" color="#1B6CA8" />
            : <Text className="text-sm font-medium text-primary">{sites.length} sites</Text>}
        </View>
      </View>

      {/* Bouton Ma position */}
      <Pressable
        className="absolute bottom-8 right-4 bg-white w-12 h-12 rounded-full shadow-lg items-center justify-center"
        onPress={centerOnUser}
      >
        <Text className="text-xl">📍</Text>
      </Pressable>
    </View>
  );
}
```

## Livrable
- Carte avec marqueurs colorés par type
- Position GPS de l'utilisateur visible
- Filtres rayon (5/20/50 km) qui rechargent depuis l'API
- Tap sur marqueur → fiche détail

## Critères de notation
| Critère | Points |
|---------|--------|
| Carte affichée avec marqueurs réels | 4 |
| GPS utilisateur fonctionnel (permissions gérées) | 3 |
| Appel `/mobile/nearby` avec rayon | 2 |
| Performance (pas de re-render inutile) | 1 |
| **Total** | **10** |

---

---

# TP 5 — Parcours Intelligents
**Durée :** 6h  
> Fonctionnalité signature de l'application

## Objectifs
- Lister et afficher les parcours existants avec leur tracé GPS
- Créer un nouveau parcours en sélectionnant des sites sur la carte
- Utiliser `POST /api/parcours/personnalise` pour un parcours automatique
- Afficher 3 profils : 🥾 Randonnée / 🏛 Culture / 📖 Histoire

## Étapes

### 5.1 — Types parcours `src/types/parcours.types.ts`

```typescript
import type { MultilingualField, SitePatrimoine } from './patrimoine.types';

export type TransportMode = 'marche' | 'velo' | 'voiture' | 'transport_public';
export type Difficulte = 'facile' | 'moyen' | 'difficile';

export interface Etape {
  id_parcours_lieu: number;
  ordre: number;
  id_lieu: number;
  duree_estimee?: number;
  distance_precedent?: number;
  temps_trajet?: number;
  transport_mode?: TransportMode;
  notes?: string;
  Lieu?: SitePatrimoine;
  // Champs formatés retournés par le backend
  duree_formatee?: string;
  distance_formatee?: string;
  temps_trajet_formate?: string;
}

export interface Parcours {
  id_parcours: number;
  nom_parcours: MultilingualField | string;
  description?: MultilingualField | string;
  duree_estimee?: number;
  difficulte: Difficulte;
  theme?: string;
  distance_km?: number;
  transport_mode?: TransportMode;
  statut: 'actif' | 'inactif' | 'maintenance';
  Etapes?: Etape[];
}

export const PROFILS_PARCOURS = [
  { key: 'randonneur', label: '🥾 Randonnée', theme: 'nature', difficulte: 'moyen' as Difficulte, transport: 'marche' as TransportMode },
  { key: 'culture', label: '🏛 Touriste culturel', theme: 'historique', difficulte: 'facile' as Difficulte, transport: 'voiture' as TransportMode },
  { key: 'histoire', label: '📖 Amoureux d\'histoire', theme: 'patrimoine', difficulte: 'facile' as Difficulte, transport: 'voiture' as TransportMode },
] as const;
```

### 5.2 — API Parcours `src/api/parcours.api.ts`

```typescript
import { apiClient } from './client';
import type { Parcours, TransportMode, Difficulte } from '@/types/parcours.types';

export const parcoursApi = {
  list: () =>
    apiClient.get<{ data: Parcours[] }>('/parcours'),

  myList: () =>
    apiClient.get<{ data: Parcours[] }>('/parcours/my/list'),

  detail: (id: number) =>
    apiClient.get<{ data: Parcours }>(`/parcours/${id}`),

  map: (id: number) =>
    apiClient.get<{ data: any }>(`/parcours/${id}/map`),

  create: (payload: {
    nom: string;
    description?: string;
    difficulte?: Difficulte;
    theme?: string;
    transport_mode?: TransportMode;
  }) => apiClient.post<{ data: Parcours }>('/parcours', payload),

  addEtape: (parcoursId: number, lieuId: number, ordre?: number) =>
    apiClient.post(`/parcours/${parcoursId}/etapes`, { id_lieu: lieuId, ordre }),

  personnalise: (params: {
    latitude: number;
    longitude: number;
    rayon?: number;
    theme?: string;
    difficulte?: string;
    transport_mode?: string;
  }) => apiClient.post('/parcours/personnalise', params),

  delete: (id: number) =>
    apiClient.delete(`/parcours/${id}`),
};
```

### 5.3 — Écran Parcours `app/(tabs)/parcours.tsx`

```tsx
import { useState } from 'react';
import { View, Text, FlatList, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parcoursApi } from '@/api/parcours.api';
import { useAuthStore } from '@/stores/authStore';
import { PROFILS_PARCOURS } from '@/types/parcours.types';
import { useLocation } from '@/hooks/useLocation';
import { t } from '@/types/patrimoine.types';

export default function ParcoursScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const { location } = useLocation();
  const [generating, setGenerating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['parcours'],
    queryFn: () => parcoursApi.list(),
    select: d => d.data.data ?? [],
  });

  const handleGenerateParcours = async (profil: typeof PROFILS_PARCOURS[number]) => {
    if (!location) {
      Alert.alert('GPS requis', 'Activez le GPS pour générer un parcours');
      return;
    }
    if (!isAuthenticated) {
      Alert.alert('Connexion requise', 'Connectez-vous pour créer un parcours');
      return;
    }

    setGenerating(true);
    try {
      const { data } = await parcoursApi.personnalise({
        latitude: location.latitude,
        longitude: location.longitude,
        rayon: 50,
        theme: profil.theme,
        difficulte: profil.difficulte,
        transport_mode: profil.transport,
      });
      qc.invalidateQueries({ queryKey: ['parcours'] });
      Alert.alert('✅ Parcours créé !', `Votre parcours ${profil.label} est prêt.`);
    } catch (err: any) {
      Alert.alert('Erreur', err.response?.data?.error || 'Impossible de créer le parcours');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-900 mb-4">Parcours</Text>

        {/* Générer un parcours intelligent */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="font-semibold text-gray-800 mb-3">🧭 Générer un parcours automatique</Text>
          {generating && <ActivityIndicator color="#1B6CA8" className="mb-2" />}
          <View className="gap-2">
            {PROFILS_PARCOURS.map(profil => (
              <Pressable
                key={profil.key}
                className="border border-gray-200 rounded-xl py-3 px-4 active:bg-gray-50 flex-row items-center justify-between"
                onPress={() => handleGenerateParcours(profil)}
                disabled={generating}
              >
                <Text className="text-base">{profil.label}</Text>
                <Text className="text-xs text-gray-400">{profil.difficulte}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Liste des parcours */}
      <FlatList
        data={isLoading ? [] : (data ?? [])}
        keyExtractor={item => String(item.id_parcours)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        ListHeaderComponent={<Text className="font-semibold text-gray-700 mb-3">Parcours disponibles</Text>}
        renderItem={({ item }) => (
          <Pressable
            className="bg-white rounded-xl p-4 mb-3 shadow-sm active:opacity-80"
            onPress={() => router.push(`/parcours/${item.id_parcours}`)}
          >
            <Text className="font-semibold text-base text-gray-900">{t(item.nom_parcours)}</Text>
            <View className="flex-row gap-3 mt-2">
              {item.duree_estimee && (
                <Text className="text-xs text-gray-500">⏱ {item.duree_estimee} min</Text>
              )}
              {item.distance_km && (
                <Text className="text-xs text-gray-500">📏 {item.distance_km} km</Text>
              )}
              <Text className={`text-xs font-medium ${
                item.difficulte === 'facile' ? 'text-green-600' :
                item.difficulte === 'moyen' ? 'text-amber-600' : 'text-red-600'
              }`}>
                {item.difficulte}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
```

## Livrable
- Liste des parcours depuis le backend
- 3 boutons de génération automatique (randonnée/culture/histoire)
- Création de parcours personnalisé fonctionnelle

## Critères de notation
| Critère | Points |
|---------|--------|
| Liste parcours depuis API | 2 |
| Génération automatique (3 profils) | 4 |
| Création manuelle avec étapes | 2 |
| Gestion authentification (non connecté → alerte) | 2 |
| **Total** | **10** |

---

---

# TP 6 — Mode Hors-ligne
**Durée :** 4h

## Objectifs
- Télécharger les données d'une wilaya via `GET /api/patrimoine/mobile/offline/:wilayaId`
- Les stocker localement avec `expo-sqlite`
- Afficher les données même sans connexion internet
- Synchroniser au retour en ligne

## Installation

```bash
npx expo install expo-sqlite @react-native-community/netinfo
```

### 6.1 — Service de stockage local `src/services/offline.service.ts`

```typescript
import * as SQLite from 'expo-sqlite';
import { patrimoineApi } from '@/api/patrimoine.api';

const db = SQLite.openDatabaseSync('explore-algerie.db');

export const offlineService = {
  init: () => {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS sites_offline (
        id_lieu INTEGER PRIMARY KEY,
        data TEXT NOT NULL,
        wilaya_id INTEGER,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS sync_meta (
        wilaya_id INTEGER PRIMARY KEY,
        last_sync TEXT
      );
    `);
  },

  downloadWilaya: async (wilayaId: number) => {
    const { data } = await patrimoineApi.offlineWilaya(wilayaId);
    const sites = data.data ?? [];

    // Insérer/remplacer en batch
    db.withTransactionSync(() => {
      for (const site of sites) {
        db.runSync(
          'INSERT OR REPLACE INTO sites_offline (id_lieu, data, wilaya_id) VALUES (?, ?, ?)',
          [site.id_lieu, JSON.stringify(site), wilayaId]
        );
      }
      db.runSync(
        'INSERT OR REPLACE INTO sync_meta (wilaya_id, last_sync) VALUES (?, ?)',
        [wilayaId, new Date().toISOString()]
      );
    });

    return sites.length;
  },

  getSitesWilaya: (wilayaId: number) => {
    const rows = db.getAllSync<{ data: string }>(
      'SELECT data FROM sites_offline WHERE wilaya_id = ?',
      [wilayaId]
    );
    return rows.map(r => JSON.parse(r.data));
  },

  getLastSync: (wilayaId: number): string | null => {
    const row = db.getFirstSync<{ last_sync: string }>(
      'SELECT last_sync FROM sync_meta WHERE wilaya_id = ?',
      [wilayaId]
    );
    return row?.last_sync ?? null;
  },
};
```

## Livrable
- Téléchargement wilaya fonctionnel
- Données accessibles hors-ligne
- Indicateur de date de dernière synchronisation

## Critères de notation
| Critère | Points |
|---------|--------|
| Téléchargement et stockage SQLite | 4 |
| Affichage hors-ligne | 3 |
| Indicateur connexion + sync auto | 3 |
| **Total** | **10** |

---

---

# TP 7 — QR Code, Partage & Notifications
**Durée :** 3h

## Objectifs
- Scanner un QR Code pour ouvrir un site patrimoine
- Partager un site via le système natif iOS/Android
- Recevoir des notifications push pour les événements proches

## Installation

```bash
npx expo install expo-camera expo-sharing expo-notifications
```

### 7.1 — Scanner QR Code

```tsx
import { CameraView, useCameraPermissions } from 'expo-camera';
import { apiClient } from '@/api/client';
import { useRouter } from 'expo-router';

export function QRScanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();

  const handleScan = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      // Envoyer le code au backend pour résolution
      const res = await apiClient.post('/patrimoine/mobile/qr-scan', { code: data });
      if (res.data.success && res.data.data?.id_lieu) {
        router.push(`/patrimoine/${res.data.data.id_lieu}`);
      }
    } catch {
      Alert.alert('QR Code non reconnu');
    } finally {
      setTimeout(() => setScanned(false), 2000);
    }
  };

  if (!permission?.granted) {
    return (
      <View className="flex-1 items-center justify-center">
        <Pressable className="bg-primary px-6 py-3 rounded-xl" onPress={requestPermission}>
          <Text className="text-white font-medium">Autoriser la caméra</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <CameraView
      className="flex-1"
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      onBarcodeScanned={handleScan}
    />
  );
}
```

### 7.2 — Partage natif

```typescript
import * as Sharing from 'expo-sharing';

export const shareSite = async (site: SitePatrimoine) => {
  const nom = typeof site.nom === 'string' ? site.nom : site.nom?.fr || '';
  const url = `https://explore-algerie.dz/patrimoine/${site.id_lieu}`;

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(url, {
      dialogTitle: `Découvrez ${nom}`,
    });
  }
};
```

## Livrable
- Scanner QR Code → ouvre la bonne fiche
- Bouton partage natif dans la fiche détail

## Critères de notation
| Critère | Points |
|---------|--------|
| Scanner QR Code + appel API | 5 |
| Partage natif | 3 |
| Gestion permissions caméra | 2 |
| **Total** | **10** |

---

---

## Livrable final — Grille d'évaluation globale

| TP | Thème | Points |
|----|-------|--------|
| TP 1 | Setup + Navigation | 10 |
| TP 2 | Authentification JWT | 10 |
| TP 3 | Liste & Détail | 10 |
| TP 4 | Carte GPS | 10 |
| TP 5 | Parcours intelligents | 10 |
| TP 6 | Mode hors-ligne | 10 |
| TP 7 | QR Code + Partage | 10 |
| **Bonus** | Code propre, TypeScript strict, gestion erreurs | +10 |
| **Total** | | **70 (+10)** |

---

## Ressources

- [Documentation Expo](https://docs.expo.dev/)
- [Expo Router](https://expo.github.io/router/)
- [react-native-maps](https://github.com/react-native-maps/react-native-maps)
- [React Query](https://tanstack.com/query/latest)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [NativeWind](https://www.nativewind.dev/)

---

## Configuration du repo étudiant

> Le repo GitHub est déjà créé et accessible ici :  
> 👉 **[https://github.com/Amazighiahub/explore-algerie-mobile](https://github.com/Amazighiahub/explore-algerie-mobile)**

Suivre les instructions du **TP 0** pour initialiser et pousser le projet.

```bash
# Résumé rapide (détail dans TP 0)
git clone https://github.com/Amazighiahub/explore-algerie-mobile.git
cd explore-algerie-mobile
npx create-expo-app@latest . --template tabs
echo "EXPO_PUBLIC_API_URL=http://[IP_SERVEUR]:3001/api" > .env.local
git add .
git commit -m "feat: init Expo project with tabs template"
git push origin main
```

> ⚠️ Le backend (EventCulture) reste dans son propre repo — ne pas y toucher.  
> Consommer uniquement l'API via l'URL configurée dans `.env.local`.
