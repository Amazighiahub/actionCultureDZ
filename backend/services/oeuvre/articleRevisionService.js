/**
 * ArticleRevisionService — propositions de modification d'un article publié.
 *
 * Une personne connectée propose une version complétée ou corrigée (titre, chapeau, blocs) et en
 * donne le motif. La proposition reste un brouillon invisible des visiteurs ; l'auteur de l'article
 * et l'administration sont notifiés. L'un ou l'autre l'accepte (elle remplace alors le contenu de
 * l'article, l'article reste publié) ou la refuse en expliquant pourquoi ; la personne qui a
 * proposé est notifiée de la décision.
 */
const crypto = require('crypto');
const BaseService = require('../core/baseService');
const { Op } = require('sequelize');
const { sanitizeBlockContent, sanitizeBlockJson } = require('../../utils/sanitizeArticle');
const { peutGerer } = require('../../utils/droits');
const { mergeTranslations, translate, lireMultiLang } = require('../../helpers/i18n');
const { idsAdministrateurs, notifier } = require('../../utils/notifierModeration');

const TYPES_BLOCS = ['text', 'heading', 'image', 'video', 'citation', 'list', 'table', 'code', 'separator', 'embed'];
const MAX_BLOCS = 150;
const MAX_EN_ATTENTE_PAR_PERSONNE = 3;
// Images d'une proposition : envoyées par /upload/image (Cloudinary) ou fichiers du site
// Image du compte Cloudinary du site, ou fichier local (avant : n'importe quel compte Cloudinary)
// Adresse analysée (un « ../ » ou « %2e%2e » ne fait plus sortir du compte), comme les photos de profil
const imageAutorisee = (url) => {
  if (typeof url !== 'string') return false;
  if (/^\/uploads\/[\w./-]+$/.test(url)) return !url.includes('..');
  if (/%2e/i.test(url)) return false;
  return require('../../dto/baseDTO').isOwnMediaUrl(url);
};

/** Titre ou résumé proposé : texte, ou objet par langue ; longueur bornée (avant : sans limite) */
function texteProposeValide(valeur, max, champ, erreur) {
  if (valeur === undefined || valeur === null || valeur === '') return null;
  const valeurs = typeof valeur === 'string' ? [valeur]
    : (typeof valeur === 'object' && !Array.isArray(valeur) ? Object.values(valeur) : null);
  if (!valeurs || valeurs.some((v) => typeof v !== 'string')) throw erreur(`${champ} invalide`);
  if (typeof valeur === 'object' && Object.keys(valeur).length > 6) throw erreur(`${champ} : trop de langues`);
  if (valeurs.some((v) => v.length > max)) throw erreur(`${champ} : ${max} caractères au plus`);
  return valeur;
}

class ArticleRevisionService extends BaseService {
  constructor(models, { notificationService } = {}) {
    super(null, { models });
    this.notificationService = notificationService;
  }

  // --------------------------------------------------------------------------
  // Lecture
  // --------------------------------------------------------------------------

  /**
   * Propositions visibles par le compte : auteur de l'article et administration → toutes ;
   * sinon → les siennes, et les modifications acceptées (historique, sans le contenu).
   */
  async lister(idOeuvre, { userId = null, isModerator = false } = {}) {
    const { ArticleRevision, Oeuvre, User } = this.models;
    const oeuvre = await Oeuvre.findByPk(idOeuvre, { attributes: ['id_oeuvre', 'saisi_par'] });
    if (!oeuvre) throw this._notFoundError(idOeuvre);
    const gestion = peutGerer(oeuvre.saisi_par, { userId, isModerator });
    const revisions = await ArticleRevision.findAll({
      where: gestion ? { id_oeuvre: idOeuvre } : {
        id_oeuvre: idOeuvre,
        [Op.or]: [{ statut: 'acceptee' }, ...(userId ? [{ id_auteur: userId }] : [])]
      },
      attributes: ['id_revision', 'id_auteur', 'motif', 'statut', 'motif_refus', 'date_creation', 'date_decision'],
      include: [{ model: User, as: 'Auteur', attributes: ['id_user', 'nom', 'prenom'], required: false }],
      order: [['date_creation', 'DESC']]
    });
    return { peut_decider: gestion, revisions: revisions.map(r => r.get({ plain: true })) };
  }

  /** Une proposition avec son contenu : auteur de l'article, administration ou personne qui l'a proposée */
  async detail(idOeuvre, idRevision, { userId = null, isModerator = false } = {}) {
    const { ArticleRevision, Oeuvre, User } = this.models;
    const revision = await ArticleRevision.findOne({
      where: { id_revision: idRevision, id_oeuvre: idOeuvre },
      include: [{ model: User, as: 'Auteur', attributes: ['id_user', 'nom', 'prenom'], required: false }]
    });
    if (!revision) return null;
    const oeuvre = await Oeuvre.findByPk(idOeuvre, { attributes: ['saisi_par'] });
    const autorise = peutGerer([revision.id_auteur, oeuvre?.saisi_par], { userId, isModerator });
    if (!autorise) throw this._forbiddenError('Cette proposition n’est visible que par son auteur, l’auteur de l’article et l’administration');
    return { ...revision.get({ plain: true }), peut_decider: peutGerer(oeuvre?.saisi_par, { userId, isModerator }) };
  }

