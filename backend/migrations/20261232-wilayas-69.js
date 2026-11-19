// Attention : la descente remet les 40 daïras dans leur ancienne wilaya et supprime les 11 nouvelles wilayas
// (seulement si plus rien n'y est rattaché).
'use strict';

/**
 * Migration : nouveau découpage à 69 wilayas (accord de la responsable, 2026-11-19).
 * Onze nouvelles wilayas (59 à 69). Les 39 daïras qui les composent changent de wilaya ; la daïra de Sebdou
 * (Tlemcen) est partagée : El Aricha et El Gor forment la daïra d'El Aricha, dans la wilaya d'El Aricha.
 * Les communes suivent leur daïra, et les lieux, événements et services suivent leur commune.
 * Wilaya de résidence des comptes : recalculée pour ceux dont la commune a changé de wilaya.
 * Organisations : une wilaya sans commune, elles restent inchangées (à revoir à la main si besoin).
 * Données : paquet geoalgeria (découpage à 69), comparé à la base le 2026-11-19. Rejouable.
 */
const NOUVELLES = [
  [59, 'آفلو', 'Aflou'], [60, 'بريكة', 'Barika'], [61, 'القنطرة', 'El Kantara'], [62, 'بئر العاتر', 'Bir El Ater'],
  [63, 'العريشة', 'El Aricha'], [64, 'قصر الشلالة', 'Ksar Chellala'], [65, 'عين وسارة', 'Ain Oussera'],
  [66, 'مسعد', 'Messaad'], [67, 'قصر البخاري', 'Ksar El Boukhari'], [68, 'بوسعادة', 'Bou Saada'],
  [69, 'الأبيض سيدي الشيخ', 'El Abiodh Sidi Cheikh']
];

// [ancienne wilaya, daïra (nom latin de la base), nouvelle wilaya]
const DAIRAS = [
  [3, 'Aflou', 59], [3, 'Brida', 59], [3, 'El Ghicha', 59], [3, 'Gueltat Sidi Saad', 59], [3, 'Oued Morra', 59],
  [5, 'Barika', 60], [5, 'Djezzar', 60], [5, 'Seggana', 60],
  [7, 'Djemorah', 61], [7, 'El Kantara', 61], [7, 'El Outaya', 61],
  [12, 'Bir El Ater', 62], [12, 'Negrine', 62],
  [13, 'Sidi Djillali', 63],
  [14, 'Hamadia', 64], [14, 'Ksar Chellala', 64],
  [17, 'Ain Oussera', 65], [17, 'Birine', 65], [17, 'Had Sahary', 65], [17, 'Sidi Laadjel', 65],
  [17, 'Faidh El Botma', 66], [17, 'Messaad', 66],
  [26, 'Ain Boucif', 67], [26, 'Aziz', 67], [26, 'Chahbounia', 67], [26, 'Chellalat El Adhaoura', 67], [26, 'Ksar El Boukhari', 67], [26, 'Ouled Antar', 67],
  [28, 'Ain El Melh', 68], [28, 'Ben Srour', 68], [28, 'Bousaada', 68], [28, 'Djebel Messaad', 68], [28, 'Khoubana', 68],
  [28, 'Medjedel', 68], [28, 'Ouled Sidi Brahim', 68], [28, 'Sidi Ameur', 68],
  [32, 'Boussemghoun', 69], [32, 'Chellala', 69], [32, 'Labiodh Sidi Cheikh', 69]
];

// Daïra partagée : ces communes de la daïra de Sebdou (13) forment la daïra d'El Aricha (63)
const PARTAGE = { ancienneWilaya: 13, ancienneDaira: 'Sebdou', nouvelleWilaya: 63, daira: ['العريشة', 'El Aricha'], communes: ['El Aricha', 'El Gor'] };

const un = async (qi, sql, replacements, transaction) =>
  (await qi.sequelize.query(sql, { replacements, transaction, type: qi.sequelize.QueryTypes.SELECT }))[0];
const idWilaya = async (qi, code, t) => (await un(qi, 'SELECT id_wilaya FROM wilayas WHERE codeW = :code', { code }, t))?.id_wilaya;

