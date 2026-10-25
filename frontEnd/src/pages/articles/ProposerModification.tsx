/**
 * ProposerModification — /articles/:id/proposer : compléter ou corriger l'article de quelqu'un
 * d'autre. L'éditeur avancé s'ouvre sur l'article existant ; un motif est obligatoire.
 * La proposition reste un brouillon jusqu'à la décision de l'auteur ou de l'administration.
 */
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GitPullRequestArrow } from 'lucide-react';
import Header from '@/components/Header';
import ArticleEditor from '@/components/article/ArticleEditor';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { uploadService } from '@/services/upload.service';
import { articleRevisionService, type BlocRevision } from '@/services/articleRevision.service';
import type { ArticleSaveResponse } from '@/types/models/articles.types';

const ProposerModification: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const idOeuvre = parseInt(id || '', 10);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [motif, setMotif] = useState('');
  const [erreurMotif, setErreurMotif] = useState(false);

  const envoyer = async (reponse: ArticleSaveResponse) => {
    if (motif.trim().length < 5) {
      setErreurMotif(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      throw new Error(t('revisions.motifRequis', 'Expliquez en quelques mots ce que vous ajoutez ou corrigez (motif).'));
    }
    const { formData, blocks } = reponse.article as unknown as { formData: { titre: unknown; description: unknown }; blocks: Array<BlocRevision & { metadata?: Record<string, unknown> & { tempFile?: File } }> };

    // Nouvelles photos : envoyées sur le site, la proposition garde leur adresse
    const blocsEnvoyes: BlocRevision[] = [];
    for (const b of blocks) {
      const metadata = { ...(b.metadata || {}) } as Record<string, unknown>;
      const fichier = metadata.tempFile;
      delete metadata.tempFile;
      if (b.type_block === 'image' && fichier instanceof File) {
        const envoi = await uploadService.uploadImage(fichier);
        const url = envoi.success ? (envoi.data as { url?: string } | undefined)?.url : undefined;
        if (!url) throw new Error(t('toasts.imageUploadFailed', "Échec de l'envoi de l'image"));
        metadata.url = url;
        blocsEnvoyes.push({ type_block: 'image', contenu: b.contenu || '', metadata });
        continue;
      }
      blocsEnvoyes.push({
        type_block: b.type_block, contenu: b.contenu || '', contenu_json: b.contenu_json ?? null, metadata,
        ...(b.type_block === 'image' ? { id_media: b.id_media ?? (b.media as { id_media?: number } | null | undefined)?.id_media ?? null } : {})
      });
    }

    const res = await articleRevisionService.proposer(idOeuvre, {
      motif: motif.trim(), titre: formData.titre, description: formData.description, blocks: blocsEnvoyes
    });
    if (!res.success) throw new Error(res.error || t('revisions.envoiEchec', 'La proposition n’a pas pu être envoyée'));
    toast({
      title: t('revisions.envoyee', 'Proposition envoyée'),
      description: t('revisions.envoyeeDetail', 'L’auteur de l’article et l’administration vont l’examiner. Vous serez prévenu de leur décision.')
    });
    navigate(`/articles/${idOeuvre}`);
  };

  return (
    <div className="min-h-screen bg-background pattern-geometric">
      <Header />
      <div className="container py-8">
        <div className="max-w-5xl mx-auto space-y-4">
          <Card className={erreurMotif ? 'border-destructive' : 'border-primary/40'}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start gap-3">
                <GitPullRequestArrow className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <h1 className="font-semibold text-lg">{t('revisions.titre', 'Proposer une modification')}</h1>
                  <p className="text-sm text-muted-foreground">
                    {t('revisions.explication', 'Complétez ou corrigez l’article ci-dessous. Votre version reste un brouillon : l’article publié ne change pas tant que son auteur ou l’administration ne l’a pas acceptée.')}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="motif">{t('revisions.motif', 'Motif de la modification')} *</Label>
                <Textarea
                  id="motif"
                  value={motif}
                  onChange={(e) => { setMotif(e.target.value); if (erreurMotif) setErreurMotif(false); }}
                  placeholder={t('revisions.motifExemple', 'Par exemple : « Ajout de la recette de ma grand-mère », « Correction de la date de construction », « Nouvelle photo du patio »')}
                  maxLength={2000}
                  rows={2}
                  aria-invalid={erreurMotif}
                />
                {erreurMotif && <p className="text-sm text-destructive">{t('revisions.motifRequis', 'Expliquez en quelques mots ce que vous ajoutez ou corrigez (motif).')}</p>}
              </div>
            </CardContent>
          </Card>

          <ArticleEditor
            articleId={idOeuvre}
            onBack={() => navigate(`/articles/${idOeuvre}`)}
            onSave={envoyer}
            titrePage={t('revisions.titre', 'Proposer une modification')}
            libelleEnregistrer={t('revisions.envoyer', 'Envoyer la proposition')}
          />
        </div>
      </div>
    </div>
  );
};

export default ProposerModification;
