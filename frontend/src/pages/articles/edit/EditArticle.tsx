// pages/EditArticle.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ArticleEditor from '@/components/article/ArticleEditor';
import { oeuvreService } from '@/services/oeuvre.service';
import { articleBlockService } from '@/services/articleBlock.service';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';import { useTranslation } from "react-i18next";

const EditArticle: React.FC = () => {
  const { id } = useParams<{id: string;}>();
  const navigate = useNavigate();
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);const { t } = useTranslation();

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
        const oeuvre = response.data;

        // Vérifier que c'est un article (type 4 ou 5)
        if (oeuvre.id_type_oeuvre !== 4 && oeuvre.id_type_oeuvre !== 5) {
          setError("Cette œuvre n'est pas un article");
          return;
        }

        // Charger les blocs
        const blocksResponse = await articleBlockService.getBlocksByArticle(parseInt(id!));

        // Extraire les détails spécifiques
        const details = oeuvre.description || oeuvre.ArticleScientifique.resume || {};

        // Préparer les données initiales avec les blocs
        setInitialData({
          id_oeuvre: oeuvre.id_oeuvre, // Ajouter l'ID pour l'édition
          titre: oeuvre.titre,
          description: oeuvre.description,
          id_langue: oeuvre.id_langue,
          categories: oeuvre.Categories?.map((c: any) => c.id_categorie) || [],
          tags: oeuvre.Tags?.map((t: any) => t.nom) || [],
          type: oeuvre.id_type_oeuvre === 4 ? 'article' : 'article_scientifique',
          // Champs spécifiques
          auteur: oeuvre.Article.auteur,

          resume: oeuvre.ArticleScientifique.resume,
          url_source: oeuvre.ArticleScientifique.url_hal,
          journal: oeuvre.ArticleScientifique.journal,
          doi: oeuvre.ArticleScientifique.doi,
          pages: oeuvre.ArticleScientifique.pages,
          volume: oeuvre.ArticleScientifique.volume,
          numero: oeuvre.ArticleScientifique.numero,
          peer_reviewed: oeuvre.ArticleScientifique.peer_reviewed,
          // Ajouter les blocs existants
          existingBlocks: blocksResponse.data || []
        });
      } else {
        setError("Article non trouvé");
      }
    } catch (error) {
      console.error('Erreur:', error);
      setError("Erreur lors du chargement de l'article");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (response: any) => {
    console.log('Article mis à jour:', response);
    alert('Article mis à jour avec succès !');
    navigate(`/oeuvres/${id}`);
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