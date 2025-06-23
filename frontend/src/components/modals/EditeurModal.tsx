// components/modals/EditeurModal.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Building2, Globe, AlertCircle } from 'lucide-react';
import { metadataService } from '@/services/metadata.service';
import type { Editeur } from '@/types/models/references.types';

interface EditeurModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (editeur: Editeur) => void;
}

interface FormData {
  nom: string;
  type_editeur: string;
  site_web?: string;
}

const EditeurModal: React.FC<EditeurModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const [formData, setFormData] = useState<FormData>({
    nom: '',
    type_editeur: 'Maison d\'édition', // Valeur par défaut
    site_web: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Types d'éditeurs disponibles
  const typesEditeurs = [
    'Maison d\'édition',
    'Éditeur indépendant',
    'Entreprise publique',
    'Label musical',
    'Auto-édition',
    'Éditeur institutionnel',
    'Éditeur universitaire'
  ];

  // Réinitialiser le formulaire quand la modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setFormData({
        nom: '',
        type_editeur: 'Maison d\'édition',
        site_web: ''
      });
      setError(null);
    }
  }, [isOpen]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.nom) {
      setError('Le nom de l\'éditeur est obligatoire');
      return;
    }

    if (!formData.type_editeur) {
      setError('Le type d\'éditeur est obligatoire');
      return;
    }

    // Validation de l'URL si elle est fournie
    if (formData.site_web && !formData.site_web.startsWith('http')) {
      setError('L\'URL doit commencer par http:// ou https://');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Créer l'objet pour l'API avec cast en any pour éviter les erreurs de type
      const editeurData: any = {
        nom: formData.nom,
        type_editeur: formData.type_editeur,
        site_web: formData.site_web || null,
        actif: true
      };

      // Créer l'éditeur via l'API
      const response = await metadataService.createEditeur(editeurData);

      if (response.success && response.data) {
        onConfirm(response.data);
        onClose();
      } else {
        setError(response.error || 'Erreur lors de la création de l\'éditeur');
      }
    } catch (err) {
      console.error('Erreur création éditeur:', err);
      setError('Erreur lors de la création de l\'éditeur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un éditeur</DialogTitle>
          <DialogDescription>
            Créez un nouvel éditeur. Vous pourrez ensuite l'associer à votre œuvre.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Nom de l'éditeur */}
          <div className="space-y-2">
            <Label htmlFor="nom">
              <Building2 className="inline-block h-4 w-4 mr-2" />
              Nom de l'éditeur *
            </Label>
            <Input
              id="nom"
              value={formData.nom}
              onChange={(e) => handleInputChange('nom', e.target.value)}
              placeholder="Ex: Éditions Barzakh, ENAG, Casbah Éditions"
              disabled={loading}
            />
          </div>

          {/* Type d'éditeur */}
          <div className="space-y-2">
            <Label htmlFor="type_editeur">Type d'éditeur *</Label>
            <Select
              value={formData.type_editeur}
              onValueChange={(value) => handleInputChange('type_editeur', value)}
              disabled={loading}
            >
              <SelectTrigger id="type_editeur">
                <SelectValue placeholder="Sélectionnez un type" />
              </SelectTrigger>
              <SelectContent>
                {typesEditeurs.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Site web */}
          <div className="space-y-2">
            <Label htmlFor="site_web">
              <Globe className="inline-block h-4 w-4 mr-2" />
              Site web
            </Label>
            <Input
              id="site_web"
              type="url"
              value={formData.site_web || ''}
              onChange={(e) => handleInputChange('site_web', e.target.value)}
              placeholder="https://www.editeur.dz"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Optionnel - L'URL doit commencer par http:// ou https://
            </p>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer l'éditeur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditeurModal;