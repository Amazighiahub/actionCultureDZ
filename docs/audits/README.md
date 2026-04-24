# Audits — EventCulture / Action Culture DZ

Historique des audits techniques du projet, classés du plus récent au plus ancien.
Chaque audit est une **photo à l'instant T** ; plusieurs de ses points ont pu être corrigés depuis. Consulter le `CHANGELOG.md` et `git log` pour l'état actuel.

## Index chronologique

| Date | Fichier | Périmètre | Statut |
|---|---|---|---|
| **avril 2026 (it. 2)** | [`AUDIT_COMPLET_2026-04.md`](./AUDIT_COMPLET_2026-04.md) | Monorepo complet (backend + frontend + devops). Suite directe de `AUDIT_COMPLET_2026.md`, compare avec le précédent et liste les points restants. | Référence active |
| **avril 2026** | [`AUDIT_COMPLET_2026.md`](./AUDIT_COMPLET_2026.md) | Monorepo complet (architecture, sécurité, perf, qualité, devops, tests). | Sert de base au plan en lots (Sprints 1-3). Majorité des points Sprint 1 et Lot 6 traités. |
| **mars 2026** | [`AUDIT_FRONTEND.md`](./AUDIT_FRONTEND.md) | Frontend React/Vite (qualité code, TS, bundle, a11y, i18n, sécurité client). | Historique |
| **mars 2026** | [`PERFORMANCE_AUDIT.md`](./PERFORMANCE_AUDIT.md) | Backend Node/Express + Sequelize/Redis (profils, requêtes, memory leaks). | Historique |
| **mars 2026** | [`AUDIT_PRODUCTION_COMPLET.md`](./AUDIT_PRODUCTION_COMPLET.md) | Préparation production (archi, sécurité, perf, infra). | Historique (remplacé par `AUDIT_COMPLET_2026*`) |
| **mars 2025** | [`AUDIT_TECHNIQUE_PRODUCTION.md`](./AUDIT_TECHNIQUE_PRODUCTION.md) | Audit technique initial préparation prod, standards entreprise. | Historique (le plus ancien) |

## Audits thématiques (dans `docs/`)

Ces audits restent dans `docs/` car ils couvrent des angles métier ou conformité spécifiques plutôt qu'un audit technique général :

- [`docs/AUDIT_RGPD_SECURITE_2026.md`](../AUDIT_RGPD_SECURITE_2026.md) — Conformité RGPD
- [`docs/AUDIT_BUGS_2026.md`](../AUDIT_BUGS_2026.md) — Bugs identifiés
- [`docs/AUDIT_MIGRATION_SERVICE_REPO_DTO.md`](../AUDIT_MIGRATION_SERVICE_REPO_DTO.md) — Migration vers pattern Service/Repository/DTO
- [`docs/AUDIT_EVENEMENTS_PARTICIPANTS_PROGRAMMES.md`](../AUDIT_EVENEMENTS_PARTICIPANTS_PROGRAMMES.md) — Module événements

## Convention pour les futurs audits

- Créer sous `docs/audits/AUDIT_<SCOPE>_<YYYY-MM>.md`
- Ajouter une ligne dans le tableau ci-dessus (date, scope, statut)
- Garder les audits historiques même après correction des points : ils documentent l'évolution du projet
