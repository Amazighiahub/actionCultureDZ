/**
 * AjouterPatrimoine - Formulaire professionnel pour ajouter/modifier un patrimoine
 * Avec gestion des services, QR Code automatique, programmes et parcours intelligents
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { MultiLangInput } from '@/components/MultiLangInput';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { Label } from '@/components/UI/label';
import { Badge } from '@/components/UI/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/UI/tabs';
import { Switch } from '@/components/UI/switch';
import { Separator } from '@/components/UI/separator';
import { Progress } from '@/components/UI/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/UI/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/UI/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/UI/table';
import {
  ArrowLeft, Save, Plus, Trash2, QrCode, MapPin, Clock, Calendar,
  Route, Building2, Landmark, Image as ImageIcon, Upload, Eye,
  CheckCircle2, XCircle, Edit, GripVertical, AlertCircle, Loader2,
  Download, Share2, Copy, RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { patrimoineService } from '@/services/patrimoine.service';
import { lieuService } from '@/services/lieu.service';
import { parcoursIntelligentService } from '@/services/parcours.service';

// Types
interface TranslatableValue {
  fr?: string;
  ar?: string;
  en?: string;
  [key: string]: string | undefined;
}

interface ServiceItem {
  id?: number;
  nom: TranslatableValue;
  description?: TranslatableValue;
  disponible: boolean;
  horaires?: string;
  tarif?: number;
  icone?: string;
}

interface ProgrammeItem {
  id?: number;
  titre: TranslatableValue;
  description?: TranslatableValue;
  date_debut: string;
  date_fin?: string;
  heure_debut?: string;
  heure_fin?: string;
  recurrence?: 'unique' | 'quotidien' | 'hebdomadaire' | 'mensuel';
  capacite?: number;
  tarif?: number;
}

interface MonumentItem {
  id?: number;
  nom: TranslatableValue;
  description?: TranslatableValue;
  type: string;
}

interface VestigeItem {
  id?: number;
  nom: TranslatableValue;
  description?: TranslatableValue;
  type: string;
}

interface MediaItem {
  id?: number;
  url: string;
  type: 'image' | 'video';
  description?: TranslatableValue;
  ordre: number;
  file?: File;
  preview?: string;
}

interface ParcoursItem {
  id?: number;
  nom_parcours: TranslatableValue;
  description?: TranslatableValue;
  duree_estimee?: number;
  distance_km?: number;
  difficulte: 'facile' | 'moyen' | 'difficile';
  theme?: string;
  etapes: Array<{
    id_lieu: number;
    nom_lieu?: string;
    ordre: number;
    duree_estimee?: number;
  }>;
}

interface WilayaOption {
  id_wilaya: number;
  nom: string;
}

interface CommuneOption {
  id_commune: number;
  nom: string;
}

// Types de patrimoine
const TYPES_PATRIMOINE = [
  { value: 'ville_village', label: { fr: 'Ville / Village', ar: 'مدينة / قرية', en: 'City / Village' }, icon: Building2 },
  { value: 'monument', label: { fr: 'Monument', ar: 'نصب تذكاري', en: 'Monument' }, icon: Landmark },
  { value: 'musee', label: { fr: 'Musée', ar: 'متحف', en: 'Museum' }, icon: Building2 },
  { value: 'site_archeologique', label: { fr: 'Site archéologique', ar: 'موقع أثري', en: 'Archaeological Site' }, icon: Building2 },
  { value: 'site_naturel', label: { fr: 'Site naturel', ar: 'موقع طبيعي', en: 'Natural Site' }, icon: Building2 },
  { value: 'edifice_religieux', label: { fr: 'Édifice religieux', ar: 'مبنى ديني', en: 'Religious Building' }, icon: Landmark },
  { value: 'palais_forteresse', label: { fr: 'Palais / Forteresse', ar: 'قصر / حصن', en: 'Palace / Fortress' }, icon: Building2 },
  { value: 'autre', label: { fr: 'Autre', ar: 'أخرى', en: 'Other' }, icon: Building2 }
];

// Types de monuments
const TYPES_MONUMENT = ['Mosquée', 'Palais', 'Statue', 'Tour', 'Musée', 'Fort', 'Fontaine', 'Autre'];

// Types de vestiges
const TYPES_VESTIGE = ['Ruines', 'Murailles', 'Site archéologique', 'Fondations', 'Autre'];

// Icônes de services
const SERVICE_ICONS = [
  'parking', 'wifi', 'restaurant', 'cafe', 'toilettes', 'handicap', 'guide',
  'boutique', 'audio-guide', 'photo', 'enfants', 'climatisation', 'securite'
];

const AjouterPatrimoine: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const lang = i18n.language || 'fr';
  const isEditMode = !!id;

  // État principal du formulaire
  const [formData, setFormData] = useState({
    nom: { fr: '', ar: '', en: '' } as TranslatableValue,
    adresse: { fr: '', ar: '', en: '' } as TranslatableValue,
    typePatrimoine: 'monument',
    typeLieu: 'Commune',
    communeId: 0,
    wilayaId: 0,
    latitude: 36.7525,
    longitude: 3.04197,
    // DetailLieu
    description: { fr: '', ar: '', en: '' } as TranslatableValue,
    histoire: { fr: '', ar: '', en: '' } as TranslatableValue,
    referencesHistoriques: { fr: '', ar: '', en: '' } as TranslatableValue,
    horaires: { fr: '', ar: '', en: '' } as TranslatableValue,
    // Options
    genererQRCode: true,
    estUNESCO: false,
    statut: 'actif'
  });

  // États des sous-éléments
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [programmes, setProgrammes] = useState<ProgrammeItem[]>([]);
  const [monuments, setMonuments] = useState<MonumentItem[]>([]);
  const [vestiges, setVestiges] = useState<VestigeItem[]>([]);
  const [medias, setMedias] = useState<MediaItem[]>([]);
  const [parcours, setParcours] = useState<ParcoursItem[]>([]);

  // États UI
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('informations');
  const [qrCodeGenerated, setQrCodeGenerated] = useState<string | null>(null);
  const [wilayas, setWilayas] = useState<WilayaOption[]>([]);
  const [communes, setCommunes] = useState<CommuneOption[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Dialogues
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [programmeDialogOpen, setProgrammeDialogOpen] = useState(false);
  const [monumentDialogOpen, setMonumentDialogOpen] = useState(false);
  const [vestigeDialogOpen, setVestigeDialogOpen] = useState(false);
  const [parcoursDialogOpen, setParcoursDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Formulaires temporaires pour les dialogues
  const [tempService, setTempService] = useState<ServiceItem>({
    nom: { fr: '' },
    disponible: true
  });
  const [tempProgramme, setTempProgramme] = useState<ProgrammeItem>({
    titre: { fr: '' },
    date_debut: new Date().toISOString().split('T')[0]
  });
  const [tempMonument, setTempMonument] = useState<MonumentItem>({
    nom: { fr: '' },
    type: 'Autre'
  });
  const [tempVestige, setTempVestige] = useState<VestigeItem>({
    nom: { fr: '' },
    type: 'Ruines'
  });
  const [tempParcours, setTempParcours] = useState<ParcoursItem>({
    nom_parcours: { fr: '' },
    difficulte: 'facile',
    etapes: []
  });
  const [generatingParcours, setGeneratingParcours] = useState(false);
  const [availableLieux, setAvailableLieux] = useState<Array<{ id_lieu: number; nom: string }>>([]);

  // Charger les wilayas au montage
  useEffect(() => {
    loadWilayas();
    if (isEditMode) {
      loadPatrimoine();
    }
  }, [id]);

  // Charger les communes quand la wilaya change
  useEffect(() => {
    if (formData.wilayaId) {
      loadCommunes(formData.wilayaId);
    }
  }, [formData.wilayaId]);

  // Charger les wilayas
  const loadWilayas = async () => {
    try {
      const response = await lieuService.getWilayas();
      if (response.success && response.data) {
        setWilayas(response.data as WilayaOption[]);
      }
    } catch (err) {
      console.error('Erreur chargement wilayas:', err);
    }
  };

  // Charger les communes d'une wilaya
  const loadCommunes = async (wilayaId: number) => {
    try {
      const response = await lieuService.getCommunesByWilaya(wilayaId);
      if (response.success && response.data) {
        setCommunes(response.data as CommuneOption[]);
      }
    } catch (err) {
      console.error('Erreur chargement communes:', err);
    }
  };

  // Charger un patrimoine existant (mode édition)
  const loadPatrimoine = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await patrimoineService.getSiteDetail(parseInt(id));
      if (response.success && response.data) {
        const site = response.data as any;
        setFormData({
          nom: site.nom || { fr: '' },
          adresse: site.adresse || { fr: '' },
          typePatrimoine: site.typePatrimoine || 'monument',
          typeLieu: site.typeLieu || 'Commune',
          communeId: site.communeId || 0,
          wilayaId: site.wilaya?.id_wilaya || 0,
          latitude: site.latitude || 36.7525,
          longitude: site.longitude || 3.04197,
          description: site.DetailLieu?.description || { fr: '' },
          histoire: site.DetailLieu?.histoire || { fr: '' },
          referencesHistoriques: site.DetailLieu?.referencesHistoriques || { fr: '' },
          horaires: site.DetailLieu?.horaires || { fr: '' },
          genererQRCode: true,
          estUNESCO: site.estUNESCO || false,
          statut: site.statut || 'actif'
        });
        setServices(site.services || []);
        setProgrammes(site.programmes || []);
        setMonuments(site.monuments || []);
        setVestiges(site.vestiges || []);
        setMedias(site.medias || []);
        if (site.qrCodeGenerated) {
          setQrCodeGenerated(site.qrCodeGenerated);
        }
      }
    } catch (err) {
      console.error('Erreur chargement patrimoine:', err);
      toast({
        title: t('common.error'),
        description: t('patrimoine.loadError'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculer la progression du formulaire
  const calculateProgress = useCallback(() => {
    let filled = 0;
    let total = 8;

    if (formData.nom.fr) filled++;
    if (formData.adresse.fr) filled++;
    if (formData.typePatrimoine) filled++;
    if (formData.communeId) filled++;
    if (formData.description.fr) filled++;
    if (formData.latitude && formData.longitude) filled++;
    if (medias.length > 0) filled++;
    if (services.length > 0 || programmes.length > 0) filled++;

    return Math.round((filled / total) * 100);
  }, [formData, medias, services, programmes]);

  // Valider le formulaire
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nom.fr) {
      newErrors.nom = t('validation.required');
    }
    if (!formData.adresse.fr) {
      newErrors.adresse = t('validation.required');
    }
    if (!formData.communeId) {
      newErrors.communeId = t('validation.required');
    }
    if (!formData.typePatrimoine) {
      newErrors.typePatrimoine = t('validation.required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Soumettre le formulaire
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: t('common.error'),
        description: t('validation.fixErrors'),
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        services,
        programmes,
        monuments,
        vestiges,
        parcours: parcours.map(p => ({
          nom_parcours: p.nom_parcours,
          description: p.description,
          duree_estimee: p.duree_estimee,
          distance_km: p.distance_km,
          difficulte: p.difficulte,
          theme: p.theme,
          etapes: p.etapes.map(e => ({
            id_lieu: e.id_lieu,
            ordre: e.ordre,
            duree_estimee: e.duree_estimee
          }))
        })),
        medias: medias.map(m => ({ url: m.url, type: m.type, description: m.description, ordre: m.ordre }))
      };

      let response;
      if (isEditMode) {
        response = await patrimoineService.update(parseInt(id!), payload as any);
      } else {
        response = await patrimoineService.create(payload as any);
      }

      if (response.success) {
        toast({
          title: t('common.success'),
          description: isEditMode ? t('patrimoine.updateSuccess') : t('patrimoine.createSuccess')
        });

        // Si QR Code généré, l'afficher
        if (response.data && (response.data as any).qrCodeGenerated) {
          setQrCodeGenerated((response.data as any).qrCodeGenerated);
        }

        if (!isEditMode) {
          navigate(`/admin/patrimoine/${(response.data as any).id_lieu}`);
        }
      } else {
        throw new Error('Erreur lors de la sauvegarde');
      }
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      toast({
        title: t('common.error'),
        description: t('patrimoine.saveError'),
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Ajouter un service
  const handleAddService = () => {
    if (!tempService.nom.fr) return;

    if (editingItem !== null) {
      setServices(prev => prev.map((s, i) => i === editingItem ? { ...tempService } : s));
    } else {
      setServices(prev => [...prev, { ...tempService }]);
    }

    setTempService({ nom: { fr: '' }, disponible: true });
    setEditingItem(null);
    setServiceDialogOpen(false);
  };

  // Ajouter un programme
  const handleAddProgramme = () => {
    if (!tempProgramme.titre.fr || !tempProgramme.date_debut) return;

    if (editingItem !== null) {
      setProgrammes(prev => prev.map((p, i) => i === editingItem ? { ...tempProgramme } : p));
    } else {
      setProgrammes(prev => [...prev, { ...tempProgramme }]);
    }

    setTempProgramme({ titre: { fr: '' }, date_debut: new Date().toISOString().split('T')[0] });
    setEditingItem(null);
    setProgrammeDialogOpen(false);
  };

  // Ajouter un monument
  const handleAddMonument = () => {
    if (!tempMonument.nom.fr) return;

    if (editingItem !== null) {
      setMonuments(prev => prev.map((m, i) => i === editingItem ? { ...tempMonument } : m));
    } else {
      setMonuments(prev => [...prev, { ...tempMonument }]);
    }

    setTempMonument({ nom: { fr: '' }, type: 'Autre' });
    setEditingItem(null);
    setMonumentDialogOpen(false);
  };

  // Ajouter un vestige
  const handleAddVestige = () => {
    if (!tempVestige.nom.fr) return;

    if (editingItem !== null) {
      setVestiges(prev => prev.map((v, i) => i === editingItem ? { ...tempVestige } : v));
    } else {
      setVestiges(prev => [...prev, { ...tempVestige }]);
    }

    setTempVestige({ nom: { fr: '' }, type: 'Ruines' });
    setEditingItem(null);
    setVestigeDialogOpen(false);
  };

  // Ajouter un parcours
  const handleAddParcours = () => {
    if (!tempParcours.nom_parcours.fr) return;

    // Calculer la durée et distance si des étapes sont définies
    let duree = 0;
    let distance = 0;
    if (tempParcours.etapes.length > 0) {
      duree = tempParcours.etapes.reduce((acc, e) => acc + (e.duree_estimee || 30), 0);
    }

    const parcoursComplet = {
      ...tempParcours,
      duree_estimee: tempParcours.duree_estimee || duree,
      distance_km: tempParcours.distance_km || distance
    };

    if (editingItem !== null) {
      setParcours(prev => prev.map((p, i) => i === editingItem ? parcoursComplet : p));
    } else {
      setParcours(prev => [...prev, parcoursComplet]);
    }

    setTempParcours({ nom_parcours: { fr: '' }, difficulte: 'facile', etapes: [] });
    setEditingItem(null);
    setParcoursDialogOpen(false);
  };

  // Générer un parcours automatique
  const handleGenerateAutoParcours = async () => {
    if (!formData.latitude || !formData.longitude) {
      toast({
        title: t('common.error'),
        description: t('patrimoine.needCoordinates', 'Veuillez définir les coordonnées GPS'),
        variant: 'destructive'
      });
      return;
    }

    setGeneratingParcours(true);
    try {
      const result = await parcoursIntelligentService.generatePersonnalise({
        latitude: formData.latitude,
        longitude: formData.longitude,
        duration: 240,
        transport: 'voiture',
        maxSites: 5
      });

      if (result.success && result.data) {
        const generatedParcours: ParcoursItem = {
          nom_parcours: {
            fr: `Parcours autour de ${formData.nom.fr || 'ce lieu'}`,
            ar: formData.nom.ar ? `مسار حول ${formData.nom.ar}` : undefined
          },
          description: {
            fr: 'Parcours généré automatiquement',
            ar: 'مسار تم إنشاؤه تلقائيًا'
          },
          duree_estimee: result.data.duree_estimee || 240,
          distance_km: result.data.distance_km || 0,
          difficulte: result.data.difficulte || 'moyen',
          theme: result.data.theme,
          etapes: (result.data.etapes || []).map((e: any, index: number) => ({
            id_lieu: e.id_lieu || e.id,
            nom_lieu: typeof e.nom === 'object' ? e.nom.fr : e.nom,
            ordre: index + 1,
            duree_estimee: e.tempsVisite || 30
          }))
        };

        setParcours(prev => [...prev, generatedParcours]);
        toast({
          title: t('common.success'),
          description: t('patrimoine.parcoursGenerated', 'Parcours généré avec succès')
        });
      }
    } catch (err) {
      console.error('Erreur génération parcours:', err);
      toast({
        title: t('common.error'),
        description: t('patrimoine.parcoursGenerateError', 'Erreur lors de la génération du parcours'),
        variant: 'destructive'
      });
    } finally {
      setGeneratingParcours(false);
    }
  };

  // Ajouter une étape au parcours temporaire
  const handleAddEtape = (lieu: { id_lieu: number; nom: string }) => {
    const newEtape = {
      id_lieu: lieu.id_lieu,
      nom_lieu: lieu.nom,
      ordre: tempParcours.etapes.length + 1,
      duree_estimee: 30
    };
    setTempParcours(prev => ({
      ...prev,
      etapes: [...prev.etapes, newEtape]
    }));
  };

  // Supprimer une étape
  const handleRemoveEtape = (index: number) => {
    setTempParcours(prev => ({
      ...prev,
      etapes: prev.etapes
        .filter((_, i) => i !== index)
        .map((e, i) => ({ ...e, ordre: i + 1 }))
    }));
  };

  // Réordonner les étapes
  const handleMoveEtape = (index: number, direction: 'up' | 'down') => {
    const newEtapes = [...tempParcours.etapes];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newEtapes.length) return;

    [newEtapes[index], newEtapes[targetIndex]] = [newEtapes[targetIndex], newEtapes[index]];

    // Recalculer les ordres
    newEtapes.forEach((e, i) => { e.ordre = i + 1; });

    setTempParcours(prev => ({ ...prev, etapes: newEtapes }));
  };

  // Charger les lieux disponibles pour les étapes
  const loadAvailableLieux = async () => {
    if (formData.wilayaId) {
      try {
        const response = await lieuService.getByWilaya(formData.wilayaId);
        if (response.success && response.data) {
          setAvailableLieux((response.data as any[]).map((l: any) => ({
            id_lieu: l.id_lieu,
            nom: typeof l.nom === 'object' ? l.nom.fr : l.nom
          })));
        }
      } catch (err) {
        console.error('Erreur chargement lieux:', err);
      }
    }
  };

  // Upload d'image
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newMedia: MediaItem = {
          url: event.target?.result as string,
          type: 'image',
          ordre: medias.length + index + 1,
          file,
          preview: event.target?.result as string
        };
        setMedias(prev => [...prev, newMedia]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Supprimer une image
  const handleRemoveMedia = (index: number) => {
    setMedias(prev => prev.filter((_, i) => i !== index));
  };

  // Télécharger le QR Code
  const downloadQRCode = () => {
    if (!qrCodeGenerated) return;
    const link = document.createElement('a');
    link.download = `qrcode-patrimoine-${id || 'nouveau'}.png`;
    link.href = qrCodeGenerated;
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold font-serif">
                {isEditMode ? t('patrimoine.edit', 'Modifier le patrimoine') : t('patrimoine.add', 'Ajouter un patrimoine')}
              </h1>
              <p className="text-muted-foreground">
                {t('patrimoine.formDescription', 'Remplissez les informations du site patrimonial')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Progression */}
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{calculateProgress()}%</span>
              <Progress value={calculateProgress()} className="w-32" />
            </div>

            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {t('common.save', 'Enregistrer')}
            </Button>
          </div>
        </div>

        {/* Onglets du formulaire */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7 mb-8">
            <TabsTrigger value="informations">
              <Building2 className="h-4 w-4 mr-2" />
              {t('patrimoine.tabs.info', 'Informations')}
            </TabsTrigger>
            <TabsTrigger value="details">
              <Landmark className="h-4 w-4 mr-2" />
              {t('patrimoine.tabs.details', 'Détails')}
            </TabsTrigger>
            <TabsTrigger value="services">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {t('patrimoine.tabs.services', 'Services')} ({services.length})
            </TabsTrigger>
            <TabsTrigger value="programmes">
              <Calendar className="h-4 w-4 mr-2" />
              {t('patrimoine.tabs.programmes', 'Programmes')} ({programmes.length})
            </TabsTrigger>
            <TabsTrigger value="parcours">
              <Route className="h-4 w-4 mr-2" />
              {t('patrimoine.tabs.parcours', 'Parcours')} ({parcours.length})
            </TabsTrigger>
            <TabsTrigger value="medias">
              <ImageIcon className="h-4 w-4 mr-2" />
              {t('patrimoine.tabs.medias', 'Médias')} ({medias.length})
            </TabsTrigger>
            <TabsTrigger value="qrcode">
              <QrCode className="h-4 w-4 mr-2" />
              {t('patrimoine.tabs.qrcode', 'QR Code')}
            </TabsTrigger>
          </TabsList>

          {/* Onglet Informations de base */}
          <TabsContent value="informations">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('patrimoine.basicInfo', 'Informations de base')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Nom multilingue */}
                  <MultiLangInput
                    name="nom"
                    label={t('patrimoine.name', 'Nom du patrimoine')}
                    value={formData.nom}
                    onChange={(value) => setFormData({ ...formData, nom: value })}
                    required
                    requiredLanguages={['fr']}
                    errors={errors.nom ? { fr: errors.nom } : {}}
                  />

                  {/* Type de patrimoine */}
                  <div className="space-y-2">
                    <Label>{t('patrimoine.type', 'Type de patrimoine')} *</Label>
                    <Select
                      value={formData.typePatrimoine}
                      onValueChange={(value) => setFormData({ ...formData, typePatrimoine: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPES_PATRIMOINE.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <span className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label[lang as 'fr' | 'ar' | 'en'] || type.label.fr}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.typePatrimoine && (
                      <p className="text-sm text-destructive">{errors.typePatrimoine}</p>
                    )}
                  </div>

                  {/* Adresse multilingue */}
                  <MultiLangInput
                    name="adresse"
                    label={t('patrimoine.address', 'Adresse')}
                    value={formData.adresse}
                    onChange={(value) => setFormData({ ...formData, adresse: value })}
                    required
                    requiredLanguages={['fr']}
                    errors={errors.adresse ? { fr: errors.adresse } : {}}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('patrimoine.location', 'Localisation')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Wilaya */}
                  <div className="space-y-2">
                    <Label>{t('patrimoine.wilaya', 'Wilaya')} *</Label>
                    <Select
                      value={formData.wilayaId.toString()}
                      onValueChange={(value) => {
                        setFormData({ ...formData, wilayaId: parseInt(value), communeId: 0 });
                        setCommunes([]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('patrimoine.selectWilaya', 'Sélectionner une wilaya')} />
                      </SelectTrigger>
                      <SelectContent>
                        {wilayas.map(w => (
                          <SelectItem key={w.id_wilaya} value={w.id_wilaya.toString()}>
                            {w.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Commune */}
                  <div className="space-y-2">
                    <Label>{t('patrimoine.commune', 'Commune')} *</Label>
                    <Select
                      value={formData.communeId.toString()}
                      onValueChange={(value) => setFormData({ ...formData, communeId: parseInt(value) })}
                      disabled={!formData.wilayaId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('patrimoine.selectCommune', 'Sélectionner une commune')} />
                      </SelectTrigger>
                      <SelectContent>
                        {communes.map(c => (
                          <SelectItem key={c.id_commune} value={c.id_commune.toString()}>
                            {c.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.communeId && (
                      <p className="text-sm text-destructive">{errors.communeId}</p>
                    )}
                  </div>

                  {/* Coordonnées GPS */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('patrimoine.latitude', 'Latitude')}</Label>
                      <Input
                        type="number"
                        step="0.000001"
                        value={formData.latitude}
                        onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('patrimoine.longitude', 'Longitude')}</Label>
                      <Input
                        type="number"
                        step="0.000001"
                        value={formData.longitude}
                        onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* Aperçu carte */}
                  <div className="h-48 bg-muted rounded-lg flex items-center justify-center">
                    <MapPin className="h-8 w-8 text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">
                      {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Onglet Détails */}
          <TabsContent value="details">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('patrimoine.description', 'Description & Histoire')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <MultiLangInput
                    name="description"
                    label={t('patrimoine.description', 'Description')}
                    value={formData.description}
                    onChange={(value) => setFormData({ ...formData, description: value })}
                    type="textarea"
                    rows={4}
                  />

                  <MultiLangInput
                    name="histoire"
                    label={t('patrimoine.history', 'Histoire')}
                    value={formData.histoire}
                    onChange={(value) => setFormData({ ...formData, histoire: value })}
                    type="textarea"
                    rows={4}
                  />

                  <MultiLangInput
                    name="horaires"
                    label={t('patrimoine.hours', 'Horaires d\'ouverture')}
                    value={formData.horaires}
                    onChange={(value) => setFormData({ ...formData, horaires: value })}
                  />
                </CardContent>
              </Card>

              {/* Monuments et Vestiges */}
              <div className="space-y-6">
                {/* Monuments */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Landmark className="h-5 w-5" />
                      {t('patrimoine.monuments', 'Monuments')} ({monuments.length})
                    </CardTitle>
                    <Button size="sm" onClick={() => {
                      setTempMonument({ nom: { fr: '' }, type: 'Autre' });
                      setEditingItem(null);
                      setMonumentDialogOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-1" />
                      {t('common.add', 'Ajouter')}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {monuments.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        {t('patrimoine.noMonuments', 'Aucun monument ajouté')}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {monuments.map((m, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                            <div>
                              <p className="font-medium">{m.nom.fr || m.nom[lang as keyof TranslatableValue]}</p>
                              <Badge variant="outline">{m.type}</Badge>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setTempMonument(m);
                                  setEditingItem(index);
                                  setMonumentDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setMonuments(prev => prev.filter((_, i) => i !== index))}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Vestiges */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {t('patrimoine.vestiges', 'Vestiges')} ({vestiges.length})
                    </CardTitle>
                    <Button size="sm" onClick={() => {
                      setTempVestige({ nom: { fr: '' }, type: 'Ruines' });
                      setEditingItem(null);
                      setVestigeDialogOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-1" />
                      {t('common.add', 'Ajouter')}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {vestiges.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        {t('patrimoine.noVestiges', 'Aucun vestige ajouté')}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {vestiges.map((v, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                            <div>
                              <p className="font-medium">{v.nom.fr || v.nom[lang as keyof TranslatableValue]}</p>
                              <Badge variant="outline">{v.type}</Badge>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setTempVestige(v);
                                  setEditingItem(index);
                                  setVestigeDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setVestiges(prev => prev.filter((_, i) => i !== index))}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Onglet Services */}
          <TabsContent value="services">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('patrimoine.services', 'Services disponibles')}</CardTitle>
                  <CardDescription>
                    {t('patrimoine.servicesDescription', 'Gérez les services offerts aux visiteurs')}
                  </CardDescription>
                </div>
                <Button onClick={() => {
                  setTempService({ nom: { fr: '' }, disponible: true });
                  setEditingItem(null);
                  setServiceDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('patrimoine.addService', 'Ajouter un service')}
                </Button>
              </CardHeader>
              <CardContent>
                {services.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {t('patrimoine.noServices', 'Aucun service ajouté')}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setTempService({ nom: { fr: '' }, disponible: true });
                        setServiceDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('patrimoine.addFirstService', 'Ajouter le premier service')}
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('patrimoine.serviceName', 'Nom')}</TableHead>
                        <TableHead>{t('patrimoine.serviceDescription', 'Description')}</TableHead>
                        <TableHead>{t('patrimoine.serviceHours', 'Horaires')}</TableHead>
                        <TableHead>{t('patrimoine.servicePrice', 'Tarif')}</TableHead>
                        <TableHead>{t('patrimoine.serviceStatus', 'Statut')}</TableHead>
                        <TableHead className="w-[100px]">{t('common.actions', 'Actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.map((service, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {service.nom.fr || service.nom[lang as keyof TranslatableValue]}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {service.description?.fr || '-'}
                          </TableCell>
                          <TableCell>{service.horaires || '-'}</TableCell>
                          <TableCell>
                            {service.tarif ? `${service.tarif} DA` : t('common.free', 'Gratuit')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={service.disponible ? 'default' : 'secondary'}>
                              {service.disponible ? t('common.available', 'Disponible') : t('common.unavailable', 'Indisponible')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setTempService(service);
                                  setEditingItem(index);
                                  setServiceDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setServices(prev => prev.filter((_, i) => i !== index))}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Programmes */}
          <TabsContent value="programmes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('patrimoine.programmes', 'Programmes & Événements')}</CardTitle>
                  <CardDescription>
                    {t('patrimoine.programmesDescription', 'Planifiez les activités et événements du site')}
                  </CardDescription>
                </div>
                <Button onClick={() => {
                  setTempProgramme({ titre: { fr: '' }, date_debut: new Date().toISOString().split('T')[0] });
                  setEditingItem(null);
                  setProgrammeDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('patrimoine.addProgramme', 'Ajouter un programme')}
                </Button>
              </CardHeader>
              <CardContent>
                {programmes.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {t('patrimoine.noProgrammes', 'Aucun programme planifié')}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setTempProgramme({ titre: { fr: '' }, date_debut: new Date().toISOString().split('T')[0] });
                        setProgrammeDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('patrimoine.addFirstProgramme', 'Ajouter le premier programme')}
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {programmes.map((prog, index) => (
                      <Card key={index}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-lg">
                              {prog.titre.fr || prog.titre[lang as keyof TranslatableValue]}
                            </CardTitle>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setTempProgramme(prog);
                                  setEditingItem(index);
                                  setProgrammeDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setProgrammes(prev => prev.filter((_, i) => i !== index))}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {new Date(prog.date_debut).toLocaleDateString(lang)}
                                {prog.date_fin && ` - ${new Date(prog.date_fin).toLocaleDateString(lang)}`}
                              </span>
                            </div>
                            {prog.heure_debut && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {prog.heure_debut}
                                  {prog.heure_fin && ` - ${prog.heure_fin}`}
                                </span>
                              </div>
                            )}
                            {prog.capacite && (
                              <Badge variant="outline">{prog.capacite} places</Badge>
                            )}
                            {prog.tarif && (
                              <Badge>{prog.tarif} DA</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Parcours Intelligents */}
          <TabsContent value="parcours">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Route className="h-5 w-5" />
                    {t('patrimoine.parcours', 'Parcours Intelligents')}
                  </CardTitle>
                  <CardDescription>
                    {t('patrimoine.parcoursDescription', 'Créez des parcours de visite pour guider les visiteurs')}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleGenerateAutoParcours}
                    disabled={generatingParcours}
                  >
                    {generatingParcours ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {t('patrimoine.generateAuto', 'Générer auto')}
                  </Button>
                  <Button onClick={() => {
                    setTempParcours({ nom_parcours: { fr: '' }, difficulte: 'facile', etapes: [] });
                    setEditingItem(null);
                    loadAvailableLieux();
                    setParcoursDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('patrimoine.addParcours', 'Créer un parcours')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {parcours.length === 0 ? (
                  <div className="text-center py-12">
                    <Route className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">
                      {t('patrimoine.noParcours', 'Aucun parcours créé')}
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('patrimoine.parcoursHelp', 'Les parcours aident les visiteurs à explorer le site de manière optimale')}
                    </p>
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        onClick={handleGenerateAutoParcours}
                        disabled={generatingParcours}
                      >
                        {generatingParcours ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        {t('patrimoine.generateAutoParcours', 'Générer automatiquement')}
                      </Button>
                      <Button onClick={() => {
                        setTempParcours({ nom_parcours: { fr: '' }, difficulte: 'facile', etapes: [] });
                        loadAvailableLieux();
                        setParcoursDialogOpen(true);
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t('patrimoine.createManual', 'Créer manuellement')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {parcours.map((p, index) => (
                      <Card key={index} className="relative">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Route className="h-4 w-4" />
                                {p.nom_parcours.fr || p.nom_parcours[lang as keyof TranslatableValue]}
                              </CardTitle>
                              {p.theme && (
                                <Badge variant="outline" className="mt-1">{p.theme}</Badge>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setTempParcours(p);
                                  setEditingItem(index);
                                  loadAvailableLieux();
                                  setParcoursDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setParcours(prev => prev.filter((_, i) => i !== index))}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {/* Statistiques */}
                            <div className="flex flex-wrap gap-4 text-sm">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>{p.duree_estimee ? `${Math.floor(p.duree_estimee / 60)}h${p.duree_estimee % 60}` : '-'}</span>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                <span>{p.distance_km ? `${p.distance_km.toFixed(1)} km` : '-'}</span>
                              </div>
                              <Badge variant={
                                p.difficulte === 'facile' ? 'default' :
                                p.difficulte === 'moyen' ? 'secondary' : 'destructive'
                              }>
                                {p.difficulte}
                              </Badge>
                            </div>

                            {/* Étapes */}
                            <div className="border-t pt-3">
                              <p className="text-sm font-medium mb-2">
                                {p.etapes.length} {t('patrimoine.steps', 'étapes')}
                              </p>
                              <div className="space-y-1">
                                {p.etapes.slice(0, 3).map((etape, ei) => (
                                  <div key={ei} className="flex items-center gap-2 text-sm">
                                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                      {etape.ordre}
                                    </div>
                                    <span className="truncate">{etape.nom_lieu || `Lieu ${etape.id_lieu}`}</span>
                                  </div>
                                ))}
                                {p.etapes.length > 3 && (
                                  <p className="text-xs text-muted-foreground">
                                    +{p.etapes.length - 3} {t('patrimoine.moreSteps', 'autres étapes')}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Médias */}
          <TabsContent value="medias">
            <Card>
              <CardHeader>
                <CardTitle>{t('patrimoine.medias', 'Galerie photos & vidéos')}</CardTitle>
                <CardDescription>
                  {t('patrimoine.mediasDescription', 'Ajoutez des photos et vidéos du site patrimonial')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Zone d'upload */}
                <div className="border-2 border-dashed rounded-lg p-8 text-center mb-6">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                    id="media-upload"
                    onChange={handleImageUpload}
                  />
                  <label
                    htmlFor="media-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">{t('patrimoine.dropFiles', 'Glissez vos fichiers ici')}</p>
                    <p className="text-muted-foreground">
                      {t('patrimoine.orClick', 'ou cliquez pour sélectionner')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('patrimoine.acceptedFormats', 'JPG, PNG, GIF, MP4 (max 10 Mo)')}
                    </p>
                  </label>
                </div>

                {/* Grille des médias */}
                {medias.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {medias.map((media, index) => (
                      <div key={index} className="relative group aspect-square">
                        {media.type === 'video' ? (
                          <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          </div>
                        ) : (
                          <img
                            src={media.preview || media.url}
                            alt={`Media ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => handleRemoveMedia(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Badge className="absolute top-2 left-2">{index + 1}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet QR Code */}
          <TabsContent value="qrcode">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    {t('patrimoine.qrCode', 'QR Code du site')}
                  </CardTitle>
                  <CardDescription>
                    {t('patrimoine.qrCodeDescription', 'Généré automatiquement pour faciliter l\'accès aux informations')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-6">
                  {qrCodeGenerated ? (
                    <>
                      <img
                        src={qrCodeGenerated}
                        alt="QR Code"
                        className="w-64 h-64 mx-auto border rounded-lg"
                      />
                      <div className="flex justify-center gap-2">
                        <Button onClick={downloadQRCode}>
                          <Download className="h-4 w-4 mr-2" />
                          {t('common.download', 'Télécharger')}
                        </Button>
                        <Button variant="outline" onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          toast({ title: t('common.copied', 'Lien copié !') });
                        }}>
                          <Copy className="h-4 w-4 mr-2" />
                          {t('common.copyLink', 'Copier le lien')}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="py-12">
                      <QrCode className="h-24 w-24 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        {t('patrimoine.qrCodeWillGenerate', 'Le QR Code sera généré automatiquement après la sauvegarde')}
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={formData.genererQRCode}
                          onCheckedChange={(checked) => setFormData({ ...formData, genererQRCode: checked })}
                        />
                        <Label>{t('patrimoine.generateQRCode', 'Générer un QR Code')}</Label>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('patrimoine.qrCodeUsage', 'Utilisation du QR Code')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">1</div>
                    <div>
                      <p className="font-medium">{t('patrimoine.qrStep1Title', 'Affichage sur site')}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('patrimoine.qrStep1Description', 'Imprimez et affichez le QR Code à l\'entrée du site patrimonial')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">2</div>
                    <div>
                      <p className="font-medium">{t('patrimoine.qrStep2Title', 'Scan par les visiteurs')}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('patrimoine.qrStep2Description', 'Les visiteurs scannent le code avec leur smartphone')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">3</div>
                    <div>
                      <p className="font-medium">{t('patrimoine.qrStep3Title', 'Accès aux informations')}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('patrimoine.qrStep3Description', 'Accès instantané à la page détaillée du patrimoine, dans leur langue')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />

      {/* Dialog Ajouter Service */}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem !== null ? t('patrimoine.editService', 'Modifier le service') : t('patrimoine.addService', 'Ajouter un service')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <MultiLangInput
              name="service-nom"
              label={t('patrimoine.serviceName', 'Nom du service')}
              value={tempService.nom}
              onChange={(value) => setTempService({ ...tempService, nom: value })}
              required
              requiredLanguages={['fr']}
            />
            <MultiLangInput
              name="service-description"
              label={t('patrimoine.serviceDescription', 'Description')}
              value={tempService.description || { fr: '' }}
              onChange={(value) => setTempService({ ...tempService, description: value })}
              type="textarea"
              rows={2}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('patrimoine.serviceHours', 'Horaires')}</Label>
                <Input
                  value={tempService.horaires || ''}
                  onChange={(e) => setTempService({ ...tempService, horaires: e.target.value })}
                  placeholder="9h - 17h"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('patrimoine.servicePrice', 'Tarif (DA)')}</Label>
                <Input
                  type="number"
                  value={tempService.tarif || ''}
                  onChange={(e) => setTempService({ ...tempService, tarif: parseFloat(e.target.value) || 0 })}
                  placeholder="0 = Gratuit"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={tempService.disponible}
                onCheckedChange={(checked) => setTempService({ ...tempService, disponible: checked })}
              />
              <Label>{t('patrimoine.serviceAvailable', 'Service disponible')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setServiceDialogOpen(false)}>
              {t('common.cancel', 'Annuler')}
            </Button>
            <Button onClick={handleAddService}>
              {editingItem !== null ? t('common.update', 'Mettre à jour') : t('common.add', 'Ajouter')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ajouter Programme */}
      <Dialog open={programmeDialogOpen} onOpenChange={setProgrammeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem !== null ? t('patrimoine.editProgramme', 'Modifier le programme') : t('patrimoine.addProgramme', 'Ajouter un programme')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <MultiLangInput
              name="programme-titre"
              label={t('patrimoine.programmeTitle', 'Titre du programme')}
              value={tempProgramme.titre}
              onChange={(value) => setTempProgramme({ ...tempProgramme, titre: value })}
              required
              requiredLanguages={['fr']}
            />
            <MultiLangInput
              name="programme-description"
              label={t('patrimoine.programmeDescription', 'Description')}
              value={tempProgramme.description || { fr: '' }}
              onChange={(value) => setTempProgramme({ ...tempProgramme, description: value })}
              type="textarea"
              rows={2}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('patrimoine.startDate', 'Date de début')} *</Label>
                <Input
                  type="date"
                  value={tempProgramme.date_debut}
                  onChange={(e) => setTempProgramme({ ...tempProgramme, date_debut: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('patrimoine.endDate', 'Date de fin')}</Label>
                <Input
                  type="date"
                  value={tempProgramme.date_fin || ''}
                  onChange={(e) => setTempProgramme({ ...tempProgramme, date_fin: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('patrimoine.startTime', 'Heure de début')}</Label>
                <Input
                  type="time"
                  value={tempProgramme.heure_debut || ''}
                  onChange={(e) => setTempProgramme({ ...tempProgramme, heure_debut: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('patrimoine.endTime', 'Heure de fin')}</Label>
                <Input
                  type="time"
                  value={tempProgramme.heure_fin || ''}
                  onChange={(e) => setTempProgramme({ ...tempProgramme, heure_fin: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('patrimoine.capacity', 'Capacité')}</Label>
                <Input
                  type="number"
                  value={tempProgramme.capacite || ''}
                  onChange={(e) => setTempProgramme({ ...tempProgramme, capacite: parseInt(e.target.value) || undefined })}
                  placeholder="Illimité"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('patrimoine.price', 'Tarif (DA)')}</Label>
                <Input
                  type="number"
                  value={tempProgramme.tarif || ''}
                  onChange={(e) => setTempProgramme({ ...tempProgramme, tarif: parseFloat(e.target.value) || 0 })}
                  placeholder="0 = Gratuit"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProgrammeDialogOpen(false)}>
              {t('common.cancel', 'Annuler')}
            </Button>
            <Button onClick={handleAddProgramme}>
              {editingItem !== null ? t('common.update', 'Mettre à jour') : t('common.add', 'Ajouter')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ajouter Monument */}
      <Dialog open={monumentDialogOpen} onOpenChange={setMonumentDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem !== null ? t('patrimoine.editMonument', 'Modifier le monument') : t('patrimoine.addMonument', 'Ajouter un monument')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <MultiLangInput
              name="monument-nom"
              label={t('patrimoine.monumentName', 'Nom du monument')}
              value={tempMonument.nom}
              onChange={(value) => setTempMonument({ ...tempMonument, nom: value })}
              required
              requiredLanguages={['fr']}
            />
            <div className="space-y-2">
              <Label>{t('patrimoine.monumentType', 'Type')}</Label>
              <Select
                value={tempMonument.type}
                onValueChange={(value) => setTempMonument({ ...tempMonument, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES_MONUMENT.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <MultiLangInput
              name="monument-description"
              label={t('patrimoine.monumentDescription', 'Description')}
              value={tempMonument.description || { fr: '' }}
              onChange={(value) => setTempMonument({ ...tempMonument, description: value })}
              type="textarea"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMonumentDialogOpen(false)}>
              {t('common.cancel', 'Annuler')}
            </Button>
            <Button onClick={handleAddMonument}>
              {editingItem !== null ? t('common.update', 'Mettre à jour') : t('common.add', 'Ajouter')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ajouter Vestige */}
      <Dialog open={vestigeDialogOpen} onOpenChange={setVestigeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem !== null ? t('patrimoine.editVestige', 'Modifier le vestige') : t('patrimoine.addVestige', 'Ajouter un vestige')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <MultiLangInput
              name="vestige-nom"
              label={t('patrimoine.vestigeName', 'Nom du vestige')}
              value={tempVestige.nom}
              onChange={(value) => setTempVestige({ ...tempVestige, nom: value })}
              required
              requiredLanguages={['fr']}
            />
            <div className="space-y-2">
              <Label>{t('patrimoine.vestigeType', 'Type')}</Label>
              <Select
                value={tempVestige.type}
                onValueChange={(value) => setTempVestige({ ...tempVestige, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES_VESTIGE.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <MultiLangInput
              name="vestige-description"
              label={t('patrimoine.vestigeDescription', 'Description')}
              value={tempVestige.description || { fr: '' }}
              onChange={(value) => setTempVestige({ ...tempVestige, description: value })}
              type="textarea"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVestigeDialogOpen(false)}>
              {t('common.cancel', 'Annuler')}
            </Button>
            <Button onClick={handleAddVestige}>
              {editingItem !== null ? t('common.update', 'Mettre à jour') : t('common.add', 'Ajouter')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ajouter/Modifier Parcours */}
      <Dialog open={parcoursDialogOpen} onOpenChange={setParcoursDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              {editingItem !== null ? t('patrimoine.editParcours', 'Modifier le parcours') : t('patrimoine.addParcours', 'Créer un parcours')}
            </DialogTitle>
            <DialogDescription>
              {t('patrimoine.parcoursFormDescription', 'Définissez les informations et les étapes du parcours')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Informations de base */}
            <div className="space-y-4">
              <MultiLangInput
                name="parcours-nom"
                label={t('patrimoine.parcoursName', 'Nom du parcours')}
                value={tempParcours.nom_parcours}
                onChange={(value) => setTempParcours({ ...tempParcours, nom_parcours: value })}
                required
                requiredLanguages={['fr']}
              />

              <MultiLangInput
                name="parcours-description"
                label={t('patrimoine.parcoursDesc', 'Description')}
                value={tempParcours.description || { fr: '' }}
                onChange={(value) => setTempParcours({ ...tempParcours, description: value })}
                type="textarea"
                rows={2}
              />

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t('patrimoine.difficulty', 'Difficulté')}</Label>
                  <Select
                    value={tempParcours.difficulte}
                    onValueChange={(value: 'facile' | 'moyen' | 'difficile') =>
                      setTempParcours({ ...tempParcours, difficulte: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facile">{t('patrimoine.easy', 'Facile')}</SelectItem>
                      <SelectItem value="moyen">{t('patrimoine.medium', 'Moyen')}</SelectItem>
                      <SelectItem value="difficile">{t('patrimoine.hard', 'Difficile')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('patrimoine.duration', 'Durée (min)')}</Label>
                  <Input
                    type="number"
                    value={tempParcours.duree_estimee || ''}
                    onChange={(e) => setTempParcours({ ...tempParcours, duree_estimee: parseInt(e.target.value) || undefined })}
                    placeholder="120"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('patrimoine.distance', 'Distance (km)')}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={tempParcours.distance_km || ''}
                    onChange={(e) => setTempParcours({ ...tempParcours, distance_km: parseFloat(e.target.value) || undefined })}
                    placeholder="2.5"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('patrimoine.theme', 'Thème (optionnel)')}</Label>
                <Input
                  value={tempParcours.theme || ''}
                  onChange={(e) => setTempParcours({ ...tempParcours, theme: e.target.value })}
                  placeholder={t('patrimoine.themePlaceholder', 'Ex: Histoire, Architecture, Nature...')}
                />
              </div>
            </div>

            <Separator />

            {/* Gestion des étapes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  {t('patrimoine.steps', 'Étapes du parcours')} ({tempParcours.etapes.length})
                </Label>
              </div>

              {/* Liste des étapes */}
              {tempParcours.etapes.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tempParcours.etapes.map((etape, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => handleMoveEtape(index, 'up')}
                          disabled={index === 0}
                        >
                          <GripVertical className="h-3 w-3 rotate-90" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => handleMoveEtape(index, 'down')}
                          disabled={index === tempParcours.etapes.length - 1}
                        >
                          <GripVertical className="h-3 w-3 rotate-90" />
                        </Button>
                      </div>

                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                        {etape.ordre}
                      </div>

                      <div className="flex-1">
                        <p className="font-medium text-sm">{etape.nom_lieu || `Lieu #${etape.id_lieu}`}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <Input
                            type="number"
                            className="h-6 w-16 text-xs"
                            value={etape.duree_estimee || 30}
                            onChange={(e) => {
                              const newEtapes = [...tempParcours.etapes];
                              newEtapes[index].duree_estimee = parseInt(e.target.value) || 30;
                              setTempParcours({ ...tempParcours, etapes: newEtapes });
                            }}
                          />
                          <span>min</span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveEtape(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Sélection d'un lieu à ajouter */}
              <div className="space-y-2">
                <Label>{t('patrimoine.addStep', 'Ajouter une étape')}</Label>
                <Select
                  onValueChange={(value) => {
                    const lieu = availableLieux.find(l => l.id_lieu.toString() === value);
                    if (lieu) handleAddEtape(lieu);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('patrimoine.selectLieu', 'Sélectionner un lieu...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLieux.length === 0 ? (
                      <SelectItem value="none" disabled>
                        {t('patrimoine.noLieuxAvailable', 'Aucun lieu disponible')}
                      </SelectItem>
                    ) : (
                      availableLieux
                        .filter(l => !tempParcours.etapes.find(e => e.id_lieu === l.id_lieu))
                        .map(lieu => (
                          <SelectItem key={lieu.id_lieu} value={lieu.id_lieu.toString()}>
                            {lieu.nom}
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('patrimoine.selectLieuHelp', 'Sélectionnez les lieux dans l\'ordre de visite souhaité')}
                </p>
              </div>

              {/* Ajout rapide depuis monuments/vestiges existants */}
              {(monuments.length > 0 || vestiges.length > 0) && (
                <div className="space-y-2">
                  <Label>{t('patrimoine.addFromExisting', 'Ou ajouter depuis les éléments existants')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {monuments.map((m, i) => (
                      <Badge
                        key={`monument-${i}`}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => handleAddEtape({
                          id_lieu: m.id || Date.now() + i,
                          nom: m.nom.fr || ''
                        })}
                      >
                        <Landmark className="h-3 w-3 mr-1" />
                        {m.nom.fr}
                      </Badge>
                    ))}
                    {vestiges.map((v, i) => (
                      <Badge
                        key={`vestige-${i}`}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => handleAddEtape({
                          id_lieu: v.id || Date.now() + i + 1000,
                          nom: v.nom.fr || ''
                        })}
                      >
                        <Building2 className="h-3 w-3 mr-1" />
                        {v.nom.fr}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setParcoursDialogOpen(false)}>
              {t('common.cancel', 'Annuler')}
            </Button>
            <Button onClick={handleAddParcours} disabled={!tempParcours.nom_parcours.fr}>
              {editingItem !== null ? t('common.update', 'Mettre à jour') : t('common.create', 'Créer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AjouterPatrimoine;
