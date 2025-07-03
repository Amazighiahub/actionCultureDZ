// components/dashboard/ActivityTimeline.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  UserPlus,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Trash,
  RefreshCw,
  Activity } from
'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { socketService } from '@/services/socketService';
import { cn } from '@/lib/utils';import { useTranslation } from "react-i18next";

interface ActivityItem {
  id: string;
  type: 'user_action' | 'content_action' | 'moderation' | 'system';
  action: string;
  user: {
    id: number;
    nom: string;
    prenom: string;
    avatar?: string;
  };
  target?: {
    type: string;
    id: number;
    name: string;
  };
  metadata?: any;
  timestamp: string;
}

interface ActivityTimelineProps {
  initialActivities?: ActivityItem[];
  maxItems?: number;
  autoRefresh?: boolean;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  initialActivities = [],
  maxItems = 50,
  autoRefresh = true
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);
  const [isLive, setIsLive] = useState(autoRefresh);
  const [filter, setFilter] = useState<string>('all');

  // Se connecter aux événements WebSocket
  const { t } = useTranslation();useEffect(() => {
    if (!isLive || !socketService.isConnected) return;

    const handleNewActivity = (data: any) => {
      const newActivity: ActivityItem = {
        id: `activity-${Date.now()}-${Math.random()}`,
        type: data.type || 'system',
        action: data.action,
        user: data.user,
        target: data.target,
        metadata: data.metadata,
        timestamp: data.timestamp || new Date().toISOString()
      };

      setActivities((prev) => {
        const updated = [newActivity, ...prev];
        return updated.slice(0, maxItems);
      });
    };

    // Écouter différents types d'événements
    socketService.on('admin:activity', handleNewActivity);
    socketService.on('admin:new_user', (data) => {
      handleNewActivity({
        type: 'user_action',
        action: 'user_registered',
        user: data.user,
        timestamp: new Date().toISOString()
      });
    });
    socketService.on('admin:content_created', (data) => {
      handleNewActivity({
        type: 'content_action',
        action: 'content_created',
        user: data.user,
        target: data.content,
        timestamp: new Date().toISOString()
      });
    });

    return () => {
      socketService.off('admin:activity', handleNewActivity);
      socketService.off('admin:new_user');
      socketService.off('admin:content_created');
    };
  }, [isLive, maxItems]);

  // Icône selon le type d'action
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'user_registered':
      case 'user_validated':
        return <UserPlus className="h-4 w-4" />;
      case 'user_rejected':
      case 'user_deleted':
        return <XCircle className="h-4 w-4" />;
      case 'content_created':
      case 'content_published':
        return <FileText className="h-4 w-4" />;
      case 'event_created':
        return <Calendar className="h-4 w-4" />;
      case 'moderation_action':
        return <AlertTriangle className="h-4 w-4" />;
      case 'content_approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'content_edited':
        return <Edit className="h-4 w-4" />;
      case 'content_deleted':
        return <Trash className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // Couleur selon le type
  const getActionColor = (type: string, action: string) => {
    if (action.includes('delete') || action.includes('reject')) return 'destructive';
    if (action.includes('approve') || action.includes('validate')) return 'success';
    if (action.includes('edit') || action.includes('update')) return 'secondary';
    if (type === 'moderation') return 'warning';
    return 'default';
  };

  // Formater le message d'activité
  const formatActivityMessage = (activity: ActivityItem) => {
    const userName = `${activity.user.prenom} ${activity.user.nom}`;

    switch (activity.action) {
      case 'user_registered':
        return `${userName} s'est inscrit`;
      case 'user_validated':
        return `${userName} a été validé`;
      case 'user_rejected':
        return `${userName} a été rejeté`;
      case 'content_created':
        return `${userName} a créé ${activity.target?.name || 'un contenu'}`;
      case 'content_approved':
        return `${userName} a approuvé ${activity.target?.name || 'un contenu'}`;
      case 'event_created':
        return `${userName} a créé l'événement "${activity.target?.name}"`;
      default:
        return `${userName} - ${activity.action.replace(/_/g, ' ')}`;
    }
  };

  // Filtrer les activités
  const filteredActivities = activities.filter((activity) => {
    if (filter === 'all') return true;
    return activity.type === filter;
  });

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />{t("dashboard_activitytimeline.activit_temps_rel")}

            {isLive &&
            <div className="relative">
                <Badge variant="default" className="animate-pulse bg-green-600 text-white hover:bg-green-600">{t("dashboard_activitytimeline.live")}

              </Badge>
                <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-green-600" />
              </div>
            }
          </CardTitle>
          <Button
            variant={isLive ? "secondary" : "outline"}
            size="sm"
            onClick={() => setIsLive(!isLive)}>

            <RefreshCw className={cn("h-4 w-4 mr-1", isLive && "animate-spin")} />
            {isLive ? 'Pause' : 'Reprendre'}
          </Button>
        </div>
        
        {/* Filtres */}
        <div className="flex gap-2 mt-4">
          <Badge
            variant={filter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('all')}>{t("dashboard_activitytimeline.tout")}


          </Badge>
          <Badge
            variant={filter === 'user_action' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('user_action')}>{t("dashboard_activitytimeline.utilisateurs")}


          </Badge>
          <Badge
            variant={filter === 'content_action' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('content_action')}>{t("dashboard_activitytimeline.contenu")}


          </Badge>
          <Badge
            variant={filter === 'moderation' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('moderation')}>{t("dashboard_activitytimeline.modration")}


          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {filteredActivities.length === 0 ?
            <p className="text-center text-muted-foreground py-8">{t("dashboard_activitytimeline.aucune_activit_afficher")}

            </p> :

            filteredActivities.map((activity) =>
            <div
              key={activity.id}
              className="flex gap-3 items-start p-3 rounded-lg hover:bg-muted/50 transition-colors">

                  {/* Avatar */}
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={activity.user.avatar} />
                    <AvatarFallback>
                      {activity.user.prenom[0]}{activity.user.nom[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Contenu */}
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">{formatActivityMessage(activity)}</span>
                      {activity.target &&
                  <span className="text-muted-foreground">
                          {' '}• {activity.target.type}
                        </span>
                  }
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.timestamp), {
                    addSuffix: true,
                    locale: fr
                  })}
                    </p>
                  </div>
                  
                  {/* Icône d'action */}
                  <div className={cn(
                "p-1.5 rounded",
                getActionColor(activity.type, activity.action) === 'destructive' && "bg-red-100 text-red-600",
                getActionColor(activity.type, activity.action) === 'success' && "bg-green-100 text-green-600",
                getActionColor(activity.type, activity.action) === 'warning' && "bg-yellow-100 text-yellow-600",
                getActionColor(activity.type, activity.action) === 'secondary' && "bg-secondary text-secondary-foreground",
                getActionColor(activity.type, activity.action) === 'default' && "bg-gray-100 text-gray-600"
              )}>
                    {getActionIcon(activity.action)}
                  </div>
                </div>
            )
            }
          </div>
        </ScrollArea>
      </CardContent>
    </Card>);

};