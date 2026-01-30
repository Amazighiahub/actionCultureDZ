// seed-data-reference.js - Données de référence pour le seed complet

module.exports = {
  ROLES: [
    { nom_role: 'User', description: 'Utilisateur standard (visiteur)' },
    { nom_role: 'Professionnel', description: 'Professionnel de la culture' },
    { nom_role: 'Administrateur', description: 'Administrateur du système' }
  ],

  TYPES_USER: [
    { nom_type: 'visiteur', description: 'Visiteur standard' },
    { nom_type: 'auteur', description: 'Auteur de livres' },
    { nom_type: 'traducteur', description: 'Traducteur littéraire' },
    { nom_type: 'illustrateur', description: 'Illustrateur' },
    { nom_type: 'realisateur', description: 'Réalisateur de films' },
    { nom_type: 'acteur', description: 'Acteur/Actrice' },
    { nom_type: 'producteur', description: 'Producteur' },
    { nom_type: 'compositeur', description: 'Compositeur musical' },
    { nom_type: 'interprete', description: 'Interprète musical' },
    { nom_type: 'journaliste', description: 'Journaliste culturel' },
    { nom_type: 'chercheur', description: 'Chercheur' },
    { nom_type: 'artiste', description: 'Artiste plasticien' },
    { nom_type: 'artisan', description: 'Artisan d\'art' },
    { nom_type: 'administrateur', description: 'Administrateur système' }
  ],

  TYPES_EVENEMENT: [
    { nom_type: 'Festival', description: 'Festival culturel ou artistique' },
    { nom_type: 'Exposition', description: 'Exposition d\'art ou de patrimoine' },
    { nom_type: 'Conférence', description: 'Conférence ou colloque' },
    { nom_type: 'Théâtre', description: 'Représentation théâtrale' },
    { nom_type: 'Atelier', description: 'Atelier pratique ou formation' },
    { nom_type: 'Concert', description: 'Concert ou soirée musicale' },
    { nom_type: 'Projection', description: 'Projection cinématographique' },
    { nom_type: 'Salon', description: 'Salon du livre ou de l\'artisanat' },
    { nom_type: 'Visite guidée', description: 'Visite guidée de patrimoine' }
  ],

  TYPES_ORGANISATION: [
    { nom: 'Association' },
    { nom: 'Entreprise' },
    { nom: 'Institution publique' },
    { nom: 'ONG' },
    { nom: 'Musée' }
  ],

  LANGUES: [
    { nom: 'Arabe', code: 'ar' },
    { nom: 'Français', code: 'fr' },
    { nom: 'Tamazight', code: 'ber' },
    { nom: 'Anglais', code: 'en' }
  ],

  TYPES_OEUVRE: [
    { nom_type: 'Livre', description: 'Œuvre littéraire écrite' },
    { nom_type: 'Film', description: 'Œuvre cinématographique' },
    { nom_type: 'Album Musical', description: 'Œuvre musicale' },
    { nom_type: 'Article', description: 'Article de presse' },
    { nom_type: 'Artisanat', description: 'Œuvre artisanale traditionnelle' },
    { nom_type: 'Art', description: 'Œuvre d\'art visuel' }
  ],

  GENRES: [
    { nom: 'Roman', description: 'Roman littéraire', couleur: '#4B0082', actif: true },
    { nom: 'Nouvelle', description: 'Nouvelle littéraire', couleur: '#6A5ACD', actif: true },
    { nom: 'Poésie', description: 'Poésie', couleur: '#9370DB', actif: true },
    { nom: 'Essai', description: 'Essai', couleur: '#8A2BE2', actif: true },
    { nom: 'Drame', description: 'Film dramatique', couleur: '#DC143C', actif: true },
    { nom: 'Comédie', description: 'Film comique', couleur: '#FF6347', actif: true },
    { nom: 'Documentaire', description: 'Film documentaire', couleur: '#FF4500', actif: true },
    { nom: 'Chaâbi', description: 'Musique Chaâbi algéroise', couleur: '#228B22', actif: true },
    { nom: 'Raï', description: 'Musique Raï', couleur: '#32CD32', actif: true },
    { nom: 'Andalou', description: 'Musique andalouse', couleur: '#00FA9A', actif: true },
    { nom: 'Kabyle', description: 'Musique kabyle', couleur: '#00FF7F', actif: true }
  ],

  CATEGORIES: [
    { nom: 'Patrimoine culturel', description: 'Œuvres du patrimoine algérien', couleur: '#8B4513' },
    { nom: 'Art contemporain', description: 'Créations artistiques modernes', couleur: '#FF6347' },
    { nom: 'Littérature', description: 'Œuvres littéraires', couleur: '#4B0082' },
    { nom: 'Cinéma', description: 'Productions cinématographiques', couleur: '#DC143C' },
    { nom: 'Musique', description: 'Œuvres musicales', couleur: '#FF1493' },
    { nom: 'Artisanat traditionnel', description: 'Savoir-faire traditionnel', couleur: '#DAA520' }
  ],

  MATERIAUX: [
    { nom: 'Argile', description: 'Matériau pour la poterie' },
    { nom: 'Laine', description: 'Fibre naturelle pour le tissage' },
    { nom: 'Cuir', description: 'Matériau pour la maroquinerie' },
    { nom: 'Cuivre', description: 'Métal pour l\'artisanat' },
    { nom: 'Argent', description: 'Métal pour la bijouterie' }
  ],

  TECHNIQUES: [
    { nom: 'Tissage traditionnel', description: 'Technique ancestrale de tissage' },
    { nom: 'Poterie au tour', description: 'Façonnage de l\'argile' },
    { nom: 'Gravure sur cuivre', description: 'Art de la dinanderie' },
    { nom: 'Broderie', description: 'Art de la broderie traditionnelle' },
    { nom: 'Ciselure', description: 'Travail du métal' }
  ],

  UTILISATEURS: [
    { nom: { fr: 'Admin', ar: 'مدير' }, prenom: { fr: 'System', ar: 'النظام' }, email: 'admin@actionculture.dz', password: 'admin123', type: 'administrateur', role: 'Administrateur', wilaya: 16 },
    { nom: { fr: 'Benali', ar: 'بن علي' }, prenom: { fr: 'Mohamed', ar: 'محمد' }, email: 'm.benali@test.dz', password: 'password123', type: 'auteur', role: 'Professionnel', wilaya: 16 },
    { nom: { fr: 'Saidi', ar: 'سعيدي' }, prenom: { fr: 'Fatima', ar: 'فاطمة' }, email: 'f.saidi@test.com', password: 'password123', type: 'visiteur', role: 'User', wilaya: 31 },
    { nom: { fr: 'Khedda', ar: 'خدة' }, prenom: { fr: 'Amina', ar: 'أمينة' }, email: 'a.khedda@musee.dz', password: 'password123', type: 'artiste', role: 'Professionnel', wilaya: 31 },
    { nom: { fr: 'Mammeri', ar: 'ماموري' }, prenom: { fr: 'Karim', ar: 'كريم' }, email: 'k.mammeri@cinema.dz', password: 'password123', type: 'realisateur', role: 'Professionnel', wilaya: 16 },
    { nom: { fr: 'Boudiaf', ar: 'بوضياف' }, prenom: { fr: 'Sarah', ar: 'سارة' }, email: 's.boudiaf@music.dz', password: 'password123', type: 'compositeur', role: 'Professionnel', wilaya: 25 },
    { nom: { fr: 'Ziani', ar: 'زياني' }, prenom: { fr: 'Ahmed', ar: 'أحمد' }, email: 'a.ziani@journal.dz', password: 'password123', type: 'journaliste', role: 'Professionnel', wilaya: 16 },
    { nom: { fr: 'Belkacem', ar: 'بلقاسم' }, prenom: { fr: 'Nabila', ar: 'نبيلة' }, email: 'n.belkacem@artisan.dz', password: 'password123', type: 'artisan', role: 'Professionnel', wilaya: 15 },
    { nom: { fr: 'Hamidi', ar: 'حميدي' }, prenom: { fr: 'Yacine', ar: 'ياسين' }, email: 'y.hamidi@culture.dz', password: 'password123', type: 'chercheur', role: 'Professionnel', wilaya: 19 },
    { nom: { fr: 'Ait Ahmed', ar: 'آيت أحمد' }, prenom: { fr: 'Lynda', ar: 'ليندا' }, email: 'l.aitahmed@test.dz', password: 'password123', type: 'visiteur', role: 'User', wilaya: 6 }
  ],

  LIEUX: [
    { nom: { fr: 'Palais de la Culture Moufdi-Zakaria', ar: 'قصر الثقافة مفدي زكريا' }, adresse: { fr: 'Plateau des Annassers, Alger', ar: 'هضبة الأناصر، الجزائر' }, latitude: 36.7167, longitude: 3.0500, typeLieu: 'Commune', typePatrimoine: 'monument', communeId: 1 },
    { nom: { fr: 'Musée National Ahmed Zabana', ar: 'المتحف الوطني أحمد زبانة' }, adresse: { fr: 'Boulevard de l\'ALN, Oran', ar: 'شارع جيش التحرير، وهران' }, latitude: 35.6969, longitude: -0.6331, typeLieu: 'Commune', typePatrimoine: 'musee', communeId: 1 },
    { nom: { fr: 'Théâtre National Algérien', ar: 'المسرح الوطني الجزائري' }, adresse: { fr: 'Rue Zighout Youcef, Alger', ar: 'شارع زيغود يوسف، الجزائر' }, latitude: 36.7525, longitude: 3.0420, typeLieu: 'Commune', typePatrimoine: 'monument', communeId: 1 },
    { nom: { fr: 'Casbah d\'Alger', ar: 'قصبة الجزائر' }, adresse: { fr: 'Casbah, Alger', ar: 'القصبة، الجزائر' }, latitude: 36.7850, longitude: 3.0600, typeLieu: 'Commune', typePatrimoine: 'ville_village', communeId: 1 },
    { nom: { fr: 'Timgad - Ruines romaines', ar: 'تيمقاد - الآثار الرومانية' }, adresse: { fr: 'Timgad, Batna', ar: 'تيمقاد، باتنة' }, latitude: 35.4847, longitude: 6.4683, typeLieu: 'Commune', typePatrimoine: 'site_archeologique', communeId: 1 },
    { nom: { fr: 'Grande Mosquée d\'Alger', ar: 'جامع الجزائر الأعظم' }, adresse: { fr: 'Mohammadia, Alger', ar: 'المحمدية، الجزائر' }, latitude: 36.7400, longitude: 3.1200, typeLieu: 'Commune', typePatrimoine: 'edifice_religieux', communeId: 1 }
  ],

  EVENEMENTS: [
    { nom: { fr: 'Festival de Musique Andalouse 2025', ar: 'مهرجان الموسيقى الأندلسية 2025' }, description: { fr: 'Festival de musique andalouse avec artistes du Maghreb', ar: 'مهرجان الموسيقى الأندلسية مع فنانين من المغرب العربي' }, type: 'Festival', dateDebut: '2025-07-15', dateFin: '2025-07-20', capacite: 500, tarif: 1500, inscriptionRequise: true },
    { nom: { fr: 'Exposition Art Contemporain', ar: 'معرض الفن المعاصر' }, description: { fr: 'Exposition collective de 20 artistes algériens', ar: 'معرض جماعي لـ 20 فنانًا جزائريًا' }, type: 'Exposition', dateDebut: '2025-06-01', dateFin: '2025-06-30', capacite: 200, tarif: 0, inscriptionRequise: false },
    { nom: { fr: 'Projection Cinéma Algérien', ar: 'عرض السينما الجزائرية' }, description: { fr: 'Projection de films algériens avec débat', ar: 'عرض أفلام جزائرية مع نقاش' }, type: 'Projection', dateDebut: '2025-08-10', dateFin: '2025-08-10', capacite: 150, tarif: 500, inscriptionRequise: false },
    { nom: { fr: 'Atelier d\'Écriture Créative', ar: 'ورشة الكتابة الإبداعية' }, description: { fr: 'Atelier d\'écriture animé par des auteurs', ar: 'ورشة كتابة يديرها كتاب' }, type: 'Atelier', dateDebut: '2025-09-05', dateFin: '2025-09-07', capacite: 20, tarif: 2000, inscriptionRequise: true },
    { nom: { fr: 'Salon du Livre d\'Alger 2025', ar: 'صالون الكتاب بالجزائر 2025' }, description: { fr: 'Le plus grand salon du livre en Afrique', ar: 'أكبر معرض للكتاب في أفريقيا' }, type: 'Salon', dateDebut: '2025-10-25', dateFin: '2025-11-05', capacite: 5000, tarif: 200, inscriptionRequise: false },
    { nom: { fr: 'Concert Raï - Hommage aux Maîtres', ar: 'حفل الراي - تكريم الأساتذة' }, description: { fr: 'Concert hommage aux maîtres du Raï', ar: 'حفل تكريمًا لأساتذة الراي' }, type: 'Concert', dateDebut: '2025-08-25', dateFin: '2025-08-25', capacite: 3000, tarif: 2500, inscriptionRequise: true },
    { nom: { fr: 'Visite guidée de la Casbah', ar: 'جولة مرشدة في القصبة' }, description: { fr: 'Découvrez la Casbah d\'Alger, patrimoine UNESCO', ar: 'اكتشف قصبة الجزائر، التراث العالمي' }, type: 'Visite guidée', dateDebut: '2025-06-15', dateFin: '2025-06-15', capacite: 30, tarif: 500, inscriptionRequise: true },
    { nom: { fr: 'Festival du Théâtre Amazigh', ar: 'مهرجان المسرح الأمازيغي' }, description: { fr: 'Festival célébrant le théâtre amazigh', ar: 'مهرجان يحتفي بالمسرح الأمازيغي' }, type: 'Festival', dateDebut: '2025-09-20', dateFin: '2025-09-27', capacite: 400, tarif: 800, inscriptionRequise: false }
  ],

  PROGRAMMES_TYPES: [
    { type: 'conference', titre: { fr: 'Conférence', ar: 'محاضرة' } },
    { type: 'atelier', titre: { fr: 'Atelier pratique', ar: 'ورشة عملية' } },
    { type: 'spectacle', titre: { fr: 'Spectacle', ar: 'عرض' } },
    { type: 'debat', titre: { fr: 'Table ronde', ar: 'طاولة مستديرة' } },
    { type: 'projection', titre: { fr: 'Projection', ar: 'عرض فيلم' } },
    { type: 'concert', titre: { fr: 'Concert', ar: 'حفل موسيقي' } },
    { type: 'visite', titre: { fr: 'Visite guidée', ar: 'جولة مرشدة' } }
  ],

  LIVRES: [
    { titre: { fr: 'Nedjma', ar: 'نجمة' }, auteur: 'Kateb Yacine', annee: 1956, description: { fr: 'Roman majeur de la littérature algérienne', ar: 'رواية رئيسية في الأدب الجزائري' }, genre: 'Roman' },
    { titre: { fr: 'Le Fils du pauvre', ar: 'ابن الفقير' }, auteur: 'Mouloud Feraoun', annee: 1950, description: { fr: 'Roman autobiographique sur la Kabylie', ar: 'رواية سيرة ذاتية عن منطقة القبائل' }, genre: 'Roman' },
    { titre: { fr: 'La Grande Maison', ar: 'الدار الكبيرة' }, auteur: 'Mohammed Dib', annee: 1952, description: { fr: 'Premier volet de la trilogie Algérie', ar: 'الجزء الأول من ثلاثية الجزائر' }, genre: 'Roman' },
    { titre: { fr: 'L\'Opium et le Bâton', ar: 'الأفيون والعصا' }, auteur: 'Mouloud Mammeri', annee: 1965, description: { fr: 'Roman sur la guerre d\'indépendance', ar: 'رواية عن حرب الاستقلال' }, genre: 'Roman' },
    { titre: { fr: 'L\'Amour, la fantasia', ar: 'الحب، الفانتازيا' }, auteur: 'Assia Djebar', annee: 1985, description: { fr: 'Roman mêlant autobiographie et histoire', ar: 'رواية تمزج السيرة الذاتية والتاريخ' }, genre: 'Roman' }
  ],

  FILMS: [
    { titre: { fr: 'La Bataille d\'Alger', ar: 'معركة الجزائر' }, realisateur: 'Gillo Pontecorvo', annee: 1966, description: { fr: 'Film historique sur la bataille d\'Alger', ar: 'فيلم تاريخي عن معركة الجزائر' }, genre: 'Drame' },
    { titre: { fr: 'Chronique des années de braise', ar: 'وقائع سنين الجمر' }, realisateur: 'Mohammed Lakhdar-Hamina', annee: 1975, description: { fr: 'Palme d\'Or à Cannes', ar: 'السعفة الذهبية في كان' }, genre: 'Drame' },
    { titre: { fr: 'Omar Gatlato', ar: 'عمر قتلاتو' }, realisateur: 'Merzak Allouache', annee: 1976, description: { fr: 'Portrait de la jeunesse algéroise', ar: 'صورة للشباب الجزائري' }, genre: 'Comédie' }
  ],

  ALBUMS: [
    { titre: { fr: 'El Menfi', ar: 'المنفي' }, artiste: 'El Hadj M\'Hamed El Anka', annee: 1950, description: { fr: 'Album mythique du Chaâbi', ar: 'ألبوم أسطوري للشعبي' }, genre: 'Chaâbi' },
    { titre: { fr: 'Ya Rayah', ar: 'يا رايح' }, artiste: 'Dahmane El Harrachi', annee: 1973, description: { fr: 'Chanson emblématique du Chaâbi', ar: 'أغنية رمزية للشعبي' }, genre: 'Chaâbi' },
    { titre: { fr: 'Didi', ar: 'ديدي' }, artiste: 'Cheb Khaled', annee: 1992, description: { fr: 'Album emblématique du Raï', ar: 'ألبوم رمزي للراي' }, genre: 'Raï' }
  ],

  ARTISANAT: [
    { titre: { fr: 'Tapis des Ait Hichem', ar: 'زربية آيت حيشم' }, description: { fr: 'Tapis berbère traditionnel de Kabylie', ar: 'سجادة بربرية تقليدية' } },
    { titre: { fr: 'Poterie de Maâtkas', ar: 'فخار معاتقة' }, description: { fr: 'Poterie kabyle traditionnelle', ar: 'فخار قبائلي تقليدي' } },
    { titre: { fr: 'Bijoux berbères en argent', ar: 'مجوهرات بربرية فضية' }, description: { fr: 'Bijoux traditionnels kabyles', ar: 'مجوهرات قبائلية تقليدية' } },
    { titre: { fr: 'Dinanderie de Constantine', ar: 'صناعة النحاس بقسنطينة' }, description: { fr: 'Art du cuivre de Constantine', ar: 'فن النحاس بقسنطينة' } }
  ]
};
