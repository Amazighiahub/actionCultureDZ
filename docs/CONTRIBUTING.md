# Guide de Contribution - EventCulture

## Introduction

Ce guide est destiné aux développeurs qui rejoignent le projet EventCulture. Il couvre les conventions de code, le workflow de développement, et les bonnes pratiques.

---

## Prérequis

### Environnement de développement

- **Node.js** 18+ (LTS recommandé)
- **MySQL** 8+
- **Git**
- **VS Code** (recommandé) avec extensions:
  - ESLint
  - Prettier
  - TypeScript
  - Tailwind CSS IntelliSense

### Installation initiale

```bash
# Cloner le repository
git clone https://github.com/votre-org/eventculture.git
cd eventculture

# Backend
cd backend
cp .env.example .env
npm install

# Générer le secret JWT
node scripts/generateSecret.js
# Copier le secret dans .env

# Frontend
cd ../frontEnd
cp .env.example .env
npm install

# Démarrer les serveurs de développement
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontEnd && npm run dev
```

---

## Structure du projet

```
eventculture/
├── backend/           # API Node.js/Express
├── frontEnd/          # Application React
├── docs/              # Documentation
│   ├── README.md      # Vue d'ensemble
│   ├── ARCHITECTURE.md # Architecture détaillée
│   ├── API.md         # Documentation API
│   ├── FRONTEND.md    # Guide frontend
│   └── CONTRIBUTING.md # Ce fichier
└── PRODUCTION_CHECKLIST.md
```

---

## Workflow Git

### Branches

| Branche | Description |
|---------|-------------|
| `main` | Production stable |
| `develop` | Développement actif |
| `feature/*` | Nouvelles fonctionnalités |
| `fix/*` | Corrections de bugs |
| `hotfix/*` | Corrections urgentes production |

### Workflow

1. **Créer une branche** depuis `develop`:
```bash
git checkout develop
git pull origin develop
git checkout -b feature/nom-de-la-feature
```

2. **Développer** et faire des commits réguliers:
```bash
git add .
git commit -m "feat: description du changement"
```

3. **Pousser** et créer une Pull Request:
```bash
git push origin feature/nom-de-la-feature
# Créer la PR sur GitHub vers develop
```

4. **Review et merge** après validation

### Convention de commits

Format: `type(scope): description`

| Type | Description |
|------|-------------|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `docs` | Documentation |
| `style` | Formatage (pas de changement de code) |
| `refactor` | Refactoring |
| `test` | Ajout/modification de tests |
| `chore` | Maintenance, dépendances |

**Exemples:**
```
feat(auth): ajouter vérification email
fix(events): corriger pagination des événements
docs(api): documenter endpoint patrimoine
refactor(hooks): simplifier useTranslateData
```

---

## Conventions de code

### TypeScript/JavaScript

```typescript
// ✅ Nommage
const maVariable = 'value';           // camelCase pour variables
const MaConstante = 'VALUE';          // PascalCase pour constantes globales
function maFonction() {}              // camelCase pour fonctions
const MonComposant = () => {};        // PascalCase pour composants React
interface MonInterface {}             // PascalCase pour types/interfaces

// ✅ Types explicites
function getUser(id: number): Promise<User> {
  // ...
}

// ✅ Async/await plutôt que .then()
const fetchData = async () => {
  try {
    const data = await api.get('/endpoint');
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// ✅ Destructuring
const { nom, email } = user;
const { t } = useTranslation();

// ✅ Fonctions fléchées pour les callbacks
users.map(user => user.name);
```

### React/JSX

```tsx
// ✅ Composant fonctionnel typé
interface UserCardProps {
  user: User;
  onSelect?: (id: number) => void;
  showAvatar?: boolean;
}

const UserCard: React.FC<UserCardProps> = ({
  user,
  onSelect,
  showAvatar = true
}) => {
  const { td } = useTranslateData();

  return (
    <Card>
      {showAvatar && <Avatar src={user.avatar} />}
      <h3>{td(user.nom)}</h3>
      <Button onClick={() => onSelect?.(user.id)}>
        Sélectionner
      </Button>
    </Card>
  );
};

// ✅ Export nommé (pas default)
export { UserCard };
```

### CSS/Tailwind

