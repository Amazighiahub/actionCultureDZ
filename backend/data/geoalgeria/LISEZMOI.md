# Lieux GeoAlgeria (import de l'administration)

`lieux.json` contient les sites historiques, monuments, parcs et réserves nommés d'OpenStreetMap (téléchargés par le
serveur Overpass, 17 novembre 2026), complétés par les sites Wikidata de `@geoalgeria/tourisme` absents d'OpenStreetMap.
Sans les attractions (manèges, quartiers, faux points : décision de la responsable). Préparés par
`scripts/geoalgeria/preparerLieux.js`. Chaque lieu est rattaché à la commune la plus proche, d'après le paquet
`geoalgeria`.

**Licences**
- Points venant d'OpenStreetMap : ODbL 1.0, © contributeurs OpenStreetMap (https://www.openstreetmap.org/copyright).
  La source est écrite sur chaque fiche importée, dans les « références ».
- Points venant de Wikidata : CC0.
- Communes : compilation sous licence MIT ; les positions des centres de commune venant d'OpenStreetMap sont sous ODbL.

**Mettre à jour**
Téléchargez les deux paquets (`npm pack @geoalgeria/tourisme geoalgeria`), décompressez-les dans un dossier à part
(ne lancez pas leur code), puis :

    node scripts/geoalgeria/preparerLieux.js <dossier tourisme/package> <dossier geoalgeria/package> <dossier des tuiles Overpass>

Les tuiles Overpass (tuile1.json…) sont des réponses de https://overpass-api.de/api/interpreter, une par morceau de
l'Algérie, à la requête : `nwr["historic"][~"^name(:fr|:ar)?$"~"."]; nwr["boundary"~"^(national_park|protected_area)$"]["name"];
nwr["leisure"="nature_reserve"]["name"]; out center tags;` (serveur public : quelques requêtes espacées, jamais en boucle).

**Contrôles de qualité (2026-11-19)**
- Frontières : un lieu n'est gardé que s'il est à l'intérieur des contours des 69 wilayas (paquet geoalgeria,
  `data/geojson/wilaya-boundaries.geojson`), ou à moins de 2 km de la côte. Sa commune est cherchée dans sa wilaya.
  Les tuiles Overpass étant des rectangles, 600 lieux d'Espagne, de Tunisie, de Libye, du Maroc, du Mali et du Niger
  étaient sinon rattachés à une commune algérienne.
- `noms.json` : deuxième langue (arabe ou français) et noms corrigés (majuscules, accents, mots étrangers), pour
  chaque lieu qui n'avait qu'une langue. Sources : Wikidata quand le lieu y a une fiche, sinon traduction relue
  (noms propres transcrits, mots communs traduits). Un nom jugé douteux n'est pas pré-coché.
- À l'import (services/patrimoine/importGeoAlgeria.js) : un nom générique (« Ksar », « Ruines ») reçoit sa commune
  (« Ksar de Tamentit », « قصر تمنطيط ») ; banques, cités, ronds-points et écoles primaires sont écartés.
