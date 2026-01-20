-- Seeds pour les utilisateurs de l'exposition
-- Fichier: users-exposition.sql  
-- Date: 2024-01-20

-- ========================================================================
-- UTILISATEURS ADDITIONNELS POUR L'EXPOSITION
-- ========================================================================

-- Artistes participants
INSERT INTO users (id_user, nom, prenom, email, telephone, photo_url, role, wilaya_id, biographie, created_at, updated_at) VALUES
-- Artistes principaux
(6, 'Bachir', 'Hachemi', 'bachir.hachemi@email.com', '+213551234567', '/images/bachir-hachemi.jpg', 'professionnel', 16, 'Artiste peintre algérien renommé, spécialisé dans l''art abstrait contemporain. Exposé dans les plus grandes galeries d''Alger et de Paris.', NOW(), NOW()),
(7, 'Fatma', 'Zohra', 'fatma.zohra@email.com', '+213552345678', '/images/fatma-zohra.jpg', 'professionnel', 16, 'Artiste multidisciplinaire, mêlant peinture, sculpture et installations. Son travail explore les thèmes de l''identité et de la mémoire collective.', NOW(), NOW()),
(8, 'Mohamed', 'Cherif', 'mohamed.cherif@email.com', '+213553456789', '/images/mohamed-cherif.jpg', 'professionnel', 16, 'Artiste performeur et vidéaste. Créateur de performances immersives questionnant la société algérienne contemporaine.', NOW(), NOW()),
(9, 'Leila', 'Mansouri', 'leila.mansouri@email.com', '+213554567890', '/images/leila-mansouri.jpg', 'professionnel', 16, 'Artiste photographe et conservatrice de musée. Spécialiste de l''art contemporain algérien et commissaire d''expositions.', NOW(), NOW()),
(10, 'Yacine', 'Boudiaf', 'yacine.boudiaf@email.com', '+213555678901', '/images/yacine-boudiaf.jpg', 'professionnel', 16, 'Historien de l''art et critique. Auteur de plusieurs ouvrages sur l''évolution de l''art algérien depuis l''indépendance.', NOW(), NOW()),

-- Participants et visiteurs
(11, 'Ahmed', 'Benmohamed', 'ahmed.benmohamed@email.com', '+213556789012', '/images/ahmed-benmohamed.jpg', 'utilisateur', 16, 'Passionné d''art et collectionneur émergent. Intéressé par la découverte de nouveaux talents artistiques algériens.', NOW(), NOW()),
(12, 'Sofia', 'Rabehi', 'sofia.rabehi@email.com', '+213557890123', '/images/sofia-rabehi.jpg', 'utilisateur', 16, 'Étudiante en histoire de l''art à l''Université d''Alger. Participe à de nombreux événements culturels.', NOW(), NOW()),
(13, 'Rachid', 'Kaci', 'rachid.kaci@email.com', '+213558901234', '/images/rachid-kaci.jpg', 'utilisateur', 16, 'Photographe amateur et amateur d''art. Documente les événements culturels algérois.', NOW(), NOW()),
(14, 'Nadia', 'Belkacem', 'nadia.belkacem@email.com', '+213559012345', '/images/nadia-belkacem.jpg', 'utilisateur', 16, 'Professeure d''arts plastiques. Organise des visites pédagogiques pour ses élèves.', NOW(), NOW()),
(15, 'Omar', 'Taleb', 'omar.taleb@email.com', '+213560123456', '/images/omar-taleb.jpg', 'utilisateur', 16, 'Architecte et designer. Intéressé par l''intersection entre art et architecture.', NOW(), NOW());

-- ========================================================================
-- ŒUVRES DES ARTISTES (pour exposer dans le catalogue)
-- ========================================================================

