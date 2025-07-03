// components/modals/IntervenantModal.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle } from
'@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'@/components/ui/select';
import {
  Loader2,
  User,
  Mail,
  Phone,
  Building2,
  Globe,
  AlertCircle,
  Plus,
  X } from
'lucide-react';
import { metadataService } from '@/services/metadata.service';
import { oeuvreService } from '@/services/oeuvre.service';
import type { TypeUser } from '@/types/models/type-user.types';
import type { NouvelIntervenant } from '@/types/api/oeuvre-creation.types';import { useTranslation } from "react-i18next";

interface IntervenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (intervenant: NouvelIntervenant) => void;
  typesUsers?: TypeUser[]; // Optionnel car on peut les charger depuis l'API
  typeOeuvreId?: number;
}
interface NouvelIntervenantLocal extends NouvelIntervenant {
  temp_id?: string; // Utiliser _ pour indiquer que c'est interne
}
const IntervenantModal: React.FC<IntervenantModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  typesUsers: propsTypesUsers,
  typeOeuvreId
}) => {
  // État du formulaire
  const [formData, setFormData] = useState<NouvelIntervenant>({
    nom: '',
    prenom: '',
    email: '',
    id_type_user: 0,
    titre_professionnel: '',
    organisation: '',
    specialites: [],
    biographie: ''
  });

  // États pour les types users
  const [typesUsers, setTypesUsers] = useState<TypeUser[]>(propsTypesUsers || []);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [typesError, setTypesError] = useState<string | null>(null);

  // Autres états
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState<{exists: boolean;user?: any;} | null>(null);
  const [newSpecialite, setNewSpecialite] = useState('');

  // Mapping des types d'œuvres vers les types d'intervenants pertinents
  const { t } = useTranslation();const TYPE_MAPPING: Record<number, string[]> = {
    1: ['ecrivain', 'journaliste', 'autre'], // Livre
    2: ['realisateur', 'artiste', 'autre'], // Film
    3: ['musicien', 'danseur', 'artiste', 'autre'], // Album Musical
    4: ['journaliste', 'ecrivain', 'autre'], // Article
    5: ['scientifique', 'ecrivain', 'autre'], // Article Scientifique
    6: ['artiste', 'sculpteur', 'autre'], // Artisanat
    7: ['artiste', 'sculpteur', 'photographe', 'autre'] // Œuvre d'Art
  };

  // Charger les types users depuis l'API si non fournis
  useEffect(() => {
    const loadTypesUsers = async () => {
      // Si on a déjà les types via props, pas besoin de les recharger
      if (propsTypesUsers && propsTypesUsers.length > 0) {
        return;
      }

      setLoadingTypes(true);
      setTypesError(null);

      try {
        const response = await metadataService.getTypesUsers();

        if (response.success && response.data) {
          setTypesUsers(response.data);
        } else {
          throw new Error(response.error || 'Erreur lors du chargement des types');
        }
      } catch (err) {
        console.error('Erreur chargement types users:', err);
        setTypesError('Impossible de charger les types d\'intervenants');
        setTypesUsers([]);
      } finally {
        setLoadingTypes(false);
      }
    };

    if (isOpen && (!propsTypesUsers || propsTypesUsers.length === 0)) {
      loadTypesUsers();
    }
  }, [isOpen, propsTypesUsers]);

  // Réinitialiser le formulaire quand la modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setFormData({
        nom: '',
        prenom: '',
        email: '',
        id_type_user: 0,
        titre_professionnel: '',
        organisation: '',
        specialites: [],
        biographie: ''
      });
      setEmailExists(null);
      setError(null);
      setNewSpecialite('');
    }
  }, [isOpen]);

  // Vérifier si l'email existe
  useEffect(() => {
    const checkEmail = async () => {
      if (formData.email && formData.email.includes('@')) {
        setCheckingEmail(true);
        try {
          const response = await oeuvreService.checkUserByEmail(formData.email);
          setEmailExists(response);

          // Pré-remplir si l'utilisateur existe
          if (response.exists && response.user) {
            setFormData((prev) => ({
              ...prev,
              nom: response.user.nom || prev.nom,
              prenom: response.user.prenom || prev.prenom
            }));
          }
        } catch (error) {
          console.error('Erreur vérification email:', error);
        } finally {
          setCheckingEmail(false);
        }
      }
    };

    const debounceTimer = setTimeout(checkEmail, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.email]);

  // Obtenir les types pertinents selon le type d'œuvre
  const getRelevantTypes = (): TypeUser[] => {
    if (!typesUsers || typesUsers.length === 0) {
      return [];
    }

    // Si pas de type d'œuvre spécifié, retourner tous les types
    if (!typeOeuvreId) {
      return typesUsers;
    }

    // Récupérer les types autorisés
    const allowedTypes = TYPE_MAPPING[typeOeuvreId];

    // Si pas de mapping, retourner tous les types
    if (!allowedTypes || allowedTypes.length === 0) {
      return typesUsers;
    }

    // Filtrer les types
    const filtered = typesUsers.filter((type) =>
    allowedTypes.includes(type.nom_type.toLowerCase())
    );

    // Si aucun type ne correspond, retourner tous les types
    return filtered.length > 0 ? filtered : typesUsers;
  };

  const relevantTypes = getRelevantTypes();

  // Gestion des spécialités
  const handleAddSpecialite = () => {
    if (newSpecialite.trim() && !formData.specialites?.includes(newSpecialite.trim())) {
      setFormData((prev) => ({
        ...prev,
        specialites: [...(prev.specialites || []), newSpecialite.trim()]
      }));
      setNewSpecialite('');
    }
  };

  const handleRemoveSpecialite = (specialite: string) => {
    setFormData((prev) => ({
      ...prev,
      specialites: prev.specialites?.filter((s) => s !== specialite) || []
    }));
  };

  // Soumission du formulaire
  const handleSubmit = () => {
    // Validation
    if (!formData.nom || !formData.prenom) {
      setError('Le nom et le prénom sont obligatoires');
      return;
    }

    if (!formData.id_type_user) {
      setError('Veuillez sélectionner un type de rôle');
      return;
    }

    // Créer l'objet intervenant
    const intervenant: NouvelIntervenantLocal = {
      ...formData,
      temp_id: `new-${Date.now()}` // ID temporaire pour le frontend
    };

    onConfirm(intervenant);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("modals_intervenantmodal.ajouter_intervenant")}</DialogTitle>
          <DialogDescription>{t("modals_intervenantmodal.crez_nouvel_intervenant")}

          </DialogDescription>
        </DialogHeader>

        {error &&
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        }

        {typesError &&
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{typesError}</AlertDescription>
          </Alert>
        }

        <div className="space-y-6">
          {/* Informations de base */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("modals_intervenantmodal.informations_personnelles")}</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prenom">{t("modals_intervenantmodal.prnom")}</Label>
                <Input
                  id="prenom"
                  value={formData.prenom}
                  onChange={(e) => setFormData((prev) => ({ ...prev, prenom: e.target.value }))}
                  placeholder={t("modals_intervenantmodal.placeholder_prnom")} />

              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nom">{t("modals_intervenantmodal.nom")}</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nom: e.target.value }))}
                  placeholder={t("modals_intervenantmodal.placeholder_nom_famille")} />

              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("modals_intervenantmodal.email")}</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder={t("modals_intervenantmodal.placeholder_emailexemplecom")} />

                {checkingEmail &&
                <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin" />
                }
                {emailExists?.exists && !checkingEmail &&
                <User className="absolute right-3 top-2.5 h-4 w-4 text-green-500" />
                }
              </div>
              {emailExists?.exists &&
              <p className="text-sm text-green-600">{t("modals_intervenantmodal.utilisateur_existant")}
                {emailExists.user?.nom} {emailExists.user?.prenom}
                </p>
              }
            </div>
          </div>

          {/* Informations professionnelles */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("modals_intervenantmodal.informations_professionnelles")}</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="titre_professionnel">{t("modals_intervenantmodal.titre_professionnel")}</Label>
                <Input
                  id="titre_professionnel"
                  value={formData.titre_professionnel || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, titre_professionnel: e.target.value }))}
                  placeholder={t("modals_intervenantmodal.placeholder_prof")} />

              </div>
              
              <div className="space-y-2">
                <Label htmlFor="organisation">{t("modals_intervenantmodal.organisation")}</Label>
                <Input
                  id="organisation"
                  value={formData.organisation || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, organisation: e.target.value }))}
                  placeholder={t("modals_intervenantmodal.placeholder_nom_lorganisation")} />

              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="biographie">{t("modals_intervenantmodal.biographie")}</Label>
              <Textarea
                id="biographie"
                value={formData.biographie || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, biographie: e.target.value }))}
                placeholder={t("modals_intervenantmodal.placeholder_courte_biographie")}
                className="min-h-[100px]" />

            </div>
          </div>

          {/* Spécialités */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("modals_intervenantmodal.spcialits")}</h3>
            
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder={t("modals_intervenantmodal.placeholder_ajouter_une_spcialit")}
                  value={newSpecialite}
                  onChange={(e) => setNewSpecialite(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSpecialite();
                    }
                  }} />

                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddSpecialite}
                  disabled={!newSpecialite.trim()}>

                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {formData.specialites && formData.specialites.length > 0 &&
              <div className="flex flex-wrap gap-2">
                  {formData.specialites.map((spec, idx) =>
                <Badge key={idx} variant="secondary">
                      {spec}
                      <button
                    type="button"
                    onClick={() => handleRemoveSpecialite(spec)}
                    className="ml-1 hover:text-destructive">

                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                )}
                </div>
              }
            </div>
          </div>

          {/* Rôle dans l'œuvre */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">{t("modals_intervenantmodal.rle_dans_luvre")}</h3>
            
            <div className="space-y-2">
              <Label htmlFor="id_type_user">{t("modals_intervenantmodal.type_rle")}</Label>
              
              {loadingTypes ?
              <div className="flex items-center justify-center p-4 border rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">{t("modals_intervenantmodal.chargement_des_types")}

                </span>
                </div> :

              <Select
                value={formData.id_type_user?.toString() || ''}
                onValueChange={(value) => setFormData((prev) => ({
                  ...prev,
                  id_type_user: parseInt(value)
                }))}
                disabled={relevantTypes.length === 0}>

                  <SelectTrigger>
                    <SelectValue placeholder={
                  relevantTypes.length === 0 ?
                  "Aucun rôle disponible" :
                  "Sélectionnez un rôle"
                  } />
                  </SelectTrigger>
                  <SelectContent>
                    {relevantTypes.map((type) =>
                  <SelectItem
                    key={type.id_type_user}
                    value={type.id_type_user.toString()}>

                        <span className="capitalize">{type.nom_type}</span>
                        {type.description &&
                    <span className="text-sm text-muted-foreground ml-2">
                            - {type.description}
                          </span>
                    }
                      </SelectItem>
                  )}
                  </SelectContent>
                </Select>
              }
              
              {relevantTypes.length > 0 &&
              <p className="text-xs text-muted-foreground">
                  {relevantTypes.length}{t("modals_intervenantmodal.type")}{relevantTypes.length > 1 ? 's' : ''}{t("modals_intervenantmodal.disponible")}{relevantTypes.length > 1 ? 's' : ''}
                </p>
              }
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("modals_intervenantmodal.annuler")}

          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || loadingTypes || relevantTypes.length === 0}>

            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("modals_intervenantmodal.ajouter_lintervenant")}

          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);

};

export default IntervenantModal;