  // --------------------------------------------------------------------------
  // Proposer
  // --------------------------------------------------------------------------

  /**
   * Nouvelle proposition (brouillon) ; l'auteur de l'article et l'administration sont notifiés.
   * @param {{ motif: string, titre?: Object|string, description?: Object|string, blocks: Array }} donnees
   */
  async proposer(idOeuvre, donnees, { userId }) {
    const { ArticleRevision, Oeuvre, Media, User } = this.models;
    const oeuvre = await Oeuvre.findByPk(idOeuvre, { attributes: ['id_oeuvre', 'titre', 'id_type_oeuvre', 'statut', 'saisi_par'] });
    if (!oeuvre || ![4, 5].includes(oeuvre.id_type_oeuvre)) throw this._notFoundError(idOeuvre);
    if (oeuvre.statut !== 'publie') throw this._validationError('Seul un article publié peut recevoir des propositions de modification');
    if (oeuvre.saisi_par === userId) throw this._validationError('Vous êtes l’auteur de cet article : modifiez-le directement');

    const motif = String(donnees.motif || '').trim();
    if (motif.length < 5) throw this._validationError('Expliquez en quelques mots ce que vous ajoutez ou corrigez (motif)');
    if (motif.length > 2000) throw this._validationError('Motif trop long (2 000 caractères au plus)');

    const enAttente = await ArticleRevision.count({ where: { id_oeuvre: idOeuvre, id_auteur: userId, statut: 'en_attente' } });
    if (enAttente >= MAX_EN_ATTENTE_PAR_PERSONNE) {
      throw this._validationError('Vous avez déjà des propositions en attente pour cet article : attendez la réponse de son auteur');
    }

    // Mêmes limites qu'à la création d'une œuvre (sinon un article existant plus long refuserait toute proposition)
    const titrePropose = texteProposeValide(donnees.titre, 500, 'Titre', (m) => this._validationError(m));
    const descriptionProposee = texteProposeValide(donnees.description, typeof donnees.description === 'object' ? 50000 : 10000, 'Résumé', (m) => this._validationError(m));
    const blocks = await this._blocsValides(donnees.blocks, idOeuvre, Media);
    // Empreinte de l'article au moment de la proposition : à l'acceptation, on saura s'il a changé
    const empreinte_base = await this._empreinteArticle(oeuvre);
    const revision = await ArticleRevision.create({
      id_oeuvre: idOeuvre,
      id_auteur: userId,
      motif,
      contenu: { titre: titrePropose, description: descriptionProposee, blocks, empreinte_base },
      statut: 'en_attente'
    });

    // Notifications : auteur de l'article et administration (une seule fois chacun)
    const proposant = await User.findByPk(userId, { attributes: ['prenom', 'nom'] });
    const nom = [proposant?.prenom, proposant?.nom].map(v => translate(lireMultiLang(v), 'fr')).filter(Boolean).join(' ') || 'Un contributeur';
    const titre = translate(lireMultiLang(oeuvre.titre), 'fr');
    const destinataires = new Set([...(oeuvre.saisi_par ? [oeuvre.saisi_par] : []), ...(await this._administrateurs())]);
    destinataires.delete(userId);
    for (const id of destinataires) {
      await this._notifier(id, {
        titre: 'Proposition de modification',
        message: `${nom} propose une modification de « ${titre} » : ${motif.slice(0, 300)}`,
        url_action: `/articles/${idOeuvre}?proposition=${revision.id_revision}`,
        metadata: { id_oeuvre: idOeuvre, id_revision: revision.id_revision }
      });
    }
    return revision;
  }

  // --------------------------------------------------------------------------
  // Décider
  // --------------------------------------------------------------------------

