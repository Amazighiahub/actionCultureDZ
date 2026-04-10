/**
 * OeuvreInfo - Informations détaillées de l'œuvre
 * Description, métadonnées, caractéristiques
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen, Calendar, Globe, Hash, Tag, Layers,
  Clock, FileText, Award, Building, MapPin, Star,
  Beaker, ExternalLink, CheckCircle, BookMarked, Film, Music
} from 'lucide-react';
import type { Oeuvre } from '@/types/models/oeuvre.types';

// Helper pour extraire le texte d'un champ multilingue
const getLocalizedText = (value: unknown, fallback: string = ''): string => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    return String(obj.fr || obj.ar || obj.en || Object.values(obj).find((v) => typeof v === 'string' && v) || fallback);
  }
  return String(value);
};

interface OeuvreInfoProps {
  oeuvre: Oeuvre;
  compact?: boolean;
}

const OeuvreInfo: React.FC<OeuvreInfoProps> = ({ oeuvre, compact = false }) => {
  const { t } = useTranslation();
  const oeuvreAny = oeuvre as Oeuvre & Record<string, unknown>;

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
              <Badge variant="secondary">{getLocalizedText(oeuvre.TypeOeuvre.nom_type)}</Badge>
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
              <span className="font-medium">{getLocalizedText(oeuvre.Langue.nom)}</span>
            </div>
          )}

          {/* ISBN/Code */}
          {oeuvre.Livre?.isbn && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">ISBN</span>
              <span className="font-mono text-xs">{oeuvre.Livre.isbn}</span>
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
                    #{getLocalizedText(tag.nom)}
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
                {getLocalizedText(oeuvre.description)}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground italic">
              {t('oeuvre.noDescription', 'Aucune description disponible')}
            </p>
          )}

          {/* Résumé si différent */}
          {oeuvreAny.resume && oeuvreAny.resume !== oeuvre.description && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-medium mb-2">{t('oeuvre.summary', 'Résumé')}</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {getLocalizedText(oeuvreAny.resume)}
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
                  <p className="font-medium">{getLocalizedText(oeuvre.TypeOeuvre.nom_type)}</p>
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
                  <p className="font-medium">{getLocalizedText(oeuvre.Langue.nom)}</p>
                </div>
              </div>
            )}

            {/* ISBN (depuis Livre) */}
            {oeuvre.Livre?.isbn && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Hash className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ISBN</p>
                  <p className="font-mono">{oeuvre.Livre.isbn}</p>
                </div>
              </div>
            )}

            {/* Durée (depuis Film) */}
            {oeuvre.Film?.duree_minutes && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('oeuvre.duration', 'Durée')}</p>
                  <p className="font-medium">{oeuvre.Film.duree_minutes} min</p>
                </div>
              </div>
            )}

            {/* Lieu d'origine */}
            {oeuvreAny.lieu_origine && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('oeuvre.origin', 'Origine')}</p>
                  <p className="font-medium">{getLocalizedText(oeuvreAny.lieu_origine)}</p>
                </div>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════
              DÉTAILS SPÉCIFIQUES PAR TYPE D'ŒUVRE
              ═══════════════════════════════════════════════════ */}

          {/* Article Scientifique */}
          {oeuvre.ArticleScientifique && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <Beaker className="h-4 w-4 text-primary" />
                  {t('oeuvre.scientificDetails', 'Détails scientifiques')}
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 bg-muted/30 rounded-lg p-4">
                  {oeuvre.ArticleScientifique.journal && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <BookMarked className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('oeuvre.journal', 'Journal / Revue')}</p>
                        <p className="font-medium text-sm">{oeuvre.ArticleScientifique.journal}</p>
                      </div>
                    </div>
                  )}
                  {oeuvre.ArticleScientifique.doi && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <ExternalLink className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">DOI</p>
                        <a
                          href={`https://doi.org/${oeuvre.ArticleScientifique.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-sm text-primary hover:underline"
                        >
                          {oeuvre.ArticleScientifique.doi}
                        </a>
                      </div>
                    </div>
                  )}
                  {oeuvre.ArticleScientifique.volume && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Hash className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('oeuvre.volume', 'Volume')}</p>
                        <p className="font-medium text-sm">
                          Vol. {oeuvre.ArticleScientifique.volume}
                          {oeuvre.ArticleScientifique.numero && `, n° ${oeuvre.ArticleScientifique.numero}`}
                        </p>
                      </div>
                    </div>
                  )}
                  {oeuvre.ArticleScientifique.pages && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('oeuvre.pages', 'Pages')}</p>
                        <p className="font-medium text-sm">pp. {oeuvre.ArticleScientifique.pages}</p>
                      </div>
                    </div>
                  )}
                  {oeuvre.ArticleScientifique.issn && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Hash className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">ISSN</p>
                        <p className="font-mono font-medium text-sm">{oeuvre.ArticleScientifique.issn}</p>
                      </div>
                    </div>
                  )}
                  {oeuvre.ArticleScientifique.impact_factor && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Star className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('oeuvre.impactFactor', 'Impact Factor')}</p>
                        <p className="font-medium text-sm">{oeuvre.ArticleScientifique.impact_factor}</p>
                      </div>
                    </div>
                  )}
                  {oeuvre.ArticleScientifique.peer_reviewed && (
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">
                        {t('oeuvre.peerReviewed', 'Évalué par les pairs (peer-reviewed)')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Article (presse) */}
          {oeuvre.Article && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  {t('oeuvre.articleDetails', 'Détails de l\'article')}
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 bg-muted/30 rounded-lg p-4">
                  {oeuvre.Article.auteur && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t('oeuvre.author', 'Auteur')}</p>
                      <p className="font-medium text-sm">{oeuvre.Article.auteur}</p>
                    </div>
                  )}
                  {oeuvre.Article.sous_titre && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground">{t('oeuvre.subtitle', 'Sous-titre')}</p>
                      <p className="font-medium text-sm italic">{oeuvre.Article.sous_titre}</p>
                    </div>
                  )}
                  {oeuvre.Article.source && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t('oeuvre.source', 'Source')}</p>
                      <p className="font-medium text-sm">{oeuvre.Article.source}</p>
                    </div>
                  )}
                  {oeuvre.Article.resume && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">{t('oeuvre.summary', 'Résumé')}</p>
                      <p className="text-sm text-muted-foreground">{oeuvre.Article.resume}</p>
                    </div>
                  )}
                  {oeuvre.Article.url_source && (
                    <div className="sm:col-span-2">
                      <a
                        href={oeuvre.Article.url_source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {t('oeuvre.readOriginal', 'Lire l\'article original')}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Livre */}
          {oeuvre.Livre && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  {t('oeuvre.bookDetails', 'Détails du livre')}
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 bg-muted/30 rounded-lg p-4">
                  {oeuvre.Livre.isbn && (
                    <div>
                      <p className="text-xs text-muted-foreground">ISBN</p>
                      <p className="font-mono text-sm">{oeuvre.Livre.isbn}</p>
                    </div>
                  )}
                  {oeuvre.Livre.nb_pages && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t('oeuvre.pages', 'Pages')}</p>
                      <p className="font-medium text-sm">{oeuvre.Livre.nb_pages} pages</p>
                    </div>
                  )}
                  {oeuvre.Livre.format && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t('oeuvre.format', 'Format')}</p>
                      <p className="font-medium text-sm">{oeuvre.Livre.format}</p>
                    </div>
                  )}
                  {oeuvre.Livre.collection && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t('oeuvre.collection', 'Collection')}</p>
                      <p className="font-medium text-sm">{oeuvre.Livre.collection}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Film */}
          {oeuvre.Film && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <Film className="h-4 w-4 text-primary" />
                  {t('oeuvre.filmDetails', 'Détails du film')}
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 bg-muted/30 rounded-lg p-4">
                  {oeuvre.Film.duree_minutes && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t('oeuvre.duration', 'Durée')}</p>
                      <p className="font-medium text-sm">{oeuvre.Film.duree_minutes} min</p>
                    </div>
                  )}
                  {oeuvre.Film.realisateur && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t('oeuvre.director', 'Réalisateur')}</p>
                      <p className="font-medium text-sm">{oeuvre.Film.realisateur}</p>
                    </div>
                  )}
                  {oeuvre.Film.producteur && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t('oeuvre.producer', 'Producteur')}</p>
                      <p className="font-medium text-sm">{oeuvre.Film.producteur}</p>
                    </div>
                  )}
                  {oeuvre.Film.studio && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t('oeuvre.studio', 'Studio')}</p>
                      <p className="font-medium text-sm">{oeuvre.Film.studio}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Album Musical */}
          {oeuvre.AlbumMusical && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <Music className="h-4 w-4 text-primary" />
                  {t('oeuvre.albumDetails', 'Détails de l\'album')}
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 bg-muted/30 rounded-lg p-4">
                  {oeuvre.AlbumMusical.duree && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t('oeuvre.duration', 'Durée')}</p>
                      <p className="font-medium text-sm">{oeuvre.AlbumMusical.duree}</p>
                    </div>
                  )}
                  {oeuvre.AlbumMusical.nb_pistes && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t('oeuvre.tracks', 'Pistes')}</p>
                      <p className="font-medium text-sm">{oeuvre.AlbumMusical.nb_pistes} pistes</p>
                    </div>
                  )}
                  {oeuvre.AlbumMusical.label && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t('oeuvre.label', 'Label')}</p>
                      <p className="font-medium text-sm">{oeuvre.AlbumMusical.label}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

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
          {Array.isArray(oeuvreAny.Genres) && (oeuvreAny.Genres as unknown[]).length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  {t('oeuvre.genres', 'Genres')}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(oeuvreAny.Genres as Array<{ id_genre?: number; nom?: unknown }>).map((genre, idx) => (
                    <Badge key={genre.id_genre ?? idx} variant="secondary">
                      {getLocalizedText(genre.nom)}
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
                    <Badge key={tag.id_tag} variant="secondary">
                      #{getLocalizedText(tag.nom)}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Récompenses */}
          {Array.isArray(oeuvreAny.recompenses) && (oeuvreAny.recompenses as unknown[]).length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4 text-yellow-500" />
                  {t('oeuvre.awards', 'Récompenses')}
                </h4>
                <ul className="space-y-2">
                  {(oeuvreAny.recompenses as unknown[]).map((recompense, index: number) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Award className="h-4 w-4 text-yellow-500" />
                      {getLocalizedText(recompense)}
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
