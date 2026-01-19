/**
 * AdminOverview - Vue d'ensemble du dashboard administrateur
 * Utilise useDashboardAdmin (le hook existant qui fonctionne)
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import {
  Users, BookOpen, Calendar, MapPin,
  AlertTriangle, CheckCircle, Eye, ArrowRight, RefreshCw
} from 'lucide-react';

// Composants partagés
import { LoadingSkeleton, LazyImage } from '@/components/shared';

// ✅ CORRIGÉ: Utilise useDashboardAdmin au lieu de useAdminStats
import { useDashboardAdmin } from '@/hooks/useDashboardAdmin';

// Composant StatCard
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  color?: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, color = 'primary', onClick }) => (
  <Card 
    className={`hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
  >
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}/10`}>
          <Icon className={`h-6 w-6 text-${color}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Composant pour les éléments en attente
interface PendingItemProps {
  title: string;
  subtitle: string;
  date: string;
  imageUrl?: string;
  onApprove: () => void;
  onReject: () => void;
}

const PendingItem: React.FC<PendingItemProps> = ({ title, subtitle, date, imageUrl, onApprove, onReject }) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      {imageUrl ? (
        <LazyImage src={imageUrl} alt={title} className="w-12 h-12 rounded-full object-cover" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Users className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{title}</p>
        <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
        <p className="text-xs text-muted-foreground">{date}</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onReject}>
          {t('admin.actions.reject')}
        </Button>
        <Button size="sm" onClick={onApprove}>
          {t('admin.actions.validate')}
        </Button>
      </div>
    </div>
  );
};

const AdminOverview: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // ✅ CORRIGÉ: Utilise useDashboardAdmin
  const {
    overview,
    pendingUsers,
    pendingOeuvres,
    moderationQueue,
    alerts,
    loadingOverview,
    loadingPendingUsers,
    loadingPendingOeuvres,
    loadingModeration,
    validateUser,
    validateOeuvre,
    refreshAll
  } = useDashboardAdmin();

  // Afficher le skeleton pendant le chargement
  if (loadingOverview) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="stats" />
        <div className="grid gap-6 md:grid-cols-2">
          <LoadingSkeleton type="card" />
          <LoadingSkeleton type="card" />
        </div>
      </div>
    );
  }

  // Extraire les stats de overview
  const stats = overview ? {
    totalUsers: overview.users?.total || 0,
    newUsers: overview.users?.nouveaux_mois || 0,
    pendingUsers: overview.users?.en_attente_validation || 0,
    totalOeuvres: overview.content?.oeuvres_total || 0,
    pendingOeuvres: overview.content?.oeuvres_en_attente || 0,
    totalEvents: overview.content?.evenements_total || 0,
    totalPatrimoine: overview.content?.sites_patrimoine || 0,
    openReports: overview.activity?.signalements_ouverts || 0,
    viewsToday: overview.activity?.actions_jour || 0
  } : null;

  return (
    <div className="space-y-6">
      {/* Header avec bouton refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('admin.overview.title', 'Vue d\'ensemble')}</h2>
          <p className="text-muted-foreground">
            {t('admin.overview.subtitle', 'Statistiques et actions rapides')}
          </p>
        </div>
        <Button variant="outline" onClick={refreshAll}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('common.refresh', 'Actualiser')}
        </Button>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title={t('admin.stats.users', 'Utilisateurs')}
          value={stats?.totalUsers || 0}
          icon={Users}
          trend={{ value: 12, label: t('admin.stats.thisMonth') }}
          color="blue-500"
          onClick={() => navigate('/admin?tab=users')}
        />
        <StatCard
          title={t('admin.stats.works', 'Œuvres')}
          value={stats?.totalOeuvres || 0}
          icon={BookOpen}
          trend={{ value: 8, label: t('admin.stats.thisMonth') }}
          color="green-500"
          onClick={() => navigate('/admin?tab=oeuvres')}
        />
        <StatCard
          title={t('admin.stats.events', 'Événements')}
          value={stats?.totalEvents || 0}
          icon={Calendar}
          trend={{ value: 5, label: t('admin.stats.thisMonth') }}
          color="purple-500"
          onClick={() => navigate('/admin?tab=evenements')}
        />
        <StatCard
          title={t('admin.stats.heritage', 'Sites patrimoniaux')}
          value={stats?.totalPatrimoine || 0}
          icon={MapPin}
          color="amber-500"
          onClick={() => navigate('/admin?tab=patrimoine')}
        />
      </div>

      {/* Alertes si présentes */}
      {alerts && alerts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              {t('admin.alerts.title', 'Alertes')} ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-yellow-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Éléments en attente */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Utilisateurs en attente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('admin.pending.users', 'Utilisateurs en attente')}
              {pendingUsers?.items?.length > 0 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {pendingUsers.items.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {t('admin.pending.usersDesc', 'Comptes professionnels à valider')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPendingUsers ? (
              <LoadingSkeleton type="list" count={3} />
            ) : pendingUsers?.items?.length > 0 ? (
              <div className="space-y-3">
                {pendingUsers.items.slice(0, 5).map((user: any) => (
                  <PendingItem
                    key={user.id_user}
                    title={`${user.prenom} ${user.nom}`}
                    subtitle={user.type_user || user.email}
                    date={new Date(user.date_inscription).toLocaleDateString('fr-FR')}
                    imageUrl={user.photo_url}
                    onApprove={() => validateUser({ userId: user.id_user, validated: true })}
                    onReject={() => validateUser({ userId: user.id_user, validated: false })}
                  />
                ))}
                {pendingUsers.items.length > 5 && (
                  <Button variant="link" className="w-full" onClick={() => navigate('/admin?tab=users')}>
                    {t('admin.pending.viewAll', { count: pendingUsers.items.length })}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>{t('admin.pending.noUsers', 'Aucun utilisateur en attente')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Œuvres en attente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {t('admin.pending.works', 'Œuvres en attente')}
              {pendingOeuvres?.items?.length > 0 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {pendingOeuvres.items.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {t('admin.pending.worksDesc', 'Œuvres soumises à valider')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPendingOeuvres ? (
              <LoadingSkeleton type="list" count={3} />
            ) : pendingOeuvres?.items?.length > 0 ? (
              <div className="space-y-3">
                {pendingOeuvres.items.slice(0, 5).map((oeuvre: any) => (
                  <PendingItem
                    key={oeuvre.id_oeuvre}
                    title={oeuvre.titre}
                    subtitle={oeuvre.auteur ? `${oeuvre.auteur.prenom} ${oeuvre.auteur.nom}` : oeuvre.type_oeuvre}
                    date={new Date(oeuvre.date_creation || oeuvre.created_at).toLocaleDateString('fr-FR')}
                    imageUrl={oeuvre.medias?.[0]?.url}
                    onApprove={() => validateOeuvre({ oeuvreId: oeuvre.id_oeuvre, validated: true })}
                    onReject={() => validateOeuvre({ oeuvreId: oeuvre.id_oeuvre, validated: false })}
                  />
                ))}
                {pendingOeuvres.items.length > 5 && (
                  <Button variant="link" className="w-full" onClick={() => navigate('/admin?tab=oeuvres')}>
                    {t('admin.pending.viewAllWorks', { count: pendingOeuvres.items.length })}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>{t('admin.pending.noWorks', 'Aucune œuvre en attente')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modération et activité */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* File de modération */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t('admin.moderation.title', 'Signalements')}
              {moderationQueue?.items?.length > 0 && (
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  {moderationQueue.items.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingModeration ? (
              <LoadingSkeleton type="list" count={3} />
            ) : moderationQueue?.items?.length > 0 ? (
              <div className="space-y-2">
                {moderationQueue.items.slice(0, 5).map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{item.entity_title || item.reason}</p>
                      <p className="text-xs text-muted-foreground">{item.type} - {item.motif || item.reason}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate('/admin?tab=moderation')}>
                      {t('admin.moderation.actions.process')}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>{t('admin.moderation.noReports', 'Aucun signalement en attente')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistiques rapides */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {t('admin.activity.title', 'Activité du jour')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('admin.activity.viewsToday')}</span>
                <span className="font-bold">{stats?.viewsToday || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('admin.activity.newUsers')}</span>
                <span className="font-bold">{stats?.newUsers || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('admin.activity.pendingWorks')}</span>
                <span className="font-bold text-yellow-600">{stats?.pendingOeuvres || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('admin.activity.openReports')}</span>
                <span className="font-bold text-red-600">{stats?.openReports || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOverview;
