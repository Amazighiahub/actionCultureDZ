/**
 * Import du catalogue d'une maison d'édition depuis un fichier Excel (modèle généré par modeleCatalogue()).
 *
 * Feuille « Livres » (sinon la première), colonnes reconnues par leur titre (sans accent ni casse) :
 *   Titre · Titre en arabe · Titre en tamazight · Résumé · Résumé en arabe · Prénom de l'auteur
 *   · Nom de l'auteur · Année · Langue · ISBN · Nombre de pages · Catégories · Prix (DA) · Fichier couverture
 *
 * Règles (les mêmes que le formulaire « Nouvelle œuvre » pour un livre) :
 * - une ligne vide, ou marquée « Exemple » dans la colonne N°, est ignorée ;
 * - obligatoires : un titre, un résumé, le nom de l'auteur, une langue connue, au moins une catégorie connue ;
 * - ISBN de 10 ou 13 chiffres ; un ISBN déjà présent sur le site → le livre n'est pas recréé,
 *   il est seulement relié à la maison d'édition ; deux fois le même ISBN dans le fichier → erreur ;
 * - couverture : la colonne « Fichier couverture », sinon une image nommée par l'ISBN (9789947….jpg) ;
 * - au plus MAX_LIGNES livres par fichier.
 * Les livres créés sont envoyés à l'équipe (statut « en attente »), comme depuis le formulaire.
 */
const ExcelJS = require('exceljs');
const { texte } = require('../patrimoine/importReleve');

const MAX_LIGNES = 300;
const TYPE_LIVRE = 1;

const sansAccent = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, "'").toLowerCase().trim();
const chiffres = (t) => String(t || '').replace(/[^0-9]/g, '');
const nomImage = (n) => sansAccent(n).replace(/\s+/g, ' ');
const sansExtension = (n) => nomImage(n).replace(/\.[a-z0-9]+$/, '');

// Colonnes reconnues par leur titre
const COLONNES = {
  numero: ['n°', 'no', 'numero', 'n'],
  titre: ['titre', 'titre (francais)', 'titre en francais'],
  titreAr: ['titre en arabe', 'titre (arabe)'],
  titreTz: ['titre en tamazight', 'titre (tamazight)'],
  resume: ['resume', 'resume (francais)', 'resume en francais'],
  resumeAr: ['resume en arabe', 'resume (arabe)'],
  prenom: ["prenom de l'auteur", 'prenom auteur', 'prenom'],
  nom: ["nom de l'auteur", 'nom auteur', 'auteur', 'nom'],
  annee: ['annee', 'annee de parution'],
  langue: ['langue', 'langue originale'],
  isbn: ['isbn'],
  pages: ['nombre de pages', 'pages'],
  categories: ['categories', 'categorie'],
  prix: ['prix (da)', 'prix'],
  couverture: ['fichier couverture', 'couverture', 'image de couverture']
};

// Titres du modèle, dans l'ordre (et largeur des colonnes)
const ENTETES = [
  ['N°', 8], ['Titre', 34], ['Titre en arabe', 28], ['Titre en tamazight', 24], ['Résumé', 50], ['Résumé en arabe', 40],
  ["Prénom de l'auteur", 18], ["Nom de l'auteur", 18], ['Année', 9], ['Langue', 14], ['ISBN', 20], ['Nombre de pages', 10],
  ['Catégories', 28], ['Prix (DA)', 10], ['Fichier couverture', 26]
];

/** Index (base 1) de chaque colonne connue, d'après la ligne de titres */
function reperer(ws) {
  const index = {};
  ws.getRow(1).eachCell((cell, col) => {
    const t = sansAccent(texte(cell));
    for (const [cle, titres] of Object.entries(COLONNES)) {
      if (index[cle] === undefined && titres.includes(t)) { index[cle] = col; break; }
    }
  });
  return index;
}

/**
 * Références du site : langues, catégories des livres, livres déjà présents (par ISBN).
 * @param {object} models
 * @param {Array<{ id_genre:number, categories:Array<{id_categorie:number, nom:object}> }>} groupes
 */
async function references(models, groupes) {
  const langues = new Map();
  for (const l of await models.Langue.findAll({ attributes: ['id_langue', 'nom', 'code'] })) {
    const nom = l.nom && typeof l.nom === 'object' ? l.nom : {};
    for (const v of [...Object.values(nom), l.code]) if (v) langues.set(sansAccent(v), l.id_langue);
  }
  const categories = new Map();
  for (const g of groupes || []) {
    for (const c of g.categories || []) {
      const nom = c.nom && typeof c.nom === 'object' ? c.nom : { fr: c.nom };
      for (const v of Object.values(nom)) if (v) categories.set(sansAccent(v), { id: c.id_categorie, genre: g.id_genre });
    }
  }
  const isbnExistants = new Map();
  for (const l of await models.Livre.findAll({ attributes: ['id_oeuvre', 'isbn'], where: { isbn: { [require('sequelize').Op.ne]: null } } })) {
    const cle = chiffres(l.isbn);
    if (cle) isbnExistants.set(cle, l.id_oeuvre);
  }
  return { langues, categories, isbnExistants };
}

