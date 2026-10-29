import React, { useState } from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ArticleBlockEditor from '../ArticleBlockEditor';
import type { ArticleBlock } from '@/types/models/articles.types';

/** Bloc « Liste » branché sur un état, comme dans l'éditeur */
const ListeEditable: React.FC<{ initial: string[] | undefined; onChange: (b: ArticleBlock) => void }> = ({ initial, onChange }) => {
  const [block, setBlock] = useState({ type_block: 'list', ordre: 0, contenu_json: initial } as unknown as ArticleBlock);
  return (
    <ArticleBlockEditor
      block={block} index={0}
      onUpdate={(_i, maj) => setBlock(prev => { const b = { ...prev, ...maj } as ArticleBlock; onChange(b); return b; })}
      onDelete={() => {}} onMoveUp={() => {}} onMoveDown={() => {}} onDuplicate={() => {}}
      canMoveUp={false} canMoveDown={false} />
  );
};

describe('ArticleBlockEditor — bloc Liste', () => {
  test('« Entrée » passe à l’élément suivant (la ligne vide n’est plus effacée pendant la frappe)', async () => {
    let dernier: ArticleBlock | null = null;
    render(<ListeEditable initial={undefined} onChange={(b) => { dernier = b; }} />);
    const zone = screen.getByRole('textbox');
    await userEvent.type(zone, 'Colonnes de marbre{Enter}Faïences{Enter}Fontaine');
    expect(zone).toHaveValue('Colonnes de marbre\nFaïences\nFontaine');
    expect(dernier!.contenu_json).toEqual(['Colonnes de marbre', 'Faïences', 'Fontaine']);
  });

  test('une liste existante s’affiche une ligne par élément ; les lignes vides ne sont pas enregistrées', async () => {
    let dernier: ArticleBlock | null = null;
    render(<ListeEditable initial={['Un', 'Deux']} onChange={(b) => { dernier = b; }} />);
    const zone = screen.getByRole('textbox');
    expect(zone).toHaveValue('Un\nDeux');
    await userEvent.type(zone, '{Enter}{Enter}');
    expect(zone).toHaveValue('Un\nDeux\n\n');
    expect(dernier!.contenu_json).toEqual(['Un', 'Deux']);
  });
});
