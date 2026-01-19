/**
 * StepMedia - Étape 4 : Upload de médias
 */
import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { Progress } from '@/components/UI/progress';
import { Alert, AlertDescription } from '@/components/UI/alert';
import { 
  Upload, X, Star, Image, Film, Music, FileText, 
  AlertCircle, CheckCircle, Loader2
} from 'lucide-react';

interface MediaFile {
  id: string;
  file: File;
  preview?: string;
  type: 'image' | 'video' | 'audio' | 'document';
  isPrincipal: boolean;
  uploadProgress?: number;
  uploaded?: boolean;
  error?: string;
}

interface StepMediaProps {
  formData: any;
  updateFormData: (field: string, value: any) => void;
  errors: Record<string, string>;
}

const StepMedia: React.FC<StepMediaProps> = ({
  formData,
  updateFormData,
  errors
}) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [medias, setMedias] = useState<MediaFile[]>(formData.medias || []);

  // Déterminer le type de fichier
  const getFileType = (file: File): MediaFile['type'] => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'document';
  };

  // Obtenir l'icône selon le type
  const getTypeIcon = (type: MediaFile['type']) => {
    switch (type) {
      case 'image': return Image;
      case 'video': return Film;
      case 'audio': return Music;
      default: return FileText;
    }
  };

  // Ajouter des fichiers
  const handleFilesAdd = useCallback((files: FileList) => {
    const newMedias: MediaFile[] = [];

    Array.from(files).forEach((file) => {
      // Validation taille (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        console.warn(`Fichier ${file.name} trop volumineux (max 50MB)`);
        return;
      }

      const type = getFileType(file);
      const media: MediaFile = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        type,
        isPrincipal: medias.length === 0 && newMedias.length === 0 && type === 'image',
        uploadProgress: 0
      };

      // Créer un aperçu pour les images
      if (type === 'image') {
        const reader = new FileReader();
        reader.onloadend = () => {
          setMedias((prev) =>
            prev.map((m) =>
              m.id === media.id ? { ...m, preview: reader.result as string } : m
            )
          );
        };
        reader.readAsDataURL(file);
      }

      newMedias.push(media);
    });

    const updatedMedias = [...medias, ...newMedias];
    setMedias(updatedMedias);
    updateFormData('medias', updatedMedias);
  }, [medias, updateFormData]);

  // Supprimer un média
  const handleMediaRemove = (mediaId: string) => {
    const mediaToRemove = medias.find((m) => m.id === mediaId);
    let updatedMedias = medias.filter((m) => m.id !== mediaId);

    // Si on supprime l'image principale, définir la prochaine image comme principale
    if (mediaToRemove?.isPrincipal) {
      const nextImage = updatedMedias.find((m) => m.type === 'image');
      if (nextImage) {
        updatedMedias = updatedMedias.map((m) =>
          m.id === nextImage.id ? { ...m, isPrincipal: true } : m
        );
      }
    }

    setMedias(updatedMedias);
    updateFormData('medias', updatedMedias);
  };

  // Définir comme image principale
  const handleSetPrincipal = (mediaId: string) => {
    const updatedMedias = medias.map((m) => ({
      ...m,
      isPrincipal: m.id === mediaId
    }));
    setMedias(updatedMedias);
    updateFormData('medias', updatedMedias);
  };

  // Drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFilesAdd(e.dataTransfer.files);
    }
  };

  // Stats
  const imageCount = medias.filter((m) => m.type === 'image').length;
  const otherCount = medias.filter((m) => m.type !== 'image').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-serif">
          {t('oeuvre.steps.media.title', 'Médias')}
        </CardTitle>
        <CardDescription>
          {t('oeuvre.steps.media.description', 'Ajoutez des images, vidéos ou fichiers à votre œuvre')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Zone de dépôt */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-all
            ${isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
            }
          `}
        >
          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-foreground mb-2">
            {t('oeuvre.steps.media.dropzone', 'Glissez-déposez vos fichiers ici')}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {t('oeuvre.steps.media.formats', 'Images, vidéos, audio, PDF (max 50MB par fichier)')}
          </p>
          <input
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
            onChange={(e) => e.target.files && handleFilesAdd(e.target.files)}
            className="hidden"
            id="media-upload"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('media-upload')?.click()}
          >
            {t('oeuvre.steps.media.choose', 'Choisir des fichiers')}
          </Button>
        </div>

        {/* Info image principale */}
        <Alert>
          <Star className="h-4 w-4" />
          <AlertDescription>
            {t('oeuvre.steps.media.principalInfo', 'La première image ajoutée sera l\'image principale. Cliquez sur l\'étoile pour changer.')}
          </AlertDescription>
        </Alert>

        {/* Liste des médias */}
        {medias.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">
                {t('oeuvre.steps.media.added', 'Fichiers ajoutés')}
              </h4>
              <span className="text-sm text-muted-foreground">
                {imageCount} image(s), {otherCount} autre(s)
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {medias.map((media) => {
                const Icon = getTypeIcon(media.type);
                
                return (
                  <div
                    key={media.id}
                    className={`
                      relative group border-2 rounded-lg overflow-hidden bg-card
                      ${media.isPrincipal ? 'border-primary ring-2 ring-primary/20' : 'border-border'}
                    `}
                  >
                    {/* Aperçu */}
                    <div className="aspect-square">
                      {media.type === 'image' && media.preview ? (
                        <img
                          src={media.preview}
                          alt={media.file.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Icon className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Badge image principale */}
                    {media.isPrincipal && (
                      <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg">
                        <Star className="h-4 w-4 fill-current" />
                      </div>
                    )}

                    {/* Actions au survol */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {/* Définir comme principale (images uniquement) */}
                      {media.type === 'image' && !media.isPrincipal && (
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          onClick={() => handleSetPrincipal(media.id)}
                          title={t('oeuvre.steps.media.setPrincipal', 'Définir comme principale')}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {/* Supprimer */}
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        onClick={() => handleMediaRemove(media.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Infos fichier */}
                    <div className="p-2 bg-background">
                      <p className="text-xs truncate" title={media.file.name}>
                        {media.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(media.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>

                    {/* Progression upload */}
                    {media.uploadProgress !== undefined && media.uploadProgress < 100 && !media.uploaded && (
                      <div className="absolute bottom-0 left-0 right-0">
                        <Progress value={media.uploadProgress} className="h-1 rounded-none" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Erreurs */}
        {errors.medias && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.medias}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default StepMedia;
