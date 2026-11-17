/**
 * Création d'un événement : prévient l'organisateur qui a déjà un événement aux mêmes dates qu'il
 * voulait peut-être y ajouter une activité (2026-11-17 : un organisateur avait créé un second
 * événement au lieu d'ajouter une activité au programme du premier). Simple conseil, rien n'est bloqué.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { httpClient } from '@/services/httpClient';
import { API_ENDPOINTS } from '@/config/api';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { partiesEvenement } from '@/utils/dateHeureEvenement';

interface MonEvenement { id_evenement: number; nom_evenement: unknown; date_debut?: string | null; date_fin?: string | null; statut?: string }

/** Jours (AAAA-MM-JJ) qui se chevauchent ; un événement sans fin dure son premier jour */
export function chevauche(debut: string, fin: string, e: MonEvenement): boolean {
  const eDebut = partiesEvenement(e.date_debut).date;
  if (!debut || !eDebut) return false;
  const eFin = partiesEvenement(e.date_fin).date || eDebut;
  return debut <= eFin && (fin || debut) >= eDebut;
}

const EvenementDejaAuxDates: React.FC<{ dateDebut: string; dateFin: string }> = ({ dateDebut, dateFin }) => {
  const { t, i18n } = useTranslation();
  const [mesEvenements, setMesEvenements] = useState<MonEvenement[]>([]);

  useEffect(() => {
    let actif = true;
    // Simple conseil : un échec (adresse absente, réponse inattendue) ne doit jamais gêner la saisie
    const adresse = API_ENDPOINTS.professionnel?.evenements;
    if (!adresse) return;
    Promise.resolve()
      .then(() => httpClient.get<{ evenements?: MonEvenement[] }>(adresse, { limit: 50 }))
      .then((res) => { if (actif && res?.success) setMesEvenements(Array.isArray(res.data?.evenements) ? res.data.evenements : []); })
      .catch(() => {});
    return () => { actif = false; };
  }, []);

  const memesDates = useMemo(
    () => mesEvenements.filter((e) => e.statut !== 'annule' && chevauche(dateDebut, dateFin, e)).slice(0, 3),
    [mesEvenements, dateDebut, dateFin]
  );
  if (!memesDates.length) return null;

  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertDescription className="space-y-1">
        <p>{t('events.create.dejaAuxDates', 'Vous avez déjà un événement à ces dates. S’il s’agit d’une partie de cet événement (un jour, un atelier, une conférence…), ajoutez plutôt une activité à son programme :')}</p>
        <ul className="list-disc ps-5">
          {memesDates.map((e) => (
            <li key={e.id_evenement}>
              <Link className="underline font-medium" to={`/dashboard-pro?gerer=${e.id_evenement}&onglet=programmes`}>
                {t('events.create.ajouterActiviteA', {
                  nom: getLocalizedText(e.nom_evenement, i18n.language, t('common.unnamed', 'Sans nom')),
                  defaultValue: 'Ajouter une activité à « {{nom}} »'
                })}
              </Link>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
};

export default EvenementDejaAuxDates;
