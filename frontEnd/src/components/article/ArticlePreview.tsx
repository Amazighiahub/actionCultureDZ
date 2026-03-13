/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import DOMPurify from 'dompurify';
import { getAssetUrl } from '@/helpers/assetUrl';

import type { ArticleBlock, ArticleFormData } from '@/types/models/articles.types';
import { isListBlock, isTableBlock } from '@/types/models/articles.types';

import type {
  IntervenantExistant,
  NouvelIntervenant,
  ContributeurOeuvre,
} from '@/types/api/oeuvre-creation.types';

interface ArticlePreviewProps {
  formData: ArticleFormData;
  blocks: ArticleBlock[];
  contributeurs: ContributeurOeuvre[];
  intervenantsExistants: IntervenantExistant[];
  nouveauxIntervenants: NouvelIntervenant[];
}

const renderPreviewBlock = (block: ArticleBlock, index: number) => {
  switch (block.type_block) {
    case 'text':
      return <p key={index}>{block.contenu}</p>;

    case 'heading': {
      const HeadingTag = `h${block.metadata?.level || 2}` as keyof JSX.IntrinsicElements;
      return <HeadingTag key={index}>{block.contenu}</HeadingTag>;
    }

    case 'image':
      return block.media?.url ? (
        <figure key={index} className="my-6">
          <img
            src={getAssetUrl(block.media.url)}
            alt={block.metadata?.caption || 'Image'}
            className="rounded-lg max-w-full max-h-[600px] object-contain mx-auto" />
          {block.metadata?.caption && (
            <figcaption className="image-caption">{block.metadata.caption}</figcaption>
          )}
        </figure>
      ) : null;

    case 'video':
      return block.contenu ? (
        <div key={index} className="embed-container">
          <iframe src={block.contenu} frameBorder="0" allowFullScreen title="Embedded content" />
        </div>
      ) : null;

    case 'citation':
      return (
        <blockquote key={index}>
          <p>{block.contenu}</p>
          {block.metadata?.author && <cite>— {block.metadata.author}</cite>}
        </blockquote>
      );

    case 'list': {
      if (!isListBlock(block)) return null;
      return block.metadata?.listType === 'ordered' ? (
        <ol key={index}>{block.contenu_json.map((item, i) => <li key={i}>{item}</li>)}</ol>
      ) : (
        <ul key={index}>{block.contenu_json.map((item, i) => <li key={i}>{item}</li>)}</ul>
      );
    }

    case 'table': {
      if (!isTableBlock(block)) return null;
      return (
        <table key={index}>
          <thead>
            <tr>{block.contenu_json.headers.map((header, i) => <th key={i}>{header}</th>)}</tr>
          </thead>
          <tbody>
            {block.contenu_json.rows.map((row, i) => (
              <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      );
    }

    case 'code':
      return <pre key={index}><code>{block.contenu}</code></pre>;

    case 'separator':
      return <hr key={index} />;

    case 'embed':
      if (block.contenu) {
        const sanitizeEmbed = (html: string) => {
          const temp = document.createElement('div');
          temp.innerHTML = html;
          const iframe = temp.querySelector('iframe');
          if (iframe) {
            const src = iframe.getAttribute('src') || '';
            const allowedDomains = ['youtube.com', 'youtube-nocookie.com', 'vimeo.com', 'dailymotion.com', 'soundcloud.com'];
            const isAllowed = allowedDomains.some(domain => src.includes(domain));
            if (!isAllowed) return '';
          }
          return DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ['iframe', 'div', 'span'],
            ALLOWED_ATTR: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'class', 'title']
          });
        };
        const sanitizedContent = sanitizeEmbed(block.contenu);
        return sanitizedContent ? (
          <div key={index} className="embed-container" dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
        ) : null;
      }
      return null;

    default:
      return null;
  }
};

const ArticlePreview: React.FC<ArticlePreviewProps> = ({
  formData, blocks, contributeurs, intervenantsExistants, nouveauxIntervenants
}) => {
  return (
    <Card>
      <CardContent className="p-8">
        <article className="article-preview max-w-3xl mx-auto">
          {formData.type === 'article_scientifique' ? (
            <>
              {formData.journal && (
                <div className="journal-banner">
                  <span className="journal-name">{formData.journal}</span>
                  <span className="journal-details">
                    {formData.volume ? `Vol. ${formData.volume}` : ''}
                    {formData.numero ? `, N° ${formData.numero}` : ''}
                    {formData.pages ? ` — pp. ${formData.pages}` : ''}
                    {formData.annee_creation ? ` (${formData.annee_creation})` : ''}
                  </span>
                </div>
              )}

              <div className={formData.journal ? 'paper' : ''}>
                <div className="scientific-header">
                  <h1>{formData.titre || 'Sans titre'}</h1>
                </div>

                {(contributeurs.length > 0 || intervenantsExistants.length > 0 || nouveauxIntervenants.length > 0) && (
                  <div className="scientific-authors">
                    {[
                      ...nouveauxIntervenants.map((ni) => `${ni.prenom || ''} ${ni.nom || ''}`.trim()),
                      ...contributeurs.map((_c, i) => `Contributeur ${i + 1}`),
                      ...intervenantsExistants.map((_ie, i) => `Intervenant ${i + 1}`)
                    ].filter(Boolean).join(', ')}
                  </div>
                )}

                {formData.annee_creation && (
                  <div className="scientific-affiliation">{formData.annee_creation}</div>
                )}

                {(formData.doi || formData.peer_reviewed || formData.issn || formData.impact_factor) && (
                  <div className="scientific-badges">
                    {formData.doi && (
                      <span className="sci-badge doi">
                        <a href={`https://doi.org/${formData.doi}`} target="_blank" rel="noopener noreferrer">DOI: {formData.doi}</a>
                      </span>
                    )}
                    {formData.peer_reviewed && <span className="sci-badge peer">Peer-reviewed</span>}
                    {formData.issn && <span className="sci-badge issn">ISSN: {formData.issn}</span>}
                    {formData.impact_factor && <span className="sci-badge if-badge">IF: {formData.impact_factor}</span>}
                  </div>
                )}

                {formData.description && (
                  <div className="scientific-abstract">
                    <h3>Abstract / Résumé</h3>
                    <p>{formData.description}</p>
                  </div>
                )}

                <div className="scientific-body">
                  {blocks.map((block, index) => renderPreviewBlock(block, index))}
                </div>
              </div>
            </>
          ) : (
            <>
              <h1>{formData.titre || 'Sans titre'}</h1>
              {formData.sous_titre && (
                <p className="lead text-xl text-gray-600 mb-4">{formData.sous_titre}</p>
              )}
              <p className="lead text-lg text-gray-600 mb-6">{formData.description}</p>
              {blocks.map((block, index) => renderPreviewBlock(block, index))}
            </>
          )}
        </article>
      </CardContent>
    </Card>
  );
};

export default ArticlePreview;
