/**
 * trust proxy : derrière nginx (autre conteneur Docker), req.ip doit être
 * l'IP réelle du client et ne pas être usurpable via X-Forwarded-For.
 */
const proxyaddr = require('proxy-addr');
const { resolveTrustProxy } = require('../../utils/trustProxy');

// Requête telle que la voit le backend : socket = conteneur nginx,
// X-Forwarded-For = valeur du client + $remote_addr ajouté par nginx.
const reqFrom = (xff) => ({
  connection: { remoteAddress: '172.18.0.5' },
  socket: { remoteAddress: '172.18.0.5' },
  headers: { 'x-forwarded-for': xff }
});
// Même compilation que app.set('trust proxy', ...) dans Express
const { compileTrust } = require('express/lib/utils');
const clientIp = (setting, xff) => proxyaddr(reqFrom(xff), compileTrust(setting));

describe('resolveTrustProxy', () => {
  it('par défaut : 1 saut', () => {
    expect(resolveTrustProxy(undefined)).toBe(1);
    expect(resolveTrustProxy('')).toBe(1);
  });
  it('nombre de sauts', () => {
    expect(resolveTrustProxy('2')).toBe(2);
  });
  it('liste d\'adresses', () => {
    expect(resolveTrustProxy('loopback, 172.28.0.0/24')).toEqual(['loopback', '172.28.0.0/24']);
  });
});

describe('IP vue par le backend derrière nginx', () => {
  const setting = resolveTrustProxy(undefined);

  it('client honnête : son IP réelle (pas celle de nginx)', () => {
    expect(clientIp(setting, '41.105.10.20')).toBe('41.105.10.20');
  });

  it('X-Forwarded-For usurpé : l\'IP ajoutée par nginx l\'emporte', () => {
    expect(clientIp(setting, '6.6.6.6, 41.105.10.20')).toBe('41.105.10.20');
  });

  it('régression évitée : avec \'loopback\' tout le monde aurait l\'IP de nginx', () => {
    expect(clientIp(['loopback'], '41.105.10.20')).toBe('172.18.0.5');
  });
});
