-- Seeds pour les données de test Artisanat
-- Fichier: artisanat-seeds.sql
-- Date: 2024-01-20

-- Insérer les matériaux
INSERT INTO materiaux (id_materiau, nom, description, created_at, updated_at) VALUES
(1, 'Céramique', 'Argile locale de haute qualité, cuite à haute température pour une durabilité exceptionnelle.', NOW(), NOW()),
(2, 'Argent', 'Argent massif de haute qualité, utilisé pour les bijoux traditionnels berbères.', NOW(), NOW()),
(3, 'Tissu', 'Tissus traditionnel avec motifs berbères, coton et laine de qualité.', NOW(), NOW()),
(4, 'Bois', 'Bois local traité avec des techniques traditionnelles de finition.', NOW(), NOW()),
(5, 'Pierre', 'Pierres précieuses et semi-précieuses utilisées dans la bijouterie.', NOW(), NOW());

-- Insérer les techniques
INSERT INTO techniques (id_technique, nom, description, created_at, updated_at) VALUES
(1, 'Tournage', 'Technique traditionnelle de tournage sur tour de potier.', NOW(), NOW()),
(2, 'Forge', 'Technique de forge traditionnelle pour le travail des métaux.', NOW(), NOW()),
(3, 'Tissage', 'Tissage manuel sur métier à tisser traditionnel.', NOW(), NOW()),
(4, 'Sculpture', 'Sculpture sur bois et autres matériaux.', NOW(), NOW()),
(5, 'Peinture', 'Peinture décorative sur céramique et tissu.', NOW(), NOW());

-- Insérer les types d'œuvres
INSERT INTO types_oeuvres (id_type_oeuvre, nom_type, description, created_at, updated_at) VALUES
(1, 'Artisanat', 'Produits artisanaux traditionnels berbères.', NOW(), NOW()),
(2, 'Bijou', 'Bijoux traditionnels et modernes.', NOW(), NOW()),
(3, 'Textile', 'Produits textiles traditionnels.', NOW(), NOW()),
(4, 'Art', 'Œuvres d''art contemporain.', NOW(), NOW()),
(5, 'Décoration', 'Objets de décoration pour la maison.', NOW(), NOW());

