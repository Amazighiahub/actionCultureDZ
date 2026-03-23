/**
 * Tests — evenement.service.ts
 * Vérifie que les appels API sont correctement configurés
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock httpClient
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/services/httpClient', () => ({
  httpClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    getPaginated: (...args: unknown[]) => mockGet(...args),
  },
}));

// Mock mediaService
vi.mock('@/services/media.service', () => ({
  mediaService: { getMediasByEvenement: vi.fn() },
}));

import { evenementService } from '../evenement.service';

describe('evenementService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDetail', () => {
    it('appelle GET /evenements/:id', async () => {
      mockGet.mockResolvedValue({ success: true, data: { id_evenement: 9, nom_evenement: 'Test' } });

      const result = await evenementService.getDetail(9);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/evenements/9'));
      expect(result.success).toBe(true);
      expect(result.data.id_evenement).toBe(9);
    });
  });

  describe('getProgrammes', () => {
    it('appelle GET /programmes/evenement/:id', async () => {
      mockGet.mockResolvedValue({ success: true, data: { programmes: [], byDay: {} } });

      const result = await evenementService.getProgrammes(9);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/programmes/evenement/9'));
      expect(result.success).toBe(true);
    });
  });

  describe('getMedias', () => {
    it('appelle GET /evenements/:id/medias', async () => {
      mockGet.mockResolvedValue({ success: true, data: [] });

      const result = await evenementService.getMedias(9);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/evenements/9/medias'));
    });
  });

  describe('getPublicParticipants', () => {
    it('appelle GET /evenements/:id/participants/public', async () => {
      mockGet.mockResolvedValue({ success: true, data: { participants: [], total: 0 } });

      const result = await evenementService.getPublicParticipants(9);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/evenements/9/participants/public'));
    });
  });

  describe('checkRegistration', () => {
    it('appelle GET /evenements/:id/mon-inscription', async () => {
      mockGet.mockResolvedValue({ success: true, data: { isRegistered: false, status: null } });

      const result = await evenementService.checkRegistration(9);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/evenements/9/mon-inscription'));
      expect(result.success).toBe(true);
      expect(result.data?.isRegistered).toBe(false);
    });

    it('retourne isRegistered=false sur erreur 404', async () => {
      mockGet.mockRejectedValue({ response: { status: 404 } });

      const result = await evenementService.checkRegistration(9);

      expect(result.success).toBe(true);
      expect(result.data?.isRegistered).toBe(false);
    });
  });

  describe('inscription', () => {
    it('appelle POST /evenements/:id/register', async () => {
      mockPost.mockResolvedValue({ success: true, data: { inscription: { statut: 'confirme' } } });

      const result = await evenementService.inscription(9);

      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining('/evenements/9/register'),
        undefined
      );
      expect(result.success).toBe(true);
    });

    it('appelle POST avec données optionnelles', async () => {
      mockPost.mockResolvedValue({ success: true, data: { inscription: { statut: 'confirme' } } });

      const data = { nombre_personnes: 2, commentaire: 'Test' };
      const result = await evenementService.inscription(9, data);

      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining('/evenements/9/register'),
        data
      );
      expect(result.success).toBe(true);
    });
  });

  describe('desinscription', () => {
    it('appelle DELETE /evenements/:id/register', async () => {
      mockDelete.mockResolvedValue({ success: true });

      const result = await evenementService.desinscription(9);

      expect(mockDelete).toHaveBeenCalledWith(expect.stringContaining('/evenements/9'));
    });
  });

  describe('getQRCode', () => {
    it('appelle GET /evenements/:id/qrcode', async () => {
      mockGet.mockResolvedValue({ success: true, data: { qr_data_url: 'data:image/png;base64,...', event_url: 'http://localhost:5173/evenements/9' } });

      const result = await evenementService.getQRCode(9, 400);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/evenements/9/qrcode'));
      expect(result.success).toBe(true);
      expect(result.data.qr_data_url).toBeDefined();
    });
  });
});
