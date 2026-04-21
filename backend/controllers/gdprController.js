/**
 * GdprController - Droits RGPD de l'utilisateur sur ses propres donnees
 *
 * Scope :
 *   deleteMyAccount (art. 17 - droit a l'effacement),
 *   exportMyData    (art. 20 - droit a la portabilite).
 *
 * Delegue toute la logique a userService. Le controller ne fait que :
 *  - valider la presence du mot de passe pour deleteMyAccount
 *  - nettoyer les cookies d'auth apres suppression
 *  - forcer le content-type pour l'export (download JSON)
 */

const BaseController = require('./baseController');
const container = require('../services/serviceContainer');
const authCookies = require('../services/auth/authCookieService');

class GdprController extends BaseController {
  get userService() {
    return container.userService;
  }

  // ============================================================================
  // ART. 17 - DROIT A L'EFFACEMENT
  // ============================================================================

  async deleteMyAccount(req, res) {
    try {
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          error: req.t('auth.passwordRequired')
        });
      }

      await this.userService.deleteMyAccount(req.user.id_user, password);

      authCookies.clearAuthCookies(res);

      res.json({
        success: true,
        message: req.t('auth.accountDeleted', {
          defaultValue: 'Votre compte a ete supprime avec succes.'
        })
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // ART. 20 - DROIT A LA PORTABILITE
  // ============================================================================

  async exportMyData(req, res) {
    try {
      const data = await this.userService.exportMyData(req.user.id_user);

      // Download JSON : le navigateur propose la sauvegarde du fichier.
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="mes-donnees-${Date.now()}.json"`
      );

      res.json({ success: true, data });
    } catch (error) {
      this._handleError(res, error);
    }
  }
}

module.exports = new GdprController();
