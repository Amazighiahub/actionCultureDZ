/**
 * Messages français des services, DTO et contrôleurs, traduits à l'envoi (audit V11 FRM-5, lot 2).
 * Garde-fou : tout nouveau message visible doit être ajouté dans i18n/serveur/ar.json et en.json.
 */
const fs = require('fs');
const path = require('path');
const { traduireCorps, traduireTexteServeur } = require('../../utils/traductionServeur');
const ar = require('../../i18n/serveur/ar.json');
const en = require('../../i18n/serveur/en.json');

const RACINE = path.join(__dirname, '../..');
const DOSSIERS = ['services', 'dto', 'controllers', 'middlewares', 'repositories', 'utils', 'routes'];
// Erreurs internes (500, masquées en production), réponses hors navigateur, titres de documentation,
// et messages techniques déjà remplacés par le site (CSRF, délai)
const HORS_PERIMETRE = new Set([
  'Modèle Favori non disponible', 'Modèle LieuMedia non disponible', 'Modèles de notation non disponibles',
  'Modèles non disponibles', 'Provider SMS non configuré', 'Provider WhatsApp non configuré',
  'Queue non disponible', 'UserRepository non disponible', 'Origine non autorisee',
  'API Action Culture - Full Documentation', 'API Intervenants i18n - Documentation',
  'API Notifications i18n - Documentation', 'API Upload - Action Culture', 'Auth service unavailable',
  'Buffer vide ou trop court', 'Invalid email headers',
  'Module article blocks operational', 'Service unhealthy', 'Type de fichier non autorise',
  // Erreurs de démarrage, de configuration ou internes (journalisées, jamais renvoyées telles quelles)
  'Modèle Signalement non disponible', 'Job non trouvé', 'Requetes sans origin non autorisees en production',
  'ServiceContainer non initialisé. Appelez initialize(models) d\'abord.', 'Configuration Twilio incomplète',
  'Configuration Vonage incomplète', 'Configuration MessageBird incomplète', 'Configuration Meta WhatsApp incomplète',
  'models doit contenir une instance sequelize', 'authMiddleware doit être un objet avec les méthodes authenticate, isAdmin, etc.',
  '❌ ERREUR CRITIQUE: JWT_SECRET non défini en production!',
  '❌ ERREUR CRITIQUE: JWT_SECRET contient une valeur d\'exemple non sécurisée!',
  '[SECURITY] Redis en production sans authentification — configurer REDIS_PASSWORD ou inclure les credentials dans REDIS_URL',
]);
// Appels d'erreur : tout texte avec une espace est un message pour la personne (avec ou sans accent)
const APPELS_ERREUR = 3;
const FRANCAIS = /[éèêàùçôîûœ]|\b(le|la|les|du|des|est|requis|requise|invalide|introuvable|vous|non|pas|une?|déjà|aucun|aucune|cette|votre|doit)\b/i;
// Texte entre apostrophes ou entre guillemets (avant : apostrophes seulement, d'où des oublis, audit V11 FRM-17)
const CH = `(?:'((?:[^'\\\\\\n]|\\\\.)*)'|"((?:[^"\\\\\\n]|\\\\.)*)")`;
const MOTIFS = [
  new RegExp(`_(?:validation|conflict|forbidden|unauthorized|badRequest|notFound)Error\\(\\s*${CH}`, 'g'),
  new RegExp(`AppError\\.\\w+\\(\\s*${CH}`, 'g'),
  new RegExp(`new AppError\\(\\s*${CH}`, 'g'),
  new RegExp(`\\bmessage:\\s*${CH}`, 'g'),
  new RegExp(`\\berror:\\s*${CH}`, 'g'),
  // Erreurs lancées avec un statut (new Error + statusCode), aide erreur(), clé erreur:, limites par
  // personne, phrases mises en constante
  new RegExp(`new Error\\(\\s*${CH}`, 'g'),
  new RegExp(`\\berreur\\(\\s*${CH}`, 'g'),
  new RegExp(`\\berreur:\\s*${CH}`, 'g'),
  new RegExp(`limiteParPersonne\\([^)]*?,\\s*${CH}\\s*\\)`, 'g'),
  new RegExp(`\\bMESSAGE_[A-Z_]+\\s*=\\s*${CH}`, 'g'),
];

