// routes/ogRoutes.js
// Pages lisibles sans JavaScript, pour les robots qui ne l'exécutent pas : réseaux sociaux
// (Facebook, WhatsApp, LinkedIn…) et moteurs de recherche ou assistants (Bing, ChatGPT, Perplexity…).
// Sans cette route, ils ne voyaient qu'une page vide au titre générique. nginx leur envoie les
// pages de détail ici (voir nginx/prod.conf) ; les visiteurs et Google reçoivent le site normal.
// Le contenu est le même que celui du site (aucun texte réservé aux robots) : titre, description,
// liste des œuvres et des événements, liens, et données structurées schema.org.

const express = require('express');
const logger = require('../utils/logger');
const { texteLisible } = require('../helpers/i18n');
const { professionnelPath, evenementPath, organisationPath, oeuvrePath, artisanatPath } = require('../utils/slug');
const { PROFESSIONAL_TYPE_IDS } = require('../constants/publicAttributes');

const SITE_URL = (process.env.FRONTEND_URL || 'https://taladz.com').replace(/\/$/, '');
const SITE_NAME = 'Tala DZ';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;
const DEFAULT_DESCRIPTION = "Explorez, préservez et partagez la richesse culturelle de l'Algérie : événements, patrimoine, œuvres, artisanat traditionnel.";
const MAX_LISTE = 50;

const escapeHtml = (str) => String(str)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Texte d'un champ multilingue ({ fr, ar, ... }) : français, langue de référence du site */
function text(value) {
  return texteLisible(value);
}

/** Texte brut : balises retirées, espaces resserrés */
const plat = (value) => text(value).replace(/<[^>]*>/g, ' ').replace(/[ \t]+/g, ' ').trim();

