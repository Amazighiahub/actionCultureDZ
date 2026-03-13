// pages/EditArticle.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ArticleEditor from '@/components/article/ArticleEditor';
import { oeuvreService } from '@/services/oeuvre.service';
import { articleBlockService } from '@/services/articleBlock.service';
import { httpClient } from '@/services/httpClient';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from "react-i18next";
import { useToast } from '@/hooks/use-toast';

const EditArticle: React.FC = () => {
  const { id } = useParams<{id: string;}>();
  const navigate = useNavigate();
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      loadArticle();
    }
  }, [id]);

  const loadArticle = async () => {
    try {
      setLoading(true);

      // Charger l'œuvre
      const response = await oeuvreService.getOeuvreById(parseInt(id!));

      if (response.success && response.data) {
        const oeuvre = response.data as any;

        // Vérifier que c'est un article (type 4 ou 5)
        if (oeuvre.id_type_oeuvre !== 4 && oeuvre.id_type_oeuvre !== 5) {
          setError("Cette œuvre n'est pas un article");
          return;
        }

        const isScientific = oeuvre.id_type_oeuvre === 5;
        const articleType = isScientific ? 'article_scientifique' : 'article';
        const articleData = oeuvre.Article || oeuvre.ArticleScientifique || oeuvre.article || oeuvre.article_scientifique;
        const blocksRecordId = articleData?.id_article ?? articleData?.id_article_scientifique ?? parseInt(id!);

        // Charger les blocs (utiliser l'ID article/article_scientifique, pas oeuvre)
        const blocksResponse = await articleBlockService.getBlocksByArticle(blocksRecordId, articleType);

        // Préparer les données initiales avec les blocs
        setInitialData({
          id_oeuvre: oeuvre.id_oeuvre,
          titre: oeuvre.titre,
          description: oeuvre.description,
          id_langue: oeuvre.id_langue,
          categories: oeuvre.Categories?.map((c: any) => c.id_categorie) || [],
          tags: oeuvre.Tags?.map((t: any) => t.nom) || [],
          type: articleType,
          // Champs spécifiques — accès sécurisé
          auteur: oeuvre.Article?.auteur || null,
          resume: oeuvre.ArticleScientifique?.resume || null,
          url_source: oeuvre.ArticleScientifique?.url_hal || null,
          journal: oeuvre.ArticleScientifique?.journal || null,
          doi: oeuvre.ArticleScientifique?.doi || null,
          pages: oeuvre.ArticleScientifique?.pages || null,
          volume: oeuvre.ArticleScientifique?.volume || null,
          numero: oeuvre.ArticleScientifique?.numero || null,
          peer_reviewed: oeuvre.ArticleScientifique?.peer_reviewed || false,
          // Ajouter les blocs existants
          existingBlocks: blocksResponse.data || []
        });
      } else {
        setError("Article non trouvé");
      }
    } catch (error) {
      console.error('Erreur:', error);
      setError(t('common.loadError', "Error loading article"));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (response: any) => {
    const oeuvreId = parseInt(id!);
    const { formData: articleFormData, blocks } = response.article;
    const isScientific = articleFormData.type === 'article_scientifique';
    const articleType = isScientific ? 'article_scientifique' : 'article';

    console.log('📝 Mise à jour article:', oeuvreId, '| blocs:', blocks?.length, '| type:', articleType);

    try {
      // 1. Mettre à jour les métadonnées de l'oeuvre
      const updateData: any = {
        titre: articleFormData.titre,
        description: articleFormData.description,
      };
      if (articleFormData.categories?.length > 0) {
        updateData.categories = articleFormData.categories;
      }
      if (articleFormData.tags?.length > 0) {
        updateData.tags = articleFormData.tags;
      }
      await oeuvreService.updateOeuvre(oeuvreId, updateData);
      console.log('✅ Métadonnées oeuvre mises à jour');

      // 2. Sauvegarder les blocs
      if (blocks && blocks.length > 0) {
        // Récupérer l'ID de l'article spécifique
        const oeuvreDetail = await oeuvreService.getOeuvreById(oeuvreId);
        const od = oeuvreDetail.data as any;
        let articleRecordId: number | undefined;
        if (isScientific) {
          articleRecordId = od?.ArticleScientifique?.id_article_scientifique
            || od?.article_scientifique?.id_article_scientifique;
        } else {
          articleRecordId = od?.Article?.id_article
            || od?.article?.id_article;
        }

        if (!articleRecordId) {
          console.error('❌ ID article spécifique introuvable pour oeuvre:', oeuvreId);
          toast({
            title: t('toasts.warning'),
            description: t('toasts.articleBlocksIdMissing'),
            variant: 'destructive',
          });
        } else {
          console.log('🔍 articleRecordId:', articleRecordId);

          // 2a. Upload des nouvelles images (blocs avec tempFile)
          const blocksWithMedia = await Promise.all(
            blocks.map(async (block: any, index: number) => {
              let id_media = block.id_media || block.media?.id_media || null;

              if (block.type_block === 'image' && block.metadata?.tempFile instanceof File) {
                try {
                  console.log(`📤 Upload image bloc ${index}...`);
                  const formData = new FormData();
                  formData.append('files', block.metadata.tempFile);
                  const uploadResult = await httpClient.postFormData<any>(
                    `/oeuvres/${oeuvreId}/medias/upload`,
                    formData
                  );
                  if (uploadResult.success && uploadResult.data) {
                    const medias = Array.isArray(uploadResult.data) ? uploadResult.data : [uploadResult.data];
                    if (medias[0]?.id_media) {
                      id_media = medias[0].id_media;
                      console.log(`✅ Image bloc ${index} uploadée, media_id:`, id_media);
                    }
                  }
                } catch (uploadErr) {
                  console.warn(`⚠️ Erreur upload image bloc ${index}:`, uploadErr);
                }
              }

              return { block, id_media, index };
            })
          );

          // 2b. Préparer les blocs à sauvegarder
          const blocksToSave = blocksWithMedia.map(({ block, id_media, index }) => {
            const cleanMetadata = block.metadata ? { ...block.metadata } : {};
            delete cleanMetadata.tempFile;

            return {
              type_block: block.type_block,
              contenu: block.contenu || '',
              contenu_json: block.contenu_json || null,
              metadata: cleanMetadata,
              id_media,
              ordre: index,
              visible: true,
            };
          });

          // 2c. Créer les nouveaux blocs (createMultipleBlocks supprime automatiquement les anciens)
          const blocksResponse = await articleBlockService.createMultipleBlocks({
            id_article: articleRecordId,
            article_type: articleType,
            blocks: blocksToSave.map((b: any) => ({ ...b, id_article: articleRecordId })),
          });

          if (!blocksResponse.success) {
            console.warn('⚠️ Erreur sauvegarde blocs:', blocksResponse.error);
            toast({
              title: t('toasts.warning'),
              description: t('toasts.articleBlocksSaveFailed'),
              variant: 'destructive',
            });
          } else {
            console.log('✅ Blocs sauvegardés:', blocksToSave.length);
          }
        }
      }

      toast({
        title: t('common.success', 'Succès'),
        description: t('article.updateSuccess', 'Article mis à jour avec succès !'),
      });

      setTimeout(() => {
        navigate(`/articles/${id}`);
      }, 1000);

    } catch (err: any) {
      console.error('❌ Erreur mise à jour article:', err);
      toast({
        title: t('toasts.error'),
        description: err.message || t('toasts.updateError'),
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pattern-geometric flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">{t("articles_editarticle.chargement_larticle")}</p>
        </div>
      </div>);

  }

  if (error || !initialData) {
    return (
      <div className="min-h-screen bg-background pattern-geometric">
        <div className="container py-12">
          <div className="max-w-4xl mx-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard-pro')}
              className="mb-4">
              
              <ArrowLeft className="h-4 w-4 mr-2" />{t("articles_editarticle.retour_dashboard")}

            </Button>
            
            <Alert variant="destructive">
              <AlertDescription>
                {error || "Article non trouvé"}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-background pattern-geometric">
      <div className="container py-12">
        <div className="max-w-4xl mx-auto">
          <ArticleEditor
            initialData={initialData}
            onBack={() => navigate('/dashboard-pro')}
            onSave={handleSave} />
          
        </div>
      </div>
    </div>);

};

export default EditArticle;