INSERT INTO oeuvres (id_oeuvre, titre, description, id_type_oeuvre, id_langue, annee_creation, prix, saisi_par, statut, date_creation, date_modification) VALUES
-- Œuvres de Bachir Hachemi
(10, '{"fr": "Mémoires d''Alger", "ar": "ذكريات الجزائر", "en": "Memories of Algiers", "tz-ltn": "Tiddukla n Dzayer", "tz-tfng": "ⵜⵉⴷⴷⵓⴽⵍⴰ ⵏ ⴷⵣⴰⵢⴻⵔ"}', '{"fr": "Triptyque abstrait explorant les souvenirs architecturaux de la Casbah d''Alger à travers des formes et couleurs évocatrices.", "ar": "لوحة تجريدية ثلاثية الأجزاء تستكشف الذكريات المعمارية لقصبة الجزائر من خلال أشكال وألوان موحية.", "en": "Abstract triptych exploring the architectural memories of Algiers Casbah through evocative forms and colors.", "tz-ltn": "Tazruri abstrak n kraḍ n yiberdan tsmel tiddukla n tɣawsiwin n Dzayer s yiwet n wudem n tferkiwin d yiniten n tussda.", "tz-tfng": "ⵜⴰⵣⵔⵓⵔⵉ ⴰⴱⵙⵟⵔⴰⴽ ⵏ ⴽⵕⴰⴷ ⵏ ⵉⴱⴻⵔⴰⵏ ⵜⵙⵎⴻⵍ ⵜⵉⴷⴷⵓⴽⵍⴰ ⵏ ⵜⵖⴰⵡⴰⵙⵉⵡⵉⵏ ⵏ ⴷⵣⴰⵢⴻⵔ ⵙ ⵉⵡⴻⵜ ⵏ ⵡⵓⴷⴻⵎ ⵏ ⵜⴼⴻⵔⴽⵉⵡⵉⵏ ⴷ ⵉⵏⵉⵜⴻⵏ ⵏ ⵜⵓⵙⴷⴰ."}', 4, 1, 2024, 15000, 6, 'publie', NOW(), NOW()),

(11, '{"fr": "Horizons Bleus", "ar": "آفاق زرقاء", "en": "Blue Horizons", "tz-ltn": "Tifawin Izerghan", "tz-tfng": "ⵜⵉⴼⴰⵡⵉⵏ ⵉⵣⴻⵔⵖⴰⵏ"}', '{"fr": "Série de toiles explorant la relation entre le ciel méditerranéen et l''âme algérienne à travers des nuances de bleu profond.", "ar": "سلسلة من اللوحات تستكشف العلاقة بين البحر المتوسط والروح الجزائرية من خلال درجات الأزرق العميق.", "en": "Series of canvases exploring the relationship between the Mediterranean sea and the Algerian soul through deep blue nuances.", "tz-ltn": "Tazrawin n tizdinin tsmel amesday n yilil amditran d wul n tazzayrit s yiwet n wudem n tifin n uzerɣar ameqran.", "tz-tfng": "ⵜⴰⵣⵔⴰⵡⵉⵏ ⵏ ⵜⵉⵥⴷⵉⵏⵉⵏ ⵜⵙⵎⴻⵍ ⴰⵎⴻⵙⴰⵢ ⵏ ⵉⵍⵉⵍ ⴰⵎⴷⵉⵜⵔⴰⵏ ⴷ ⵓⵍ ⵏ ⵜⴰⵣⴰⵢⵔⵉⵜ ⵙ ⵉⵡⴻⵜ ⵏ ⵡⵓⴷⴻⵎ ⵏ ⵜⵉⴼⵉⵏ ⵏ ⵓⵣⴻⵔⵖⴰⵔ ⴰⵎⴻⵇⵔⴰⵏ."}', 4, 1, 2024, 12000, 6, 'publie', NOW(), NOW()),

-- Œuvres de Fatma Zohra
(12, '{"fr": "Racines et Ailes", "ar": "الجذور والأجنحة", "en": "Roots and Wings", "tz-ltn": "Iẓẓar d Tafat", "tz-tfng": "ⵉⵥⵥⴰⵔ ⴷ ⵜⴰⴼⴰⵜ"}', '{"fr": "Installation mixte combinant sculpture végétale et projections lumineuses, symbolisant l''enracinement et l''aspiration à la liberté.", "ar": "تركيب مختلط يجمع بين النحت النباتي والإسقاطات الضوئية، يرمز إلى التجذر والطموح للحرية.", "en": "Mixed installation combining plant sculpture and light projections, symbolizing rootedness and aspiration for freedom.", "tz-ltn": "Takatut tameslayant tmezdiyen gar-as tazruri n yimẓẓan d tiflut n tafat, tsemmal ad iẓẓer d tafat n tillelt.", "tz-tfng": "ⵜⴰⴽⴰⵜⵓⵜ ⵜⴰⵎⴻⵙⵍⴰⵢⴰⵏⵜ ⵜⵎⴻⵣⴷⵉⵢⴰⵏ ⴳⴰⵔ-ⴰⵙ ⵜⴰⵥⵔⵓⵔⵉ ⵏ ⵉⵎⵣⵣⴰⵏ ⴷ ⵜⵉⴼⵍⵓⵜ ⵏ ⵜⴰⴼⴰⵜ, ⵜⵙⵎⵎⴰⵍ ⴰⴷ ⵉⵥⵥⴰⵔ ⴷ ⵜⴰⴼⴰⵜ ⵏ ⵜⵉⵍⵍⵜ."}', 4, 1, 2024, 18000, 7, 'publie', NOW(), NOW()),

