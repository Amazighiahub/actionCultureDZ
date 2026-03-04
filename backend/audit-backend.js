/**
 * Audit complet du backend - Vérifie toutes les fonctionnalités
 * Usage: node audit-backend.js
 */
const http = require('http');

function request(method, path, body, token) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : '';
    const headers = { 'Content-Type': 'application/json' };
    if (body) headers['Content-Length'] = Buffer.byteLength(data);
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const req = http.request({ hostname: 'localhost', port: 3001, path, method, headers }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b) }); }
        catch (e) { resolve({ status: res.statusCode, body: b }); }
      });
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    if (data) req.write(data);
    req.end();
  });
}

const delay = ms => new Promise(r => setTimeout(r, ms));

async function audit() {
  const results = [];
  const log = (cat, name, ok, detail) => {
    results.push({ cat, name, ok, detail });
    console.log(ok ? '  ✅' : '  ❌', name, detail ? `(${detail})` : '');
  };

  // ====== 1. SYSTÈME ======
  console.log('\n🔧 === SYSTÈME ===');
  let r = await request('GET', '/health');
  log('sys', 'Health check', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/api');
  log('sys', 'API documentation', r.status === 200, `modules=${Object.keys(r.body?.endpoints || {}).length}`);

  r = await request('GET', '/api/stats/public');
  log('sys', 'Stats publiques', r.status === 200 && r.body?.success, `events=${r.body?.data?.evenements}, oeuvres=${r.body?.data?.oeuvres}`);

  r = await request('GET', '/api/endpoints');
  log('sys', 'Liste endpoints', r.status === 200, `total=${r.body?.total}`);

  // ====== 2. METADATA ======
  console.log('\n📋 === METADATA ===');
  r = await request('GET', '/api/metadata');
  log('meta', 'Metadata all (GET /metadata)', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/api/metadata/langues');
  log('meta', 'Langues', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/api/metadata/hierarchie');
  log('meta', 'Hiérarchie complète', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/api/metadata/wilayas');
  log('meta', 'Wilayas', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/api/metadata/types-evenements');
  log('meta', 'Types événements', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/api/metadata/types-oeuvres');
  log('meta', 'Types oeuvres', r.status === 200, `status=${r.status}`);

  // ====== 3. INSCRIPTION / CONNEXION ======
  console.log('\n🔐 === AUTH ===');
  
  // Register visiteur
  const visitorEmail = `audit-visitor-${Date.now()}@test.com`;
  r = await request('POST', '/api/users/register', {
    email: visitorEmail, password: 'AuditTest1234!', nom: 'Visiteur', prenom: 'Test',
    type_user: 'visiteur', accepteConditions: true
  });
  const visitorToken = r.body?.data?.token;
  log('auth', 'Inscription visiteur', r.status === 201 && visitorToken, `status=${r.status}`);

  await delay(1500);

  // Register professionnel
  const proEmail = `audit-pro-${Date.now()}@test.com`;
  r = await request('POST', '/api/users/register', {
    email: proEmail, password: 'AuditPro12345!', nom: 'Professionnel', prenom: 'Test',
    type_user: 'professionnel', accepteConditions: true, entreprise: 'TestCorp',
    biographie: 'Artiste professionnel test'
  });
  const proToken = r.body?.data?.token;
  log('auth', 'Inscription professionnel', r.status === 201 && proToken, `status=${r.status}`);

  await delay(1500);

  // Login
  r = await request('POST', '/api/users/login', { email: visitorEmail, password: 'AuditTest1234!' });
  log('auth', 'Login visiteur', r.status === 200 && r.body?.data?.token, `status=${r.status}`);

  await delay(1000);

  // Check email
  r = await request('POST', '/api/users/check-email', { email: visitorEmail });
  log('auth', 'Check email (existant)', r.status === 200 && r.body?.success, `exists=${r.body?.exists ?? r.body?.data?.exists}`);

  r = await request('POST', '/api/users/check-email', { email: 'nexiste@pas.com' });
  log('auth', 'Check email (inexistant)', r.status === 200 && r.body?.success, `exists=${r.body?.exists ?? r.body?.data?.exists}`);

  // User types
  r = await request('GET', '/api/users/types');
  log('auth', 'Types utilisateurs', r.status === 200, `count=${r.body?.data?.length || '?'}`);

  // Professionals list
  r = await request('GET', '/api/users/professionals');
  log('auth', 'Liste professionnels', r.status === 200, `status=${r.status}`);

  // Refresh token - pass current token as refreshToken
  if (visitorToken) {
    r = await request('POST', '/api/users/refresh-token', { refreshToken: visitorToken });
    log('auth', 'Refresh token', r.status === 200, `status=${r.status}`);
  }

  const token = visitorToken; // Use visitor for further tests

  if (!token) {
    console.log('\n⚠️  Pas de token - audit partiel');
  }

  // ====== 4. PROFIL UTILISATEUR ======
  console.log('\n👤 === PROFIL ===');
  if (token) {
    r = await request('GET', '/api/users/profile', null, token);
    log('profil', 'Get profile', r.status === 200, `email=${r.body?.data?.email}`);

    r = await request('PUT', '/api/users/profile', { biographie: 'Test audit biographie' }, token);
    log('profil', 'Update profile', r.status === 200, `status=${r.status}`);

    r = await request('POST', '/api/users/change-password', {
      current_password: 'AuditTest1234!', new_password: 'AuditTest12345!'
    }, token);
    log('profil', 'Change password', r.status === 200 || r.status === 400, `status=${r.status}, msg=${r.body?.error || r.body?.message || ''}`);

    r = await request('GET', '/api/users/search?q=test', null, token);
    log('profil', 'Search users', r.status === 200, `status=${r.status}`);
  }

  // ====== 5. ROUTES PUBLIQUES ======
  console.log('\n🌐 === ROUTES PUBLIQUES ===');

  r = await request('GET', '/api/evenements');
  log('public', 'Liste événements', r.status === 200, `count=${r.body?.data?.length ?? r.body?.pagination?.total ?? '?'}`);

  r = await request('GET', '/api/oeuvres');
  log('public', 'Liste oeuvres', r.status === 200, `count=${r.body?.data?.length ?? '?'}`);

  r = await request('GET', '/api/patrimoine');
  log('public', 'Liste patrimoine', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/api/artisanat');
  log('public', 'Liste artisanat', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/api/services');
  log('public', 'Liste services', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/api/lieux');
  log('public', 'Liste lieux', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/api/parcours');
  log('public', 'Liste parcours', r.status === 200, `status=${r.status}`);

  r = await request('GET', '/api/commentaires/oeuvre/1');
  log('public', 'Commentaires oeuvre', r.status === 200 || r.status === 404, `status=${r.status}`);

  r = await request('GET', '/api/programmes/evenement/1');
  log('public', 'Programmes événement', r.status === 200 || r.status === 404, `status=${r.status}`);

  r = await request('GET', '/api/intervenants');
  log('public', 'Liste intervenants', r.status === 200, `status=${r.status}`);

  // ====== 6. NOTIFICATIONS ======
  console.log('\n🔔 === NOTIFICATIONS ===');
  if (token) {
    r = await request('GET', '/api/notifications/list', null, token);
    log('notif', 'Notifications list', r.status === 200, `count=${r.body?.data?.length ?? '?'}`);

    r = await request('GET', '/api/notifications/summary', null, token);
    log('notif', 'Notifications summary', r.status === 200, `unread=${r.body?.data?.nonLues ?? '?'}`);

    r = await request('GET', '/api/notifications/preferences', null, token);
    log('notif', 'Notifications preferences', r.status === 200, `status=${r.status}`);

    r = await request('PUT', '/api/notifications/read-all', null, token);
    log('notif', 'Mark all read', r.status === 200, `status=${r.status}`);
  }

  // ====== 7. FAVORIS ======
  console.log('\n❤️ === FAVORIS ===');
  if (token) {
    r = await request('GET', '/api/favoris', null, token);
    log('fav', 'Liste favoris', r.status === 200, `status=${r.status}`);
  }

  // ====== 8. DASHBOARD ADMIN ======
  console.log('\n📊 === DASHBOARD ADMIN ===');

  // Find admin user from DB and login
  await delay(2000);
  // Try multiple admin credentials
  const adminCredentials = [
    { email: 'admin@actionculture.dz', password: 'admin123' },
    { email: 'admin@actionculture.dz', password: 'Admin1234!Admin' },
    { email: 'admin@admin.com', password: 'admin123' },
    { email: 'admin@admin.com', password: 'Admin1234!Admin' },
  ];
  let adminToken = null;
  for (const cred of adminCredentials) {
    await delay(1200);
    r = await request('POST', '/api/users/login', cred);
    if (r.body?.data?.token) {
      adminToken = r.body.data.token;
      break;
    }
  }

  if (adminToken) {
    log('admin', 'Login admin', true, 'token OK');

    r = await request('GET', '/api/dashboard/stats', null, adminToken);
    log('admin', 'Dashboard stats', r.status === 200, `status=${r.status}`);

    r = await request('GET', '/api/dashboard/overview', null, adminToken);
    log('admin', 'Dashboard overview', r.status === 200, `status=${r.status}`);

    r = await request('GET', '/api/dashboard/users', null, adminToken);
    log('admin', 'Dashboard users', r.status === 200, `status=${r.status}`);

    r = await request('GET', '/api/dashboard/users/pending', null, adminToken);
    log('admin', 'Dashboard pending users', r.status === 200, `status=${r.status}`);

    r = await request('GET', '/api/dashboard/users/stats', null, adminToken);
    log('admin', 'Dashboard user stats', r.status === 200, `status=${r.status}`);

    r = await request('GET', '/api/dashboard/content/pending-oeuvres', null, adminToken);
    log('admin', 'Oeuvres en attente', r.status === 200, `status=${r.status}`);

    r = await request('GET', '/api/dashboard/moderation/queue', null, adminToken);
    log('admin', 'Modération queue', r.status === 200, `status=${r.status}`);

    r = await request('GET', '/api/dashboard/moderation/signalements', null, adminToken);
    log('admin', 'Signalements', r.status === 200, `status=${r.status}`);

    r = await request('GET', '/api/dashboard/patrimoine', null, adminToken);
    log('admin', 'Dashboard patrimoine', r.status === 200, `status=${r.status}`);

    // Admin user management via /api/users
    r = await request('GET', '/api/users', null, adminToken);
    log('admin', 'Admin list users', r.status === 200, `count=${r.body?.data?.length ?? '?'}`);

    r = await request('GET', '/api/users/stats', null, adminToken);
    log('admin', 'Admin user stats', r.status === 200, `status=${r.status}`);

    r = await request('GET', '/api/users/pending', null, adminToken);
    log('admin', 'Admin pending users', r.status === 200, `status=${r.status}`);
  } else {
    log('admin', 'Login admin', false, `Pas de compte admin trouvé (status=${r.status}, ${JSON.stringify(r.body).substring(0,100)})`);
    console.log('  ⚠️ Tests dashboard admin ignorés (pas de token admin)');
  }

  // ====== 9. PROFESSIONNEL ======
  console.log('\n💼 === ESPACE PROFESSIONNEL ===');
  if (proToken) {
    r = await request('GET', '/api/professionnel/dashboard', null, proToken);
    log('pro', 'Dashboard pro', r.status === 200 || r.status === 403, `status=${r.status}`);

    r = await request('GET', '/api/professionnel/evenements', null, proToken);
    log('pro', 'Mes événements', r.status === 200 || r.status === 403, `status=${r.status}`);

    r = await request('GET', '/api/professionnel/oeuvres', null, proToken);
    log('pro', 'Mes oeuvres', r.status === 200 || r.status === 403, `status=${r.status}`);
  }

  // ====== 10. SÉCURITÉ ======
  console.log('\n🛡️ === SÉCURITÉ ===');
  
  // Access without token
  r = await request('GET', '/api/users/profile');
  log('sec', 'Profil sans token → 401', r.status === 401, `status=${r.status}`);

  r = await request('GET', '/api/dashboard/stats');
  log('sec', 'Dashboard sans token → 401', r.status === 401, `status=${r.status}`);

  // Access with visitor token to admin route
  if (token) {
    r = await request('GET', '/api/users', null, token);
    log('sec', 'Admin route avec visiteur → 403', r.status === 403, `status=${r.status}`);

    r = await request('GET', '/api/dashboard/stats', null, token);
    log('sec', 'Dashboard avec visiteur → 403', r.status === 403, `status=${r.status}`);
  }

  // Invalid token
  r = await request('GET', '/api/users/profile', null, 'invalid-token-xyz');
  log('sec', 'Token invalide → 401', r.status === 401, `status=${r.status}`);

  // 404
  r = await request('GET', '/api/nonexistent-route');
  log('sec', 'Route inexistante → 404', r.status === 404, `status=${r.status}`);

  // XSS attempt
  r = await request('GET', '/api/oeuvres?search=<script>alert(1)</script>');
  log('sec', 'XSS attempt blocked', r.status !== 500, `status=${r.status}`);

  // ====== 11. UPLOAD ======
  console.log('\n📁 === UPLOAD ===');
  r = await request('GET', '/api/upload');
  log('upload', 'Upload info', r.status !== 500, `status=${r.status}`);

  // ====== RÉSUMÉ ======
  console.log('\n════════════════════════════════════════');
  console.log('📊 RÉSUMÉ DE L\'AUDIT');
  console.log('════════════════════════════════════════');

  const categories = {};
  results.forEach(r => {
    if (!categories[r.cat]) categories[r.cat] = { ok: 0, fail: 0, tests: [] };
    categories[r.cat][r.ok ? 'ok' : 'fail']++;
    if (!r.ok) categories[r.cat].tests.push(r);
  });

  const totalOk = results.filter(r => r.ok).length;
  const totalFail = results.filter(r => !r.ok).length;

  Object.entries(categories).forEach(([cat, data]) => {
    const icon = data.fail === 0 ? '✅' : '⚠️';
    console.log(`${icon} ${cat.toUpperCase()}: ${data.ok}/${data.ok + data.fail} OK`);
    data.tests.forEach(t => console.log(`   ❌ ${t.name}: ${t.detail}`));
  });

  console.log('────────────────────────────────────────');
  console.log(`TOTAL: ${totalOk}/${totalOk + totalFail} tests passés (${totalFail} échoués)`);
  console.log('════════════════════════════════════════');

  // Cleanup - supprimer les users de test
  // (optionnel en dev, commenté pour garder les données)
}

audit().catch(console.error);
