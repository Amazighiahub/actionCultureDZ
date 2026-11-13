/**
 * « Citer cette page » (audit V11 OUT-6) : repli discret en bas d'une fiche, trois formats et un bouton
 * « Copier » par format. Rien ne se charge tant qu'on ne l'ouvre pas.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { copyText } from '@/hooks/useShare';
import { citationApa, citationBibtex, citationChicago, type SourceCitation } from '@/utils/citation';

export default function CiterCettePage({ source }: { source: SourceCitation }) {
  const { t, i18n } = useTranslation();
  const [ouvert, setOuvert] = useState(false);
  const [copie, setCopie] = useState<string | null>(null);
  const langue = i18n.language || 'fr';

  const formats = ouvert ? [
    { nom: 'APA', texte: citationApa(source, langue) },
    { nom: 'Chicago', texte: citationChicago(source, langue) },
    { nom: 'BibTeX', texte: citationBibtex(source) }
  ] : [];

  const copier = async (nom: string, texte: string) => {
    if (await copyText(texte)) {
      setCopie(nom);
      setTimeout(() => setCopie((c) => (c === nom ? null : c)), 2000);
    }
  };

  return (
    <details className="rounded-lg border bg-card p-4 text-sm" onToggle={(e) => setOuvert((e.target as HTMLDetailsElement).open)}>
      <summary className="flex cursor-pointer items-center gap-2 font-medium">
        <Quote className="h-4 w-4" aria-hidden="true" />
        {t('citation.titre', 'Citer cette page')}
      </summary>
      <div className="mt-3 space-y-3">
        {formats.map(({ nom, texte }) => (
          <div key={nom} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{nom}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => copier(nom, texte)}>
                {copie === nom ? <Check className="h-4 w-4 me-1" aria-hidden="true" /> : <Copy className="h-4 w-4 me-1" aria-hidden="true" />}
                {copie === nom ? t('citation.copiee', 'Copié') : t('citation.copier', 'Copier')}
                <span className="sr-only"> ({nom})</span>
              </Button>
            </div>
            <pre className="whitespace-pre-wrap break-words rounded-md bg-muted/50 p-2 font-sans text-xs" dir="auto">{texte}</pre>
          </div>
        ))}
      </div>
    </details>
  );
}
