/**
 * Scans du QR code d'un site : rien sur la personne n'est gardé (ni compte, ni IP, ni navigateur),
 * un site non publié ou absent ne compte rien, un code par site est créé au premier scan.
 */
const { enregistrerScan, statistiques, codeDuLieu } = require('../../services/patrimoine/scansQr');

function modeles({ lieu = { id_lieu: 7 }, code = { id_qr_code: 3 } } = {}) {
  return {
    Lieu: { findOne: jest.fn().mockResolvedValue(lieu) },
    QRCode: {
      findOrCreate: jest.fn().mockResolvedValue([code, false]),
      findOne: jest.fn().mockResolvedValue(code)
    },
    QRScan: { create: jest.fn().mockResolvedValue({}), count: jest.fn().mockResolvedValueOnce(12).mockResolvedValueOnce(4) }
  };
}

describe('scans du QR code d’un site', () => {
  it('enregistre un scan sans compte, sans adresse IP ni navigateur', async () => {
    const m = modeles();
    await expect(enregistrerScan(m, 7, 'https://example.com/patrimoine/7?src=qr')).resolves.toBe(true);
    expect(m.Lieu.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id_lieu: 7, statut: 'publie' } }));
    expect(m.QRCode.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({ where: { code_unique: 'lieu-7' } }));
    const scan = m.QRScan.create.mock.calls[0][0];
    expect(scan).toMatchObject({ id_qr_code: 3, id_user: null, ip_address: null, user_agent: null, device_type: null });
  });

  it('ne compte rien pour un site absent ou non publié', async () => {
    const m = modeles({ lieu: null });
    await expect(enregistrerScan(m, 8, 'x')).resolves.toBe(false);
    expect(m.QRScan.create).not.toHaveBeenCalled();
  });

  it('donne le total et les 30 derniers jours', async () => {
    await expect(statistiques(modeles(), 7)).resolves.toEqual({ total: 12, trente_jours: 4 });
  });

  it('zéro quand le QR n’a jamais été scanné', async () => {
    const m = modeles({ code: null });
    await expect(statistiques(m, 7)).resolves.toEqual({ total: 0, trente_jours: 0 });
    expect(codeDuLieu(7)).toBe('lieu-7');
  });
});
