// controllers/dashboard/usersMethods.js
// User management methods for DashboardController

const container = require('../../services/serviceContainer');

const usersMethods = {

  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 20, statut, type_user, search } = req.query;
      const result = await container.userManagementService.getAllUsersFiltered({ search, type_user, statut, page, limit });
      res.json({ success: true, data: { items: result.data, pagination: result.pagination } });
    } catch (error) {
      console.error('Erreur getAllUsers:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async getPendingUsers(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const result = await container.userManagementService.getPendingUsers({ page: parseInt(page), limit: parseInt(limit) });
      res.json({ success: true, data: { items: result.data, pagination: result.pagination } });
    } catch (error) {
      console.error('Erreur getPendingUsers:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async getUserDetails(req, res) {
    try {
      const { id } = req.params;
      const user = await container.userManagementService.getUserDetails(id);
      if (!user) return res.status(404).json({ success: false, error: req.t('auth.userNotFound') });
      res.json({ success: true, data: user });
    } catch (error) {
      if (error.message === 'Utilisateur non trouvé') {
        return res.status(404).json({ success: false, error: req.t('auth.userNotFound') });
      }
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

      const user = await container.userManagementService.updateUser(id, updateData);
      res.json({ success: true, message: req.t('admin.userUpdated'), data: user });
    } catch (error) {
      if (error.message === 'Utilisateur non trouvé') {
        return res.status(404).json({ success: false, error: req.t('auth.userNotFound') });
      }
      console.error('Erreur updateUser:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const result = await container.userManagementService.deleteUser(id, req.user.id_user, { hardDelete: true });

      this.clearCache(`user:${id}`);
      this.clearCache('users');

      res.json({ success: true, message: req.t('admin.userDeleted'), data: result });
    } catch (error) {
      if (error.message === 'CANNOT_DELETE_ADMIN') {
        return res.status(403).json({ success: false, error: req.t('admin.cannotDeleteAdmin') });
      }
      if (error.message === 'CANNOT_DELETE_SELF') {
        return res.status(403).json({ success: false, error: req.t('admin.cannotDeleteSelf') });
      }
      if (error.message === 'Utilisateur non trouvé') {
        return res.status(404).json({ success: false, error: req.t('auth.userNotFound') });
      }
      console.error('Erreur deleteUser:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError'), details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
  },

  async reactivateUser(req, res) {
    try {
      const { id } = req.params;
      const user = await container.userManagementService.reactivateUser(id);
      res.json({ success: true, message: req.t('admin.userReactivated'), data: user });
    } catch (error) {
      if (error.message === 'Utilisateur non trouvé') {
        return res.status(404).json({ success: false, error: req.t('auth.userNotFound') });
      }
      console.error('Erreur reactivateUser:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async changeUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role_id } = req.body;
      const { role } = await container.userManagementService.changeUserRole(id, role_id, req.user.id_user);
      res.json({ success: true, message: req.t('admin.roleChanged', { role: role.nom_role }), data: { user_id: id, role: role.nom_role } });
    } catch (error) {
      if (error.message === 'Utilisateur non trouvé') {
        return res.status(404).json({ success: false, error: req.t('auth.userNotFound') });
      }
      if (error.message === 'Rôle non trouvé') {
        return res.status(404).json({ success: false, error: req.t('admin.roleNotFound') });
      }
      console.error('Erreur changeUserRole:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async resetUserPassword(req, res) {
    try {
      const { id } = req.params;
      const result = await container.userManagementService.resetUserPassword(id);
      res.json({
        success: true, message: req.t('admin.passwordReset'),
        data: { temporaryPassword: result.tempPassword, note: 'L\'utilisateur devra changer ce mot de passe à sa prochaine connexion' }
      });
    } catch (error) {
      if (error.message === 'Utilisateur non trouvé') {
        return res.status(404).json({ success: false, error: req.t('auth.userNotFound') });
      }
      console.error('Erreur resetUserPassword:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async searchUsers(req, res) {
    try {
      const { q, type = 'nom' } = req.query;
      if (!q || typeof q !== 'string' || q.trim().length < 2) {
        return res.status(400).json({ success: false, error: req.t('common.badRequest') });
      }
      const users = await container.userManagementService.quickSearchUsers(q, type);
      res.json({ success: true, data: users });
    } catch (error) {
      console.error('Erreur searchUsers:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async bulkUserAction(req, res) {
    try {
      const { user_ids, action, role_id } = req.body;
      if (action === 'change_role' && !role_id) {
        return res.status(400).json({ success: false, error: req.t('common.badRequest') });
      }
      const results = await container.userManagementService.bulkUserAction(action, user_ids, { role_id }, req.user.id_user);
      const messages = {
        activate: 'Utilisateurs activés',
        deactivate: 'Utilisateurs désactivés',
        delete: 'Utilisateurs supprimés',
        change_role: 'Rôles mis à jour',
        validate: 'Utilisateurs validés'
      };
      res.json({ success: true, message: `${messages[action] || 'Action effectuée'} pour ${results.success.length} utilisateurs` });
    } catch (error) {
      console.error('Erreur bulkUserAction:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async exportUsers(req, res) {
    try {
      const { format = 'excel', type_user, statut, start_date, end_date } = req.query;
      const users = await container.userManagementService.exportUsers({
        filters: { type_user, statut, start_date, end_date }
      });

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
