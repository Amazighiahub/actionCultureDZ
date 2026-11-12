/**
 * « Votre fiche est complète à X % » : ce qui aide un professionnel à être trouvé sur Google, Bing
 * et ChatGPT, vérifié sur ses vraies données, avec ce qu'il reste à faire.
 */
const { texteLisible } = require('../helpers/i18n');
const { EVENEMENT_VISIBLE } = require('../constants/statuts');

const BIO_MIN = 300;
const DESCRIPTION_MIN = 150;
const lireListe = (v) => { if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch { return []; } };
const longueur = (v) => (texteLisible(v) || '').replace(/<[^>]*>/g, '').trim().length;

async function visibiliteFiche(models, idUser) {
  const u = await models.User.findByPk(idUser, { attributes: ['id_user', 'photo_url', 'biographie', 'wilaya_residence', 'profil_public', 'specialites'] });
  if (!u) return null;
  const oeuvres = models.Oeuvre ? await models.Oeuvre.findAll({
    where: { saisi_par: idUser, statut: 'publie' },
    attributes: ['id_oeuvre', 'titre', 'description', 'id_type_oeuvre'],
    include: models.Media ? [{ model: models.Media, attributes: ['type_media'], required: false }] : [],
    limit: 200,
  }) : [];
  const nbEvenements = models.Evenement ? await models.Evenement.count({ where: { id_user: idUser, statut: EVENEMENT_VISIBLE } }) : 0;
  const nbLiens = models.LienExterne ? await models.LienExterne.count({ where: { id_user: idUser } }) : 0;

  // Les articles n'ont pas forcément de photo : seules les autres œuvres sont comptées
  const sansPhoto = oeuvres.filter((o) => ![4, 5].includes(o.id_type_oeuvre) && !(o.Media || []).some((m) => m.type_media === 'image'));
  const descriptionCourte = oeuvres.filter((o) => longueur(o.description) < DESCRIPTION_MIN);
  const exemples = (liste) => liste.slice(0, 5).map((o) => ({ id: o.id_oeuvre, titre: texteLisible(o.titre), type: o.id_type_oeuvre }));

  const points = [
    { cle: 'public', ok: u.profil_public !== false },
    { cle: 'photo', ok: !!u.photo_url },
    { cle: 'biographie', ok: longueur(u.biographie) >= BIO_MIN, valeur: longueur(u.biographie), minimum: BIO_MIN },
    { cle: 'wilaya', ok: !!u.wilaya_residence },
    { cle: 'metiers', ok: Array.isArray(lireListe(u.specialites)) && lireListe(u.specialites).length > 0 },
    { cle: 'contenu', ok: oeuvres.length + nbEvenements > 0 },
    { cle: 'liens', ok: nbLiens > 0 },
    { cle: 'photos', ok: oeuvres.length > 0 && sansPhoto.length === 0, oeuvres: exemples(sansPhoto), nombre: sansPhoto.length },
    { cle: 'descriptions', ok: oeuvres.length > 0 && descriptionCourte.length === 0, oeuvres: exemples(descriptionCourte), nombre: descriptionCourte.length, minimum: DESCRIPTION_MIN },
  ];
  const faits = points.filter((p) => p.ok).length;
  return { score: Math.round((faits / points.length) * 100), points };
}

module.exports = { visibiliteFiche, BIO_MIN, DESCRIPTION_MIN };
