/**
 * Tests e2e de regression pour les lots securite recents.
 *
 * Chaque bloc describe() correspond a un lot deja deploye en prod ; on
 * verifie que le comportement attendu est toujours en place pour eviter
 * qu'une refonte future ne casse silencieusement les garde-fous.
 *
 * Cette suite est volontairement SEPAREE de 11-api-security.cy.ts (tests
 * generiques auth/RBAC) : ici on teste des regressions de fixes dates.
 */

describe('Regression Lots securite', () => {
  const API = Cypress.env('apiUrl') as string;

  // ==========================================================================
  // LOT 4 — CORS hardening (commit e70b7181)
  // --------------------------------------------------------------------------
  // Le backend doit :
  //   - autoriser FRONTEND_URL + CORS_ALLOWED_ORIGINS
  //   - refuser tout autre origine (pas de ACAO dans la reponse)
  //   - refuser les requetes sans Origin en prod (CORS_ALLOW_NO_ORIGIN=false)
  // ==========================================================================
  describe('Lot 4 — CORS whitelist strict', () => {
    // Origin valide dans tous les environnements (frontend courant ou localhost)
    // - en dev : http://localhost:3000
    // - en prod (CI eventuel) : https://taladz.com via FRONTEND_URL
    const validOrigin = (Cypress.config('baseUrl') as string) || 'http://localhost:3000';

    it('accepte une origine whitelisted et renvoie ACAO', () => {
      cy.request({
        url: `${API}/users/types`,
        headers: { Origin: validOrigin },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        // Certains proxies nginx renvoient le header en minuscules
        const acao =
          resp.headers['access-control-allow-origin'] ||
          resp.headers['Access-Control-Allow-Origin'];
        // Peut etre le origin exact OU '*' selon la config ; l'important est
        // qu'il soit present pour une origine whitelisted.
        expect(acao, 'ACAO header attendu pour origin whitelisted').to.exist;
      });
    });

    it('refuse une origine malveillante (pas de ACAO renvoye)', () => {
      cy.request({
        url: `${API}/users/types`,
        headers: { Origin: 'https://evil-attacker.example.com' },
        failOnStatusCode: false,
      }).then((resp) => {
        const acao =
          resp.headers['access-control-allow-origin'] ||
          resp.headers['Access-Control-Allow-Origin'];
        // Le browser bloquera la requete. Ce qu'on teste ici c'est que le
        // serveur NE valide PAS l'origine malveillante via ACAO.
        expect(acao, 'aucun ACAO pour origin hostile').to.satisfy(
          (v: string | undefined) =>
            v === undefined || (v !== 'https://evil-attacker.example.com' && v !== '*'),
        );
      });
    });

    it('refuse un preflight OPTIONS depuis une origine non whitelisted', () => {
      cy.request({
        method: 'OPTIONS',
        url: `${API}/users/login`,
        headers: {
          Origin: 'https://attacker.site',
          'Access-Control-Request-Method': 'POST',
        },
        failOnStatusCode: false,
      }).then((resp) => {
        const acao =
          resp.headers['access-control-allow-origin'] ||
          resp.headers['Access-Control-Allow-Origin'];
        expect(acao, 'preflight depuis origin non-whitelisted ne doit pas renvoyer ACAO').to.satisfy(
          (v: string | undefined) =>
            v === undefined || (v !== 'https://attacker.site' && v !== '*'),
        );
      });
    });
  });

  // ==========================================================================
  // LOT 7 — Upload security : magic bytes + limites strictes (commit 17ddfbfc)
  // --------------------------------------------------------------------------
  // Le backend doit :
  //   - rejeter un fichier .jpg dont le buffer commence par des magic bytes
  //     d'un autre format (ex: MP4 renomme en jpg)
  //   - rejeter un buffer vide (HTTP 400 UPLOAD_EMPTY)
  //   - rejeter un fichier > limite (HTTP 400 ou 413)
  //   - ne PAS leak err.message dans la reponse (code generique)
  // ==========================================================================
  describe('Lot 7 — Upload magic bytes + limites', () => {
    it('rejette un "jpg" qui est en fait un MP4 (magic bytes check)', () => {
      // Signature MP4 ftyp box : "\x00\x00\x00\x20ftypmp42"
      const mp4Signature = new Uint8Array([
        0x00, 0x00, 0x00, 0x20,
        0x66, 0x74, 0x79, 0x70,
        0x6d, 0x70, 0x34, 0x32,
      ]);
      const blob = new Blob([mp4Signature], { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('image', blob, 'disguised.jpg');

      cy.request({
        method: 'POST',
        url: `${API}/upload/image/public`,
        body: formData,
        failOnStatusCode: false,
      }).then((resp) => {
        // On accepte 400 (validation magic bytes) ou 422 (semantic invalide)
        expect(resp.status, 'fichier deguise doit etre rejete').to.be.oneOf([400, 422]);
        // Le code doit etre generique (pas de stacktrace leak)
        if (typeof resp.body === 'object' && resp.body !== null) {
          const bodyStr = JSON.stringify(resp.body).toLowerCase();
          expect(bodyStr, 'pas de leak interne').to.not.include('at function');
          expect(bodyStr).to.not.include('/app/');
        }
      });
    });

    it('rejette un fichier trop volumineux', () => {
      const tooBig = new ArrayBuffer(15 * 1024 * 1024); // 15 MB, > limite image 10MB
      const blob = new Blob([tooBig], { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('image', blob, 'huge.jpg');

      cy.request({
        method: 'POST',
        url: `${API}/upload/image/public`,
        body: formData,
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([400, 413, 422]);
      });
    });

    it('rejette une image sans body', () => {
      cy.request({
        method: 'POST',
        url: `${API}/upload/image/public`,
        body: new FormData(), // vide
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([400, 422]);
      });
    });

    it('GET /upload retourne les limites (API doc)', () => {
      cy.request(`${API}/upload`).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.be.an('object');
        // La structure exacte peut evoluer ; on verifie au moins une presence
        // d'info sur les tailles max (key flexible)
        const json = JSON.stringify(resp.body).toLowerCase();
        expect(
          json.includes('size') || json.includes('max') || json.includes('limit'),
          'la route doit exposer les limites d\'upload',
        ).to.be.true;
      });
    });
  });

  // ==========================================================================
  // LOT 10 + B — Rate-limit distribue + prefixes isoles
  // (commits 10792a93, b6809baa)
  // --------------------------------------------------------------------------
  // Le backend doit :
  //   - exposer les headers RateLimit-* (RFC draft 7)
  //   - respecter la fenetre windowMs (reset coherent, pas 24h pour un 15min)
  //   - decrementer le compteur entre requetes (distribue = persiste)
  // ==========================================================================
  describe('Lot 10 + B — Rate-limit headers coherents', () => {
    it('renvoie les headers RateLimit-* sur /users/types', () => {
      cy.request(`${API}/users/types`).then((resp) => {
        expect(resp.status).to.eq(200);
        const limit = resp.headers['ratelimit-limit'];
        const remaining = resp.headers['ratelimit-remaining'];
        const reset = resp.headers['ratelimit-reset'];
        expect(limit, 'RateLimit-Limit').to.exist;
        expect(remaining, 'RateLimit-Remaining').to.exist;
        expect(reset, 'RateLimit-Reset').to.exist;
      });
    });

    it('RateLimit-Reset reflete la fenetre reelle (pas 24h pour globalLimiter)', () => {
      cy.request(`${API}/users/types`).then((resp) => {
        const resetStr = resp.headers['ratelimit-reset'];
        if (!resetStr) {
          // Si les headers ne sont pas actives, skip proprement
          return;
        }
        const reset = Number(Array.isArray(resetStr) ? resetStr[0] : resetStr);
        // globalLimiter = 15min = 900s. On tolere jusqu'a 1h (3600s) pour
        // les limiters plus larges. Tout ce qui depasse 1h en dev/prod
        // indique le bug "ratelimit-reset: 86400" corrige en Lot B.
        expect(reset, `reset=${reset}s, attendu <= 3600`).to.be.at.most(3600);
      });
    });

    it('le compteur RateLimit-Remaining decremente entre requetes', () => {
      cy.request(`${API}/users/types`).then((first) => {
        const r1Str = first.headers['ratelimit-remaining'];
        const r1 = Number(Array.isArray(r1Str) ? r1Str[0] : r1Str);
        cy.request(`${API}/users/types`).then((second) => {
          const r2Str = second.headers['ratelimit-remaining'];
          const r2 = Number(Array.isArray(r2Str) ? r2Str[0] : r2Str);
          if (Number.isFinite(r1) && Number.isFinite(r2)) {
            // r2 doit etre <= r1 (peut etre egal si la CI est behind proxy
            // qui fait du cache). L'important : ne pas remonter.
            expect(r2, 'remaining ne doit pas augmenter').to.be.at.most(r1);
          }
        });
      });
    });
  });

  // ==========================================================================
  // LOT 8 — EnvironmentValidator (commit 09bcabb7)
  // --------------------------------------------------------------------------
  // Le endpoint /health ne doit PAS leak de details sensibles et doit
  // renvoyer 200 quand tout est OK.
  // ==========================================================================
  describe('Lot 8 — /health ne leak pas de details internes', () => {
    it('GET /health renvoie 200 avec structure minimale', () => {
      // /health est monte au niveau racine (pas sous /api)
      const base = (Cypress.env('apiUrl') as string).replace(/\/api\/?$/, '');
      cy.request(`${base}/health`).then((resp) => {
        expect(resp.status).to.eq(200);
        if (typeof resp.body === 'object' && resp.body !== null) {
          const bodyStr = JSON.stringify(resp.body);
          // Ne doit PAS leak les chemins fichiers, stacks, passwords...
          expect(bodyStr.toLowerCase()).to.not.include('/app/');
          expect(bodyStr.toLowerCase()).to.not.include('password');
          expect(bodyStr.toLowerCase()).to.not.include('secret');
          expect(bodyStr).to.not.match(/node_modules/);
        }
      });
    });
  });
});
