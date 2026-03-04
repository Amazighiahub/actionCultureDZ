require('dotenv').config();
const { Sequelize } = require('sequelize');
const s = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST, dialect: 'mysql', logging: false
});

async function check() {
  try {
    // Check admin users
    const [admins] = await s.query(`
      SELECT u.id_user, u.email, u.statut, u.password, r.nom_role 
      FROM user u 
      LEFT JOIN userroles ur ON u.id_user = ur.id_user 
      LEFT JOIN role r ON ur.id_role = r.id_role 
      WHERE r.nom_role = 'Admin' OR u.email LIKE '%admin%' 
      LIMIT 5
    `);
    console.log('Admin users:', JSON.stringify(admins.map(a => ({ id: a.id_user, email: a.email, statut: a.statut, role: a.nom_role, hasPassword: !!a.password })), null, 2));

    // Check all roles
    const [roles] = await s.query('SELECT * FROM role');
    console.log('Roles:', JSON.stringify(roles, null, 2));

    // Check all user types
    const [types] = await s.query('SELECT * FROM type_user');
    console.log('Types:', JSON.stringify(types, null, 2));

    // Count users by type
    const [counts] = await s.query('SELECT id_type_user, COUNT(*) as cnt FROM user GROUP BY id_type_user');
    console.log('User counts by type:', JSON.stringify(counts, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await s.close();
  }
}

check();
