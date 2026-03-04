require('dotenv').config();
const db = require('./models');

async function test() {
  try {
    await db.sequelize.authenticate();
    const sequelize = db.sequelize;
    
    // Reproduce the exact query from the controller
    const orderClause = [[sequelize.literal("JSON_EXTRACT(`nom`, '$.fr')"), 'ASC']];
    
    const result = await db.Intervenant.findAndCountAll({
      include: [{
        model: db.User,
        as: 'UserAccount',
        attributes: ['id_user', 'prenom', 'nom', 'email'],
        required: false
      }],
      order: orderClause,
      limit: 20,
      offset: 0
    });
    
    console.log('SUCCESS! count:', result.count);
  } catch (e) {
    console.error('ERROR:', e.message);
    console.error('SQL:', e.sql || e.parent?.sql || 'N/A');
  } finally {
    await db.sequelize.close();
  }
}

test();
