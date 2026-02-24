# Module : Gestion des Œuvres

## Vue d'ensemble
Gestion du catalogue d'œuvres culturelles algériennes : livres, films, albums musicaux, articles, artisanat, art visuel.

## Fichiers clés

**Backend :**
- `routes/oeuvreRoutes.js`, `routes/artisanatRoutes.js`, `routes/articleBlockRoutes.js`
- `routes/v2/oeuvreRoutes.js` — API v2 optimisée
- `controllers/oeuvreController.js`, `controllers/artisanatController.js`, `controllers/articleBlockController.js`
- `controllers/v2/oeuvreControllerV2.js`
- `models/oeuvres/` : `oeuvre.js`, `livre.js`, `film.js`, `albumMusical.js`, `artisanat.js`, `article.js`, `articleBlock.js`, `articleScientifique.js`, `oeuvreArt.js`
- `models/associations/` : `oeuvreCategorie.js`, `oeuvreEditeur.js`, `oeuvreIntervenant.js`, `oeuvreTag.js`, `oeuvreUser.js`
- `services/oeuvre/oeuvreService.js`
- `repositories/oeuvreRepository.js`
- `dto/oeuvre/` : `oeuvreDTO.js`, `createOeuvreDTO.js`, `updateOeuvreDTO.js`
- `routes/admin/adminOeuvresRoutes.js`

**Frontend :**
- `pages/AjouterOeuvre.tsx` — Formulaire multi-étapes
- `pages/Oeuvres.tsx` — Liste/catalogue
- `pages/oeuvreDetail/` — Page détail complète :
  - `OeuvreDetailPage.tsx`, `OeuvreHero.tsx`, `OeuvreInfo.tsx`
  - `OeuvreGallery.tsx`, `OeuvreComments.tsx`, `OeuvreContributeurs.tsx`
  - `OeuvreEvents.tsx`, `RelatedOeuvres.tsx`
  - `StepGeneralInfo.tsx`, `StepCategories.tsx`, `StepDetails.tsx`, `StepMedia.tsx`
- `pages/AjouterArtisanat.tsx`, `pages/Artisanat.tsx`, `pages/ArtisanatDetail.tsx`
- `pages/GestionArtisanat.tsx`
- `components/oeuvre/` — Composants réutilisables
- `pages/admin/AdminOeuvresTab.tsx`

## API Endpoints

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/oeuvres` | Non | Liste paginée + filtres |
| GET | `/api/oeuvres/:id` | Non | Détail complet |
| GET | `/api/oeuvres/search` | Non | Recherche |
| POST | `/api/oeuvres` | Pro | Créer une œuvre |
| PUT | `/api/oeuvres/:id` | Pro | Modifier |
| DELETE | `/api/oeuvres/:id` | Pro | Supprimer |
| GET | `/api/artisanat` | Non | Liste artisanat |
| POST | `/api/artisanat` | Pro | Créer artisanat |

### API v2 (optimisée)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v2/oeuvres` | Liste avec pagination avancée |
| GET | `/api/v2/oeuvres/:id` | Détail avec DTO formatté |

## Types d'œuvres
| Type | Modèle | Champs spécifiques |
|------|--------|-------------------|
| Livre | `livre.js` | ISBN, éditeur, nb_pages, langue |
| Film | `film.js` | durée, réalisateur, année |
| Album Musical | `albumMusical.js` | artiste, nb_pistes, genre |
| Artisanat | `artisanat.js` | matériau, technique, région |
| Art | `oeuvreArt.js` | dimensions, medium, style |
| Article | `article.js` | source, auteur |
| Article Scientifique | `articleScientifique.js` | DOI, journal, reviewers |

## Architecture Service/Repository (v2)
```
Route → Controller → Service (oeuvreService.js)
                       → Repository (oeuvreRepository.js)
                       → DTO (oeuvreDTO.js)
```

## Fonctionnalités
- Formulaire multi-étapes (info générale → catégories → détails → médias)
- Upload images/médias avec validation (taille, type)
- Classification par catégories, genres, tags
- Intervenants (auteurs, réalisateurs, artistes)
- Commentaires et évaluations
- Recherche fulltext multilingue
- Œuvres liées (suggestions)
- QR Code par œuvre

## Tests
- `pages/AjouterOeuvre.test.tsx`
- `pages/AjouterArtisanat.test.tsx`
- `backend/tests/controllers/oeuvreController.test.js`
- `backend/tests/models/oeuvres/oeuvre.test.js`
