-- Seeds pour l'exposition "Art Contemporain Algérien"
-- Fichier: exposition-art-contemporain.sql
-- Date: 2024-01-20

-- ========================================================================
-- ÉVÉNEMENT : Exposition "Art Contemporain Algérien"
-- ========================================================================

-- Insérer l'événement principal
INSERT INTO evenement (
  id_evenement, 
  nom_evenement, 
  description, 
  date_debut, 
  date_fin, 
  contact_email, 
  contact_telephone, 
  image_url, 
  id_lieu, 
  id_user, 
  id_type_evenement, 
  statut, 
  capacite_max, 
  tarif, 
  inscription_requise, 
  created_at, 
  updated_at
) VALUES (
  1,
  '{"fr": "Exposition Art Contemporain Algérien", "ar": "معرض الفن الجزائري المعاصر", "en": "Algerian Contemporary Art Exhibition", "tz-ltn": "Tasmunt n Tẓri Tazzayrit Tamaynut", "tz-tfng": "ⵜⴰⵙⵎⵓⵏⵜ ⵏ ⵜⵥⵔⵉ ⵜⴰⵣⴰⵢⵔⵉⵜ ⵜⴰⵎⴰⵢⵏⵓⵜ"}',
  '{"fr": "Une exposition exceptionnelle présentant les œuvres des meilleurs artistes contemporains algériens. Explorez la diversité et la richesse de la création artistique algérienne moderne à travers peintures, sculptures, installations et photographies.", "ar": "معرض استثنائي يعرض أعظم أعمال الفنانين الجزائريين المعاصرين. استكشف تنوع وثراء الإبداع الفني الجزائري الحديث من خلال اللوحات والمنحوتات والتركيبات والتصوير الفوتوغرافي.", "en": "An exceptional exhibition featuring the works of the best Algerian contemporary artists. Explore the diversity and richness of modern Algerian artistic creation through paintings, sculptures, installations and photography.", "tz-ltn": "Tasmunt amiran n tmuccagin n tẓri tazzayrit tamaynut. Smel tiwizi d tazdayt n tmusni tazzayrit tamaynut s yiwet n wudem, tizdinin, tiɣawsiwin n tkatut d tiflut.", "tz-tfng": "ⵜⴰⵙⵎⵓⵏⵜ ⴰⵎⵉⵔⴰⵏ ⵏ ⵜⵎⵓⵛⴰⴳⵉⵏ ⵏ ⵜⵥⵔⵉ ⵜⴰⵣⴰⵢⵔⵉⵜ ⵜⴰⵎⴰⵢⵏⵓⵜ. ⵙⵎⴻⵍ ⵜⵉⵡⵉⵣⵉ ⴷ ⵜⴰⵣⴷⴰⵢⵜ ⵏ ⵜⵎⵓⵙⵏⵉ ⵜⴰⵣⴰⵢⵔⵉⵜ ⵜⴰⵎⴰⵢⵏⵓⵜ ⵙ ⵉⵡⴻⵜ ⵏ ⵡⵓⴷⴻⵎ, ⵜⵉⵥⴷⵉⵏⵉⵏ, ⵜⵉⵖⴰⵡⴰⵙⵉⵏ ⵏ ⵜⴽⴰⵜⵓⵜ ⴷ ⵜⵉⴼⵍⵓⵜ."}',
  '2024-02-01 09:00:00',
  '2024-02-15 18:00:00',
  'exposition@eventculture.dz',
  '+213 21 98 76 54',
  '/images/exposition-art-contemporain.jpg',
  1, -- Musée National des Beaux-Arts d'Alger
  2, -- Karim Benali (organisateur)
  1, -- Type: Exposition
  'publie',
  500,
  0.00, -- Entrée gratuite
  true,
  NOW(),
  NOW()
);

-- ========================================================================
-- LIEU : Musée National des Beaux-Arts d'Alger
-- ========================================================================

