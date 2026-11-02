# Plan de reprise et procédure en cas de violation de données

Pour la personne qui administre taladz.com. À relire une fois par an et après tout changement d'hébergeur.

Les objectifs et les délais ci-dessous sont des propositions à valider par le responsable du projet.

## 1. Objectifs

| Objectif | Valeur proposée | Ce que cela veut dire |
|---|---|---|
| Perte de données maximale | 24 heures | Une sauvegarde chaque nuit, plus une avant chaque déploiement |
| Remise en service | 4 heures | Une fois le serveur disponible |

## 2. Ce qu'il faut avoir hors du serveur

Sans ces éléments, une reprise est impossible si le VPS est perdu. Vérifiez chaque année qu'ils sont accessibles.

- Le contenu du fichier `.env` de production, dans un gestionnaire de mots de passe.
- La clé privée `age` qui déchiffre les copies hors serveur. Elle ne doit jamais se trouver sur le VPS.
- Les accès : VPS, registrar du domaine, GitHub, Cloudinary, Brevo, stockage des copies hors serveur.
- La clé SSH de déploiement (secret GitHub Actions), qu'il faudra remplacer sur un nouveau serveur.

## 3. Où se trouvent les données

| Donnée | Emplacement | Sauvegarde |
|---|---|---|
| Base MySQL | Volume Docker du VPS | `scripts/backup.sh` ; copie hors serveur par `scripts/backup-offsite.sh` si elle est activée |
| Fichiers locaux | Volume `backend_uploads` | Archive de nuit dans `scripts/backup.sh` ; pas encore de script de restauration |
| Images et PDF | Cloudinary | **Aucune sauvegarde à ce jour** |
| Code | GitHub | Dépôt |

## 4. Reprise

### Le site est en panne, le serveur répond

1. Regardez l'état : `docker compose -f docker-compose.prod.yml ps`.
2. Lisez le journal du service en erreur : `docker compose -f docker-compose.prod.yml logs --tail=100 backend`.
3. Redémarrez ce service seul : `docker compose -f docker-compose.prod.yml restart backend`.
4. Si la panne suit un déploiement, annulez le commit fautif avec `git revert` et laissez le pipeline redéployer.

### La base est endommagée

1. Prévenez les utilisateurs si la coupure doit durer.
2. Suivez « Restauration (production) » dans `docs/DEPLOYMENT.md`, avec `scripts/restaurer-sauvegarde.sh`.
3. Contrôlez ensuite une connexion, une fiche œuvre et une inscription à un événement.

### Le serveur est perdu

1. Préparez un nouveau VPS avec `scripts/setup-server.sh`.
2. Récupérez le dépôt et replacez le fichier `.env`.
3. Déchiffrez la dernière copie hors serveur avec la clé `age`, puis restaurez-la.
4. Démarrez les services avec `docker compose -f docker-compose.prod.yml up -d`.
5. Pointez le domaine vers le nouveau serveur et vérifiez le certificat.
6. Mettez à jour les secrets GitHub Actions (adresse du serveur, clé SSH).

## 5. Violation de données

Exemples : base copiée, compte administrateur volé, sauvegarde exposée, fuite dans un journal.

1. **Noter l'heure** de la découverte et tout ce qui est constaté. Conservez les journaux, n'effacez rien.
2. **Stopper la fuite** : couper l'accès concerné, changer les mots de passe et les clés touchés.
3. **Évaluer** : quelles données, combien de personnes, quels risques pour elles.
4. **Si le secret JWT ou la base sont touchés** : changer le secret déconnecte tout le monde ; demandez aussi un nouveau mot de passe aux comptes concernés.
5. **Notifier** l'ANPDP et prévenir les personnes concernées. Délai et forme : **à confirmer avec le juriste** selon la loi 18-07. En attendant, visez 72 heures, le délai du RGPD.
6. **Tenir un registre** de l'incident : faits, décisions, personnes prévenues, corrections.

Contact du projet : contact@taladz.com.
