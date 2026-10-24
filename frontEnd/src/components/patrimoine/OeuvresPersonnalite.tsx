/**
 * OeuvresPersonnalite — œuvres publiées d'une personnalité (poèmes, tableaux, chansons…).
 * Pour en ajouter, on passe par le formulaire existant « Ajouter une œuvre », qui sait déjà
 * relier une œuvre à un intervenant (cette personnalité) avec son rôle.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { httpClient } from '@/services/httpClient';
import { texteLangue } from '@/utils/programmeIntervenants';

type Texte = string | Record<string, string | undefined> | null | undefined;
interface OeuvreCourte { id_oeuvre: number; titre: Texte; annee_creation?: number | null }

interface Props {
  idIntervenant: number;
  /** Bouton « Ajouter une œuvre » (professionnels et administration) */
  peutAjouter: boolean;
}

const OeuvresPersonnalite: React.FC<Props> = ({ idIntervenant, peutAjouter }) => {
  const { t, i18n } = useTranslation();
  const [oeuvres, setOeuvres] = useState<OeuvreCourte[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let actif = true;
    setChargement(true);
    httpClient.get<{ oeuvres: OeuvreCourte[] }>(`/intervenants/${idIntervenant}/oeuvres`, { limit: 50 })
      .then(res => { if (actif) setOeuvres(res.success && res.data?.oeuvres ? res.data.oeuvres : []); })
      .catch(() => { if (actif) setOeuvres([]); })
      .finally(() => { if (actif) setChargement(false); });
    return () => { actif = false; };
  }, [idIntervenant]);

  if (!chargement && oeuvres.length === 0 && !peutAjouter) return null;

  return (
    <div className="space-y-3">
      <h4 className="font-medium flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />{t('personnalites.oeuvres', 'Ses œuvres')}</h4>
      {chargement ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-label={t('common.loading', 'Chargement')} />
      ) : oeuvres.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('personnalites.aucuneOeuvre', 'Aucune œuvre sur Tala DZ pour l’instant.')}</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {oeuvres.map(o => (
            <li key={o.id_oeuvre}>
              <Link to={`/oeuvres/${o.id_oeuvre}`} className="block px-3 py-2 text-sm hover:bg-muted">
                {texteLangue(o.titre, i18n.language)}
                {o.annee_creation ? <span className="text-muted-foreground"> · {o.annee_creation}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {peutAjouter && (
        <div className="space-y-1">
          <Button type="button" size="sm" variant="outline" asChild>
            <Link to="/ajouter-oeuvre"><Plus className="h-4 w-4 me-1" aria-hidden="true" />{t('personnalites.ajouterOeuvre', 'Ajouter une de ses œuvres')}</Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            {t('personnalites.ajouterOeuvreAide', 'Dans le formulaire, ajoutez cette personnalité parmi les intervenants de l’œuvre (recherche par nom) : l’œuvre apparaîtra ici une fois publiée.')}
          </p>
        </div>
      )}
    </div>
  );
};

export default OeuvresPersonnalite;