  /**
   * Accepter (la proposition remplace le contenu de l'article) ou refuser (avec un motif).
   * Réservé à l'auteur de l'article et à l'administration.
   */
  async decider(idOeuvre, idRevision, { decision, motif_refus, forcer = false }, { userId, isModerator = false }) {
    const { ArticleRevision, Oeuvre, Article, ArticleScientifique, ArticleBlock, Media } = this.models;
    const revision = await ArticleRevision.findOne({ where: { id_revision: idRevision, id_oeuvre: idOeuvre } });
    if (!revision) throw this._notFoundError(idRevision);
    const oeuvre = await Oeuvre.findByPk(idOeuvre);
    if (!oeuvre) throw this._notFoundError(idOeuvre);
    if (!peutGerer(oeuvre.saisi_par, { userId, isModerator })) {
      throw this._forbiddenError('Seuls l’auteur de l’article et l’administration peuvent décider');
    }
    if (revision.statut !== 'en_attente') throw this._validationError('Cette proposition a déjà été traitée');
    if (!['accepter', 'refuser'].includes(decision)) throw this._validationError('Décision invalide');

    const titreArticle = typeof oeuvre.titre === 'object' && oeuvre.titre ? (oeuvre.titre.fr || Object.values(oeuvre.titre)[0]) : oeuvre.titre;

    if (decision === 'refuser') {
      const raison = String(motif_refus || '').trim();
      if (raison.length < 3) throw this._validationError('Expliquez à la personne pourquoi la proposition est refusée');
      // Relue sous verrou : une acceptation simultanée n'est pas marquée « refusée » après coup
      await Oeuvre.sequelize.transaction(async (transaction) => {
        const verrouillee = await ArticleRevision.findByPk(revision.id_revision, { transaction, lock: transaction.LOCK.UPDATE });
        if (!verrouillee || verrouillee.statut !== 'en_attente') throw this._validationError('Cette proposition a déjà été traitée');
        await revision.update({ statut: 'refusee', motif_refus: raison.slice(0, 2000), id_decideur: userId, date_decision: new Date() }, { transaction });
      });
      await this._notifier(revision.id_auteur, {
        titre: 'Proposition refusée',
        message: `Votre proposition de modification de « ${titreArticle} » n’a pas été retenue : ${raison.slice(0, 300)}`,
        url_action: `/articles/${idOeuvre}`,
        metadata: { id_oeuvre: idOeuvre, id_revision: revision.id_revision }
      });
      return revision;
    }

    // Accepter : titre, chapeau et blocs de l'article remplacés en une transaction
    const scientifique = oeuvre.id_type_oeuvre === 5;
    const Modele = scientifique ? ArticleScientifique : Article;
    const fiche = await Modele.findOne({ where: { id_oeuvre: idOeuvre } });
    if (!fiche) throw this._validationError('Article introuvable');
    const idArticle = scientifique ? fiche.id_article_scientifique : fiche.id_article;
    const articleType = scientifique ? 'article_scientifique' : 'article';
    const { titre, description, blocks, empreinte_base } = revision.contenu || {};

    // L'article a changé depuis la proposition (autre proposition acceptée, ajouts de l'auteur) : on
    // prévient au lieu d'écraser sans le dire. Le décideur peut confirmer (forcer). Les propositions
    // plus anciennes n'ont pas d'empreinte : pas de contrôle possible.
    const blocsActuels = await ArticleBlock.findAll({
      where: { id_article: idArticle, article_type: articleType }, order: [['ordre', 'ASC']], raw: true
    });
    if (empreinte_base && !forcer && empreinte_base !== this._empreinte(oeuvre, blocsActuels)) {
      throw Object.assign(
        new Error('L’article a été modifié depuis cette proposition : l’accepter remplacera ces changements.'),
        { statusCode: 409, code: 'ARTICLE_MODIFIE' }
      );
    }

    await Oeuvre.sequelize.transaction(async (transaction) => {
      // Relue sous verrou : deux « Accepter » simultanés n'appliquent pas deux fois les blocs
      const verrouillee = await ArticleRevision.findByPk(revision.id_revision, { transaction, lock: transaction.LOCK.UPDATE });
      if (!verrouillee || verrouillee.statut !== 'en_attente') throw this._validationError('Cette proposition a déjà été traitée');
      const maj = {};
      if (titre) maj.titre = mergeTranslations(oeuvre.titre, typeof titre === 'string' ? { fr: titre } : titre);
      if (description) maj.description = mergeTranslations(oeuvre.description, typeof description === 'string' ? { fr: description } : description);
      if (Object.keys(maj).length) await oeuvre.update(maj, { transaction });

      await ArticleBlock.destroy({ where: { id_article: idArticle, article_type: articleType }, transaction });
      for (let i = 0; i < (blocks || []).length; i++) {
        const b = blocks[i];
        let idMedia = b.id_media || null;
        // Média retiré depuis la proposition : sinon la clé étrangère bloquait toute acceptation
        if (idMedia && !(await Media.count({ where: { id_media: idMedia }, transaction }))) idMedia = null;
        if (b.type_block === 'image' && !idMedia && !b.metadata?.url) continue;
        // Nouvelle photo de la proposition : devient un média de l'article
        if (b.type_block === 'image' && !idMedia && b.metadata?.url) {
          const media = await Media.create({
            id_oeuvre: idOeuvre, type_media: 'image', url: b.metadata.url,
            titre: b.metadata.caption || null, ordre: i
          }, { transaction });
          idMedia = media.id_media;
        }
        const metadata = { ...(b.metadata || {}) };
        delete metadata.url;
        await ArticleBlock.create({
          id_article: idArticle, article_type: articleType, type_block: b.type_block,
          contenu: sanitizeBlockContent(b.type_block, b.contenu || ''),
          contenu_json: sanitizeBlockJson(b.type_block, b.contenu_json) ?? null, metadata, id_media: idMedia, ordre: i, visible: true
        }, { transaction });
      }
      // L'ancienne version reste gardée avec la proposition : rien n'est perdu définitivement
      await revision.update({
        statut: 'acceptee', id_decideur: userId, date_decision: new Date(),
        contenu: { ...revision.contenu, version_remplacee: { titre: oeuvre.titre, description: oeuvre.description, blocks: blocsActuels } }
      }, { transaction });
    });

    await this._notifier(revision.id_auteur, {
      titre: 'Proposition acceptée',
      message: `Merci ! Votre modification de « ${titreArticle} » a été acceptée et publiée.`,
      url_action: `/articles/${idOeuvre}`,
      metadata: { id_oeuvre: idOeuvre, id_revision: revision.id_revision }
    });
    return revision;
  }

