// components/modals/EditeurModal.tsx
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'@/components/ui/select';
import { Loader2, Building2, Globe, AlertCircle } from 'lucide-react';
import { metadataService } from '@/services/metadata.service';
import type { Editeur } from '@/types/models/references.types';import { useTranslation } from "react-i18next";

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
    type_editeur: 'maison_edition',
    site_web: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Types d'éditeurs disponibles
  const { t } = useTranslation();
  const typesEditeurs = [
    { value: 'maison_edition', label: t('editeur.types.maisonEdition', 'Maison d\'édition') },
    { value: 'independant', label: t('editeur.types.independant', 'Éditeur indépendant') },
    { value: 'entreprise_publique', label: t('editeur.types.entreprisePublique', 'Entreprise publique') },
    { value: 'label_musical', label: t('editeur.types.labelMusical', 'Label musical') },
    { value: 'auto_edition', label: t('editeur.types.autoEdition', 'Auto-édition') },
    { value: 'institutionnel', label: t('editeur.types.institutionnel', 'Éditeur institutionnel') },
    { value: 'universitaire', label: t('editeur.types.universitaire', 'Éditeur universitaire') },
  ];


  // Réinitialiser le formulaire quand la modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setFormData({
        nom: '',
        type_editeur: 'maison_edition',
        site_web: ''
      });
      setError(null);
      setFieldErrors({});
    }
  }, [isOpen]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async () => {
    // Validation — collect all errors
    const errs: Record<string, string> = {};
    if (!formData.nom) {
      errs.nom = t('modals_editeurmodal.error_nom_required', 'Le nom de l\'éditeur est obligatoire');
    }
    if (!formData.type_editeur) {
      errs.type_editeur = t('modals_editeurmodal.error_type_required', 'Le type d\'éditeur est obligatoire');
    }
    if (formData.site_web && !formData.site_web.startsWith('http')) {
      errs.site_web = t('modals_editeurmodal.error_url_invalid', 'L\'URL doit commencer par http:// ou https://');
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError(Object.values(errs)[0]);
      setTimeout(() => {
        const el = document.querySelector('[aria-invalid="true"]');
        if (el) {
          (el as HTMLElement).focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const editeurData: any = {
        nom: formData.nom,
        type_editeur: formData.type_editeur, // Envoie la value enum, pas le label traduit
        site_web: formData.site_web || null,
        actif: true
      };

      // Créer l'éditeur via l'API
      const response = await metadataService.createEditeur(editeurData);

      if (response.success && response.data) {
        onConfirm(response.data);
        onClose();
      } else {
        setError(response.error || t('editeur.errors.createFailed', 'Erreur lors de la création de l\'éditeur'));
      }
    } catch (err) {
      console.error('Erreur création éditeur:', err);
      setError(t('editeur.errors.createFailed', 'Erreur lors de la création de l\'éditeur'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("modals_editeurmodal.ajouter_diteur")}</DialogTitle>
          <DialogDescription>{t("modals_editeurmodal.crez_nouvel_diteur")}

          </DialogDescription>
        </DialogHeader>

        {error &&
        <Alert variant="destructive" role="alert">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        }

        <div className="space-y-4">
          {/* Nom de l'éditeur */}
          <div className="space-y-2">
            <Label htmlFor="nom">
              <Building2 className="inline-block h-4 w-4 me-2" />{t("modals_editeurmodal.nom_lditeur")}

            </Label>
            <Input
              id="nom"
              maxLength={255}
              value={formData.nom}
              onChange={(e) => handleInputChange('nom', e.target.value)}
              placeholder={t("modals_editeurmodal.placeholder_ditions_barzakh_enag")}
              disabled={loading}
              className={fieldErrors.nom ? 'border-destructive' : ''}
              aria-invalid={!!fieldErrors.nom}
              aria-describedby={fieldErrors.nom ? 'editeur-nom-error' : undefined}
            />
            {fieldErrors.nom && (
              <p id="editeur-nom-error" role="alert" className="text-sm text-destructive">{fieldErrors.nom}</p>
            )}

          </div>

          {/* Type d'éditeur */}
          <div className="space-y-2">
            <Label htmlFor="type_editeur">{t("modals_editeurmodal.type_dditeur")}</Label>
            <Select
              value={formData.type_editeur}
              onValueChange={(value) => handleInputChange('type_editeur', value)}
              disabled={loading}>

              <SelectTrigger
                id="type_editeur"
                className={fieldErrors.type_editeur ? 'border-destructive' : ''}
                aria-invalid={!!fieldErrors.type_editeur}
                aria-describedby={fieldErrors.type_editeur ? 'editeur-type-error' : undefined}
              >
                <SelectValue placeholder={t("modals_editeurmodal.placeholder_slectionnez_type")} />
              </SelectTrigger>
              <SelectContent>
                {typesEditeurs.map((type) =>
                <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {fieldErrors.type_editeur && (
              <p id="editeur-type-error" role="alert" className="text-sm text-destructive">{fieldErrors.type_editeur}</p>
            )}
          </div>

          {/* Site web */}
          <div className="space-y-2">
            <Label htmlFor="site_web">
              <Globe className="inline-block h-4 w-4 me-2" />{t("modals_editeurmodal.site_web")}

            </Label>
            <Input
              id="site_web"
              type="url"
              autoComplete="url"
              maxLength={2048}
              value={formData.site_web || ''}
              onChange={(e) => handleInputChange('site_web', e.target.value)}
              placeholder="https://www.editeur.dz"
              disabled={loading}
              className={fieldErrors.site_web ? 'border-destructive' : ''}
              aria-invalid={!!fieldErrors.site_web}
              aria-describedby={fieldErrors.site_web ? 'editeur-siteweb-error' : undefined}
            />
            {fieldErrors.site_web && (
              <p id="editeur-siteweb-error" role="alert" className="text-sm text-destructive">{fieldErrors.site_web}</p>
            )}

            <p className="text-xs text-muted-foreground">{t("modals_editeurmodal.optionnel_lurl_doit")}

            </p>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={loading}>{t("modals_editeurmodal.annuler")}

          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}{t("modals_editeurmodal.crer_lditeur")}

          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);

};

export default EditeurModal;