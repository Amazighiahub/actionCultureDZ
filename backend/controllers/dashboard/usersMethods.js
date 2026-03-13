// controllers/dashboard/usersMethods.js
// User management methods for DashboardController

const { Op, fn, col, literal, where: seqWhere } = require('sequelize');

const TYPE_USER_IDS = {
  VISITEUR: 1, ECRIVAIN: 2, JOURNALISTE: 3, SCIENTIFIQUE: 4,
  ACTEUR: 5, ARTISTE: 6, ARTISAN: 7, REALISATEUR: 8,
  MUSICIEN: 9, PHOTOGRAPHE: 10, DANSEUR: 11, SCULPTEUR: 12, AUTRE: 13
};

const usersMethods = {

  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 20, statut, type_user, search } = req.query;
      const offset = (page - 1) * limit;
      const whereClause = {};

      if (statut && statut !== 'tous') whereClause.statut = statut;
      if (type_user && type_user !== 'tous') whereClause.id_type_user = parseInt(type_user);
      if (search && search.trim().length >= 2) {
        const safeTerm = search.trim().replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_').substring(0, 200);
        const searchTerm = `%${safeTerm}%`;
        whereClause[Op.or] = [
          seqWhere(fn('JSON_UNQUOTE', fn('JSON_EXTRACT', col('nom'), literal("'$.fr'"))), { [Op.like]: searchTerm }),
          seqWhere(fn('JSON_UNQUOTE', fn('JSON_EXTRACT', col('prenom'), literal("'$.fr'"))), { [Op.like]: searchTerm }),
          { email: { [Op.like]: searchTerm } }
        ];
      }

      const users = await this.models.User.findAndCountAll({
        where: whereClause,
        attributes: { exclude: ['password'] },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['date_creation', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          items: users.rows,
          pagination: { total: users.count, page: parseInt(page), pages: Math.ceil(users.count / limit), limit: parseInt(limit), hasNext: page < Math.ceil(users.count / limit), hasPrev: page > 1 }
        }
      });
    } catch (error) {
      console.error('Erreur getAllUsers:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async getPendingUsers(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      const users = await this.models.User.findAndCountAll({
        where: { id_type_user: { [Op.ne]: TYPE_USER_IDS.VISITEUR }, statut: 'en_attente_validation' },
        attributes: { exclude: ['password'] },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['date_creation', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          items: users.rows,
          pagination: { total: users.count, page: parseInt(page), pages: Math.ceil(users.count / limit), limit: parseInt(limit), hasNext: page < Math.ceil(users.count / limit), hasPrev: page > 1 }
        }
      });
    } catch (error) {
      console.error('Erreur getPendingUsers:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async getUserDetails(req, res) {
    try {
      const { id } = req.params;
      const user = await this.models.User.findByPk(id, {
        attributes: { exclude: ['password'] },
        include: [{ model: this.models.Role, as: 'Roles', through: { attributes: [] }, attributes: ['id_role', 'nom_role'] }]
      });
      if (!user) return res.status(404).json({ success: false, error: req.t('auth.userNotFound') });
      res.json({ success: true, data: user });
    } catch (error) {
      console.error('Erreur getUserDetails:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      delete updateData.password;
      delete updateData.id_user;
      delete updateData.date_creation;

      const user = await this.models.User.findByPk(id);
      if (!user) return res.status(404).json({ success: false, error: req.t('auth.userNotFound') });

      await user.update(updateData);
      await user.reload({ include: [{ model: this.models.Role, as: 'Roles', through: { attributes: [] } }] });
      res.json({ success: true, message: req.t('admin.userUpdated'), data: user });
    } catch (error) {
      console.error('Erreur updateUser:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const user = await this.models.User.findByPk(id, {
        include: [{ model: this.models.Role, as: 'Roles', through: { attributes: [] } }]
      });

      if (!user) return res.status(404).json({ success: false, error: req.t('auth.userNotFound') });
      if (user.Roles && user.Roles.some(r => r.nom_role === 'Admin' || r.nom_role === 'Super Admin')) {
        return res.status(403).json({ success: false, error: req.t('admin.cannotDeleteAdmin') });
      }
      if (user.id_user === req.user.id_user) {
        return res.status(403).json({ success: false, error: req.t('admin.cannotDeleteSelf') });
      }

      const transaction = await this.sequelize.transaction();
      try {
        const anonymousUserId = null;
        if (this.models.AuditLog) await this.models.AuditLog.update({ id_admin: null }, { where: { id_admin: id }, transaction });
        if (this.models.UserRole) await this.models.UserRole.destroy({ where: { id_user: id }, transaction });
        if (this.models.UserOrganisation) await this.models.UserOrganisation.destroy({ where: { id_user: id }, transaction });
        if (this.models.OeuvreUser) await this.models.OeuvreUser.destroy({ where: { id_user: id }, transaction });
        if (this.models.EvenementUser) await this.models.EvenementUser.destroy({ where: { id_user: id }, transaction });
        if (this.models.Oeuvre) {
          await this.models.Oeuvre.update({ saisi_par: anonymousUserId }, { where: { saisi_par: id }, transaction });
          await this.models.Oeuvre.update({ validateur_id: anonymousUserId }, { where: { validateur_id: id }, transaction });
        }
        if (this.models.Evenement) await this.models.Evenement.update({ id_user: anonymousUserId }, { where: { id_user: id }, transaction });
        if (this.models.Commentaire) await this.models.Commentaire.update({ id_user: anonymousUserId }, { where: { id_user: id }, transaction });
        if (this.models.CritiqueEvaluation) await this.models.CritiqueEvaluation.update({ id_user: anonymousUserId }, { where: { id_user: id }, transaction });
        if (this.models.Signalement) {
          await this.models.Signalement.update({ id_user: anonymousUserId }, { where: { id_user: id }, transaction });
          await this.models.Signalement.update({ id_moderateur: anonymousUserId }, { where: { id_moderateur: id }, transaction });
        }
        if (this.models.Favori) await this.models.Favori.destroy({ where: { id_user: id }, transaction });
        if (this.models.Notification) await this.models.Notification.destroy({ where: { id_user: id }, transaction });
        if (this.models.Session) await this.models.Session.destroy({ where: { id_user: id }, transaction });

        if (this.models.AuditLog) {
          await this.models.AuditLog.create({
            id_admin: req.user.id_user, action: 'DELETE_USER', type_entite: 'user', id_entite: id,
            details: JSON.stringify({ method: 'hard_delete', user_email: user.email, user_type: user.type_user, user_name: `${user.nom} ${user.prenom}`, deleted_at: new Date().toISOString() }),
            date_action: new Date()
          }, { transaction });
        }

        await user.destroy({ transaction });
        await transaction.commit();
      } catch (txError) {
        await transaction.rollback();
        throw txError;
      }

      this.clearCache(`user:${id}`);
      this.clearCache('users');

      res.json({
        success: true, message: req.t('admin.userDeleted'),
        data: { method: 'hard_delete', userId: parseInt(id), deletedBy: req.user.id_user, timestamp: new Date().toISOString() }
      });
    } catch (error) {
      console.error('Erreur deleteUser:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError'), details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
  },

  async reactivateUser(req, res) {
    try {
      const { id } = req.params;
      const user = await this.models.User.findByPk(id);
      if (!user) return res.status(404).json({ success: false, error: req.t('auth.userNotFound') });
      await user.update({ statut: 'actif', date_suspension: null, date_fin_suspension: null, raison_suspension: null, suspendu_par: null });
      res.json({ success: true, message: req.t('admin.userReactivated'), data: user });
    } catch (error) {
      console.error('Erreur reactivateUser:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async changeUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role_id } = req.body;
      const [user, role] = await Promise.all([this.models.User.findByPk(id), this.models.Role.findByPk(role_id)]);
      if (!user) return res.status(404).json({ success: false, error: req.t('auth.userNotFound') });
      if (!role) return res.status(404).json({ success: false, error: req.t('admin.roleNotFound') });
      await this.models.UserRole.destroy({ where: { id_user: id } });
      await this.models.UserRole.create({ id_user: id, id_role: role_id });
      res.json({ success: true, message: req.t('admin.roleChanged', { role: role.nom_role }), data: { user_id: id, role: role.nom_role } });
    } catch (error) {
      console.error('Erreur changeUserRole:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async resetUserPassword(req, res) {
    try {
      const { id } = req.params;
      const crypto = require('crypto');
      const user = await this.models.User.findByPk(id);
      if (!user) return res.status(404).json({ success: false, error: req.t('auth.userNotFound') });

      const temporaryPassword = crypto.randomBytes(8).toString('hex');
      const bcrypt = require('bcrypt');
      const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(temporaryPassword, rounds);
      await user.update({ password: hashedPassword, doit_changer_mdp: true });

      res.json({
        success: true, message: req.t('admin.passwordReset'),
        data: { temporaryPassword, note: 'L\'utilisateur devra changer ce mot de passe à sa prochaine connexion' }
      });
    } catch (error) {
      console.error('Erreur resetUserPassword:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async searchUsers(req, res) {
    try {
      const { q, type = 'nom' } = req.query;
      let whereClause = {};
      switch (type) {
        case 'email': whereClause = { email: { [Op.like]: `%${q}%` } }; break;
        case 'telephone': whereClause = { telephone: { [Op.like]: `%${q}%` } }; break;
        default: whereClause = { [Op.or]: [{ nom: { [Op.like]: `%${q}%` } }, { prenom: { [Op.like]: `%${q}%` } }] };
      }
      const users = await this.models.User.findAll({ where: whereClause, attributes: { exclude: ['password'] }, limit: 20, order: [['nom', 'ASC'], ['prenom', 'ASC']] });
      res.json({ success: true, data: users });
    } catch (error) {
      console.error('Erreur searchUsers:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async bulkUserAction(req, res) {
    try {
      const { user_ids, action, role_id } = req.body;
      let updateData = {};
      let message = '';

      switch (action) {
        case 'activate': updateData = { statut: 'actif' }; message = 'Utilisateurs activés'; break;
        case 'deactivate': updateData = { statut: 'inactif' }; message = 'Utilisateurs désactivés'; break;
        case 'delete': updateData = { statut: 'supprime', date_suppression: new Date() }; message = 'Utilisateurs supprimés'; break;
        case 'change_role':
          if (!role_id) return res.status(400).json({ success: false, error: req.t('common.badRequest') });
          break;
      }

      if (action === 'change_role') {
        await this.models.UserRole.destroy({ where: { id_user: user_ids } });
        await this.models.UserRole.bulkCreate(user_ids.map(id => ({ id_user: id, id_role: role_id })));
        message = 'Rôles mis à jour';
      } else {
        await this.models.User.update(updateData, { where: { id_user: user_ids } });
      }
      res.json({ success: true, message: `${message} pour ${user_ids.length} utilisateurs` });
    } catch (error) {
      console.error('Erreur bulkUserAction:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async exportUsers(req, res) {
    try {
      const { format = 'excel', type_user, statut, start_date, end_date } = req.query;
      const where = {};
      if (type_user) where.id_type_user = type_user;
      if (statut) where.statut = statut;
      if (start_date && end_date) where.date_creation = { [Op.between]: [new Date(start_date), new Date(end_date)] };

      const maxResults = 10000;
      const pageSize = 200;
      let allUsers = [];
      let offset = 0;
      while (allUsers.length < maxResults) {
        const batch = await this.models.User.findAll({
          where, attributes: { exclude: ['password'] },
          include: [{ model: this.models.Role, as: 'Roles', through: { attributes: [] } }],
          order: [['date_creation', 'DESC']], limit: pageSize, offset
        });
        if (batch.length === 0) break;
        allUsers = allUsers.concat(batch);
        offset += pageSize;
        if (batch.length < pageSize) break;
      }
      const users = allUsers.slice(0, maxResults);

      if (format === 'csv') {
        const csv = this.generateCSV(users);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=users_export.csv');
        res.send(csv);
      } else {
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Utilisateurs');
        worksheet.columns = [
          { header: 'ID', key: 'id_user', width: 10 }, { header: 'Nom', key: 'nom', width: 20 },
          { header: 'Prénom', key: 'prenom', width: 20 }, { header: 'Email', key: 'email', width: 30 },
          { header: 'Type', key: 'id_type_user', width: 15 }, { header: 'Statut', key: 'statut', width: 15 },
          { header: 'Date inscription', key: 'date_creation', width: 20 }, { header: 'Rôles', key: 'roles', width: 30 }
        ];
        users.forEach(user => {
          worksheet.addRow({ ...user.toJSON(), roles: user.Roles ? user.Roles.map(r => r.nom_role).join(', ') : '' });
        });
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=users_export.xlsx');
        await workbook.xlsx.write(res);
        res.end();
      }
    } catch (error) {
      console.error('Erreur exportUsers:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  generateCSV(users) {
    const headers = ['ID', 'Nom', 'Prénom', 'Email', 'Type', 'Statut', 'Date inscription', 'Rôles'];
    const rows = users.map(user => [
      user.id_user, user.nom, user.prenom, user.email, user.id_type_user,
      user.statut, user.date_creation, user.Roles ? user.Roles.map(r => r.nom_role).join(';') : ''
    ]);
    return [headers.join(','), ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))].join('\n');
  }
};

module.exports = usersMethods;
