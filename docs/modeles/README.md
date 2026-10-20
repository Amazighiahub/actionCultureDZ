# Modèles de relevé

## Modele_points_GPS_Taladz.xlsx — points de visite d'un lieu

Pour un village, une ville, un site archéologique ou un musée : une ligne par point à visiter
(porte, maison, grenier, salle…), avec son nom (français, arabe, tamazight), son type, une
description, sa position GPS ou, pour un point intérieur, un repère (« 1er étage, salle 3 »).
La feuille « Mode d'emploi » explique comment relever un point avec un téléphone.
La feuille « Types » aide à choisir le type du lieu et de chaque point (définition, nom en
arabe, exemples) ; les listes déroulantes « Type » y renvoient.

### Import depuis l'administration

Tableau de bord administrateur → Patrimoine → **Importer un relevé Excel** (administrateurs et
modérateurs) :

1. « Télécharger le modèle » pour l'envoyer à l'association (il est servi par le site :
   `/modeles/Modele_points_GPS_Taladz.xlsx`, copie de ce fichier) ;
2. déposer le relevé rempli et choisir le lieu : celui de la feuille « Site » (retrouvé dans sa
   commune s'il existe déjà, sinon créé) ou un lieu déjà sur Tala DZ ;
3. « Vérifier le fichier » : aperçu des points à créer, à mettre à jour, inchangés, et des lignes
   ignorées avec leur raison — rien n'est encore enregistré ;
4. « Importer », puis « Voir le lieu et ses points ».

### Import en ligne de commande

Même logique (`backend/services/patrimoine/importReleve.js`) ; sans `--parent`, le lieu est pris
dans la feuille « Site ». Aperçu, puis import :

```
docker exec eventculture-backend node scripts/import-points-visite.js --parent 4 --fichier /tmp/releve.xlsx
docker exec eventculture-backend node scripts/import-points-visite.js --parent 4 --fichier /tmp/releve.xlsx --execute
```

L'import est relançable : un fichier complété plus tard met à jour les points existants
sans les dupliquer ; une cellule vide n'efface jamais une valeur déjà enregistrée.
