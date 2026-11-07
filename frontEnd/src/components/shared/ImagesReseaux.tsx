/**
 * Images prêtes à publier sur les réseaux : Instagram (publication carrée, story) et Facebook.
 *
 * Instagram n'accepte pas de lien dans une publication : il faut une image. Elle est dessinée dans
 * le navigateur (photo de l'œuvre, titre, auteur, « taladz.com »), sans aucun service extérieur,
 * puis partagée directement (feuille de partage du téléphone) ou téléchargée.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Download, Facebook, Loader2, Share2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/Utils';

export type FormatReseau = 'carre' | 'story' | 'facebook';

export const FORMATS: Record<FormatReseau, { largeur: number; hauteur: number }> = {
  carre: { largeur: 1080, hauteur: 1080 },
  story: { largeur: 1080, hauteur: 1920 },
  facebook: { largeur: 1200, hauteur: 630 },
};

export interface ContenuImage {
  titre: string;
  sousTitre?: string;
  image?: string;
}

/** Photo Cloudinary en JPEG de taille raisonnable (l'original peut peser plusieurs Mo) */
export function adresseImage(url?: string): string | undefined {
  if (!url) return undefined;
  const m = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/.exec(url);
  if (m) return /^[a-z]{1,3}_[^/]*\//.test(m[2]) ? url : `${m[1]}c_limit,w_1600,h_1600,f_jpg,q_auto/${m[2]}`;
  return url;
}

function chargerImage(url?: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Lignes d'un texte coupé à la largeur donnée (dernière ligne terminée par « … » si trop long) */
export function couperLignes(ctx: CanvasRenderingContext2D, texte: string, largeur: number, maxLignes: number): string[] {
  const mots = texte.split(/\s+/).filter(Boolean);
  const lignes: string[] = [];
  let ligne = '';
  for (const mot of mots) {
    const essai = ligne ? `${ligne} ${mot}` : mot;
    if (ctx.measureText(essai).width <= largeur || !ligne) ligne = essai;
    else { lignes.push(ligne); ligne = mot; }
  }
  if (ligne) lignes.push(ligne);
  if (lignes.length > maxLignes) {
    const garde = lignes.slice(0, maxLignes);
    let dernier = garde[maxLignes - 1];
    while (dernier.length > 1 && ctx.measureText(`${dernier}…`).width > largeur) dernier = dernier.slice(0, -1);
    garde[maxLignes - 1] = `${dernier.trimEnd()}…`;
    return garde;
  }
  return lignes;
}

/** Dessine l'image au format demandé ; avecPhoto = false si la photo ne peut pas être utilisée */
export function dessiner(canvas: HTMLCanvasElement, format: FormatReseau, contenu: ContenuImage, photo: HTMLImageElement | null) {
  const { largeur: W, hauteur: H } = FORMATS[format];
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const police = (typeof document !== 'undefined' && getComputedStyle(document.body).fontFamily) || 'sans-serif';

  // Fond : la photo en plein cadre, assombrie (sinon un dégradé vert sombre)
  const fond = ctx.createLinearGradient(0, 0, W, H);
  fond.addColorStop(0, '#14532d');
  fond.addColorStop(1, '#1c1917');
  ctx.fillStyle = fond;
  ctx.fillRect(0, 0, W, H);
  if (photo) {
    const e = Math.max(W / photo.width, H / photo.height);
    ctx.drawImage(photo, (W - photo.width * e) / 2, (H - photo.height * e) / 2, photo.width * e, photo.height * e);
    ctx.fillStyle = 'rgba(12, 10, 9, 0.72)';
    ctx.fillRect(0, 0, W, H);
  }

  // Zone de la photo entière (sans recadrage) et zone du texte
  const marge = Math.round(W * 0.06);
  // Sans photo, le texte prend toute la largeur
  const paysage = format === 'facebook' && !!photo;
  const zonePhoto = paysage
    ? { x: marge, y: marge, l: W * 0.42, h: H - 2 * marge }
    : { x: marge, y: format === 'story' ? H * 0.12 : marge, l: W - 2 * marge, h: H * (format === 'story' ? 0.52 : 0.5) };
  const zoneTexte = paysage
    ? { x: W * 0.42 + 2 * marge, y: marge, l: W - (W * 0.42 + 3 * marge), h: H - 2 * marge }
    : { x: marge, y: zonePhoto.y + zonePhoto.h + marge * 0.8, l: W - 2 * marge, h: 0 };

  if (photo) {
    const e = Math.min(zonePhoto.l / photo.width, zonePhoto.h / photo.height);
    const l = photo.width * e, h = photo.height * e;
    const x = zonePhoto.x + (zonePhoto.l - l) / 2, y = zonePhoto.y + (zonePhoto.h - h) / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 40;
    ctx.drawImage(photo, x, y, l, h);
    ctx.restore();
  }

  // Titre et sous-titre, centrés (fonctionne aussi pour l'arabe)
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const centre = zoneTexte.x + zoneTexte.l / 2;
  const tailleTitre = format === 'facebook' ? (paysage ? 52 : 64) : format === 'story' ? 96 : 64;
  ctx.font = `700 ${tailleTitre}px ${police}`;
  const lignes = couperLignes(ctx, contenu.titre || 'Tala DZ', zoneTexte.l, format === 'carre' ? 2 : 3);
  let y = paysage ? zoneTexte.y + zoneTexte.h * 0.18 : format === 'facebook' ? H * 0.3 : zoneTexte.y;
  for (const l of lignes) { ctx.fillText(l, centre, y); y += tailleTitre * 1.2; }
  if (contenu.sousTitre) {
    const tailleSous = Math.round(tailleTitre * 0.55);
    ctx.font = `400 ${tailleSous}px ${police}`;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    y += tailleSous * 0.4;
    for (const l of couperLignes(ctx, contenu.sousTitre, zoneTexte.l, format === 'carre' ? 1 : 2)) { ctx.fillText(l, centre, y); y += tailleSous * 1.25; }
  }

  // Signature : pastille verte « taladz.com »
  const tailleSig = format === 'facebook' ? 34 : format === 'story' ? 56 : 42;
  ctx.font = `700 ${tailleSig}px ${police}`;
  const texteSig = 'taladz.com';
  const lSig = ctx.measureText(texteSig).width + tailleSig * 1.4;
  const hSig = tailleSig * 1.7;
  const xSig = centre - lSig / 2;
  const ySig = format === 'facebook' ? H - marge - hSig : H - marge * (format === 'story' ? 2.2 : 1) - hSig;
  ctx.fillStyle = '#16a34a';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(xSig, ySig, lSig, hSig, hSig / 2);
  else ctx.rect(xSig, ySig, lSig, hSig);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(texteSig, centre, ySig + hSig / 2);
}

const enFichier = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
  new Promise((resolve) => {
    try { canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9); } catch { resolve(null); }
  });

