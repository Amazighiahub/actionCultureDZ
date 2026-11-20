/**
 * Anti-retour (2026-11-20) : la carte d'exploration est gardée 5 min sur le serveur ; toute écriture qui la change
 * (lieu créé, modifié, supprimé, publié, importé, photo, version restaurée) l'efface, les écritures fréquentes sans
 * effet sur elle (scan d'un QR code, note, favori, textes de la fiche) ne l'effacent pas.
 */
const { ECRITURES_CARTE } = require('../../routes/patrimoineRoutes');

test('écritures qui effacent la carte en cache', () => {
  for (const p of ['/', '/12', '/12/medias', '/12/medias/4', '/12/historique/3/restaurer', '/import-geoalgeria', '/import-releve', '/admin/brouillons', '/propositions/5']) {
    expect([p, ECRITURES_CARTE.test(p)]).toEqual([p, true]);
  }
  for (const p of ['/12/scan-qr', '/mobile/qr-scan', '/12/noter', '/12/favoris', '/12/detail', '/12/horaires']) {
    expect([p, ECRITURES_CARTE.test(p)]).toEqual([p, false]);
  }
});