  // --------------------------------------------------------------------------
  // Outils
  // --------------------------------------------------------------------------

  /** Empreinte du contenu d'un article : titre, chapeau et blocs (type, texte, données, image, ordre) */
  _empreinte(oeuvre, blocs) {
    const lire = (v) => (typeof v === 'string' ? (() => { try { return JSON.parse(v); } catch { return v; } })() : v);
    const contenu = {
      titre: lire(oeuvre.titre) ?? null,
      description: lire(oeuvre.description) ?? null,
      blocs: blocs.map(b => [b.type_block, b.contenu ?? '', lire(b.contenu_json) ?? null, b.id_media ?? null])
    };
    return crypto.createHash('sha256').update(JSON.stringify(contenu)).digest('hex');
  }

  async _empreinteArticle(oeuvre) {
    const { Article, ArticleScientifique, ArticleBlock } = this.models;
    const scientifique = oeuvre.id_type_oeuvre === 5;
    const fiche = await (scientifique ? ArticleScientifique : Article).findOne({ where: { id_oeuvre: oeuvre.id_oeuvre } });
    if (!fiche) return null;
    const blocs = await ArticleBlock.findAll({
      where: { id_article: scientifique ? fiche.id_article_scientifique : fiche.id_article, article_type: scientifique ? 'article_scientifique' : 'article' },
      order: [['ordre', 'ASC']], raw: true
    });
    return this._empreinte(oeuvre, blocs);
  }

  /** Blocs proposés : types connus, taille raisonnable, images autorisées ou déjà dans l'article */
  async _blocsValides(blocks, idOeuvre, Media) {
    if (!Array.isArray(blocks) || blocks.length === 0) throw this._validationError('L’article proposé est vide');
    if (blocks.length > MAX_BLOCS) throw this._validationError(`Trop de blocs (${MAX_BLOCS} au plus)`);
    const idsMedias = blocks.filter(b => b?.type_block === 'image' && b.id_media).map(b => Number(b.id_media));
    const mediasArticle = idsMedias.length
      ? new Set((await Media.findAll({ where: { id_media: idsMedias, id_oeuvre: idOeuvre }, attributes: ['id_media'] })).map(m => m.id_media))
      : new Set();
    return blocks.map((b, i) => {
      if (!b || !TYPES_BLOCS.includes(b.type_block)) throw this._validationError(`Bloc ${i + 1} : type inconnu`);
      const contenu = b.contenu == null ? '' : String(b.contenu);
      if (contenu.length > 20000) throw this._validationError(`Bloc ${i + 1} : contenu trop long`);
      const metadata = b.metadata && typeof b.metadata === 'object' && !Array.isArray(b.metadata) ? { ...b.metadata } : {};
      delete metadata.tempFile;
      const bloc = { type_block: b.type_block, contenu, contenu_json: sanitizeBlockJson(b.type_block, b.contenu_json) ?? null, metadata };
      if (b.type_block === 'image') {
        if (b.id_media && mediasArticle.has(Number(b.id_media))) bloc.id_media = Number(b.id_media);
        else if (imageAutorisee(metadata.url)) bloc.metadata.url = metadata.url;
        else throw this._validationError(`Bloc ${i + 1} : image manquante ou non autorisée`);
      } else {
        delete bloc.metadata.url;
      }
      return bloc;
    });
  }

  _administrateurs() {
    return idsAdministrateurs(this.models);
  }

  _notifier(idUser, contenu) {
    return notifier(this.notificationService, idUser, contenu);
  }
}

module.exports = ArticleRevisionService;