/** Texte de la publication : titre, auteur, résumé et lien vers la page de l'œuvre sur Tala DZ */
export function texteLegende(contenu: ContenuImage, lien: string, resume?: string): string {
  const court = (resume || '').replace(/\s+/g, ' ').trim();
  const extrait = court.length > 400 ? `${court.slice(0, 400).replace(/\s+\S*$/, '')}…` : court;
  return [
    contenu.sousTitre ? `${contenu.titre} — ${contenu.sousTitre}` : contenu.titre,
    extrait,
    `👉 ${lien}`,
    '#TalaDZ #CultureAlgérienne',
  ].filter(Boolean).join('\n\n');
}

const copier = async (texte: string): Promise<boolean> => {
  try { await navigator.clipboard.writeText(texte); return true; } catch { /* navigateur sans presse-papiers */ }
  const zone = document.createElement('textarea');
  zone.value = texte;
  zone.style.position = 'fixed';
  zone.style.opacity = '0';
  document.body.appendChild(zone);
  zone.select();
  const ok = document.execCommand('copy');
  zone.remove();
  return ok;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contenu: ContenuImage;
  /** Adresse de la page de l'œuvre (pour la découvrir ou la commander) */
  lien: string;
  /** Résumé de l'œuvre, repris dans le texte de la publication */
  resume?: string;
  /** Nom du fichier (sans extension) */
  nomFichier?: string;
}

