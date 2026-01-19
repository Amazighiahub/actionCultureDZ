const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const walk = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      // skip node_modules
      if (file === 'node_modules') return;
      walk(filepath, filelist);
    } else if (file.endsWith('.js') || file.endsWith('.ts')) {
      filelist.push(filepath);
    }
  });
  return filelist;
};

const files = walk(root);
const results = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (line.includes('sequelize.query') && line.includes('`') && line.includes('${')) {
      results.push({ file, line: idx + 1, snippet: line.trim() });
    }
    if (line.match(/sequelize\.query\s*\(/) && line.includes('+')) {
      results.push({ file, line: idx + 1, snippet: line.trim() });
    }
  });
});

if (results.length === 0) {
  console.log('✅ Aucun usage de sequelize.query potentiellement vulnérable détecté (quick-scan).');
  process.exit(0);
}

console.log('⚠️  Usages potentiels de sequelize.query avec interpolation détectés :');
results.forEach(r => {
  console.log(`- ${r.file}#L${r.line}: ${r.snippet}`);
});

console.log('\nRecommandation: remplacer par des requêtes paramétrées, e.g.:');
console.log("await sequelize.query('SELECT * FROM users WHERE email = :email', { replacements: { email }, type: sequelize.QueryTypes.SELECT });");

process.exit(0);