/** Résumé d'une description (balises retirées, ~200 caractères, coupé sur un mot) */
function summary(value, max = 200) {
  const plain = plat(value).replace(/\s+/g, ' ');
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

/** Image absolue au format attendu par les réseaux sociaux (1200x630, JPEG) */
function socialImage(url) {
  if (!url) return DEFAULT_IMAGE;
  const m = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/.exec(url);
  if (m) {
    if (/\.(pdf|svg)(\?|$)/i.test(m[2])) return DEFAULT_IMAGE;
    // Pas de transformation existante : recadrage 1200x630 centré sur le sujet
    return /^[a-z]{1,3}_[^/]*\//.test(m[2]) ? url : `${m[1]}c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/${m[2]}`;
  }
  if (/^https?:\/\//.test(url)) return url;
  if (/\.svg(\?|$)/i.test(url)) return DEFAULT_IMAGE;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Image d'origine en adresse absolue (données structurées) */
const imageAbsolue = (url) => {
  if (!url || /\.svg(\?|$)/i.test(url)) return undefined;
  return /^https?:\/\//.test(url) ? url : `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

/** Données structurées sans valeur vide ; « < » échappé pour ne jamais fermer la balise script */
const jsonLdTexte = (objet) => JSON.stringify(objet, (k, v) => (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length) ? undefined : v))
  .replace(/</g, '\\u003c');

/** Paragraphes d'un texte long (biographie, description) */
const paragraphes = (value) => plat(value).split(/\n{2,}|\r?\n/).map((p) => p.trim()).filter(Boolean)
  .map((p) => `<p>${escapeHtml(p)}</p>`).join('\n');

/** Section « titre + liste de liens » */
const sectionLiens = (titre, liens) => (liens.length
  ? `<section>\n<h2>${escapeHtml(titre)}</h2>\n<ul>\n${liens.map((l) => `<li><a href="${escapeHtml(l.url)}">${escapeHtml(l.texte)}</a>${l.detail ? ` — ${escapeHtml(l.detail)}` : ''}</li>`).join('\n')}\n</ul>\n</section>`
  : '');

/** Fiche « Informations » : liste de couples libellé / valeur */
const sectionFaits = (faits) => {
  const lignes = faits.filter(([, v]) => v);
  return lignes.length ? `<ul>\n${lignes.map(([k, v]) => `<li>${escapeHtml(k)} : ${escapeHtml(v)}</li>`).join('\n')}\n</ul>` : '';
};

/** Page HTML lue par les robots qui n'exécutent pas le JavaScript */
function buildOgHtml({ title, description, image, path, type = 'article', notFound = false, corps = '', jsonLd = null }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const desc = description || DEFAULT_DESCRIPTION;
  const url = `${SITE_URL}${path}`;
  const img = socialImage(image);
  const e = escapeHtml;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${e(fullTitle)}</title>
<meta name="description" content="${e(desc)}">
${notFound ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${e(url)}">`}
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:type" content="${e(type)}">
<meta property="og:title" content="${e(fullTitle)}">
<meta property="og:description" content="${e(desc)}">
<meta property="og:url" content="${e(url)}">
<meta property="og:image" content="${e(img)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="fr_DZ">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${e(fullTitle)}">
<meta name="twitter:description" content="${e(desc)}">
<meta name="twitter:image" content="${e(img)}">
${jsonLd && !notFound ? `<script type="application/ld+json">${jsonLdTexte(jsonLd)}</script>` : ''}
</head>
<body>
<header><a href="${SITE_URL}/">${SITE_NAME}</a> — la plateforme de la culture algérienne</header>
<main>
<h1>${e(title || SITE_NAME)}</h1>
${corps || `<p>${e(desc)}</p>`}
<p><a href="${e(url)}">Voir sur ${SITE_NAME}</a></p>
</main>
</body>
</html>
`;
}

const firstImage = (medias = []) => (medias.find((m) => (m.type_media || m.type) === 'image' && m.url) || {}).url;
const dateFr = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const iso = (d) => (d ? new Date(d).toISOString() : undefined);
const nomComplet = (u) => [text(u?.prenom), text(u?.nom)].filter(Boolean).join(' ');
const cheminOeuvre = (o) => oeuvrePath(o.id_oeuvre, o.titre, o.id_type_oeuvre);
// Une liste annexe en échec (modèle absent, erreur) ne doit jamais faire tomber la page
const sansEchec = async (fn, defaut = []) => { try { return (await fn()) ?? defaut; } catch { return defaut; } };

const initOgRoutes = (models) => {
  const router = express.Router();
  const { Op } = require('sequelize');

  /** Auteur d'une œuvre, s'il a un portfolio public */
  const auteurPublic = async (idUser) => sansEchec(async () => {
    if (!idUser || !models.User?.findOne) return null;
    const u = await models.User.findOne({
      where: { id_user: idUser, statut: 'actif', id_type_user: PROFESSIONAL_TYPE_IDS },
      attributes: ['id_user', 'nom', 'prenom', 'profil_public'],
    });
    return u && u.profil_public !== false ? u : null;
  }, null);

  // Chargement de chaque type de contenu (uniquement s'il est public)
  const loaders = {
    async evenements(id) {
      const ev = await models.Evenement.findByPk(id, {
        include: [{ model: models.Media, as: 'Medias', attributes: ['url', 'type_media'], required: false }],
      });
      if (!ev || ['brouillon', 'en_attente'].includes(ev.statut)) return null;
      const date = dateFr(ev.date_debut);
      const desc = summary(ev.description);
      const path = evenementPath(id, ev.nom_evenement);
      const lieu = ev.id_lieu && models.Lieu?.findByPk
        ? await sansEchec(() => models.Lieu.findByPk(ev.id_lieu, { attributes: ['nom', 'adresse', 'latitude', 'longitude'] }), null) : null;
      const orga = await auteurPublic(ev.id_user);
      const image = ev.image_url || firstImage(ev.Medias);
      const corps = [
        sectionFaits([['Date', [date, ev.date_fin && dateFr(ev.date_fin) !== date ? `au ${dateFr(ev.date_fin)}` : ''].filter(Boolean).join(' ')], ['Lieu', [text(lieu?.nom), text(lieu?.adresse)].filter(Boolean).join(', ')]]),
        paragraphes(ev.description),
        orga ? sectionLiens('Organisateur', [{ url: `${SITE_URL}${professionnelPath(orga.id_user, orga.prenom, orga.nom)}`, texte: nomComplet(orga) }]) : '',
      ].join('\n');
      return {
        title: text(ev.nom_evenement),
        description: [date, desc].filter(Boolean).join(' — ') || undefined,
        image,
        type: 'article',
        // Adresse canonique avec le nom (1-salon-de-la-poterie…)
        path,
        corps,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: text(ev.nom_evenement),
          description: summary(ev.description, 500),
          startDate: iso(ev.date_debut),
          endDate: iso(ev.date_fin),
          eventStatus: ev.statut === 'annule' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          image: imageAbsolue(image),
          url: `${SITE_URL}${path}`,
          location: lieu ? {
            '@type': 'Place', name: text(lieu.nom),
            address: { '@type': 'PostalAddress', streetAddress: text(lieu.adresse), addressCountry: 'DZ' },
            geo: lieu.latitude && lieu.longitude ? { '@type': 'GeoCoordinates', latitude: Number(lieu.latitude), longitude: Number(lieu.longitude) } : undefined,
          } : undefined,
          organizer: orga ? { '@type': 'Person', name: nomComplet(orga), url: `${SITE_URL}${professionnelPath(orga.id_user, orga.prenom, orga.nom)}` } : undefined,
        },
      };
    },
    async oeuvres(id) {
      const o = await models.Oeuvre.findByPk(id, {
        include: [{ model: models.Media, attributes: ['url', 'type_media'], required: false }],
      });
      if (!o || o.statut !== 'publie') return null;
      const auteur = await auteurPublic(o.saisi_par);
      const livre = o.id_type_oeuvre === 1 && models.Livre?.findOne
        ? await sansEchec(() => models.Livre.findOne({ where: { id_oeuvre: o.id_oeuvre }, attributes: ['isbn', 'nb_pages', 'extrait'] }), null) : null;
      const image = firstImage(o.Media);
      const urlAuteur = auteur ? `${SITE_URL}${professionnelPath(auteur.id_user, auteur.prenom, auteur.nom)}` : undefined;
      const corps = [
        sectionFaits([['Année', o.annee_creation ? String(o.annee_creation) : ''], ['ISBN', livre?.isbn], ['Pages', livre?.nb_pages ? String(livre.nb_pages) : '']]),
        paragraphes(o.description),
        livre?.extrait ? `<section>\n<h2>Extrait</h2>\n${paragraphes(summary(livre.extrait, 1500))}\n</section>` : '',
        auteur ? sectionLiens('Auteur', [{ url: urlAuteur, texte: nomComplet(auteur) }]) : '',
      ].join('\n');
      const article = [4, 5].includes(o.id_type_oeuvre);
      return {
        title: text(o.titre),
        description: summary(o.description) || undefined,
        image,
        type: 'article',
        path: cheminOeuvre(o),
        corps,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': article ? 'Article' : o.id_type_oeuvre === 1 ? 'Book' : 'CreativeWork',
          [article ? 'headline' : 'name']: text(o.titre),
          description: summary(o.description, 500),
          image: imageAbsolue(image),
          url: `${SITE_URL}${cheminOeuvre(o)}`,
          dateCreated: o.annee_creation ? String(o.annee_creation) : undefined,
          isbn: livre?.isbn || undefined,
          numberOfPages: livre?.nb_pages || undefined,
          author: auteur ? { '@type': 'Person', name: nomComplet(auteur), url: urlAuteur } : undefined,
          inLanguage: 'fr',
        },
      };
    },
    async patrimoine(id) {
      const l = await models.Lieu.findByPk(id, {
        include: [
          { model: models.DetailLieu, attributes: ['description'], required: false },
          { model: models.LieuMedia, attributes: ['url', 'type'], required: false },
        ],
      });
      if (!l || l.statut !== 'publie') return null;
      const description = l.DetailLieu && l.DetailLieu.description;
      const image = firstImage(l.LieuMedia || l.LieuMedias);
      return {
        title: text(l.nom),
        description: summary(description) || undefined,
        image,
        type: 'place',
        corps: [sectionFaits([['Adresse', text(l.adresse)]]), paragraphes(description)].join('\n'),
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'TouristAttraction',
          name: text(l.nom),
          description: summary(description, 500),
          image: imageAbsolue(image),
          url: `${SITE_URL}/patrimoine/${id}`,
          address: l.adresse ? { '@type': 'PostalAddress', streetAddress: text(l.adresse), addressCountry: 'DZ' } : undefined,
          geo: l.latitude && l.longitude ? { '@type': 'GeoCoordinates', latitude: Number(l.latitude), longitude: Number(l.longitude) } : undefined,
        },
      };
    },
    async artisanat(id) {
      const a = await models.Artisanat.findByPk(id, {
        include: [{
          model: models.Oeuvre,
          include: [{ model: models.Media, attributes: ['url', 'type_media'], required: false }],
        }],
      });
      if (!a || !a.Oeuvre || a.Oeuvre.statut !== 'publie') return null;
      const artisan = await auteurPublic(a.Oeuvre.saisi_par);
      const image = firstImage(a.Oeuvre.Media);
      const urlArtisan = artisan ? `${SITE_URL}${professionnelPath(artisan.id_user, artisan.prenom, artisan.nom)}` : undefined;
      return {
        title: text(a.Oeuvre.titre),
        description: summary(a.Oeuvre.description) || undefined,
        image,
        type: 'product',
        path: artisanatPath(id, a.Oeuvre.titre),
        corps: [
          sectionFaits([['Prix', a.prix ? `${Number(a.prix)} DA` : ''], ['Dimensions', a.dimensions]]),
          paragraphes(a.Oeuvre.description),
          artisan ? sectionLiens('Artisan', [{ url: urlArtisan, texte: nomComplet(artisan) }]) : '',
        ].join('\n'),
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: text(a.Oeuvre.titre),
          description: summary(a.Oeuvre.description, 500),
          image: imageAbsolue(image),
          url: `${SITE_URL}${artisanatPath(id, a.Oeuvre.titre)}`,
          brand: artisan ? { '@type': 'Brand', name: nomComplet(artisan) } : undefined,
          offers: a.prix ? { '@type': 'Offer', price: Number(a.prix), priceCurrency: 'DZD', url: `${SITE_URL}${artisanatPath(id, a.Oeuvre.titre)}` } : undefined,
        },
      };
    },
    // Portfolio d'un professionnel validé (compte actif, profil public)
    async professionnels(id) {
      const u = await models.User.findOne({
        where: { id_user: id, statut: 'actif', id_type_user: PROFESSIONAL_TYPE_IDS },
        attributes: ['id_user', 'nom', 'prenom', 'biographie', 'photo_url', 'profil_public', 'id_type_user', 'wilaya_residence', 'specialites'],
      });
      // Profil rendu privé par la personne : rien pour les moteurs de recherche
      if (!u || u.profil_public === false) return null;
      const nom = nomComplet(u);
      const path = professionnelPath(u.id_user, u.prenom, u.nom);
      const metier = await sansEchec(async () => (models.TypeUser?.findByPk ? text((await models.TypeUser.findByPk(u.id_type_user, { attributes: ['nom_type'] }))?.nom_type) : ''), '');
      const wilaya = await sansEchec(async () => (u.wilaya_residence && models.Wilaya?.findByPk ? text((await models.Wilaya.findByPk(u.wilaya_residence, { attributes: ['nom'] }))?.nom) : ''), '');
      const oeuvres = await sansEchec(() => (models.Oeuvre?.findAll ? models.Oeuvre.findAll({
        where: { saisi_par: u.id_user, statut: 'publie' }, attributes: ['id_oeuvre', 'titre', 'id_type_oeuvre', 'annee_creation'],
        order: [['date_creation', 'DESC']], limit: MAX_LISTE,
      }) : []));
      const evenements = await sansEchec(() => (models.Evenement?.findAll ? models.Evenement.findAll({
        where: { id_user: u.id_user, statut: { [Op.notIn]: ['brouillon', 'en_attente'] } }, attributes: ['id_evenement', 'nom_evenement', 'date_debut'],
        order: [['date_debut', 'DESC']], limit: MAX_LISTE,
      }) : []));
      const liens = await sansEchec(() => (models.LienExterne?.findAll ? models.LienExterne.findAll({
        where: { id_user: u.id_user }, attributes: ['url', 'titre', 'source', 'type_lien'], limit: MAX_LISTE,
      }) : []));
      // Métiers saisis par la personne (« Artiste peintre », « Poétesse »…), sinon son type de compte
      const specialites = (() => { const s = typeof u.specialites === 'string' ? (() => { try { return JSON.parse(u.specialites); } catch { return []; } })() : u.specialites; return Array.isArray(s) ? s.filter((x) => typeof x === 'string' && x.trim()) : []; })();
      const metiers = specialites.length ? specialites.join(', ') : metier;
      const description = summary(u.biographie) || [nom, metiers, wilaya].filter(Boolean).join(', ');
      const corps = [
        sectionFaits([['Métier', metiers], ['Wilaya', wilaya]]),
        paragraphes(u.biographie),
        sectionLiens('Œuvres', oeuvres.map((o) => ({ url: `${SITE_URL}${cheminOeuvre(o)}`, texte: text(o.titre), detail: o.annee_creation ? String(o.annee_creation) : '' }))),
        sectionLiens('Événements', evenements.map((e) => ({ url: `${SITE_URL}${evenementPath(e.id_evenement, e.nom_evenement)}`, texte: text(e.nom_evenement), detail: dateFr(e.date_debut) }))),
        sectionLiens('Dans la presse et en ligne', liens.map((l) => ({ url: l.url, texte: text(l.titre) || l.url, detail: text(l.source) }))),
      ].join('\n');
      return {
        // « Radia Gouga — Artiste peintre, Poétesse » : le titre dit qui est la personne
        title: metiers ? `${nom} — ${metiers}` : nom,
        description: description || undefined,
        image: u.photo_url,
        type: 'profile',
        // Adresse canonique avec le nom (17-amina-benali)
        path,
        corps,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'ProfilePage',
          url: `${SITE_URL}${path}`,
          mainEntity: {
            '@type': 'Person',
            name: nom,
            description: summary(u.biographie, 500),
            image: imageAbsolue(u.photo_url),
            jobTitle: metiers || undefined,
            knowsAbout: specialites,
            homeLocation: wilaya ? { '@type': 'Place', name: `${wilaya}, Algérie` } : undefined,
            nationality: 'DZ',
            url: `${SITE_URL}${path}`,
            // Ses réseaux et sa presse : Google relie ainsi la fiche à la même personne ailleurs
            sameAs: liens.filter((l) => l.type_lien !== 'presse').map((l) => l.url),
            subjectOf: liens.filter((l) => l.type_lien === 'presse').map((l) => ({ '@type': 'CreativeWork', name: text(l.titre) || undefined, url: l.url })),
            workExample: oeuvres.slice(0, 20).map((o) => ({ '@type': [4, 5].includes(o.id_type_oeuvre) ? 'Article' : o.id_type_oeuvre === 1 ? 'Book' : 'CreativeWork', name: text(o.titre), url: `${SITE_URL}${cheminOeuvre(o)}` })),
          },
        },
      };
    },
    // Page d'une organisation publiée (maison d'édition, association…) : avant, aperçu générique
    async organisations(id) {
      const o = await models.Organisation.findByPk(id, { attributes: ['id_organisation', 'nom', 'description', 'logo_url', 'statut'] });
      if (!o || o.statut !== 'valide') return null;
      const path = organisationPath(o.id_organisation, o.nom);
      return {
        title: text(o.nom), description: summary(o.description) || undefined, image: o.logo_url, type: 'profile',
        path,
        corps: paragraphes(o.description),
        jsonLd: { '@context': 'https://schema.org', '@type': 'Organization', name: text(o.nom), description: summary(o.description, 500), logo: imageAbsolue(o.logo_url), url: `${SITE_URL}${path}` },
      };
    },
    // Service validé (ou ancien service sans professionnel), comme sur le site
    async services(id) {
      const s = await models.Service.findByPk(id, { attributes: ['id', 'nom', 'description', 'photo_url', 'statut', 'id_user'] });
      if (!s || (s.statut !== 'valide' && s.id_user !== null)) return null;
      return {
        title: text(s.nom), description: summary(s.description) || undefined, image: s.photo_url, type: 'place',
        corps: paragraphes(s.description),
        jsonLd: { '@context': 'https://schema.org', '@type': 'LocalBusiness', name: text(s.nom), description: summary(s.description, 500), image: imageAbsolue(s.photo_url), url: `${SITE_URL}/services/${id}` },
      };
    },
    // Personnalité (fiche active)
    async personnalites(id) {
      const p = await models.Intervenant.findByPk(id, { attributes: ['id_intervenant', 'nom', 'prenom', 'biographie', 'photo_url', 'actif'] });
      if (!p || p.actif === false) return null;
      const nom = nomComplet(p);
      return {
        title: nom, description: summary(p.biographie) || undefined, image: p.photo_url, type: 'profile',
        corps: paragraphes(p.biographie),
        jsonLd: { '@context': 'https://schema.org', '@type': 'Person', name: nom, description: summary(p.biographie, 500), image: imageAbsolue(p.photo_url), url: `${SITE_URL}/personnalites/${id}` },
      };
    },
  };
  loaders.articles = loaders.oeuvres;

  router.get('/:type/:id(\\d+)', async (req, res) => {
    const { type, id } = req.params;
    const path = `/${type}/${id}`;
    res.set('Content-Type', 'text/html; charset=utf-8');
    const load = loaders[type];
    if (!load) return res.status(404).send(buildOgHtml({ path: '/', notFound: true }));
    try {
      const data = await load(Number(id));
      if (!data) {
        return res.status(404).send(buildOgHtml({ title: 'Page introuvable', path, notFound: true }));
      }
      // Les aperçus sont mis en cache par les réseaux sociaux eux-mêmes ; 10 min ici
      res.set('Cache-Control', 'public, max-age=600');
      return res.send(buildOgHtml({ path, ...data }));
    } catch (err) {
      logger.warn(`Aperçu ${path} : ${err.message}`);
      // En cas d'erreur, aperçu générique plutôt qu'une page d'erreur
      return res.status(200).send(buildOgHtml({ path }));
    }
  });

  return router;
};

module.exports = initOgRoutes;
module.exports._internal = { buildOgHtml, socialImage, summary, text, jsonLdTexte };
