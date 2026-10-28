'use strict';

/**
 * Migration : traductions arabes et anglaises des listes de référence (catégories, genres, langues,
 * types d'événement, d'œuvre et d'organisation). Elles n'étaient remplies qu'en français : un visiteur
 * en arabe voyait « Festival », « Roman » ou « Anglais » dans les formulaires et les filtres.
 * Seules les traductions vides sont remplies (une traduction saisie depuis n'est jamais écrasée) ;
 * la ligne est retrouvée par son nom français. Rejouable. Rien à défaire.
 */

// nom français → [arabe, anglais]
const CATEGORIE = {
  'Abstrait': ['تجريدي', 'Abstract'], 'Accessoires': ['إكسسوارات', 'Accessories'], 'Afrobeat': ['أفروبيت', 'Afrobeat'],
  'Ambient': ['موسيقى محيطية', 'Ambient'], 'Anthologie': ['مختارات', 'Anthology'], 'Anthropologie': ['أنثروبولوجيا', 'Anthropology'],
  'Architecture': ['عمارة', 'Architecture'], 'Archéologie': ['علم الآثار', 'Archaeology'], 'Art Déco': ['آرت ديكو', 'Art Deco'],
  'Art Nouveau': ['الفن الحديث (آر نوفو)', 'Art Nouveau'], 'Art contemporain': ['فن معاصر', 'Contemporary art'],
  'Artisanat traditionnel': ['صناعة تقليدية', 'Traditional crafts'], 'Arts martiaux': ['فنون قتالية', 'Martial arts'],
  'Astronomie': ['علم الفلك', 'Astronomy'], 'Autobiographique': ['سيرة ذاتية', 'Autobiographical'], 'Aventure': ['مغامرة', 'Adventure'],
  'Bebop': ['بيبوب', 'Bebop'], 'Biographique': ['سيرة', 'Biographical'], 'Biologie': ['علم الأحياء', 'Biology'],
  'Catastrophe': ['كوارث', 'Disaster'], 'Chimie': ['كيمياء', 'Chemistry'], 'Cinéma': ['سينما', 'Cinema'],
  'Contemporain': ['معاصر', 'Contemporary'], 'Cubiste': ['تكعيبي', 'Cubist'], 'Cuisine': ['طبخ', 'Cooking'], 'Culture': ['ثقافة', 'Culture'],
  'Cyberpunk': ['سايبربانك', 'Cyberpunk'], 'Drill': ['دريل', 'Drill'], 'Dubstep': ['دبستيب', 'Dubstep'], 'Dystopie': ['ديستوبيا', 'Dystopia'],
  'Décoratif': ['زخرفي', 'Decorative'], 'Electro Pop': ['إلكترو بوب', 'Electropop'], 'Environnement': ['بيئة', 'Environment'],
  'Espionnage': ['تجسس', 'Espionage'], 'Expressionniste': ['تعبيري', 'Expressionist'], 'Expérimental': ['تجريبي', 'Experimental'],
  'Faits divers': ['متفرقات', 'Human interest'], 'Fantasy': ['خيال', 'Fantasy'], 'Festif': ['احتفالي', 'Festive'],
  'Figuratif': ['تشخيصي', 'Figurative'], 'Film noir': ['فيلم نوار', 'Film noir'], 'Found Footage': ['لقطات مكتشفة', 'Found footage'],
  'Free Jazz': ['جاز حر', 'Free jazz'], 'Gaming': ['ألعاب الفيديو', 'Gaming'], 'Gastronomie': ['فن الطبخ', 'Gastronomy'],
  'Guerre': ['حرب', 'War'], 'Génétique': ['علم الوراثة', 'Genetics'], 'Géologie': ['جيولوجيا', 'Geology'], 'Hard Rock': ['هارد روك', 'Hard rock'],
  'Historique': ['تاريخي', 'Historical'], 'Horreur': ['رعب', 'Horror'], 'House': ['هاوس', 'House'], 'Impressionniste': ['انطباعي', 'Impressionist'],
  'Indie Pop': ['إندي بوب', 'Indie pop'], 'Indie Rock': ['إندي روك', 'Indie rock'], 'Informatique': ['معلوماتية', 'Computing'],
  'Instruments': ['آلات موسيقية', 'Instruments'], 'International': ['دولي', 'International'], 'Jardin': ['حديقة', 'Garden'],
  'Jazz Fusion': ['جاز فيوجن', 'Jazz fusion'], 'Jeunesse': ['شباب وأطفال', 'Youth'], 'Jouets': ['ألعاب', 'Toys'], 'Justice': ['عدالة', 'Justice'],
  'K-Pop': ['كي بوب', 'K-pop'], 'Lifestyle': ['نمط الحياة', 'Lifestyle'], 'Littérature': ['أدب', 'Literature'],
  'Mathématiques': ['رياضيات', 'Mathematics'], 'Minimaliste': ['بسيط (تقليلي)', 'Minimalist'], 'Mobilier': ['أثاث', 'Furniture'],
  'Mockumentary': ['وثائقي ساخر', 'Mockumentary'], 'Mode': ['موضة', 'Fashion'], 'Moderne': ['حديث', 'Modern'], 'Musique': ['موسيقى', 'Music'],
  'Médecine': ['طب', 'Medicine'], 'Médias': ['إعلام', 'Media'], 'Nature morte': ['طبيعة صامتة', 'Still life'],
  'Neurosciences': ['علوم الأعصاب', 'Neuroscience'], 'Néo-noir': ['نيو نوار', 'Neo-noir'], 'Patrimoine culturel': ['تراث ثقافي', 'Cultural heritage'],
  'Paysage': ['منظر طبيعي', 'Landscape'], 'People': ['مشاهير', 'Celebrities'], 'Philosophique': ['فلسفي', 'Philosophical'],
  'Physique': ['فيزياء', 'Physics'], 'Policier': ['بوليسي', 'Crime'], 'Politique': ['سياسة', 'Politics'], 'Pop Art': ['بوب آرت', 'Pop art'],
  'Pop Rock': ['بوب روك', 'Pop rock'], 'Portrait': ['بورتريه', 'Portrait'], 'Post-apocalyptique': ['ما بعد نهاية العالم', 'Post-apocalyptic'],
  'Psychologie': ['علم النفس', 'Psychology'], 'Psychologique': ['نفسي', 'Psychological'], 'Punk Rock': ['بانك روك', 'Punk rock'],
  'Recherche': ['بحث', 'Research'], 'Religieux': ['ديني', 'Religious'], 'Rituel': ['طقوسي', 'Ritual'], 'Road Movie': ['فيلم طريق', 'Road movie'],
  'Rock Alternatif': ['روك بديل', 'Alternative rock'], 'Rock Progressif': ['روك تقدمي', 'Progressive rock'], 'Romance': ['رومانسي', 'Romance'],
  'Santé': ['صحة', 'Health'], 'Satirique': ['ساخر', 'Satirical'], 'Science-Fiction': ['خيال علمي', 'Science fiction'], 'Sciences': ['علوم', 'Science'],
  'Slasher': ['رعب دموي', 'Slasher'], 'Smooth Jazz': ['جاز ناعم', 'Smooth jazz'], 'Social': ['اجتماعي', 'Social'],
  'Sociologie': ['علم الاجتماع', 'Sociology'], 'Société': ['مجتمع', 'Society'], 'Space Opera': ['ملحمة فضائية', 'Space opera'],
  'Sport': ['رياضة', 'Sport'], 'Steampunk': ['ستيمبانك', 'Steampunk'], 'Super-héros': ['أبطال خارقون', 'Superheroes'],
  'Surréaliste': ['سريالي', 'Surrealist'], 'Survival': ['بقاء', 'Survival'], 'Techno': ['تكنو', 'Techno'], 'Technologie': ['تكنولوجيا', 'Technology'],
  'Thriller': ['إثارة', 'Thriller'], 'Tourisme': ['سياحة', 'Tourism'], 'Traditionnel': ['تقليدي', 'Traditional'],
  'Traditionnel Algérien': ['تقليدي جزائري', 'Algerian traditional'], 'Trap': ['تراب', 'Trap'], 'Utilitaire': ['نفعي', 'Utilitarian'],
  'Vampire': ['مصاصو الدماء', 'Vampire'], 'Vestimentaire': ['لباس', 'Clothing'], 'Young Adult': ['اليافعون', 'Young adult'],
  'Zombie': ['زومبي', 'Zombie'], 'Écologie': ['إيكولوجيا', 'Ecology'], 'Économie': ['اقتصاد', 'Economics'], 'Éducation': ['تربية وتعليم', 'Education'],
  'Épistolaire': ['رسائلي', 'Epistolary'],
};

