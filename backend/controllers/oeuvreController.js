// controllers/OeuvreController.js - VERSION i18n
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// ⚡ Import du helper i18n
const { translate, translateDeep, createMultiLang, mergeTranslations } = require('../helpers/i18n');

// ✅ OPTIMISATION: Import de l'utilitaire de recherche multilingue centralisé
const { buildMultiLangSearch } = require('../utils/MultiLangSearchBuilder');

class OeuvreController {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
    
    if (!this.sequelize) {
      console.error('❌ Sequelize non trouvé dans les modèles!');
    } else {
      console.log('✅ OeuvreController initialisé avec succès');
    }
  }

  /**
   * ⚡ Recherche multilingue dans les champs JSON
   * ✅ OPTIMISATION: Utilise maintenant l'utilitaire centralisé
   */
  buildMultiLangSearchLocal(field, search) {
    return buildMultiLangSearch(this.sequelize, field, search, 'Oeuvre');
  }

  /**
   * Liste des œuvres avec pagination
   */
  async list(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡ Récupérer la langue
      
      const { 
        page = 1, 
        limit = 10, 
        type, 
        langue, 
        statut = 'publie',
        search,
        sort = 'recent'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // Filtres
      if (type) where.id_type_oeuvre = type;
      if (langue) where.id_langue = langue;
      if (statut) where.statut = statut;
      
      // ⚡ Recherche multilingue
      if (search) {
        where[Op.or] = [
          ...this.buildMultiLangSearchLocal('titre', search),
          ...this.buildMultiLangSearchLocal('description', search)
        ];
      }

      // Tri
      let order;
      switch (sort) {
        case 'recent':
          order = [['date_creation', 'DESC']];
          break;
        case 'title':
          order = [[this.sequelize.literal(`JSON_EXTRACT(\`titre\`, '$.${lang}')`), 'ASC']];
          break;
        case 'year':
          order = [['annee_creation', 'DESC']];
          break;
        case 'rating':
          order = [['note_moyenne', 'DESC']];
          break;
        default:
          order = [['date_creation', 'DESC']];
      }

      const result = await this.models.Oeuvre.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order,
        include: [
          { 
            model: this.models.TypeOeuvre,
            attributes: ['id_type_oeuvre', 'nom_type']
          },
          { 
            model: this.models.Langue,
            attributes: ['id_langue', 'nom', 'code']
          },
          {
            model: this.models.Categorie,
            through: { attributes: [] },
            attributes: ['id_categorie', 'nom']
          },
          {
            model: this.models.Media,
            where: { visible_public: true },
            required: false,
            separate: true,
            limit: 1,
            order: [['ordre', 'ASC']]
          }
        ],
        distinct: true
      });

      // ⚡ Traduire les résultats
      const translatedOeuvres = translateDeep(result.rows, lang);

      res.json({
        success: true,
        data: {
          oeuvres: translatedOeuvres,
          pagination: {
            total: result.count,
            page: parseInt(page),
            pages: Math.ceil(result.count / limit),
            limit: parseInt(limit)
          }
        },
        lang
      });

    } catch (error) {
      console.error('❌ Erreur récupération œuvres:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la récupération des œuvres' 
      });
    }
  }

  /**
   * Alias pour list
   */
  async getAllOeuvres(req, res) {
    return this.list(req, res);
  }

  /**
   * Récupérer une œuvre par ID
   */
  async getById(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡ Récupérer la langue
      const { id } = req.params;
      
      const oeuvre = await this.models.Oeuvre.findByPk(id, {
        include: [
          // Type et langue
          {
            model: this.models.TypeOeuvre,
            attributes: ['id_type_oeuvre', 'nom_type']
          },
          {
            model: this.models.Langue,
            attributes: ['id_langue', 'nom', 'code']
          },
          
          // Catégories et tags
          {
            model: this.models.Categorie,
            through: { attributes: [] },
            attributes: ['id_categorie', 'nom', 'description']
          },
          {
            model: this.models.TagMotCle,
            as: 'Tags',
            through: { attributes: [] },
            attributes: ['id_tag', 'nom']
          },
          
          // Éditeurs
          {
            model: this.models.Editeur,
            through: {
              model: this.models.OeuvreEditeur,
              attributes: ['role_editeur', 'date_edition', 'isbn_editeur', 'prix_vente', 'statut_edition']
            },
            attributes: ['id_editeur', 'nom', 'pays', 'ville']
          },
          
          // Médias
          {
            model: this.models.Media,
            where: { visible_public: true },
            required: false,
            attributes: ['id_media', 'type_media', 'url', 'titre', 'description', 'thumbnail_url', 'ordre', 'is_Principale'],
            order: [['ordre', 'ASC']]
          },

          // Relations spécialisées (hasOne) selon le type d'œuvre
          ...(this.models.Livre ? [{ model: this.models.Livre, required: false }] : []),
          ...(this.models.Film ? [{ model: this.models.Film, required: false }] : []),
          ...(this.models.AlbumMusical ? [{ model: this.models.AlbumMusical, required: false }] : []),
          ...(this.models.Article ? [{ model: this.models.Article, required: false }] : []),
          ...(this.models.ArticleScientifique ? [{ model: this.models.ArticleScientifique, required: false }] : []),
          ...(this.models.Artisanat ? [{ model: this.models.Artisanat, required: false }] : []),
          ...(this.models.OeuvreArt ? [{ model: this.models.OeuvreArt, required: false }] : [])
        ]
      });

      if (!oeuvre) {
        return res.status(404).json({ 
          success: false, 
          error: 'Œuvre non trouvée' 
        });
      }

      // ⚡ Traduire la réponse
      res.json({
        success: true,
        data: translateDeep(oeuvre, lang),
        lang
      });

    } catch (error) {
      console.error('❌ Erreur récupération œuvre:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la récupération de l\'œuvre' 
      });
    }
  }

  /**
   * Alias pour getById
   */
  async getOeuvreById(req, res) {
    return this.getById(req, res);
  }

  /**
   * ✅ NOUVELLE FONCTION - Récupérer les médias d'une œuvre
   */
  async getMedias(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { id } = req.params;

      // Vérifier que l'œuvre existe
      const oeuvre = await this.models.Oeuvre.findByPk(id);
      if (!oeuvre) {
        return res.status(404).json({
          success: false,
          error: 'Œuvre non trouvée'
        });
      }

      // Récupérer les médias
      const medias = await this.models.Media.findAll({
        where: {
          id_oeuvre: id,
          visible_public: true
        },
        attributes: [
          'id_media',
          'type_media',
          'url',
          'titre',
          'description',
          'thumbnail_url',
          'ordre',
          'is_Principale',
          'date_creation'
        ],
        order: [
          ['is_Principale', 'DESC'],
          ['ordre', 'ASC'],
          ['date_creation', 'ASC']
        ]
      });

      res.json({
        success: true,
        data: translateDeep(medias, lang),
        count: medias.length,
        lang
      });

    } catch (error) {
      console.error('❌ Erreur récupération médias œuvre:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des médias'
      });
    }
  }

  /**
   * ⚡ Préparer un champ multilingue
   */
  prepareMultiLangField(value, lang = 'fr') {
    if (!value) return null;
    if (typeof value === 'object' && value !== null) return value;
    return createMultiLang(value, lang);
  }

  /**
   * Créer une nouvelle œuvre
   */
  async create(req, res) {
    let transaction;

    try {
      const lang = req.lang || 'fr';  // ⚡ Récupérer la langue
      transaction = await this.sequelize.transaction();

      const {
        titre,
        id_type_oeuvre,
        id_langue,
        annee_creation,
        description,
        prix,
        id_oeuvre_originale,
        categories = [],
        tags = [],
        editeurs = [],
        utilisateurs_inscrits = [],
        intervenants_existants = [],
        intervenants_non_inscrits = [],
        nouveaux_intervenants = [],
        medias = [],
        details_specifiques = {}
      } = req.body;

      // Parse JSON strings from FormData (multer sends arrays/objects as strings)
      const parseJsonField = (field, fallback = []) => {
        if (!field) return fallback;
        if (typeof field === 'string') {
          try { return JSON.parse(field); } catch { return fallback; }
        }
        return field;
      };

      const parsedCategories = parseJsonField(categories, []);
      const parsedTags = parseJsonField(tags, []);
      const parsedEditeurs = parseJsonField(editeurs, []);
      const parsedUtilisateursInscrits = parseJsonField(utilisateurs_inscrits, []);
      const parsedIntervenantsExistants = parseJsonField(intervenants_existants, []);
      const parsedIntervenantsNonInscrits = parseJsonField(intervenants_non_inscrits, []);
      const parsedNouveauxIntervenants = parseJsonField(nouveaux_intervenants, []);
      const parsedDetailsSpecifiques = parseJsonField(details_specifiques, {});

      console.log('📝 Création œuvre:', {
        titre,
        id_type_oeuvre,
        lang,
        nb_categories: parsedCategories.length,
        nb_medias: medias.length,
        nb_utilisateurs_inscrits: parsedUtilisateursInscrits.length,
        nb_intervenants_existants: parsedIntervenantsExistants.length,
        nb_nouveaux_intervenants: parsedNouveauxIntervenants.length,
        nb_editeurs: parsedEditeurs.length
      });

      // 1. Validation basique
      if (!titre || !id_type_oeuvre || !id_langue) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Les champs titre, type d\'œuvre et langue sont obligatoires'
        });
      }

      // 2. Créer l'œuvre
      const oeuvre = await this.models.Oeuvre.create({
        titre: this.prepareMultiLangField(titre, lang),
        description: this.prepareMultiLangField(description, lang),
        id_type_oeuvre,
        id_langue,
        annee_creation,
        prix,
        id_oeuvre_originale,
        saisi_par: req.user?.id_user,
        statut: 'brouillon'
      }, { transaction });

      // 2b. Créer l'entrée dans la table spécifique selon le type d'œuvre
      if (parsedDetailsSpecifiques && Object.keys(parsedDetailsSpecifiques).length > 0) {
        const typeOeuvre = await this.models.TypeOeuvre.findByPk(id_type_oeuvre);
        const typeName = typeOeuvre?.nom_type;

        let createdSpecific = null;

        console.log('📝 Création détails spécifiques pour:', typeName, parsedDetailsSpecifiques);

        try {
          switch (typeName) {
            case 'Livre':
              if (parsedDetailsSpecifiques.livre && this.models.Livre) {
                createdSpecific = await this.models.Livre.create({
                  id_oeuvre: oeuvre.id_oeuvre,
                  ...parsedDetailsSpecifiques.livre
                }, { transaction });
              }
              break;

            case 'Film':
              if (parsedDetailsSpecifiques.film && this.models.Film) {
                createdSpecific = await this.models.Film.create({
                  id_oeuvre: oeuvre.id_oeuvre,
                  ...parsedDetailsSpecifiques.film
                }, { transaction });
              }
              break;

            case 'Album Musical':
              if (parsedDetailsSpecifiques.album_musical && this.models.AlbumMusical) {
                createdSpecific = await this.models.AlbumMusical.create({
                  id_oeuvre: oeuvre.id_oeuvre,
                  ...parsedDetailsSpecifiques.album_musical
                }, { transaction });
              }
              break;

            case 'Article':
              if (parsedDetailsSpecifiques.article && this.models.Article) {
                createdSpecific = await this.models.Article.create({
                  id_oeuvre: oeuvre.id_oeuvre,
                  ...parsedDetailsSpecifiques.article
                }, { transaction });
              }
              break;

            case 'Article Scientifique':
              if (parsedDetailsSpecifiques.article_scientifique && this.models.ArticleScientifique) {
                createdSpecific = await this.models.ArticleScientifique.create({
                  id_oeuvre: oeuvre.id_oeuvre,
                  ...parsedDetailsSpecifiques.article_scientifique
                }, { transaction });
              }
              break;

            case 'Artisanat':
              if (parsedDetailsSpecifiques.artisanat && this.models.Artisanat) {
                createdSpecific = await this.models.Artisanat.create({
                  id_oeuvre: oeuvre.id_oeuvre,
                  ...parsedDetailsSpecifiques.artisanat
                }, { transaction });
              }
              break;

            case 'Œuvre d\'Art':
            case 'Oeuvre d\'Art':
              if (parsedDetailsSpecifiques.oeuvre_art && this.models.OeuvreArt) {
                createdSpecific = await this.models.OeuvreArt.create({
                  id_oeuvre: oeuvre.id_oeuvre,
                  ...parsedDetailsSpecifiques.oeuvre_art
                }, { transaction });
              }
              break;

            default:
              console.log('⚠️ Type d\'œuvre non reconnu pour les détails spécifiques:', typeName);
          }

          if (createdSpecific) {
            req.createdSpecific = {
              typeName,
              record: createdSpecific
            };
          }
        } catch (detailsError) {
          console.error('⚠️ Erreur création détails spécifiques:', detailsError.message);
          // On continue même si les détails spécifiques échouent
        }
      }

      // 3. Associer les catégories
      if (parsedCategories.length > 0) {
        await oeuvre.setCategories(parsedCategories, { transaction });
      }

      // 4. Associer les tags
      if (parsedTags.length > 0) {
        const tagsArray = Array.isArray(parsedTags) ? parsedTags : [parsedTags];
        console.log('🏷️ Tags à associer:', tagsArray);
        const tagInstances = [];
        for (const tagItem of tagsArray) {
          try {
            let tag = null;

            // Si c'est un nombre, chercher par id_tag
            if (typeof tagItem === 'number' || (typeof tagItem === 'string' && /^\d+$/.test(tagItem))) {
              tag = await this.models.TagMotCle.findByPk(parseInt(tagItem));
            }

            // Sinon, chercher par nom (JSON multilingue) dans toutes les langues
            if (!tag && typeof tagItem === 'string') {
              const searchLangs = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'];
              for (const searchLang of searchLangs) {
                const jsonPath = searchLang.includes('-') ? `$."${searchLang}"` : `$.${searchLang}`;
                tag = await this.models.TagMotCle.findOne({
                  where: this.sequelize.where(
                    this.sequelize.fn('JSON_EXTRACT', this.sequelize.col('nom'), this.sequelize.literal(`'${jsonPath}'`)),
                    tagItem
                  ),
                  transaction
                });
                if (tag) break;
              }

              // Si pas trouvé, créer avec le format multilingue
              if (!tag) {
                const tagNomMultiLang = this.prepareMultiLangField(tagItem, lang);
                [tag] = await this.models.TagMotCle.findOrCreate({
                  where: this.sequelize.where(
                    this.sequelize.fn('JSON_EXTRACT', this.sequelize.col('nom'), this.sequelize.literal(`'$.${lang}'`)),
                    tagItem
                  ),
                  defaults: { nom: tagNomMultiLang },
                  transaction
                });
              }
            }

            if (tag) {
              tagInstances.push(tag);
            } else {
              console.warn(`⚠️ Tag non trouvé/créé: ${tagItem}`);
            }
          } catch (tagErr) {
            console.warn(`⚠️ Erreur traitement tag "${tagItem}":`, tagErr.message);
          }
        }
        if (tagInstances.length > 0) {
          await oeuvre.setTags(tagInstances, { transaction });
          console.log(`🏷️ ${tagInstances.length} tag(s) associé(s)`);
        }
      }

      // 5. Associer les contributeurs
      console.log('👥 DEBUG contributeurs parsed:', {
        utilisateurs_inscrits: parsedUtilisateursInscrits,
        intervenants_existants: parsedIntervenantsExistants,
        nouveaux_intervenants: parsedNouveauxIntervenants,
        editeurs: parsedEditeurs
      });

      // 5a. Utilisateurs inscrits (ContributeurOeuvre -> OeuvreUser)
      if (parsedUtilisateursInscrits.length > 0 && this.models.OeuvreUser) {
        console.log(`👥 Association de ${parsedUtilisateursInscrits.length} utilisateur(s) inscrit(s)`);
        for (let i = 0; i < parsedUtilisateursInscrits.length; i++) {
          const u = parsedUtilisateursInscrits[i];
          try {
            await this.models.OeuvreUser.create({
              id_oeuvre: oeuvre.id_oeuvre,
              id_user: u.id_user,
              id_type_user: u.id_type_user || u.role || 1,
              personnage: u.personnage || u.role || '',
              ordre_apparition: i,
              role_principal: i === 0
            }, { transaction });
          } catch (userErr) {
            console.warn(`⚠️ Erreur association utilisateur ${u.id_user}:`, userErr.message);
          }
        }
      }

      // 5b. Intervenants existants (IntervenantExistant -> OeuvreIntervenant)
      if (parsedIntervenantsExistants.length > 0 && this.models.OeuvreIntervenant) {
        console.log(`👥 Association de ${parsedIntervenantsExistants.length} intervenant(s) existant(s)`);
        for (let i = 0; i < parsedIntervenantsExistants.length; i++) {
          const ie = parsedIntervenantsExistants[i];
          try {
            await this.models.OeuvreIntervenant.create({
              id_oeuvre: oeuvre.id_oeuvre,
              id_intervenant: ie.id_intervenant,
              id_type_user: ie.id_type_user || 1,
              personnage: ie.personnage || '',
              ordre_apparition: i,
              role_principal: i === 0
            }, { transaction });
          } catch (intErr) {
            console.warn(`⚠️ Erreur association intervenant ${ie.id_intervenant}:`, intErr.message);
          }
        }
      }

      // 5c. Nouveaux intervenants (créer Intervenant puis OeuvreIntervenant)
      if (parsedNouveauxIntervenants.length > 0 && this.models.Intervenant && this.models.OeuvreIntervenant) {
        console.log(`👥 Création de ${parsedNouveauxIntervenants.length} nouvel(aux) intervenant(s)`);
        for (let i = 0; i < parsedNouveauxIntervenants.length; i++) {
          const ni = parsedNouveauxIntervenants[i];
          try {
            const newIntervenant = await this.models.Intervenant.create({
              nom: this.prepareMultiLangField(ni.nom, lang),
              prenom: this.prepareMultiLangField(ni.prenom, lang),
              organisation: ni.organisation || null,
              titre_professionnel: ni.titre_professionnel || null,
              email: ni.email || null,
              actif: true
            }, { transaction });

            await this.models.OeuvreIntervenant.create({
              id_oeuvre: oeuvre.id_oeuvre,
              id_intervenant: newIntervenant.id_intervenant,
              id_type_user: ni.id_type_user || 1,
              personnage: ni.role || ni.personnage || '',
              ordre_apparition: i,
              role_principal: false
            }, { transaction });
          } catch (newIntErr) {
            console.warn(`⚠️ Erreur création nouvel intervenant:`, newIntErr.message);
          }
        }
      }

      // 5d. Éditeurs
      if (parsedEditeurs.length > 0 && this.models.OeuvreEditeur) {
        console.log(`📚 Association de ${parsedEditeurs.length} éditeur(s)`);
        for (const editeurId of parsedEditeurs) {
          try {
            await this.models.OeuvreEditeur.create({
              id_oeuvre: oeuvre.id_oeuvre,
              id_editeur: editeurId
            }, { transaction });
          } catch (edErr) {
            console.warn(`⚠️ Erreur association éditeur ${editeurId}:`, edErr.message);
          }
        }
      }

      // 6. Traiter les fichiers médias uploadés (req.files via multer)
      const uploadedFiles = req.files || [];
      if (uploadedFiles.length > 0) {
        let mediaMetadata = [];
        try {
          if (req.body.media_metadata) {
            mediaMetadata = typeof req.body.media_metadata === 'string'
              ? JSON.parse(req.body.media_metadata)
              : req.body.media_metadata;
          }
        } catch (e) {
          console.warn('⚠️ Erreur parsing media_metadata:', e.message);
        }

        console.log(`📤 Traitement de ${uploadedFiles.length} fichier(s) média(s)`);

        for (let i = 0; i < uploadedFiles.length; i++) {
          const file = uploadedFiles[i];
          const meta = mediaMetadata[i] || {};
          const isPrincipal = meta.is_Principale || meta.is_principal || (i === 0);

          // Déterminer le type de média
          let typeMedia = 'document';
          if (file.mimetype.startsWith('image/')) typeMedia = 'image';
          else if (file.mimetype.startsWith('video/')) typeMedia = 'video';
          else if (file.mimetype.startsWith('audio/')) typeMedia = 'audio';

          await this.models.Media.create({
            id_oeuvre: oeuvre.id_oeuvre,
            type_media: typeMedia,
            url: `/uploads/oeuvres/${file.filename}`,
            titre: file.originalname,
            visible_public: true,
            is_Principale: isPrincipal,
            ordre: i,
            taille_fichier: file.size,
            mime_type: file.mimetype
          }, { transaction });
        }

        console.log(`✅ ${uploadedFiles.length} média(s) créé(s) pour l'œuvre ${oeuvre.id_oeuvre}`);
      }

      await transaction.commit();

      // Recharger avec les relations (inclure Article/ArticleScientifique pour retourner l'ID spécifique)
      const oeuvreComplete = await this.models.Oeuvre.findByPk(oeuvre.id_oeuvre, {
        include: [
          { model: this.models.TypeOeuvre },
          { model: this.models.Langue },
          { model: this.models.Categorie, through: { attributes: [] } },
          { model: this.models.TagMotCle, as: 'Tags', through: { attributes: [] } },
          ...(this.models.Article ? [{ model: this.models.Article, required: false }] : []),
          ...(this.models.ArticleScientifique ? [{ model: this.models.ArticleScientifique, required: false }] : [])
        ]
      });

      const createdSpecificPayload = (() => {
        const cs = req.createdSpecific;
        console.log('🔍 createdSpecific:', cs ? { typeName: cs.typeName, recordId: cs.record?.id_article_scientifique || cs.record?.id_article } : 'null');
        if (cs && cs.record) {
          switch (cs.typeName) {
            case 'Article Scientifique':
              return { article_scientifique: cs.record };
            case 'Article':
              return { article: cs.record };
            default:
              return { details_specifiques_record: cs.record };
          }
        }
        // Fallback: extraire depuis l'oeuvre rechargée
        if (oeuvreComplete?.ArticleScientifique) {
          console.log('🔄 Fallback: ArticleScientifique depuis oeuvre rechargée, id:', oeuvreComplete.ArticleScientifique.id_article_scientifique);
          return { article_scientifique: oeuvreComplete.ArticleScientifique };
        }
        if (oeuvreComplete?.Article) {
          console.log('🔄 Fallback: Article depuis oeuvre rechargée, id:', oeuvreComplete.Article.id_article);
          return { article: oeuvreComplete.Article };
        }
        return {};
      })();

      res.status(201).json({
        success: true,
        message: 'Œuvre créée avec succès',
        data: {
          oeuvre: translateDeep(oeuvreComplete, lang),
          ...createdSpecificPayload
        }
      });

    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error('❌ Erreur création œuvre:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la création de l\'œuvre',
        details: error.message
      });
    }
  }

  /**
   * Mettre à jour une œuvre
   */
  async update(req, res) {
    let transaction;

    try {
      const lang = req.lang || 'fr';  // ⚡ Récupérer la langue
      const { id } = req.params;

      const oeuvre = await this.models.Oeuvre.findByPk(id);
      if (!oeuvre) {
        return res.status(404).json({
          success: false,
          error: 'Œuvre non trouvée'
        });
      }

      // 🔒 Vérification ownership - seul le créateur ou admin peut modifier
      const isAdmin = req.user?.role === 'Admin' || req.user?.isAdmin;
      const isOwner = oeuvre.saisi_par === req.user?.id_user;
      if (!isAdmin && !isOwner) {
        return res.status(403).json({
          success: false,
          error: 'Non autorisé à modifier cette œuvre'
        });
      }

      transaction = await this.sequelize.transaction();

      const {
        titre,
        description,
        id_type_oeuvre,
        id_langue,
        annee_creation,
        prix,
        statut,
        categories,
        tags
      } = req.body;

      const updates = {};

      // ⚡ Gérer les champs multilingues
      if (titre !== undefined) {
        if (typeof titre === 'object' && titre !== null) {
          updates.titre = mergeTranslations(oeuvre.titre, titre);
        } else if (typeof titre === 'string') {
          updates.titre = mergeTranslations(oeuvre.titre, { [lang]: titre });
        }
      }

      if (description !== undefined) {
        if (typeof description === 'object' && description !== null) {
          updates.description = mergeTranslations(oeuvre.description, description);
        } else if (typeof description === 'string') {
          updates.description = mergeTranslations(oeuvre.description, { [lang]: description });
        }
      }

      // Champs normaux
      if (id_type_oeuvre !== undefined) updates.id_type_oeuvre = id_type_oeuvre;
      if (id_langue !== undefined) updates.id_langue = id_langue;
      if (annee_creation !== undefined) updates.annee_creation = annee_creation;
      if (prix !== undefined) updates.prix = prix;
      if (statut !== undefined) updates.statut = statut;

      await oeuvre.update(updates, { transaction });

      // Mettre à jour les relations
      if (categories !== undefined) {
        const categoriesArray = Array.isArray(categories) ? categories : [categories];
        await oeuvre.setCategories(categoriesArray, { transaction });
      }

      if (tags !== undefined) {
        const tagsArray = Array.isArray(tags) ? tags : [tags];
        await oeuvre.setTags(tagsArray, { transaction });
      }

      await transaction.commit();

      // Recharger
      const oeuvreComplete = await this.models.Oeuvre.findByPk(id, {
        include: [
          { model: this.models.TypeOeuvre },
          { model: this.models.Langue },
          { model: this.models.Categorie, through: { attributes: [] } },
          { model: this.models.TagMotCle, as: 'Tags', through: { attributes: [] } }
        ]
      });

      res.json({
        success: true,
        message: 'Œuvre mise à jour avec succès',
        data: translateDeep(oeuvreComplete, lang)
      });

    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error('❌ Erreur mise à jour œuvre:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la mise à jour de l\'œuvre'
      });
    }
  }

  /**
   * Supprimer une œuvre
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      const oeuvre = await this.models.Oeuvre.findByPk(id);
      if (!oeuvre) {
        return res.status(404).json({
          success: false,
          error: 'Œuvre non trouvée'
        });
      }

      // 🔒 Vérification ownership - seul le créateur ou admin peut supprimer
      const isAdmin = req.user?.role === 'Admin' || req.user?.isAdmin;
      const isOwner = oeuvre.saisi_par === req.user?.id_user;
      if (!isAdmin && !isOwner) {
        return res.status(403).json({
          success: false,
          error: 'Non autorisé à supprimer cette œuvre'
        });
      }

      // Soft delete
      await oeuvre.update({ statut: 'archive' });

      res.json({
        success: true,
        message: 'Œuvre supprimée avec succès'
      });

    } catch (error) {
      console.error('❌ Erreur suppression œuvre:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la suppression de l\'œuvre'
      });
    }
  }

  /**
   * ⚡ Récupérer toutes les traductions d'une œuvre (admin)
   */
  async getOeuvreTranslations(req, res) {
    try {
      const { id } = req.params;

      const oeuvre = await this.models.Oeuvre.findByPk(id, {
        attributes: ['id_oeuvre', 'titre', 'description']
      });

      if (!oeuvre) {
        return res.status(404).json({
          success: false,
          error: 'Œuvre non trouvée'
        });
      }

      res.json({
        success: true,
        data: {
          id_oeuvre: oeuvre.id_oeuvre,
          titre: oeuvre.titre,
          description: oeuvre.description
        }
      });

    } catch (error) {
      console.error('❌ Erreur récupération traductions:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * ⚡ Mettre à jour une traduction spécifique (admin)
   */
  async updateOeuvreTranslation(req, res) {
    try {
      const { id, lang } = req.params;
      const { titre, description } = req.body;

      const oeuvre = await this.models.Oeuvre.findByPk(id);
      if (!oeuvre) {
        return res.status(404).json({
          success: false,
          error: 'Œuvre non trouvée'
        });
      }

      const updates = {};

      if (titre) {
        updates.titre = mergeTranslations(oeuvre.titre, { [lang]: titre });
      }

      if (description) {
        updates.description = mergeTranslations(oeuvre.description, { [lang]: description });
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Aucune donnée à mettre à jour'
        });
      }

      await oeuvre.update(updates);

      res.json({
        success: true,
        message: `Traduction ${lang} mise à jour avec succès`,
        data: oeuvre
      });

    } catch (error) {
      console.error('❌ Erreur mise à jour traduction:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Recherche avancée d'œuvres
   */
  async search(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { q, type, categorie, langue, annee_min, annee_max, page = 1, limit = 20 } = req.query;

      if (!q || q.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Le terme de recherche doit contenir au moins 2 caractères'
        });
      }

      const where = {
        statut: 'publie',
        [Op.or]: [
          ...this.buildMultiLangSearchLocal('titre', q),
          ...this.buildMultiLangSearchLocal('description', q)
        ]
      };

      if (type) where.id_type_oeuvre = type;
      if (langue) where.id_langue = langue;
      if (annee_min) where.annee_creation = { ...where.annee_creation, [Op.gte]: annee_min };
      if (annee_max) where.annee_creation = { ...where.annee_creation, [Op.lte]: annee_max };

      const offset = (page - 1) * limit;

      const result = await this.models.Oeuvre.findAndCountAll({
        where,
        include: [
          { model: this.models.TypeOeuvre, attributes: ['nom_type'] },
          { model: this.models.Langue, attributes: ['nom', 'code'] },
          {
            model: this.models.Categorie,
            through: { attributes: [] },
            where: categorie ? { id_categorie: categorie } : undefined,
            required: !!categorie
          }
        ],
        limit: parseInt(limit),
        offset,
        order: [['date_creation', 'DESC']],
        distinct: true
      });

      res.json({
        success: true,
        data: translateDeep(result.rows, lang),
        pagination: {
          total: result.count,
          page: parseInt(page),
          pages: Math.ceil(result.count / limit),
          limit: parseInt(limit)
        },
        query: q,
        lang
      });

    } catch (error) {
      console.error('❌ Erreur recherche œuvres:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recherche'
      });
    }
  }

  /**
   * Récupérer les œuvres de l'utilisateur connecté
   */
  async getMyWorks(req, res) {
    try {
      const lang = req.lang || 'fr';
      const userId = req.user?.id_user;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Utilisateur non authentifié'
        });
      }

      const {
        page = 1,
        limit = 50,
        statut,
        sort = 'recent'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = { saisi_par: userId };

      // Filtre par statut si spécifié, sinon exclure les archivés
      if (statut) {
        where.statut = statut;
      } else {
        const { Op } = require('sequelize');
        where.statut = { [Op.ne]: 'archive' };
      }

      // Tri
      let order;
      switch (sort) {
        case 'recent':
          order = [['date_creation', 'DESC']];
          break;
        case 'title':
          order = [[this.sequelize.literal(`JSON_EXTRACT(\`titre\`, '$.${lang}')`), 'ASC']];
          break;
        case 'year':
          order = [['annee_creation', 'DESC']];
          break;
        default:
          order = [['date_creation', 'DESC']];
      }

      console.log(`📚 Récupération des œuvres pour l'utilisateur ${userId}...`);

      const result = await this.models.Oeuvre.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order,
        include: [
          {
            model: this.models.TypeOeuvre,
            attributes: ['id_type_oeuvre', 'nom_type']
          },
          {
            model: this.models.Langue,
            attributes: ['id_langue', 'nom', 'code']
          },
          {
            model: this.models.Categorie,
            through: { attributes: [] },
            attributes: ['id_categorie', 'nom']
          },
          {
            model: this.models.Media,
            required: false,
            separate: true,
            limit: 1,
            order: [['ordre', 'ASC']]
          }
        ],
        distinct: true
      });

      console.log(`✅ ${result.count} œuvres trouvées pour l'utilisateur ${userId}`);

      // Traduire les résultats
      const translatedOeuvres = translateDeep(result.rows, lang);

      res.json({
        success: true,
        data: {
          oeuvres: translatedOeuvres,
          pagination: {
            total: result.count,
            page: parseInt(page),
            pages: Math.ceil(result.count / limit),
            limit: parseInt(limit)
          }
        },
        lang
      });

    } catch (error) {
      console.error('❌ Erreur récupération mes œuvres:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération de vos œuvres'
      });
    }
  }

  // ========================================================================
  // ALIAS POUR COMPATIBILITÉ AVEC LES ROUTES
  // ========================================================================

  /**
   * Alias pour create
   */
  async createOeuvre(req, res) {
    return this.create(req, res);
  }

  /**
   * Alias pour update
   */
  async updateOeuvre(req, res) {
    return this.update(req, res);
  }

  /**
   * Alias pour delete
   */
  async deleteOeuvre(req, res) {
    return this.delete(req, res);
  }

  /**
   * Alias pour search
   */
  async searchOeuvres(req, res) {
    return this.search(req, res);
  }

  /**
   * Récupérer les statistiques
   */
  async getStatistics(req, res) {
    try {
      const stats = await this.models.Oeuvre.findAll({
        attributes: [
          'statut',
          [this.sequelize.fn('COUNT', '*'), 'count']
        ],
        group: ['statut'],
        raw: true
      });

      const total = stats.reduce((sum, s) => sum + parseInt(s.count), 0);

      res.json({
        success: true,
        data: {
          total,
          parStatut: stats.reduce((acc, s) => {
            acc[s.statut] = parseInt(s.count);
            return acc;
          }, {})
        }
      });
    } catch (error) {
      console.error('❌ Erreur statistiques:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Récupérer les liens de partage d'une œuvre
   */
  async getShareLinks(req, res) {
    try {
      const { id } = req.params;
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      const oeuvreUrl = `${baseUrl}/oeuvres/${id}`;

      res.json({
        success: true,
        data: {
          direct: oeuvreUrl,
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(oeuvreUrl)}`,
          twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(oeuvreUrl)}`,
          linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(oeuvreUrl)}`,
          whatsapp: `https://wa.me/?text=${encodeURIComponent(oeuvreUrl)}`
        }
      });
    } catch (error) {
      console.error('❌ Erreur liens partage:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Upload de médias
   */
  async uploadMedia(req, res) {
    try {
      const { id } = req.params;
      const files = req.files || [];

      if (files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Aucun fichier uploadé'
        });
      }

      const medias = [];
      for (const file of files) {
        const media = await this.models.Media.create({
          id_oeuvre: id,
          type_media: file.mimetype.startsWith('image/') ? 'image' : 'document',
          url: `/uploads/oeuvres/${file.filename}`,
          titre: file.originalname,
          visible_public: true
        });
        medias.push(media);
      }

      res.json({
        success: true,
        message: `${medias.length} média(s) uploadé(s)`,
        data: medias
      });
    } catch (error) {
      console.error('❌ Erreur upload média:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'upload'
      });
    }
  }

  /**
   * Réordonner les médias
   */
  async reorderMedias(req, res) {
    try {
      const { mediaIds } = req.body;

      for (let i = 0; i < mediaIds.length; i++) {
        await this.models.Media.update(
          { ordre: i + 1 },
          { where: { id_media: mediaIds[i] } }
        );
      }

      res.json({
        success: true,
        message: 'Ordre des médias mis à jour'
      });
    } catch (error) {
      console.error('❌ Erreur réordonnancement:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Supprimer un média
   */
  async deleteMedia(req, res) {
    try {
      const { mediaId } = req.params;

      const media = await this.models.Media.findByPk(mediaId);
      if (!media) {
        return res.status(404).json({
          success: false,
          error: 'Média non trouvé'
        });
      }

      await media.destroy();

      res.json({
        success: true,
        message: 'Média supprimé'
      });
    } catch (error) {
      console.error('❌ Erreur suppression média:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Valider une œuvre (admin)
   */
  async validateOeuvre(req, res) {
    try {
      const { id } = req.params;
      const { statut, raison_rejet } = req.body;

      const oeuvre = await this.models.Oeuvre.findByPk(id);
      if (!oeuvre) {
        return res.status(404).json({
          success: false,
          error: 'Œuvre non trouvée'
        });
      }

      const updates = { statut };
      if (statut === 'rejete' && raison_rejet) {
        updates.raison_rejet = raison_rejet;
      }

      await oeuvre.update(updates);

      res.json({
        success: true,
        message: `Œuvre ${statut === 'publie' ? 'publiée' : 'rejetée'} avec succès`,
        data: oeuvre
      });
    } catch (error) {
      console.error('❌ Erreur validation:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Rechercher des intervenants
   */
  async searchIntervenants(req, res) {
    try {
      const { q } = req.query;

      if (!q || q.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Le terme de recherche doit contenir au moins 2 caractères'
        });
      }

      const users = await this.models.User.findAll({
        where: {
          [Op.or]: [
            { nom: { [Op.like]: `%${q}%` } },
            { prenom: { [Op.like]: `%${q}%` } },
            { email: { [Op.like]: `%${q}%` } }
          ],
          statut: 'actif'
        },
        attributes: ['id_user', 'nom', 'prenom', 'email'],
        limit: 10
      });

      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('❌ Erreur recherche intervenants:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Vérifier un email
   */
  async checkEmail(req, res) {
    try {
      const { email } = req.body;

      const user = await this.models.User.findOne({
        where: { email },
        attributes: ['id_user', 'nom', 'prenom', 'email']
      });

      res.json({
        success: true,
        exists: !!user,
        user: user || null
      });
    } catch (error) {
      console.error('❌ Erreur vérification email:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }
}

module.exports = OeuvreController;