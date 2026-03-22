import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import MultiLangInput from '@/components/MultiLangInput';
import { useRTL } from '@/hooks/useRTL';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { httpClient } from '@/services/httpClient';
import { API_ENDPOINTS } from '@/config/api';

interface TypeOrganisation {
  id_type_organisation: number;
  nom: { fr?: string; ar?: string; en?: string } | string;
}

const AjouterOrganisation = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { rtlClasses, direction } = useRTL();
  const { toast } = useToast();

  const [types, setTypes] = useState<TypeOrganisation[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeLoadError, setTypeLoadError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [formData, setFormData] = useState({
    nom: { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
    description: { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
    id_type_organisation: '',
    site_web: '',
  });

  useUnsavedChanges(isDirty);

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      const response = await httpClient.get<TypeOrganisation[]>(API_ENDPOINTS.organisations.types);
      if (response.success && response.data) {
        setTypes(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement types organisations:', error);
      setTypeLoadError(true);
    }
  };

  const validateFieldOnBlur = (field: string) => {
    let error: string | undefined;
    if (field === 'site_web') {
      if (formData.site_web && !/^https?:\/\/.+\..+/.test(formData.site_web)) {
        error = t('organisations.create.urlInvalid', 'URL du site web invalide (doit commencer par http:// ou https://)');
      }
    }
    setFieldErrors(prev => {
      if (!error) { const next = { ...prev }; delete next[field]; return next; }
      return { ...prev, [field]: error };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errs: Record<string, string> = {};
    if (!formData.nom.fr?.trim() && !formData.nom.ar?.trim()) {
      errs.nom = t('organisations.create.nameRequired', 'Le nom de l\'organisation est requis (au moins en français ou arabe)');
    }
    if (!formData.id_type_organisation) {
      errs.id_type_organisation = t('organisations.create.typeRequired', 'Le type d\'organisation est requis');
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast({
        title: t('common.error'),
        description: Object.values(errs)[0],
        variant: 'destructive',
      });
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
    try {
      const response = await httpClient.post<Record<string, unknown>>(API_ENDPOINTS.organisations.create, {
        nom: formData.nom,
        id_type_organisation: parseInt(formData.id_type_organisation),
        description: formData.description,
        site_web: formData.site_web || undefined,
      });

      if (response.success) {
        setIsDirty(false);
        toast({
          title: t('common.success', 'Succès'),
          description: t('organisations.create.success', 'Organisation créée avec succès'),
        });
        navigate('/ajouter-evenement');
      } else {
        toast({
          title: t('common.error', 'Erreur'),
          description: response.error || t('organisations.create.error', 'Erreur lors de la création'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erreur création organisation:', error);
      toast({
        title: t('common.error', 'Erreur'),
        description: t('organisations.create.error', 'Erreur lors de la création'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getTypeName = (type: TypeOrganisation): string => {
    if (typeof type.nom === 'object') {
      return type.nom.fr || type.nom.ar || type.nom.en || '';
    }
    return type.nom;
  };

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      <Header />

      <main className="container py-12">
        <div className="max-w-2xl mx-auto">
          <div className={`flex items-center gap-4 mb-8 ${rtlClasses.flexRow}`}>
            <Link to="/ajouter-evenement">
              <Button variant="outline" size="sm">
                <ArrowLeft className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
                {t('common.back', 'Retour')}
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight font-serif text-gradient">
                {t('organisations.create.title', 'Créer une organisation')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t('organisations.create.subtitle', 'Créez votre structure pour organiser des événements')}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <p className="text-sm text-muted-foreground">{t('common.requiredFieldsLegend')}</p>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {t('organisations.create.info', 'Informations')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('organisations.create.name', 'Nom de l\'organisation')} *</Label>
                  <MultiLangInput
                    name="nom"
                    label={t('organisations.create.name', 'Nom')}
                    value={formData.nom}
                    onChange={(value) => {
                      setFormData(prev => ({ ...prev, nom: value as typeof prev.nom }));
                      setFieldErrors(prev => ({ ...prev, nom: '' }));
                      setIsDirty(true);
                    }}
                    required
                    requiredLanguages={['fr']}
                    placeholder={t('organisations.create.namePlaceholder', 'Ex: Association culturelle...')}
                    errors={fieldErrors.nom ? { fr: fieldErrors.nom } : undefined}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('organisations.create.type', 'Type d\'organisation')} *</Label>
                  <Select
                    value={formData.id_type_organisation}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, id_type_organisation: value }));
                      setFieldErrors(prev => ({ ...prev, id_type_organisation: '' }));
                      setIsDirty(true);
                    }}
                  >
                    <SelectTrigger
                      className={fieldErrors.id_type_organisation ? 'border-destructive' : ''}
                      aria-invalid={!!fieldErrors.id_type_organisation}
                      aria-describedby={fieldErrors.id_type_organisation ? 'type-org-error' : undefined}
                    >
                      <SelectValue placeholder={t('organisations.create.typePlaceholder', 'Choisir un type')} />
                    </SelectTrigger>
                    <SelectContent>
                      {types.map((type) => (
                        <SelectItem key={type.id_type_organisation} value={type.id_type_organisation.toString()}>
                          {getTypeName(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.id_type_organisation && (
                    <p id="type-org-error" role="alert" className="text-sm text-destructive">{fieldErrors.id_type_organisation}</p>
                  )}
                  {typeLoadError && (
                    <p className="text-sm text-destructive">{t('organisations.create.typeLoadError', 'Impossible de charger les types. Veuillez rafraîchir la page.')}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t('common.description', 'Description')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                  <MultiLangInput
                    name="description"
                    label={t('common.description', 'Description')}
                    value={formData.description}
                    onChange={(value) => { setFormData(prev => ({ ...prev, description: value as typeof prev.description })); setIsDirty(true); }}
                    type="textarea"
                    rows={3}
                    requiredLanguages={[]}
                    placeholder={t('organisations.create.descriptionPlaceholder', 'Décrivez votre organisation...')}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('organisations.create.website', 'Site web')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                  <Input
                    type="url"
                    autoComplete="url"
                    maxLength={2048}
                    value={formData.site_web}
                    onChange={(e) => { setFormData(prev => ({ ...prev, site_web: e.target.value })); setIsDirty(true); }}
                    onBlur={() => validateFieldOnBlur('site_web')}
                    placeholder="https://www.example.com"
                    aria-invalid={!!fieldErrors.site_web}
                    aria-describedby={fieldErrors.site_web ? 'site_web-error' : 'site_web-helper'}
                  />
                  <p id="site_web-helper" className="text-xs text-muted-foreground">{t('common.urlHelper')}</p>
                  {fieldErrors.site_web && (
                    <p id="site_web-error" role="alert" className="text-sm text-destructive">{fieldErrors.site_web}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/ajouter-evenement')}>
                {t('common.cancel', 'Annuler')}
              </Button>
              <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={loading}>
                <Building2 className="h-4 w-4 me-2" />
                {loading
                  ? t('organisations.create.submitting', 'Création en cours...')
                  : t('organisations.create.submit', 'Créer l\'organisation')}
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AjouterOrganisation;
