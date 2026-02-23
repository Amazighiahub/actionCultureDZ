// Test rapide pour diagnostiquer l'erreur 500 sur /api/oeuvres/2
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('eventculture', 'root', 'root', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

async function testOeuvre2() {
  try {
    console.log('🔍 Connexion à la base de données...');
    await sequelize.authenticate();
    console.log('✅ Connecté\n');

    // 1. Vérifier si l'oeuvre 2 existe
    const [oeuvres] = await sequelize.query(
      'SELECT id_oeuvre, titre, id_type_oeuvre FROM oeuvre WHERE id_oeuvre = 2'
    );

    if (oeuvres.length === 0) {
      console.log('❌ L\'oeuvre id=2 n\'existe PAS dans la table oeuvre');
      process.exit(0);
    }

    const oeuvre = oeuvres[0];
    console.log('✅ Oeuvre trouvée:', oeuvre);

    // 2. Vérifier le type d'oeuvre
    const [typeOeuvres] = await sequelize.query(
      `SELECT id_type_oeuvre, nom_type FROM type_oeuvre WHERE id_type_oeuvre = ${oeuvre.id_type_oeuvre}`
    );

    if (typeOeuvres.length > 0) {
      console.log('   Type:', typeOeuvres[0].nom_type);
    }

    // 3. Vérifier si c'est un article scientifique
    if (oeuvre.id_type_oeuvre === 5) {
      const [articleScientifique] = await sequelize.query(
        'SELECT * FROM articlescientifique WHERE id_oeuvre = 2'
      );
      console.log('\n📄 Article scientifique:', articleScientifique.length > 0 ? articleScientifique[0] : 'AUCUN');

      // Vérifier les blocs
      if (articleScientifique.length > 0) {
        const idArticle = articleScientifique[0].id_article_scientifique;
        const [blocks] = await sequelize.query(
          `SELECT * FROM article_block WHERE id_article = ${idArticle} AND article_type = 'article_scientifique'`
        );
        console.log(`\n📦 Blocs trouvés: ${blocks.length}`);
        if (blocks.length > 0) {
          blocks.forEach((b, i) => {
            console.log(`   ${i + 1}. ${b.type_block} (ordre: ${b.ordre})`);
          });
        }
      }
    }

    // 4. Vérifier si c'est un article simple
    if (oeuvre.id_type_oeuvre === 4) {
      const [article] = await sequelize.query(
        'SELECT * FROM article WHERE id_oeuvre = 2'
      );
      console.log('\n📄 Article:', article.length > 0 ? article[0] : 'AUCUN');

      if (article.length > 0) {
        const idArticle = article[0].id_article;
        const [blocks] = await sequelize.query(
          `SELECT * FROM article_block WHERE id_article = ${idArticle} AND article_type = 'article'`
        );
        console.log(`\n📦 Blocs trouvés: ${blocks.length}`);
      }
    }

    // 5. Vérifier les médias
    const [medias] = await sequelize.query(
      'SELECT * FROM media WHERE id_oeuvre = 2'
    );
    console.log(`\n🖼️  Médias: ${medias.length}`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

testOeuvre2();
