import { describe, it, expect } from 'vitest';
import { intervenantsPourFormulaire, intervenantValide, texteLangue } from '../programmeIntervenants';

describe('programmeIntervenants', () => {
  it('relit les intervenants d’une activité, avec ou sans compte', () => {
    const lignes = intervenantsPourFormulaire([
      { id_intervenant: 11, id_user: null, prenom: { fr: 'Yamina' }, nom: { fr: 'Khaled' },
        ProgrammeIntervenant: { role_intervenant: 'animateur', sujet_intervention: null, biographie_courte: 'Potière' } },
      { id_intervenant: 17, prenom: '', nom: 'CRLCA de Béjaïa', ProgrammeIntervenant: { role_intervenant: 'principal', sujet_intervention: 'La poterie algérienne' } }
    ]);
    expect(lignes[0]).toMatchObject({ id_intervenant: 11, id_user: undefined, prenom: 'Yamina', nom: 'Khaled', role_intervenant: 'animateur', biographie_courte: 'Potière', ordre_intervention: 1 });
    expect(lignes[1]).toMatchObject({ id_intervenant: 17, nom: 'CRLCA de Béjaïa', sujet_intervention: 'La poterie algérienne', ordre_intervention: 2 });
  });

  it('valide : fiche choisie ou nom saisi', () => {
    expect(intervenantValide({ id_intervenant: 3 })).toBe(true);
    expect(intervenantValide({ nom: 'Hammouche' })).toBe(true);
    expect(intervenantValide({ prenom: ' ', nom: '' })).toBe(false);
  });

  it('texte dans la langue demandée, sinon français', () => {
    expect(texteLangue({ fr: 'Poterie', ar: 'فخار' }, 'ar')).toBe('فخار');
    expect(texteLangue({ fr: 'Poterie' }, 'en')).toBe('Poterie');
    expect(texteLangue(null)).toBe('');
  });
});
