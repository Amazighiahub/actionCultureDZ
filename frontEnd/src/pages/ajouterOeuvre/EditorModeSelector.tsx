import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Edit, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TypeOeuvre } from '@/types/models/references.types';
import type { ExtendedMetadata, FormData } from './types';

interface EditorModeSelectorProps {
  metadata: ExtendedMetadata;
  formData: FormData;
  showEditorChoice: boolean;
  useArticleEditor: boolean;
  setUseArticleEditor: (value: boolean) => void;
}

const EditorModeSelector: React.FC<EditorModeSelectorProps> = ({
  metadata,
  formData,
  showEditorChoice,
  useArticleEditor,
  setUseArticleEditor
}) => {
  const { t } = useTranslation();
  const typeOeuvre = metadata.types_oeuvres?.find((type: TypeOeuvre) => type.id_type_oeuvre === formData.id_type_oeuvre);
  const isArticleType = typeOeuvre && (
  typeOeuvre.id_type_oeuvre === 4 ||  // Article
  typeOeuvre.id_type_oeuvre === 5);   // Article Scientifique

  if (!isArticleType || !showEditorChoice) return null;

  return (
    <Card className="shadow-cultural">
      <CardHeader>
        <CardTitle className="text-2xl font-serif">{t("ajouteroeuvre.mode_ddition")}</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">{t("ajouteroeuvre.choisissez_comment_crer")}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setUseArticleEditor(false)}
            className={`p-6 rounded-lg border-2 transition-all hover-lift ${
            !useArticleEditor ?
            'border-primary bg-primary/5 shadow-md' :
            'border-border hover:border-primary/50'}`
            }>
            <FileText className="h-8 w-8 mb-3 mx-auto text-primary" />
            <h3 className="font-semibold mb-2">{t("ajouteroeuvre.formulaire_classique")}</h3>
            <p className="text-sm text-muted-foreground">{t("ajouteroeuvre.simple_rapide_pour")}</p>
          </button>
          
          <button
            type="button"
            onClick={() => setUseArticleEditor(true)}
            className={`p-6 rounded-lg border-2 transition-all hover-lift ${
            useArticleEditor ?
            'border-primary bg-primary/5 shadow-md' :
            'border-border hover:border-primary/50'}`
            }>
            <Edit className="h-8 w-8 mb-3 mx-auto text-primary" />
            <h3 className="font-semibold mb-2">{t("ajouteroeuvre.diteur_avanc")}</h3>
            <p className="text-sm text-muted-foreground">{t("ajouteroeuvre.mise_page_riche")}</p>
          </button>
        </div>
        
        {useArticleEditor &&
        <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t("ajouteroeuvre.lditeur_avanc_vous")}
            <ul className="list-disc list-inside mt-2 text-sm">
                <li>{t("ajouteroeuvre.titres_soustitres_hirarchiss")}</li>
                <li>{t("ajouteroeuvre.images_avec_lgendes")}</li>
                <li>{t("ajouteroeuvre.citations_mises_forme")}</li>
                <li>{t("ajouteroeuvre.listes_tableaux")}</li>
                <li>{t("ajouteroeuvre.blocs_code_pour")}</li>
              </ul>
            </AlertDescription>
          </Alert>
        }
      </CardContent>
    </Card>);
};

export default EditorModeSelector;
