# Modèles de relevé

## Modele_points_GPS_Taladz.xlsx — points de visite d'un lieu

Pour un village, une ville, un site archéologique ou un musée : une ligne par point à visiter
(porte, maison, grenier, salle…), avec son nom (français, arabe, tamazight), son type, une
description, sa position GPS ou, pour un point intérieur, un repère (« 1er étage, salle 3 »).
La feuille « Mode d'emploi » explique comment relever un point avec un téléphone.

Import (lieu principal déjà créé sur Tala DZ, ici le n° 4) — aperçu, puis import :

```
docker exec eventculture-backend node scripts/import-points-visite.js --parent 4 --fichier /tmp/releve.xlsx
docker exec eventculture-backend node scripts/import-points-visite.js --parent 4 --fichier /tmp/releve.xlsx --execute
```

Le script est relançable : un fichier complété plus tard met à jour les points existants
sans les dupliquer ; une cellule vide n'efface jamais une valeur déjà enregistrée.
