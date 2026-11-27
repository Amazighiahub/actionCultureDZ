/**
 * Section Tamazight (2026-11-20) : œuvres écrites en tamazight, voix des lieux en tamazight, relecture des textes
 * partagés librement, et jeu de données ouvert (textes, traductions, audios) pour la recherche.
 * Règles communes : constants/tamazight.js.
 */
const { Op } = require('sequelize');
const { texteLisible } = require('../helpers/i18n');
const { oeuvrePath, lieuPath } = require('../utils/slug');
const { nomComplet } = require('../utils/texte');
const { auteursDesOeuvres } = require('./oeuvre/auteursOeuvres');
const { erreurHttp } = require('../utils/erreurHttp');
const {
  LANGUES_TAMAZIGHT, ECRITURE_PAR_LANGUE, VARIANTES, LICENCE_OUVERTE, LICENCE_LIBELLE, LICENCE_URL
} = require('../constants/tamazight');

const SITE = (process.env.FRONTEND_URL || 'https://taladz.com').replace(/\/$/, '');
const LANGUES_SITE_TAMAZIGHT = ['tz-ltn', 'tz-tfng'];
const MAX_PAGE = 48;

const objet = (v) => {
  if (v && typeof v === 'object') return v;
  try { const o = JSON.parse(v); return o && typeof o === 'object' ? o : {}; } catch { return v ? { fr: String(v) } : {}; }
};
const plat = (t) => String(t || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
const absolue = (url) => (!url ? null : /^https?:\/\//.test(url) ? url : `${SITE}${url.startsWith('/') ? '' : '/'}${url}`);

/** Conditions d'une œuvre publique en tamazight */
const OEUVRE_PUBLIQUE = { statut: 'publie', id_langue: LANGUES_TAMAZIGHT };

/**
 * Œuvres publiées en tamazight (lettres latines ou tifinagh), les plus récentes d'abord.
 * @param {object} models
 * @param {{ variante?: string, type?: number, page?: number, limit?: number }} options
 */
async function liste(models, { variante, type, page = 1, limit = 24 } = {}) {
  const { Oeuvre, User, TypeOeuvre, Media } = models;
  const lim = Math.min(Math.max(Number(limit) || 24, 1), MAX_PAGE);
  const pg = Math.max(Number(page) || 1, 1);
  const where = { ...OEUVRE_PUBLIQUE };
  if (VARIANTES.includes(variante)) where.variante_amazighe = variante;
  if (Number(type) > 0) where.id_type_oeuvre = Number(type);
  const { rows, count } = await Oeuvre.findAndCountAll({
    where,
    attributes: ['id_oeuvre', 'titre', 'description', 'id_type_oeuvre', 'id_langue', 'variante_amazighe',
      'partage_ouvert', 'donnees_ouvertes_valide', 'date_creation'],
    include: [
      ...(User ? [{ model: User, as: 'Saiseur', attributes: ['id_user', 'nom', 'prenom'], required: false }] : []),
      ...(TypeOeuvre ? [{ model: TypeOeuvre, attributes: ['id_type_oeuvre', 'nom_type'], required: false }] : []),
      // Image principale (ou la première) et présence d'un enregistrement
      ...(Media ? [{ model: Media, attributes: ['id_media', 'type_media', 'url', 'is_Principale', 'ordre'], where: { type_media: ['audio', 'image'], visible_public: true }, required: false }] : []),
    ],
    order: [['date_creation', 'DESC']],
    limit: lim, offset: (pg - 1) * lim, distinct: true,
  });
  // Auteur crédité (contributeur principal), pas la personne qui a saisi la fiche (2026-11-27)
  const auteurs = await auteursDesOeuvres(models, rows.map((o) => o.id_oeuvre)).catch(() => new Map());
  return {
    oeuvres: rows.map((o) => {
      const d = o.get({ plain: true });
      const credite = auteurs.get(Number(d.id_oeuvre));
      const medias = d.Media || d.Medias || [];
      const images = medias.filter((m) => m.type_media === 'image' && m.url)
        .sort((a, b) => Number(!!b.is_Principale) - Number(!!a.is_Principale) || (a.ordre ?? 99) - (b.ordre ?? 99));
      return {
        id_oeuvre: d.id_oeuvre, titre: d.titre, description: d.description, id_type_oeuvre: d.id_type_oeuvre,
        type: d.TypeOeuvre?.nom_type || null, ecriture: ECRITURE_PAR_LANGUE[d.id_langue], variante: d.variante_amazighe,
        image_url: images[0]?.url || null, auteur: credite || (d.Saiseur ? { id_user: d.Saiseur.id_user, nom: d.Saiseur.nom, prenom: d.Saiseur.prenom } : null),
        audio: medias.some((m) => m.type_media === 'audio'), donnees_ouvertes: !!(d.partage_ouvert && d.donnees_ouvertes_valide),
        date_creation: d.date_creation,
      };
    }),
    pagination: { page: pg, limit: lim, total: count, pages: Math.ceil(count / lim) },
  };
}

/** Voix enregistrées en tamazight sur les lieux du patrimoine publiés (guides, contes, prononciation) */
/** maximum : plafond (page publique 48 ; jeu de données ouvertes : 2 000, avant borné à 48 sans le dire) */
async function voixDesLieux(models, { limit = 24, maximum = MAX_PAGE } = {}) {
  const { LieuMedia, Lieu } = models;
  if (!LieuMedia || !Lieu) return [];
  const lignes = await LieuMedia.findAll({
    where: { type: 'audio', langue: LANGUES_SITE_TAMAZIGHT, accord_voix_le: { [Op.ne]: null } },
    attributes: ['id', 'url', 'langue', 'parler', 'credit', 'licence', 'id_lieu'],
    include: [{ model: Lieu, attributes: ['id_lieu', 'nom'], where: { statut: 'publie' }, required: true }],
    order: [['id', 'DESC']],
    limit: Math.min(Number(limit) || 24, maximum),
  });
  return lignes.map((m) => {
    const d = m.get({ plain: true });
    return { id: d.id, url: d.url, ecriture: d.langue === 'tz-tfng' ? 'tifinagh' : 'latin', parler: d.parler, credit: d.credit,
      licence: d.licence, lieu: { id_lieu: d.Lieu.id_lieu, nom: d.Lieu.nom } };
  });
}

/** Modération : textes partagés librement, publiés, pas encore relus pour les données ouvertes */
async function aRelire(models) {
  const { Oeuvre, User } = models;
  const lignes = await Oeuvre.findAll({
    where: { ...OEUVRE_PUBLIQUE, partage_ouvert: true, ecrit_par_humain: true, donnees_ouvertes_valide: false },
    attributes: ['id_oeuvre', 'titre', 'id_type_oeuvre', 'id_langue', 'variante_amazighe', 'partage_ouvert_le'],
    include: User ? [{ model: User, as: 'Saiseur', attributes: ['id_user', 'nom', 'prenom'], required: false }] : [],
    order: [['partage_ouvert_le', 'ASC']],
    limit: 200,
  });
  return lignes.map((o) => {
    const d = o.get({ plain: true });
    return { id_oeuvre: d.id_oeuvre, titre: d.titre, id_type_oeuvre: d.id_type_oeuvre, ecriture: ECRITURE_PAR_LANGUE[d.id_langue],
      variante: d.variante_amazighe, partage_ouvert_le: d.partage_ouvert_le, auteur: d.Saiseur ? nomComplet(d.Saiseur) : null };
  });
}

/**
 * Relecture d'un modérateur : le texte entre dans les données ouvertes, ou en sort.
 * Seul un texte publié, en tamazight, écrit par une personne et dont l'auteur a accepté le partage peut entrer.
 */
async function decider(models, idOeuvre, valide, idModerateur) {
  const o = await models.Oeuvre.findByPk(Number(idOeuvre), {
    attributes: ['id_oeuvre', 'statut', 'id_langue', 'partage_ouvert', 'ecrit_par_humain', 'saisi_par'],
  });
  if (!o) throw erreurHttp('Œuvre introuvable', 404);
  if (valide) {
    if (!LANGUES_TAMAZIGHT.includes(Number(o.id_langue))) throw erreurHttp('Ce texte n’est pas écrit en tamazight', 400);
    if (o.statut !== 'publie') throw erreurHttp('Ce texte n’est pas publié', 400);
    if (!o.partage_ouvert || o.ecrit_par_humain !== true) throw erreurHttp('L’auteur n’a pas accepté le partage ouvert', 400);
    // Comme pour la publication : on ne relit pas son propre texte
    await require('../utils/estAdministrateur').refuserSiSonPropreContenu(models, idModerateur, o.saisi_par, 'votre propre texte');
  }
  await o.update(valide
    ? { donnees_ouvertes_valide: true, donnees_ouvertes_par: idModerateur, donnees_ouvertes_le: new Date() }
    : { donnees_ouvertes_valide: false, donnees_ouvertes_par: null, donnees_ouvertes_le: null });
  return { id_oeuvre: o.id_oeuvre, donnees_ouvertes_valide: !!valide };
}

/** Texte d'un article (blocs dans l'ordre) dans sa langue d'origine, et ses traductions par langue */
async function texteArticle(models, idOeuvre) {
  const { Article, ArticleBlock } = models;
  if (!Article || !ArticleBlock) return { texte: '', traductions: {} };
  const article = await Article.findOne({ where: { id_oeuvre: idOeuvre }, attributes: ['id_article'] });
  if (!article) return { texte: '', traductions: {} };
  const blocs = await ArticleBlock.findAll({
    where: { id_article: article.id_article, article_type: 'article', type_block: ['text', 'heading', 'citation', 'list'] },
    attributes: ['type_block', 'contenu', 'contenu_json', 'metadata', 'ordre'],
    order: [['ordre', 'ASC']],
  });
  const ligne = (b, champs) => (b.type_block === 'list'
    ? (Array.isArray(champs.contenu_json) ? champs.contenu_json.map((x) => `- ${plat(x)}`).join('\n') : '')
    : plat(champs.contenu));
  const morceaux = blocs.map((b) => ligne(b, b)).filter(Boolean);
  const traductions = {};
  for (const b of blocs) {
    const t = objet(b.metadata).traductions || {};
    for (const [langue, champs] of Object.entries(t)) {
      const x = ligne(b, champs || {});
      if (x) (traductions[langue] = traductions[langue] || []).push(x);
    }
  }
  return {
    texte: morceaux.join('\n\n'),
    traductions: Object.fromEntries(Object.entries(traductions).map(([l, m]) => [l, m.join('\n\n')])),
  };
}

/**
 * Jeu de données ouvert : chaque texte en tamazight relu, avec ses traductions et ses enregistrements, puis les
 * voix des lieux dont la personne a accepté la licence ouverte. Licence CC BY-SA 4.0 : citer l'auteur et Tala DZ.
 */
async function donneesOuvertes(models) {
  const { Oeuvre, User, Media } = models;
  const oeuvres = await Oeuvre.findAll({
    where: { ...OEUVRE_PUBLIQUE, partage_ouvert: true, ecrit_par_humain: true, donnees_ouvertes_valide: true },
    attributes: ['id_oeuvre', 'titre', 'description', 'id_type_oeuvre', 'id_langue', 'variante_amazighe', 'licence', 'date_creation', 'donnees_ouvertes_le'],
    include: [
      ...(User ? [{ model: User, as: 'Saiseur', attributes: ['nom', 'prenom'], required: false }] : []),
      ...(Media ? [{ model: Media, attributes: ['url', 'duree', 'credit'], where: { type_media: 'audio', visible_public: true }, required: false }] : []),
    ],
    order: [['id_oeuvre', 'ASC']],
  });
  const textes = [];
  const auteurs = await auteursDesOeuvres(models, oeuvres.map((o) => o.id_oeuvre)).catch(() => new Map());
  for (const o of oeuvres) {
    const d = o.get({ plain: true });
    const credite = auteurs.get(Number(d.id_oeuvre));
    const { texte, traductions } = await texteArticle(models, d.id_oeuvre);
    const titre = objet(d.titre);
    textes.push({
      id: `oeuvre-${d.id_oeuvre}`,
      titre,
      description: objet(d.description),
      texte,
      traductions,
      ecriture: ECRITURE_PAR_LANGUE[d.id_langue],
      variante: d.variante_amazighe || null,
      // Licence CC BY-SA : citer l'auteur crédité, pas la personne qui a saisi la fiche
      auteur: credite ? nomComplet(credite) : (d.Saiseur ? nomComplet(d.Saiseur) : null),
      ecrit_par_humain: true,
      audios: (d.Media || d.Medias || []).map((m) => ({ url: absolue(m.url), duree: m.duree || null, credit: m.credit || null })),
      licence: LICENCE_LIBELLE,
      source: `${SITE}${oeuvrePath(d.id_oeuvre, titre, d.id_type_oeuvre)}`,
      relu_le: d.donnees_ouvertes_le,
    });
  }
  const voix = (await voixDesLieux(models, { limit: 2000, maximum: 2000 }))
    .filter((v) => v.licence === LICENCE_OUVERTE)
    .map((v) => ({
      id: `voix-${v.id}`, url: absolue(v.url), ecriture: v.ecriture, parler: v.parler || null, credit: v.credit || null,
      lieu: texteLisible(v.lieu.nom), source: `${SITE}${lieuPath(v.lieu.id_lieu, v.lieu.nom)}`, licence: LICENCE_LIBELLE,
    }));
  return {
    nom: 'Tala DZ — textes et voix en tamazight',
    licence: LICENCE_LIBELLE,
    licence_url: LICENCE_URL,
    citation: 'Tala DZ (taladz.com) et les auteurs cités',
    genere_le: new Date().toISOString(),
    textes,
    voix,
  };
}

/** Les mêmes données en CSV (une ligne par texte ; traductions et audios réunis) */
function enCsv(jeu) {
  const { csvRow } = require('../utils/csv');
  const lignes = [csvRow(['id', 'titre', 'texte', 'ecriture', 'variante', 'auteur', 'traduction_ar', 'traduction_fr', 'audios', 'licence', 'source'])];
  for (const t of jeu.textes) {
    // Titre : en tamazight d'abord, sinon la première langue remplie (une langue vide peut venir en premier)
    const titre = ['tz-ltn', 'tz-tfng', 'fr', 'ar', 'en'].map((l) => t.titre[l]).find(Boolean) || Object.values(t.titre).find(Boolean) || '';
    lignes.push(csvRow([t.id, titre, t.texte, t.ecriture, t.variante || '', t.auteur || '',
      t.traductions.ar || '', t.traductions.fr || '', t.audios.map((a) => a.url).join(' '), t.licence, t.source]));
  }
  return lignes.join('\n');
}

module.exports = { liste, voixDesLieux, aRelire, decider, donneesOuvertes, texteArticle, enCsv, LANGUES_SITE_TAMAZIGHT };
