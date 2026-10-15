'use strict';

/**
 * Migration : formulaire d'inscription propre à un type d'événement.
 *
 * - type_evenement.config_inscription : questions posées à l'inscription (null = formulaire de base)
 * - evenementusers.reponses_inscription : réponses du participant
 * - nouveau type « Chantier-école » avec le formulaire complet du chantier-école participatif
 *
 * Les valeurs des choix restent en français quelle que soit la langue du participant,
 * pour que les exports gardent des colonnes cohérentes.
 */
const L = (fr, ar, en) => ({ fr, ar, en });
const opt = (valeur, ar, en) => ({ valeur, label: L(valeur, ar, en) });

const FORMULAIRE_CHANTIER_ECOLE = {
  version: 1,
  remplace_formulaire_base: true,
  sections: [
    {
      titre: L('Vous', 'معلوماتكم', 'About you'),
      champs: [
        { cle: 'tel', type: 'tel', requis: true, prerempli: 'telephone', label: L('Téléphone / WhatsApp', 'الهاتف / واتساب', 'Phone / WhatsApp') },
        { cle: 'age', type: 'nombre', min: 10, max: 99, label: L('Âge', 'السن', 'Age') },
        { cle: 'ville', type: 'texte', requis: true, label: L('Ville ou wilaya', 'المدينة أو الولاية', 'City or wilaya') }
      ]
    },
    {
      titre: L('Votre profil', 'ملفكم', 'Your profile'),
      champs: [
        {
          cle: 'profil', type: 'choix', requis: true, label: L('Vous êtes', 'صفتكم', 'You are'),
          options: [
            opt('Artisan ou professionnel', 'حرفي أو مهني', 'Craftsperson or professional'),
            opt('Étudiant', 'طالب', 'Student'),
            opt('Retraité', 'متقاعد', 'Retired'),
            opt('Amateur du patrimoine', 'محبّ للتراث', 'Heritage enthusiast'),
            opt('Autre', 'أخرى', 'Other')
          ]
        },
        { cle: 'metier', type: 'texte', label: L('Métier ou domaine d’études', 'المهنة أو مجال الدراسة', 'Occupation or field of study') },
        {
          cle: 'experience', type: 'choix', label: L('Expérience en construction traditionnelle', 'الخبرة في البناء التقليدي', 'Experience in traditional building'),
          options: [
            opt('Aucune', 'لا توجد', 'None'),
            opt('Un peu', 'قليلة', 'Some'),
            opt('Confirmée', 'متمكّنة', 'Experienced')
          ]
        },
        {
          cle: 'interets', type: 'choix_multiple', label: L('Ce qui vous intéresse', 'ما يهمّكم', 'What interests you'),
          options: [
            opt('Pierre', 'الحجر', 'Stone'),
            opt('Mortier et enduit', 'الملاط والتلبيس', 'Mortar and plaster'),
            opt('Toiture', 'السقف', 'Roofing'),
            opt('Aménagement du village', 'تهيئة القرية', 'Village planning'),
            opt('Circuit touristique', 'المسار السياحي', 'Tourist trail')
          ]
        }
      ]
    },
    {
      titre: L('Votre séjour', 'إقامتكم', 'Your stay'),
      champs: [
        {
          cle: 'presence', type: 'choix', requis: true, label: L('Présence', 'الحضور', 'Attendance'),
          options: [
            opt('Toute la durée', 'طوال المدة', 'Whole duration'),
            opt('Partielle', 'جزئي', 'Partial')
          ]
        },
        {
          cle: 'jours', type: 'nombre', requis: true, min: 1, max: 12,
          condition: { cle: 'presence', valeur: 'Partielle' },
          label: L('Combien de jours ?', 'كم يومًا؟', 'How many days?')
        },
        {
          cle: 'dates', type: 'texte',
          condition: { cle: 'presence', valeur: 'Partielle' },
          label: L('Quelles dates ?', 'ما هي التواريخ؟', 'Which dates?'),
          placeholder: L('Ex. du 24 au 28 décembre', 'مثال: من 24 إلى 28 ديسمبر', 'E.g. 24 to 28 December')
        },
        {
          cle: 'hebergement', type: 'choix', label: L('Besoin d’hébergement ?', 'هل تحتاجون إلى إيواء؟', 'Do you need accommodation?'),
          options: [
            opt('Oui, à l’auberge', 'نعم، في النُّزل', 'Yes, at the hostel'),
            opt('Oui, en maison d’hôtes', 'نعم، في بيت ضيافة', 'Yes, in a guesthouse'),
            opt('Non', 'لا', 'No')
          ]
        },
        {
          cle: 'sante', type: 'texte',
          label: L('Allergies, régime alimentaire ou informations de santé utiles', 'الحساسية، النظام الغذائي أو معلومات صحية مفيدة', 'Allergies, diet or useful health information')
        },
        {
          cle: 'urgence', type: 'texte', requis: true,
          label: L('Personne à contacter en cas d’urgence (nom et téléphone)', 'شخص يُتصل به في حالة الطوارئ (الاسم والهاتف)', 'Emergency contact (name and phone)')
        }
      ]
    },
    {
      titre: L('Pour finir', 'في الختام', 'Finally'),
      champs: [
        {
          cle: 'competences', type: 'choix_multiple',
          label: L('Compétences que vous pouvez apporter', 'المهارات التي يمكنكم تقديمها', 'Skills you can contribute'),
          options: [
            opt('Plans et dessin', 'المخططات والرسم', 'Plans and drawing'),
            opt('Relevé du bâti', 'الرفع المعماري', 'Building survey'),
            opt('Aménagement et paysage', 'التهيئة والمناظر الطبيعية', 'Planning and landscape'),
            opt('Tourisme et médiation', 'السياحة والوساطة', 'Tourism and outreach'),
            opt('Construction traditionnelle', 'البناء التقليدي', 'Traditional building'),
            opt('Photo et vidéo', 'التصوير والفيديو', 'Photo and video'),
            opt('Préparation des repas (bénévole)', 'تحضير الوجبات (تطوعًا)', 'Meal preparation (volunteer)')
          ]
        },
        {
          cle: 'idees', type: 'texte_long',
          label: L(
            'Avez-vous des idées pour rendre ces lieux touristiques ou pour aider la jeunesse locale ?',
            'هل لديكم أفكار لجعل هذه الأماكن سياحية أو لمساعدة الشباب المحلي؟',
            'Any ideas to make these places attractive to visitors or to help local youth?'
          ),
          placeholder: L('Facultatif : une idée, une expérience, un projet similaire…', 'اختياري: فكرة، تجربة، مشروع مشابه…', 'Optional: an idea, an experience, a similar project…')
        },
        { cle: 'motivation', type: 'texte_long', label: L('Pourquoi souhaitez-vous participer ?', 'لماذا ترغبون في المشاركة؟', 'Why do you want to take part?') },
        { cle: 'photos', type: 'accord', label: L('J’accepte d’apparaître sur les photos et vidéos du chantier.', 'أوافق على الظهور في صور وفيديوهات الورشة.', 'I agree to appear in photos and videos of the workshop.') },
        { cle: 'frais', type: 'accord', requis: true, label: L('J’ai bien compris que le chantier est payant (frais d’inscription).', 'فهمتُ أن الورشة بمقابل (رسوم تسجيل).', 'I understand that the workshop is paid (registration fee).') },
        { cle: 'engagement', type: 'accord', requis: true, label: L('Je m’engage à respecter les consignes de sécurité du chantier.', 'ألتزم باحترام تعليمات السلامة في الورشة.', 'I commit to following the workshop safety rules.') }
      ]
    }
  ]
};

