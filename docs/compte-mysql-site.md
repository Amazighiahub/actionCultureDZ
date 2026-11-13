# Compte MySQL du site aux droits réduits

Audit V11, BDD-20.

## Pourquoi

Aujourd'hui, le site se connecte à la base avec un compte qui a **tous les droits** :
- créer et supprimer des tables ;
- en changer la structure.

Si une faille permettait un jour d'envoyer une requête SQL à la place du site, elle pourrait effacer des tables entières.

Avec un compte **réduit**, le site peut seulement :
- lire des lignes ;
- en ajouter ;
- les modifier ;
- les supprimer.

Il ne peut ni créer, ni modifier, ni supprimer une table. Les migrations, qui changent la structure, gardent le compte habituel.

Le site n'a besoin d'aucun autre droit :
- le verrou des tâches utilise `GET_LOCK`, qui ne demande aucun droit ;
- la création automatique des tables (`DB_SYNC`) est désactivée en production ;
- aucune table temporaire, procédure ou déclencheur n'est utilisé.

## Comment c'est câblé

Dans `docker-compose.prod.yml`, service `backend` :

| Variable vue par le site | Valeur |
|---|---|
| `DB_USER` / `DB_PASSWORD` | `DB_APP_USER` / `DB_APP_PASSWORD` du `.env` s'ils existent, sinon `DB_USER` / `DB_PASSWORD` comme avant |
| `DB_MIGRATE_USER` / `DB_MIGRATE_PASSWORD` | `DB_USER` / `DB_PASSWORD` du `.env`, lus seulement par `sequelize-cli` (`backend/config/config.js`) |

**Tant que `DB_APP_USER` n'est pas dans le `.env`, rien ne change.**

## Mise en place sur le serveur

1. **Se placer dans le dossier du site**, celui qui contient `docker-compose.prod.yml` et `.env`.

2. **Créer le compte.** Le mot de passe est généré sur le serveur et n'est jamais affiché :

   ```bash
   NOUVEAU=$(openssl rand -base64 24 | tr -d '/+=')
   docker exec -i -e NOUVEAU="$NOUVEAU" eventculture-mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" 2>/dev/null <<EOF
   CREATE USER IF NOT EXISTS "taladz_app"@"%" IDENTIFIED BY "$NOUVEAU";
   GRANT SELECT, INSERT, UPDATE, DELETE ON \`$MYSQL_DATABASE\`.* TO "taladz_app"@"%";
   SHOW GRANTS FOR "taladz_app"@"%";
   EOF'
   ```

   La dernière ligne du résultat doit être :

   ```
   GRANT SELECT, INSERT, UPDATE, DELETE ON `<base>`.* TO `taladz_app`@`%`
   ```

3. **L'ajouter au `.env`**, dans la même fenêtre que l'étape 2 : la variable `NOUVEAU` y existe encore.

   ```bash
   printf 'DB_APP_USER=taladz_app\nDB_APP_PASSWORD=%s\n' "$NOUVEAU" >> .env
   unset NOUVEAU
   ```

4. **Redémarrer le site** avec le nouveau compte :

   ```bash
   docker compose -f docker-compose.prod.yml up -d --no-deps backend
   ```

5. **Vérifier** :

   ```bash
   docker exec eventculture-backend sh -c 'echo "compte du site : $DB_USER"'
   curl -s -o /dev/null -w "%{http_code}\n" https://taladz.com/api/health
   ```

   Résultat attendu :
   - « compte du site : taladz_app » ;
   - le code 200.

   Ouvrez aussi le site et une page d'événement.

## Revenir en arrière

Retirer les deux lignes `DB_APP_USER` et `DB_APP_PASSWORD` du `.env`, puis relancer :

```bash
docker compose -f docker-compose.prod.yml up -d --no-deps backend
```

Le site reprend le compte habituel. Le compte `taladz_app` peut rester, il ne gêne pas.

## À savoir

- La base n'est joignable que depuis les conteneurs du serveur : aucun port MySQL n'est ouvert sur Internet. Le compte `root@'%'` n'est donc pas accessible de l'extérieur.
- Les scripts d'outillage qui recréent la base (`reset-database`, `init-database`) ne marchent plus avec le compte du site : c'est voulu. Ils restent possibles avec le compte habituel.
