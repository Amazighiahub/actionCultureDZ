/**
 * Envoi d'image : un seul chemin (uploadService.uploadImage), une seule liste de formats,
 * et la photo de profil par userService.updateProfilePhoto (audit V11 COD-2, COD-13).
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';

const { mockUpload } = vi.hoisted(() => ({ mockUpload: vi.fn() }));

vi.mock('../httpClient', () => ({
  httpClient: { upload: mockUpload, get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { uploadService } from '../upload.service';
import { userService } from '../user.service';

const fichier = (type: string, nom = 'photo') => new File(['x'], nom, { type });

describe('envoi d\'image', () => {
  beforeEach(() => {
    mockUpload.mockReset();
    mockUpload.mockResolvedValue({ success: true, data: { url: 'https://res.cloudinary.com/x.jpg', filename: 'x' } });
  });

  test('le BMP, refusé par le serveur, est refusé avant l\'envoi', () => {
    expect(uploadService.validateFile(fichier('image/bmp', 'a.bmp'), 'image').valid).toBe(false);
    expect(uploadService.validateFile(fichier('image/webp'), 'image').valid).toBe(true);
  });

  test('envoi public de l\'inscription : route publique, champ « image »', async () => {
    const res = await uploadService.uploadImage(fichier('image/png'), { isPublic: true });
    expect(mockUpload.mock.calls[0][0]).toBe('/upload/image/public');
    expect((mockUpload.mock.calls[0][1] as FormData).get('image')).toBeInstanceOf(File);
    expect(res.data?.url).toBe('https://res.cloudinary.com/x.jpg');
  });

  test('photo de profil : route qui met le profil à jour', async () => {
    const res = await userService.updateProfilePhoto(fichier('image/jpeg'));
    expect(mockUpload.mock.calls[0][0]).toBe('/upload/profile-photo');
    expect((mockUpload.mock.calls[0][1] as FormData).get('image')).toBeInstanceOf(File);
    expect(res.success).toBe(true);
  });
});
