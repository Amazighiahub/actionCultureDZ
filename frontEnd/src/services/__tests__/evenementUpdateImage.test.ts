/** Modifier un événement avec une nouvelle image : le fichier doit partir, en multipart */
import { describe, it, expect, vi } from 'vitest';

const { put, putFormData } = vi.hoisted(() => ({
  put: vi.fn(async () => ({ success: true })),
  putFormData: vi.fn(async () => ({ success: true })),
}));

vi.mock('@/services/httpClient', async (original) => {
  const reel = await original<typeof import('@/services/httpClient')>();
  return { ...reel, httpClient: { ...reel.httpClient, put, putFormData } };
});

import { evenementService } from '@/services/evenement.service';

describe('evenementService.update', () => {
  it('formulaire avec fichier : envoi multipart, le fichier est transmis', async () => {
    const fd = new FormData();
    fd.append('affiche', new File(['x'], 'a.png', { type: 'image/png' }));
    await evenementService.update(18, fd);
    expect(putFormData).toHaveBeenCalledWith(expect.stringMatching(/\/18$/), fd);
    expect(put).not.toHaveBeenCalled();
  });

  it('données simples : envoi JSON, comme avant', async () => {
    await evenementService.update(18, { nom_evenement: 'x' } as never);
    expect(put).toHaveBeenCalledWith(expect.stringMatching(/\/18$/), { nom_evenement: 'x' });
  });
});