-- Insérer le lieu de l'exposition
INSERT INTO lieu (
  id_lieu,
  typeLieu,
  communeId,
  localiteId,
  nom,
  adresse,
  latitude,
  longitude,
  typePatrimoine,
  created_at,
  updated_at
) VALUES (
  1,
  'musee',
  1, -- Alger
  NULL,
  '{"fr": "Musée National des Beaux-Arts d'Alger", "ar": "المتحف الوطني للفنون الجميلة بالجزائر العاصمة", "en": "National Museum of Fine Arts of Algiers", "tz-ltn": "Amudem n Tmurt n Tẓri Tilawin n Dzayer", "tz-tfng": "ⴰⵎⵓⴷⴻⵎ ⵏ ⵜⵎⵓⵔⵜ ⵏ ⵜⵥⵔⵉ ⵜⵉⵍⴰⵡⵉⵏ ⵏ ⴷⵣⴰⵢⴻⵔ"}',
  '{"fr": "1, Rue des Frères Azouaou, El Biar, Alger", "ar": "1 شارع إخوان أزواو، البيار، الجزائر العاصمة", "en": "1, Rue des Frères Azouaou, El Biar, Algiers", "tz-ltn": "1, Srid n Wraw Azouaou, Lbyar, Dzayer", "tz-tfng": "1, ⵙⵕⵉⴷ ⵏ ⵡⵕⴰⵡ ⴰⵣⵓⴰⵓ, ⵍⴱⵢⴰⵔ, ⴷⵣⴰⵢⴻⵔ"}',
  36.753800,
  3.058750,
  'musee',
  NOW(),
  NOW()
);

-- ========================================================================
-- PROGRAMMES DE L'EXPOSITION (3 jours)
-- ========================================================================

-- Jour 1: Vernissage et Présentation
INSERT INTO programme (
  id_programme,
  titre,
  description,
  id_evenement,
  id_lieu,
  date_programme,
  heure_debut,
  heure_fin,
  lieu_specifique,
  ordre,
  statut,
  type_activite,
  duree_estimee,
  nb_participants_max,
  langue_principale,
  traduction_disponible,
  enregistrement_autorise,
  diffusion_live,
  support_numerique,
  created_at,
  updated_at
) VALUES 
(
  1,
  '{"fr": "Vernissage - Ouverture Officielle", "ar": "الافتتاح - حفل الافتتاح الرسمي", "en": "Opening Ceremony - Official Opening", "tz-ltn": "Asemmed - Tazdegt Tameɣdayt", "tz-tfng": "ⴰⵙⴻⵎⵎⴻⴷ - ⵜⴰⵣⴷⴰⴳⵜ ⵜⴰⵎⴻⵖⴰⴷⴰⵢⵜ"}',
  '{"fr": "Cérémonie d'ouverture officielle de l'exposition avec discours des artistes et autorités. Cocktail de bienvenue et première visite guidée.", "ar": "حفل الافتتاح الرسمي للمعرض مع خطابات الفنانين والسلطات. كوكتيل ترحيب وأول جولة إرشادية.", "en": "Official opening ceremony with speeches by artists and authorities. Welcome cocktail and first guided tour.", "tz-ltn": "Tazdegt tameɣdayt n tasmunt s yiwet n wudem n tmeslay n yimẓẓayen d yemḍanen. Imensi n umenzu d tazwart n twuri n umeddakel.", "tz-tfng": "ⵜⴰⵣⴷⴰⴳⵜ ⵜⴰⵎⴻⵖⴰⴷⴰⵢⵜ ⵏ ⵜⴰⵙⵎⵓⵏⵜ ⵙ ⵉⵡⴻⵜ ⵏ ⵡⵓⴷⴻⵎ ⵏ ⵜⵎⵙⵍⴰⵢ ⵏ ⵉⵎⵣⵣⴰⵢⴻⵏ ⴷ ⵉⵎⴹⴰⵏⴻⵏ. ⵉⵎⴻⵏⵙⵉ ⵏ ⵓⵎⴻⵏⵣⵓ ⴷ ⵜⴰⵣⵡⴰⵔⵜ ⵏ ⵜⵡⵓⵔⵉ ⵏ ⵓⵎⴻⴷⴷⴰⴽⴻⵍ."}',
  1,
  1,
  '2024-02-01',
  '18:00:00',
  '20:00:00',
  '{"fr": "Grande Salle d'Exposition - Étage 1", "ar": "قاعة العرض الكبرى - الطابق الأول", "en": "Main Exhibition Hall - Floor 1", "tz-ltn": "Tallen Tameqrant n Tasmunt - Aggar 1", "tz-tfng": "ⵜⴰⵍⵍⴻⵏⵜ ⵜⴰⵎⴻⵇⵔⴰⵏⵜ ⵏ ⵜⴰⵙⵎⵓⵏⵜ - ⴰⴳⴳⴰⵔ 1"}',
  1,
  'planifie',
  'ceremonie',
  120,
  200,
  'fr',
  true,
  false,
  false,
  true,
  NOW(),
  NOW()
),