/**
 * Lit et vérifie le fichier ; n'écrit rien.
 * @param {Buffer} buffer
 * @param {string[]} nomsImages - noms des images de couverture choisies avec le fichier
 * @returns {Promise<{ lignes: object[], resume: object, imagesSansLivre: string[] }>}
 */
async function lireCatalogue(buffer, nomsImages, refs) {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer);
  } catch {
    const err = new Error('Fichier Excel illisible : enregistrez-le au format .xlsx'); err.statusCode = 400; err.code = 'EXCEL_ILLISIBLE'; throw err;
  }
  const ws = wb.getWorksheet('Livres') || wb.worksheets[0];
  if (!ws) { const err = new Error('Le fichier ne contient aucune feuille'); err.statusCode = 400; err.code = 'EXCEL_VIDE'; throw err; }
  const col = reperer(ws);
  if (!col.titre && !col.titreAr) {
    const err = new Error('Colonne « Titre » introuvable : utilisez le modèle Tala DZ'); err.statusCode = 400; err.code = 'EXCEL_COLONNES'; throw err;
  }

  const images = new Map((nomsImages || []).map(n => [nomImage(n), n]));
  const imagesParIsbn = new Map((nomsImages || []).map(n => [chiffres(sansExtension(n)), n]).filter(([k]) => k.length >= 10));
  const imagesUtilisees = new Set();
  const isbnDuFichier = new Map();
  const lignes = [];
  const anneeMax = new Date().getFullYear() + 1;

  ws.eachRow({ includeEmpty: false }, (row, numero) => {
    if (numero === 1) return;
    const v = (cle) => (col[cle] ? texte(row.getCell(col[cle])) : '');
    if (sansAccent(v('numero')).startsWith('exemple')) return;
    const champs = Object.keys(COLONNES).filter(c => c !== 'numero').map(v);
    if (!champs.some(Boolean)) return;

    const erreurs = [];
    const titre = { fr: v('titre'), ar: v('titreAr'), 'tz-ltn': v('titreTz') };
    const resume = { fr: v('resume'), ar: v('resumeAr') };
    if (!titre.fr && !titre.ar && !titre['tz-ltn']) erreurs.push('titre manquant');
    if (!resume.fr && !resume.ar) erreurs.push('résumé manquant');
    const auteur = { prenom: v('prenom'), nom: v('nom') };
    if (!auteur.nom) erreurs.push("nom de l'auteur manquant");

    const langueTexte = v('langue');
    const idLangue = refs.langues.get(sansAccent(langueTexte));
    if (!langueTexte) erreurs.push('langue manquante');
    else if (!idLangue) erreurs.push(`langue inconnue « ${langueTexte} »`);

    const categories = [];
    for (const nomCat of v('categories').split(/[;,\n]/).map(s => s.trim()).filter(Boolean)) {
      const c = refs.categories.get(sansAccent(nomCat));
      if (c) categories.push(c); else erreurs.push(`catégorie inconnue « ${nomCat} »`);
    }
    if (!v('categories')) erreurs.push('catégorie manquante');

    let annee = null;
    if (v('annee')) {
      annee = parseInt(v('annee'), 10);
      if (!Number.isInteger(annee) || annee < 1800 || annee > anneeMax) erreurs.push(`année invalide « ${v('annee')} »`);
    }
    let pages = null;
    if (v('pages')) {
      pages = parseInt(v('pages'), 10);
      if (!Number.isInteger(pages) || pages <= 0) erreurs.push(`nombre de pages invalide « ${v('pages')} »`);
    }
    let prix = null;
    if (v('prix')) {
      prix = parseFloat(v('prix').replace(',', '.').replace(/\s/g, ''));
      if (!Number.isFinite(prix) || prix < 0) erreurs.push(`prix invalide « ${v('prix')} »`);
    }

    const isbn = chiffres(v('isbn'));
    let existant = null;
    if (v('isbn')) {
      if (!/^(\d{10}|\d{13})$/.test(isbn)) erreurs.push(`ISBN invalide « ${v('isbn')} » (10 ou 13 chiffres)`);
      else if (isbnDuFichier.has(isbn)) erreurs.push(`ISBN déjà utilisé ligne ${isbnDuFichier.get(isbn)}`);
      else {
        isbnDuFichier.set(isbn, numero);
        existant = refs.isbnExistants.get(isbn) || null;
      }
    }

    // Couverture : nom indiqué, sinon image nommée par l'ISBN
    let couverture = null;
    const nomCouverture = v('couverture');
    if (nomCouverture) {
      couverture = images.get(nomImage(nomCouverture)) || null;
      if (!couverture && nomsImages?.length) erreurs.push(`image « ${nomCouverture} » non fournie`);
    } else if (isbn) {
      couverture = imagesParIsbn.get(isbn) || null;
    }
    if (couverture) imagesUtilisees.add(couverture);

    lignes.push({
      ligne: numero,
      titre, resume, auteur, annee, pages, prix, isbn: isbn || null, idLangue: idLangue || null, categories,
      couverture,
      etat: erreurs.length ? 'erreur' : existant ? 'existe' : 'nouveau',
      idOeuvreExistante: existant,
      erreurs
    });
  });

  if (lignes.length > MAX_LIGNES) {
    const err = new Error(`Au plus ${MAX_LIGNES} livres par fichier (celui-ci en contient ${lignes.length}) : découpez-le en plusieurs fichiers`);
    err.statusCode = 400; err.code = 'EXCEL_TROP_GRAND'; throw err;
  }

  const resume = {
    total: lignes.length,
    nouveaux: lignes.filter(l => l.etat === 'nouveau').length,
    existants: lignes.filter(l => l.etat === 'existe').length,
    erreurs: lignes.filter(l => l.etat === 'erreur').length,
    sansCouverture: lignes.filter(l => l.etat === 'nouveau' && !l.couverture).length
  };
  const imagesSansLivre = (nomsImages || []).filter(n => !imagesUtilisees.has(n));
  return { lignes, resume, imagesSansLivre };
}