(13, '{"fr": "Échos Feminins", "ar": "أصداء نسائية", "en": "Feminine Echoes", "tz-ltn": "Tidukliwin Tawacalt", "tz-tfng": "ⵜⵉⴷⵓⴽⵍⵉⵡⵉⵏ ⵜⴰⵡⴰⵛⴰⵍⵜ"}', '{"fr": "Série photographique explorant la condition féminine algérienne à travers des portraits intimes et poétiques.", "ar": "سلسلة تصويرية تستكشف حالة المرأة الجزائرية من خلال صور شخصية وشعرية.", "en": "Photographic series exploring the Algerian feminine condition through intimate and poetic portraits.", "tz-ltn": "Tazrawin n tfult tsmel addad n tawacalt tazzayrit s yiwet n wudem n tiferkiwin tullisin d tiferkiyin tiḍḍanin.", "tz-tfng": "ⵜⴰⵣⵔⴰⵡⵉⵏ ⵏ ⵜⵉⴼⵍⵓⵜ ⵜⵙⵎⴻⵍ ⴰⴷⴰⴷ ⵏ ⵜⴰⵡⴰⵛⴰⵍⵜ ⵜⴰⵣⴰⵢⵔⵉⵜ ⵙ ⵉⵡⴻⵜ ⵏ ⵡⵓⴷⴻⵎ ⵏ ⵜⵉⴼⴻⵔⴽⵉⵡⵉⵏ ⵜⵉⵍⵍⵉⵙⵉⵏ ⴷ ⵜⵉⴼⴻⵔⴽⵉⵡⵉⵏ ⵜⵉⴹⵍⴰⵏⵉⵏ."}', 4, 1, 2024, 8500, 7, 'publie', NOW(), NOW()),

-- Œuvres de Mohamed Cherif
(14, '{"fr": "Transition Urbaine", "ar": "التحول الحضري", "en": "Urban Transition", "tz-ltn": "Asirem n Tdalt", "tz-tfng": "ⴰⵙⵉⵔⴻⵎ ⵏ ⵜⴷⴰⵍⵜ"}', '{"fr": "Vidéo installation montrant l''évolution urbaine d''Alger entre tradition et modernité, avec sons ambiants de la ville.", "ar": "تركيب فيديو يظهر التطور الحضري للجزائر بين التقاليد والحداثة، مع أصوات محيطة للمدينة.", "en": "Video installation showing the urban evolution of Algiers between tradition and modernity, with ambient city sounds.", "tz-ltn": "Takatut n tvidyu tsekhdam asnirem n tdalt n Dzayer gar-as ttradisyon d tamaynut, s yiwet n wudem n imesliwen n tmdint.", "tz-tfng": "ⵜⴰⴽⴰⵜⵓⵜ ⵏ ⵜⵉⴷⵉⵢⵓ ⵜⵙⴻⵅⴷⴰⵎ ⴰⵙⵏⵉⵔⴻⵎ ⵏ ⵜⴷⴰⵍⵜ ⵏ ⴷⵣⴰⵢⴻⵔ ⴳⴰⵔ-ⴰⵙ ⵜⵔⴰⴷⵉⵙⵢⵓⵏ ⴷ ⵜⴰⵎⴰⵢⵏⵓⵜ, ⵙ ⵉⵡⴻⵜ ⵏ ⵡⵓⴷⴻⵎ ⵏ ⵉⵎⵙⵍⵉⵡⴻⵏ ⵏ ⵜⵎⴷⵉⵏⵜ."}', 4, 1, 2024, 20000, 8, 'publie', NOW(), NOW()),