-- Jour 1: Visite Guidée Spécialisée
(
  2,
  '{"fr": "Visite Guidée - Art Abstrait Algérien", "ar": "جولة إرشادية - الفن التجريدي الجزائري", "en": "Guided Tour - Algerian Abstract Art", "tz-ltn": "Tawri n Umeddakel - Tẓri Abstrak Tazzayrit", "tz-tfng": "ⵜⴰⵡⵔⵉ ⵏ ⵓⵎⴻⴷⴷⴰⴽⴻⵍ - ⵜⵥⵔⵉ ⴰⴱⵙⵟⵔⴰⴽ ⵜⴰⵣⴰⵢⵔⵉⵜ"}',
  '{"fr": "Exploration approfondie des œuvres abstraites algériennes avec commentaires des artistes. Focus sur les techniques et les influences.", "ar": "استكشاف عميق للأعمال التجريدية الجزائرية مع تعليقات الفنانين. التركيز على التقنيات والتأثيرات.", "en": "In-depth exploration of Algerian abstract works with artists' comments. Focus on techniques and influences.", "tz-ltn": "Asmel ameqran n twuriwin n tẓri abstrak tazzayrit s yiwet n wudem n tmeslay n yimẓẓayen. Arzut ɣef tarrayin d tifrat.", "tz-tfng": "ⴰⵙⵎⴻⵍ ⴰⵎⴻⵇⵔⴰⵏ ⵏ ⵜⵡⵓⵔⵉⵡⵉⵏ ⵏ ⵜⵥⵔⵉ ⴰⴱⵙⵟⵔⴰⴽ ⵜⴰⵣⴰⵢⵔⵉⵜ ⵙ ⵉⵡⴻⵜ ⵏ ⵡⵓⴷⴻⵎ ⵏ ⵜⵎⵙⵍⴰⵢ ⵏ ⵉⵎⵣⵣⴰⵢⴻⵏ. ⴰⵔⵣⵓⵜ ⵖ ⵜⴰⵟⵔⴰⵢⵉⵏ ⴷ ⵜⵉⴼⵔⴰⵜ."}',
  1,
  1,
  '2024-02-01',
  '20:30:00',
  '22:00:00',
  '{"fr": "Salle des Conférences - Sous-sol", "ar": "قاعة المؤتمرات - الطابق السفلي", "en": "Conference Room - Basement", "tz-ltn": "Tallen n Tmeslayin - Adday", "tz-tfng": "ⵜⴰⵍⵍⴻⵏⵜ ⵏ ⵜⵎⵙⵍⴰⵢⵉⵏ - ⴰⴷⴰⵢ"}',
  2,
  'planifie',
  'visite',
  90,
  50,
  'fr',
  true,
  true,
  false,
  true,
  NOW(),
  NOW()
),

