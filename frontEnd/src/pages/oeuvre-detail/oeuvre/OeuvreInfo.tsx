/**
 * OeuvreInfo - Informations détaillées de l'œuvre
 * Description, métadonnées, caractéristiques
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Badge } from '@/components/UI/badge';
import { Separator } from '@/components/UI/separator';
import {
  BookOpen, Calendar, Globe, Hash, Tag, Layers,
  Clock, FileText, Award, Building, MapPin
} from 'lucide-react';
import { useLocalizedDate } from '@/hooks/useLocalizedDate';
import type { Oeuvre } from '@/types/models/oeuvre.types';

interface OeuvreInfoProps {
  oeuvre: Oeuvre;
  compact?: boolean;
}

const OeuvreInfo: React.FC<OeuvreInfoProps> = ({ oeuvre, compact = false }) => {
  const { t } = useTranslation();
  const { formatDate } = useLocalizedDate();

  // Version compacte pour la sidebar
  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('oeuvre.quickInfo', 'Informations')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {/* Type */}
          {oeuvre.TypeOeuvre && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('oeuvre.type', 'Type')}</span>
              <Badge variant="secondary">{oeuvre.TypeOeuvre.nom_type}</Badge>
            </div>
          )}

          {/* Année */}
          {oeuvre.annee_creation && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('oeuvre.year', 'Année')}</span>
              <span className="font-medium">{oeuvre.annee_creation}</span>
            </div>
          )}

          {/* Langue */}
          {oeuvre.Langue && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('oeuvre.language', 'Langue')}</span>
              <span className="font-medium">{oeuvre.Langue.nom}</span>
            </div>
          )}

          {/* ISBN/Code */}
          {oeuvre.isbn && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">ISBN</span>
              <span className="font-mono text-xs">{oeuvre.isbn}</span>
            </div>
          )}

          {/* Éditeur */}
          {oeuvre.Editeurs && oeuvre.Editeurs.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('oeuvre.publisher', 'Éditeur')}</span>
              <span className="font-medium truncate max-w-[150px]">
                {oeuvre.Editeurs[0].nom}
              </span>
            </div>
          )}

          {/* Catégories */}
          {oeuvre.Categories && oeuvre.Categories.length > 0 && (
            <>
              <Separator />
              <div>
                <span className="text-muted-foreground block mb-2">
                  {t('oeuvre.categories', 'Catégories')}
                </span>
                <div className="flex flex-wrap gap-1">
                  {oeuvre.Categories.slice(0, 5).map((cat) => (
                    <Badge key={cat.id_categorie} variant="outline" className="text-xs">
                      {cat.nom}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Tags */}
          {oeuvre.Tags && oeuvre.Tags.length > 0 && (
            <div>
              <span className="text-muted-foreground block mb-2">
                {t('oeuvre.tags', 'Tags')}
              </span>
              <div className="flex flex-wrap gap-1">
                {oeuvre.Tags.slice(0, 5).map((tag) => (
                  <Badge key={tag.id_tag} variant="secondary" className="text-xs">
                    #{tag.nom}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Version complète
  return (
    <div className="space-y-6">
      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t('oeuvre.description', 'Description')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {oeuvre.description ? (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="whitespace-pre-line text-muted-foreground leading-relaxed">
                {oeuvre.description}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground italic">
              {t('oeuvre.noDescription', 'Aucune description disponible')}
            </p>
          )}

          {/* Résumé si différent */}
          {oeuvre.resume && oeuvre.resume !== oeuvre.description && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-medium mb-2">{t('oeuvre.summary', 'Résumé')}</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {oeuvre.resume}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Métadonnées détaillées */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            {t('oeuvre.metadata', 'Informations détaillées')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Type d'œuvre */}
            {oeuvre.TypeOeuvre && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('oeuvre.type', 'Type')}</p>
                  <p className="font-medium">{oeuvre.TypeOeuvre.nom_type}</p>
                </div>
              </div>
            )}

            {/* Année de création */}
            {oeuvre.annee_creation && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('oeuvre.year', 'Année')}</p>
                  <p className="font-medium">{oeuvre.annee_creation}</p>
                </div>
              </div>
            )}

            {/* Langue */}
            {oeuvre.Langue && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('oeuvre.language', 'Langue')}</p>
                  <p className="font-medium">{oeuvre.Langue.nom}</p>
                </div>
              </div>
            )}

            {/* ISBN */}
            {oeuvre.isbn && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Hash className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ISBN</p>
                  <p className="font-mono">{oeuvre.isbn}</p>
                </div>
              </div>
            )}

            {/* Durée (pour films/musique) */}
            {oeuvre.duree && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('oeuvre.duration', 'Durée')}</p>
                  <p className="font-medium">{oeuvre.duree} min</p>
                </div>
              </div>
            )}

            {/* Lieu d'origine */}
            {oeuvre.lieu_origine && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('oeuvre.origin', 'Origine')}</p>
                  <p className="font-medium">{oeuvre.lieu_origine}</p>
                </div>
              </div>
            )}
          </div>

          {/* Éditeurs */}
          {oeuvre.Editeurs && oeuvre.Editeurs.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  {t('oeuvre.publishers', 'Éditeurs')}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {oeuvre.Editeurs.map((editeur) => (
                    <Badge key={editeur.id_editeur} variant="outline">
                      {editeur.nom}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Genres */}
          {oeuvre.Genres && oeuvre.Genres.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  {t('oeuvre.genres', 'Genres')}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {oeuvre.Genres.map((genre) => (
                    <Badge key={genre.id_genre} variant="secondary">
                      {genre.nom}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Catégories */}
          {oeuvre.Categories && oeuvre.Categories.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  {t('oeuvre.categories', 'Catégories')}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {oeuvre.Categories.map((cat) => (
                    <Badge key={cat.id_categorie} variant="outline">
                      {cat.nom}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Tags */}
          {oeuvre.Tags && oeuvre.Tags.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  {t('oeuvre.tags', 'Tags')}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {oeuvre.Tags.map((tag) => (
                    <Badge key={tag.id_tag} className="bg-muted">
                      #{tag.nom}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Récompenses */}
          {oeuvre.recompenses && oeuvre.recompenses.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4 text-yellow-500" />
                  {t('oeuvre.awards', 'Récompenses')}
                </h4>
                <ul className="space-y-2">
                  {oeuvre.recompenses.map((recompense, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Award className="h-4 w-4 text-yellow-500" />
                      {recompense}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OeuvreInfo;
