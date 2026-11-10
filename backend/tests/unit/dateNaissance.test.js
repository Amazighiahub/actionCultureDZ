/**
 * Inscription rapide (sans date de naissance) et profil complété ensuite :
 * même règle d'âge minimum aux deux endroits.
 */
const CreateUserDTO = require('../../dto/user/createUserDTO');
const UpdateUserDTO = require('../../dto/user/updateUserDTO');
const { erreurDateNaissance } = require('../../dto/user/dateNaissance');

const rapide = {
  email: 'visiteur@example.com',
  password: 'Azerty123456!',
  password_confirmation: 'Azerty123456!',
  nom: 'Exemple',
  prenom: 'Lina',
  accepte_conditions: 'true'
};
const champs = (dto) => dto.validate().errors.map(e => e.field);

describe('règle de date de naissance', () => {
  const ref = new Date('2026-11-10T12:00:00Z');
  it('vide : acceptée ; future, invalide ou moins de 13 ans : refusée', () => {
    expect(erreurDateNaissance(null, ref)).toBeNull();
    expect(erreurDateNaissance('1990-05-01', ref)).toBeNull();
    expect(erreurDateNaissance('2013-11-10', ref)).toBeNull();
    expect(erreurDateNaissance('2013-11-11', ref)).toMatch(/13 ans/);
    expect(erreurDateNaissance('2030-01-01', ref)).toMatch(/futur/);
    expect(erreurDateNaissance('pas une date', ref)).toMatch(/invalide/);
  });
});

describe('inscription rapide', () => {
  it('sans date ni attestation : refusée sur atteste_age_minimum', () => {
    expect(champs(new CreateUserDTO(rapide))).toEqual(['atteste_age_minimum']);
  });
  it('sans date, avec attestation : acceptée, genre et date restent vides', () => {
    const dto = new CreateUserDTO({ ...rapide, atteste_age_minimum: true });
    expect(dto.validate().valid).toBe(true);
    expect(dto.toEntity()).toMatchObject({ sexe: null, date_naissance: null, wilaya_residence: null });
  });
  it('avec une date de moins de 13 ans : refusée même avec attestation', () => {
    const recent = `${new Date().getFullYear() - 5}-01-01`;
    expect(champs(new CreateUserDTO({ ...rapide, date_naissance: recent, atteste_age_minimum: true }))).toEqual(['date_naissance']);
  });
});

describe('profil complété ensuite', () => {
  it('genre et date enregistrés', () => {
    const dto = new UpdateUserDTO({ sexe: 'F', date_naissance: '1995-03-21' });
    expect(dto.validate().valid).toBe(true);
    expect(dto.toEntity()).toMatchObject({ sexe: 'F', date_naissance: '1995-03-21' });
  });
  it('vides : effacés', () => {
    expect(new UpdateUserDTO({ sexe: '', date_naissance: '' }).toEntity()).toMatchObject({ sexe: null, date_naissance: null });
  });
  it('non envoyés : pas touchés', () => {
    const e = new UpdateUserDTO({ prenom: 'Lina' }).toEntity();
    expect(e).not.toHaveProperty('sexe');
    expect(e).not.toHaveProperty('date_naissance');
  });
  it('genre inconnu ou moins de 13 ans : refusés', () => {
    const recent = `${new Date().getFullYear() - 5}-01-01`;
    expect(champs(new UpdateUserDTO({ sexe: 'X', date_naissance: recent }))).toEqual(['sexe', 'date_naissance']);
  });
});
