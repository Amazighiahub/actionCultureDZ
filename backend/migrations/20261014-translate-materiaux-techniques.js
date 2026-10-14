'use strict';

/**
 * Migration de données : traductions des matériaux et techniques d'artisanat.
 *
 * Les noms et descriptions n'étaient remplis qu'en français : les filtres et fiches
 * d'artisanat restaient en français dans les autres langues. Chaque ligne est retrouvée
 * par son texte français ; seules les langues vides sont complétées (rien n'est écrasé).
 * Tamazight : seulement les termes sûrs, les autres retombent sur le français.
 */
const TRANSLATIONS = {
  "materiau": {
    "nom": {
      "Bois": {
        "en": "Wood",
        "ar": "خشب",
        "tz-ltn": "Asɣar",
        "tz-tfng": "ⴰⵙⵖⴰⵔ"
      },
      "Pierre": {
        "en": "Stone",
        "ar": "حجر",
        "tz-ltn": "Adɣaɣ",
        "tz-tfng": "ⴰⴷⵖⴰⵖ"
      },
      "Métal": {
        "en": "Metal",
        "ar": "معدن",
        "tz-ltn": "Uzzal",
        "tz-tfng": "ⵓⵣⵣⴰⵍ"
      },
      "Céramique": {
        "en": "Ceramics",
        "ar": "خزف"
      },
      "Textile": {
        "en": "Textile",
        "ar": "نسيج",
        "tz-ltn": "Aẓeṭṭa",
        "tz-tfng": "ⴰⵥⴻⵟⵟⴰ"
      },
      "Cuir": {
        "en": "Leather",
        "ar": "جلد",
        "tz-ltn": "Ilem",
        "tz-tfng": "ⵉⵍⴻⵎ"
      },
      "Verre": {
        "en": "Glass",
        "ar": "زجاج"
      },
      "Papier": {
        "en": "Paper",
        "ar": "ورق",
        "tz-ltn": "Akaɣeḍ",
        "tz-tfng": "ⴰⴽⴰⵖⴻⴹ"
      },
      "Plastique": {
        "en": "Plastic",
        "ar": "بلاستيك",
        "tz-ltn": "Plastik",
        "tz-tfng": "ⵒⵍⴰⵙⵜⵉⴽ"
      },
      "Argile": {
        "en": "Clay",
        "ar": "طين",
        "tz-ltn": "Talaxt",
        "tz-tfng": "ⵜⴰⵍⴰⵅⵜ"
      },
      "Laine": {
        "en": "Wool",
        "ar": "صوف",
        "tz-ltn": "Taḍuṭ",
        "tz-tfng": "ⵜⴰⴹⵓⵟ"
      },
      "Cuivre": {
        "en": "Copper",
        "ar": "نحاس",
        "tz-ltn": "Nnḥas",
        "tz-tfng": "ⵏⵏⵃⴰⵙ"
      },
      "Argent": {
        "en": "Silver",
        "ar": "فضة",
        "tz-ltn": "Lfeṭṭa",
        "tz-tfng": "ⵍⴼⴻⵟⵟⴰ"
      }
    },
    "description": {
      "Matériau naturel": {
        "en": "Natural material",
        "ar": "مادة طبيعية"
      },
      "Matériau minéral": {
        "en": "Mineral material",
        "ar": "مادة معدنية"
      },
      "Matériau métallique": {
        "en": "Metallic material",
        "ar": "مادة فلزية"
      },
      "Terre cuite": {
        "en": "Terracotta",
        "ar": "طين مشوي"
      },
      "Fibres textiles": {
        "en": "Textile fibres",
        "ar": "ألياف نسيجية"
      },
      "Peau animale traitée": {
        "en": "Treated animal hide",
        "ar": "جلد حيواني معالج"
      },
      "Matériau transparent": {
        "en": "Transparent material",
        "ar": "مادة شفافة"
      },
      "Support d'écriture": {
        "en": "Writing medium",
        "ar": "حامل للكتابة"
      },
      "Matériau synthétique": {
        "en": "Synthetic material",
        "ar": "مادة اصطناعية"
      },
      "Matériau traditionnel pour la poterie": {
        "en": "Traditional pottery material",
        "ar": "مادة تقليدية لصناعة الفخار"
      },
      "Fibre naturelle pour le tissage": {
        "en": "Natural fibre for weaving",
        "ar": "ألياف طبيعية للنسيج"
      },
      "Métal pour l'artisanat traditionnel": {
        "en": "Metal for traditional crafts",
        "ar": "معدن للحرف التقليدية"
      },
      "Métal précieux pour la bijouterie": {
        "en": "Precious metal for jewellery",
        "ar": "معدن نفيس لصناعة الحلي"
      }
    }
  },
  "technique": {
    "nom": {
      "Sculpture": {
        "en": "Sculpture",
        "ar": "نحت"
      },
      "Peinture": {
        "en": "Painting",
        "ar": "رسم",
        "tz-ltn": "Asuneɣ",
        "tz-tfng": "ⴰⵙⵓⵏⴻⵖ"
      },
      "Gravure": {
        "en": "Engraving",
        "ar": "نقش"
      },
      "Tissage": {
        "en": "Weaving",
        "ar": "نسيج",
        "tz-ltn": "Aẓeṭṭa",
        "tz-tfng": "ⴰⵥⴻⵟⵟⴰ"
      },
      "Poterie": {
        "en": "Pottery",
        "ar": "فخار"
      },
      "Broderie": {
        "en": "Embroidery",
        "ar": "تطريز"
      },
      "Marqueterie": {
        "en": "Marquetry",
        "ar": "تطعيم الخشب"
      },
      "Ciselure": {
        "en": "Chasing",
        "ar": "نقش على المعادن"
      },
      "Calligraphie": {
        "en": "Calligraphy",
        "ar": "خط عربي"
      },
      "Photographie": {
        "en": "Photography",
        "ar": "تصوير فوتوغرافي",
        "tz-ltn": "Tawlaft",
        "tz-tfng": "ⵜⴰⵡⵍⴰⴼⵜ"
      },
      "Tissage traditionnel": {
        "en": "Traditional weaving",
        "ar": "نسيج تقليدي",
        "tz-ltn": "Aẓeṭṭa ansay",
        "tz-tfng": "ⴰⵥⴻⵟⵟⴰ ⴰⵏⵙⴰⵢ"
      },
      "Poterie au tour": {
        "en": "Wheel-thrown pottery",
        "ar": "فخار بالدولاب"
      },
      "Gravure sur cuivre": {
        "en": "Copper engraving",
        "ar": "نقش على النحاس"
      },
      "Tannage": {
        "en": "Tanning",
        "ar": "دباغة"
      }
    },
    "description": {
      "Art du volume": {
        "en": "Art of volume",
        "ar": "فن المجسمات"
      },
      "Art pictural": {
        "en": "Pictorial art",
        "ar": "فن تشكيلي"
      },
      "Art de l'estampe": {
        "en": "Art of printmaking",
        "ar": "فن الطباعة الفنية"
      },
      "Entrelacement de fils": {
        "en": "Interlacing of threads",
        "ar": "تشابك الخيوط"
      },
      "Façonnage de l'argile": {
        "en": "Shaping clay",
        "ar": "تشكيل الطين"
      },
      "Ornementation textile": {
        "en": "Textile ornamentation",
        "ar": "زخرفة النسيج"
      },
      "Décoration en bois": {
        "en": "Wood decoration",
        "ar": "زخرفة الخشب"
      },
      "Travail du métal": {
        "en": "Metalwork",
        "ar": "أشغال المعادن"
      },
      "Art de l'écriture": {
        "en": "Art of writing",
        "ar": "فن الكتابة"
      },
      "Capture d'images": {
        "en": "Capturing images",
        "ar": "التقاط الصور"
      },
      "Technique ancestrale de tissage": {
        "en": "Ancestral weaving technique",
        "ar": "تقنية نسيج عريقة"
      },
      "Façonnage de l'argile au tour": {
        "en": "Shaping clay on the wheel",
        "ar": "تشكيل الطين بالدولاب"
      },
      "Art de la dinanderie": {
        "en": "Art of copperware",
        "ar": "فن صناعة النحاسيات"
      },
      "Traitement du cuir": {
        "en": "Leather treatment",
        "ar": "معالجة الجلد"
      }
    }
  }
};

const parse = (v) => {
  if (!v) return {};
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return { fr: String(v) }; }
};

module.exports = {
  async up(queryInterface) {
    const tables = (await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName));
    for (const [table, fields] of Object.entries(TRANSLATIONS)) {
      if (!tables.includes(table)) continue;
      const idCol = `id_${table}`;
      const [rows] = await queryInterface.sequelize.query(`SELECT ${idCol} AS id, nom, description FROM ${table}`);
      for (const row of rows) {
        const updates = {};
        for (const [field, dict] of Object.entries(fields)) {
          const value = parse(row[field]);
          const extra = dict[(value.fr || '').trim()];
          if (!extra) continue;
          let changed = false;
          for (const [lang, text] of Object.entries(extra)) {
            if (!value[lang] || !String(value[lang]).trim()) { value[lang] = text; changed = true; }
          }
          if (changed) updates[field] = JSON.stringify(value);
        }
        const cols = Object.keys(updates);
        if (!cols.length) continue;
        await queryInterface.sequelize.query(
          `UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE ${idCol} = ?`,
          { replacements: [...cols.map((c) => updates[c]), row.id] }
        );
      }
    }
  },

  // Données : pas de retour arrière (les traductions ajoutées restent valides)
  async down() {}
};