-- Jour 2: Atelier de Création
(
  3,
  '{"fr": "Atelier - Peinture Contemporaine", "ar": "ورشة عمل - الرسم المعاصر", "en": "Workshop - Contemporary Painting", "tz-ltn": "Asegmiw - Tazruri Tamaynut", "tz-tfng": "ⴰⵙⴻⴳⵎⵉⵡ - ⵜⴰⵣⵔⵓⵔⵉ ⵜⴰⵎⴰⵢⵏⵓⵜ"}',
  '{"fr": "Atelier pratique animé par des artistes renommés. Découvrez les techniques de la peinture contemporaine algérienne et créez votre propre œuvre.", "ar": "ورشة عملية يقودها فنانون مشهورون. اكتشف تقنيات الرسم الجزائري المعاصر واصنع عملك الفني الخاص.", "en": "Practical workshop led by renowned artists. Discover Algerian contemporary painting techniques and create your own artwork.", "tz-ltn": "Asegmiw amanayen s yimẓẓayen imqqnen. Smel tarrayin n tazruri tamaynut tazzayrit ar tefkeḍ taẓruri-iḵ imi-iḵ.", "tz-tfng": "ⴰⵙⴻⴳⵎⵉⵡ ⴰⵎⴰⵏⴰⵢⴻⵏ ⵙ ⵉⵎⵣⵣⴰⵢⴻⵏ ⵉⵎⵇⵏⴻⵏ. ⵙⵎⴻⵍ ⵜⴰⵟⵔⴰⵢⵉⵏ ⵏ ⵜⴰⵣⵔⵓⵔⵉ ⵜⴰⵎⴰⵢⵏⵓⵜ ⵜⴰⵣⴰⵢⵔⵉⵜ ⴰⵔ ⵜⴻⴼⴽⴻⴷ ⵜⴰⵥⵔⵉ-ⴽⵎ ⵉⵎⵉ-ⴽⵎ."}',
  1,
  1,
  '2024-02-02',
  '10:00:00',
  '13:00:00',
  '{"fr": "Atelier d'Art - Étage 2", "ar": "ورشة فن - الطابق الثاني", "en": "Art Workshop - Floor 2", "tz-ltn": "Asegmiw n Tẓri - Aggar 2", "tz-tfng": "ⴰⵙⴻⴳⵎⵉⵡ ⵏ ⵜⵥⵔⵉ - ⴰⴳⴳⴰⵔ 2"}',
  3,
  'planifie',
  'atelier',
  180,
  30,
  'fr',
  true,
  false,
  false,
  true,
  NOW(),
  NOW()
),

-- Jour 2: Conférence
(
  4,
  '{"fr": "Conférence - L'Art Contemporain et la Société", "ar": "محاضرة - الفن المعاصر والمجتمع", "en": "Conference - Contemporary Art and Society", "tz-ltn": "Tasmunt - Tẓri Tamaynut d Tegdudt", "tz-tfng": "ⵜⴰⵙⵎⵓⵏⵜ - ⵜⵥⵔⵉ ⵜⴰⵎⴰⵢⵏⵓⵜ ⴷ ⵜⴰⴳⴷⵓⴷⵜ"}',
  '{"fr": "Débat sur le rôle de l'art contemporain dans la société algérienne moderne. Interventions de critiques d'art et d'historiens.", "ar": "نقاش حول دور الفن المعاصر في المجتمع الجزائري الحديث. مداخلات من نقاد الفن والمؤرخين.", "en": "Debate on the role of contemporary art in modern Algerian society. Interventions by art critics and historians.", "tz-ltn": "Ameslay ɣef wemal n tẓri tamaynut deg tegdudt tazzayrit tamaynut. Timseddiwin seg imẓẓayen n tẓri d imssiwlen n umezruy.", "tz-tfng": "ⴰⵎⴻⵙⵍⴰⵢ  ⵡⴻⵎⴰⵍ ⵏ ⵜⵥⵔⵉ ⵜⴰⵎⴰⵢⵏⵓⵜ ⴷ ⵜⴰⴳⴷⵓⴷⵜ. ⵜⵉⵎⵙⴻⴷⵉⵡⵉⵏ ⵙⴳ ⵉⵎⵣⵣⴰⵢⴻⵏ ⵏ ⵜⵥⵔⵉ ⴷ ⵉⵎⵙⵙⵉⵡⵍⴻⵏ ⵏ ⵓⵎⴻⵣⵔⵓⵢ."}',
  1,
  1,
  '2024-02-02',
  '15:00:00',
  '17:00:00',
  '{"fr": "Auditorium Principal - Rez-de-chaussée", "ar": "قاعة المحاضرات الرئيسية - الطابق الأرضي", "en": "Main Auditorium - Ground Floor", "tz-ltn": "Tallen Ameqran n Tmeslayin - Akal n Wadda", "tz-tfng": "ⵜⴰⵍⵍⴻⵏⵜ ⴰⵎⴻⵇⵔⴰⵏ ⵏ ⵜⵎⵙⵍⴰⵢⵉⵏ - ⴰⴽⴰⵍ ⵏ ⵡⴰⴷⴰ"}',
  4,
  'planifie',
  'conference',
  120,
  150,
  'fr',
  true,
  true,
  true,
  true,
  NOW(),
  NOW()
),