const fichiers = (dossier) => fs.readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
  const chemin = path.join(dossier, e.name);
  if (e.isDirectory()) return fichiers(chemin);
  return e.name.endsWith('.js') ? [chemin] : [];
});

describe('messages du serveur traduits à l’envoi', () => {
  it('traduit le message principal et le détail des champs, sans toucher au reste', () => {
    const corps = {
      success: false,
      error: 'Données invalides',
      code: 'VALIDATION_ERROR',
      details: [{ field: 'email', message: 'Format d\'email invalide' }, { field: 'x', message: 'Texte inconnu' }],
      errors: ['Le prénom est requis'],
    };
    const traduit = traduireCorps(corps, 'ar');
    expect(traduit.error).toBe('بيانات غير صالحة');
    expect(traduit.code).toBe('VALIDATION_ERROR');
    expect(traduit.details[0]).toEqual({ field: 'email', message: 'صيغة البريد الإلكتروني غير صالحة' });
    expect(traduit.details[1].message).toBe('Texte inconnu');
    expect(traduit.errors[0]).toBe('الاسم الأول مطلوب');
    // L'original n'est pas modifié
    expect(corps.error).toBe('Données invalides');
  });

  it('« … non trouvé(e) » : nom de la ressource traduit, identifiant retiré', () => {
    expect(traduireTexteServeur('Commande non trouvé(e)', 'ar')).toBe('لم يُعثر على: الطلب');
    expect(traduireTexteServeur('Site patrimoine non trouvé(e)', 'en')).toBe('Heritage site not found');
    expect(traduireTexteServeur('Resource with id 42 non trouvé(e)', 'ar')).toBe('لم يُعثر على: عنصر');
    expect(traduireTexteServeur('Inconnu non trouvé(e)', 'ar')).toBe('Inconnu non trouvé(e)');
  });

  it('français et tamazight : inchangé', () => {
    const corps = { success: false, error: 'Cet email est déjà utilisé' };
    expect(traduireCorps(corps, 'fr')).toBe(corps);
    expect(traduireCorps(corps, 'tz-ltn')).toBe(corps);
    expect(traduireTexteServeur('Cet email est déjà utilisé', 'en')).toBe('This email is already in use');
  });

  it('chaque message français visible a sa traduction en arabe et en anglais', () => {
    const manquants = new Set();
    for (const dossier of DOSSIERS) {
      for (const fichier of fichiers(path.join(RACINE, dossier))) {
        const source = fs.readFileSync(fichier, 'utf8');
        MOTIFS.forEach((motif, rang) => {
          for (const m of source.matchAll(motif)) {
            const texte = (m[1] ?? m[2]).replace(/\\(['"])/g, '$1');
            if (texte.includes('\n') || HORS_PERIMETRE.has(texte) || /^[a-z]+(\.[a-zA-Z]+)+$/.test(texte)) continue;
            // AppError.notFound('<nom>') : le nom doit être traduit (message « <nom> non trouvé(e) »)
            if (/AppError\.notFound\(/.test(m[0])) {
              if (!ar._ressources[texte] || !en._ressources[texte]) manquants.add(`${path.relative(RACINE, fichier)} : ressource ${texte}`);
              continue;
            }
            const message = rang < APPELS_ERREUR ? texte.includes(' ') : FRANCAIS.test(texte);
            if (message && (!ar[texte] || !en[texte])) manquants.add(`${path.relative(RACINE, fichier)} : ${texte}`);
          }
        });
      }
    }
    expect([...manquants]).toEqual([]);
  });
});
