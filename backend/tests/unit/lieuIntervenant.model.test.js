/**
 * Tests unitaires — modèle LieuIntervenant (définition Sequelize, sans connexion DB)
 */
const { Sequelize } = require('sequelize');

describe('LieuIntervenant model', () => {
  const sequelize = new Sequelize('mysql://test:test@127.0.0.1:3306/test', {
    dialect: 'mysql',
    logging: false
  });

  const defineLieuIntervenant = require('../../models/associations/lieuIntervenant');
  const LieuIntervenant = defineLieuIntervenant(sequelize);

  it('utilise la table lieu_intervenant', () => {
    expect(LieuIntervenant.tableName).toBe('lieu_intervenant');
  });

  it('expose les colonnes de liaison patrimoine ↔ personne', () => {
    const attrs = LieuIntervenant.rawAttributes;
    expect(attrs.id_lieu_intervenant.primaryKey).toBe(true);
    expect(attrs.id_lieu.allowNull).toBe(false);
    expect(attrs.id_intervenant.allowNull).toBe(false);
    expect(attrs.role_sur_site.type.key).toBe('STRING');
    expect(attrs.periode).toBeDefined();
    expect(attrs.contexte).toBeDefined();
    expect(attrs.ordre.defaultValue).toBe(0);
    expect(attrs.id_contributeur).toBeDefined();
  });

  it('définit une méthode associate', () => {
    expect(typeof LieuIntervenant.associate).toBe('function');
  });
});