/** Modèle Excel à remplir : feuille « Livres » (titres + exemple), « Aide », « Listes » (langues, catégories) */
async function modeleCatalogue({ langues, categories }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Tala DZ';
  const ws = wb.addWorksheet('Livres', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = ENTETES.map(([header, width]) => ({ header, width }));
  const titres = ws.getRow(1);
  titres.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  titres.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A5530' } };
  titres.alignment = { vertical: 'middle', wrapText: true };
  titres.height = 32;
  ws.addRow(['Exemple', 'Le Chant des oliviers', 'نشيد الزيتون', '', 'Trois générations d’une famille de Kabylie, entre la récolte des olives et le départ vers la ville.', '',
    'Amina', 'Benali', 2024, 'Français', '978-9947-0-5521-3', 312, categories[0] || 'Roman', 1500, '9789947055213.jpg']);
  ws.getRow(2).font = { italic: true, color: { argb: 'FF7A7A7A' } };

  const listes = wb.addWorksheet('Listes');
  listes.columns = [{ header: 'Langues', width: 20 }, { header: 'Catégories (livres)', width: 34 }];
  listes.getRow(1).font = { bold: true };
  const n = Math.max(langues.length, categories.length);
  for (let i = 0; i < n; i++) listes.addRow([langues[i] || '', categories[i] || '']);
  // Listes déroulantes « Langue » et « Catégories » (lignes 3 à 1000)
  const colLangue = ENTETES.findIndex(([h]) => h === 'Langue') + 1;
  const colCategorie = ENTETES.findIndex(([h]) => h === 'Catégories') + 1;
  for (let r = 3; r <= 1000; r++) {
    ws.getCell(r, colLangue).dataValidation = { type: 'list', allowBlank: true, formulae: [`Listes!$A$2:$A$${langues.length + 1}`] };
    ws.getCell(r, colCategorie).dataValidation = { type: 'list', allowBlank: true, showErrorMessage: false, formulae: [`Listes!$B$2:$B$${categories.length + 1}`] };
  }

  const aide = wb.addWorksheet('Aide');
  aide.getColumn(1).width = 110;
  [
    'Comment remplir ce fichier',
    '',
    '1. Une ligne par livre, dans la feuille « Livres ». La ligne « Exemple » est ignorée : vous pouvez la laisser.',
    '2. Obligatoire : un titre, un résumé, le nom de l’auteur, la langue et au moins une catégorie.',
    '3. Langue et catégories : choisissez dans la liste (feuille « Listes »). Plusieurs catégories : séparez-les par « ; ».',
    '4. ISBN : 10 ou 13 chiffres (les tirets sont acceptés). Un livre déjà présent sur Tala DZ est seulement relié à votre maison.',
    '5. Couvertures : choisissez les images en même temps que ce fichier. Nommez-les par l’ISBN (9789947055213.jpg)',
    '   ou écrivez le nom de l’image dans la colonne « Fichier couverture ».',
    `6. Au plus ${MAX_LIGNES} livres par fichier.`,
    '',
    'Avant tout enregistrement, Tala DZ affiche un aperçu ligne par ligne : vous corrigez le fichier si besoin.',
    'Les livres sont ensuite vérifiés par l’équipe Tala DZ, puis publiés.'
  ].forEach((l, i) => { const c = aide.getCell(i + 1, 1); c.value = l; if (i === 0) c.font = { bold: true, size: 14 }; });

  return wb.xlsx.writeBuffer();
}

module.exports = { lireCatalogue, modeleCatalogue, references, MAX_LIGNES, TYPE_LIVRE, chiffres };
