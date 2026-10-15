/**
 * Formulaire d'inscription par type d'événement : vérification des réponses
 */
const {
  verifierReponses,
  reponsesFormulaireBase,
  listerChamps,
  valeurExport
} = require('../../services/evenement/formulaireInscription');
const { FORMULAIRE_CHANTIER_ECOLE } = require('../../migrations/20261015-add-formulaire-inscription');

const reponsesCompletes = () => ({
  tel: '+213 555 12 34 56',
  age: '34',
  ville: 'Batna',
  profil: 'Étudiant',
  experience: 'Un peu',
  interets: ['Toiture', 'Pierre'],
  presence: 'Toute la durée',
  hebergement: 'Oui, à l’auberge',
  urgence: 'Amina 0555 00 00 00',
  competences: ['Photo et vidéo'],
  photos: true,
  frais: true,
  engagement: true
});

describe('verifierReponses — formulaire Chantier-école', () => {
  it('accepte un formulaire complet et normalise les valeurs', () => {
    const { reponses, erreurs } = verifierReponses(FORMULAIRE_CHANTIER_ECOLE, reponsesCompletes());
    expect(erreurs).toEqual([]);
    expect(reponses.age).toBe(34);
    // ordre de la configuration, pas celui de la saisie
    expect(reponses.interets).toEqual(['Pierre', 'Toiture']);
    expect(reponses.frais).toBe('Oui');
    expect(reponses.engagement).toBe('Oui');
    expect(reponses.photos).toBe('Oui');
  });

  it('signale les questions obligatoires manquantes', () => {
    const { erreurs } = verifierReponses(FORMULAIRE_CHANTIER_ECOLE, {});
    const cles = erreurs.map(e => e.cle);
    expect(cles).toEqual(expect.arrayContaining(['tel', 'ville', 'profil', 'presence', 'urgence', 'frais', 'engagement']));
    expect(cles).not.toContain('jours'); // conditionnelle : présence non partielle
    expect(erreurs.every(e => e.raison === 'requis')).toBe(true);
  });

  it('exige les accords cochés', () => {
    const { erreurs } = verifierReponses(FORMULAIRE_CHANTIER_ECOLE, { ...reponsesCompletes(), frais: false });
    expect(erreurs.map(e => e.cle)).toEqual(['frais']);
  });

  it('demande le nombre de jours seulement en présence partielle, entre 1 et 12', () => {
    const partielle = { ...reponsesCompletes(), presence: 'Partielle' };
    expect(verifierReponses(FORMULAIRE_CHANTIER_ECOLE, partielle).erreurs.map(e => e.cle)).toEqual(['jours']);
    expect(verifierReponses(FORMULAIRE_CHANTIER_ECOLE, { ...partielle, jours: 13 }).erreurs[0]).toMatchObject({ cle: 'jours', raison: 'invalide' });

    const ok = verifierReponses(FORMULAIRE_CHANTIER_ECOLE, { ...partielle, jours: '5', dates: 'du 24 au 28' });
    expect(ok.erreurs).toEqual([]);
    expect(ok.reponses).toMatchObject({ jours: 5, dates: 'du 24 au 28' });
  });

  it('n’enregistre pas les réponses aux questions masquées', () => {
    const { reponses } = verifierReponses(FORMULAIRE_CHANTIER_ECOLE, { ...reponsesCompletes(), jours: 4, dates: 'x' });
    expect(reponses).not.toHaveProperty('jours');
    expect(reponses).not.toHaveProperty('dates');
  });

  it('refuse un choix hors liste et ignore les clés inconnues', () => {
    const { reponses, erreurs } = verifierReponses(FORMULAIRE_CHANTIER_ECOLE, {
      ...reponsesCompletes(), profil: 'Pirate', interets: ['Pierre', 'Inconnu'], champ_pirate: 'x'
    });
    expect(erreurs.map(e => e.cle)).toEqual(['profil', 'interets']);
    expect(reponses).not.toHaveProperty('champ_pirate');
  });

  it('refuse un âge hors limites, un téléphone invalide et un texte trop long', () => {
    const { erreurs } = verifierReponses(FORMULAIRE_CHANTIER_ECOLE, {
      ...reponsesCompletes(), age: 150, tel: 'abc', sante: 'x'.repeat(501)
    });
    expect(erreurs.map(e => e.cle)).toEqual(['tel', 'age', 'sante']);
  });

  it('tolère des réponses absentes ou mal formées sans planter', () => {
    expect(verifierReponses(FORMULAIRE_CHANTIER_ECOLE, null).erreurs.length).toBeGreaterThan(0);
    expect(verifierReponses(FORMULAIRE_CHANTIER_ECOLE, ['x']).erreurs.length).toBeGreaterThan(0);
    expect(verifierReponses(null, { a: 1 })).toEqual({ reponses: {}, erreurs: [] });
  });

  it('chaque question a une clé unique, un libellé fr et ar, et des options valides', () => {
    const champs = listerChamps(FORMULAIRE_CHANTIER_ECOLE);
    const cles = champs.map(c => c.cle);
    expect(new Set(cles).size).toBe(cles.length);
    for (const champ of champs) {
      expect(champ.label.fr).toBeTruthy();
      expect(champ.label.ar).toBeTruthy();
      if (champ.condition) expect(cles.indexOf(champ.condition.cle)).toBeLessThan(cles.indexOf(champ.cle));
      if (champ.type === 'choix' || champ.type === 'choix_multiple') {
        expect(champ.options.length).toBeGreaterThan(1);
      }
    }
  });
});

describe('reponsesFormulaireBase', () => {
  it('garde le commentaire et le nombre de personnes', () => {
    expect(reponsesFormulaireBase({ nombre_personnes: '3', commentaire: '  Fauteuil roulant ' }))
      .toEqual({ nombre_personnes: 3, commentaire: 'Fauteuil roulant' });
  });

  it('ne stocke rien pour une inscription simple', () => {
    expect(reponsesFormulaireBase({ nombre_personnes: 1, commentaire: '' })).toBeNull();
    expect(reponsesFormulaireBase()).toBeNull();
  });

  it('borne le nombre de personnes', () => {
    expect(reponsesFormulaireBase({ nombre_personnes: 9999 }).nombre_personnes).toBe(50);
  });
});

describe('valeurExport', () => {
  it('formate les listes et les valeurs vides', () => {
    expect(valeurExport(['Pierre', 'Toiture'])).toBe('Pierre, Toiture');
    expect(valeurExport(undefined)).toBe('');
    expect(valeurExport(5)).toBe('5');
  });
});
