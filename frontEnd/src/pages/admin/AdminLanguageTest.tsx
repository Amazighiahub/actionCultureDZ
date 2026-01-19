/**
 * AdminLanguageTest - Composant de test pour vérifier les traductions admin
 * Affiche toutes les clés de traduction dans la langue actuelle
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Badge } from '@/components/UI/badge';
import { Globe, Check } from 'lucide-react';

const AdminLanguageTest: React.FC = () => {
  const { t, i18n } = useTranslation();

  const testSections = [
    {
      title: 'Notifications',
      keys: [
        'admin.notifications.modal.title',
        'admin.notifications.modal.description',
        'admin.notifications.types.info',
        'admin.notifications.types.validation',
        'admin.notifications.types.warning',
        'admin.notifications.targetGroups.all',
        'admin.notifications.targetGroups.professionals',
      ]
    },
    {
      title: 'Modération',
      keys: [
        'admin.moderation.title',
        'admin.moderation.status.pending',
        'admin.moderation.status.processed',
        'admin.moderation.status.rejected',
        'admin.moderation.reasons.inappropriateContent',
        'admin.moderation.reasons.spam',
        'admin.moderation.actions.approve',
        'admin.moderation.actions.reject',
        'admin.moderation.actions.process',
      ]
    },
    {
      title: 'Patrimoine',
      keys: [
        'admin.patrimoine.title',
        'admin.patrimoine.filters.allTypes',
        'admin.patrimoine.types.historicalSite',
        'admin.patrimoine.types.museum',
      ]
    },
    {
      title: 'Vue d\'ensemble',
      keys: [
        'admin.overview.title',
        'admin.overview.subtitle',
        'admin.stats.users',
        'admin.stats.works',
        'admin.stats.events',
        'admin.stats.heritage',
        'admin.stats.thisMonth',
      ]
    },
    {
      title: 'En attente',
      keys: [
        'admin.pending.users',
        'admin.pending.usersDesc',
        'admin.pending.noUsers',
        'admin.pending.works',
        'admin.pending.viewAll',
        'admin.pending.viewAllWorks',
      ]
    },
    {
      title: 'Activité',
      keys: [
        'admin.activity.title',
        'admin.activity.viewsToday',
        'admin.activity.newUsers',
        'admin.activity.pendingWorks',
        'admin.activity.openReports',
      ]
    },
    {
      title: 'Common',
      keys: [
        'common.cancel',
        'common.delete',
        'common.edit',
        'common.view',
        'common.refresh',
        'common.error',
      ]
    },
    {
      title: 'Wilayas',
      keys: [
        'wilayas.alger',
        'wilayas.oran',
        'wilayas.constantine',
      ]
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Test des traductions Admin</h1>
          <p className="text-muted-foreground mt-2">
            Vérification de toutes les clés de traduction pour la langue actuelle
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Globe className="h-4 w-4 mr-2" />
          {i18n.language.toUpperCase()}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {testSections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {section.keys.map((key) => {
                  const value = t(key);
                  const isMissing = value === key;

                  return (
                    <div
                      key={key}
                      className={`p-2 rounded text-sm ${isMissing ? 'bg-red-50 text-red-800' : 'bg-green-50'}`}
                    >
                      <div className="font-mono text-xs text-muted-foreground mb-1">
                        {key.replace('admin.', '').replace('common.', '').replace('wilayas.', '')}
                      </div>
                      <div className={isMissing ? 'font-bold' : ''}>
                        {isMissing ? '❌ MANQUANT' : value}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-blue-50">
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Utilisez le sélecteur de langue dans le header pour changer de langue</li>
            <li>Vérifiez que toutes les traductions s'affichent correctement</li>
            <li>Les traductions manquantes apparaîtront en rouge avec "❌ MANQUANT"</li>
            <li>Testez toutes les langues: FR, EN, AR, TZ-LTN, TZ-TFNG</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLanguageTest;
