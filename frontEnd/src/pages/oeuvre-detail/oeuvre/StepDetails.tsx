/**
 * StepDetails - Étape 2 : Détails spécifiques selon le type d'œuvre
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/UI/card';
import { Input } from '@/components/UI/input';
import { Label } from '@/components/UI/label';
import { Textarea } from '@/components/UI/textarea';
import { Checkbox } from '@/components/UI/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/UI/select';
import { Alert, AlertDescription } from '@/components/UI/alert';
import { Info } from 'lucide-react';

interface StepDetailsProps {
  formData: any;
  updateFormData: (field: string, value: any) => void;
  errors: Record<string, string>;
  metadata: any;
}

const StepDetails: React.FC<StepDetailsProps> = ({
  formData,
  updateFormData,
  errors,
  metadata
}) => {
  const { t } = useTranslation();

  // Déterminer le type d'œuvre sélectionné
  const selectedType = metadata.types_oeuvres?.find(
    (t: any) => t.id_type_oeuvre === formData.id_type_oeuvre
  );
  const typeCode = selectedType?.code?.toLowerCase() || '';

  // Champs spécifiques par type
  const renderFieldsByType = () => {
    switch (typeCode) {
      case 'livre':
      case 'litterature':
        return <LivreFields formData={formData} updateFormData={updateFormData} errors={errors} metadata={metadata} />;
      
      case 'film':
      case 'cinema':
        return <FilmFields formData={formData} updateFormData={updateFormData} errors={errors} />;
      
      case 'musique':
        return <MusiqueFields formData={formData} updateFormData={updateFormData} errors={errors} />;
      
      case 'art':
      case 'peinture':
      case 'sculpture':
        return <ArtFields formData={formData} updateFormData={updateFormData} errors={errors} metadata={metadata} />;
      
      case 'article':
      case 'recherche':
        return <ArticleFields formData={formData} updateFormData={updateFormData} errors={errors} />;
      
      case 'artisanat':
        return <ArtisanatFields formData={formData} updateFormData={updateFormData} errors={errors} metadata={metadata} />;
      
      default:
        return <DefaultFields formData={formData} updateFormData={updateFormData} errors={errors} />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-serif">
          {t('oeuvre.steps.details.title', 'Détails spécifiques')}
        </CardTitle>
        <CardDescription>
          {selectedType 
            ? t('oeuvre.steps.details.description', 'Informations spécifiques pour : {{type}}', { type: selectedType.nom_type })
            : t('oeuvre.steps.details.selectType', 'Sélectionnez d\'abord un type d\'œuvre')
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!formData.id_type_oeuvre ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {t('oeuvre.steps.details.noType', 'Veuillez d\'abord sélectionner un type d\'œuvre dans l\'étape précédente.')}
            </AlertDescription>
          </Alert>
        ) : (
          renderFieldsByType()
        )}
      </CardContent>
    </Card>
  );
};

// Champs pour les livres
const LivreFields: React.FC<any> = ({ formData, updateFormData, errors, metadata }) => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-2">
          <Label htmlFor="isbn">{t('oeuvre.fields.isbn', 'ISBN')}</Label>
          <Input
            id="isbn"
            value={formData.isbn || ''}
            onChange={(e) => updateFormData('isbn', e.target.value)}
            placeholder="978-3-16-148410-0"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="nb_pages">{t('oeuvre.fields.pages', 'Nombre de pages')}</Label>
          <Input
            id="nb_pages"
            type="number"
            min="1"
            value={formData.nb_pages || ''}
            onChange={(e) => updateFormData('nb_pages', parseInt(e.target.value) || undefined)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="editeur">{t('oeuvre.fields.publisher', 'Éditeur')}</Label>
        <Select
          value={formData.id_editeur?.toString()}
          onValueChange={(v) => updateFormData('id_editeur', parseInt(v))}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('common.select', 'Sélectionner')} />
          </SelectTrigger>
          <SelectContent>
            {metadata.editeurs?.map((editeur: any) => (
              <SelectItem key={editeur.id_editeur} value={editeur.id_editeur.toString()}>
                {editeur.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="resume">{t('oeuvre.fields.summary', 'Résumé')}</Label>
        <Textarea
          id="resume"
          value={formData.resume || ''}
          onChange={(e) => updateFormData('resume', e.target.value)}
          placeholder={t('oeuvre.fields.summaryPlaceholder', 'Résumé du livre...')}
          className="min-h-[100px]"
        />
      </div>
    </div>
  );
};

// Champs pour les films
const FilmFields: React.FC<any> = ({ formData, updateFormData, errors }) => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-2">
          <Label htmlFor="realisateur">{t('oeuvre.fields.director', 'Réalisateur')}</Label>
          <Input
            id="realisateur"
            value={formData.realisateur || ''}
            onChange={(e) => updateFormData('realisateur', e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="duree">{t('oeuvre.fields.duration', 'Durée (minutes)')}</Label>
          <Input
            id="duree"
            type="number"
            min="1"
            value={formData.duree_minutes || ''}
            onChange={(e) => updateFormData('duree_minutes', parseInt(e.target.value) || undefined)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="synopsis">{t('oeuvre.fields.synopsis', 'Synopsis')}</Label>
        <Textarea
          id="synopsis"
          value={formData.synopsis || ''}
          onChange={(e) => updateFormData('synopsis', e.target.value)}
          className="min-h-[100px]"
        />
      </div>
    </div>
  );
};

// Champs pour la musique
const MusiqueFields: React.FC<any> = ({ formData, updateFormData, errors }) => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-2">
          <Label htmlFor="label">{t('oeuvre.fields.label', 'Label')}</Label>
          <Input
            id="label"
            value={formData.label || ''}
            onChange={(e) => updateFormData('label', e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="duree_album">{t('oeuvre.fields.albumDuration', 'Durée de l\'album')}</Label>
          <Input
            id="duree_album"
            value={formData.duree_album || ''}
            onChange={(e) => updateFormData('duree_album', e.target.value)}
            placeholder="45:30"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="genre_musical">{t('oeuvre.fields.genre', 'Genre musical')}</Label>
        <Input
          id="genre_musical"
          value={formData.genre_musical || ''}
          onChange={(e) => updateFormData('genre_musical', e.target.value)}
          placeholder="Chaabi, Raï, Andalou..."
        />
      </div>
    </div>
  );
};

// Champs pour l'art
const ArtFields: React.FC<any> = ({ formData, updateFormData, errors, metadata }) => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-2">
          <Label>{t('oeuvre.fields.technique', 'Technique')}</Label>
          <Select
            value={formData.id_technique?.toString()}
            onValueChange={(v) => updateFormData('id_technique', parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('common.select', 'Sélectionner')} />
            </SelectTrigger>
            <SelectContent>
              {metadata.techniques?.map((tech: any) => (
                <SelectItem key={tech.id_technique} value={tech.id_technique.toString()}>
                  {tech.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>{t('oeuvre.fields.material', 'Matériau')}</Label>
          <Select
            value={formData.id_materiau?.toString()}
            onValueChange={(v) => updateFormData('id_materiau', parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('common.select', 'Sélectionner')} />
            </SelectTrigger>
            <SelectContent>
              {metadata.materiaux?.map((mat: any) => (
                <SelectItem key={mat.id_materiau} value={mat.id_materiau.toString()}>
                  {mat.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-2">
          <Label htmlFor="dimensions">{t('oeuvre.fields.dimensions', 'Dimensions')}</Label>
          <Input
            id="dimensions"
            value={formData.dimensions || ''}
            onChange={(e) => updateFormData('dimensions', e.target.value)}
            placeholder="100 x 80 cm"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="poids">{t('oeuvre.fields.weight', 'Poids (kg)')}</Label>
          <Input
            id="poids"
            type="number"
            step="0.1"
            value={formData.poids || ''}
            onChange={(e) => updateFormData('poids', parseFloat(e.target.value) || undefined)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="support">{t('oeuvre.fields.support', 'Support')}</Label>
        <Input
          id="support"
          value={formData.support || ''}
          onChange={(e) => updateFormData('support', e.target.value)}
          placeholder="Toile, Papier, Bois..."
        />
      </div>
    </div>
  );
};

// Champs pour les articles/recherche
const ArticleFields: React.FC<any> = ({ formData, updateFormData, errors }) => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-2">
          <Label htmlFor="journal">{t('oeuvre.fields.journal', 'Journal/Revue')}</Label>
          <Input
            id="journal"
            value={formData.journal || ''}
            onChange={(e) => updateFormData('journal', e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="doi">{t('oeuvre.fields.doi', 'DOI')}</Label>
          <Input
            id="doi"
            value={formData.doi || ''}
            onChange={(e) => updateFormData('doi', e.target.value)}
            placeholder="10.1000/xyz123"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-3 gap-4 sm:gap-6">
        <div className="space-y-2">
          <Label htmlFor="volume">{t('oeuvre.fields.volume', 'Volume')}</Label>
          <Input
            id="volume"
            value={formData.volume || ''}
            onChange={(e) => updateFormData('volume', e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="numero">{t('oeuvre.fields.issue', 'Numéro')}</Label>
          <Input
            id="numero"
            value={formData.numero || ''}
            onChange={(e) => updateFormData('numero', e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="pages">{t('oeuvre.fields.pages', 'Pages')}</Label>
          <Input
            id="pages"
            value={formData.pages || ''}
            onChange={(e) => updateFormData('pages', e.target.value)}
            placeholder="1-20"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="url_source">{t('oeuvre.fields.sourceUrl', 'URL source')}</Label>
        <Input
          id="url_source"
          type="url"
          value={formData.url_source || ''}
          onChange={(e) => updateFormData('url_source', e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="peer_reviewed"
          checked={formData.peer_reviewed || false}
          onCheckedChange={(checked) => updateFormData('peer_reviewed', !!checked)}
        />
        <Label htmlFor="peer_reviewed" className="cursor-pointer">
          {t('oeuvre.fields.peerReviewed', 'Article évalué par les pairs')}
        </Label>
      </div>
    </div>
  );
};

// Champs pour l'artisanat
const ArtisanatFields: React.FC<any> = ({ formData, updateFormData, errors, metadata }) => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-2">
          <Label>{t('oeuvre.fields.material', 'Matériau')}</Label>
          <Select
            value={formData.id_materiau?.toString()}
            onValueChange={(v) => updateFormData('id_materiau', parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('common.select', 'Sélectionner')} />
            </SelectTrigger>
            <SelectContent>
              {metadata.materiaux?.map((mat: any) => (
                <SelectItem key={mat.id_materiau} value={mat.id_materiau.toString()}>
                  {mat.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>{t('oeuvre.fields.technique', 'Technique')}</Label>
          <Select
            value={formData.id_technique?.toString()}
            onValueChange={(v) => updateFormData('id_technique', parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('common.select', 'Sélectionner')} />
            </SelectTrigger>
            <SelectContent>
              {metadata.techniques?.map((tech: any) => (
                <SelectItem key={tech.id_technique} value={tech.id_technique.toString()}>
                  {tech.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-2">
          <Label htmlFor="dimensions">{t('oeuvre.fields.dimensions', 'Dimensions')}</Label>
          <Input
            id="dimensions"
            value={formData.dimensions || ''}
            onChange={(e) => updateFormData('dimensions', e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="poids">{t('oeuvre.fields.weight', 'Poids (g)')}</Label>
          <Input
            id="poids"
            type="number"
            value={formData.poids || ''}
            onChange={(e) => updateFormData('poids', parseFloat(e.target.value) || undefined)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="region_origine">{t('oeuvre.fields.region', 'Région d\'origine')}</Label>
        <Input
          id="region_origine"
          value={formData.region_origine || ''}
          onChange={(e) => updateFormData('region_origine', e.target.value)}
          placeholder="Kabylie, M'zab, Aurès..."
        />
      </div>
    </div>
  );
};

// Champs par défaut
const DefaultFields: React.FC<any> = ({ formData, updateFormData, errors }) => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="details">{t('oeuvre.fields.additionalDetails', 'Détails supplémentaires')}</Label>
        <Textarea
          id="details"
          value={formData.details_supplementaires || ''}
          onChange={(e) => updateFormData('details_supplementaires', e.target.value)}
          placeholder={t('oeuvre.fields.additionalDetailsPlaceholder', 'Ajoutez des informations complémentaires...')}
          className="min-h-[150px]"
        />
      </div>
    </div>
  );
};

export default StepDetails;
