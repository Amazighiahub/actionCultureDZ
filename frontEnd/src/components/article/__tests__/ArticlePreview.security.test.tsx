import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import ArticlePreview from '../ArticlePreview';
import type { ArticleBlock, ArticleFormData } from '@/types/models/articles.types';

const formData = { titre: 'Test', description: '', categories: [], tags: [] } as unknown as ArticleFormData;

const renderBlocks = (blocks: Partial<ArticleBlock>[]) => render(
  <ArticlePreview
    formData={formData}
    blocks={blocks as ArticleBlock[]}
    contributeurs={[]}
    intervenantsExistants={[]}
    nouveauxIntervenants={[]}
  />
);

describe('ArticlePreview — blocs vidéo / embed', () => {
  test('vidéo d\'un hôte autorisé : iframe isolée (sandbox)', () => {
    const { container } = renderBlocks([{ type_block: 'video', contenu: 'https://www.youtube.com/embed/abc', ordre: 0 }]);
    const iframe = container.querySelector('iframe');
    expect(iframe?.getAttribute('src')).toBe('https://www.youtube.com/embed/abc');
    expect(iframe?.getAttribute('sandbox')).toContain('allow-scripts');
  });

  test.each([
    ['video', 'javascript:alert(1)'],
    ['video', 'https://evil.tld/?youtube.com'],
    ['embed', '<img src=x onerror=alert(1)><iframe src="https://evil.tld"></iframe>'],
    ['embed', '<iframe src="https://evil.tld/?youtube.com"></iframe>']
  ])('bloc %s malveillant %p : rien n\'est rendu', (type, contenu) => {
    const { container } = renderBlocks([{ type_block: type as ArticleBlock['type_block'], contenu, ordre: 0 }]);
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('img[onerror]')).toBeNull();
  });
});