const GENRE = {
  'Action': ['حركة', 'Action'], 'Actualité': ['أخبار', 'News'], 'Analyse': ['تحليل', 'Analysis'], 'Andalou': ['أندلسي', 'Andalusian'],
  'Animation': ['رسوم متحركة', 'Animation'], 'Art numérique': ['فن رقمي', 'Digital art'], 'Article de synthèse': ['مقال تركيبي', 'Review article'],
  'Bande Dessinée': ['قصص مصوّرة', 'Comics'], 'Bijouterie': ['صياغة الحلي', 'Jewellery'], 'Biographie': ['سيرة', 'Biography'], 'Blues': ['بلوز', 'Blues'],
  'Broderie': ['تطريز', 'Embroidery'], 'Calligraphie': ['خط عربي', 'Calligraphy'], 'Chaâbi': ['شعبي', 'Chaabi'], 'Chronique': ['عمود', 'Column'],
  'Classique': ['كلاسيكي', 'Classical'], 'Collage': ['كولاج', 'Collage'], 'Communication courte': ['مداخلة قصيرة', 'Short communication'],
  'Comédie': ['كوميديا', 'Comedy'], 'Conte': ['حكاية', 'Tale'], 'Country': ['كانتري', 'Country'], 'Court-métrage': ['فيلم قصير', 'Short film'],
  'Critique': ['نقد', 'Review'], 'Culture': ['ثقافة', 'Culture'], 'Céramique': ['خزف', 'Ceramics'], 'Dessin': ['رسم', 'Drawing'],
  'Dinanderie': ['النحاسيات', 'Copperware'], 'Documentaire': ['وثائقي', 'Documentary'], 'Drame': ['دراما', 'Drama'], 'Enquête': ['تحقيق', 'Investigation'],
  'Essai': ['مقالة', 'Essay'], 'Fantastique': ['فانتازيا', 'Fantastic'], 'Ferronnerie': ['الحدادة الفنية', 'Ironwork'], 'Folk': ['فولك', 'Folk'],
  'Gnawa': ['قناوة', 'Gnawa'], 'Gravure': ['حفر', 'Engraving'], 'Guerre': ['حرب', 'War'], 'Hip-Hop': ['هيب هوب', 'Hip-hop'], 'Histoire': ['تاريخ', 'History'],
  'Historique': ['تاريخي', 'Historical'], 'Horreur': ['رعب', 'Horror'], 'Installation': ['تنصيبة فنية', 'Installation'], 'Interview': ['حوار', 'Interview'],
  'Jazz': ['جاز', 'Jazz'], 'Kabyle': ['قبائلي', 'Kabyle'], "Lettre à l'éditeur": ['رسالة إلى المحرّر', 'Letter to the editor'],
  'Maroquinerie': ['صناعة الجلود', 'Leatherwork'], 'Metal': ['ميتال', 'Metal'], 'Moderne': ['حديث', 'Modern'], 'Musical': ['موسيقي', 'Musical'],
  'Mémoires': ['مذكرات', 'Memoirs'], 'Méta-analyse': ['تحليل تلوي', 'Meta-analysis'], 'Nouvelle': ['قصة قصيرة', 'Short story'],
  'Opinion': ['رأي', 'Opinion'], 'Peinture': ['رسم زيتي', 'Painting'], 'Photographie': ['تصوير', 'Photography'], 'Policier': ['بوليسي', 'Crime'],
  'Politique': ['سياسة', 'Politics'], 'Pop': ['بوب', 'Pop'], 'Portrait': ['بورتريه', 'Portrait'], 'Poterie': ['فخار', 'Pottery'], 'Poésie': ['شعر', 'Poetry'],
  'R&B': ['آر أند بي', 'R&B'], 'Rapport technique': ['تقرير تقني', 'Technical report'], 'Raï': ['راي', 'Raï'], 'Recherche': ['بحث', 'Research'],
  'Reggae': ['ريغي', 'Reggae'], 'Reportage': ['روبورتاج', 'Report'], 'Revue systématique': ['مراجعة منهجية', 'Systematic review'], 'Rock': ['روك', 'Rock'],
  'Roman': ['رواية', 'Novel'], 'Romance': ['رومانسي', 'Romance'], 'Science-Fiction': ['خيال علمي', 'Science fiction'], 'Sculpture': ['نحت', 'Sculpture'],
  'Société': ['مجتمع', 'Society'], 'Sport': ['رياضة', 'Sport'], 'Street Art': ['فن الشارع', 'Street art'], 'Tapisserie': ['نسيج جداري', 'Tapestry'],
  'Technologie': ['تكنولوجيا', 'Technology'], 'Thriller': ['إثارة', 'Thriller'], 'Théâtre': ['مسرح', 'Theatre'], 'Tissage': ['نسيج', 'Weaving'],
  'Tribune': ['منبر رأي', 'Op-ed'], 'Vannerie': ['صناعة السلال', 'Basketry'], 'Western': ['ويسترن', 'Western'], 'Zellige': ['زليج', 'Zellige'],
  'Ébénisterie': ['نجارة فنية', 'Cabinetmaking'], 'Économie': ['اقتصاد', 'Economics'], 'Éditorial': ['افتتاحية', 'Editorial'],
  'Électronique': ['إلكتروني', 'Electronic'], 'Étude de cas': ['دراسة حالة', 'Case study'],
};

