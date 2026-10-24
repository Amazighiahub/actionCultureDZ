/**
 * BlocsArticle — affiche, sur la page publique d'un site, les blocs écrits avec
 * « Écrire un article » (SectionArticleEditor) : texte, titre, citation, image, vidéo, séparateur.
 * Les blocs sont rangés comme l'éditeur les enregistre (metadata.level, .author, .url, .alt).
 */
import React from 'react';
import { getAssetUrl } from '@/helpers/assetUrl';
import { safeExternalUrl, getAllowedEmbedUrl } from '@/utils/safeUrl';
import type { PatrimoineBlock } from '@/services/patrimoineArticles.service';

const meta = (b: PatrimoineBlock, cle: string): string | undefined => {
  const v = (b.metadata as Record<string, unknown> | null | undefined)?.[cle];
  return typeof v === 'string' && v.trim() ? v : undefined;
};

const Bloc: React.FC<{ bloc: PatrimoineBlock }> = ({ bloc }) => {
  const texte = (bloc.contenu || '').trim();
  switch (bloc.type_block) {
    case 'text':
      return texte ? <p className="leading-relaxed text-muted-foreground whitespace-pre-wrap">{texte}</p> : null;
    case 'heading': {
      if (!texte) return null;
      const niveau = meta(bloc, 'level');
      if (niveau === 'h4') return <h5 className="font-medium">{texte}</h5>;
      if (niveau === 'h3') return <h4 className="font-semibold">{texte}</h4>;
      return <h3 className="text-lg font-semibold">{texte}</h3>;
    }
    case 'citation':
      return texte ? (
        <blockquote className="border-s-4 border-primary/40 ps-4 italic text-muted-foreground">
          <p className="whitespace-pre-wrap">{texte}</p>
          {meta(bloc, 'author') && <cite className="block mt-1 text-sm not-italic">— {meta(bloc, 'author')}</cite>}
        </blockquote>
      ) : null;
    case 'image': {
      const src = bloc.media?.url ? getAssetUrl(bloc.media.url) : safeExternalUrl(meta(bloc, 'url') || texte);
      return src ? (
        <figure>
          <img src={src} alt={meta(bloc, 'alt') || ''} loading="lazy" decoding="async" className="rounded-lg max-w-full max-h-[480px] object-contain mx-auto" />
          {meta(bloc, 'alt') && <figcaption className="text-xs text-muted-foreground text-center mt-1">{meta(bloc, 'alt')}</figcaption>}
        </figure>
      ) : null;
    }
    case 'video':
    case 'embed': {
      const src = getAllowedEmbedUrl(meta(bloc, 'url') || texte);
      return src ? (
        <div className="aspect-video">
          <iframe
            src={src}
            title="Vidéo"
            className="w-full h-full rounded-lg"
            allowFullScreen
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : null;
    }
    case 'separator':
      return <hr className="my-2" />;
    default:
      return texte ? <p className="leading-relaxed text-muted-foreground whitespace-pre-wrap">{texte}</p> : null;
  }
};

const BlocsArticle: React.FC<{ blocs: PatrimoineBlock[] }> = ({ blocs }) => {
  if (blocs.length === 0) return null;
  return (
    <div className="space-y-4">
      {blocs.map(b => <Bloc key={b.id_block} bloc={b} />)}
    </div>
  );
};

export default BlocsArticle;
