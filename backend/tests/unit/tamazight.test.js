/**
 * Anti-retour (2026-11-20) : section Tamazight et données ouvertes.
 * - le partage ouvert exige un texte écrit par une personne ; l'accord est daté, la licence fixée ;
 * - un accord retiré sort aussitôt le texte des données ouvertes ;
 * - la modération ne fait entrer qu'un texte publié, en tamazight, partagé par son auteur ;
 * - le texte d'un article et ses traductions sont extraits des blocs, dans l'ordre.
 */
const { champsTamazight, valeursTamazight, LICENCE_OUVERTE } = require('../../constants/tamazight');
const t = require('../../services/tamazight');

describe('Tamazight : règles des champs', () => {
  test('variante inconnue ignorée ; cases lues en booléen', () => {
    expect(champsTamazight({ variante_amazighe: 'kabyle', ecrit_par_humain: 'true', partage_ouvert: '1' }))
      .toEqual({ variante_amazighe: 'kabyle', ecrit_par_humain: true, partage_ouvert: true });
    expect(champsTamazight({ variante_amazighe: 'klingon' })).toEqual({ variante_amazighe: null });
    expect(champsTamazight({})).toEqual({});
  });

  test('partage ouvert : seulement pour un texte écrit par une personne, licence CC BY-SA, accord daté', () => {
    const ok = valeursTamazight({ ecrit_par_humain: true, partage_ouvert: true });
    expect(ok).toMatchObject({ partage_ouvert: true, licence: LICENCE_OUVERTE });
    expect(ok.partage_ouvert_le).toBeInstanceOf(Date);
    // Traduction automatique : jamais partagée
    expect(valeursTamazight({ ecrit_par_humain: false, partage_ouvert: true })).toMatchObject({ partage_ouvert: false, licence: null });
  });

  test('accord retiré : le texte sort aussitôt des données ouvertes', () => {
    const v = valeursTamazight({ partage_ouvert: false }, { ecrit_par_humain: true, partage_ouvert: true, donnees_ouvertes_valide: true });
    expect(v).toMatchObject({ partage_ouvert: false, licence: null, donnees_ouvertes_valide: false, donnees_ouvertes_par: null });
  });

  test('accord déjà donné : sa date n’est pas réécrite', () => {
    const v = valeursTamazight({ partage_ouvert: true }, { ecrit_par_humain: true, partage_ouvert: true });
    expect(v.partage_ouvert_le).toBeUndefined();
  });
});

describe('Tamazight : relecture par la modération', () => {
  const oeuvre = (o) => ({ id_oeuvre: 5, statut: 'publie', id_langue: 1, partage_ouvert: true, ecrit_par_humain: true, saisi_par: 37, update: jest.fn(), ...o });
  const models = (o) => ({ Oeuvre: { findByPk: jest.fn().mockResolvedValue(o) }, User: { findOne: jest.fn().mockResolvedValue(null) }, Role: {} });

  test('texte publié, en tamazight, partagé par une personne : il entre ; sinon refus', async () => {
    const o = oeuvre();
    await t.decider(models(o), 5, true, 75);
    expect(o.update).toHaveBeenCalledWith(expect.objectContaining({ donnees_ouvertes_valide: true, donnees_ouvertes_par: 75 }));
    await expect(t.decider(models(oeuvre({ id_langue: 5 })), 5, true, 75)).rejects.toMatchObject({ statusCode: 400 });
    await expect(t.decider(models(oeuvre({ statut: 'en_attente' })), 5, true, 75)).rejects.toMatchObject({ statusCode: 400 });
    await expect(t.decider(models(oeuvre({ partage_ouvert: false })), 5, true, 75)).rejects.toMatchObject({ statusCode: 400 });
    await expect(t.decider(models(oeuvre({ ecrit_par_humain: false })), 5, true, 75)).rejects.toMatchObject({ statusCode: 400 });
  });

  test('retrait : toujours possible', async () => {
    const o = oeuvre({ partage_ouvert: false });
    await t.decider(models(o), 5, false, 75);
    expect(o.update).toHaveBeenCalledWith({ donnees_ouvertes_valide: false, donnees_ouvertes_par: null, donnees_ouvertes_le: null });
  });
});

describe('Tamazight : texte d’un article pour les données ouvertes', () => {
  test('blocs dans l’ordre, balises retirées, listes en lignes, traductions par langue', async () => {
    const models = {
      Article: { findOne: jest.fn().mockResolvedValue({ id_article: 9 }) },
      ArticleBlock: {
        findAll: jest.fn().mockResolvedValue([
          { type_block: 'heading', contenu: 'Tamacahut', metadata: { traductions: { fr: { contenu: 'Le conte' } } } },
          { type_block: 'text', contenu: '<p>Yiwen wass…</p>', metadata: JSON.stringify({ traductions: { fr: { contenu: 'Un jour…' } } }) },
          { type_block: 'list', contenu_json: ['aman', 'tafat'], metadata: {} },
        ]),
      },
    };
    const r = await t.texteArticle(models, 3);
    expect(r.texte).toBe('Tamacahut\n\nYiwen wass…\n\n- aman\n- tafat');
    expect(r.traductions).toEqual({ fr: 'Le conte\n\nUn jour…' });
  });
});

describe('Tamazight : CSV des données ouvertes', () => {
  test('titre : la première langue remplie, même si une langue vide vient en premier', () => {
    const csv = t.enCsv({ textes: [{ id: 'oeuvre-1', titre: { ar: '', fr: 'Le conte' }, texte: 'Yiwen wass', ecriture: 'latin', variante: 'kabyle',
      auteur: 'Sara', traductions: { fr: 'Un jour' }, audios: [{ url: 'https://x/a.mp3' }], licence: 'CC BY-SA 4.0', source: 'https://taladz.com/articles/1' }], voix: [] });
    expect(csv.split('\n')[1]).toBe('"oeuvre-1","Le conte","Yiwen wass","latin","kabyle","Sara","","Un jour","https://x/a.mp3","CC BY-SA 4.0","https://taladz.com/articles/1"');
  });
});
