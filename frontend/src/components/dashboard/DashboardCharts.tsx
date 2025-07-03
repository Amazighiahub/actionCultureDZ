// components/dashboard/DashboardCharts.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, Calendar, BookOpen } from 'lucide-react';import { useTranslation } from "react-i18next";

interface DashboardChartsProps {
  stats: any;
  period: 'day' | 'week' | 'month' | 'year';
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ stats, period }) => {const { t } = useTranslation();
  // Couleurs pour les graphiques
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // Formatter les données pour les graphiques
  const formatChartData = (data: any) => {
    if (!data) return [];

    // Pour les graphiques temporels
    if (data.users_by_day) {
      return data.users_by_day.map((item: any) => ({
        date: new Date(item.date).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short'
        }),
        valeur: item.count
      }));
    }

    // Pour les graphiques par type
    if (data.content_by_type) {
      const entries = Object.entries(data.content_by_type);
      let total = 0;

      // Calculer le total en premier
      for (const [, value] of entries) {
        if (typeof value === 'number') {
          total += value;
        }
      }

      // Puis mapper les données
      return entries.map(([type, count]) => {
        const countNum = typeof count === 'number' ? count : 0;
        return {
          name: type.charAt(0).toUpperCase() + type.slice(1),
          type: type.charAt(0).toUpperCase() + type.slice(1),
          count: countNum,
          pourcentage: total > 0 ? Math.round(countNum / total * 100) : 0
        };
      });
    }

    return [];
  };

  // Graphique d'évolution temporelle
  const TemporalChart = ({ data, title, color = '#8884d8' }: any) =>
  <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
            dataKey="date"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12} />

            <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12} />

            <Tooltip
            formatter={(value: number, name: string) => [`${value} items`, name]}
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))'
            }} />

            <Line
            type="monotone"
            dataKey="valeur"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color }} />

          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>;


  // Graphique de répartition
  const DistributionChart = ({ data, title }: any) =>
  <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ pourcentage }) => `${pourcentage}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="count">

              {data.map((entry: any, index: number) =>
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            )}
            </Pie>
            <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))'
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }} />

            <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value: string) => <span className="text-sm">{value}</span>} />

          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>;


  // Carte de métrique avec tendance
  const MetricCard = ({ title, value, trend, icon: Icon, color }: any) =>
  <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {trend !== undefined &&
          <div className="flex items-center mt-2">
                {trend > 0 ?
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400 mr-1" /> :

            <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400 mr-1" />
            }
                <span className={trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {Math.abs(trend)}%
                </span>
                <span className="text-xs text-muted-foreground ml-1">{t("dashboard_dashboardcharts.priode_prcdente")}

            </span>
              </div>
          }
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>;


  // Heatmap d'activité
  const ActivityHeatmap = ({ data }: any) => {const { t } = useTranslation();
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const getIntensity = (value: number, max: number) => {
      const ratio = value / max;
      if (ratio > 0.8) return 'bg-green-600 dark:bg-green-500';
      if (ratio > 0.6) return 'bg-green-500 dark:bg-green-600';
      if (ratio > 0.4) return 'bg-green-400 dark:bg-green-700';
      if (ratio > 0.2) return 'bg-green-300 dark:bg-green-800';
      if (ratio > 0) return 'bg-green-200 dark:bg-green-900';
      return 'bg-gray-100 dark:bg-gray-800';
    };

    const maxValue = Math.max(...(data?.activity_heatmap?.map((d: any) => d.value) || [1]));

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("dashboard_dashboardcharts.activit_par_heure")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="grid gap-1 text-xs min-w-[600px]" style={{ gridTemplateColumns: 'auto repeat(24, 1fr)' }}>
              <div className="col-span-1"></div>
              {hours.map((hour) =>
              <div key={hour} className="text-center text-muted-foreground">
                  {hour}
                </div>
              )}
              
              {days.map((day, dayIndex) =>
              <React.Fragment key={day}>
                  <div className="flex items-center justify-end pr-2 text-muted-foreground">
                    {day}
                  </div>
                  {hours.map((hour) => {
                  const dataPoint = data?.activity_heatmap?.find(
                    (d: any) => d.day === dayIndex && d.hour === hour
                  );
                  const value = dataPoint?.value || 0;

                  return (
                    <div
                      key={`${day}-${hour}`}
                      className={`aspect-square rounded-sm ${getIntensity(value, maxValue)} hover:ring-2 hover:ring-offset-1 hover:ring-primary cursor-pointer transition-all`}
                      title={`${day} ${hour}h: ${value} actions`} />);


                })}
                </React.Fragment>
              )}
            </div>
          </div>
        </CardContent>
      </Card>);

  };

  return (
    <div className="space-y-6">
      {/* Métriques principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={t("dashboard_dashboardcharts.title_nouveaux_utilisateurs")}
          value={stats?.stats?.new_users || 0}
          trend={15}
          icon={Users}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />

        <MetricCard
          title={t("dashboard_dashboardcharts.title_contenu")}
          value={stats?.stats?.total_content || 0}
          trend={-5}
          icon={BookOpen}
          color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />

        <MetricCard
          title={t("dashboard_dashboardcharts.title_vnements_actifs")}
          value={stats?.stats?.active_events || 0}
          trend={20}
          icon={Calendar}
          color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />

        <MetricCard
          title={t("dashboard_dashboardcharts.title_taux_dengagement")}
          value="68%"
          trend={8}
          icon={TrendingUp}
          color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />

      </div>

      {/* Graphiques temporels */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TemporalChart
          data={formatChartData(stats?.charts)}
          title={`Évolution des utilisateurs (${period})`}
          color="#8884d8" />

        
        <DistributionChart
          data={formatChartData({ content_by_type: stats?.charts?.content_by_type })}
          title={t("dashboard_dashboardcharts.title_rpartition_contenu_par")} />

      </div>

      {/* Heatmap d'activité */}
      <ActivityHeatmap data={stats?.charts} />

      {/* Tableau comparatif */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("dashboard_dashboardcharts.comparaison_avec_priode")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
            { label: t("dashboard_dashboardcharts.label_utilisateurs_actifs"), current: 1250, previous: 980, unit: '' },
            { label: t("dashboard_dashboardcharts.label_temps_moyen_session"), current: 12.5, previous: 10.2, unit: 'min' },
            { label: t("dashboard_dashboardcharts.label_pages_vues"), current: 45600, previous: 38900, unit: '' },
            { label: t("dashboard_dashboardcharts.label_taux_rebond"), current: 32, previous: 38, unit: '%', inverse: true }].
            map((metric, index) => {
              const change = (metric.current - metric.previous) / metric.previous * 100;
              const isPositive = metric.inverse ? change < 0 : change > 0;

              return (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{metric.label}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {metric.previous.toLocaleString()}{metric.unit}
                    </span>
                    <span className="text-sm font-semibold">
                      {metric.current.toLocaleString()}{metric.unit}
                    </span>
                    <div className={`flex items-center ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {isPositive ?
                      <TrendingUp className="h-4 w-4 mr-1" /> :

                      <TrendingDown className="h-4 w-4 mr-1" />
                      }
                      <span className="text-sm font-medium">
                        {Math.abs(change).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>);

            })}
          </div>
        </CardContent>
      </Card>
    </div>);

};