(15, '{"fr": "Dialogues Silencieux", "ar": "حوارات صامتة", "en": "Silent Dialogues", "tz-ltn": "Tidamsan n Tussda", "tz-tfng": "ⵜⵉⴷⴰⵎⵙⴰⵏ ⵏ ⵜⵓⵙⴷⴰ"}', '{"fr": "Performance documentée où l''artiste communique avec le public uniquement par le geste et l''expression faciale.", "ar": "أداء موثق حيث يتواصل الفنان مع الجمهور فقط من خلال الإيماءة والتعبير الوجهي.", "en": "Documented performance where the artist communicates with the public only through gesture and facial expression.", "tz-ltn": "Tameddazt tettwaseklen anedda yemsemlal amẓẓay s yimdanen s yiwet n wudem n tsemhelt d tferka n wudem.", "tz-tfng": "ⵜⴰⵎⴻⴷⴰⵣⵜ ⵜⴻⵜⵟⴰⵙⴰⵏ ⴰⵏⴷⴰ ⵉⵎⵣⵣⴰⵢ ⵉⵎⵙⴻⵎⵍⴰⵍ ⵙ ⵉⵎⴰⵏⴰⵏⴻⵏ ⵙ ⵉⵡⴻⵜ ⵏ ⵡⵓⴷⴻⵎ ⵏ ⵜⴰⵙⴻⵎⵃⴻⵜ ⴷ ⵜⴰⴼⴻⵔⴽⴰ ⵏ ⵡⵓⴷⴰⵎ."}', 4, 1, 2024, 15000, 8, 'publie', NOW(), NOW());

-- ========================================================================
-- MÉDIAS DES ŒUVRES
-- ========================================================================

INSERT INTO medias (id_media, url, type_media, titre, thumbnail_url, ordre, created_at, updated_at) VALUES
-- Médias pour Mémoires d'Alger
(110, '/images/oeuvres/memoires-alger-1.jpg', 'image/jpeg', 'Mémoires d''Alger - Vue 1', '/images/oeuvres/memoires-alger-1-thumb.jpg', 1, NOW(), NOW()),
(111, '/images/oeuvres/memoires-alger-2.jpg', 'image/jpeg', 'Mémoires d''Alger - Vue 2', '/images/oeuvres/memoires-alger-2-thumb.jpg', 2, NOW(), NOW()),
(112, '/images/oeuvres/memoires-alger-3.jpg', 'image/jpeg', 'Mémoires d''Alger - Détail', '/images/oeuvres/memoires-alger-3-thumb.jpg', 3, NOW(), NOW()),

-- Médias pour Racines et Ailes
(113, '/images/oeuvres/racines-ailes-1.jpg', 'image/jpeg', 'Racines et Ailes - Installation', '/images/oeuvres/racines-ailes-1-thumb.jpg', 1, NOW(), NOW()),
(114, '/images/oeuvres/racines-ailes-video.mp4', 'video/mp4', 'Racines et Ailes - Performance', '/images/oeuvres/racines-ailes-video-thumb.jpg', 2, NOW(), NOW()),

-- Médias pour Transition Urbaine
(115, '/images/oeuvres/transition-urbaine-1.jpg', 'image/jpeg', 'Transition Urbaine - Capture 1', '/images/oeuvres/transition-urbaine-1-thumb.jpg', 1, NOW(), NOW()),
(116, '/images/oeuvres/transition-urbaine-2.jpg', 'image/jpeg', 'Transition Urbaine - Capture 2', '/images/oeuvres/transition-urbaine-2-thumb.jpg', 2, NOW(), NOW());

-- Associer les médias aux œuvres
INSERT INTO oeuvre_media (id_oeuvre, id_media, created_at, updated_at) VALUES
(10, 110, NOW(), NOW()),
(10, 111, NOW(), NOW()),
(10, 112, NOW(), NOW()),
(12, 113, NOW(), NOW()),
(12, 114, NOW(), NOW()),
(14, 115, NOW(), NOW()),
(14, 116, NOW(), NOW());

-- ========================================================================
-- RÉSUMÉ
-- ========================================================================

SELECT '=== UTILISATEURS ET ŒUVRES POUR L''EXPOSITION CRÉÉS ===' as message;
SELECT 
  'Artistes: 5 artistes professionnels' as artistes,
  'Œuvres: 6 œuvres originales' as oeuvres,
  'Médias: 7 médias associés' as medias,
  'Participants: 5 utilisateurs inscrits' as participants,
  'Total utilisateurs: 15 utilisateurs actifs' as total_users;
