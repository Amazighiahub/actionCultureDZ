// components/oeuvre/IntervenantEditeurManager.tsx - VERSION CORRIGÉE
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { Label } from '@/components/UI/label';
import { Badge } from '@/components/UI/badge';
import { Alert, AlertDescription } from '@/components/UI/alert';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/UI/select';
import { 
  Plus, 
  X, 
  Search, 
  User, 
  Building2, 
  Users, 
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { oeuvreService } from '@/services/oeuvre.service';
import { metadataService } from '@/services/metadata.service';
import IntervenantModal from '@/components/modals/IntervenantModal';
import EditeurModal from '@/components/modals/EditeurModal';
import { useRTL } from '@/hooks/useRTL';
import type { 
  IntervenantExistant, 
  NouvelIntervenant, 
  ContributeurOeuvre,
  EditeurOeuvre,
  IntervenantSearchResult,
  IntervenantDisplay
} from '@/types/api/oeuvre-creation.types';
import type { Editeur } from '@/types/models/references.types';
import type { TypeUser } from '@/types/models/type-user.types';

interface IntervenantEditeurManagerProps {
  typeOeuvreId: number;
  typesUsers: TypeUser[];
  editeurs: Editeur[];
  onIntervenantsChange: (
    existants: IntervenantExistant[],
    nouveaux: NouvelIntervenant[],
    contributeurs: ContributeurOeuvre[]
  ) => void;
  onEditeursChange: (editeurs: EditeurOeuvre[]) => void;
}

// Type pour un intervenant affiché dans la liste
interface DisplayIntervenant {
  id: string;
  type: 'existant' | 'nouveau' | 'contributeur';
  display: IntervenantDisplay;
  role: string;
  id_type_user: number;
  data: IntervenantExistant | NouvelIntervenant | ContributeurOeuvre;
}

const IntervenantEditeurManager: React.FC<IntervenantEditeurManagerProps> = ({
  typeOeuvreId,
  typesUsers,
  editeurs: editeursInitiaux,
  onIntervenantsChange,
  onEditeursChange
}) => {
  const { t } = useTranslation();
  const { rtlClasses } = useRTL();
  
  // États pour les intervenants
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<IntervenantSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedIntervenants, setSelectedIntervenants] = useState<DisplayIntervenant[]>([]);
  const [showIntervenantModal, setShowIntervenantModal] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // États pour les éditeurs
  const [editeurSearchQuery, setEditeurSearchQuery] = useState('');
  const [editeurs, setEditeurs] = useState<Editeur[]>(editeursInitiaux);
  const [selectedEditeurs, setSelectedEditeurs] = useState<EditeurOeuvre[]>([]);
  const [showEditeurModal, setShowEditeurModal] = useState(false);
  const [filteredEditeurs, setFilteredEditeurs] = useState<Editeur[]>([]);

  // Mettre à jour les éditeurs quand ils changent
  useEffect(() => {
    setEditeurs(editeursInitiaux);
  }, [editeursInitiaux]);

  // Fonction pour convertir le format de recherche en format d'affichage
  const convertToDisplay = (result: IntervenantSearchResult): IntervenantDisplay => {
    // Parser le label pour extraire nom et prénom
    const labelParts = result.label.split(' ');
    let prenom = '';
    let nom = '';
    
    // Gérer les cas avec titre professionnel
    if (result.titre) {
      // Si il y a un titre, il est au début du label
      const withoutTitle = result.label.replace(result.titre, '').trim();
      const nameParts = withoutTitle.split(' ');
      prenom = nameParts[0] || '';
      nom = nameParts.slice(1).join(' ') || '';
    } else {
      prenom = labelParts[0] || '';
      nom = labelParts.slice(1).join(' ') || '';
    }
    
    return {
      id_intervenant: result.id,
      nom,
      prenom,
      titre_professionnel: result.titre,
      organisation: result.organisation,
      specialites: result.specialites,
      photo_url: result.photo_url
    };
  };

  // Mettre à jour les listes parentes quand les sélections changent
  useEffect(() => {
    const existants: IntervenantExistant[] = [];
    const nouveaux: NouvelIntervenant[] = [];
    const contributeurs: ContributeurOeuvre[] = [];

    selectedIntervenants.forEach(item => {
      if (item.type === 'existant') {
        existants.push(item.data as IntervenantExistant);
      } else if (item.type === 'nouveau') {
        nouveaux.push(item.data as NouvelIntervenant);
      } else if (item.type === 'contributeur') {
        contributeurs.push(item.data as ContributeurOeuvre);
      }
    });

    console.log('📤 Envoi des intervenants au parent:', {
      existants: existants.length,
      nouveaux: nouveaux.length,
      contributeurs: contributeurs.length
    });

    onIntervenantsChange(existants, nouveaux, contributeurs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIntervenants]);

  useEffect(() => {
    onEditeursChange(selectedEditeurs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEditeurs]);

  // Recherche d'intervenants avec debounce
  useEffect(() => {
    const searchIntervenants = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        setSearchError(null);
        return;
      }

      setSearching(true);
      setSearchError(null);
      
      try {
        console.log('🔍 Recherche intervenants pour:', searchQuery);
        
        const results = await oeuvreService.searchIntervenants({ q: searchQuery });
        
        console.log('📋 Résultats de recherche:', results);
        setSearchResults(results);
        
      } catch (error) {
        console.error('❌ Erreur recherche intervenants:', error);
        setSearchError(t('contributors.errors.searchError'));
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchIntervenants, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, t]);

  // Filtrage des éditeurs
  useEffect(() => {
    if (editeurSearchQuery.length === 0) {
      setFilteredEditeurs(editeurs);
    } else {
      const query = editeurSearchQuery.toLowerCase();
      setFilteredEditeurs(
        editeurs.filter(e => 
          e.nom.toLowerCase().includes(query) ||
          e.ville?.toLowerCase().includes(query) ||
          e.type_editeur?.toLowerCase().includes(query)
        )
      );
    }
  }, [editeurSearchQuery, editeurs]);

  // Ajouter un intervenant existant
  const handleAddExistingIntervenant = (result: IntervenantSearchResult, typeUserId: number) => {
    console.log('➕ Ajout intervenant existant:', { result, typeUserId });
    
    // Vérifier si déjà ajouté
    const alreadyAdded = selectedIntervenants.some(
      item => item.type === 'existant' && 
      (item.data as IntervenantExistant).id_intervenant === result.id
    );

    if (alreadyAdded) {
      console.warn('⚠️ Intervenant déjà ajouté');
      return;
    }

    const typeUser = typesUsers.find(t => t.id_type_user === typeUserId);
    if (!typeUser) {
      console.error('❌ Type user non trouvé:', typeUserId);
      return;
    }

    // Convertir le résultat de recherche en format d'affichage
    const displayData = convertToDisplay(result);

    const displayIntervenant: DisplayIntervenant = {
      id: `existant-${result.id}-${Date.now()}`,
      type: 'existant',
      display: displayData,
      role: typeUser.nom_type,
      id_type_user: typeUserId,
      data: {
        id_intervenant: result.id,
        id_type_user: typeUserId,
        role_principal: true,
        ordre_apparition: selectedIntervenants.length + 1
      } as IntervenantExistant
    };

    console.log('✅ Intervenant prêt à ajouter:', displayIntervenant);
    
    setSelectedIntervenants(prev => [...prev, displayIntervenant]);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Ajouter un nouvel intervenant depuis la modal
  const handleAddNewIntervenant = (intervenant: NouvelIntervenant) => {
    console.log('➕ Ajout nouvel intervenant:', intervenant);
    
    const typeUser = typesUsers.find(t => t.id_type_user === intervenant.id_type_user);
    if (!typeUser) {
      console.error('❌ Type user non trouvé:', intervenant.id_type_user);
      return;
    }

    const displayIntervenant: DisplayIntervenant = {
      id: `nouveau-${Date.now()}`,
      type: 'nouveau',
      display: {
        id_intervenant: 0, // Pas encore créé
        nom: intervenant.nom,
        prenom: intervenant.prenom,
        email: intervenant.email,
        titre_professionnel: intervenant.titre_professionnel,
        organisation: intervenant.organisation,
        specialites: intervenant.specialites,
        photo_url: intervenant.photo_url
      },
      role: typeUser.nom_type,
      id_type_user: intervenant.id_type_user,
      data: intervenant
    };

    console.log('✅ Nouvel intervenant prêt:', displayIntervenant);
    
    setSelectedIntervenants(prev => [...prev, displayIntervenant]);
  };

  // Supprimer un intervenant
  const handleRemoveIntervenant = (id: string) => {
    console.log('🗑️ Suppression intervenant:', id);
    setSelectedIntervenants(prev => prev.filter(i => i.id !== id));
  };

  // Ajouter un éditeur
  const handleAddEditeur = (editeur: Editeur) => {
    console.log('➕ Ajout éditeur:', editeur);
    
    // Vérifier si déjà ajouté
    const alreadyAdded = selectedEditeurs.some(e => e.id_editeur === editeur.id_editeur);
    if (alreadyAdded) {
      console.warn('⚠️ Éditeur déjà ajouté');
      return;
    }

    const editeurOeuvre: EditeurOeuvre = {
      id_editeur: editeur.id_editeur,
      role_editeur: 'editeur_principal',
      statut_edition: 'en_cours'
    };

    setSelectedEditeurs(prev => [...prev, editeurOeuvre]);
    setEditeurSearchQuery('');
  };

  // Ajouter un nouvel éditeur depuis la modal
  const handleAddNewEditeur = (editeur: Editeur) => {
    console.log('➕ Ajout nouvel éditeur:', editeur);
    setEditeurs(prev => [...prev, editeur]);
    handleAddEditeur(editeur);
  };

  // Supprimer un éditeur
  const handleRemoveEditeur = (index: number) => {
    console.log('🗑️ Suppression éditeur à l\'index:', index);
    setSelectedEditeurs(prev => prev.filter((_, i) => i !== index));
  };

  // Mettre à jour les détails d'un éditeur
  const handleUpdateEditeur = (index: number, updates: Partial<EditeurOeuvre>) => {
    setSelectedEditeurs(prev => prev.map((e, i) => 
      i === index ? { ...e, ...updates } : e
    ));
  };

  // Déterminer si les éditeurs sont pertinents pour ce type d'œuvre
  const shouldShowEditeurs = () => {
    const typesAvecEditeurs = [1, 4, 5]; // Livre, Article, Article Scientifique
    return typesAvecEditeurs.includes(typeOeuvreId);
  };

  return (
    <div className="space-y-6">
      {/* Section Intervenants */}
      <Card className="shadow-cultural">
        <CardHeader>
          <CardTitle className={`text-2xl font-serif flex items-center gap-2 ${rtlClasses.flexRow}`}>
            <Users className="h-6 w-6" />
            {t('contributors.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Intervenants sélectionnés */}
          {selectedIntervenants.length > 0 && (
            <div className="space-y-2 mb-4">
              <Label>{t('contributors.addedCount', { count: selectedIntervenants.length })}</Label>
              <div className="space-y-2">
                {selectedIntervenants.map((intervenant) => (
                  <div 
                    key={intervenant.id}
                    className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors"
                  >
                    <div className={`flex items-center gap-3 ${rtlClasses.flexRow}`}>
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {intervenant.display.titre_professionnel && `${intervenant.display.titre_professionnel} `}
                          {intervenant.display.prenom} {intervenant.display.nom}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {intervenant.role}
                          {intervenant.display.organisation && ` • ${intervenant.display.organisation}`}
                          {intervenant.display.email && ` • ${intervenant.display.email}`}
                        </p>
                        {intervenant.display.specialites && intervenant.display.specialites.length > 0 && (
                          <div className={`flex gap-1 mt-1 ${rtlClasses.flexRow}`}>
                            {intervenant.display.specialites.slice(0, 3).map((spec, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {intervenant.type === 'nouveau' && (
                        <Badge variant="secondary">{t('contributors.new')}</Badge>
                      )}
                      {intervenant.type === 'existant' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveIntervenant(intervenant.id)}
                      className="hover:bg-destructive/20 hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recherche d'intervenants */}
          <div className="space-y-2">
            <Label>{t('contributors.searchExisting')}</Label>
            <div className="relative">
              <Search className={`absolute ${rtlClasses.start(3)} top-2.5 h-4 w-4 text-muted-foreground`} />
              <Input
                placeholder={t('contributors.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${rtlClasses.paddingStart(9)}`}
              />
              {searching && (
                <Loader2 className={`absolute ${rtlClasses.end(3)} top-2.5 h-4 w-4 animate-spin text-muted-foreground`} />
              )}
            </div>

            {/* Message d'erreur */}
            {searchError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{searchError}</AlertDescription>
              </Alert>
            )}

            {/* Résultats de recherche */}
            {!searching && searchResults.length > 0 && (
              <div className="border rounded-lg p-2 space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((result) => {
                  const isAlreadyAdded = selectedIntervenants.some(
                    item => item.type === 'existant' && 
                    (item.data as IntervenantExistant).id_intervenant === result.id
                  );

                  return (
                    <div 
                      key={result.id}
                      className={`p-2 rounded ${isAlreadyAdded ? 'opacity-50 bg-secondary/30' : 'hover:bg-secondary/50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">
                            {result.label}
                            {isAlreadyAdded && <span className={`text-sm text-muted-foreground ${rtlClasses.marginStart(2)}`}>({t('contributors.alreadyAdded')})</span>}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {result.organisation}
                            {result.specialites && result.specialites.length > 0 && (
                              <span className={rtlClasses.marginStart(2)}>• {result.specialites.join(', ')}</span>
                            )}
                          </p>
                        </div>
                        {!isAlreadyAdded && (
                          <Select
                            onValueChange={(value) => handleAddExistingIntervenant(result, parseInt(value))}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder={t('contributors.selectRole')} />
                            </SelectTrigger>
                            <SelectContent>
                              {typesUsers.map((type) => (
                                <SelectItem key={type.id_type_user} value={type.id_type_user.toString()}>
                                  {type.nom_type}
                                  {type.description && (
                                    <span className={`text-xs text-muted-foreground ${rtlClasses.marginStart(1)}`}>
                                      ({type.description})
                                    </span>
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Message si aucun résultat */}
            {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                {t('contributors.noResultsFor', { query: searchQuery })}
              </p>
            )}
          </div>

          {/* Bouton pour ajouter un nouvel intervenant */}
          <Button
            variant="outline"
            onClick={() => setShowIntervenantModal(true)}
            className="w-full"
          >
            <Plus className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
            {t('contributors.createNew')}
          </Button>
        </CardContent>
      </Card>

      {/* Section Éditeurs (conditionnelle) */}
      {shouldShowEditeurs() && (
        <Card className="shadow-cultural">
          <CardHeader>
            <CardTitle className={`text-2xl font-serif flex items-center gap-2 ${rtlClasses.flexRow}`}>
              <Building2 className="h-6 w-6" />
              {t('publishers.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Éditeurs sélectionnés */}
            {selectedEditeurs.length > 0 && (
              <div className="space-y-2 mb-4">
                <Label>{t('publishers.addedCount', { count: selectedEditeurs.length })}</Label>
                <div className="space-y-2">
                  {selectedEditeurs.map((editeurOeuvre, index) => {
                    const editeur = editeurs.find(e => e.id_editeur === editeurOeuvre.id_editeur);
                    if (!editeur) return null;

                    return (
                      <div 
                        key={`editeur-${editeur.id_editeur}-${index}`}
                        className="p-3 bg-secondary/50 rounded-lg space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className={`flex items-center gap-3 ${rtlClasses.flexRow}`}>
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{editeur.nom}</p>
                              <p className="text-sm text-muted-foreground">
                                {editeur.ville && `${editeur.ville} • `}
                                {editeur.type_editeur}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveEditeur(index)}
                            className="hover:bg-destructive/20 hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Détails de l'édition */}
                        <div className={`grid grid-cols-2 gap-3 ${rtlClasses.paddingStart(8)}`}>
                          <div className="space-y-1">
                            <Label className="text-xs">{t('publishers.role')}</Label>
                            <Select
                              value={editeurOeuvre.role_editeur}
                              onValueChange={(value) => handleUpdateEditeur(index, { 
                                role_editeur: value as any 
                              })}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="editeur_principal">{t('publishers.roles.mainPublisher')}</SelectItem>
                                <SelectItem value="co_editeur">{t('publishers.roles.coPublisher')}</SelectItem>
                                <SelectItem value="distributeur">{t('publishers.roles.distributor')}</SelectItem>
                                <SelectItem value="editeur_original">{t('publishers.roles.originalPublisher')}</SelectItem>
                                <SelectItem value="editeur_traduction">{t('publishers.roles.translationPublisher')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">{t('publishers.status')}</Label>
                            <Select
                              value={editeurOeuvre.statut_edition || 'en_cours'}
                              onValueChange={(value) => handleUpdateEditeur(index, { 
                                statut_edition: value as any 
                              })}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="en_cours">{t('publishers.statuses.inProgress')}</SelectItem>
                                <SelectItem value="publie">{t('publishers.statuses.published')}</SelectItem>
                                <SelectItem value="epuise">{t('publishers.statuses.outOfStock')}</SelectItem>
                                <SelectItem value="annule">{t('publishers.statuses.cancelled')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">{t('publishers.isbn')}</Label>
                            <Input
                              className="h-8 text-sm"
                              placeholder="978-..."
                              value={editeurOeuvre.isbn_editeur || ''}
                              onChange={(e) => handleUpdateEditeur(index, { 
                                isbn_editeur: e.target.value 
                              })}
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">{t('publishers.salePrice')}</Label>
                            <Input
                              className="h-8 text-sm"
                              type="number"
                              placeholder={t('publishers.pricePlaceholder')}
                              value={editeurOeuvre.prix_vente || ''}
                              onChange={(e) => handleUpdateEditeur(index, { 
                                prix_vente: parseFloat(e.target.value) || undefined 
                              })}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recherche d'éditeurs */}
            <div className="space-y-2">
              <Label>{t('publishers.search')}</Label>
              <div className="relative">
                <Search className={`absolute ${rtlClasses.start(3)} top-2.5 h-4 w-4 text-muted-foreground`} />
                <Input
                  placeholder={t('publishers.searchPlaceholder')}
                  value={editeurSearchQuery}
                  onChange={(e) => setEditeurSearchQuery(e.target.value)}
                  className={`${rtlClasses.paddingStart(9)}`}
                />
              </div>

              {/* Liste des éditeurs filtrés */}
              {editeurSearchQuery && filteredEditeurs.length > 0 && (
                <div className="border rounded-lg p-2 space-y-2 max-h-60 overflow-y-auto">
                  {filteredEditeurs
                    .filter(e => !selectedEditeurs.find(se => se.id_editeur === e.id_editeur))
                    .map((editeur) => (
                      <div 
                        key={editeur.id_editeur}
                        className="p-2 hover:bg-secondary/50 rounded cursor-pointer flex items-center justify-between"
                        onClick={() => handleAddEditeur(editeur)}
                      >
                        <div>
                          <p className="font-medium">{editeur.nom}</p>
                          <p className="text-sm text-muted-foreground">
                            {editeur.ville && `${editeur.ville} • `}
                            {editeur.type_editeur}
                          </p>
                        </div>
                        <Plus className="h-4 w-4" />
                      </div>
                    ))}
                </div>
              )}

              {editeurSearchQuery && filteredEditeurs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  {t('publishers.noResultsFor', { query: editeurSearchQuery })}
                </p>
              )}
            </div>

            {/* Bouton pour ajouter un nouvel éditeur */}
            <Button
              variant="outline"
              onClick={() => setShowEditeurModal(true)}
              className="w-full"
            >
              <Plus className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
              {t('publishers.createNew')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modales */}
      <IntervenantModal
        isOpen={showIntervenantModal}
        onClose={() => setShowIntervenantModal(false)}
        onConfirm={handleAddNewIntervenant}
        typesUsers={typesUsers}
        typeOeuvreId={typeOeuvreId}
      />

      <EditeurModal
        isOpen={showEditeurModal}
        onClose={() => setShowEditeurModal(false)}
        onConfirm={handleAddNewEditeur}
      />
    </div>
  );
};

export default IntervenantEditeurManager;