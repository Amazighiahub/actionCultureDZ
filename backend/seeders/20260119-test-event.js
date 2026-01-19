'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Créer un événement de test futur avec inscription ouverte
    await queryInterface.bulkInsert('evenement', [{
      nom_evenement: JSON.stringify({
        fr: "Festival Test - Inscription Ouverte",
        ar: "مهرجان اختبار - التسجيل مفتوح",
        en: "Test Festival - Open Registration"
      }),
      description: JSON.stringify({
        fr: "Événement de test pour vérifier le formulaire d'inscription. Venez nombreux ! Cet événement est gratuit et ouvert à tous.",
        ar: "حدث اختباري للتحقق من نموذج التسجيل. تعالوا بأعداد كبيرة!",
        en: "Test event to verify the registration form. Come in large numbers! This event is free and open to all."
      }),
      date_debut: new Date('2026-02-15T10:00:00'),
      date_fin: new Date('2026-02-17T18:00:00'),
      date_limite_inscription: new Date('2026-02-14T23:59:00'),
      id_lieu: 1,
      id_user: 8,
      id_type_evenement: 1,
      statut: 'planifie',
      capacite_max: 100,
      tarif: 0,
      inscription_requise: true,
      contact_email: 'test@festival.dz',
      contact_telephone: '021000000',
      accessibilite: JSON.stringify({
        fr: "Accès PMR disponible, parking gratuit",
        ar: "وصول ذوي الاحتياجات الخاصة متاح",
        en: "Wheelchair access available, free parking"
      }),
      certificat_delivre: false,
      date_creation: new Date(),
      date_modification: new Date()
    }], {});

    console.log('✅ Événement de test créé avec succès !');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('evenement', {
      contact_email: 'test@festival.dz'
    }, {});
  }
};