const ImagesReseaux: React.FC<Props> = ({ open, onOpenChange, contenu, lien, resume, nomFichier = 'taladz' }) => {
  const { t } = useTranslation();
  const [format, setFormat] = useState<FormatReseau>('carre');
  const [apercu, setApercu] = useState<string | null>(null);
  const [fichier, setFichier] = useState<Blob | null>(null);
  const [calcul, setCalcul] = useState(false);
  const [legende, setLegende] = useState('');
  const [copie, setCopie] = useState(false);
  const photoRef = useRef<{ url?: string; img: HTMLImageElement | null } | null>(null);

  // Texte proposé à l'ouverture (modifiable avant de publier)
  useEffect(() => {
    if (open) { setLegende(texteLegende(contenu, lien, resume)); setCopie(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seulement à l'ouverture
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let annule = false;
    let adresse: string | null = null;
    (async () => {
      setCalcul(true);
      const url = adresseImage(contenu.image);
      if (!photoRef.current || photoRef.current.url !== url) photoRef.current = { url, img: await chargerImage(url) };
      const canvas = document.createElement('canvas');
      dessiner(canvas, format, contenu, photoRef.current.img);
      let blob = await enFichier(canvas);
      if (!blob && photoRef.current.img) {
        // Photo refusée par le navigateur (autre site) : image sans la photo plutôt que rien
        dessiner(canvas, format, contenu, null);
        blob = await enFichier(canvas);
      }
      if (annule) return;
      adresse = blob ? URL.createObjectURL(blob) : null;
      setFichier(blob);
      setApercu(adresse);
      setCalcul(false);
    })();
    return () => { annule = true; if (adresse) URL.revokeObjectURL(adresse); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seulement ce qui change l'image
  }, [open, format, contenu.titre, contenu.sousTitre, contenu.image]);

  const nom = `${nomFichier}-${format}.jpg`;

  const telecharger = () => {
    if (!apercu) return;
    const a = document.createElement('a');
    a.href = apercu;
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const copierLegende = async () => {
    const ok = await copier(legende);
    setCopie(ok);
    if (ok) window.setTimeout(() => setCopie(false), 3000);
    return ok;
  };

  const fichierPartage = fichier ? new File([fichier], nom, { type: 'image/jpeg' }) : null;
  const peutPartager = !!fichierPartage && typeof navigator !== 'undefined'
    && typeof navigator.canShare === 'function' && navigator.canShare({ files: [fichierPartage] });

  const partager = async () => {
    if (!fichierPartage) return;
    // Instagram ignore le texte envoyé avec l'image : il est copié, il suffit de le coller en légende
    await copierLegende();
    try {
      await navigator.share({ files: [fichierPartage], title: contenu.titre, text: legende });
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') telecharger();
    }
  };

  // Facebook : publier le lien lui-même (image et titre affichés, un clic ouvre la page pour commander)
  const publierLienFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(lien)}`, '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  const choix: { cle: FormatReseau; libelle: string; taille: string }[] = [
    { cle: 'carre', libelle: t('share.images.carre', 'Instagram publication'), taille: '1080 × 1080' },
    { cle: 'story', libelle: t('share.images.story', 'Instagram story'), taille: '1080 × 1920' },
    { cle: 'facebook', libelle: t('share.images.facebook', 'Facebook'), taille: '1200 × 630' },
  ];
  const facebook = format === 'facebook';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('share.images.titre', 'Image pour les réseaux')}</DialogTitle>
          <DialogDescription>
            {t('share.images.aide', 'Choisissez le format, puis partagez l’image ou enregistrez-la pour la publier.')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('share.images.format', 'Format')}>
          {choix.map((c) => (
            <button key={c.cle} type="button" role="radio" aria-checked={format === c.cle} onClick={() => setFormat(c.cle)}
              className={cn('rounded-lg border p-2 text-center text-xs min-h-[44px] transition-colors',
                format === c.cle ? 'border-green-600 bg-green-50 dark:bg-green-950 font-semibold' : 'hover:bg-muted')}>
              <span className="block">{c.libelle}</span>
              <span className="block text-muted-foreground">{c.taille}</span>
            </button>
          ))}
        </div>

        {facebook && (
          <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
            <p className="text-sm">{t('share.images.facebookAide', 'Le mieux sur Facebook : publier le lien. La publication montre l’image et le titre, et un clic ouvre la page de l’œuvre pour la découvrir ou la commander.')}</p>
            <Button type="button" onClick={publierLienFacebook} className="w-full bg-blue-600 hover:bg-blue-700">
              <Facebook className="h-4 w-4 me-2" aria-hidden="true" />{t('share.images.publierLien', 'Publier le lien sur Facebook')}
            </Button>
          </div>
        )}

        <div className="flex items-center justify-center rounded-lg bg-muted min-h-[200px]">
          {calcul || !apercu
            ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label={t('common.loading', 'Chargement…')} />
            : <img src={apercu} alt={t('share.images.apercu', 'Aperçu de l’image')} className="max-h-[45vh] w-auto rounded" />}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="legende-reseaux" className="text-sm font-medium">{t('share.images.legende', 'Texte de la publication (résumé et lien)')}</label>
          <Textarea id="legende-reseaux" dir="auto" rows={6} value={legende} onChange={(e) => setLegende(e.target.value)} />
          <Button type="button" variant="outline" size="sm" onClick={copierLegende} aria-live="polite">
            {copie ? <Check className="h-4 w-4 me-2" aria-hidden="true" /> : <Copy className="h-4 w-4 me-2" aria-hidden="true" />}
            {copie ? t('share.images.texteCopie', 'Texte copié : collez-le dans la légende') : t('share.images.copierTexte', 'Copier le texte')}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {peutPartager && (
            <Button type="button" onClick={partager} disabled={calcul} variant={facebook ? 'outline' : 'default'}
              className={cn('flex-1', !facebook && 'bg-green-600 hover:bg-green-700')}>
              <Share2 className="h-4 w-4 me-2" aria-hidden="true" />{t('share.images.partager', 'Partager l’image')}
            </Button>
          )}
          <Button type="button" variant={peutPartager || facebook ? 'outline' : 'default'} onClick={telecharger} disabled={calcul || !apercu} className="flex-1">
            <Download className="h-4 w-4 me-2" aria-hidden="true" />{t('share.images.telecharger', 'Télécharger')}
          </Button>
        </div>
        {!facebook && (
          <p className="text-xs text-muted-foreground">
            {t('share.images.lienBio', 'Sur Instagram, un lien dans le texte ne se clique pas : mettez aussi le lien de votre page Tala DZ dans votre bio (« lien en bio »).')}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImagesReseaux;
