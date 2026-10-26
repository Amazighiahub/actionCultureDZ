/**
 * Messages de l'organisateur à ses participants : vérification du formulaire (liens, longueurs),
 * choix des destinataires, notification sur le site avec les informations pratiques, emails un par
 * un avec bilan gardé, seul l'organisateur (ou l'administration) peut écrire. Personnes fictives.
 */
const { MessagesParticipants, lireMessage, lireLien, texteNotification, lienPublicProgramme } = require('../../services/evenement/messagesParticipants');

const ORGANISATEUR = { id_user: 7, isAdmin: false };
const PERSONNES = [
  { id_user: 101, email: 'lydia.amrani@exemple.dz', prenom: 'Lydia', nom: 'Amrani' },
  { id_user: 102, email: 'karim.bensaid@exemple.dz', prenom: 'Karim', nom: 'Bensaid' }
];
const FORMULAIRE = {
  cible: 'confirme',
  titre: 'Changement de programme',
  message: 'Le chantier commence samedi à 8 h au lieu de dimanche.',
  point_rencontre: 'Devant la mairie de Ghoufi',
  lien_programme: 'https://res.cloudinary.com/demo/raw/upload/programme.pdf',
  lien_whatsapp: 'chat.whatsapp.com/AbCdEf123',
  lien_drive: ''
};

function modeles({ personnes = PERSONNES, organisateur = 7 } = {}) {
  const enregistre = { id_message: 1, update: jest.fn().mockResolvedValue(true) };
  return {
    Evenement: { findByPk: jest.fn().mockResolvedValue({ id_evenement: 2, id_user: organisateur, nom_evenement: { fr: 'Chantier-école' } }) },
    EvenementUser: {
      findAll: jest.fn().mockImplementation(({ raw }) => Promise.resolve(raw
        ? [{ statut_participation: 'inscrit' }, { statut_participation: 'confirme' }, { statut_participation: 'present' }, { statut_participation: 'annule' }]
        : personnes.map(User => ({ id_user: User.id_user, User }))))
    },
    User: {},
    MessageEvenement: { create: jest.fn().mockResolvedValue(enregistre), findAll: jest.fn().mockResolvedValue([]) },
    Notification: { bulkCreate: jest.fn().mockResolvedValue([]) },
    enregistre
  };
}
const emailService = (echec = null) => ({
  sendMessageParticipant: jest.fn().mockImplementation((user) => Promise.resolve({ success: user.email !== echec })),
  etatEnvoi: () => 'actif'
});

describe('lireMessage', () => {
  it('liens complétés en https, champs vides laissés de côté', () => {
    const m = lireMessage(FORMULAIRE);
    expect(m.lien_whatsapp).toBe('https://chat.whatsapp.com/AbCdEf123');
    expect(m.lien_drive).toBeNull();
    expect(m.cible).toBe('confirme');
    expect(lireMessage({ ...FORMULAIRE, cible: 'nimporte' }).cible).toBe('tous');
  });

  it('objet, message ou lien invalides : erreur claire', () => {
    expect(() => lireMessage({ ...FORMULAIRE, titre: ' ' })).toThrow('objet');
    expect(() => lireMessage({ ...FORMULAIRE, message: '' })).toThrow('message');
    expect(() => lireLien('javascript:alert(1)', 'Le lien')).toThrow('pas une adresse valide');
    expect(() => lireLien('pas un lien', 'Le lien')).toThrow('pas une adresse valide');
  });

  it('la notification reprend le point de rencontre et les liens', () => {
    const texte = texteNotification(lireMessage(FORMULAIRE));
    expect(texte).toContain('Devant la mairie de Ghoufi');
    expect(texte).toContain('https://chat.whatsapp.com/AbCdEf123');
    expect(texte).not.toContain('Drive');
  });
});

describe('MessagesParticipants', () => {
  it('nombre de personnes pour chaque choix (les annulés ne comptent pas)', async () => {
    const { nombres } = await new MessagesParticipants(modeles()).lister(2, ORGANISATEUR);
    expect(nombres).toEqual({ tous: 3, confirme: 2, en_attente: 1 });
  });

  it('envoi : message gardé, une notification par personne, emails un par un avec bilan', async () => {
    const m = modeles();
    const mail = emailService('karim.bensaid@exemple.dz');
    const service = new MessagesParticipants(m, { emailService: mail, pauseMs: 0 });
    const res = await service.envoyer(2, ORGANISATEUR, FORMULAIRE);

    expect(res).toMatchObject({ destinataires: 2, emails: 2, email_etat: 'actif' });
    expect(m.EvenementUser.findAll.mock.calls[0][0].where.statut_participation).toBeDefined();
    expect(m.MessageEvenement.create).toHaveBeenCalledWith(expect.objectContaining({ id_evenement: 2, id_user: 7, nb_destinataires: 2, cible: 'confirme' }));
    const notifications = m.Notification.bulkCreate.mock.calls[0][0];
    expect(notifications).toHaveLength(2);
    expect(notifications[0]).toMatchObject({ type_notification: 'message_evenement', id_evenement: 2, url_action: '/evenements/2' });

    await new Promise(r => setImmediate(r));
    expect(mail.sendMessageParticipant).toHaveBeenCalledTimes(2);
    expect(m.enregistre.update).toHaveBeenCalledWith({ nb_emails_envoyes: 1, nb_emails_echoues: 1 });
  });

  it('autre organisateur : refusé ; personne à prévenir : refusé ; rien envoyé', async () => {
    const mail = emailService();
    await expect(new MessagesParticipants(modeles(), { emailService: mail }).envoyer(2, { id_user: 12, isAdmin: false }, FORMULAIRE))
      .rejects.toMatchObject({ statusCode: 403 });
    const vide = modeles({ personnes: [] });
    await expect(new MessagesParticipants(vide, { emailService: mail }).envoyer(2, ORGANISATEUR, FORMULAIRE))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(vide.Notification.bulkCreate).not.toHaveBeenCalled();
    expect(mail.sendMessageParticipant).not.toHaveBeenCalled();
  });

  it('PDF mis en ligne : servi par le site (programme.pdf) ; autre lien laissé tel quel', async () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'demo';
    process.env.FRONTEND_URL = 'https://taladz.com';
    const m = modeles();
    await new MessagesParticipants(m, { emailService: emailService(), pauseMs: 0 }).envoyer(2, ORGANISATEUR, FORMULAIRE);
    expect(m.Notification.bulkCreate.mock.calls[0][0][0].message).toContain('https://taladz.com/api/evenements/2/messages/1/programme.pdf');
    expect(lienPublicProgramme({ id_evenement: 2, id_message: 1, lien_programme: 'https://drive.google.com/file/d/x' })).toBe('https://drive.google.com/file/d/x');
    m.MessageEvenement.findOne = jest.fn().mockResolvedValue({ lien_programme: 'https://exemple.dz/x.pdf' });
    await expect(new MessagesParticipants(m).programme(2, 1)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('l\'administration peut écrire aux participants de tout événement', async () => {
    const res = await new MessagesParticipants(modeles({ organisateur: 99 }), { emailService: emailService(), pauseMs: 0 })
      .envoyer(2, { id_user: 1, isAdmin: true }, FORMULAIRE);
    expect(res.destinataires).toBe(2);
  });
});
