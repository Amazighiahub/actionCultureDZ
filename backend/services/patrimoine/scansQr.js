/**
 * Scans du QR code d'un site du patrimoine (audit V11 OUT-12, accord de la responsable : sans adresse IP).
 *
 * Le QR imprimé mène à la fiche avec « ?src=qr » ; la fiche signale le scan une fois, puis retire le
 * marqueur de son adresse (un rechargement ne recompte pas). Rien sur la personne n'est gardé : ni
 * compte, ni adresse IP, ni navigateur — seulement la date du scan. Tables existantes qr_codes et
 * qr_scans (un code par site, « lieu-<id> », créé au premier scan).
 */
const { Op } = require('sequelize');

const codeDuLieu = (idLieu) => `lieu-${idLieu}`;

/** Enregistre un scan ; faux si le site n'existe pas ou n'est pas publié */
async function enregistrerScan(models, idLieu, urlDestination) {
  const { Lieu, QRCode, QRScan } = models;
  if (!Lieu || !QRCode || !QRScan) return false;
  const lieu = await Lieu.findOne({ where: { id_lieu: idLieu, statut: 'publie' }, attributes: ['id_lieu'] });
  if (!lieu) return false;
  const [code] = await QRCode.findOrCreate({
    where: { code_unique: codeDuLieu(idLieu) },
    defaults: { id_lieu: idLieu, code_unique: codeDuLieu(idLieu), url_destination: String(urlDestination).slice(0, 500), actif: true }
  });
  await QRScan.create({
    id_qr_code: code.id_qr_code, id_user: null, ip_address: null, user_agent: null,
    device_type: null, is_unique: true, date_scan: new Date()
  });
  return true;
}

/** Nombre de scans : en tout et sur les 30 derniers jours */
async function statistiques(models, idLieu) {
  const { QRCode, QRScan } = models;
  if (!QRCode || !QRScan) return { total: 0, trente_jours: 0 };
  const code = await QRCode.findOne({ where: { code_unique: codeDuLieu(idLieu) }, attributes: ['id_qr_code'] });
  if (!code) return { total: 0, trente_jours: 0 };
  const depuis = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [total, trenteJours] = await Promise.all([
    QRScan.count({ where: { id_qr_code: code.id_qr_code } }),
    QRScan.count({ where: { id_qr_code: code.id_qr_code, date_scan: { [Op.gte]: depuis } } })
  ]);
  return { total, trente_jours: trenteJours };
}

module.exports = { enregistrerScan, statistiques, codeDuLieu };
