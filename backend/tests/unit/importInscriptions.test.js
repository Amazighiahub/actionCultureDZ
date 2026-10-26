/**
 * Import d'une liste d'inscriptions (Excel d'un formulaire en ligne) dans un chantier-école :
 * colonnes reconnues par leur titre, profil retiré → « Autre », email corrigé, doublons,
 * comptes créés « en attente » avec invitation, personnes déjà inscrites laissées telles quelles.
 * Personnes fictives.
 */
const ExcelJS = require('exceljs');
const { ImportInscriptions, lireEmail, lireDate } = require('../../services/evenement/importInscriptions');

const L = (fr) => ({ fr });
const opts = (...v) => v.map(x => ({ valeur: x, label: L(x) }));
const CONFIG = {
  remplace_formulaire_base: true,
  sections: [{ champs: [
    { cle: 'tel', type: 'tel', requis: true, label: L('Téléphone / WhatsApp') },
    { cle: 'age', type: 'nombre', min: 10, max: 99, label: L('Âge') },
    { cle: 'ville', type: 'texte', requis: true, label: L('Ville ou wilaya') },
    { cle: 'profil', type: 'choix', requis: true, label: L('Vous êtes'), options: opts('Artisan ou professionnel', 'Étudiant', 'Retraité', 'Autre') },
    { cle: 'profil_autre', type: 'texte', requis: true, condition: { cle: 'profil', valeur: 'Autre' }, label: L('Précisez votre catégorie') },
    { cle: 'interets', type: 'choix_multiple', label: L('Ce qui vous intéresse'), options: opts('Pierre', 'Mortier et enduit', 'Toiture') },
    { cle: 'presence', type: 'choix', requis: true, label: L('Présence'), options: opts('Toute la durée', 'Partielle') },
    { cle: 'jours', type: 'nombre', requis: true, min: 1, max: 12, condition: { cle: 'presence', valeur: 'Partielle' }, label: L('Combien de jours ?') },
    { cle: 'competences', type: 'choix_multiple', label: L('Compétences'), options: opts('Plans et dessin', 'Préparation des repas (bénévole)') },
    { cle: 'frais', type: 'accord', requis: true, label: L('Frais') }
  ] }]
};

async function classeur(lignes) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Inscriptions');
  ws.addRow(['Date d’inscription', 'Nom et prénom', 'Âge', 'Téléphone / WhatsApp', 'E-mail', 'Ville ou wilaya', 'Profil',
    'Centres d’intérêt', 'Présence', 'Nombre de jours', 'Compétences', 'Frais acceptés']);
  for (const l of lignes) ws.addRow(l);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const LIGNES = [
  ['16/10/2026 18:01:25', 'Amrani Lydia', '25', '0550 00 00 01', 'lydia.amrani@exemple.dz', 'Alger', 'Étudiant', 'Pierre, Mortier et enduit, Toiture', 'Toute la durée', '12', 'Plans et dessin, Préparation des repas (bénévole)', 'Oui'],
  ['17/10/2026 01:28:55', 'Bensaid', '31', '0550 00 00 02', 'Karim.Bensaid@Exemple.dz', 'Blida', 'Amateur du patrimoine', 'Pierre', 'Toute la durée', '12', '', 'Oui'],
  ['20/10/2026 11:47:38', 'Yanis Ait Ali', '', '0550 00 00 03', 'yanis.aitali@gmail.coml.com', 'Batna', 'Amateur du patrimoine', '', 'Toute la durée', '12', '', 'Oui'],
  ['21/10/2026 00:20:38', 'Nadia Ferhat', '60', '0550 00 00 04', 'nadia.ferhat@exemple.dz', 'Batna', 'Retraité', '', 'Partielle', '2', '', 'Oui'],
  ['21/10/2026 01:00:00', 'Doublon', '30', '0550 00 00 05', 'lydia.amrani@exemple.dz', 'Alger', 'Étudiant', '', 'Toute la durée', '12', '', 'Oui'],
  ['22/10/2026 10:00:00', 'Sans email', '30', '0550 00 00 06', 'pas-un-email', 'Alger', 'Étudiant', '', 'Toute la durée', '12', '', 'Oui']
];

const modeles = ({ existants = [], dejaInscrits = [] } = {}) => {
  const crees = [];
  const inscriptions = [];
  return {
    crees, inscriptions,
    Evenement: { findByPk: jest.fn().mockResolvedValue({
      id_evenement: 2, id_user: 37, nom_evenement: { fr: 'Chantier-école' }, tarif: 2000,
      tarification: { mode: 'profil', profils: [{ valeur: 'Étudiant', prix: 2000 }, { valeur: 'Retraité', prix: 3000 }, { valeur: 'Autre', prix: null }], partiel_pourcent: 70 },
      TypeEvenement: { config_inscription: CONFIG }
    }) },
    TypeEvenement: {},
    User: {
      findAll: jest.fn().mockResolvedValue(existants),
      findOne: jest.fn(async ({ where }) => existants.find(u => u.email === where.email) || null),
      create: jest.fn(async (data, options) => { crees.push({ data, options }); return { id_user: 100 + crees.length, ...data }; })
    },
    EvenementUser: {
      findAll: jest.fn().mockResolvedValue(dejaInscrits.map(id_user => ({ id_user }))),
      findOrCreate: jest.fn(async ({ where, defaults }) => { inscriptions.push({ ...where, ...defaults }); return [{}, true]; })
    },
    EmailVerification: { createVerificationToken: jest.fn().mockResolvedValue({ token: 'jeton' }) }
  };
};
const ORGANISATEUR = { id_user: 37, isAdmin: false };

