'use strict';

/**
 * Migration : page publique (vitrine) des organisations.
 * 1. typeorganisation.code : clé stable des types (les identifiants diffèrent d'une base à l'autre),
 *    remplie d'après le nom français ; ajout du type « Maison d'édition ».
 * 2. organisation : statut de vérification (les organisations existantes sont « valide »,
 *    les nouvelles passent par la modération), logo, wilaya, adresse, contacts, réseaux, date de création.
 * 3. editeur.id_organisation : chaque maison d'édition (générale ou scientifique) déjà enregistrée est reliée à une organisation
 *    (même nom si elle existe, sinon créée), pour que sa page montre les livres qu'elle a publiés.
 * Rejouable : chaque étape vérifie ce qui existe déjà.
 */
const CODES = {
  'association culturelle': 'association_culturelle',
  'ministere': 'ministere',
  'collectivite territoriale': 'collectivite',
  'institution publique': 'institution',
  'fondation': 'fondation',
  'ong': 'ong',
  'entreprise privee': 'entreprise_privee',
  'universite': 'universite',
  'ecole': 'ecole',
  'musee': 'musee',
  'bibliotheque': 'bibliotheque',
  'association': 'association',
  'entreprise': 'entreprise',
  "maison d'edition": 'maison_edition'
};
const MAISON_EDITION = {
  fr: "Maison d'édition", ar: 'دار نشر', en: 'Publishing house',
  'tz-ltn': 'Axxam n teẓrigt', 'tz-tfng': 'ⴰⵅⵅⴰⵎ ⵏ ⵜⴻⵥⵔⵉⴳⵜ'
};
const sansAccent = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’`]/g, "'").trim().toLowerCase();
const lireJson = (v) => {
  if (v && typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return v ? { fr: String(v) } : {}; }
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements });
    const [tables] = await q(`SELECT TABLE_NAME AS t FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('typeorganisation', 'organisation', 'editeur', 'wilayas')`);
    const existe = new Set(tables.map(t => t.t));
    if (!existe.has('typeorganisation') || !existe.has('organisation')) return;

    // 1. Codes des types + « Maison d'édition »
    const typesCols = await queryInterface.describeTable('typeorganisation');
    if (!typesCols.code) {
      await queryInterface.addColumn('typeorganisation', 'code', { type: Sequelize.STRING(40), allowNull: true });
    }
    const [types] = await q('SELECT id_type_organisation AS id, nom, code FROM typeorganisation');
    for (const type of types) {
      if (type.code) continue;
      const code = CODES[sansAccent(lireJson(type.nom).fr)];
      if (code && !types.some(t => t.code === code)) {
        await q('UPDATE typeorganisation SET code = ? WHERE id_type_organisation = ?', [code, type.id]);
        type.code = code;
      }
    }
    let [[maison]] = await q("SELECT id_type_organisation AS id FROM typeorganisation WHERE code = 'maison_edition'");
    if (!maison) {
      await q('INSERT INTO typeorganisation (nom, code) VALUES (?, ?)', [JSON.stringify(MAISON_EDITION), 'maison_edition']);
      [[maison]] = await q("SELECT id_type_organisation AS id FROM typeorganisation WHERE code = 'maison_edition'");
    }

    // 2. Colonnes de la vitrine
    const cols = await queryInterface.describeTable('organisation');
    if (!cols.statut) {
      await queryInterface.addColumn('organisation', 'statut', {
        type: Sequelize.ENUM('en_attente', 'valide', 'rejete'), allowNull: false, defaultValue: 'en_attente'
      });
      // Déjà utilisées sur le site : publiées d'office
      await q("UPDATE organisation SET statut = 'valide'");
    }
    const ajouter = async (nom, def) => { if (!cols[nom]) await queryInterface.addColumn('organisation', nom, def); };
    await ajouter('logo_url', { type: Sequelize.STRING(500), allowNull: true });
    await ajouter('id_wilaya', { type: Sequelize.INTEGER, allowNull: true });
    await ajouter('adresse', { type: Sequelize.STRING(255), allowNull: true });
    await ajouter('email', { type: Sequelize.STRING(255), allowNull: true });
    await ajouter('telephone', { type: Sequelize.STRING(30), allowNull: true });
    await ajouter('reseaux', { type: Sequelize.JSON, allowNull: true });
    await ajouter('date_creation', { type: Sequelize.DATE, allowNull: true, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') });

    const fkExiste = async (table, colonne) => (await q(`SELECT 1 FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`, [table, colonne]))[0].length > 0;
    if (existe.has('wilayas') && !(await fkExiste('organisation', 'id_wilaya'))) {
      await queryInterface.addConstraint('organisation', {
        fields: ['id_wilaya'], type: 'foreign key', name: 'fk_organisation_wilaya',
        references: { table: 'wilayas', field: 'id_wilaya' }, onDelete: 'SET NULL', onUpdate: 'CASCADE'
      });
    }

    // 3. Maisons d'édition reliées à une organisation
    if (!existe.has('editeur')) return;
    const edCols = await queryInterface.describeTable('editeur');
    if (!edCols.id_organisation) {
      await queryInterface.addColumn('editeur', 'id_organisation', { type: Sequelize.INTEGER, allowNull: true });
    }
    if (!(await fkExiste('editeur', 'id_organisation'))) {
      await queryInterface.addConstraint('editeur', {
        fields: ['id_organisation'], type: 'foreign key', name: 'fk_editeur_organisation',
        references: { table: 'organisation', field: 'id_organisation' }, onDelete: 'SET NULL', onUpdate: 'CASCADE'
      });
    }
    const [editeurs] = await q(`SELECT id_editeur, nom, description, site_web, email, telephone, adresse
      FROM editeur WHERE type_editeur IN ('maison_edition', 'editeur_scientifique') AND id_organisation IS NULL`);
    if (!editeurs.length) return;
    const [orgs] = await q('SELECT id_organisation AS id, nom FROM organisation');
    for (const ed of editeurs) {
      const nom = lireJson(ed.nom);
      const cle = sansAccent(nom.fr || Object.values(nom).find(Boolean));
      if (!cle) continue;
      let org = orgs.find(o => Object.values(lireJson(o.nom)).some(v => sansAccent(v) === cle));
      if (!org) {
        await q(`INSERT INTO organisation (nom, id_type_organisation, description, site_web, email, telephone, adresse, statut)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'valide')`, [
          JSON.stringify(nom), maison.id, JSON.stringify(lireJson(ed.description) || {}),
          ed.site_web || null, ed.email || null, ed.telephone || null, ed.adresse ? String(ed.adresse).slice(0, 255) : null
        ]);
        const [[cree]] = await q('SELECT LAST_INSERT_ID() AS id');
        org = { id: cree.id, nom };
        orgs.push(org);
      }
      await q('UPDATE editeur SET id_organisation = ? WHERE id_editeur = ?', [org.id, ed.id_editeur]);
    }
  },

  async down(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    const retirerFk = async (table, colonne) => {
      const [fk] = await q(`SELECT CONSTRAINT_NAME AS nom FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table}' AND COLUMN_NAME = '${colonne}' AND REFERENCED_TABLE_NAME IS NOT NULL`);
      for (const { nom } of fk) await queryInterface.removeConstraint(table, nom);
    };
    const edCols = await queryInterface.describeTable('editeur').catch(() => ({}));
    if (edCols.id_organisation) {
      await retirerFk('editeur', 'id_organisation');
      await queryInterface.removeColumn('editeur', 'id_organisation');
    }
    const cols = await queryInterface.describeTable('organisation');
    if (cols.id_wilaya) await retirerFk('organisation', 'id_wilaya');
    for (const c of ['statut', 'logo_url', 'id_wilaya', 'adresse', 'email', 'telephone', 'reseaux', 'date_creation']) {
      if (cols[c]) await queryInterface.removeColumn('organisation', c);
    }
    // Le type « Maison d'édition » et les organisations créées pour les éditeurs sont conservés
    const typesCols = await queryInterface.describeTable('typeorganisation');
    if (typesCols.code) await queryInterface.removeColumn('typeorganisation', 'code');
  }
};
