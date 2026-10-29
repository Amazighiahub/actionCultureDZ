import React, { useState } from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ArticleBlockEditor from '../ArticleBlockEditor';
import type { ArticleBlock } from '@/types/models/articles.types';

/** Bloc branché sur un état, comme dans l'éditeur, en mode traduction */
const BlocATraduire: React.FC<{ initial: ArticleBlock; langue: string; onChange: (b: ArticleBlock) => void }> = ({ initial, langue, onChange }) => {
  const [block, setBlock] = useState(initial);
  return (
    <ArticleBlockEditor
      block={block} index={0} langueTraduction={langue}
      onUpdate={(_i, maj) => setBlock(prev => { const b = { ...prev, ...maj } as ArticleBlock; onChange(b); return b; })}
      onDelete={() => {}} onMoveUp={() => {}} onMoveDown={() => {}} onDuplicate={() => {}}
      canMoveUp canMoveDown />
  );
};

describe('ArticleBlockEditor — traduction', () => {
  test('le texte d’origine reste intact ; la traduction est rangée par langue', async () => {
    let dernier: ArticleBlock | null = null;
    const initial = { type_block: 'text', ordre: 0, contenu: 'Les greniers des Aurès', metadata: { alignment: 'justify' } } as unknown as ArticleBlock;
    render(<BlocATraduire initial={initial} langue="en" onChange={(b) => { dernier = b; }} />);

    expect(screen.getByText('Les greniers des Aurès')).toBeInTheDocument();
    // Pas de déplacement ni de suppression pendant la traduction
    expect(screen.queryByTitle('article_articleeditor.title_supprimer')).not.toBeInTheDocument();

    await userEvent.type(screen.getByRole('textbox'), 'The granaries of the Aurès');
    expect(dernier!.contenu).toBe('Les greniers des Aurès');
    expect(dernier!.metadata).toEqual({ alignment: 'justify', traductions: { en: { contenu: 'The granaries of the Aurès' } } });
  });

  test('liste : « Entrée » passe à l’élément suivant de la traduction', async () => {
    let dernier: ArticleBlock | null = null;
    const initial = { type_block: 'list', ordre: 0, contenu_json: ['Blé', 'Orge'], metadata: {} } as unknown as ArticleBlock;
    render(<BlocATraduire initial={initial} langue="en" onChange={(b) => { dernier = b; }} />);
    await userEvent.type(screen.getByRole('textbox'), 'Wheat{Enter}Barley');
    expect(dernier!.metadata?.traductions.en.contenu_json).toEqual(['Wheat', 'Barley']);
    expect(dernier!.contenu_json).toEqual(['Blé', 'Orge']);
  });

  test('séparateur : rien à traduire', () => {
    const initial = { type_block: 'separator', ordre: 0, metadata: {} } as unknown as ArticleBlock;
    render(<BlocATraduire initial={initial} langue="ar" onChange={() => {}} />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