describe('Lecture des cellules', () => {
  it('email : minuscules, faute « gmail.coml.com » corrigée, email faux repéré', () => {
    expect(lireEmail(' Karim.Bensaid@Exemple.dz ')).toMatchObject({ email: 'karim.bensaid@exemple.dz', valide: true, corrige: null });
    expect(lireEmail('yanis.aitali@gmail.coml.com')).toMatchObject({ email: 'yanis.aitali@gmail.com', valide: true });
    expect(lireEmail('pas-un-email').valide).toBe(false);
  });
  it('date du formulaire, à l’heure d’Algérie', () => {
    expect(lireDate('16/10/2026 18:01:25').toISOString()).toBe('2026-10-16T17:01:25.000Z');
  });
});

describe('Aperçu', () => {
  it('réponses reprises, « Amateur du patrimoine » → Autre précisé, doublon et email faux signalés', async () => {
    const svc = new ImportInscriptions(modeles());
    const { lignes } = await svc.apercu(await classeur(LIGNES), 2, ORGANISATEUR);
    const [lydia, karim, yanis, nadia, doublon, faux] = lignes;
    expect(lydia).toMatchObject({ action: 'creer', nom: 'Amrani Lydia', montant: 2000,
      reponses: { tel: '0550 00 00 01', age: 25, ville: 'Alger', profil: 'Étudiant', interets: ['Pierre', 'Mortier et enduit', 'Toiture'],
        presence: 'Toute la durée', competences: ['Plans et dessin', 'Préparation des repas (bénévole)'], frais: 'Oui' } });
    expect(karim.reponses).toMatchObject({ profil: 'Autre', profil_autre: 'Amateur du patrimoine' });
    expect(karim.montant).toBeNull();
    expect(yanis).toMatchObject({ action: 'creer', email: 'yanis.aitali@gmail.com' });
    expect(yanis.remarques[0]).toMatch(/Email corrigé/);
    expect(nadia).toMatchObject({ reponses: { presence: 'Partielle', jours: 2 }, montant: 2100 });
    expect(doublon.action).toBe('doublon');
    expect(faux.action).toBe('invalide');
  });

  it('formulaire sans « Autre » : un profil absent des choix devient le profil professionnel', async () => {
    const m = modeles();
    const sansAutre = JSON.parse(JSON.stringify(CONFIG));
    const champs = sansAutre.sections[0].champs.filter(c => c.cle !== 'profil_autre');
    champs.find(c => c.cle === 'profil').options = opts('Artisan ou professionnel', 'Étudiant', 'Retraité');
    sansAutre.sections[0].champs = champs;
    (await m.Evenement.findByPk()).TypeEvenement.config_inscription = sansAutre;
    const { lignes } = await new ImportInscriptions(m).apercu(await classeur(LIGNES), 2, ORGANISATEUR);
    expect(lignes[1].reponses.profil).toBe('Artisan ou professionnel');
    expect(lignes[1].reponses).not.toHaveProperty('profil_autre');
    expect(lignes[1].remarques[0]).toBe('Profil « Amateur du patrimoine » → Artisan ou professionnel');
  });

  it('compte existant : inscrit seulement ; déjà inscrit : laissé tel quel', async () => {
    const svc = new ImportInscriptions(modeles({
      existants: [{ id_user: 9, email: 'lydia.amrani@exemple.dz' }, { id_user: 10, email: 'nadia.ferhat@exemple.dz' }], dejaInscrits: [10]
    }));
    const { lignes } = await svc.apercu(await classeur(LIGNES), 2, ORGANISATEUR);
    expect(lignes[0].action).toBe('inscrire');
    expect(lignes[3].action).toBe('deja_inscrit');
  });

  it('seul l’organisateur (ou l’administration) peut importer', async () => {
    const svc = new ImportInscriptions(modeles());
    await expect(svc.apercu(await classeur(LIGNES), 2, { id_user: 12, isAdmin: false })).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('Import', () => {
  it('lignes cochées : comptes visiteurs créés sans conditions acceptées, inscrits « en attente », invités 7 jours', async () => {
    const m = modeles();
    const emailService = { sendInvitationInscription: jest.fn().mockResolvedValue({ success: true }) };
    const svc = new ImportInscriptions(m, { emailService, logger: { error: jest.fn() } });
    const bilan = await svc.importer(await classeur(LIGNES), 2, ORGANISATEUR, { lignes: [2, 3, 4, 6, 7] });
    expect(bilan).toEqual({ comptes_crees: 3, inscrits: 3, invitations: 3, erreurs: [] });
    expect(m.crees[0].data).toMatchObject({ email: 'lydia.amrani@exemple.dz', id_type_user: 1, statut: 'actif', email_verifie: false, accepte_conditions: false, nom: { fr: 'Amrani Lydia' } });
    expect(m.crees[0].options).toEqual({ hooks: false });
    expect(m.inscriptions[0]).toMatchObject({ id_evenement: 2, statut_participation: 'inscrit', montant_du: 2000 });
    expect(m.EmailVerification.createVerificationToken).toHaveBeenCalledWith(101, 'password_reset', { invitation: true }, null, 168);
    expect(emailService.sendInvitationInscription).toHaveBeenCalledTimes(3);
  });
});
