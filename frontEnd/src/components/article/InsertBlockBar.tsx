/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { BLOCK_TEMPLATES, BLOCK_ICONS } from './articleEditor.constants';
import type { BlockType } from '@/types/models/articles.types';

interface InsertBlockBarProps {
  insertAt: number;
  onInsert: (type: BlockType | string, insertAt?: number) => void;
}

const InsertBlockBar: React.FC<InsertBlockBarProps> = ({ insertAt, onInsert }) => {
  const [expanded, setExpanded] = React.useState(false);

  if (!expanded) {
    return (
      <div className="flex items-center gap-2 my-2">
        <div className="flex-1 border-t border-dashed border-muted-foreground/25" />
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-dashed border-primary/40 text-primary/70 bg-primary/5 hover:bg-primary/10 hover:border-primary hover:text-primary transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          Insérer ici
        </button>
        <div className="flex-1 border-t border-dashed border-muted-foreground/25" />
      </div>
    );
  }

  return (
    <div className="my-2 p-3 rounded-lg bg-muted/60 border-2 border-dashed border-primary/40">
      <p className="text-xs text-muted-foreground mb-2 font-medium">Choisir le type de bloc à insérer :</p>
      <div className="flex flex-wrap gap-2">
        {BLOCK_TEMPLATES.map((template) => {
          const Icon = BLOCK_ICONS[template.icon];
          return (
            <Button
              key={template.id}
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs gap-1.5"
              onClick={() => {
                onInsert(template.type_block, insertAt);
                setExpanded(false);
              }}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {template.name}
            </Button>
          );
        })}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-xs text-muted-foreground"
          onClick={() => setExpanded(false)}
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Annuler
        </Button>
      </div>
    </div>
  );
};

export default InsertBlockBar;
