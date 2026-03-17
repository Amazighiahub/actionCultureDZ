# Contribuer a EventCulture

## Prerequis

- Node.js 20+, MySQL 8+, Git
- VS Code recommande avec : ESLint, Prettier, TypeScript, Tailwind CSS IntelliSense

## Installation

```bash
git clone https://github.com/Amazighiahub/actionCultureDZ.git
cd actionCultureDZ

# Backend
cd backend && npm install && cp .env.example .env
node scripts/generateSecret.js   # copier le secret dans .env

# Frontend
cd ../frontEnd && npm install

# Demarrer (2 terminaux)
cd backend && npm run dev       # Terminal 1
cd frontEnd && npm run dev      # Terminal 2
```

## Workflow Git

| Branche | Usage |
|---------|-------|
| `main` | Production stable |
| `develop` | Developpement actif |
| `feature/*` | Nouvelles fonctionnalites |
| `fix/*` | Corrections de bugs |
| `hotfix/*` | Corrections urgentes production |

```bash
# 1. Creer une branche depuis develop
git checkout develop && git pull
git checkout -b feature/ma-feature

# 2. Developper, commiter
git add fichiers_modifies
git commit -m "feat(scope): description"

# 3. Pousser et creer une PR vers develop
git push origin feature/ma-feature
```

### Convention de commits

Format : `type(scope): description`

| Type | Usage |
|------|-------|
| `feat` | Nouvelle fonctionnalite |
| `fix` | Correction de bug |
| `docs` | Documentation |
| `refactor` | Refactoring sans changement de comportement |
| `test` | Ajout/modification de tests |
| `perf` | Optimisation de performance |
| `chore` | Maintenance, dependances |

Exemples :
```
feat(auth): ajouter verification email
fix(events): corriger pagination
test: ajouter tests controller upload
```

## Tests

```bash
# Backend : 298 tests unitaires
cd backend && npm test

# Frontend : tests unitaires
cd frontEnd && npm test

# Frontend : tests E2E
cd frontEnd && npm run e2e
```

Ecrire un test pour tout nouveau service/controller. Pattern :
```javascript
// backend/tests/unit/monService.test.js
const mockRepo = { findAll: jest.fn() };
jest.mock('../../services/serviceContainer', () => ({ monService: mockRepo }));
const controller = require('../../controllers/monController');

describe('MonController', () => {
  it('should ...', async () => { /* ... */ });
});
```

## Conventions de code

### Nommage

| Element | Convention | Exemple |
|---------|-----------|---------|
| Variables/fonctions | camelCase | `maVariable`, `getUser()` |
| Composants React | PascalCase | `UserCard`, `EventList` |
| Fichiers composants | PascalCase.tsx | `UserCard.tsx` |
| Fichiers backend | camelCase.js | `userService.js` |
| Routes API | kebab-case | `/api/v2/users/profile-photo` |
| Tables DB | snake_case | `oeuvre_categorie` |

### Backend (Node.js/Express)

Architecture : **Controller -> Service -> Repository**

```javascript
// Controller : validation + formatting de la reponse
async list(req, res) {
  const { page, limit } = req.query;
  const result = await this.evenementService.findPublished({ page, limit });
  res.json({ success: true, ...result });
}

// Service : logique metier
async findPublished(options) {
  return this.repository.findPublished(options);
}

// Repository : acces DB avec includes
async findPublished(options) {
  return this.model.findAndCountAll({
    where: { statut: 'publie' },
    include: this._defaultIncludes(),
    ...options
  });
}
```

- Utiliser `async/await` (jamais `.then()`)
- Erreurs metier via `throw this._validationError('message')` ou `this._notFoundError(id)`
- Jamais de `console.log` — utiliser `logger` (Winston)

### Frontend (React/TypeScript)

```tsx
// Composant type avec props typees
interface UserCardProps {
  user: User;
  onSelect?: (id: number) => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, onSelect }) => {
  const { td } = useTranslateData();   // donnees multilingues de la DB
  const { t } = useTranslation();       // textes d'interface

  return (
    <Card>
      <h3>{td(user.nom)}</h3>
      <Button onClick={() => onSelect?.(user.id)}>
        {t('common.select')}
      </Button>
    </Card>
  );
};
```

- Typer les props (pas de `any`)
- React Query pour les appels API (`useQuery`, `useMutation`)
- `t()` pour les textes d'interface, `td()` pour les donnees DB multilingues
- Classes Tailwind + `cn()` pour les classes conditionnelles
- Support RTL : utiliser `rtl:` pour le layout directionnel

### i18n

Jamais de texte en dur. Toujours les 5 langues (ou au minimum `fr`) :

```json
// frontEnd/src/i18n/locales/fr/translation.json
{ "event.register": "S'inscrire" }

// frontEnd/src/i18n/locales/ar/translation.json
{ "event.register": "التسجيل" }
```

Structure des cles par module : `common.*`, `auth.*`, `event.*`, `patrimoine.*`, etc.

## Securite — regles obligatoires

1. **Secrets** : jamais dans le code, toujours dans `.env`
2. **Validation** : valider toutes les entrees utilisateur (express-validator / Zod)
3. **Auth** : verifier les permissions cote backend meme si le frontend masque le bouton
4. **SQL** : utiliser Sequelize ORM exclusivement (jamais de SQL brut avec des variables user)
5. **Upload** : le backend valide MIME + extension + magic number
6. **XSS** : React echappe par defaut, ne jamais utiliser `dangerouslySetInnerHTML` sans sanitizer

## FAQ

**Comment ajouter un endpoint API ?**
1. Creer/modifier le service dans `backend/services/`
2. Creer/modifier le controller dans `backend/controllers/`
3. Ajouter la route dans `backend/routes/`
4. Creer le service frontend dans `frontEnd/src/services/`

**Comment ajouter une page frontend ?**
1. Creer le composant dans `frontEnd/src/pages/MaPage.tsx`
2. Ajouter la route dans `App.tsx`
3. Ajouter les traductions dans les 5 fichiers i18n

**Erreur "Objects are not valid as React child" ?**
Vous affichez un champ multilingue sans le traduire :
```tsx
// Faux : <h1>{event.nom}</h1>         — nom est {fr: "...", ar: "..."}
// Correct : <h1>{td(event.nom)}</h1>  — td() extrait la bonne langue
```
