class ContactService {
  constructor(emailService) {
    this.emailService = emailService;
  }

  async sendContactMessage({ prenom, nom, email, sujet, message }) {
    const contactEmail = process.env.CONTACT_EMAIL || process.env.EMAIL_FROM || 'contact@taladz.com';

    const html = `
      <h2>Nouveau message de contact — Tala DZ</h2>
      <p><strong>De :</strong> ${prenom || ''} ${nom || ''}</p>
      <p><strong>Email :</strong> ${email}</p>
      <p><strong>Sujet :</strong> ${sujet || 'Sans sujet'}</p>
      <hr/>
      <p>${message.replace(/\n/g, '<br/>')}</p>
    `;

    const text = `De : ${prenom || ''} ${nom || ''} <${email}>\nSujet : ${sujet || 'Sans sujet'}\n\n${message}`;

    return this.emailService.sendEmail(
      contactEmail,
      `[Contact Tala DZ] ${sujet || 'Nouveau message'}`,
      html,
      null,
      text
    );
  }
}

module.exports = ContactService;
