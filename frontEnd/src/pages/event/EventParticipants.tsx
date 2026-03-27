/**
 * EventParticipants - Liste publique des participants confirmés
 * Affiche les participants avec avatar, nom, rôle
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, User } from 'lucide-react';
import { LazyImage, EmptyState } from '@/components/shared';
import { useTranslateData } from '@/hooks/useTranslateData';
import type { PublicParticipant } from '@/services/evenement.service';

interface EventParticipantsProps {
  participants: PublicParticipant[];
  total: number;
}

const roleColors: Record<string, string> = {
  participant: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  benevole: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  staff: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

const EventParticipants: React.FC<EventParticipantsProps> = ({ participants, total }) => {
  const { t } = useTranslation();
  const { td } = useTranslateData();

  if (!participants || participants.length === 0) {
    return (
      <EmptyState
        type="users"
        title={t('event.participants.empty', 'Aucun participant pour le moment')}
        description={t('event.participants.emptyDesc', 'Soyez le premier à vous inscrire à cet événement !')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Résumé */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t('event.participants.title', 'Participants')}
            <Badge variant="secondary" className="ml-auto">
              {total} {t('event.participants.confirmed', 'confirmé(s)')}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Grille de participants */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {participants.map((p) => {
              const user = p.User;
              return (
                <div
                  key={user.id_user}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <LazyImage
                    src={user.photo_url || '/images/default-avatar.svg'}
                    alt={`${td(user.prenom)} ${td(user.nom)}`}
                    className="w-14 h-14 rounded-full"
                    aspectRatio="square"
                    fallback="/images/default-avatar.svg"
                  />
                  <div className="text-center min-w-0 w-full">
                    <p className="text-sm font-medium truncate">
                      {td(user.prenom)} {td(user.nom)}
                    </p>
                    {p.role_participation && p.role_participation !== 'participant' && (
                      <Badge
                        variant="secondary"
                        className={`text-xs mt-1 ${roleColors[p.role_participation] || ''}`}
                      >
                        {t(`event.participants.roles.${p.role_participation}`, p.role_participation)}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EventParticipants;