```tsx
// ✅ Classes Tailwind ordonnées
<div className="
  flex items-center justify-between    // Layout
  p-4 mx-auto                          // Spacing
  bg-white rounded-lg shadow           // Apparence
  hover:bg-gray-50                     // États
  transition-colors duration-200       // Animation
">

// ✅ Support RTL avec classes directionnelles
<div className="ml-4 rtl:mr-4 rtl:ml-0">
  {/* Marge gauche en LTR, droite en RTL */}
</div>

// ✅ Classes conditionnelles avec cn()
import { cn } from '@/lib/utils';

<Button className={cn(
  "base-class",
  isActive && "active-class",
  isDisabled && "opacity-50 cursor-not-allowed"
)}>
```

### Backend (Node.js/Express)

```javascript
// ✅ Controller pattern
const getEvenements = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, wilaya_id } = req.query;

    const result = await Evenement.findAndCountAll({
      where: wilaya_id ? { id_wilaya: wilaya_id } : {},
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: result.count,
        page: parseInt(page),
        pages: Math.ceil(result.count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// ✅ Validation avec express-validator
const validateEvenement = [
  body('nom_evenement.fr')
    .notEmpty()
    .withMessage('Le nom est requis'),
  body('date_debut')
    .isISO8601()
    .withMessage('Date invalide'),
  handleValidationErrors
];
```

---

## Internationalisation

### Règles i18n

1. **Jamais de texte en dur** dans le code:
```tsx
// ❌ Incorrect
<Button>Connexion</Button>

// ✅ Correct
<Button>{t('auth.login.submit')}</Button>
```

2. **Séparer UI et données**:
```tsx
const { t } = useTranslation();      // Textes interface
const { td } = useTranslateData();   // Données BDD

<Label>{t('event.name')}</Label>     // "Nom de l'événement"
<Value>{td(event.nom_evenement)}</Value>  // "Festival de Timgad"
```

3. **Structure des clés** par module:
```json
{
  "common": { "save": "Enregistrer", "cancel": "Annuler" },
  "auth": { "login": {...}, "register": {...} },
  "event": { "title": "Événements", "register": "S'inscrire" }
}
```

4. **Toujours fournir les 5 langues** (ou au moins fr):
```json
// fr/translation.json
"greeting": "Bonjour"

// ar/translation.json
"greeting": "مرحبا"

// en/translation.json
"greeting": "Hello"

// tz-ltn/translation.json
"greeting": "Azul"

// tz-tfng/translation.json
"greeting": "ⴰⵣⵓⵍ"
```

---

## Gestion des erreurs

### Frontend

```tsx
// ✅ Avec React Query
const { data, isLoading, error } = useQuery({
  queryKey: ['evenements'],
  queryFn: () => evenementService.getAll()
});

if (isLoading) return <LoadingSkeleton />;
if (error) return <ErrorMessage error={error} />;

// ✅ Avec try/catch
const handleSubmit = async (data) => {
  try {
    const result = await service.create(data);
    if (result.success) {
      toast.success(t('common.success'));
    } else {
      toast.error(result.error);
    }
  } catch (error) {
    toast.error(t('common.error'));
    console.error(error);
  }
};
```

### Backend

```javascript
// ✅ Utiliser AppError pour les erreurs métier
const { AppError } = require('../utils/AppError');

if (!evenement) {
  throw new AppError('Événement non trouvé', 404);
}

if (!user.canEdit(evenement)) {
  throw new AppError('Non autorisé', 403);
}

// ✅ Le middleware errorHandler gère automatiquement
// Les erreurs sont loguées et formatées
```

---

## Sécurité

### Règles obligatoires

1. **Ne jamais stocker de secrets dans le code**
```javascript
// ❌ Incorrect
const apiKey = 'sk-123456789';

// ✅ Correct
const apiKey = process.env.API_KEY;
```

2. **Valider toutes les entrées utilisateur**
```javascript
// Backend avec express-validator
body('email').isEmail().normalizeEmail(),
body('password').isLength({ min: 8 })
```

3. **Utiliser les middlewares d'authentification**
```javascript
router.post('/evenements',
  authMiddleware,      // Vérifie le JWT
  requireRole('Pro'),  // Vérifie le rôle
  validateEvenement,   // Valide les données
  createEvenement
);
```

