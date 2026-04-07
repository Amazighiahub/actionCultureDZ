/**
 * Fix double-encoding UTF-8 → latin1/cp1252 → UTF-8 (mojibake)
 *
 * Décode les caractères mal encodés dans les tables de référence (type_oeuvre, type_evenement, etc.)
 * suite à un seed initial qui a inséré du UTF-8 interprété comme latin1.
 *
 * Usage:
 *   node scripts/fix-encoding-mojibake.js --dry-run    # Preview sans modifier
 *   node scripts/fix-encoding-mojibake.js              # Applique les corrections
 */
require('dotenv').config();
const Sequelize = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false
  }
);

// CP1252 special chars (0x80-0x9F qui ne sont pas dans latin1 pur)
const CP1252_MAP = {
  '\u20AC': 0x80, '\u201A': 0x82, '\u0192': 0x83, '\u201E': 0x84,
  '\u2026': 0x85, '\u2020': 0x86, '\u2021': 0x87, '\u02C6': 0x88,
  '\u2030': 0x89, '\u0160': 0x8A, '\u2039': 0x8B, '\u0152': 0x8C,
  '\u017D': 0x8E, '\u2018': 0x91, '\u2019': 0x92, '\u201C': 0x93,
  '\u201D': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97,
  '\u02DC': 0x98, '\u2122': 0x99, '\u0161': 0x9A, '\u203A': 0x9B,
  '\u0153': 0x9C, '\u017E': 0x9E, '\u0178': 0x9F,
};

/**
 * Détecte si une string ressemble à du mojibake UTF-8 → latin1
 */
function looksDoubleEncoded(str) {
  if (typeof str !== 'string') return false;
  // Patterns typiques de mojibake :
  // - Ã suivi de caractère 0x80-0xBF (é, è, à, ô, etc.)
  // - Å suivi de ' ou " (Œ, œ avec apostrophe)
  // - â (souvent dans é, è)
  return /Ã[\u0080-\u00BF]|Å['']|Ã©|Ã¨|Ã ©|Ã ¢|Ã ®|Ã ¯|Ã ª/.test(str);
}

/**
 * Décode le mojibake en convertissant la string JS comme bytes CP1252 puis UTF-8
 */
function fixMojibake(str) {
  if (typeof str !== 'string' || !looksDoubleEncoded(str)) return str;

  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    const code = str.charCodeAt(i);
    if (CP1252_MAP[c] !== undefined) {
      bytes.push(CP1252_MAP[c]);
    } else if (code <= 0xFF) {
      bytes.push(code);
    } else {
      return str; // Caractère non convertible, on laisse tel quel
    }
  }

  try {
    const fixed = Buffer.from(bytes).toString('utf8');
    return fixed;
  } catch {
    return str;
  }
}

/**
 * Fixe une table donnée
 */
async function fixTable(tableName, idCol, columns, dryRun) {
  const colsList = columns.join(', ');
  const [rows] = await sequelize.query(
    `SELECT ${idCol}, ${colsList} FROM ${tableName}`
  );

  let fixedCount = 0;
  const examples = [];

  for (const row of rows) {
    const updates = {};
    let changed = false;

    for (const col of columns) {
      const val = row[col];
      if (val == null) continue;

      // Détecter si c'est JSON ou string
      let parsed = val;
      let isJson = false;
      if (typeof val === 'string') {
        try {
          const p = JSON.parse(val);
          if (typeof p === 'object' && p !== null) {
            parsed = p;
            isJson = true;
          }
        } catch { /* not JSON */ }
      } else if (typeof val === 'object') {
        isJson = true;
      }

      if (isJson && typeof parsed === 'object') {
        // Colonne JSON multilingue {fr, ar, en, ...}
        const newJson = { ...parsed };
        let jsonChanged = false;
        for (const [key, v] of Object.entries(parsed)) {
          if (typeof v === 'string' && looksDoubleEncoded(v)) {
            const fixed = fixMojibake(v);
            if (fixed !== v) {
              newJson[key] = fixed;
              jsonChanged = true;
            }
          }
        }
        if (jsonChanged) {
          updates[col] = newJson;
          changed = true;
        }
      } else if (typeof val === 'string' && looksDoubleEncoded(val)) {
        const fixed = fixMojibake(val);
        if (fixed !== val) {
          updates[col] = fixed;
          changed = true;
        }
      }
    }

    if (changed) {
      const id = row[idCol];
      if (examples.length < 3) {
        examples.push({ id, updates });
      }

      if (!dryRun) {
        const setParts = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const params = Object.values(updates).map(v =>
          typeof v === 'object' ? JSON.stringify(v) : v
        );
        await sequelize.query(
          `UPDATE ${tableName} SET ${setParts} WHERE ${idCol} = ?`,
          { replacements: [...params, id] }
        );
      }
      fixedCount++;
    }
  }

  console.log(`\n📋 ${tableName}: ${fixedCount} ligne(s) ${dryRun ? 'à corriger' : 'corrigée(s)'}`);
  examples.forEach(e => {
    console.log(`   ${idCol}=${e.id}:`, JSON.stringify(e.updates).substring(0, 200));
  });

  return fixedCount;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(dryRun ? '🔍 MODE DRY-RUN (aucune modification)\n' : '🔧 MODE LIVE (modifications réelles)\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Connecté à la DB:', process.env.DB_NAME);

    let total = 0;

    // Tables à corriger (table, idCol, [columns])
    const tablesToFix = [
      ['type_oeuvre', 'id_type_oeuvre', ['nom_type', 'description']],
      ['type_evenement', 'id_type_evenement', ['nom_type', 'description']],
      ['typeorganisation', 'id_type_organisation', ['nom']],
      ['genre', 'id_genre', ['nom']],
      ['categorie', 'id_categorie', ['nom']],
      ['specialites', 'id_specialite', ['nom_specialite', 'description']],
      ['materiau', 'id_materiau', ['nom']],
      ['technique', 'id_technique', ['nom']],
      ['langue', 'id_langue', ['nom']],
    ];

    for (const [table, idCol, cols] of tablesToFix) {
      try {
        total += await fixTable(table, idCol, cols, dryRun);
      } catch (err) {
        console.log(`⚠️  ${table}: ${err.message.substring(0, 80)}`);
      }
    }

    console.log(`\n${dryRun ? '🔍' : '✅'} Total: ${total} ligne(s) ${dryRun ? 'à corriger' : 'corrigée(s)'}`);
    if (dryRun) {
      console.log('\n💡 Pour appliquer les corrections, relancez sans --dry-run');
    }

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
