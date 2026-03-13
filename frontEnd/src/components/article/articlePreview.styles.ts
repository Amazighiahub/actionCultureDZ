export const PREVIEW_STYLES = `
  .article-preview {
    font-family: Georgia, serif;
    line-height: 1.8;
    color: #333;
  }

  .article-preview h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: #1a1a1a;
  }

  .article-preview h2 {
    font-size: 2rem;
    font-weight: 600;
    margin-top: 2rem;
    margin-bottom: 1rem;
    color: #2a2a2a;
  }

  .article-preview h3 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    color: #3a3a3a;
  }

  .article-preview p {
    margin-bottom: 1.5rem;
  }

  .article-preview blockquote {
    border-left: 4px solid #e5e7eb;
    padding-left: 1.5rem;
    margin: 2rem 0;
    font-style: italic;
    color: #6b7280;
  }

  .article-preview blockquote cite {
    display: block;
    text-align: right;
    margin-top: 0.5rem;
    font-size: 0.875rem;
    font-style: normal;
  }

  .article-preview ul, .article-preview ol {
    margin-bottom: 1.5rem;
    padding-left: 2rem;
  }

  .article-preview li {
    margin-bottom: 0.5rem;
  }

  .article-preview pre {
    background-color: #f3f4f6;
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin-bottom: 1.5rem;
  }

  .article-preview code {
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
  }

  .article-preview img {
    max-width: 100%;
    height: auto;
    margin: 2rem auto;
    display: block;
  }

  .article-preview img.full-width {
    width: 100%;
  }

  .article-preview img.float-left {
    float: left;
    margin-right: 2rem;
    margin-bottom: 1rem;
    max-width: 50%;
  }

  .article-preview img.float-right {
    float: right;
    margin-left: 2rem;
    margin-bottom: 1rem;
    max-width: 50%;
  }

  .article-preview .image-caption {
    text-align: center;
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 0.5rem;
    font-style: italic;
  }

  .article-preview hr {
    border: none;
    border-top: 2px solid #e5e7eb;
    margin: 3rem 0;
  }

  .article-preview table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1.5rem;
  }

  .article-preview th,
  .article-preview td {
    border: 1px solid #e5e7eb;
    padding: 0.75rem;
    text-align: left;
  }

  .article-preview th {
    background-color: #f9fafb;
    font-weight: 600;
  }

  .article-preview .embed-container {
    position: relative;
    padding-bottom: 56.25%;
    height: 0;
    overflow: hidden;
    margin-bottom: 1.5rem;
  }

  .article-preview .embed-container iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  /* ============================================
     SCIENTIFIC ARTICLE — Academic Paper Style
     ============================================ */

  .article-preview .journal-banner {
    background: linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%);
    color: #fff;
    padding: 0.625rem 1.25rem;
    font-size: 0.75rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 0.375rem 0.375rem 0 0;
    letter-spacing: 0.02em;
  }

  .article-preview .journal-banner .journal-name {
    font-weight: 700;
    font-style: italic;
    font-size: 0.85rem;
  }

  .article-preview .journal-banner .journal-details {
    opacity: 0.85;
    font-size: 0.7rem;
  }

  .article-preview .paper {
    border: 1px solid #d1d5db;
    border-top: none;
    background: #fff;
    padding: 2.5rem 2.5rem 2rem;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    border-radius: 0 0 0.375rem 0.375rem;
  }

  .article-preview .scientific-header h1 {
    font-family: 'Times New Roman', Times, serif;
    font-size: 1.6rem;
    font-weight: 700;
    line-height: 1.35;
    color: #111827;
    margin: 0 0 0.75rem 0;
    text-align: center;
  }

  .article-preview .scientific-authors {
    text-align: center;
    font-size: 0.9rem;
    color: #374151;
    margin-bottom: 0.25rem;
    font-weight: 500;
  }

  .article-preview .scientific-affiliation {
    text-align: center;
    font-size: 0.78rem;
    color: #6b7280;
    margin-bottom: 1rem;
    font-style: italic;
  }

  .article-preview .scientific-badges {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1.25rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .article-preview .sci-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.7rem;
    padding: 0.2rem 0.55rem;
    border-radius: 0.25rem;
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .article-preview .sci-badge.doi {
    background: #eff6ff;
    color: #1d4ed8;
    border: 1px solid #bfdbfe;
  }

  .article-preview .sci-badge.doi a {
    color: inherit;
    text-decoration: none;
  }

  .article-preview .sci-badge.doi a:hover {
    text-decoration: underline;
  }

  .article-preview .sci-badge.peer {
    background: #f0fdf4;
    color: #15803d;
    border: 1px solid #bbf7d0;
  }

  .article-preview .sci-badge.issn {
    background: #fefce8;
    color: #a16207;
    border: 1px solid #fde68a;
  }

  .article-preview .sci-badge.if-badge {
    background: #fdf2f8;
    color: #be185d;
    border: 1px solid #fbcfe8;
  }

  .article-preview .scientific-abstract {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1.75rem;
    border-radius: 0.25rem;
  }

  .article-preview .scientific-abstract h3 {
    font-family: 'Times New Roman', Times, serif;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #1e3a5f;
    margin: 0 0 0.5rem 0;
    padding-bottom: 0.35rem;
    border-bottom: 1px solid #d1d5db;
  }

  .article-preview .scientific-abstract p {
    font-family: 'Times New Roman', Times, serif;
    font-size: 0.9rem;
    color: #374151;
    margin: 0;
    line-height: 1.65;
    text-align: justify;
  }

  .article-preview .scientific-body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 0.95rem;
    line-height: 1.7;
    color: #1f2937;
  }

  @media (min-width: 640px) {
    .article-preview .scientific-body {
      column-count: 2;
      column-gap: 1.75rem;
      column-rule: 1px solid #e5e7eb;
    }
  }

  .article-preview .scientific-body p {
    text-align: justify;
    text-indent: 1.25em;
    margin-bottom: 0.6rem;
  }

  .article-preview .scientific-body p:first-child {
    text-indent: 0;
  }

  .article-preview .scientific-body h2,
  .article-preview .scientific-body h3 {
    font-family: 'Times New Roman', Times, serif;
    column-span: all;
    break-after: avoid;
    margin-top: 1.25rem;
    margin-bottom: 0.5rem;
    color: #111827;
  }

  .article-preview .scientific-body h2 {
    font-size: 1.1rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 0.25rem;
  }

  .article-preview .scientific-body h3 {
    font-size: 1rem;
    font-weight: 700;
    font-style: italic;
  }

  .article-preview .scientific-body figure {
    break-inside: avoid;
    column-span: all;
    margin: 1rem 0;
    text-align: center;
  }

  .article-preview .scientific-body figure img {
    max-width: 85%;
    border: 1px solid #e5e7eb;
    border-radius: 0.25rem;
  }

  .article-preview .scientific-body .image-caption {
    font-size: 0.8rem;
    color: #4b5563;
    margin-top: 0.35rem;
    font-style: italic;
  }

  .article-preview .scientific-body table {
    column-span: all;
    break-inside: avoid;
    font-size: 0.85rem;
    margin: 1rem 0;
  }

  .article-preview .scientific-body th {
    background: #f3f4f6;
    font-weight: 700;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .article-preview .scientific-body blockquote {
    column-span: all;
    break-inside: avoid;
    border-left: 3px solid #1e40af;
    background: #f8fafc;
    padding: 0.75rem 1rem;
    margin: 1rem 0;
    font-size: 0.9rem;
  }
`;
