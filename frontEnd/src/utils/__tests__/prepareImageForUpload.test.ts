import { describe, it, expect, vi, afterEach } from 'vitest';
import { prepareImageForUpload, prepareFilesForUpload } from '../prepareImageForUpload';

const makeFile = (name: string, type: string, size: number) =>
  new File([new Uint8Array(size)], name, { type });

describe('prepareImageForUpload', () => {
  afterEach(() => vi.restoreAllMocks());

  it('laisse intacts les petits fichiers', async () => {
    const file = makeFile('petite.jpg', 'image/jpeg', 10 * 1024);
    expect(await prepareImageForUpload(file)).toBe(file);
  });

  it('laisse intacts les GIF (animations) et les fichiers non image', async () => {
    const gif = makeFile('anim.gif', 'image/gif', 2 * 1024 * 1024);
    const video = makeFile('clip.mp4', 'video/mp4', 2 * 1024 * 1024);
    expect(await prepareImageForUpload(gif)).toBe(gif);
    expect(await prepareImageForUpload(video)).toBe(video);
  });

  it("renvoie l'original si l'image est illisible", async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const OriginalImage = globalThis.Image;
    class BrokenImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_v: string) { setTimeout(() => this.onerror?.(), 0); }
    }
    globalThis.Image = BrokenImage as unknown as typeof Image;
    try {
      const file = makeFile('photo.jpg', 'image/jpeg', 2 * 1024 * 1024);
      expect(await prepareImageForUpload(file)).toBe(file);
    } finally {
      globalThis.Image = OriginalImage;
    }
  });

  it("conserve l'ordre des fichiers d'une liste", async () => {
    const files = [makeFile('a.pdf', 'application/pdf', 100), makeFile('b.jpg', 'image/jpeg', 100)];
    expect(await prepareFilesForUpload(files)).toEqual(files);
  });
});
