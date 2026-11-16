/**
 * Anti-retour (2026-11-16) : chaque type de contenu qui peut être mis en favori nettoie ses favoris
 * quand il est supprimé (crochet afterDestroy du modèle), sinon des favoris « fantômes » restent.
 * Un nouveau type ajouté au choix fixe des favoris sans son crochet fait échouer ce test.
 */
const fs = require('fs');
const path = require('path');

const MODELES = {
  oeuvre: 'oeuvres/oeuvre.js',
  evenement: 'events/evenement.js',
  lieu: 'places/lieu.js',
  artisanat: 'oeuvres/artisanat.js',
  service: 'places/service.js'
};

describe('favoris des contenus supprimés', () => {
  const dossier = path.join(__dirname, '../../models');
  const types = fs.readFileSync(path.join(dossier, 'misc/favori.js'), 'utf8')
    .match(/type_entite:\s*\{[\s\S]*?ENUM\(([^)]*)\)/)[1].match(/'([^']+)'/g).map((t) => t.replace(/'/g, ''));

  it('chaque type de favori a son modèle connu', () => {
    expect(types.filter((t) => !MODELES[t])).toEqual([]);
  });

  it.each(Object.entries(MODELES))('%s : afterDestroy efface ses favoris', (type, fichier) => {
    const source = fs.readFileSync(path.join(dossier, fichier), 'utf8');
    expect(source).toMatch(/afterDestroy/);
    expect(source).toContain(`Favori.destroy({ where: { type_entite: '${type}'`);
  });

  it('le crochet du service retire bien les favoris dans la transaction', async () => {
    const { Sequelize } = require('sequelize');
    // Aucune connexion ouverte : seul le crochet est appelé
    const sequelize = new Sequelize('mysql://essai:essai@127.0.0.1:1/essai', { logging: false });
    const destroy = jest.fn();
    sequelize.models.Favori = { destroy };
    const Service = require('../../models/places/service')(sequelize);
    await Service.runHooks('afterDestroy', { id: 7 }, { transaction: 'tx' });
    expect(destroy).toHaveBeenCalledWith({ where: { type_entite: 'service', id_entite: 7 }, transaction: 'tx' });
  });
});
