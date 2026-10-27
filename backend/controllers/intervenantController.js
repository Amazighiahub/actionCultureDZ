/**
 * IntervenantController - Refactoré avec BaseController + Service Pattern
 * Architecture: BaseController → Controller → Service → Models
 *
 * ZÉRO accès direct aux models Sequelize.
 * Toute logique métier/data access délèguée au IntervenantService via le container.
 */
const BaseController = require('./baseController');
const container = require('../services/serviceContainer');
const { translate, translateDeep } = require('../helpers/i18n');

// Champs de la fiche qu'un professionnel peut modifier (pas l'e-mail, le téléphone ni le compte lié)
const CHAMPS_MODIFIABLES_PRO = ['prenom', 'nom', 'biographie', 'titre_professionnel', 'organisation', 'site_web', 'photo_url',
  'date_naissance', 'lieu_naissance', 'date_deces', 'lieu_deces', 'wikipedia_url'];

class IntervenantController extends BaseController {
  get intervenantService() {
    return container.intervenantService;
  }

  // ========================================================================
  // CONSULTATION
  // ========================================================================

  async getIntervenants(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { page, limit } = this._paginate(req);
      const { search, organisation, pays_origine, actif, verifie, order, direction } = req.query;

      const result = await this.intervenantService.getIntervenants({
        page, limit, search, organisation, pays_origine, actif, verifie, order, direction, lang
      });

      res.json({
        success: true,
        data: translateDeep(result.data, lang),
        pagination: result.pagination,
        lang
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getIntervenantById(req, res) {
    try {
      const lang = req.lang || 'fr';
      const result = await this.intervenantService.getIntervenantById(req.params.id);

      if (!result) {
        return res.status(404).json({ success: false, error: req.t('intervenant.notFound') });
      }

      res.json({
        success: true,
        data: { ...translateDeep(result.intervenant, lang), statistiques: result.stats },
        lang
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getOeuvresByIntervenant(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { page, limit } = this._paginate(req);

      const result = await this.intervenantService.getOeuvresByIntervenant(req.params.id, { page, limit });

      if (!result) {
        return res.status(404).json({ success: false, error: req.t('intervenant.notFound') });
      }

      res.json({
        success: true,
        data: {
          oeuvres: result.data.map(o => translateDeep(o, lang)),
          pagination: result.pagination
        }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async searchIntervenants(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { q, limit = 10 } = req.query;

      if (!q || q.length < 2) {
        return res.json({ success: true, data: [] });
      }

      const intervenants = await this.intervenantService.searchIntervenants(q, limit, lang);
      const translated = translateDeep(intervenants, lang);

      res.json({
        success: true,
        data: translated.map(i => ({
          id: i.id_intervenant,
          label: `${i.titre_professionnel ? i.titre_professionnel + ' ' : ''}${i.prenom} ${i.nom}`,
          value: i.id_intervenant,
          prenom: i.prenom,
          nom: i.nom,
          titre: i.titre_professionnel,
          organisation: i.organisation,
          specialites: i.specialites || [],
          photo_url: i.photo_url
        })),
        lang
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getTypesIntervenants(req, res) {
    try {
      const data = await this.intervenantService.getTypesIntervenants();
      this._sendSuccess(res, data);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ========================================================================
  // CRÉATION / MODIFICATION / SUPPRESSION
  // ========================================================================

  async createIntervenant(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { nom, prenom } = req.body;

      if (!nom || !prenom) {
        return res.status(400).json({ success: false, error: req.t('common.badRequest') });
      }

      const intervenant = await this.intervenantService.createIntervenant(lang, req.body, { isAdmin: req.user?.isAdmin === true });
      this._sendCreated(res, translate(intervenant, lang), req.t('intervenant.created'));
    } catch (error) {
      if (error.code === 'USER_ALREADY_LINKED') {
        return res.status(400).json({
          success: false,
          error: req.t('intervenant.userAlreadyLinked', 'Ce compte utilisateur est déjà lié à un autre intervenant.')
        });
      }
      if (error.code === 'EMAIL_EXISTS') {
        return res.status(400).json({ success: false, error: req.t('intervenant.emailExists') });
      }
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          error: req.t('common.badRequest'),
          details: error.errors.map(e => ({ field: e.path, message: e.message }))
        });
      }
      this._handleError(res, error);
    }
  }

  /**
   * Fiche d'un intervenant à modifier (toutes les langues) et droit de la modifier
   */
  /** Page d'une personnalité : fiche, lieux liés, articles qui lui sont consacrés */
  async getPagePersonnalite(req, res) {
    const page = await this.intervenantService.pagePersonnalite(parseInt(req.params.id, 10), {
      userId: req.user?.id_user || null, isModerator: this._estModeration(req)
    });
    if (!page) return res.status(404).json({ success: false, error: req.t('intervenant.notFound') });
    res.json({ success: true, data: page });
  }

  /** Relier un article (éditeur avancé) à la page d'une personnalité */
  async lierArticle(req, res) {
    const lien = await this.intervenantService.lierArticle(parseInt(req.params.id, 10), {
      id_oeuvre: parseInt(req.body.id_oeuvre, 10)
    }, { userId: req.user.id_user, isModerator: this._estModeration(req) });
    res.status(201).json({ success: true, data: lien });
  }

  /** Retirer un article de la page d'une personnalité */
  async retirerArticle(req, res) {
    const resultat = await this.intervenantService.retirerArticle(
      parseInt(req.params.id, 10), parseInt(req.params.lienId, 10),
      { userId: req.user.id_user, isModerator: this._estModeration(req) }
    );
    if (resultat === 'introuvable') return res.status(404).json({ success: false, error: req.t('common.notFound') });
    if (resultat === 'interdit') {
      return res.status(403).json({ success: false, error: req.t('intervenant.articleForbidden', 'Seuls la personne qui l’a ajouté et la modération peuvent le retirer.') });
    }
    res.json({ success: true });
  }

  async getIntervenantEdition(req, res) {
    try {
      const { intervenant, peutModifier, raison } = await this.intervenantService.droitsEdition(req.params.id, req.user);
      if (!intervenant) {
        return res.status(404).json({ success: false, error: req.t('intervenant.notFound') });
      }
      const i = intervenant.toJSON();
      res.json({
        success: true,
        data: {
          id_intervenant: i.id_intervenant,
          prenom: i.prenom, nom: i.nom, biographie: i.biographie,
          titre_professionnel: i.titre_professionnel, organisation: i.organisation,
          site_web: i.site_web, photo_url: i.photo_url,
          date_naissance: i.date_naissance, lieu_naissance: i.lieu_naissance,
          date_deces: i.date_deces, lieu_deces: i.lieu_deces, wikipedia_url: i.wikipedia_url,
          peut_modifier: peutModifier, raison
        }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async updateIntervenant(req, res) {
    try {
      const lang = req.lang || 'fr';
      let donnees = req.body;
      // Un professionnel ne modifie que les intervenants qu'il a ajoutés, et seulement leur présentation
      if (!req.user.isAdmin) {
        const { intervenant, peutModifier } = await this.intervenantService.droitsEdition(req.params.id, req.user);
        if (!intervenant) {
          return res.status(404).json({ success: false, error: req.t('intervenant.notFound') });
        }
        if (!peutModifier) {
          return res.status(403).json({
            success: false,
            error: req.t('intervenant.editForbidden', 'Seule l’administration peut modifier la fiche de cet intervenant.')
          });
        }
        donnees = {};
        for (const champ of CHAMPS_MODIFIABLES_PRO) {
          if (req.body[champ] !== undefined) donnees[champ] = req.body[champ];
        }
      }
      const updated = await this.intervenantService.updateIntervenant(req.params.id, lang, donnees);

      if (!updated) {
        return res.status(404).json({ success: false, error: req.t('intervenant.notFound') });
      }

      res.json({
        success: true,
        message: req.t('intervenant.updated'),
        data: translateDeep(updated, lang)
      });
    } catch (error) {
      if (error.code === 'USER_ALREADY_LINKED') {
        return res.status(400).json({
          success: false,
          error: req.t('intervenant.userAlreadyLinked', 'Ce compte utilisateur est déjà lié à un autre intervenant.')
        });
      }
      if (error.code === 'EMAIL_EXISTS') {
        return res.status(400).json({ success: false, error: req.t('auth.emailAlreadyUsed') });
      }
      this._handleError(res, error);
    }
  }

  async deleteIntervenant(req, res) {
    try {
      const result = await this.intervenantService.deleteIntervenant(req.params.id);

      if (result.error === 'notFound') {
        return res.status(404).json({ success: false, error: req.t('intervenant.notFound') });
      }
      if (result.error === 'hasPrograms') {
        return res.status(400).json({
          success: false,
          error: req.t('intervenant.hasPrograms', { count: result.count })
        });
      }

      this._sendMessage(res, req.t('intervenant.deactivated'));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ========================================================================
  // TRADUCTIONS
  // ========================================================================

  async getIntervenantTranslations(req, res) {
    try {
      const data = await this.intervenantService.getIntervenantTranslations(req.params.id);

      if (!data) {
        return res.status(404).json({ success: false, error: req.t('intervenant.notFound') });
      }

      this._sendSuccess(res, data);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async updateIntervenantTranslation(req, res) {
    try {
      const targetLang = req.params.lang;
      const result = await this.intervenantService.updateIntervenantTranslation(req.params.id, targetLang, req.body);

      if (!result) {
        return res.status(404).json({ success: false, error: req.t('intervenant.notFound') });
      }
      if (result.empty) {
        return res.status(400).json({ success: false, error: req.t('common.badRequest') });
      }

      this._sendMessage(res, req.t('translation.updated', { lang: targetLang }));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ========================================================================
  // STATISTIQUES
  // ========================================================================

  async getStatistiques(req, res) {
    try {
      const data = await this.intervenantService.getStatistiques();
      this._sendSuccess(res, data);
    } catch (error) {
      this._handleError(res, error);
    }
  }
}

module.exports = new IntervenantController();