-- Jour 3: Performance Artistique
(
  5,
  '{"fr": "Performance - Art Vivant Algérien", "ar": "عرض فني - الفن الحي الجزائري", "en": "Performance - Living Algerian Art", "tz-ltn": "Tameddazt - Tẓri Udawen Tazzayrit", "tz-tfng": "ⵜⴰⵎⴻⴷⴰⵣⵜ - ⵜⵥⵔⵉ ⵓⴷⴰⵡⴻⵏ ⵜⴰⵣⴰⵢⵔⵉⵜ"}',
  '{"fr": "Performances artistiques en direct mêlant danse, musique et arts visuels. Créations éphémères par des artistes contemporains.", "ar": "عروض فنية مباشرة تجمع بين الرقص والموسيقى والفنون البصرية. إبداعات مؤقتة من قبل فنانين معاصرين.", "en": "Live artistic performances mixing dance, music and visual arts. Ephemeral creations by contemporary artists.", "tz-ltn": "Timedduzin tiẓraniyin s wudem amezwaru s tmeslay n tzerda, tazmmt d tẓri udawen. Tifaskiwin timekwanin s yimẓẓayen timaynutin.", "tz-tfng": "ⵜⵉⵎⴻⴷⴰⵣⵉⵏ ⵜⵉⵥⵔⴰⵏⵉⵢⵉⵏ ⵙ ⵡⵓⴷⴻⵎ ⴰⵎⴻⵣⵡⴰⵔⵓ ⵙ ⵜⵎⵙⵍⴰⵢ ⵏ ⵜⵥⵔⴰⴷ, ⵜⴰⵣⵎⵎⵜ ⴷ ⵜⵥⵔⵉ ⵓⴷⴰⵡⴻⵏ. ⵜⵉⴼⴰⵙⴽⵉⵡⵉⵏ ⵜⵉⵎⴻⴽⵡⴰⵏⵉⵏ ⵙ ⵉⵎⵣⵣⴰⵢⴻⵏ ⵜⵉⵎⴰⵢⵏⵓⵜⵉⵏ."}',
  1,
  1,
  '2024-02-03',
  '18:00:00',
  '20:30:00',
  '{"fr": "Espace Extérieur - Jardin du Musée", "ar": "الفضاء الخارجي - حديقة المتحف", "en": "Outdoor Space - Museum Garden", "tz-ltn": "Akal n Beṛṛa - Bustin n Umudem", "tz-tfng": "ⴰⴽⴰⵍ ⵏ ⴱⴻⵕⵕⴰ - ⴱⵓⵙⵜⴰⵏ ⵏ ⵓⵎⵓⴷⴻⵎ"}',
  5,
  'planifie',
  'spectacle',
  150,
  300,
  'fr',
  true,
  false,
  true,
  false,
  NOW(),
  NOW()
),