module.exports = {
  NOUVELLES, DAIRAS, PARTAGE,

  async up(queryInterface) {
    const qi = queryInterface;
    await qi.sequelize.transaction(async (t) => {
      // 1. Les onze wilayas (numéro = code, comme les 58 autres)
      for (const [code, nom, ascii] of NOUVELLES) {
        if (await idWilaya(qi, code, t)) continue;
        const libre = !(await un(qi, 'SELECT id_wilaya FROM wilayas WHERE id_wilaya = :code', { code }, t));
        await qi.sequelize.query(
          `INSERT INTO wilayas (${libre ? 'id_wilaya, ' : ''}codeW, nom, wilaya_name_ascii, createdAt, updatedAt)
           VALUES (${libre ? ':code, ' : ''}:code, :nom, :ascii, NOW(), NOW())`,
          { replacements: { code, nom, ascii }, transaction: t });
      }

      // 2. Les daïras entières changent de wilaya ; une daïra introuvable arrête tout (rien n'est modifié)
      const manquantes = [];
      for (const [ancienne, daira, nouvelle] of DAIRAS) {
        const cible = await idWilaya(qi, nouvelle, t);
        const ligne = await un(qi, `SELECT d.id_daira, w.codeW FROM dairas d JOIN wilayas w ON w.id_wilaya = d.wilayaId
          WHERE d.daira_name_ascii = :daira AND w.codeW IN (:codes)`, { daira, codes: [ancienne, nouvelle] }, t);
        if (!ligne) { manquantes.push(`${daira} (${ancienne})`); continue; }
        if (Number(ligne.codeW) !== nouvelle) {
          await qi.sequelize.query('UPDATE dairas SET wilayaId = :cible, updatedAt = NOW() WHERE id_daira = :id',
            { replacements: { cible, id: ligne.id_daira }, transaction: t });
        }
      }
      if (manquantes.length) throw new Error(`Daïras introuvables : ${manquantes.join(', ')}`);

      // 3. Daïra d'El Aricha, faite de deux communes de la daïra de Sebdou
      const cible63 = await idWilaya(qi, PARTAGE.nouvelleWilaya, t);
      let daira = await un(qi, 'SELECT id_daira FROM dairas WHERE daira_name_ascii = :n AND wilayaId = :w', { n: PARTAGE.daira[1], w: cible63 }, t);
      if (!daira) {
        await qi.sequelize.query('INSERT INTO dairas (nom, daira_name_ascii, wilayaId, createdAt, updatedAt) VALUES (:nom, :ascii, :w, NOW(), NOW())',
          { replacements: { nom: PARTAGE.daira[0], ascii: PARTAGE.daira[1], w: cible63 }, transaction: t });
        daira = await un(qi, 'SELECT id_daira FROM dairas WHERE daira_name_ascii = :n AND wilayaId = :w', { n: PARTAGE.daira[1], w: cible63 }, t);
      }
      await qi.sequelize.query(`UPDATE communes c JOIN dairas d ON d.id_daira = c.dairaId JOIN wilayas w ON w.id_wilaya = d.wilayaId
        SET c.dairaId = :nouvelle, c.updatedAt = NOW()
        WHERE w.codeW = :ancienne AND d.daira_name_ascii = :dairaAncienne AND c.commune_name_ascii IN (:communes)`,
      { replacements: { nouvelle: daira.id_daira, ancienne: PARTAGE.ancienneWilaya, dairaAncienne: PARTAGE.ancienneDaira, communes: PARTAGE.communes }, transaction: t });

      // 4. Comptes : wilaya de résidence = celle de leur commune, quand elle a changé
      await qi.sequelize.query(`UPDATE user u JOIN communes c ON c.id_commune = u.id_commune JOIN dairas d ON d.id_daira = c.dairaId
        JOIN wilayas w ON w.id_wilaya = d.wilayaId
        SET u.wilaya_residence = d.wilayaId
        WHERE w.codeW BETWEEN 59 AND 69 AND (u.wilaya_residence IS NULL OR u.wilaya_residence <> d.wilayaId)`, { transaction: t });
    });
  },

  async down(queryInterface) {
    const qi = queryInterface;
    await qi.sequelize.transaction(async (t) => {
      // Communes d'El Aricha rendues à la daïra de Sebdou, puis la daïra d'El Aricha supprimée
      const sebdou = await un(qi, `SELECT d.id_daira FROM dairas d JOIN wilayas w ON w.id_wilaya = d.wilayaId
        WHERE w.codeW = :w AND d.daira_name_ascii = :n`, { w: PARTAGE.ancienneWilaya, n: PARTAGE.ancienneDaira }, t);
      const cible63 = await idWilaya(qi, PARTAGE.nouvelleWilaya, t);
      const aricha = cible63 && await un(qi, 'SELECT id_daira FROM dairas WHERE daira_name_ascii = :n AND wilayaId = :w', { n: PARTAGE.daira[1], w: cible63 }, t);
      if (sebdou && aricha) {
        await qi.sequelize.query('UPDATE communes SET dairaId = :s, updatedAt = NOW() WHERE dairaId = :a', { replacements: { s: sebdou.id_daira, a: aricha.id_daira }, transaction: t });
        await qi.sequelize.query('DELETE FROM dairas WHERE id_daira = :a', { replacements: { a: aricha.id_daira }, transaction: t });
      }
      // Daïras rendues à leur ancienne wilaya
      for (const [ancienne, daira, nouvelle] of DAIRAS) {
        const [a, n] = [await idWilaya(qi, ancienne, t), await idWilaya(qi, nouvelle, t)];
        if (a && n) {
          await qi.sequelize.query('UPDATE dairas SET wilayaId = :a, updatedAt = NOW() WHERE daira_name_ascii = :daira AND wilayaId = :n',
            { replacements: { a, n, daira }, transaction: t });
        }
      }
      // Comptes : wilaya de résidence = celle de leur commune (de nouveau l'ancienne)
      await qi.sequelize.query(`UPDATE user u JOIN wilayas nw ON nw.id_wilaya = u.wilaya_residence JOIN communes c ON c.id_commune = u.id_commune
        JOIN dairas d ON d.id_daira = c.dairaId SET u.wilaya_residence = d.wilayaId WHERE nw.codeW BETWEEN 59 AND 69`, { transaction: t });
      // Wilayas supprimées si plus rien n'y est rattaché
      for (const [code] of NOUVELLES) {
        const id = await idWilaya(qi, code, t);
        if (!id) continue;
        const utilisee = await un(qi, `SELECT (SELECT COUNT(*) FROM dairas WHERE wilayaId = :id) + (SELECT COUNT(*) FROM user WHERE wilaya_residence = :id)
          + (SELECT COUNT(*) FROM organisation WHERE id_wilaya = :id) AS n`, { id }, t);
        if (Number(utilisee.n) === 0) await qi.sequelize.query('DELETE FROM wilayas WHERE id_wilaya = :id', { replacements: { id }, transaction: t });
      }
    });
  }
};
