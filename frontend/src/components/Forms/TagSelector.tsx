// components/Forms/TagSelector.tsx - Sélecteur de tags avec suggestions intelligentes

import React, { useState } from 'react';
import {
  HiTag,
  HiPlus,
  HiXMark as X,
  HiMagnifyingGlass as Search,
  HiSparkles as Sparkles,
  HiClock as Clock,
  HiArrowTrendingUp as TrendingUp,
  HiLightBulb as LightBulb,
  HiStar as Star,
  HiGlobeAlt as Globe,
  HiBookOpen as Book,
  HiFilm,
  HiMusicalNote as Music,
  HiCamera,
  HiCubeTransparent as Craft,
  HiPaintBrush as Paint,
  HiNewspaper as Newspaper,
  HiArrowPath as Refresh
} from 'react-icons/hi2';

import { useTagSuggestions } from '../../hooks/useTagSuggestions';
import { Badge, Loading } from '../UI';
import type { TagMotCle } from '../../types/classification';

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  typeOeuvre?: string;
  categories?: string[];
  langue?: string;
  titre?: string;
  description?: string;
  placeholder?: string;
  maxTags?: number;
  className?: string;
}

const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onTagsChange,
  typeOeuvre,
  categories = [],
  langue,
  titre = '',
  description = '',
  placeholder = 'Rechercher ou ajouter des tags...',
  maxTags = 10,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'suggestions' | 'search' | 'popular'>('suggestions');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    suggestions,
    getTagsBySource,
    getQuickSuggestions,
    newTagInput,
    setNewTagInput,
    isCreatingTag,
    addFromInput,
    addSuggestion,
    removeTag,
    searchQuery,
    setSearchQuery,
    searchResults,
    clearSearch,
    isLoading,
    hasContentSuggestions,
    stats
  } = useTagSuggestions({
    typeOeuvre,
    categories,
    langue,
    titre,
    description,
    limit: 50
  });

  // Synchroniser avec le parent
  React.useEffect(() => {
    onTagsChange(selectedTags);
  }, [selectedTags, onTagsChange]);

  // Icônes pour les sources de suggestions
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'ai': return <Sparkles className="text-purple-500" size={12} />;
      case 'popular': return <TrendingUp className="text-orange-500" size={12} />;
      case 'related': return <Star className="text-blue-500" size={12} />;
      default: return <Clock className="text-gray-500" size={12} />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'ai': return 'IA';
      case 'popular': return 'Populaire';
      case 'related': return 'Connexe';
      default: return 'Existant';
    }
  };

  // Suggestions rapides par type
  const quickSuggestions = getQuickSuggestions();

  // Gestion des touches clavier
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addFromInput();
    }
  };

  const canAddMoreTags = selectedTags.length < maxTags;

  return (
    <div className={`space-y-4 ${className}`}>
      
      {/* Tags sélectionnés */}
      {selectedTags.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-patrimoine-canard mb-2">
            Tags sélectionnés ({selectedTags.length}/{maxTags})
          </label>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <Badge 
                key={tag} 
                variant="patrimoine"
                className="flex items-center space-x-1"
              >
                <span>#{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 text-patrimoine-emeraude hover:text-patrimoine-emeraude/80 transition-colors"
                  title="Supprimer ce tag"
                >
                  <X size={12} />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Barre de recherche/ajout */}
      <div>
        <label className="block text-sm font-medium text-patrimoine-canard mb-2">
          Ajouter des tags
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-patrimoine-canard/40" size={20} />
            <input
              type="text"
              value={newTagInput || searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setNewTagInput(value);
                if (value.length >= 2) {
                  setSearchQuery(value);
                  setActiveTab('search');
                } else {
                  clearSearch();
                  setActiveTab('suggestions');
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={!canAddMoreTags}
              className="input-patrimoine w-full pl-10 pr-12"
            />
            {(newTagInput || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setNewTagInput('');
                  clearSearch();
                  setActiveTab('suggestions');
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-patrimoine-canard/60 hover:text-patrimoine-canard"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          <button
            type="button"
            onClick={addFromInput}
            disabled={!newTagInput.trim() || !canAddMoreTags || isCreatingTag}
            className="btn-patrimoine px-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
          >
            {isCreatingTag ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <HiPlus size={16} />
            )}
            <span className="hidden sm:inline">Ajouter</span>
          </button>
        </div>
      </div>

      {/* Onglets de suggestions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex space-x-1 bg-patrimoine-creme/30 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setActiveTab('suggestions')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'suggestions'
                  ? 'bg-white text-patrimoine-canard shadow-sm'
                  : 'text-patrimoine-canard/70 hover:text-patrimoine-canard'
              }`}
            >
              <div className="flex items-center space-x-1">
                <Sparkles size={14} />
                <span>Suggestions</span>
                {hasContentSuggestions && (
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                )}
              </div>
            </button>
            
            <button
              type="button"
              onClick={() => setActiveTab('search')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'search'
                  ? 'bg-white text-patrimoine-canard shadow-sm'
                  : 'text-patrimoine-canard/70 hover:text-patrimoine-canard'
              }`}
            >
              <div className="flex items-center space-x-1">
                <Search size={14} />
                <span>Recherche</span>
                {searchResults.length > 0 && (
                  <span className="text-xs bg-patrimoine-emeraude/20 text-patrimoine-emeraude px-1 rounded">
                    {searchResults.length}
                  </span>
                )}
              </div>
            </button>
            
            <button
              type="button"
              onClick={() => setActiveTab('popular')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'popular'
                  ? 'bg-white text-patrimoine-canard shadow-sm'
                  : 'text-patrimoine-canard/70 hover:text-patrimoine-canard'
              }`}
            >
              <div className="flex items-center space-x-1">
                <TrendingUp size={14} />
                <span>Populaires</span>
              </div>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-patrimoine-canard/70 hover:text-patrimoine-canard flex items-center space-x-1"
          >
            <span>{showAdvanced ? 'Masquer' : 'Avancé'}</span>
          </button>
        </div>

        {/* Statistiques avancées */}
        {showAdvanced && (
          <div className="mb-4 p-3 bg-patrimoine-creme/30 rounded-lg">
            <h4 className="text-sm font-medium text-patrimoine-canard mb-2">Statistiques des suggestions</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="text-center">
                <div className="font-medium text-purple-600">{stats.contentCount}</div>
                <div className="text-patrimoine-sombre/60">IA/Contenu</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-blue-600">{stats.typeCount}</div>
                <div className="text-patrimoine-sombre/60">Par type</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-orange-600">{stats.popularCount}</div>
                <div className="text-patrimoine-sombre/60">Populaires</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-patrimoine-emeraude">{stats.totalSuggestions}</div>
                <div className="text-patrimoine-sombre/60">Total</div>
              </div>
            </div>
          </div>
        )}

        {/* Contenu des onglets */}
        <div className="min-h-[120px]">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loading size="sm" text="Chargement des suggestions..." />
            </div>
          )}

          {/* Onglet Suggestions */}
          {activeTab === 'suggestions' && !isLoading && (
            <div className="space-y-4">
              {/* Suggestions rapides par type */}
              {quickSuggestions.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-patrimoine-canard mb-2 flex items-center space-x-1">
                    <LightBulb size={14} />
                    <span>Suggestions rapides pour {typeOeuvre}</span>
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {quickSuggestions
                      .filter(tag => !selectedTags.includes(tag))
                      .slice(0, 6)
                      .map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => addSuggestion({ nom: tag } as any)}
                          disabled={!canAddMoreTags}
                          className="px-3 py-1 text-sm bg-patrimoine-emeraude/10 text-patrimoine-emeraude rounded-full hover:bg-patrimoine-emeraude/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          #{tag}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Suggestions intelligentes */}
              {suggestions.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-patrimoine-canard mb-2 flex items-center space-x-1">
                    <Sparkles size={14} />
                    <span>Suggestions personnalisées</span>
                  </h5>
                  <div className="space-y-3">
                    {/* Grouper par source */}
                    {['ai', 'related', 'popular'].map(source => {
                      const sourceTags = getTagsBySource(source as any).slice(0, 8);
                      if (sourceTags.length === 0) return null;

                      return (
                        <div key={source}>
                          <div className="flex items-center space-x-1 mb-2">
                            {getSourceIcon(source)}
                            <span className="text-xs font-medium text-patrimoine-sombre/70">
                              {getSourceLabel(source)} ({sourceTags.length})
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {sourceTags.map((tag) => (
                              <button
                                key={tag.id_tag}
                                type="button"
                                onClick={() => addSuggestion(tag)}
                                disabled={!canAddMoreTags}
                                className="group flex items-center space-x-1 px-3 py-1.5 text-sm bg-white border border-patrimoine-canard/20 rounded-lg hover:border-patrimoine-emeraude/40 hover:bg-patrimoine-emeraude/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                title={`Score: ${tag.score?.toFixed(2)} | Utilisé ${tag.usage_count || 0} fois`}
                              >
                                {getSourceIcon(tag.source!)}
                                <span>#{tag.nom}</span>
                                {tag.usage_count && tag.usage_count > 10 && (
                                  <span className="text-xs text-patrimoine-emeraude font-medium">
                                    {tag.usage_count}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {suggestions.length === 0 && (
                <div className="text-center py-6 text-patrimoine-sombre/60">
                  <Sparkles size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucune suggestion disponible pour le moment</p>
                  <p className="text-xs mt-1">Essayez d'ajouter un titre ou une description</p>
                </div>
              )}
            </div>
          )}

          {/* Onglet Recherche */}
          {activeTab === 'search' && !isLoading && (
            <div>
              {searchResults.length > 0 ? (
                <div>
                  <h5 className="text-sm font-medium text-patrimoine-canard mb-3">
                    Résultats de recherche ({searchResults.length})
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {searchResults.map((tag) => (
                      <button
                        key={tag.id_tag}
                        type="button"
                        onClick={() => addSuggestion(tag)}
                        disabled={!canAddMoreTags}
                        className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-white border border-patrimoine-canard/20 rounded-lg hover:border-patrimoine-emeraude/40 hover:bg-patrimoine-emeraude/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <HiTag size={12} />
                        <span>#{tag.nom}</span>
                        {tag.utilisation_count && (
                          <span className="text-xs text-patrimoine-sombre/50">
                            ({tag.utilisation_count})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : searchQuery ? (
                <div className="text-center py-6 text-patrimoine-sombre/60">
                  <Search size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun tag trouvé pour "{searchQuery}"</p>
                  <p className="text-xs mt-1">Appuyez sur Entrée pour créer ce tag</p>
                </div>
              ) : (
                <div className="text-center py-6 text-patrimoine-sombre/60">
                  <Search size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Tapez pour rechercher des tags existants</p>
                </div>
              )}
            </div>
          )}

          {/* Onglet Populaires */}
          {activeTab === 'popular' && !isLoading && (
            <div>
              {getTagsBySource('popular').length > 0 ? (
                <div>
                  <h5 className="text-sm font-medium text-patrimoine-canard mb-3 flex items-center space-x-1">
                    <TrendingUp size={14} />
                    <span>Tags populaires</span>
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {getTagsBySource('popular').slice(0, 20).map((tag) => (
                      <button
                        key={tag.id_tag}
                        type="button"
                        onClick={() => addSuggestion(tag)}
                        disabled={!canAddMoreTags}
                        className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-white border border-patrimoine-canard/20 rounded-lg hover:border-patrimoine-emeraude/40 hover:bg-patrimoine-emeraude/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <TrendingUp size={12} className="text-orange-500" />
                        <span>#{tag.nom}</span>
                        <span className="text-xs text-orange-600 font-medium">
                          {tag.utilisation_count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-patrimoine-sombre/60">
                  <TrendingUp size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun tag populaire disponible</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Limite de tags */}
      {!canAddMoreTags && (
        <div className="text-center p-3 bg-patrimoine-or/10 border border-patrimoine-or/20 rounded-lg">
          <p className="text-sm text-patrimoine-or">
            Limite atteinte ({maxTags} tags maximum)
          </p>
        </div>
      )}
    </div>
  );
};

export default TagSelector;