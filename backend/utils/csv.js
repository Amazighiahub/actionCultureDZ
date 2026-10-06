/**
 * Cellule CSV sûre : guillemets échappés, et neutralisation des formules
 * (=, +, -, @, tabulation, retour chariot) qu'Excel/LibreOffice exécuteraient
 * à l'ouverture d'un export contenant des données saisies par les utilisateurs.
 */
function csvCell(value) {
  if (value === null || value === undefined) return '""';
  let str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  return `"${str.replace(/"/g, '""')}"`;
}

const csvRow = (cells) => cells.map(csvCell).join(',');

module.exports = { csvCell, csvRow };
