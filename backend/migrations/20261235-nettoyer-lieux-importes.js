'use strict';

/**
 * Nettoyage des lieux importés (migration 20261233), après l'audit des lieux en ligne du 2026-11-19 :
 * 1. pas du patrimoine (rues, châteaux d'eau) : archivés ;
 * 2. noms génériques complétés par la commune (« Mémorial des martyrs » → « Mémorial des martyrs de Kimmel »),
 *    majuscule initiale, « Memorial » → « Mémorial », « martyres » → « martyrs » ;
 * 3. types : mosquées, zaouïas, minarets → édifice religieux ;
 * 4. doublons (Ketchaoua, Parc national d'El Kala, Ksar el Kaoua, Mur français…) : le lieu importé en double est
 *    archivé, ses points de visite passent au lieu gardé ;
 * 5. points de visite publiés sous un site en brouillon (Lambèse) : remis en brouillon, publiés avec leur site.
 * Mêmes règles que l'import de l'administration (services/patrimoine/importGeoAlgeria.js et nettoyageLieux.js).
 * Un lieu déjà utilisé (services, photos, événements, favoris…) n'est jamais archivé.
 * Réversible : l'état d'avant de chaque lieu touché est gardé dans nettoyage_lieux_20261235. Rejouable.
 */
const g = require('../services/patrimoine/importGeoAlgeria');
const { nomNettoye, typeCorrige, doublons } = require('../services/patrimoine/nettoyageLieux');
const { lieuxUtilises } = require('../services/patrimoine/lieuxUtilises');

const TABLE = 'nettoyage_lieux_20261235';
const objet = (v) => {
  if (v && typeof v === 'object') return v;
  try { const o = JSON.parse(v); return o && typeof o === 'object' ? o : {}; } catch { return v ? { fr: String(v) } : {}; }
};
const memeNom = (a, b) => JSON.stringify(a) === JSON.stringify(b);