-- Jour 3: Clôture
(
  6,
  '{"fr": "Clôture - Remise des Prix et Cocktail", "ar": "الختام - تسليم الجوائز وكوكتيل", "en": "Closing - Awards Ceremony and Cocktail", "tz-ltn": "Tagara - Tefra n Tifrat d Imensi", "tz-tfng": "ⵜⴰⴳⴰⵔⴰ - ⵜⴻⴼⵔⴰ ⵏ ⵜⵉⴼⵔⴰⵜ ⴷ ⵉⵎⴻⵏⵙⵉ"}',
  '{"fr": "Cérémonie de clôture avec remise des prix aux artistes participants. Cocktail final et networking.", "ar": "حفل الختام مع تسليم الجوائز للفنانين المشاركين. كوكتيل نهائي وتواصل.", "en": "Closing ceremony with awards for participating artists. Final cocktail and networking.", "tz-ltn": "Tazdegt n tagara s tefra n tifrat i yimẓẓayen yettekkan. Imensi taneggarut d umeslay n wemac.", "tz-tfng": "ⵜⴰⵣⴷⴰⴳⵜ ⵏ ⵜⴰⴳⴰⵔⴰ ⵙ ⵜⴻⴼⵔⴰ ⵏ ⵜⵉⴼⵔⴰⵜ ⵉ ⵉⵎⵣⵣⴰⵢⴻⵏ ⵉⵜⵜⴰⴽⴰⵏ. ⵉⵎⴻⵏⵙⵉ ⵜⴰⵏⴰⴳⴳⴰⵔⴰⵜ ⴷ ⴰⵎⴻⵙⵍⴰⵢ ⵏ ⵡⴻⵎⴰⵛ."}',
  1,
  1,
  '2024-02-03',
  '21:00:00',
  '23:00:00',
  '{"fr": "Terrasse Panoramique - Dernier Étage", "ar": "شرفة بانورامية - الطابق الأخير", "en": "Panoramic Terrace - Top Floor", "tz-ltn": "Taddart Tameqrant - Aggar Aneggaru", "tz-tfng": "ⵜⴰⴷⴷⴰⵔⵜ ⵜⴰⵎⴻⵇⵔⴰⵏⵜ - ⴰⴳⴳⴰⵔ ⴰⵏⴻⴳⴳⴰⵔⵓ"}',
  6,
  'planifie',
  'ceremonie',
  120,
  100,
  'fr',
  true,
  false,
  false,
  true,
  NOW(),
  NOW()
);

-- ========================================================================
-- INTERVENANTS (ARTISTES ET CONFÉRENCIERS)
-- ========================================================================

-- Associer les intervenants aux programmes
INSERT INTO programme_intervenant (id_programme, id_user, role, statut, created_at, updated_at) VALUES
-- Programme 1: Vernissage
(1, 2, 'Artiste Principal', 'confirme', NOW(), NOW()),
(1, 3, 'Conservateur du Musée', 'confirme', NOW(), NOW()),

-- Programme 2: Visite Guidée
(2, 4, 'Artiste Conférencier', 'confirme', NOW(), NOW()),
(2, 2, 'Guide Expert', 'confirme', NOW(), NOW()),

-- Programme 3: Atelier
(3, 5, 'Artiste Animateur', 'confirme', NOW(), NOW()),
(3, 2, 'Superviseur', 'confirme', NOW(), NOW()),

-- Programme 4: Conférence
(4, 3, 'Critique d''Art', 'confirme', NOW(), NOW()),
(4, 4, 'Historien de l''Art', 'confirme', NOW(), NOW()),

-- Programme 5: Performance
(5, 5, 'Artiste Performeur', 'confirme', NOW(), NOW()),
(5, 2, 'Metteur en Scène', 'confirme', NOW(), NOW()),

