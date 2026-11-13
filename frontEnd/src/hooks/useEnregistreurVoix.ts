/**
 * Enregistrer une voix avec le micro du téléphone (MediaRecorder) : guide audio d'un lieu.
 * Chrome et Android enregistrent en WebM (Opus), Safari en MP4 (AAC) ; le serveur vérifie qu'il n'y a
 * qu'une piste audio et garde une copie MP3, lisible partout. Arrêt automatique après `dureeMax`
 * secondes. Le micro est libéré dès l'arrêt (le voyant du téléphone s'éteint).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export type EtatEnregistreur = 'inactif' | 'enregistrement' | 'pret' | 'refuse' | 'erreur';

// Ordre de préférence : WebM Opus (léger), puis MP4 (Safari)
const FORMATS = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];

/** Vrai si le navigateur sait enregistrer le micro */
export function enregistrementPossible(): boolean {
  return typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia;
}

function formatEnregistrement(): string | undefined {
  if (typeof MediaRecorder.isTypeSupported !== 'function') return undefined;
  return FORMATS.find((f) => MediaRecorder.isTypeSupported(f));
}

export function useEnregistreurVoix(dureeMax = 300) {
  const [etat, setEtat] = useState<EtatEnregistreur>('inactif');
  const [secondes, setSecondes] = useState(0);
  const [fichier, setFichier] = useState<File | null>(null);
  const [urlEcoute, setUrlEcoute] = useState<string | null>(null);
  const enregistreur = useRef<MediaRecorder | null>(null);
  const flux = useRef<MediaStream | null>(null);
  const minuteur = useRef<ReturnType<typeof setInterval> | null>(null);
  // Demande du micro en cours (un double appui n'ouvre pas deux micros) ; composant encore affiché
  const demarrage = useRef(false);
  const affiche = useRef(true);

  const libererMicro = useCallback(() => {
    if (minuteur.current) { clearInterval(minuteur.current); minuteur.current = null; }
    flux.current?.getTracks().forEach((piste) => piste.stop());
    flux.current = null;
  }, []);

  const arreter = useCallback(() => {
    if (enregistreur.current?.state === 'recording') enregistreur.current.stop();
    libererMicro();
  }, [libererMicro]);

  const oublier = useCallback(() => {
    setFichier(null);
    setSecondes(0);
    setUrlEcoute((ancienne) => { if (ancienne) URL.revokeObjectURL(ancienne); return null; });
  }, []);

  const demarrer = useCallback(async () => {
    if (demarrage.current || enregistreur.current?.state === 'recording') return;
    demarrage.current = true;
    oublier();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Page quittée pendant la demande d'autorisation : le micro est rendu aussitôt
      if (!affiche.current) { stream.getTracks().forEach((piste) => piste.stop()); return; }
      flux.current = stream;
      const format = formatEnregistrement();
      const rec = format ? new MediaRecorder(stream, { mimeType: format }) : new MediaRecorder(stream);
      const morceaux: Blob[] = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) morceaux.push(e.data); };
      rec.onstop = () => {
        // Type sans « ;codecs=… » : le serveur reconnaît le fichier à son contenu
        const type = (rec.mimeType || format || 'audio/webm').split(';')[0];
        const mp4 = type.includes('mp4');
        const blob = new Blob(morceaux, { type });
        if (blob.size === 0) { setEtat('erreur'); return; }
        setFichier(new File([blob], mp4 ? 'voix.m4a' : 'voix.webm', { type: mp4 ? 'audio/mp4' : 'audio/webm' }));
        setUrlEcoute(URL.createObjectURL(blob));
        setEtat('pret');
      };
      enregistreur.current = rec;
      rec.start(1000);
      setSecondes(0);
      setEtat('enregistrement');
      const debut = Date.now();
      minuteur.current = setInterval(() => {
        const s = Math.floor((Date.now() - debut) / 1000);
        setSecondes(s);
        if (s >= dureeMax) arreter();
      }, 250);
    } catch (e) {
      libererMicro();
      const nom = e instanceof DOMException ? e.name : '';
      setEtat(nom === 'NotAllowedError' || nom === 'SecurityError' ? 'refuse' : 'erreur');
    } finally {
      demarrage.current = false;
    }
  }, [arreter, dureeMax, libererMicro, oublier]);

  const recommencer = useCallback(() => { oublier(); setEtat('inactif'); }, [oublier]);

  // Page quittée pendant un enregistrement : micro libéré, écoute oubliée
  useEffect(() => { affiche.current = true; return () => {
    affiche.current = false;
    if (enregistreur.current?.state === 'recording') {
      enregistreur.current.onstop = null;
      enregistreur.current.stop();
    }
    libererMicro();
  }; }, [libererMicro]);
  useEffect(() => () => { if (urlEcoute) URL.revokeObjectURL(urlEcoute); }, [urlEcoute]);

  return { etat, secondes, fichier, urlEcoute, demarrer, arreter, recommencer };
}