const LANGUE = {
  'Anglais': ['الإنجليزية', 'English'], 'Arabe': ['العربية', 'Arabic'], 'Derja': ['الدارجة', 'Darja'], 'Français': ['الفرنسية', 'French'],
  'Tamazight': ['الأمازيغية', 'Tamazight'], 'Tifinagh': ['تيفيناغ', 'Tifinagh'],
};

const TYPE_EVENEMENT = {
  'Atelier': ['ورشة', 'Workshop'], 'Chantier-école': ['ورشة مدرسة', 'Training worksite'], 'Concert': ['حفل موسيقي', 'Concert'],
  'Conférence': ['محاضرة', 'Lecture'], 'Débat': ['نقاش', 'Debate'], 'Exposition': ['معرض', 'Exhibition'], 'Festival': ['مهرجان', 'Festival'],
  'Lecture': ['قراءة', 'Reading'], 'Projection': ['عرض سينمائي', 'Screening'], 'Salon': ['صالون', 'Fair'], 'Spectacle': ['عرض فني', 'Show'],
  'Théâtre': ['مسرح', 'Theatre'], 'Visite guidée': ['زيارة مُرشدة', 'Guided tour'],
};

const TYPE_OEUVRE = {
  'Album Musical': ['ألبوم موسيقي', 'Music album'], 'Article': ['مقال', 'Article'], 'Article Scientifique': ['مقال علمي', 'Scientific article'],
  'Artisanat': ['صناعة تقليدية', 'Craft'], 'Film': ['فيلم', 'Film'], 'Livre': ['كتاب', 'Book'], "Œuvre d'Art": ['عمل فني', 'Artwork'],
};

