/**
 * Audit Frontend ↔ Backend Integration
 * Tests all API endpoints that the frontend calls, through the Vite proxy (port 8080)
 */
const http = require('http');

const BASE = 'http://localhost:8080';
const results = { pass: 0, fail: 0, errors: [] };
let visitorToken = null;
let adminToken = null;

function request(method, path, body, token) {
  return new Promise((resolve) => {
    const url = new URL(path.startsWith('http') ? path : `${BASE}/api${path}`);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname, port: url.port, path: url.pathname + url.search,
      method, headers: { 'Content-Type': 'application/json', 'X-Language': 'fr' },
      timeout: 15000
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(opts, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        let body = null;
        try { body = JSON.parse(buf); } catch (e) { body = buf; }
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: { error: 'timeout' } }); });
    if (data) req.write(data);
    req.end();
  });
}

function log(cat, name, ok, detail) {
  const icon = ok ? '✅' : '❌';
  console.log(`  ${icon} ${name} (${detail})`);
  if (ok) results.pass++;
  else { results.fail++; results.errors.push({ cat, name, detail }); }
}

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log('🔗 Audit Frontend ↔ Backend via Vite Proxy (localhost:8080)\n');

  // ====== 1. SYSTEM / HEALTH ======
  console.log('🔧 === SYSTÈME ===');
  let r = await request('GET', '/health', null, null);
  // health is at root, not /api/health
  if (r.status === 0 || r.status === 404) {
    r = await request('GET', `${BASE}/health`);
  }
  log('sys', 'Health check', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/');
  log('sys', 'API doc root', r.status === 200, `endpoints=${r.body?.endpoints ? Object.keys(r.body.endpoints).length : '?'}`);

  // ====== 2. METADATA (frontend: API_ENDPOINTS.metadata.*) ======
  console.log('\n📋 === METADATA ===');
  r = await request('GET', '/metadata/');
  log('meta', 'metadata.all → /metadata/', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/metadata/hierarchie');
  log('meta', 'metadata.hierarchy.complete', r.status === 200, `types=${r.body?.data?.length ?? '?'}`);

  r = await request('GET', '/metadata/types-oeuvres');
  log('meta', 'metadata.typesOeuvres', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/metadata/langues');
  log('meta', 'metadata.langues', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/metadata/wilayas');
  log('meta', 'metadata.geographie.wilayas', r.status === 200, `count=${r.body?.data?.length ?? '?'}`);

  r = await request('GET', '/metadata/genres');
  log('meta', 'metadata.genres', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/metadata/tags');
  log('meta', 'metadata.tags.list', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/metadata/types-organisations');
  log('meta', 'metadata.typesOrganisations', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/metadata/materiaux');
  log('meta', 'metadata.materiaux.list', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/metadata/techniques');
  log('meta', 'metadata.techniques.list', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/metadata/editeurs');
  log('meta', 'metadata.editeurs.list', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/metadata/types-users');
  log('meta', 'metadata.typesUsers', r.status === 200, `status=${r.status}`);

  // ====== 3. AUTH (frontend: API_ENDPOINTS.auth.*) ======
  console.log('\n🔐 === AUTH ===');
  const ts = Date.now();
  const visitorEmail = `audit-v-${ts}@test.com`;
  const proEmail = `audit-p-${ts}@test.com`;

  await delay(500);
  r = await request('POST', '/users/register', {
    nom: 'AuditV', prenom: 'Test', email: visitorEmail,
    password: 'AuditTest1234!', id_type_user: 1, accepte_conditions: true
  });
  log('auth', 'auth.register (visiteur)', r.status === 201, `status=${r.status}`);
  visitorToken = r.body?.data?.token;

  await delay(500);
  r = await request('POST', '/users/register', {
    nom: 'AuditP', prenom: 'Pro', email: proEmail,
    password: 'AuditTest1234!', id_type_user: 6, accepte_conditions: true
  });
  log('auth', 'auth.register (professionnel)', r.status === 201, `status=${r.status}`);

  await delay(500);
  r = await request('POST', '/users/login', { email: visitorEmail, password: 'AuditTest1234!' });
  log('auth', 'auth.login', r.status === 200 && r.body?.data?.token, `status=${r.status}`);
  visitorToken = r.body?.data?.token || visitorToken;

  r = await request('POST', '/users/check-email', { email: visitorEmail });
  log('auth', 'auth.checkEmail (exists)', r.status === 200 && r.body?.exists === true, `exists=${r.body?.exists}`);

  r = await request('POST', '/users/check-email', { email: 'noexist@x.com' });
  log('auth', 'auth.checkEmail (not exists)', r.status === 200 && r.body?.exists === false, `exists=${r.body?.exists}`);

  r = await request('GET', '/users/types');
  log('auth', 'auth.typesUtilisateurs', r.status === 200, `count=${r.body?.data?.length ?? '?'}`);

  r = await request('POST', '/users/refresh-token', { refreshToken: visitorToken });
  log('auth', 'auth.refreshToken', r.status === 200, `status=${r.status}`);

  // ====== 4. PROFIL (frontend: API_ENDPOINTS.auth.me, updateProfile, changePassword) ======
  console.log('\n👤 === PROFIL UTILISATEUR ===');
  if (visitorToken) {
    r = await request('GET', '/users/profile', null, visitorToken);
    log('profil', 'auth.me → GET /users/profile', r.status === 200, `email=${r.body?.data?.email}`);

    r = await request('PUT', '/users/profile', { biographie: 'Test audit' }, visitorToken);
    log('profil', 'auth.updateProfile → PUT /users/profile', r.status === 200, `status=${r.status}`);

    r = await request('POST', '/users/change-password', {
      current_password: 'AuditTest1234!', new_password: 'AuditTest12345!'
    }, visitorToken);
    log('profil', 'auth.changePassword', r.status === 200, `status=${r.status}`);
  }

  // ====== 5. PUBLIC RESOURCES ======
  console.log('\n🌐 === RESSOURCES PUBLIQUES ===');

  // Oeuvres (frontend: API_ENDPOINTS.oeuvres.*)
  r = await request('GET', '/oeuvres');
  log('public', 'oeuvres.list', r.status === 200, `count=${r.body?.data?.length ?? r.body?.pagination?.total ?? '?'}`);

  r = await request('GET', '/oeuvres/recent');
  log('public', 'oeuvres.recent', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/oeuvres/search?q=test');
  log('public', 'oeuvres.search', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/oeuvres/statistics');
  log('public', 'oeuvres.statistics', r.status === 200, `status=${r.status}`);

  // Événements (frontend: API_ENDPOINTS.evenements.*)
  r = await request('GET', '/evenements');
  log('public', 'evenements.list', r.status === 200, `count=${r.body?.data?.length ?? r.body?.pagination?.total ?? '?'}`);

  r = await request('GET', '/evenements/upcoming');
  log('public', 'evenements.upcoming', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/evenements/statistics');
  log('public', 'evenements.statistics', r.status === 200, `status=${r.status}`);

  // Patrimoine
  r = await request('GET', '/patrimoine');
  log('public', 'patrimoine.sites', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/patrimoine/search?q=test');
  log('public', 'patrimoine.recherche', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/patrimoine/types');
  log('public', 'patrimoine.types', r.status === 200, `status=${r.status}`);

  // Artisanat
  r = await request('GET', '/artisanat');
  log('public', 'artisanat.list', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/artisanat/search?q=test');
  log('public', 'artisanat.search', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/artisanat/statistics');
  log('public', 'artisanat.statistics', r.status === 200, `status=${r.status}`);

  // Lieux
  r = await request('GET', '/lieux');
  log('public', 'lieux.list', r.status === 200, `status=${r.status}`);

  // Parcours
  r = await request('GET', '/parcours');
  log('public', 'parcours.list (patrimoine.parcours)', r.status === 200, `status=${r.status}`);

  // Services
  r = await request('GET', '/services');
  log('public', 'services.list', r.status === 200, `status=${r.status}`);

  // Intervenants
  r = await request('GET', '/intervenants');
  log('public', 'metadata.intervenants.list', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/intervenants/search?q=test');
  log('public', 'metadata.intervenants.search', r.status === 200, `status=${r.status}`);

  // Commentaires (by resource)
  r = await request('GET', '/commentaires/oeuvre/1');
  log('public', 'commentaires.oeuvre(1)', r.status === 200 || r.status === 404, `status=${r.status}`);

  // Programmes
  r = await request('GET', '/programmes/evenement/1');
  log('public', 'programmes.byEvent(1)', r.status === 200 || r.status === 404, `status=${r.status}`);

  // ====== 6. NOTIFICATIONS (auth required) ======
  console.log('\n🔔 === NOTIFICATIONS ===');
  if (visitorToken) {
    r = await request('GET', '/notifications/list', null, visitorToken);
    log('notif', 'notifications.list', r.status === 200, `status=${r.status}`);

    r = await request('GET', '/notifications/summary', null, visitorToken);
    log('notif', 'notifications.summary', r.status === 200, `unread=${r.body?.data?.non_lues ?? '?'}`);

    r = await request('GET', '/notifications/preferences', null, visitorToken);
    log('notif', 'notifications.preferences', r.status === 200, `status=${r.status}`);

    r = await request('PUT', '/notifications/preferences', {
      global: { email: true }, types: { evenements: true }
    }, visitorToken);
    log('notif', 'notifications.updatePreferences', r.status === 200, `status=${r.status}`);

    r = await request('PUT', '/notifications/read-all', null, visitorToken);
    log('notif', 'notifications.markAllAsRead', r.status === 200, `status=${r.status}`);
  }

  // ====== 7. FAVORIS (auth required) ======
  console.log('\n❤️ === FAVORIS ===');
  if (visitorToken) {
    r = await request('GET', '/favoris', null, visitorToken);
    log('fav', 'favoris.list', r.status === 200, `status=${r.status}`);

    r = await request('GET', '/favoris/stats', null, visitorToken);
    log('fav', 'favoris.stats', r.status === 200, `status=${r.status}`);

    r = await request('GET', '/favoris/check/oeuvre/1', null, visitorToken);
    log('fav', 'favoris.check(oeuvre,1)', r.status === 200, `status=${r.status}`);
  }

  // ====== 8. UPLOAD ======
  console.log('\n📁 === UPLOAD ===');
  r = await request('GET', '/upload/');
  log('upload', 'upload.info', r.status === 200, `status=${r.status}`);

  // ====== 9. TRACKING ======
  console.log('\n📊 === TRACKING ===');
  if (visitorToken) {
    r = await request('POST', '/tracking/view', {
      type_entite: 'oeuvre', id_entite: 1
    }, visitorToken);
    log('tracking', 'tracking.view', r.status === 200 || r.status === 201, `status=${r.status}`);
  }

  // ====== 10. SIGNALEMENTS ======
  console.log('\n🚩 === SIGNALEMENTS ===');
  if (visitorToken) {
    r = await request('GET', '/signalement/mes-signalements', null, visitorToken);
    log('signal', 'signalements.mesSignalements', r.status === 200, `status=${r.status}`);
  }

  // ====== 11. ADMIN DASHBOARD ======
  console.log('\n📊 === DASHBOARD ADMIN ===');
  await delay(1000);
  const adminCreds = [
    { email: 'admin@actionculture.dz', password: 'admin123' },
    { email: 'admin@actionculture.dz', password: 'Admin1234!Admin' },
  ];
  for (const cred of adminCreds) {
    await delay(500);
    r = await request('POST', '/users/login', cred);
    if (r.body?.data?.token) { adminToken = r.body.data.token; break; }
  }

  if (adminToken) {
    log('admin', 'Admin login', true, 'OK');

    // dashboard.overview
    r = await request('GET', '/dashboard/overview', null, adminToken);
    log('admin', 'dashboard.overview', r.status === 200, `status=${r.status}`);

    // dashboard.stats
    r = await request('GET', '/dashboard/stats', null, adminToken);
    log('admin', 'dashboard.stats', r.status === 200, `status=${r.status}`);

    // dashboard.allUsers
    r = await request('GET', '/dashboard/users', null, adminToken);
    log('admin', 'dashboard.allUsers', r.status === 200, `status=${r.status}`);

    // dashboard.pendingUsers
    r = await request('GET', '/dashboard/users/pending', null, adminToken);
    log('admin', 'dashboard.pendingUsers', r.status === 200, `status=${r.status}`);

    // dashboard.usersStats
    r = await request('GET', '/dashboard/users/stats', null, adminToken);
    log('admin', 'dashboard.usersStats', r.status === 200, `status=${r.status}`);

    // dashboard.pendingOeuvres
    r = await request('GET', '/dashboard/content/pending-oeuvres', null, adminToken);
    log('admin', 'dashboard.pendingOeuvres', r.status === 200, `status=${r.status}`);

    // dashboard.contentStats
    r = await request('GET', '/dashboard/content/stats', null, adminToken);
    log('admin', 'dashboard.contentStats', r.status === 200, `status=${r.status}`);

    // dashboard.moderationQueue
    r = await request('GET', '/dashboard/moderation/queue', null, adminToken);
    log('admin', 'dashboard.moderationQueue', r.status === 200, `status=${r.status}`);

    // dashboard.signalements
    r = await request('GET', '/dashboard/moderation/signalements', null, adminToken);
    log('admin', 'dashboard.signalements', r.status === 200, `status=${r.status}`);

    // dashboard.advancedAnalytics
    r = await request('GET', '/dashboard/analytics/advanced', null, adminToken);
    log('admin', 'dashboard.advancedAnalytics', r.status === 200, `status=${r.status}`);

    // dashboard.auditLogs (requires Super Admin)
    r = await request('GET', '/dashboard/audit/logs', null, adminToken);
    log('admin', 'dashboard.auditLogs', r.status === 200 || r.status === 403, `status=${r.status}`);

    // dashboard.activityReport
    r = await request('GET', '/dashboard/reports/activity', null, adminToken);
    log('admin', 'dashboard.activityReport', r.status === 200, `status=${r.status}`);

    // Admin users management via /users
    r = await request('GET', '/users', null, adminToken);
    log('admin', 'auth.admin.getAllUsers', r.status === 200, `count=${r.body?.data?.length ?? '?'}`);

    r = await request('GET', '/users/pending', null, adminToken);
    log('admin', 'auth.admin.getPendingProfessionals', r.status === 200, `status=${r.status}`);

    r = await request('GET', '/users/stats', null, adminToken);
    log('admin', 'auth.admin.globalStatistics', r.status === 200, `status=${r.status}`);
  } else {
    log('admin', 'Admin login', false, 'Could not authenticate admin');
  }

  // ====== 12. ESPACE PROFESSIONNEL ======
  console.log('\n💼 === ESPACE PROFESSIONNEL ===');
  if (visitorToken) {
    // These should return 403 for a visitor
    r = await request('GET', '/professionnel/dashboard', null, visitorToken);
    log('pro', 'professionnel.dashboard (visitor→403)', r.status === 403, `status=${r.status}`);

    r = await request('GET', '/professionnel/oeuvres', null, visitorToken);
    log('pro', 'professionnel.oeuvres (visitor→403)', r.status === 403, `status=${r.status}`);

    r = await request('GET', '/professionnel/evenements', null, visitorToken);
    log('pro', 'professionnel.evenements (visitor→403)', r.status === 403, `status=${r.status}`);
  }

  // ====== 13. SECURITY ======
  console.log('\n🛡️ === SÉCURITÉ ===');
  r = await request('GET', '/users/profile');
  log('sec', 'Profile sans token → 401', r.status === 401, `status=${r.status}`);

  r = await request('GET', '/dashboard/overview');
  log('sec', 'Dashboard sans token → 401', r.status === 401, `status=${r.status}`);

  r = await request('GET', '/dashboard/overview', null, visitorToken);
  log('sec', 'Dashboard visiteur → 403', r.status === 403, `status=${r.status}`);

  r = await request('GET', '/users/profile', null, 'invalid-token-xyz');
  log('sec', 'Token invalide → 401', r.status === 401, `status=${r.status}`);

  r = await request('GET', '/nonexistent-route');
  log('sec', 'Route inexistante → 404', r.status === 404, `status=${r.status}`);

  // ====== 14. ORGANISATIONS ======
  console.log('\n🏢 === ORGANISATIONS ===');
  r = await request('GET', '/organisations/types');
  log('org', 'organisations.types', r.status === 200, `status=${r.status}`);

  // ====== SUMMARY ======
  console.log('\n═══════════════════════════════════════════════');
  console.log('📊 RÉSUMÉ AUDIT FRONT ↔ BACK');
  console.log('═══════════════════════════════════════════════');
  console.log(`✅ ${results.pass} tests passés`);
  console.log(`❌ ${results.fail} tests échoués`);
  console.log(`📊 Total: ${results.pass + results.fail} tests`);

  if (results.errors.length > 0) {
    console.log('\n❌ Détails des échecs:');
    for (const e of results.errors) {
      console.log(`   [${e.cat}] ${e.name}: ${e.detail}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════');
  const pct = Math.round((results.pass / (results.pass + results.fail)) * 100);
  console.log(`Score: ${pct}% (${results.pass}/${results.pass + results.fail})`);
  console.log('═══════════════════════════════════════════════');
}

run().catch(e => console.error('Fatal:', e));
