/**
 * EditorModeSelector - Sélecteur de mode d'édition pour les articles
 * Permet de choisir entre l'éditeur riche et le formulaire simple
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Edit, FileText } from 'lucide-react';

interface ExtendedMetadata {
  types_oeuvres?: Array<{
    id_type_oeuvre: number;
    nom: string;
    code?: string;
  }>;
  [key: string]: unknown;
}

interface FormData {
  id_type_oeuvre: number;
  [key: string]: unknown;
}

interface EditorModeSelectorProps {
  metadata: ExtendedMetadata;
  formData: FormData;
  showEditorChoice: boolean;
  useArticleEditor: boolean;
  onEditorModeChange: (useEditor: boolean) => void;
  onShowEditorChoice: (show: boolean) => void;
}

const EditorModeSelector: React.FC<EditorModeSelectorProps> = ({
  metadata,
  formData,
  showEditorChoice,
  useArticleEditor,
  onEditorModeChange,
  onShowEditorChoice
}) => {
  const { t } = useTranslation();

  // Vérifier si le type d'œuvre est un article
  const typeOeuvre = metadata.types_oeuvres?.find((t) => t.id_type_oeuvre === formData.id_type_oeuvre);
  const isArticleType = typeOeuvre && (
    typeOeuvre.nom.toLowerCase().includes('article') ||
    typeOeuvre.code?.toLowerCase().includes('article')
  );

  // Ne pas afficher si ce n'est pas un article
  if (!isArticleType) {
    return null;
  }

  // Si le choix n'est pas encore fait, afficher les options
  if (!showEditorChoice) {
    return (
      <Card className="shadow-cultural border-primary/20">
        <CardHeader>
          <CardTitle className="text-xl font-serif">
            {t('ajouteroeuvre.choisir_mode_edition', "Mode d'édition")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('ajouteroeuvre.article_mode_description', "Choisissez comment vous souhaitez rédiger votre article")}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option éditeur riche */}
            <Button
              type="button"
              variant="outline"
              className="h-auto p-4 flex flex-col items-start gap-2 hover:border-primary hover:bg-primary/5"
              onClick={() => {
                onEditorModeChange(true);
                onShowEditorChoice(true);
              }}
            >
              <div className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-primary" />
                <span className="font-semibold">
                  {t('ajouteroeuvre.editeur_riche', 'Éditeur riche')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground text-left">
                {t('ajouteroeuvre.editeur_riche_desc', 'Interface de type Word avec mise en forme, images, liens...')}
              </p>
            </Button>

            {/* Option formulaire simple */}
            <Button
              type="button"
              variant="outline"
              className="h-auto p-4 flex flex-col items-start gap-2 hover:border-primary hover:bg-primary/5"
              onClick={() => {
                onEditorModeChange(false);
                onShowEditorChoice(true);
              }}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-semibold">
                  {t('ajouteroeuvre.formulaire_simple', 'Formulaire simple')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground text-left">
                {t('ajouteroeuvre.formulaire_simple_desc', 'Champs de texte classiques pour un contenu simple')}
              </p>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Si le choix est fait, afficher un indicateur avec possibilité de changer
  return (
    <Card className="shadow-cultural">
      <CardContent className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {useArticleEditor ? (
              <>
                <Edit className="h-4 w-4 text-primary" />
                <span>{t('ajouteroeuvre.mode_editeur_riche', 'Mode éditeur riche')}</span>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 text-primary" />
                <span>{t('ajouteroeuvre.mode_formulaire', 'Mode formulaire')}</span>
              </>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onShowEditorChoice(false)}
          >
            {t('common.change', 'Changer')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EditorModeSelector;