const TYPE_ORGANISATION = {
  'Association': ['جمعية', 'Association'], 'Association culturelle': ['جمعية ثقافية', 'Cultural association'], 'Bibliothèque': ['مكتبة', 'Library'],
  'Collectivité territoriale': ['جماعة محلية', 'Local authority'], 'Entreprise': ['مؤسسة', 'Company'], 'Entreprise privée': ['مؤسسة خاصة', 'Private company'],
  'Fondation': ['مؤسسة خيرية', 'Foundation'], 'Institution publique': ['مؤسسة عمومية', 'Public institution'], 'Ministère': ['وزارة', 'Ministry'],
  'Musée': ['متحف', 'Museum'], 'ONG': ['منظمة غير حكومية', 'NGO'], 'Université': ['جامعة', 'University'], 'École': ['مدرسة', 'School'],
};

const LISTES = [
  ['categorie', 'nom', CATEGORIE], ['genre', 'nom', GENRE], ['langue', 'nom', LANGUE],
  ['type_evenement', 'nom_type', TYPE_EVENEMENT], ['type_oeuvre', 'nom_type', TYPE_OEUVRE], ['typeorganisation', 'nom', TYPE_ORGANISATION],
];

module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;
    for (const [table, colonne, traductions] of LISTES) {
      const [[existe]] = await q.query(
        'SELECT COUNT(*) n FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
        { replacements: [table, colonne] });
      if (!Number(existe.n)) continue;
      for (const [fr, [ar, en]] of Object.entries(traductions)) {
        for (const [langue, texte] of [['ar', ar], ['en', en]]) {
          await q.query(
            `UPDATE \`${table}\` SET \`${colonne}\` = JSON_SET(\`${colonne}\`, '$.${langue}', ?)
             WHERE JSON_VALID(\`${colonne}\`)
               AND JSON_UNQUOTE(JSON_EXTRACT(\`${colonne}\`, '$.fr')) = ?
               AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(\`${colonne}\`, '$.${langue}')), '') = ''`,
            { replacements: [texte, fr] });
        }
      }
    }
  },

  async down() {}
};