4. **Échapper les données en sortie**
```tsx
// React échappe automatiquement
<p>{user.bio}</p>  // ✅ Safe

// Attention avec dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{__html: content}} />  // ⚠️ Sanitizer d'abord
```

5. **Vérifier les permissions côté backend**
```javascript
// Même si le frontend masque le bouton, vérifier côté serveur
if (evenement.id_user !== req.user.id && !req.user.isAdmin) {
  throw new AppError('Non autorisé à modifier cet événement', 403);
}
```

---

## Tests

### Structure des tests

```
backend/
├── tests/
│   ├── unit/           # Tests unitaires
│   ├── integration/    # Tests d'intégration
│   └── fixtures/       # Données de test

frontEnd/
├── tests/
│   ├── components/     # Tests composants
│   ├── hooks/          # Tests hooks
│   └── utils/          # Tests utilitaires
```

### Exemple de test (Jest)

```typescript
// tests/hooks/useTranslateData.test.ts
describe('useTranslateData', () => {
  it('should translate field based on current language', () => {
    const field = { fr: 'Bonjour', ar: 'مرحبا' };

    // Mock i18n.language = 'ar'
    const { result } = renderHook(() => useTranslateData());

    expect(result.current.td(field)).toBe('مرحبا');
  });

  it('should fallback to fr if translation missing', () => {
    const field = { fr: 'Bonjour' };

    const { result } = renderHook(() => useTranslateData());

    expect(result.current.td(field)).toBe('Bonjour');
  });
});
```

---

## Déploiement

### Checklist pré-déploiement

Voir [PRODUCTION_CHECKLIST.md](../PRODUCTION_CHECKLIST.md) pour la liste complète.

**Points essentiels:**

- [ ] Variables d'environnement configurées
- [ ] JWT_SECRET généré (min 32 caractères)
- [ ] Utilisateur MySQL dédié (pas root)
- [ ] FRONTEND_URL en HTTPS
- [ ] Source maps désactivés
- [ ] `npm audit` vérifié

### Commandes de build

```bash
# Frontend
cd frontEnd
npm run build
# Les fichiers sont dans dist/

# Backend
cd backend
npm run start:safe  # Avec validation des env
```

---

## Ressources

### Documentation

- [Architecture du projet](./ARCHITECTURE.md)
- [Documentation API](./API.md)
- [Guide Frontend](./FRONTEND.md)

### Technologies utilisées

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Query](https://tanstack.com/query/latest)
- [i18next](https://www.i18next.com/)
- [Sequelize](https://sequelize.org/docs/v6/)
- [Express](https://expressjs.com/)

### Support

Pour toute question:
1. Vérifier la documentation existante
2. Consulter les issues GitHub
3. Contacter l'équipe de développement

---

## FAQ

### Comment ajouter une nouvelle page ?

1. Créer le composant dans `frontEnd/src/pages/MaPage.tsx`
2. Ajouter la route dans `App.tsx`
3. Ajouter les traductions nécessaires

### Comment ajouter un nouveau endpoint API ?

1. Créer le controller dans `backend/controllers/`
2. Créer les routes dans `backend/routes/`
3. Enregistrer les routes dans `routes/index.js`
4. Créer le service frontend dans `frontEnd/src/services/`

### Comment ajouter une traduction ?

1. Identifier la clé (ex: `event.newFeature`)
2. Ajouter dans les 5 fichiers de traduction:
   - `i18n/locales/fr/translation.json`
   - `i18n/locales/ar/translation.json`
   - `i18n/locales/en/translation.json`
   - `i18n/locales/tz-ltn/translation.json`
   - `i18n/locales/tz-tfng/translation.json`
3. Utiliser avec `t('event.newFeature')`

### Pourquoi j'ai une erreur "Objects are not valid as React child" ?

C'est généralement causé par l'affichage d'un objet multilingue sans le traduire:

```tsx
// ❌ Cause l'erreur
<h1>{evenement.nom_evenement}</h1>  // nom_evenement est {fr: "...", ar: "..."}

// ✅ Solution
const { td } = useTranslateData();
<h1>{td(evenement.nom_evenement)}</h1>
```
