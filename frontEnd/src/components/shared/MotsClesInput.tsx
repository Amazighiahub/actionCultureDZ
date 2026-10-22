/**
 * MotsClesInput — saisie de mots-clés (tags) : champ + bouton « + », liste de badges supprimables.
 * Utilisé par les formulaires d'artisanat et d'événement (même table de mots-clés côté serveur).
 */
import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MotsClesInputProps {
  id: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
  addLabel: string;
  removeLabel: (tag: string) => string;
  /** Nombre maximal de mots-clés (au-delà, l'ajout est ignoré) */
  max?: number;
}

const MotsClesInput: React.FC<MotsClesInputProps> = ({ id, value, onChange, placeholder, addLabel, removeLabel, max = 20 }) => {
  const [saisie, setSaisie] = useState('');

  const ajouter = () => {
    // Plusieurs mots-clés d'un coup, séparés par des virgules
    const nouveaux = saisie.split(',').map(s => s.trim()).filter(Boolean)
      .filter(t => !value.some(v => v.toLowerCase() === t.toLowerCase()));
    if (nouveaux.length) onChange([...value, ...nouveaux].slice(0, max));
    setSaisie('');
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Input
          id={id}
          aria-label={placeholder}
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              ajouter();
            }
          }}
        />
        <Button type="button" onClick={ajouter} variant="outline" aria-label={addLabel}>
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="px-3 py-1">
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter(t => t !== tag))}
                className="ms-2 hover:text-destructive"
                aria-label={removeLabel(tag)}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default MotsClesInput;