const NOM_TYPE = {
  fr: 'Chantier-école',
  ar: 'ورشة مدرسة',
  en: 'Training worksite',
  'tz-ltn': 'Chantier-école',
  'tz-tfng': 'Chantier-école'
};

const DESCRIPTION_TYPE = {
  fr: 'Chantier participatif de restauration du patrimoine, ouvert aux artisans, étudiants et amateurs',
  ar: 'ورشة تشاركية لترميم التراث، مفتوحة للحرفيين والطلبة ومحبي التراث',
  en: 'Participatory heritage restoration worksite, open to craftspeople, students and enthusiasts'
};

module.exports = {
  FORMULAIRE_CHANTIER_ECOLE,

  async up(queryInterface, Sequelize) {
    const typeTable = await queryInterface.describeTable('type_evenement');
    if (!typeTable.config_inscription) {
      await queryInterface.addColumn('type_evenement', 'config_inscription', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'Questions du formulaire d\'inscription (null = formulaire de base)'
      });
    }

    const participationTable = await queryInterface.describeTable('evenementusers');
    if (!participationTable.reponses_inscription) {
      await queryInterface.addColumn('evenementusers', 'reponses_inscription', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'Réponses au formulaire d\'inscription du type d\'événement'
      });
    }

    const [existing] = await queryInterface.sequelize.query(
      "SELECT id_type_evenement FROM type_evenement WHERE JSON_UNQUOTE(JSON_EXTRACT(nom_type, '$.fr')) = :nom LIMIT 1",
      { replacements: { nom: NOM_TYPE.fr } }
    );
    if (existing.length > 0) {
      await queryInterface.sequelize.query(
        'UPDATE type_evenement SET config_inscription = :config WHERE id_type_evenement = :id AND config_inscription IS NULL',
        { replacements: { config: JSON.stringify(FORMULAIRE_CHANTIER_ECOLE), id: existing[0].id_type_evenement } }
      );
      return;
    }

    await queryInterface.bulkInsert('type_evenement', [{
      nom_type: JSON.stringify(NOM_TYPE),
      description: JSON.stringify(DESCRIPTION_TYPE),
      accepte_soumissions: false,
      config_soumission: null,
      config_inscription: JSON.stringify(FORMULAIRE_CHANTIER_ECOLE)
    }]);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "DELETE FROM type_evenement WHERE JSON_UNQUOTE(JSON_EXTRACT(nom_type, '$.fr')) = :nom AND id_type_evenement NOT IN (SELECT id_type_evenement FROM (SELECT DISTINCT id_type_evenement FROM evenement WHERE id_type_evenement IS NOT NULL) e)",
      { replacements: { nom: NOM_TYPE.fr } }
    );
    const participationTable = await queryInterface.describeTable('evenementusers');
    if (participationTable.reponses_inscription) {
      await queryInterface.removeColumn('evenementusers', 'reponses_inscription');
    }
    const typeTable = await queryInterface.describeTable('type_evenement');
    if (typeTable.config_inscription) {
      await queryInterface.removeColumn('type_evenement', 'config_inscription');
    }
  }
};
