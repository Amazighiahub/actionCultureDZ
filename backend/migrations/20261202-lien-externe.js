// Attention : la descente supprime la table, donc les liens ajoutés depuis la montée sont perdus.
// Les articles de presse d'origine restent dans user.articles_presse, jamais modifiée ici.
'use strict';

/**
 * Migration : table lien_externe. Un lien (article de presse, YouTube, Instagram, TikTok, Facebook)
 * appartient à un professionnel et peut être rattaché à une œuvre ou à un événement.
 * Les articles de presse déjà saisis y sont copiés. Rejouable.
 */
async function existe(queryInterface) {
  const [lignes] = await queryInterface.sequelize.query(`SELECT TABLE_NAME AS t FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lien_externe'`);
  return lignes.length > 0;
}

const texte = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function lignesDepuisProfil(idUser, valeur) {
  let liste = valeur;
  if (typeof liste === 'string') {
    try { liste = JSON.parse(liste); } catch { return []; }
  }
  if (!Array.isArray(liste)) return [];
  const maintenant = new Date();
  return liste
    .filter((a) => a && typeof a === 'object' && /^https?:\/\//i.test(texte(a.url, 500)))
    .map((a) => ({
      id_user: idUser,
      type_lien: 'presse',
      url: texte(a.url, 500),
      titre: texte(a.titre, 200) || null,
      source: texte(a.media, 100) || null,
      date_publication: /^\d{4}-\d{2}-\d{2}$/.test(texte(a.date, 10)) ? texte(a.date, 10) : null,
      date_creation: maintenant,
    }));
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await existe(queryInterface)) return;
    await queryInterface.createTable('lien_externe', {
      id_lien: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      id_user: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'user', key: 'id_user' }, onDelete: 'CASCADE', onUpdate: 'CASCADE',
      },
      type_lien: { type: Sequelize.ENUM('presse', 'youtube', 'instagram', 'tiktok', 'facebook'), allowNull: false },
      url: { type: Sequelize.STRING(500), allowNull: false },
      titre: { type: Sequelize.STRING(200), allowNull: true },
      source: { type: Sequelize.STRING(100), allowNull: true },
      date_publication: { type: Sequelize.DATEONLY, allowNull: true },
      // Contenu supprimé : le lien reste sur le portfolio, sans rattachement
      id_oeuvre: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'oeuvre', key: 'id_oeuvre' }, onDelete: 'SET NULL', onUpdate: 'CASCADE',
      },
      id_evenement: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'evenement', key: 'id_evenement' }, onDelete: 'SET NULL', onUpdate: 'CASCADE',
      },
      date_creation: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('lien_externe', ['id_user'], { name: 'idx_lien_externe_user' });
    await queryInterface.addIndex('lien_externe', ['id_oeuvre'], { name: 'idx_lien_externe_oeuvre' });
    await queryInterface.addIndex('lien_externe', ['id_evenement'], { name: 'idx_lien_externe_evenement' });

    const [profils] = await queryInterface.sequelize.query(
      'SELECT id_user, articles_presse FROM `user` WHERE articles_presse IS NOT NULL'
    );
    const lignes = profils.flatMap((p) => lignesDepuisProfil(p.id_user, p.articles_presse));
    if (lignes.length) await queryInterface.bulkInsert('lien_externe', lignes);
  },

  async down(queryInterface) {
    if (await existe(queryInterface)) await queryInterface.dropTable('lien_externe');
  },
};