module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;
    const [importTable] = await q.query("SHOW TABLES LIKE 'import_lieux_osm'");
    if (!importTable.length) return;
    await q.query(`CREATE TABLE IF NOT EXISTS ${TABLE} (
      id_lieu INT PRIMARY KEY, nom JSON NULL, typePatrimoine VARCHAR(40) NULL, statut VARCHAR(20) NULL,
      id_lieu_parent INT NULL, action VARCHAR(40) NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`);

    await q.transaction(async (transaction) => {
      const opts = { transaction, type: q.QueryTypes.SELECT };
      const lieux = (await q.query(`SELECT l.id_lieu, l.nom, l.typePatrimoine, l.statut, l.id_lieu_parent, l.latitude, l.longitude,
          c.commune_name_ascii AS ascii, c.nom AS communeNom, (i.id_lieu IS NOT NULL) AS importe,
          (SELECT COUNT(*) FROM lieu e WHERE e.id_lieu_parent = l.id_lieu AND e.statut = 'publie') AS nbEnfants
        FROM lieu l LEFT JOIN import_lieux_osm i ON i.id_lieu = l.id_lieu LEFT JOIN communes c ON c.id_commune = l.communeId
        WHERE l.statut IN ('publie', 'brouillon')`, opts))
        .map((l) => ({ ...l, nom: objet(l.nom), importe: !!Number(l.importe) }));
      const parId = new Map(lieux.map((l) => [l.id_lieu, l]));
      const importes = lieux.filter((l) => l.importe);

      // État d'avant, gardé une seule fois par lieu (le premier passage l'emporte si on rejoue)
      const garder = (l, action) => q.query(`INSERT IGNORE INTO ${TABLE} (id_lieu, nom, typePatrimoine, statut, id_lieu_parent, action)
        VALUES (:id, :nom, :type, :statut, :parent, :action)`, { transaction, replacements: {
        id: l.id_lieu, nom: JSON.stringify(l.nom), type: l.typePatrimoine, statut: l.statut, parent: l.id_lieu_parent, action } });

      const archiver = new Map(); // id → raison
      const bilan = { horsPatrimoine: 0, noms: 0, types: 0, doublons: 0, enBrouillon: 0, gardesCarUtilises: 0 };

      // 1. Pas du patrimoine
      for (const l of importes) if (g.pasPatrimoine(l.nom)) archiver.set(l.id_lieu, 'hors_patrimoine');

      // 4. Doublons parmi les lieux publiés
      const publies = lieux.filter((l) => l.statut === 'publie' && !archiver.has(l.id_lieu));
      const paires = doublons(publies.map((l) => ({ id_lieu: l.id_lieu, fr: l.nom.fr, lat: Number(l.latitude), lng: Number(l.longitude),
        parent: l.id_lieu_parent, importe: l.importe, commune: l.ascii, nbEnfants: Number(l.nbEnfants) })));
      for (const { retire } of paires) archiver.set(retire, 'doublon');

      // Un lieu déjà utilisé reste en place. Les points de visite d'un doublon sont dans la liste : ils changent de
      // site, ils ne rendent donc pas leur ancien site « utilisé »
      const enfantsDeDoublons = lieux.filter((e) => e.id_lieu_parent && archiver.get(e.id_lieu_parent) === 'doublon').map((e) => e.id_lieu);
      const utilises = await lieuxUtilises(q, [...archiver.keys(), ...enfantsDeDoublons], transaction);
      for (const id of utilises) if (archiver.delete(id)) bilan.gardesCarUtilises++;

      for (const [id, raison] of archiver) {
        const l = parId.get(id);
        await garder(l, raison);
        await q.query("UPDATE lieu SET statut = 'archive', updatedAt = NOW() WHERE id_lieu = :id", { transaction, replacements: { id } });
        if (raison === 'doublon') bilan.doublons++; else bilan.horsPatrimoine++;
      }
      // Points de visite d'un doublon archivé : rattachés au lieu gardé (leur état d'avant est gardé)
      for (const { retire, garde } of paires) {
        if (!archiver.has(retire)) continue;
        for (const enfant of lieux.filter((e) => e.id_lieu_parent === retire)) {
          await garder(enfant, 'nouveau_site');
          await q.query('UPDATE lieu SET id_lieu_parent = :garde, updatedAt = NOW() WHERE id_lieu = :id', { transaction, replacements: { garde, id: enfant.id_lieu } });
          enfant.id_lieu_parent = garde;
        }
      }

      // 2 et 3. Noms et types des lieux importés restants
      for (const l of importes) {
        if (archiver.has(l.id_lieu)) continue;
        // Commune comme dans l'import (SQL_COMMUNES : nom arabe en texte simple)
        const nom = g.nomAvecCommune(nomNettoye(l.nom), l.ascii ? { ascii: l.ascii, nom: l.communeNom } : null);
        const type = typeCorrige(nom, l.typePatrimoine);
        const nomChange = !memeNom(nom, l.nom);
        if (!nomChange && type === l.typePatrimoine) continue;
        await garder(l, 'nom_type');
        await q.query('UPDATE lieu SET nom = :nom, typePatrimoine = :type, updatedAt = NOW() WHERE id_lieu = :id',
          { transaction, replacements: { nom: JSON.stringify(nom), type, id: l.id_lieu } });
        if (nomChange) bilan.noms++;
        if (type !== l.typePatrimoine) bilan.types++;
      }

      // 5. Points de visite publiés sous un site en brouillon : publiés avec leur site (onglet « À publier »)
      for (const l of importes) {
        const parent = l.id_lieu_parent ? parId.get(l.id_lieu_parent) : null;
        if (l.statut !== 'publie' || archiver.has(l.id_lieu) || !parent || parent.statut !== 'brouillon') continue;
        await garder(l, 'site_en_brouillon');
        await q.query("UPDATE lieu SET statut = 'brouillon', updatedAt = NOW() WHERE id_lieu = :id", { transaction, replacements: { id: l.id_lieu } });
        bilan.enBrouillon++;
      }
      console.log('[20261235] nettoyage des lieux importés :', JSON.stringify(bilan));
    });
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize;
    const [table] = await q.query(`SHOW TABLES LIKE '${TABLE}'`);
    if (!table.length) return;
    await q.transaction(async (transaction) => {
      await q.query(`UPDATE lieu l JOIN ${TABLE} n ON n.id_lieu = l.id_lieu
        SET l.nom = n.nom, l.typePatrimoine = n.typePatrimoine, l.statut = n.statut, l.id_lieu_parent = n.id_lieu_parent, l.updatedAt = NOW()`,
      { transaction });
    });
    await q.query(`DROP TABLE ${TABLE}`);
  }
};