-- Programme 6: Clôture
(6, 3, 'Président du Jury', 'confirme', NOW(), NOW()),
(6, 4, 'Maître de Cérémonie', 'confirme', NOW(), NOW());

-- ========================================================================
-- PARTICIPANTS (INSCRIPTIONS)
-- ========================================================================

-- Simuler des inscriptions pour chaque programme
INSERT INTO evenement_user (id_evenement, id_user, date_inscription, statut, created_at, updated_at) VALUES
-- Participants au vernissage
(1, 1, '2024-01-15 10:00:00', 'inscrit', NOW(), NOW()),
(1, 6, '2024-01-16 14:30:00', 'inscrit', NOW(), NOW()),
(1, 7, '2024-01-17 09:15:00', 'inscrit', NOW(), NOW()),

-- Participants à l'atelier
(1, 8, '2024-01-18 11:00:00', 'inscrit', NOW(), NOW()),
(1, 9, '2024-01-19 16:45:00', 'inscrit', NOW(), NOW()),

-- Participants à la conférence
(1, 10, '2024-01-20 13:30:00', 'inscrit', NOW(), NOW());

-- ========================================================================
-- MÉDIAS DE L'ÉVÉNEMENT
-- ========================================================================

INSERT INTO medias (id_media, url, type_media, titre, thumbnail_url, ordre, created_at, updated_at) VALUES
(100, '/images/exposition-affiche.jpg', 'image/jpeg', 'Affiche Exposition Art Contemporain', '/images/exposition-affiche-thumb.jpg', 1, NOW(), NOW()),
(101, '/images/vernissage-1.jpg', 'image/jpeg', 'Vernissage - Arrivée des invités', '/images/vernissage-1-thumb.jpg', 2, NOW(), NOW()),
(102, '/images/atelier-peinture.jpg', 'image/jpeg', 'Atelier de Peinture', '/images/atelier-peinture-thumb.jpg', 3, NOW(), NOW()),
(103, '/images/conference-debat.jpg', 'image/jpeg', 'Conférence-Débat', '/images/conference-debat-thumb.jpg', 4, NOW(), NOW()),
(104, '/images/performance-vivante.jpg', 'image/jpeg', 'Performance Artistique', '/images/performance-vivante-thumb.jpg', 5, NOW(), NOW()),
(105, '/images/cocktail-cloture.jpg', 'image/jpeg', 'Cocktail de Clôture', '/images/cocktail-cloture-thumb.jpg', 6, NOW(), NOW());

-- Associer les médias à l'événement
INSERT INTO evenement_media (id_evenement, id_media, created_at, updated_at) VALUES
(1, 100, NOW(), NOW()),
(1, 101, NOW(), NOW()),
(1, 102, NOW(), NOW()),
(1, 103, NOW(), NOW()),
(1, 104, NOW(), NOW()),
(1, 105, NOW(), NOW());

-- ========================================================================
-- STATISTIQUES
-- ========================================================================

-- Mettre à jour les statistiques
UPDATE evenement SET 
  nombre_inscrits = (SELECT COUNT(*) FROM evenement_user WHERE id_evenement = 1),
  nombre_vues = 1250,
  nombre_partages = 85,
  updated_at = NOW()
WHERE id_evenement = 1;

-- ========================================================================
-- RÉSUMÉ
-- ========================================================================

SELECT '=== EXPOSITION ART CONTEMPORAIN ALGÉRIEN - DONNÉES CRÉÉES ===' as message;
SELECT 
  'Événement: Exposition Art Contemporain Algérien' as info,
  'Dates: 1-15 Février 2024' as periode,
  'Lieu: Musée National des Beaux-Arts d''Alger' as lieu,
  'Programmes: 6 activités sur 3 jours' as programmes,
  'Intervenants: Artistes et experts confirmés' as intervenants,
  'Participants: Inscriptions en cours' as participants;
