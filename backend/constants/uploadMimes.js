/**
 * Tailles et types MIME acceptés à l'upload — source unique pour toutes les routes.
 * Les types sont vérifiés sur le contenu réel du fichier (signature binaire),
 * pas sur le type déclaré par le navigateur.
 */
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;                                                     // 10 MB
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024;                                                  // 50 MB
const MAX_VIDEO_SIZE = parseInt(process.env.UPLOAD_VIDEO_MAX_SIZE, 10) || 100 * 1024 * 1024; // 100 MB
const MAX_AUDIO_SIZE = parseInt(process.env.UPLOAD_AUDIO_MAX_SIZE, 10) || 50 * 1024 * 1024;  // 50 MB
const MAX_MEDIA_SIZE = MAX_VIDEO_SIZE;                                                       // max en média mixte

const IMAGE_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const DOCUMENT_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
const VIDEO_MIMES = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
const AUDIO_MIMES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac'];
const MEDIA_MIMES = [...IMAGE_MIMES, ...VIDEO_MIMES, ...AUDIO_MIMES, ...DOCUMENT_MIMES];

module.exports = {
  MAX_IMAGE_SIZE, MAX_DOCUMENT_SIZE, MAX_VIDEO_SIZE, MAX_AUDIO_SIZE, MAX_MEDIA_SIZE,
  IMAGE_MIMES, DOCUMENT_MIMES, VIDEO_MIMES, AUDIO_MIMES, MEDIA_MIMES
};
