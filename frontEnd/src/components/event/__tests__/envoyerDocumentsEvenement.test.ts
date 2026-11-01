import { describe, it, expect, vi, beforeEach } from 'vitest';

const uploadDocument = vi.fn();
const ajouterDocument = vi.fn();
vi.mock('@/services/upload.service', () => ({ uploadService: { uploadDocument: (...a: unknown[]) => uploadDocument(...a) } }));
vi.mock('@/services/evenement.service', () => ({ evenementService: { ajouterDocument: (...a: unknown[]) => ajouterDocument(...a) } }));

import { envoyerDocumentsEvenement } from '../DocumentsEvenementChoix';

const pdf = (nom: string) => new File(['%PDF-'], nom, { type: 'application/pdf' });

describe('envoyerDocumentsEvenement', () => {
  beforeEach(() => { uploadDocument.mockReset(); ajouterDocument.mockReset(); });

  it('envoie chaque PDF puis le rattache à l’événement créé, titre nettoyé', async () => {
    uploadDocument.mockResolvedValue({ success: true, data: { url: 'https://res.cloudinary.com/demo/raw/upload/x' } });
    ajouterDocument.mockResolvedValue({ success: true });
    const echecs = await envoyerDocumentsEvenement(12, [{ fichier: pdf('a.pdf'), titre: ' Programme ' }, { fichier: pdf('b.pdf'), titre: 'Présentation' }]);
    expect(echecs).toBe(0);
    expect(ajouterDocument).toHaveBeenNthCalledWith(1, 12, 'https://res.cloudinary.com/demo/raw/upload/x', 'Programme');
    expect(ajouterDocument).toHaveBeenCalledTimes(2);
  });

  it('compte les échecs (envoi refusé, rattachement refusé, exception) sans bloquer les autres', async () => {
    uploadDocument
      .mockResolvedValueOnce({ success: false })
      .mockResolvedValueOnce({ success: true, data: { url: 'u' } })
      .mockRejectedValueOnce(new Error('réseau'))
      .mockResolvedValueOnce({ success: true, data: { url: 'u' } });
    ajouterDocument.mockResolvedValueOnce({ success: false }).mockResolvedValueOnce({ success: true });
    const docs = ['a', 'b', 'c', 'd'].map(n => ({ fichier: pdf(`${n}.pdf`), titre: n }));
    expect(await envoyerDocumentsEvenement(12, docs)).toBe(3);
    expect(ajouterDocument).toHaveBeenCalledTimes(2);
  });
});
