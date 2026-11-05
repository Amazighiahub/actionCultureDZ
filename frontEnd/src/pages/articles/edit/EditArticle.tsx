// pages/EditArticle.tsx - Modifier un article, publié ou non (titre, texte, images, métadonnées)
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import ArticleEditor from '@/components/article/ArticleEditor';
import { oeuvreService } from '@/services/oeuvre.service';
import { articleBlockService } from '@/services/articleBlock.service';
import { httpClient } from '@/services/httpClient';
import { prepareImageForUpload } from '@/utils/prepareImageForUpload';
import { detailsArticle, liensArticle, nomDuTag } from '@/utils/donneesArticle';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from "react-i18next";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { rafraichirTableauDeBord } from '@/lib/queryClient';
import { useNavigationDifferee } from '@/hooks/useNavigationDifferee';

/* eslint-disable @typescript-eslint/no-explicit-any */

const EditArticle: React.FC = () => {
  const { id } = useParams<{id: string;}>();
  const navigate = useNavigate();
  const naviguerPlusTard = useNavigationDifferee();
  const [initialData, setInitialData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  // Identifiant de la fiche article, qui porte les blocs (différent de celui de l'œuvre)
  const idFicheArticle = useRef<number | null>(null);

  useEffect(() => {
    if (id) {
      loadArticle();
    }
  }, [id]);

  const loadArticle = async () => {
    try {
      setLoading(true);

      // Toutes les langues : avec la version traduite, la traduction était réenregistrée comme texte français
      const response = await oeuvreService.getForEdit(parseInt(id!, 10));

      if (response.success && response.data) {
        const oeuvre = response.data as any;

        // Vérifier que c'est un article (type 4 ou 5)
        if (oeuvre.id_type_oeuvre !== 4 && oeuvre.id_type_oeuvre !== 5) {
          setError(t('article_articleeditor.pasUnArticle', "Cette œuvre n'est pas un article"));
          return;
        }

        // L'article de quelqu'un d'autre se corrige par une proposition, validée par son auteur
        if (user && !isAdmin && oeuvre.saisi_par !== user.id_user) {
          navigate(`/articles/${id}/proposer`, { replace: true });
          return;
        }

        const isScientific = oeuvre.id_type_oeuvre === 5;
        idFicheArticle.current = isScientific
          ? oeuvre.ArticleScientifique?.id_article_scientifique ?? null
          : oeuvre.Article?.id_article ?? null;

        // Données initiales ; les blocs du contenu sont chargés par l'éditeur (articleId)
        setInitialData({
          id_oeuvre: oeuvre.id_oeuvre,
          titre: oeuvre.titre,
          description: oeuvre.description,
          id_langue: oeuvre.id_langue,
          categories: oeuvre.Categories?.map((c: any) => c.id_categorie) || [],
          tags: (oeuvre.Tags || []).map(nomDuTag).filter(Boolean),
          type: isScientific ? 'article_scientifique' : 'article',
        });
      } else {
        setError(t('article_articleeditor.introuvable', 'Article non trouvé'));
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError(t('common.loadError', "Error loading article"));
    } finally {
      setLoading(false);
    }
  };

  /** Image ajoutée dans un bloc : envoyée d'abord, pour ne rien modifier si cet envoi échoue */
  const envoyerImage = async (fichier: File, oeuvreId: number, numeroBloc: number): Promise<number> => {
    const formData = new FormData();
    // Champ « medias » attendu par le serveur (avec « files », chaque image était refusée)
    formData.append('medias', await prepareImageForUpload(fichier));
    const envoi = await httpClient.postFormData<any>(`/oeuvres/${oeuvreId}/medias/upload`, formData);
    const medias = Array.isArray(envoi.data) ? envoi.data : [envoi.data];
    if (!envoi.success || !medias[0]?.id_media) {
      throw new Error(t('toasts.imageUploadFailed', "Échec de l'envoi de l'image (bloc {{index}})", { index: numeroBloc }));
    }
    return medias[0].id_media;
  };

  // Une erreur remonte à l'éditeur : il l'affiche et la saisie reste à l'écran (avant : « succès » malgré un échec)
  const handleSave = async (response: Record<string, any>) => {
    const oeuvreId = parseInt(id!, 10);
    const { formData, blocks, contributeurs, editeurs } = response.article;
    const articleType = formData.type === 'article_scientifique' ? 'article_scientifique' : 'article';

    try {
      // Article sans bloc : refusé (le contenu n'a peut-être pas pu être chargé, il ne doit pas être effacé)
      if (!blocks?.length) {
        throw new Error(t('article_articleeditor.contenuVide', 'L’article doit garder au moins un bloc de contenu.'));
      }
      if (!idFicheArticle.current) {
        throw new Error(t('toasts.articleBlocksIdMissing'));
      }

      // 1. Nouvelles images
      const blocsPrets: any[] = [];
      for (let index = 0; index < blocks.length; index++) {
        const block = blocks[index];
        const { tempFile, ...metadata } = block.metadata || {};
        const id_media = block.type_block === 'image' && tempFile instanceof File
          ? await envoyerImage(tempFile, oeuvreId, index + 1)
          : block.id_media || block.media?.id_media || null;
        blocsPrets.push({
          id_article: idFicheArticle.current,
          type_block: block.type_block,
          contenu: block.contenu || '',
          contenu_json: block.contenu_json || null,
          metadata,
          id_media,
          ordre: index,
          visible: block.visible !== false,
        });
      }

      // 2. Titre, description, catégories, mots-clés, champs de l'article, intervenants ajoutés
      const miseAJour = await oeuvreService.updateOeuvre(oeuvreId, {
        titre: formData.titre,
        description: formData.description,
        categories: formData.categories,
        tags: formData.tags,
        details_specifiques: detailsArticle(formData, { modification: true }),
        ...liensArticle(contributeurs, editeurs),
      } as any);
      if (!miseAJour.success) {
        throw new Error(miseAJour.error || t('toasts.updateError'));
      }

      // 3. Blocs (la route remplace les anciens en une seule transaction)
      const enregistrement = await articleBlockService.createMultipleBlocks({
        id_article: idFicheArticle.current,
        article_type: articleType,
        blocks: blocsPrets,
      } as any);
      if (!enregistrement.success) {
        throw new Error(enregistrement.error || t('toasts.articleBlocksSaveFailed'));
      }

      rafraichirTableauDeBord();
      toast({
        title: t('common.success', 'Succès'),
        description: t('article.updateSuccess', 'Article mis à jour avec succès !'),
      });
      naviguerPlusTard(`/articles/${id}`, 1000);
    } catch (err: unknown) {
      console.error('❌ Erreur mise à jour article:', err);
      toast({
        title: t('toasts.error'),
        description: err instanceof Error ? err.message : t('toasts.updateError'),
        variant: 'destructive',
      });
      throw err;
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

              <ArrowLeft className="h-4 w-4 me-2 rtl:-scale-x-100" />{t("articles_editarticle.retour_dashboard")}

            </Button>

            <Alert variant="destructive">
              <AlertDescription>
                {error || t('article_articleeditor.introuvable', 'Article non trouvé')}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-background pattern-geometric">
      <Header />
      <div className="container py-12">
        <div className="max-w-4xl mx-auto">
          {/* articleId : l'éditeur recharge les blocs de l'article (sans lui, le contenu restait vide
              et l'enregistrement effaçait tous les blocs) */}
          <ArticleEditor
            articleId={parseInt(id!, 10)}
            initialData={initialData}
            onBack={() => navigate(-1)}
            onSave={handleSave} />

        </div>
      </div>
    </div>);

};

export default EditArticle;
