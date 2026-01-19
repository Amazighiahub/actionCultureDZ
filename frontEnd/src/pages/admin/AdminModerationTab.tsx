/**
 * AdminModerationTab - Onglet de modération des signalements
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/UI/tabs';
import { Alert, AlertDescription } from '@/components/UI/alert';
import {
  AlertTriangle, CheckCircle, XCircle, Eye, Shield, 
  MessageSquare, Flag, Clock, User, FileText
} from 'lucide-react';

import { LazyImage, EmptyState, LoadingSkeleton, StatusBadge } from '@/components/shared';

interface Signalement {
  id: number;
  type: 'oeuvre' | 'commentaire' | 'utilisateur' | 'evenement';
  raison: string;
  description?: string;
  statut: 'en_attente' | 'traite' | 'rejete';
  date_signalement: string;
  signale_par: {
    id: number;
    nom: string;
    prenom: string;
  };
  element_signale: {
    id: number;
    titre?: string;
    nom?: string;
    contenu?: string;
  };
}

const RAISONS_SIGNALEMENT_CONFIG = {
  contenu_inapproprie: 'admin.moderation.reasons.inappropriateContent',
  spam: 'admin.moderation.reasons.spam',
  harcelement: 'admin.moderation.reasons.harassment',
  droits_auteur: 'admin.moderation.reasons.copyright',
  fausse_information: 'admin.moderation.reasons.falseInformation',
  autre: 'admin.moderation.reasons.other'
};

const AdminModerationTab: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('en_attente');
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock data
  React.useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setSignalements([
        {
          id: 1,
          type: 'commentaire',
          raison: 'contenu_inapproprie',
          description: 'Commentaire offensant envers l\'artiste',
          statut: 'en_attente',
          date_signalement: new Date().toISOString(),
          signale_par: { id: 1, nom: 'Benali', prenom: 'Ahmed' },
          element_signale: { id: 1, contenu: 'Ce commentaire est très négatif...' }
        },
        {
          id: 2,
          type: 'oeuvre',
          raison: 'droits_auteur',
          description: 'Cette œuvre est copiée d\'un autre artiste',
          statut: 'en_attente',
          date_signalement: new Date(Date.now() - 86400000).toISOString(),
          signale_par: { id: 2, nom: 'Mammeri', prenom: 'Fatima' },
          element_signale: { id: 5, titre: 'Paysage saharien' }
        }
      ]);
      setLoading(false);
    }, 500);
  }, [activeTab]);

  const handleAction = async (signalementId: number, action: 'approuver' | 'rejeter' | 'avertir') => {
    console.log('Action:', action, 'sur signalement:', signalementId);
    // Mettre à jour localement
    setSignalements(prev => prev.filter(s => s.id !== signalementId));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'commentaire': return MessageSquare;
      case 'utilisateur': return User;
      case 'oeuvre': return FileText;
      default: return Flag;
    }
  };

  const filteredSignalements = signalements.filter(s => {
    if (activeTab === 'en_attente') return s.statut === 'en_attente';
    if (activeTab === 'traite') return s.statut === 'traite';
    if (activeTab === 'rejete') return s.statut === 'rejete';
    return true;
  });

  if (loading) {
    return <LoadingSkeleton type="list" count={5} />;
  }

  return (
    <div className="space-y-6">
      {/* Stats rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('admin.moderation.status.pending')}</p>
              <p className="text-2xl font-bold">{signalements.filter(s => s.statut === 'en_attente').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('admin.moderation.status.processed')}</p>
              <p className="text-2xl font-bold">{signalements.filter(s => s.statut === 'traite').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('admin.moderation.status.rejected')}</p>
              <p className="text-2xl font-bold">{signalements.filter(s => s.statut === 'rejete').length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des signalements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('admin.moderation.title', 'Modération')}
          </CardTitle>
          <CardDescription>
            {t('admin.moderation.description', 'Gérez les signalements de la communauté')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="en_attente" className="gap-2">
                <Clock className="h-4 w-4" />
                {t('admin.moderation.status.pending')}
              </TabsTrigger>
              <TabsTrigger value="traite">{t('admin.moderation.status.processed')}</TabsTrigger>
              <TabsTrigger value="rejete">{t('admin.moderation.status.rejected')}</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {filteredSignalements.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t('admin.moderation.noReports')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSignalements.map((signalement) => {
                    const TypeIcon = getTypeIcon(signalement.type);
                    
                    return (
                      <Card key={signalement.id} className="border-l-4 border-l-yellow-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <TypeIcon className="h-4 w-4 text-muted-foreground" />
                                <Badge variant="outline">{t(`admin.moderation.types.${signalement.type}`)}</Badge>
                                <Badge variant="secondary">
                                  {t(RAISONS_SIGNALEMENT_CONFIG[signalement.raison as keyof typeof RAISONS_SIGNALEMENT_CONFIG] || signalement.raison)}
                                </Badge>
                              </div>

                              <p className="text-sm mb-2">
                                {signalement.description || t('admin.moderation.noDescription')}
                              </p>

                              <div className="text-xs text-muted-foreground">
                                {t('admin.moderation.reportedBy', { name: `${signalement.signale_par.prenom} ${signalement.signale_par.nom}` })} •
                                {new Date(signalement.date_signalement).toLocaleDateString('fr-FR')}
                              </div>

                              {signalement.element_signale && (
                                <Alert className="mt-3 bg-muted/50">
                                  <AlertDescription className="text-sm">
                                    <strong>{t('admin.moderation.concernedElement')}:</strong>{' '}
                                    {signalement.element_signale.titre ||
                                     signalement.element_signale.nom ||
                                     signalement.element_signale.contenu?.substring(0, 100)}
                                  </AlertDescription>
                                </Alert>
                              )}
                            </div>

                            {signalement.statut === 'en_attente' && (
                              <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                                <Button
                                  size="sm"
                                  onClick={() => handleAction(signalement.id, 'approuver')}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  {t('admin.moderation.actions.approve')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleAction(signalement.id, 'rejeter')}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  {t('admin.moderation.actions.reject')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAction(signalement.id, 'avertir')}
                                >
                                  <AlertTriangle className="h-4 w-4 mr-1" />
                                  {t('admin.moderation.actions.warn')}
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminModerationTab;
