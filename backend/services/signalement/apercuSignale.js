/**
 * Ce que l'administrateur doit lire avant de décider : le contenu signalé, son auteur et un lien.
 * Sans cela, il sanctionnait sans voir le texte (« Non disponible » pour tous les signalements).
 */
const { texteLisible } = require('../../helpers/i18n');

const LONGUEUR_MAX = 600;
const extrait = (valeur) => {
  const texte = texteLisible(valeur);
  if (!texte) return null;
  return texte.length > LONGUEUR_MAX ? `${texte.slice(0, LONGUEUR_MAX)}…` : texte;
};
const nomComplet = (u) => [texteLisible(u?.prenom), texteLisible(u?.nom)].filter(Boolean).join(' ') || null;

const auteur = async (models, idUser) => {
  if (!idUser || !models.User) return null;
  const u = await models.User.findByPk(idUser, { attributes: ['id_user', 'nom', 'prenom'] });
  return u ? { id: u.id_user, nom: nomComplet(u) } : null;
};

/** Page du contenu auquel un commentaire est rattaché */
const lienCommentaire = (c) => {
  if (c.id_oeuvre) return `/oeuvres/${c.id_oeuvre}`;
  if (c.id_evenement) return `/evenements/${c.id_evenement}`;
  if (c.id_service) return `/services/${c.id_service}`;
  return null;
};

/**
 * @returns {Promise<{titre, contenu, lien, statut, auteur}|null>} null si le contenu n'existe plus
 */
async function apercuSignale(models, type, id) {
  switch (type) {
    case 'commentaire': {
      const c = await models.Commentaire?.findByPk(id, {
        attributes: ['id_commentaire', 'contenu', 'statut', 'id_user', 'id_oeuvre', 'id_evenement', 'id_service']
      });
      if (!c) return null;
      return { titre: null, contenu: extrait(c.contenu), lien: lienCommentaire(c), statut: c.statut, auteur: await auteur(models, c.id_user) };
    }
    case 'oeuvre': {
      const o = await models.Oeuvre?.findByPk(id, { attributes: ['id_oeuvre', 'titre', 'description', 'statut', 'saisi_par'] });
      if (!o) return null;
      return { titre: extrait(o.titre), contenu: extrait(o.description), lien: `/oeuvres/${o.id_oeuvre}`, statut: o.statut, auteur: await auteur(models, o.saisi_par) };
    }
    case 'artisanat': {
      const a = await models.Artisanat?.findByPk(id, {
        attributes: ['id_artisanat'],
        include: [{ model: models.Oeuvre, attributes: ['titre', 'description', 'statut', 'saisi_par'] }]
      });
      if (!a) return null;
      return { titre: extrait(a.Oeuvre?.titre), contenu: extrait(a.Oeuvre?.description), lien: `/artisanat/${a.id_artisanat}`, statut: a.Oeuvre?.statut || null, auteur: await auteur(models, a.Oeuvre?.saisi_par) };
    }
    case 'evenement': {
      const e = await models.Evenement?.findByPk(id, { attributes: ['id_evenement', 'nom_evenement', 'description', 'statut', 'id_user'] });
      if (!e) return null;
      return { titre: extrait(e.nom_evenement), contenu: extrait(e.description), lien: `/evenements/${e.id_evenement}`, statut: e.statut, auteur: await auteur(models, e.id_user) };
    }
    case 'user': {
      const u = await models.User?.findByPk(id, { attributes: ['id_user', 'nom', 'prenom', 'statut'] });
      if (!u) return null;
      return { titre: nomComplet(u), contenu: null, lien: `/professionnels/${u.id_user}`, statut: u.statut, auteur: { id: u.id_user, nom: nomComplet(u) } };
    }
    default:
      return null;
  }
}

module.exports = { apercuSignale };
