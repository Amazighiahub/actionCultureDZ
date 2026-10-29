/**
 * Traduction d'un bloc de l'article dans une autre langue : le texte d'origine est affiché
 * au-dessus, la traduction se tape dessous. Images, vidéos et mise en page sont communes à
 * toutes les langues ; seul le texte se traduit (voir utils/traductionBlocs.ts).
 */
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import { getAssetUrl } from '@/helpers/assetUrl';
import type { ArticleBlock } from '@/types/models/articles.types';
import { isListBlock, isTableBlock } from '@/types/models/articles.types';
import { aTraduire, traductionDe, type TraductionBloc } from '@/utils/traductionBlocs';

interface Props {
  block: ArticleBlock;
  index: number;
  langue: string;
  onUpdate: (index: number, updates: Partial<ArticleBlock>) => void;
}

const Origine: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{t('article_articleeditor.traduction.origine', 'Texte d’origine')}</p>
      <div dir="auto" className="rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground whitespace-pre-line">{children}</div>
    </div>
  );
};

const ArticleBlockTraduction: React.FC<Props> = ({ block, index, langue, onUpdate }) => {
  const { t } = useTranslation();
  const tr: TraductionBloc = traductionDe(block, langue) || {};
  const dir = langue === 'ar' ? 'rtl' : 'ltr';
  // Liste et tableau tels que tapés (une ligne vide créée par « Entrée » doit rester visible)
  const [texteListe, setTexteListe] = React.useState(() => (Array.isArray(tr.contenu_json) ? tr.contenu_json.join('\n') : ''));
  const tableau = tr.contenu_json && !Array.isArray(tr.contenu_json) ? tr.contenu_json : null;
  const [texteLignes, setTexteLignes] = React.useState(() => (tableau ? tableau.rows.map(r => r.join(' | ')).join('\n') : ''));

  const maj = (champs: TraductionBloc) => {
    const traductions = { ...(block.metadata?.traductions || {}) };
    traductions[langue] = { ...tr, ...champs };
    onUpdate(index, { metadata: { ...block.metadata, traductions } });
  };

  if (!aTraduire(block)) {
    return <p className="text-sm text-muted-foreground">{t('article_articleeditor.traduction.rien', 'Rien à traduire dans ce bloc : il est commun à toutes les langues.')}</p>;
  }

  const champTexte = (multiligne: boolean) => (
    <div className="space-y-1">
      <Label>{t('article_articleeditor.traduction.votre', 'Traduction')}</Label>
      {multiligne
        ? <Textarea dir={dir} value={tr.contenu || ''} onChange={(e) => maj({ contenu: e.target.value })} placeholder={block.contenu} className="min-h-[100px]" />
        : <Input dir={dir} value={tr.contenu || ''} onChange={(e) => maj({ contenu: e.target.value })} placeholder={block.contenu} />}
    </div>
  );

  switch (block.type_block) {
    case 'text':
    case 'heading':
      return <div className="space-y-3"><Origine>{block.contenu}</Origine>{champTexte(block.type_block === 'text')}</div>;

    case 'citation':
      return (
        <div className="space-y-3">
          <Origine>{block.contenu}{block.metadata?.author ? ` — ${block.metadata.author}` : ''}</Origine>
          {champTexte(true)}
          {block.metadata?.author && (
            <Input dir={dir} value={tr.author || ''} onChange={(e) => maj({ author: e.target.value })}
              placeholder={block.metadata.author} aria-label={t('article_articleeditor.traduction.auteur', 'Auteur de la citation (traduit)')} />
          )}
        </div>
      );

    case 'list':
      return (
        <div className="space-y-3">
          <Origine>{isListBlock(block) ? block.contenu_json.join('\n') : ''}</Origine>
          <div className="space-y-1">
            <Label>{t('article_articleeditor.traduction.liste', 'Traduction (un élément par ligne, dans le même ordre)')}</Label>
            <Textarea dir={dir} value={texteListe} className="min-h-[100px]"
              onChange={(e) => { setTexteListe(e.target.value); maj({ contenu_json: e.target.value.split('\n').filter(l => l.trim()) }); }} />
          </div>
        </div>
      );

    case 'table': {
      if (!isTableBlock(block)) return null;
      return (
        <div className="space-y-3">
          <Origine>{[block.contenu_json.headers.join(' | '), ...block.contenu_json.rows.map((r: string[]) => r.join(' | '))].join('\n')}</Origine>
          <div className="space-y-1">
            <Label>{t('article_articleeditor.traduction.entetes', 'En-têtes traduits (séparés par des virgules)')}</Label>
            <Input dir={dir} value={tableau?.headers.join(', ') || ''} placeholder={block.contenu_json.headers.join(', ')}
              onChange={(e) => maj({ contenu_json: { headers: e.target.value.split(',').map(h => h.trim()), rows: tableau?.rows || [] } })} />
          </div>
          <div className="space-y-1">
            <Label>{t('article_articleeditor.traduction.lignes', 'Lignes traduites (une par ligne, cellules séparées par |)')}</Label>
            <Textarea dir={dir} value={texteLignes} className="min-h-[100px]"
              onChange={(e) => {
                setTexteLignes(e.target.value);
                maj({ contenu_json: { headers: tableau?.headers || [], rows: e.target.value.split('\n').filter(l => l.trim()).map(l => l.split('|').map(c => c.trim())) } });
              }} />
          </div>
        </div>
      );
    }

    case 'image':
    case 'video':
      return (
        <div className="space-y-3">
          {block.type_block === 'image' && block.media?.url && (
            <img src={getAssetUrl(block.media.url)} alt="" className="h-24 rounded border object-cover" />
          )}
          <Origine>{block.metadata?.caption}</Origine>
          <div className="space-y-1">
            <Label>{t('article_articleeditor.traduction.legende', 'Légende traduite')}</Label>
            <Input dir={dir} value={tr.caption || ''} onChange={(e) => maj({ caption: e.target.value })} placeholder={block.metadata?.caption} />
          </div>
        </div>
      );

    default:
      return null;
  }
};

export default ArticleBlockTraduction;
