# Lieux GeoAlgeria (import de l'administration)

`lieux.json` contient les sites historiques, parcs et attractions du paquet `@geoalgeria/tourisme`, préparés par
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

    node scripts/geoalgeria/preparerLieux.js <dossier tourisme/package> <dossier geoalgeria/package>
