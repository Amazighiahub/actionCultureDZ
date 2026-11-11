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

  it('chaque message à variables (`…${x}…`) a son modèle traduit (audit V11 FRM-17)', () => {
    // Même appels d'erreur que plus haut, mais pour un texte entre accents graves ; une suite « + '…' »
    // (phrase coupée sur deux lignes) est recollée. Chaque ${…} devient « 7 », puis le texte doit avoir
    // la forme d'un modèle de la section _modeles.
    const GABARIT = '`((?:[^`\\\\]|\\\\.)*)`((?:\\s*\\+\\s*\'(?:[^\'\\\\]|\\\\.)*\')*)';
    const APPELS = [
      `_(?:validation|conflict|forbidden|unauthorized|badRequest|notFound)Error\\(\\s*`,
      `AppError\\.(?!notFound)\\w+\\(\\s*`, 'new AppError\\(\\s*', 'new Error\\(\\s*', '\\berreur\\(\\s*',
      '\\b(?:error|erreur):\\s*', 'throw this\\._\\w+\\(\\s*',
      // message: d'un détail de champ seulement (les notifications, enregistrées en base, sont à part)
      'field:\\s*[^,{}]+,\\s*message:\\s*',
    ].map((a) => new RegExp(a + GABARIT, 'g'));
    // Internes (500 masqués, journaux, démarrage) ou phrases de succès hors de ce constat
    const INTERNES = [/^Module non trouvé/, /is not a function$/, /^Le template /, /^Événement 7 introuvable$/,
      /^Upload Cloudinary/, /^Service inconnu/, /^CircuitBreaker/, /^PDF non traité/, /^Account temporarily/, /^Retry in/,
      /^Invalid creation year/, /^Field '/, /signalements traités$/, / pour 7 utilisateurs$/, /^7 non trouvé\(e\)$/,
      /^Resource with id 7$/, /^❌ ERREUR CRITIQUE/];
    const { correspondAUnModele } = require('../../utils/traductionServeur');
    const manquants = new Set();
    for (const dossier of DOSSIERS) {
      for (const fichier of fichiers(path.join(RACINE, dossier))) {
        const source = fs.readFileSync(fichier, 'utf8');
        for (const appel of APPELS) {
          for (const m of source.matchAll(appel)) {
            if (!m[1].includes('${')) continue;
            const suite = [...(m[2] || '').matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((s) => s[1]).join('');
            const texte = (m[1] + suite).replace(/\$\{(?:[^{}]|\{[^}]*\})*\}/g, '7').replace(/\\(['"`])/g, '$1');
            if (!FRANCAIS.test(texte.replace(/7/g, '')) || INTERNES.some((r) => r.test(texte))) continue;
            if (!correspondAUnModele(texte)) manquants.add(`${path.relative(RACINE, fichier)} : ${texte}`);
          }
        }
      }
    }
    expect([...manquants]).toEqual([]);
  });

  it('modèles : nombres et textes recopiés, libellés traduits, libellé inconnu laissé en français', () => {
    expect(traduireTexteServeur('Il en reste 3 seulement.', 'ar')).toBe('لم يتبقَّ سوى 3.');
    expect(traduireTexteServeur('Numéro de CCP : de 6 à 12 chiffres', 'en')).toBe('CCP number: 6 to 12 digits');
    expect(traduireTexteServeur('Le profil « Étudiant » est en double', 'en')).toBe('The profile “Étudiant” appears twice');
    expect(traduireTexteServeur('Consignes invalide', 'ar')).toBe('التعليمات: قيمة غير صالحة');
    expect(traduireTexteServeur('Inconnu invalide', 'ar')).toBe('Inconnu invalide');
    // Une phrase exacte du dictionnaire passe avant les modèles
    expect(traduireTexteServeur('Téléphone invalide', 'ar')).toBe(ar['Téléphone invalide']);
  });

  it('mêmes modèles et libellés en arabe et en anglais, mêmes repères que le français', () => {
    expect(Object.keys(ar._modeles).sort()).toEqual(Object.keys(en._modeles).sort());
    expect(Object.keys(ar._libelles).sort()).toEqual(Object.keys(en._libelles).sort());
    const reperes = (s) => (s.match(/\{[ntl]\d\}/g) || []).sort();
    for (const [cle, texte] of Object.entries(ar._modeles)) {
      expect([cle, reperes(texte)]).toEqual([cle, reperes(cle)]);
      expect([cle, reperes(en._modeles[cle])]).toEqual([cle, reperes(cle)]);
    }
  });
});
