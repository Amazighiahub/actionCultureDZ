/**
 * Réduit une photo avant envoi : le serveur la stocke et la sert telle quelle, une photo
 * de téléphone (4-10 Mo, 4000 px) était donc téléchargée en entier par chaque visiteur.
 *
 * - JPEG / WebP : redimensionnés (côté le plus long ≤ MAX_DIMENSION), même format
 * - PNG : convertis en WebP (garde la transparence, bien plus léger)
 * - GIF (animations), petits fichiers et autres types : inchangés
 * - En cas d'échec (navigateur, image illisible) ou si le résultat n'est pas plus léger,
 *   le fichier d'origine est renvoyé : l'envoi n'est jamais bloqué
 */
const MAX_DIMENSION = 2048;
const SKIP_BELOW_BYTES = 400 * 1024;
const QUALITY = 0.85;
const LOAD_TIMEOUT_MS = 10000;
const RESIZABLE_TYPES = ['image/jpeg', 'image/jpg', 'image/webp', 'image/png'];

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const timer = setTimeout(() => { URL.revokeObjectURL(url); reject(new Error('timeout')); }, LOAD_TIMEOUT_MS);
    img.onload = () => { clearTimeout(timer); URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { clearTimeout(timer); URL.revokeObjectURL(url); reject(new Error('image illisible')); };
    img.src = url;
  });

export async function prepareImageForUpload(file: File): Promise<File> {
  if (!RESIZABLE_TYPES.includes(file.type) || file.size < SKIP_BELOW_BYTES) return file;
  try {
    // L'orientation EXIF est appliquée par les navigateurs actuels lors du dessin de l'image
    const img = await loadImage(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    const targetType = file.type === 'image/png' ? 'image/webp' : file.type === 'image/jpg' ? 'image/jpeg' : file.type;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, targetType, QUALITY));
    if (!blob || blob.size >= file.size) return file;

    // Navigateur sans encodeur WebP : toBlob renvoie du PNG, on garde alors l'original
    const type = blob.type || targetType;
    if (type === 'image/png') return file;
    const extension = type === 'image/webp' ? 'webp' : 'jpg';
    const name = `${file.name.replace(/\.[^.]+$/, '') || 'image'}.${extension}`;
    return new File([blob], name, { type, lastModified: file.lastModified });
  } catch {
    return file;
  }
}

/** Version liste : seules les images sont traitées, l'ordre est conservé. */
export const prepareFilesForUpload = (files: File[]): Promise<File[]> =>
  Promise.all(files.map(prepareImageForUpload));
