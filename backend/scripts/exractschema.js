// scripts/extract-schema.js
// Usage: node scripts/extract-schema.js [path]
// Exemple: node scripts/extract-schema.js ./src

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const root = process.argv[2] || '.';
const patterns = [`${root}/**/*.js`, `${root}/**/*.ts`];

const tableCandidates = {}; // { tableName: { sources: [], columns: Set() } }

function addTable(name, col) {
  if (!name) return;
  if (!tableCandidates[name]) tableCandidates[name] = { sources: new Set(), columns: new Set() };
  if (Array.isArray(col)) col.forEach(c => tableCandidates[name].columns.add(c));
  else if (col) tableCandidates[name].columns.add(col);
}

function recordSource(name, src) {
  if (!name) return;
  if (!tableCandidates[name]) tableCandidates[name] = { sources: new Set(), columns: new Set() };
  tableCandidates[name].sources.add(src);
}

function extractFromObjectExpression(node) {
  // return property keys
  const keys = [];
  node.properties.forEach(prop => {
    if (prop.type === 'ObjectProperty' || prop.type === 'Property') {
      if (prop.key) {
        if (prop.key.type === 'Identifier') keys.push(prop.key.name);
        else if (prop.key.type === 'StringLiteral') keys.push(prop.key.value);
      }
    }
  });
  return keys;
}

function scanFile(file) {
  const code = fs.readFileSync(file, 'utf8');
  // quick regex scan for raw SQL table names
  const sqlRegex = /\b(?:FROM|INTO|UPDATE|CREATE TABLE|JOIN)\s+`?([A-Za-z0-9_]+)`?/ig;
  let m;
  while ((m = sqlRegex.exec(code))) {
    addTable(m[1], []);
    recordSource(m[1], `${file}:raw-sql`);
  }

  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'classProperties', 'decorators-legacy'],
    });
  } catch (e) {
    // skip parse errors
    return;
  }

  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;
      // sequelize.define('ModelName', { ... })
      if ((callee.type === 'MemberExpression' && callee.property && callee.property.name === 'define')
          || (callee.type === 'Identifier' && callee.name === 'define')) {
        const args = path.node.arguments || [];
        if (args.length >= 2) {
          const nameNode = args[0];
          const defNode = args[1];
          let name = null;
          if (nameNode.type === 'StringLiteral') name = nameNode.value;
          if (defNode && defNode.type === 'ObjectExpression') {
            const cols = extractFromObjectExpression(defNode);
            addTable(name || 'UNKNOWN_DEFINE', cols);
            recordSource(name || 'UNKNOWN_DEFINE', `${file}:sequelize.define`);
          }
        }
      }
      // Model.init({ ... }, { sequelize, tableName: 'xxx' })
      if (callee.type === 'MemberExpression' && callee.property && callee.property.name === 'init') {
        const args = path.node.arguments || [];
        if (args.length >= 1) {
          const defNode = args[0];
          let tableName = null;
          // try to find tableName in second arg
          const opts = args[1];
          if (opts && opts.type === 'ObjectExpression') {
            opts.properties.forEach(p => {
              if ((p.key.type === 'Identifier' && p.key.name === 'tableName') ||
                  (p.key.type === 'StringLiteral' && p.key.value === 'tableName')) {
                if (p.value.type === 'StringLiteral') tableName = p.value.value;
              }
            });
          }
          if (defNode && defNode.type === 'ObjectExpression') {
            const cols = extractFromObjectExpression(defNode);
            addTable(tableName || 'UNKNOWN_INIT', cols);
            recordSource(tableName || 'UNKNOWN_INIT', `${file}:Model.init`);
          }
        }
      }
    },
    ClassDeclaration(path) {
      // class X extends Model { static init(...) { ... } }  => skip deep handling for now
      // We'll still catch Model.init via CallExpression
    },
    VariableDeclarator(path) {
      // patterns like const Model = sequelize.define('name', {...});
      // handled in CallExpression above
    }
  });
}

(async () => {
  for (const p of patterns) {
    const files = glob.sync(p, { ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'] });
    files.forEach(f => scanFile(f));
  }

  // Format output
  const out = {};
  Object.entries(tableCandidates).forEach(([t, v]) => {
    out[t] = {
      columns: Array.from(v.columns).sort(),
      sources: Array.from(v.sources).sort()
    };
  });

  const outPath = path.join(process.cwd(), 'schema-candidates.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(`✅ Analyse terminée. Résultat -> ${outPath}`);
})();

const sequelize = createDatabaseConnection();

(async () => {
  await sequelize.sync({ alter: true }); // ou { force: true } pour tout recréer
  console.log('✅ Base synchronisée.');
})();