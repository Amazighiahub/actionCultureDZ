/**
 * Référencement : pages lisibles par les robots (Bing, ChatGPT…), données structurées, IndexNow,
 * et visibilité de la fiche d'un professionnel.
 */
const express = require('express');
const request = require('supertest');
const initOgRoutes = require('../../routes/ogRoutes');
const { jsonLdTexte } = require('../../routes/ogRoutes')._internal;

const app = (models) => express().use('/api/og', initOgRoutes(models));
const jsonLd = (html) => JSON.parse(/application\/ld\+json">(.*?)<\/script>/s.exec(html)[1]);

describe('fiche d’un professionnel pour les robots', () => {
  const models = (utilisateur) => ({
    User: { findOne: jest.fn(async () => utilisateur) },
    TypeUser: { findByPk: jest.fn(async () => ({ nom_type: { fr: 'Artiste' } })) },
    Wilaya: { findByPk: jest.fn(async () => ({ nom: 'Constantine' })) },
    Oeuvre: { findAll: jest.fn(async () => [{ id_oeuvre: 8, titre: { fr: 'Un recueil' }, id_type_oeuvre: 1, annee_creation: 2024 }, { id_oeuvre: 9, titre: 'Un article', id_type_oeuvre: 4 }]) },
    Evenement: { findAll: jest.fn(async () => [{ id_evenement: 3, nom_evenement: { fr: 'Exposition' }, date_debut: '2026-03-01' }]) },
    LienExterne: { findAll: jest.fn(async () => [
      { url: 'https://www.instagram.com/exemple', type_lien: 'instagram' },
      { url: 'https://journal.example.com/article', type_lien: 'presse', titre: 'Portrait', source: 'Journal' },
    ]) },
  });
  const personne = { id_user: 20, prenom: 'Lina', nom: 'Exemple', biographie: { fr: 'Peintre et poétesse.\n\nElle expose à Constantine.' }, photo_url: 'https://res.cloudinary.com/demo/image/upload/v1/p.jpg', profil_public: true, id_type_user: 6, wilaya_residence: 25 };

  it('nom, biographie complète, œuvres, événements et presse dans le HTML', async () => {
    const res = await request(app(models(personne))).get('/api/og/professionnels/20');
    expect(res.status).toBe(200);
    // Sans métier saisi : le type de compte complète le titre
    expect(res.text).toContain('<h1>Lina Exemple — Artiste</h1>');
    expect(res.text).toContain('<p>Elle expose à Constantine.</p>');
    expect(res.text).toContain('href="https://taladz.com/oeuvres/8-un-recueil"');
    expect(res.text).toContain('href="https://taladz.com/articles/9-un-article"');
    expect(res.text).toContain('Exposition');
    expect(res.text).toContain('Métier : Artiste');
    expect(res.text).toContain('Wilaya : Constantine');
  });

  it('données structurées ProfilePage / Person, avec réseaux et presse séparés', async () => {
    const res = await request(app(models(personne))).get('/api/og/professionnels/20');
    const d = jsonLd(res.text);
    expect(d['@type']).toBe('ProfilePage');
    expect(d.mainEntity).toMatchObject({ '@type': 'Person', name: 'Lina Exemple', jobTitle: 'Artiste', sameAs: ['https://www.instagram.com/exemple'] });
    expect(d.mainEntity.subjectOf[0].url).toBe('https://journal.example.com/article');
    expect(d.mainEntity.workExample.map((w) => w['@type'])).toEqual(['Book', 'Article']);
  });

  it('profil rendu privé : rien pour les robots (404, noindex)', async () => {
    const res = await request(app(models({ ...personne, profil_public: false }))).get('/api/og/professionnels/20');
    expect(res.status).toBe(404);
    expect(res.text).toContain('noindex');
    expect(res.text).not.toContain('Lina');
  });

  it('une liste annexe en échec ne fait pas tomber la page', async () => {
    const m = models(personne);
    m.Oeuvre.findAll.mockRejectedValue(new Error('base indisponible'));
    const res = await request(app(m)).get('/api/og/professionnels/20');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<h1>Lina Exemple — Artiste</h1>');
  });

  it('plusieurs métiers saisis : dans le titre et les données structurées', async () => {
    const res = await request(app(models({ ...personne, specialites: ['Artiste peintre', 'Poétesse'] }))).get('/api/og/professionnels/20');
    expect(res.text).toContain('<title>Lina Exemple — Artiste peintre, Poétesse | Tala DZ</title>');
    expect(jsonLd(res.text).mainEntity).toMatchObject({ jobTitle: 'Artiste peintre, Poétesse', knowsAbout: ['Artiste peintre', 'Poétesse'] });
  });
});

describe('données structurées', () => {
  it('un texte ne peut pas fermer la balise script', () => {
    const t = jsonLdTexte({ name: '</script><script>alert(1)</script>' });
    expect(t).not.toContain('</script>');
    expect(JSON.parse(t).name).toBe('</script><script>alert(1)</script>');
  });

  it('les valeurs vides sont retirées', () => {
    expect(JSON.parse(jsonLdTexte({ a: '', b: null, c: [], d: 'x' }))).toEqual({ d: 'x' });
  });
});

describe('IndexNow', () => {
  const { signaler, CLE } = require('../../services/indexNow');

  it('envoie les adresses complètes avec la clé et son emplacement', async () => {
    const envoyer = jest.fn(async () => ({ ok: true, status: 200 }));
    expect(await signaler(['/oeuvres/101', '/professionnels/20-lina-exemple'], { envoyer, actif: true })).toBe(true);
    const corps = JSON.parse(envoyer.mock.calls[0][1].body);
    expect(corps).toMatchObject({ host: 'taladz.com', key: CLE, keyLocation: `https://taladz.com/api/indexnow/${CLE}.txt` });
    expect(corps.urlList).toEqual(['https://taladz.com/oeuvres/101', 'https://taladz.com/professionnels/20-lina-exemple']);
  });

  it('la même page signalée deux fois de suite : un seul envoi', async () => {
    const envoyer = jest.fn(async () => ({ ok: true, status: 200 }));
    await signaler('/oeuvres/202', { envoyer, actif: true });
    expect(await signaler('/oeuvres/202', { envoyer, actif: true })).toBe(false);
    expect(envoyer).toHaveBeenCalledTimes(1);
  });

  it('hors production : rien n’est envoyé', async () => {
    const envoyer = jest.fn();
    expect(await signaler('/oeuvres/303', { envoyer, actif: false })).toBe(false);
    expect(envoyer).not.toHaveBeenCalled();
  });

  it('une panne du service ne lève pas d’erreur', async () => {
    const envoyer = jest.fn(async () => { throw new Error('réseau'); });
    await expect(signaler('/oeuvres/404', { envoyer, actif: true })).resolves.toBe(false);
  });
});

describe('métiers et compétences', () => {
  const UpdateUserDTO = require('../../dto/user/updateUserDTO');
  it('nettoyés, sans doublon, 8 au plus', () => {
    const l = UpdateUserDTO.normalizeSpecialites(['  Peintre ', 'peintre', 'Poétesse', 42, '', ...Array.from({ length: 10 }, (_, i) => `M${i}`)]);
    expect(l.slice(0, 2)).toEqual(['Peintre', 'Poétesse']);
    expect(l).toHaveLength(8);
  });
  it('autre chose qu’une liste : liste vide', () => {
    expect(UpdateUserDTO.normalizeSpecialites('Peintre')).toEqual([]);
  });
});

describe('visibilité de la fiche', () => {
  const { visibiliteFiche } = require('../../services/visibiliteFiche');
  const modeles = (u, oeuvres = [], nbEv = 0, nbLiens = 0) => ({
    User: { findByPk: jest.fn(async () => u) },
    Oeuvre: { findAll: jest.fn(async () => oeuvres) },
    Media: {},
    Evenement: { count: jest.fn(async () => nbEv) },
    LienExterne: { count: jest.fn(async () => nbLiens) },
  });

  it('fiche complète : 100 %', async () => {
    const r = await visibiliteFiche(modeles(
      { photo_url: 'p.jpg', biographie: 'x'.repeat(300), wilaya_residence: 16, profil_public: true, specialites: ['Peintre'] },
      [{ id_oeuvre: 1, titre: 'A', description: 'y'.repeat(150), id_type_oeuvre: 1, Media: [{ type_media: 'image' }] }], 0, 1
    ), 5);
    expect(r.score).toBe(100);
  });

  it('fiche vide : ce qui manque, avec les œuvres à corriger', async () => {
    const r = await visibiliteFiche(modeles(
      { photo_url: null, biographie: 'Court', wilaya_residence: null, profil_public: true },
      [{ id_oeuvre: 7, titre: { fr: 'Sans photo' }, description: 'Court', id_type_oeuvre: 1, Media: [] }]
    ), 5);
    expect(r.score).toBeLessThan(50);
    const p = Object.fromEntries(r.points.map((x) => [x.cle, x]));
    expect(p.biographie).toMatchObject({ ok: false, valeur: 5, minimum: 300 });
    expect(p.photos.oeuvres).toEqual([{ id: 7, titre: 'Sans photo', type: 1 }]);
    expect(p.descriptions.nombre).toBe(1);
  });

  it('un article sans photo n’est pas compté comme un manque', async () => {
    const r = await visibiliteFiche(modeles(
      { photo_url: 'p.jpg', biographie: 'x'.repeat(300), wilaya_residence: 16 },
      [{ id_oeuvre: 2, titre: 'Article', description: 'y'.repeat(200), id_type_oeuvre: 4, Media: [] }]
    ), 5);
    expect(r.points.find((x) => x.cle === 'photos').ok).toBe(true);
  });
});
