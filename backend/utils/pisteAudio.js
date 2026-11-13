/**
 * Enregistrement fait dans le navigateur (MediaRecorder) : Chrome et Android produisent un WebM
 * (Opus), Safari un MP4 (AAC). La signature de ces conteneurs est celle d'une vidéo (video/webm,
 * video/mp4) ; ce contrôle lit leurs pistes et ne les accepte comme voix que s'ils n'ont
 * qu'une piste audio (audit V11 OUT, enregistrer une voix depuis le téléphone).
 *
 * Utilisé seulement par la route d'envoi d'une voix : les autres envois gardent leurs règles.
 */
const fs = require('fs');

// Les pistes sont décrites au début du fichier (en-tête du WebM, « moov » du MP4 fragmenté)
const OCTETS_LUS = 256 * 1024;

/** Les CodecID d'un WebM (élément 0x86 suivi de sa taille sur un octet, puis le texte : « A_OPUS », « V_VP8 »…) */
function codecsWebm(buffer) {
  const codecs = [];
  for (let i = 0; i < buffer.length - 3; i++) {
    if (buffer[i] !== 0x86) continue;
    const taille = buffer[i + 1];
    if ((taille & 0x80) === 0) continue; // taille codée sur un octet : 1xxxxxxx
    const n = taille & 0x7f;
    if (n < 3 || n > 32 || i + 2 + n > buffer.length) continue;
    const texte = buffer.subarray(i + 2, i + 2 + n).toString('latin1');
    if (/^[AVS]_[A-Z0-9/_.-]+$/.test(texte)) codecs.push(texte);
  }
  return codecs;
}

// Codecs vidéo du format Matroska/WebM : refusés où qu'ils soient, quelle que soit la façon dont leur
// taille est écrite (une taille sur plusieurs octets échappait à la lecture des CodecID)
const VIDEO_WEBM = /V_(VP8|VP9|AV1|MPEG4|MPEGH|MPEG1|MPEG2|THEORA|UNCOMPRESSED|MS\/VFW|REAL|QUICKTIME|PRORES|FFV1|DIRAC|AVS)/;

/** Les types de piste d'un MP4 (boîtes « hdlr » : « soun » pour le son, « vide » pour l'image) */
function pistesMp4(buffer) {
  const types = [];
  let i = buffer.indexOf('hdlr', 0, 'latin1');
  while (i !== -1 && i + 16 <= buffer.length) {
    // hdlr : version et drapeaux (4 octets), pre_defined (4), puis le type de piste (4)
    types.push(buffer.subarray(i + 12, i + 16).toString('latin1'));
    i = buffer.indexOf('hdlr', i + 4, 'latin1');
  }
  return types;
}

/**
 * Type audio du fichier s'il ne contient qu'une piste audio, sinon null.
 * @param {Buffer} buffer - début du fichier
 * @param {string} mime - type détecté par la signature (video/webm, video/mp4, audio/…)
 * @returns {string|null} 'audio/webm' | 'audio/mp4' | le type audio reçu | null
 */
function typeVoix(buffer, mime) {
  if (mime === 'video/webm' || mime === 'audio/webm') {
    const codecs = codecsWebm(buffer);
    const audio = codecs.some(c => c === 'A_OPUS' || c === 'A_VORBIS');
    const video = codecs.some(c => c.startsWith('V_')) || VIDEO_WEBM.test(buffer.toString('latin1'));
    return audio && !video ? 'audio/webm' : null;
  }
  if (mime === 'video/mp4' || mime === 'audio/mp4' || mime === 'audio/m4a') {
    if (buffer.indexOf('moov', 0, 'latin1') === -1) return null;
    const pistes = pistesMp4(buffer);
    // Une piste vidéo décrite (« hdlr vide ») ou son en-tête (« vmhd ») n’importe où dans le début : refusé
    const video = pistes.includes('vide') || buffer.indexOf('vmhd', 0, 'latin1') !== -1;
    return pistes.includes('soun') && !video ? 'audio/mp4' : null;
  }
  // Fichier audio ordinaire (mp3, ogg, wav…) : déjà reconnu par sa signature
  return mime && mime.startsWith('audio/') ? mime : null;
}

/** Lit le début d'un fichier temporaire, puis typeVoix */
async function typeVoixFichier(chemin, mime) {
  const handle = await fs.promises.open(chemin, 'r');
  try {
    const buffer = Buffer.alloc(OCTETS_LUS);
    const { bytesRead } = await handle.read(buffer, 0, OCTETS_LUS, 0);
    return typeVoix(buffer.subarray(0, bytesRead), mime);
  } finally {
    await handle.close();
  }
}

module.exports = { typeVoix, typeVoixFichier, codecsWebm, pistesMp4 };
