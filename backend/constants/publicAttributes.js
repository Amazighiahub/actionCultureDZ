/**
 * Champs exposables publiquement — source unique pour les `attributes` Sequelize
 * des réponses publiques (listes, includes User/Intervenant).
 * Ne jamais renvoyer un User sans `attributes` sur une route publique :
 * le defaultScope ne retire que le mot de passe, les tokens et les IP.
 */

// Identité minimale d'un utilisateur (auteur, organisateur, saisisseur...)
const PUBLIC_USER_ATTRIBUTES = ['id_user', 'nom', 'prenom', 'photo_url'];

// Profil public d'un professionnel. email/telephone ne sont lus que pour être
// filtrés par stripPrivateContact selon email_public / telephone_public.
const PUBLIC_USER_PROFILE_ATTRIBUTES = [
  ...PUBLIC_USER_ATTRIBUTES,
  'id_type_user', 'entreprise', 'specialites', 'site_web', 'biographie',
  'wilaya_residence', 'id_commune', 'reseaux_sociaux',
  'email', 'telephone', 'email_public', 'telephone_public'
];

// Fiche publique d'un intervenant (sans email, téléphone ni compte lié)
const PUBLIC_INTERVENANT_ATTRIBUTES = [
  'id_intervenant', 'nom', 'prenom', 'titre_professionnel', 'organisation',
  'biographie', 'photo_url', 'specialites', 'site_web', 'reseaux_sociaux',
  'pays_origine', 'langues_parlees', 'prix_distinctions', 'wikipedia_url',
  'date_deces', 'lieu_deces', 'verifie', 'id_commune'
];

/**
 * Retire email / téléphone d'un utilisateur s'il ne les a pas rendus publics.
 * Accepte une instance Sequelize ou un objet simple ; modifie et renvoie l'objet.
 */
function stripPrivateContact(user) {
  if (!user) return user;
  const get = (k) => (typeof user.get === 'function' ? user.get(k) : user[k]);
  const set = (k, v) => (typeof user.setDataValue === 'function' ? user.setDataValue(k, v) : (user[k] = v));
  if (!get('email_public')) set('email', null);
  if (!get('telephone_public')) set('telephone', null);
  return user;
}

module.exports = {
  PUBLIC_USER_ATTRIBUTES,
  PUBLIC_USER_PROFILE_ATTRIBUTES,
  PUBLIC_INTERVENANT_ATTRIBUTES,
  stripPrivateContact
};
