/**
 * CreateUserDTO — garde-fou sur id_type_user a l'inscription
 * (un visiteur ne doit jamais pouvoir s'inscrire en administrateur)
 */
const CreateUserDTO = require('../../dto/user/createUserDTO');

const base = {
  email: 'test@example.com',
  password: 'Azerty123456!',
  password_confirmation: 'Azerty123456!',
  nom: 'Nom',
  prenom: 'Prenom',
  accepte_conditions: 'true'
};

const typeErrors = (dto) => dto.validate().errors.filter(e => e.field === 'id_type_user');

describe('CreateUserDTO - id_type_user', () => {
  it('absent => visiteur (1) et valide', () => {
    const dto = new CreateUserDTO(base);
    expect(dto.idTypeUser).toBe(1);
    expect(dto.validate().valid).toBe(true);
  });

  it('non numerique => visiteur (1)', () => {
    const dto = new CreateUserDTO({ ...base, id_type_user: 'abc' });
    expect(dto.idTypeUser).toBe(1);
    expect(typeErrors(dto)).toHaveLength(0);
  });

  it.each([2, 7, 13, 14, 15, '9'])('type professionnel %p accepte', (type) => {
    const dto = new CreateUserDTO({ ...base, id_type_user: type });
    expect(typeErrors(dto)).toHaveLength(0);
    expect(dto.toEntity().id_type_user).toBe(Number(type));
  });

  it('administrateur (29) refuse en snake_case', () => {
    const dto = new CreateUserDTO({ ...base, id_type_user: 29 });
    expect(dto.validate().valid).toBe(false);
    expect(typeErrors(dto)).toHaveLength(1);
  });

  it('administrateur (29) refuse en camelCase', () => {
    const dto = new CreateUserDTO({ ...base, idTypeUser: '29' });
    expect(typeErrors(dto)).toHaveLength(1);
  });

  it.each([0, -1, 16, 28, 999])('valeur hors liste %p refusee', (type) => {
    const dto = new CreateUserDTO({ ...base, id_type_user: type });
    expect(typeErrors(dto)).toHaveLength(1);
  });
});
