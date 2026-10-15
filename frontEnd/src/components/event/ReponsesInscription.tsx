/**
 * ReponsesInscription - Réponses d'un participant au formulaire d'inscription,
 * affichées pour l'organisateur (formulaire du type d'événement ou formulaire de base).
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList } from 'lucide-react';
import { useTranslateData } from '@/hooks/useTranslateData';
import { listerChamps, type ChampFormulaire, type ConfigInscription, type Reponses } from '@/utils/formulaireInscription';

interface ReponsesInscriptionProps {
  formulaire?: ConfigInscription | null;
  reponses?: Reponses | null;
}

const ReponsesInscription: React.FC<ReponsesInscriptionProps> = ({ formulaire, reponses }) => {
  const { t } = useTranslation();
  const { td } = useTranslateData();

  if (!reponses || Object.keys(reponses).length === 0) return null;

  // Valeurs enregistrées en français : on affiche le libellé de l'option dans la langue courante
  const afficher = (champ: ChampFormulaire, valeur: unknown): string => {
    const libelleOption = (v: string) => {
      const option = champ.options?.find((o) => o.valeur === v);
      return option ? td(option.label) : v;
    };
    if (Array.isArray(valeur)) return valeur.map((v) => libelleOption(String(v))).join(', ');
    if (champ.type === 'accord') return valeur === 'Oui' ? t('common.yes', 'Oui') : t('common.no', 'Non');
    return libelleOption(String(valeur));
  };

  const lignes: { cle: string; label: string; valeur: string }[] = formulaire
    ? listerChamps(formulaire)
      .filter((champ) => reponses[champ.cle] !== undefined && reponses[champ.cle] !== null)
      .map((champ) => ({ cle: champ.cle, label: td(champ.label), valeur: afficher(champ, reponses[champ.cle]) }))
    : [
      ...(reponses.nombre_personnes !== undefined ? [{
        cle: 'nombre_personnes',
        label: t('event.registration.numberOfPeople', 'Nombre de personnes'),
        valeur: String(reponses.nombre_personnes)
      }] : []),
      ...(reponses.commentaire ? [{
        cle: 'commentaire',
        label: t('event.registration.comment', 'Commentaire'),
        valeur: String(reponses.commentaire)
      }] : [])
    ];

  if (lignes.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border p-3">
      <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <ClipboardList className="h-4 w-4" aria-hidden="true" />
        {t('pro.participants.answers', 'Réponses au formulaire d\'inscription')}
      </h5>
      <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {lignes.map((ligne) => (
          <React.Fragment key={ligne.cle}>
            <dt className="text-muted-foreground">{ligne.label}</dt>
            <dd className="font-medium whitespace-pre-line break-words">{ligne.valeur}</dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
};

export default ReponsesInscription;
