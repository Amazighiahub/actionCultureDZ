/**
 * Couverture d'un article sans image : dessinée dans le navigateur (titre, auteur, motifs
 * géométriques inspirés des décors berbères et des zelliges), sans intelligence artificielle ni
 * service extérieur. Elle ne prétend montrer ni une personne ni un lieu : seulement le titre.
 */
import React, { useEffect, useState } from 'react';
import { couperLignes } from '@/components/shared/ImagesReseaux';

const L = 1200;
const H = 630;

/** Couleurs tirées du titre : chaque article garde toujours la même couverture */
const PALETTES = [
  ['#14532d', '#0f2e1d', '#d9b45a'],
  ['#7c2d12', '#3b1308', '#f2c879'],
  ['#1e3a5f', '#0d1b2e', '#e8c26a'],
  ['#4a1d4f', '#230d26', '#e9b85c'],
  ['#5b4a14', '#2a220a', '#f0d27a'],
];
const empreinte = (s: string) => Array.from(s).reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

/** Losanges et chevrons en bandes, comme sur les poteries et tapis berbères */
function motifs(ctx: CanvasRenderingContext2D, couleur: string) {
  ctx.save();
  ctx.strokeStyle = couleur;
  ctx.globalAlpha = 0.22;
  ctx.lineWidth = 3;
  const pas = 60;
  for (const yBande of [70, H - 70]) {
    for (let x = -pas; x < L + pas; x += pas) {
      ctx.beginPath();
      ctx.moveTo(x, yBande);
      ctx.lineTo(x + pas / 2, yBande - 26);
      ctx.lineTo(x + pas, yBande);
      ctx.lineTo(x + pas / 2, yBande + 26);
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 0.08;
  for (let y = 140; y < H - 140; y += 70) {
    for (let x = (y / 70) % 2 ? 0 : 35; x < L; x += 70) {
      ctx.beginPath();
      ctx.moveTo(x, y - 18);
      ctx.lineTo(x + 18, y);
      ctx.lineTo(x, y + 18);
      ctx.lineTo(x - 18, y);
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function dessinerCouverture(canvas: HTMLCanvasElement, titre: string, auteur: string | undefined, rtl: boolean): boolean {
  canvas.width = L;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const [c1, c2, or] = PALETTES[empreinte(titre || 'Tala DZ') % PALETTES.length];
  const fond = ctx.createLinearGradient(0, 0, L, H);
  fond.addColorStop(0, c1);
  fond.addColorStop(1, c2);
  ctx.fillStyle = fond;
  ctx.fillRect(0, 0, L, H);
  motifs(ctx, or);

  const police = rtl ? "'Noto Sans Arabic', 'Tajawal', sans-serif" : "'Playfair Display', Georgia, serif";
  ctx.direction = rtl ? 'rtl' : 'ltr';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  const taille = 64;
  ctx.font = `700 ${taille}px ${police}`;
  const lignes = couperLignes(ctx, titre || 'Tala DZ', L - 220, 3);
  const hauteur = lignes.length * taille * 1.35;
  let y = H / 2 - hauteur / 2 + taille * 0.6 - (auteur ? 24 : 0);
  for (const l of lignes) { ctx.fillText(l, L / 2, y); y += taille * 1.35; }

  if (auteur) {
    ctx.font = `500 34px ${police}`;
    ctx.fillStyle = or;
    ctx.fillText(auteur, L / 2, y + 18);
  }
  ctx.font = "700 26px 'Inter', sans-serif";
  ctx.direction = 'ltr';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('taladz.com', L / 2, H - 28);
  return true;
}

interface Props {
  titre: string;
  auteur?: string;
  rtl?: boolean;
}

const CouvertureAuto: React.FC<Props> = ({ titre, auteur, rtl = false }) => {
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    const dessiner = () => {
      const canvas = document.createElement('canvas');
      if (!dessinerCouverture(canvas, titre, auteur, rtl)) return;
      try { if (actif) setImage(canvas.toDataURL('image/jpeg', 0.88)); } catch { /* navigateur sans canvas */ }
    };
    // Attendre les polices du site (sinon le titre arabe serait dessiné avec une police de secours)
    const polices = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
    if (polices?.ready) polices.ready.then(dessiner).catch(dessiner); else dessiner();
    return () => { actif = false; };
  }, [titre, auteur, rtl]);

  if (!image) return null;
  return (
    <figure className="mag-couverture-auto">
      <img src={image} alt="" aria-hidden="true" />
    </figure>
  );
};

export default CouvertureAuto;
