import { describe, it, expect } from 'vitest';
import {
  configInscriptionValide,
  estVisible,
  reponsesAEnvoyer,
  verifierReponses,
  type ConfigInscription
} from '../formulaireInscription';

const config: ConfigInscription = {
  remplace_formulaire_base: true,
  sections: [{
    titre: 'Séjour',
    champs: [
      { cle: 'tel', type: 'tel', requis: true, label: 'Téléphone' },
      {
        cle: 'presence', type: 'choix', requis: true, label: 'Présence',
        options: [{ valeur: 'Toute la durée', label: 'Toute la durée' }, { valeur: 'Partielle', label: 'Partielle' }]
      },
      { cle: 'jours', type: 'nombre', requis: true, min: 1, max: 12, label: 'Jours', condition: { cle: 'presence', valeur: 'Partielle' } },
      {
        cle: 'interets', type: 'choix_multiple', label: 'Intérêts',
        options: [{ valeur: 'Pierre', label: 'Pierre' }, { valeur: 'Toiture', label: 'Toiture' }]
      },
      { cle: 'frais', type: 'accord', requis: true, label: 'Payant' }
    ]
  }]
};

describe('configInscriptionValide', () => {
  it('reconnaît une configuration avec des sections', () => {
    expect(configInscriptionValide(config)).toBe(true);
    expect(configInscriptionValide(null)).toBe(false);
    expect(configInscriptionValide({ sections: [] })).toBe(false);
    expect(configInscriptionValide('x')).toBe(false);
  });
});

describe('verifierReponses', () => {
  it('signale les questions obligatoires et les accords non cochés', () => {
    expect(verifierReponses(config, {})).toEqual({ tel: 'requis', presence: 'requis', frais: 'requis' });
    expect(verifierReponses(config, { tel: '0555 12 34 56', presence: 'Toute la durée', frais: false }))
      .toEqual({ frais: 'requis' });
  });

  it('vérifie la question conditionnelle seulement quand elle est affichée', () => {
    const base = { tel: '0555123456', frais: true };
    expect(verifierReponses(config, { ...base, presence: 'Toute la durée' })).toEqual({});
    expect(verifierReponses(config, { ...base, presence: 'Partielle' })).toEqual({ jours: 'requis' });
    expect(verifierReponses(config, { ...base, presence: 'Partielle', jours: '13' })).toEqual({ jours: 'invalide' });
    expect(verifierReponses(config, { ...base, presence: 'Partielle', jours: '4' })).toEqual({});
  });

  it('refuse un téléphone invalide', () => {
    expect(verifierReponses(config, { tel: 'abc', presence: 'Toute la durée', frais: true })).toEqual({ tel: 'invalide' });
  });
});

describe('estVisible / reponsesAEnvoyer', () => {
  it('masque la question conditionnelle et retire sa réponse', () => {
    const jours = config.sections[0].champs[2];
    expect(estVisible(jours, { presence: 'Partielle' })).toBe(true);
    expect(estVisible(jours, { presence: 'Toute la durée' })).toBe(false);

    const envoi = reponsesAEnvoyer(config, {
      tel: ' 0555123456 ', presence: 'Toute la durée', jours: '5', interets: [], frais: true
    });
    expect(envoi).toEqual({ tel: '0555123456', presence: 'Toute la durée', frais: true });
  });
});
