#!/usr/bin/env node
/**
 * Crée (ou met à jour) un compte administrateur — remplace les comptes et mots de
 * passe autrefois livrés dans les seeds SQL.
 *
 * Usage (dans le conteneur backend) :
 *   docker exec -e ADMIN_EMAIL=moi@domaine.dz -e ADMIN_PASSWORD='...' \
 *     eventculture-backend node scripts/create-admin.js
 *
 * Variables : ADMIN_EMAIL, ADMIN_PASSWORD (obligatoires), ADMIN_NOM, ADMIN_PRENOM (optionnelles).
 * Idempotent : si l'email existe déjà, le mot de passe est remplacé et le rôle
 * Administrateur garanti (les sessions existantes de ce compte sont alors coupées).
 */
const bcrypt = require('bcrypt');
const { TYPE_USER_IDS } = require('../constants/typeUserIds');

const ADMIN_ROLE = 'Administrateur';

function readConfig(env = process.env) {
  const email = (env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = env.ADMIN_PASSWORD || '';
  const errors = [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('ADMIN_EMAIL invalide ou absent');
  // Même politique que l'inscription (CreateUserDTO)
  if (password.length < 12
      || !/[A-Z]/.test(password) || !/[a-z]/.test(password)
      || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('ADMIN_PASSWORD : 12 caractères minimum avec majuscule, minuscule, chiffre et caractère spécial');
  }
  return {
    errors,
    email,
    password,
    nom: (env.ADMIN_NOM || 'Admin').trim(),
    prenom: (env.ADMIN_PRENOM || 'Plateforme').trim()
  };
}

async function createOrUpdateAdmin(models, config) {
  const { User, Role, UserRole } = models;
  const role = await Role.findOne({ where: { nom_role: ADMIN_ROLE } });
  if (!role) throw new Error(`Rôle "${ADMIN_ROLE}" introuvable : charger d'abord les données de référence`);

  const rounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
  const hash = await bcrypt.hash(config.password, rounds);

  let user = await User.unscoped().findOne({ where: { email: config.email } });
  const created = !user;
  if (created) {
    user = await User.create({
      email: config.email,
      password: hash,
      nom: { fr: config.nom },
      prenom: { fr: config.prenom },
      id_type_user: TYPE_USER_IDS.ADMINISTRATEUR,
      accepte_conditions: true,
      date_acceptation_conditions: new Date()
    });
  }
  // beforeCreate met tout non-visiteur "en attente" : on active explicitement.
  // password_changed_at est posé par le hook beforeUpdate quand le mot de passe change.
  await user.update({
    password: hash,
    statut: 'actif',
    email_verifie: true,
    id_type_user: TYPE_USER_IDS.ADMINISTRATEUR,
    refresh_token: null,
    refresh_token_expires: null
  });
  await UserRole.findOrCreate({ where: { id_user: user.id_user, id_role: role.id_role } });
  return { created, id_user: user.id_user };
}

if (require.main === module) {
  const config = readConfig();
  if (config.errors.length) {
    console.error('❌ ' + config.errors.join('\n❌ '));
    process.exit(1);
  }
  const models = require('../models');
  createOrUpdateAdmin(models, config)
    .then(({ created, id_user }) => {
      console.log(`✅ Administrateur ${created ? 'créé' : 'mis à jour'} : ${config.email} (id ${id_user})`);
      return models.sequelize.close();
    })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ ' + err.message);
      process.exit(1);
    });
}

module.exports = { readConfig, createOrUpdateAdmin };