-- Insérer les wilayas
INSERT INTO wilayas (code, nom, created_at, updated_at) VALUES
('1', 'Adrar', NOW(), NOW()),
('2', 'Chlef', NOW(), NOW()),
('3', 'Laghouat', NOW(), NOW()),
('4', 'Oum El Bouaghi', NOW(), NOW()),
('5', 'Batna', NOW(), NOW()),
('6', 'Béjaïa', NOW(), NOW()),
('7', 'Biskra', NOW(), NOW()),
('8', 'Béchar', NOW(), NOW()),
('9, 'Blida', NOW(), NOW()),
('10', 'Bouira', NOW(), NOW()),
('11', 'Boumerdès', NOW(), NOW()),
('12', 'Djelfa', NOW(), NOW()),
('13', 'El Bayadh', NOW(), NOW()),
('14', 'El Tarf', NOW(), NOW()),
('15', 'Tizi Ouzou', NOW(), NOW()),
('16', 'Tissemsilt', NOW(), NOW()),
('17', 'Tamanrasset', NOW(), NOW()),
('18', 'Ouargla', NOW(), NOW()),
('19', 'Khenchela', NOW(), NOW()),
('20', 'Souk Ahras', NOW(), NOW()),
('21', 'Tipaza', NOW(), NOW()),
('22', 'Mila', NOW(), NOW()),
('23, 'Aïn Defla', NOW(), NOW()),
('24', 'Bordj Bou Arreridj', NOW(), NOW()),
('25', 'Boumerdès', NOW(), NOW()),
('26', 'Relizane', NOW(), NOW()),
('27', 'Sidi Bel Abbès', NOW(), NOW()),
('28', 'Skikda', NOW(), NOW()),
('29', 'Sidi M''hamed', NOW(), NOW()),
('30', 'Annaba', NOW(), NOW()),
('31', 'Guelma', NOW(), NOW()),
('32', 'Constantine', NOW(), NOW()),
('33', 'Médéa', NOW(), NOW()),
('34', 'Mostaganem', NOW(), NOW()),
('35', 'M''sila', NOW(), NOW()),
('36', 'Bordj Bou Arreridj', NOW(), NOW()),
('37', 'El Tarf', NOW(), NOW()),
('38', 'Jijel', NOW(), NOW()),
('39', 'Sétif', NOW(), NOW()),
('40', 'Saïda', NOW(), NOW()),
('41', 'Skikda', NOW(), NOW()),
('42', 'Jijel', NOW(), NOW()),
('43', 'Béjaïa', NOW(), NOW()),
('44', 'Biskra', NOW(), NOW()),
('45', 'Béchar', NOW(), NOW()),
('46', 'Blida', NOW(), NOW()),
('47', 'Bouira', NOW(), NOW()),
('48', 'Boumerdès', NOW(), NOW()),
('49', 'Tizi Ouzou', NOW(), NOW()),
('50', 'Alger', NOW(), NOW()),
('51', 'Djelfa', NOW(), NOW()),
('52', 'Jijel', NOW(), NOW()),
('53', 'Sétif', NOW(), NOW()),
('54', 'Mila', NOW(), NOW()),
('55', 'Aïn Defla', NOW(), NOW()),
('56', 'Tipaza', NOW(), NOW()),
('57, 'Médéa', NOW(), NOW()),
('58', 'Mostaganem', NOW(), NOW()),
('59', 'M''sila', NOW(), NOW()),
('60, 'Tizi Ouzou', NOW(), NOW());

-- Insérer les utilisateurs (artisans)
INSERT INTO users (id_user, nom, prenom, email, telephone, photo_url, role, wilaya_id, biographie, created_at, updated_at) VALUES
(2, 'Benali', 'Karim', 'karim.benali@email.com', '+213123456789', '/images/karim-benali.jpg', 'professionnel', 15, 'Artisan professionnel depuis 15 ans, spécialisé dans l''art berbère traditionnel. Formé à Tizi-Ouzou, je perpétue les techniques ancestrales de mes ancêtres tout en y apportant ma touche personnelle. Mes œuvres sont exposées dans plusieurs galeries en Algérie et à l''étranger.', NOW(), NOW()),
(3, 'Dupont', 'Marie', 'marie.dupont@email.com', '+213234567890', '/images/marie-dupont.jpg', 'professionnel', 16, 'Artiste professionnelle spécialisée dans les textiles berbères. Créatrice de pièces uniques qui allient tradition et modernité.', NOW(), NOW()),
(4, 'Martin', 'Paul', 'paul.martin@email.com', '+213345678901', '/images/paul-martin.jpg', 'professionnel', 11, 'Artisan professionnel spécialisé dans les bijoux en argent. Maîtrise des techniques traditionnelles berbères.', NOW(), NOW()),
(5, 'Fatima', 'Leila', 'leila.fatima@email.com', '+213456789012', '/images/leila-fatima.jpg', 'professionnel', 15, 'Artisane professionnelle spécialisée dans le tissage et la broderie berbère. Perfectionniste des motifs traditionnels.', NOW(), NOW());

-- Insérer les œuvres
INSERT INTO oeuvres (id_oeuvre, titre, description, annee_creation, statut, date_creation, id_saiseur, id_type_oeuvre, created_at, updated_at) VALUES
(2, '{"fr": "Vase Berbère Traditionnel", "ar": "أمازيغي تقليدي", "en": "Traditional Berber Vase"}', '{"fr": "Magnifique vase en céramique artisanale décoré avec des motifs berbères traditionnels. Pièce unique réalisée à la main par Karim Benali, artisan professionnel spécialisé dans l''art berbère.", "ar": "إزهار خزفي يدوي مزين بزخارف أمازيغية تقليدية. قطعة فريدة من صنع كريم بن علي، حرفي محترف متخصص في الفن الأمازيغي.", "en": "Magnificent handmade ceramic vase decorated with traditional Berber patterns. Unique piece created by Karim Benali, professional artisan specializing in Berber art."}', 2024, 'disponible', '2024-01-15T10:00:00Z', 2, 1, NOW(), NOW()),
(3, '{"fr": "Plat Berbère Céramique", "ar": "صحن أمازيغي خزفي", "en": "Berber Ceramic Plate"}', '{"fr": "Plat en céramique artisanale avec motifs berbères traditionnels, parfait pour servir ou décorer.", "ar": "صحن خزفي يدوي مزين بزخارف أمازيغية تقليدية، مثالي للخدمة أو الزينة.", "en": "Handmade ceramic plate with traditional Berber patterns, perfect for serving or decoration."}', 2023, 'disponible', '2024-01-05T09:00:00Z', 2, 1, NOW(), NOW()),
(4, '{"fr": "Bijou Berbère en Argent", "ar": "حلي أمازيغي بالفضة", "en": "Berber Silver Jewelry"}', '{"fr": "Bague traditionnelle berbère en argent massif, décorée de symboles ancestraux et pierres précieuses.", "ar": "حلي أمازيغي تقليدي بالفضة الخالص مزينة برموز قديمة وأحجار كريمة.", "en": "Traditional Berber silver bracelet with ancient symbols and precious stones."}', 2024, 'disponible', '2024-01-12T14:00:00Z', 3, 2, NOW(), NOW()),
(5, '{"fr": "Poterie Artisanale", "ar": "فخار صناعي", "en": "Artisan Pottery"}', '{"fr": "Poterie en terre cuite réalisée selon les techniques traditionnelles berbères, avec motifs décoratifs uniques.", "ar": "فخار من الطين الطيني مصنوع حسب التقنيدات الأمازيغية التقليدية بزخارف فريدة.", "en": "Pottery made of fired clay following traditional Berber techniques with unique decorative patterns."}', 2023, 'disponible', '2024-01-08T14:00:00Z', 2, 1, NOW(), NOW()),
(6, '{"fr": "Coussin Berbère", "ar": "وسادة أمازيغية", "en": "Berber Cushion"}', '{"fr": "Coussin en tissu traditionnel avec broderie berbère, ajoutant une touche d''authenticité à votre décoration.", "ar": "وسادة من القماش التقليدي مع حواشي أمازيغي، تضيف لمسة من الأصالة إلى زينتك.", "en": "Cushion in traditional fabric with Berber embroidery, adding authenticity to your decoration."}', 2024, 'disponible', '2024-01-08T14:00:00Z', 5, 3, NOW(), NOW());

-- Insérer les artisanats
INSERT INTO artisanats (id_artisanat, nom, description, id_materiau, id_technique, artisan_id, wilaya_id, prix_min, prix_max, delai_fabrication, sur_commande, en_stock, statut, created_at, updated_at) VALUES
(2, 'Vase Berbère Traditionnel', 'Magnifique vase en céramique artisanale décoré avec des motifs berbères traditionnels.', 1, 1, 2, 15, 7000, 8000, 7, true, 2, 'disponible', '2024-01-15T10:00:00Z', '2024-01-20T15:30:00Z'),
(3, 'Plat Berbère Céramique', 'Plat en céramique artisanale avec motifs berbères traditionnels.', 1, 1, 2, 15, 2500, 3000, 5, false, 2, 'disponible', '2024-01-05T09:00:00Z', '2024-01-10T11:00:00Z'),
(4, 'Bijou Berbère en Argent', 'Bague traditionnelle berbère en argent massif, décorée de symboles ancestraux.', 2, 2, 3, 16, 8500, 9000, 10, false, 1, 'disponible', '2024-01-12T14:00:00Z', '2024-01-18T16:00:00Z'),
(5, 'Poterie Artisanale', 'Poterie en terre cuite réalisée selon les techniques traditionnelles berbères.', 1, 1, 2, 15, 3500, 4000, 14, false, 3, 'disponible', '2024-01-08T14:00:00Z', '2024-01-13T16:00:00Z'),
(6, 'Coussin Berbère', 'Coussin en tissu traditionnel avec broderie berbère.', 3, 3, 5, 15, 5000, 6000, 3, true, 1, 'disponible', '2024-01-08T14:00:00Z', '2024-01-13T16:00:00Z');

-- Insérer les médias
INSERT INTO medias (id_media, url, type_media, titre, thumbnail_url, ordre, created_at, updated_at) VALUES
(1, '/images/vase-berbere-1.jpg', 'image/jpeg', 'Vase Berbère - Vue principale', '/images/vase-berbere-1-thumb.jpg', 1, NOW(), NOW()),
(2, '/images/vase-berbere-2.jpg', 'image/jpeg', 'Vase Berbère - Vue détail', '/images/vase-berbere-2-thumb.jpg', 2, NOW(), NOW()),
(3, '/images/vase-berbere-3.jpg', 'image/jpeg', 'Vase Berbère - Vue profil', '/images/vase-berbere-3-thumb.jpg', 3, NOW(), NOW()),
(4, '/images/plat-berbere-1.jpg', 'image/jpeg', 'Plat Berbère Céramique', '/images/plat-berbere-1-thumb.jpg', 1, NOW(), NOW()),
(5, '/images/bague-berbere-1.jpg', 'image/jpeg', 'Bijou Berbère - Vue principale', '/images/bague-berbere-1-thumb.jpg', 1, NOW(), NOW()),
(6, '/images/poterie-berbere-1.jpg', 'image/jpeg', 'Poterie Artisanale', '/images/poterie-berbere-1-thumb.jpg', 1, NOW(), NOW()),
(7, '/images/coussin-berbere-1.jpg', 'image/jpeg', 'Coussin Berbère', '/images/coussin-berbere-1-thumb.jpg', 1, NOW(), NOW()),
(8, '/images/karim-benali.jpg', 'image/jpeg', 'Photo de Karim Benali', '/images/karim-benali-thumb.jpg', 1, NOW(), NOW()),
(9, '/images/marie-dupont.jpg', 'image/jpeg', 'Photo de Marie Dupont', '/images/marie-dupont-thumb.jpg', 1, NOW(), NOW()),
(10, '/images/paul-martin.jpg', 'image/jpeg', 'Photo de Paul Martin', '/images/paul-martin-thumb.jpg', 1, NOW(), NOW()),
(11, '/images/leila-fatima.jpg', 'image/jpeg', 'Photo de Leila Fatima', '/images/leila-fatima-thumb.jpg', 1, NOW(), NOW());

-- Associer les médias aux artisanats
INSERT INTO artisanat_medias (id_artisanat, id_media, created_at, updated_at) VALUES
(2, 1, NOW(), NOW()),
(2, 2, NOW(), NOW()),
(2, 3, NOW(), NOW()),
(3, 4, NOW(), NOW()),
(4, 5, NOW(), NOW()),
(5, 6, NOW(), NOW()),
(6, 7, NOW(), NOW());

-- Insérer les tags
INSERT INTO tags (id_tag, nom, created_at, updated_at) VALUES
(1, 'berbère', NOW(), NOW()),
(2, 'céramique', NOW(), NOW()),
(3, 'traditionnel', NOW(), NOW()),
(4, 'artisanal', NOW(), NOW()),
(5, 'karim benali', NOW(), NOW()),
(6, 'tissage', NOW(), NOW()),
(7, 'bijou', NOW(), NOW()),
(8, 'argent', NOW(), NOW()),
(9, 'tapis', NOW(), NOW()),
(10, 'poterie', NOW(), NOW());

-- Associer les tags aux artisanats
INSERT INTO artisanat_tags (id_artisanat, id_tag, created_at, updated_at) VALUES
(2, 1, NOW(), NOW()),
(2, 2, NOW(), NOW()),
(2, 3, NOW(), NOW()),
(2, 4, NOW(), NOW()),
(2, 5, NOW(), NOW()),
(3, 1, NOW(), NOW()),
(3, 2, NOW(), NOW()),
(3, 3, NOW(), NOW()),
(3, 4, NOW(), NOW()),
(4, 2, NOW(), NOW()),
(4, 5, NOW(), NOW()),
(4, 6, NOW(), NOW()),
(4, 7, NOW(), NOW()),
(4, 8, NOW(), NOW()),
(5, 1, NOW(), NOW()),
(5, 2, NOW(), NOW()),
(5, 3, NOW(), NOW()),
(5, 4, NOW(), NOW()),
(6, 3, NOW(), NOW()),
(6, 4, NOW(), NOW()),
(6, 5, NOW(), NOW()),
(6, 9, NOW(), NOW()),
(6, 10, NOW(), NOW());

-- Insérer les commentaires
INSERT INTO commentaires (id_commentaire, id_user, id_oeuvre, commentaire, note, date_creation, created_at, updated_at) VALUES
(1, 3, 2, 'Magnifique œuvre ! La qualité est exceptionnelle et les motifs berbères sont magnifiques. Je recommande vivement !', 5, '2024-01-20T14:30:00Z', NOW(), NOW()),
(2, 4, 2, 'Très beau travail. J''apprécie particulièrement la finesse des détails et l''authenticité des motifs. Bravo à l''artisan !', 4, '2024-01-21T09:15:00Z', NOW(), NOW()),
(3, 5, 2, 'Cet artisanat mérite vraiment d''être reconnu. Le travail de Karim Benali est exceptionnel. Bravo !', 5, '2024-01-22T11:20:00Z', NOW(), NOW());

-- Insérer les statistiques
INSERT INTO statistiques_artisanats (id_artisanat, vues, favoris, commentaires, created_at, updated_at) VALUES
(2, 156, 42, 3, NOW(), NOW()),
(3, 89, 28, 1, NOW(), NOW()),
(4, 67, 35, 2, NOW(), NOW()),
(5, 45, 18, 0, NOW(), NOW()),
(6, 34, 12, 1, NOW(), NOW());

-- Insérer les favoris
INSERT INTO favoris (id_favori, id_user, id_artisanat, created_at, updated_at) VALUES
(1, 3, 2, NOW(), NOW()),
(2, 4, 2, NOW(), NOW()),
(3, 5, 2, NOW(), NOW()),
(4, 1, 3, NOW(), NOW()),
(5, 2, 4, NOW(), NOW()),
(6, 3, 5, NOW(), NOW()),
(7, 4, 6, NOW(), NOW()),
(8, 5, 2, NOW(), NOW());

-- Mettre à jour les statistiques des utilisateurs
UPDATE users SET 
  nombre_favoris = (SELECT COUNT(*) FROM favoris WHERE id_user = users.id_user),
  nombre_commentaires = (SELECT COUNT(*) FROM commentaires WHERE id_user = users.id_user),
  updated_at = NOW()
WHERE id_user IN (3, 4, 5);

-- Mettre à jour les statistiques des œuvres
UPDATE oeuvres SET 
  nombre_favoris = (SELECT COUNT(*) FROM favoris WHERE id_oeuvre = oeuvres.id_oeuvre),
  nombre_commentaires = (SELECT COUNT(*) FROM commentaires WHERE id_oeuvre = oeuvres.id_oeuvre),
  note_moyenne = (SELECT ROUND(AVG(note), 1) FROM commentaires WHERE id_oeuvre = oeuvres.id_oeuvre),
  updated_at = NOW()
WHERE id_oeuvre IN (2, 3, 4, 5, 6);

-- Mettre à jour les statistiques des artisanats
UPDATE artisanats SET 
  nombre_favoris = (SELECT COUNT(*) FROM favoris WHERE id_artisanat = artisanats.id_artisanat),
  nombre_commentaires = (SELECT COUNT(*) FROM commentaires c JOIN oeuvres o ON c.id_oeuvre = o.id_oeuvre WHERE o.id_saiseur = artisanats.artisan_id),
  note_moyenne = (SELECT ROUND(AVG(c.note), 1) FROM commentaires c JOIN oeuvres o ON c.id_oeuvre = o.id_oeuvre WHERE o.id_saiseur = artisanats.artisan_id),
  updated_at = NOW()
WHERE id_artisanat IN (2, 3, 4, 5, 6);

-- Mettre à jour les statistiques globales
UPDATE dashboard_stats SET 
  total_artisanats = (SELECT COUNT(*) FROM artisanats),
  total_oeuvres = (SELECT COUNT(*) FROM oeuvres),
  total_evenements = (SELECT COUNT(*) FROM evenements),
  total_patrimoines = (SELECT COUNT(*) FROM sites),
  total_services = (SELECT COUNT(*) FROM artisanats),
  total_favoris = (SELECT COUNT(*) FROM favoris),
  total_commentaires = (SELECT COUNT(*) FROM commentaires),
  total_vues = (SELECT SUM(vues) FROM statistiques_artisanats),
  updated_at = NOW()
WHERE id = 1;

-- Afficher un résumé des données insérées
SELECT '=== Résumé des données insérées ===' as message;
SELECT 
  (SELECT COUNT(*) as materiaux FROM materiaux) as materiaux,
  (SELECT COUNT(*) as techniques FROM techniques) as techniques,
  (SELECT COUNT(*) as types_oeuvres FROM types_oeuvres) as types_oeuvres,
  (SELECT COUNT(*) as wilayas FROM wilayas) as wilayas,
  (SELECT COUNT(*) as utilisateurs FROM users) as utilisateurs,
  (SELECT COUNT(*) as oeuvres FROM oeuvres) as oeuvres,
  (SELECT COUNT(*) as artisanats FROM artisanats) as artisanats,
  (SELECT COUNT(*) as medias FROM medias) as medias,
  (SELECT COUNT(*) as tags FROM tags) as tags,
  (SELECT COUNT(*) as commentaires FROM commentaires) as commentaires,
  (SELECT COUNT(*) as favoris FROM favoris) as favoris,
  (SELECT COUNT(*) as statistiques_artisanats FROM statistiques_artisanats) as statistiques_artisanats;
