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
import { httpClient } from '@/services/httpClient';
import { API_ENDPOINTS } from '@/config/api';

interface TypeOrganisation {
  id_type_organisation: number;
  nom: { fr?: string; ar?: string; en?: string } | string;
}

const AjouterOrganisation = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { rtlClasses } = useRTL();
  const { toast } = useToast();

  const [types, setTypes] = useState<TypeOrganisation[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nom: { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
    description: { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
    id_type_organisation: '',
    site_web: '',
  });

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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.nom.fr ||
      !formData.nom.ar ||
      !formData.nom.en ||
      !formData.nom['tz-ltn'] ||
      !formData.nom['tz-tfng']
    ) {
      toast({
        title: t('common.error'),
        description: t('organisations.create.nameRequired', 'Le nom de l\'organisation est requis dans toutes les langues'),
        variant: 'destructive',
      });
      return;
    }

    if (!formData.id_type_organisation) {
      toast({
        title: t('common.error'),
        description: t('organisations.create.typeRequired', 'Le type d\'organisation est requis'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await httpClient.post<any>(API_ENDPOINTS.organisations.create, {
        nom: formData.nom,
        id_type_organisation: parseInt(formData.id_type_organisation),
        description: formData.description,
        site_web: formData.site_web || undefined,
      });

      if (response.success) {
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
    <div className="min-h-screen bg-background" dir="ltr">
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
                    onChange={(value) => setFormData(prev => ({ ...prev, nom: value as typeof prev.nom }))}
                    required
                    placeholder={t('organisations.create.namePlaceholder', 'Ex: Association culturelle...')}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('organisations.create.type', 'Type d\'organisation')} *</Label>
                  <Select
                    value={formData.id_type_organisation}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, id_type_organisation: value }))}
                  >
                    <SelectTrigger>
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
                </div>

                <div className="space-y-2">
                  <Label>{t('common.description', 'Description')}</Label>
                  <MultiLangInput
                    name="description"
                    label={t('common.description', 'Description')}
                    value={formData.description}
                    onChange={(value) => setFormData(prev => ({ ...prev, description: value as typeof prev.description }))}
                    type="textarea"
                    rows={3}
                    placeholder={t('organisations.create.descriptionPlaceholder', 'Décrivez votre organisation...')}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('organisations.create.website', 'Site web')}</Label>
                  <Input
                    type="url"
                    value={formData.site_web}
                    onChange={(e) => setFormData(prev => ({ ...prev, site_web: e.target.value }))}
                    placeholder="https://www.example.com"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/ajouter-evenement')}>
                {t('common.cancel', 'Annuler')}
              </Button>
              <Button type="submit" disabled={loading}>
                <Building2 className="h-4 w-4 mr-2" />
                {loading
                  ? t('common.loading', 'Chargement...')
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
