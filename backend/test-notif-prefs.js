require('dotenv').config();
const { Sequelize } = require('sequelize');
const s = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST, dialect: 'mysql', logging: false
});

async function test() {
  try {
    const [cols] = await s.query("SHOW COLUMNS FROM user WHERE Field LIKE 'notif%'");
    console.log('Notification columns:', cols.map(c => c.Field + ' (' + c.Type + ')'));
    
    // Also check dashboard routes
    const [dashCols] = await s.query("SHOW TABLES LIKE 'audit%'");
    console.log('Audit tables:', dashCols.map(t => Object.values(t)[0]));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await s.close();
  }
}
test();
