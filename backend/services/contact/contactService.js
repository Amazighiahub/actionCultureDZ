class ContactService {
  constructor(emailService) {
    this.emailService = emailService;
  }

  async sendContactMessage({ prenom, nom, email, sujet, message }) {
    const contactEmail = process.env.CONTACT_EMAIL || process.env.EMAIL_FROM || 'contact@taladz.com';

    // Champs saisis par le visiteur : échappés (sinon HTML/liens injectés dans la boîte de l'équipe)
    const esc = (v) => this.emailService._escapeHtml(v || '');
    const html = `
      <h2>Nouveau message de contact — Tala DZ</h2>
      <p><strong>De :</strong> ${esc(prenom)} ${esc(nom)}</p>
      <p><strong>Email :</strong> ${esc(email)}</p>
      <p><strong>Sujet :</strong> ${esc(sujet) || 'Sans sujet'}</p>
      <hr/>
      <p>${esc(message).replace(/\n/g, '<br/>')}</p>
    `;

    const text = `De : ${prenom || ''} ${nom || ''} <${email}>\nSujet : ${sujet || 'Sans sujet'}\n\n${message}`;

    return this.emailService.sendEmail(
      contactEmail,
      // sujet sur une seule ligne (en-tête email)
      `[Contact Tala DZ] ${String(sujet || 'Nouveau message').replace(/[\r\n]+/g, ' ')}`,
      html,
      null,
      text
    );
  }
}

module.exports = ContactService;
