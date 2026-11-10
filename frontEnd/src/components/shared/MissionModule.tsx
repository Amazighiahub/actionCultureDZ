/**
 * « À quoi sert cette page ? » : deux phrases en haut de chaque grande partie du site (œuvres,
 * événements, patrimoine, artisanat), à lire ou à écouter. (La page Professionnels n'a que sa recherche.) On peut le fermer : le
 * navigateur s'en souvient (si le stockage n'est pas disponible, l'encadré revient simplement).
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbulb, X } from 'lucide-react';
import LireAVoixHaute, { type LangueLue } from '@/components/shared/LireAVoixHaute';

export type ModuleMission = 'oeuvres' | 'evenements' | 'patrimoine' | 'artisanat';

const TEXTES_PAR_DEFAUT: Record<ModuleMission, string> = {
  oeuvres: 'Ici, les livres, films, musiques, arts et créations d’Algérie. Chaque œuvre a sa page : photos, résumé, extrait, et vous pouvez la commander directement à son auteur. Tala DZ ne prend aucune commission.',
  evenements: 'Festivals, expositions, conférences et spectacles partout en Algérie. Inscrivez-vous en un clic et recevez un rappel avant le jour J.',
  patrimoine: 'Les lieux et l’histoire de l’Algérie. Lisez ou écoutez l’histoire de chaque lieu, et préparez votre visite avec le planificateur intelligent.',
  artisanat: 'Le savoir-faire des artisans algériens : poterie, tapis, bijoux, vannerie… Découvrez leurs créations et commandez-les directement à l’artisan.',
};

const cle = (module: ModuleMission) => `taladz-mission-fermee-${module}`;

const lireFerme = (module: ModuleMission): boolean => {
  try { return localStorage.getItem(cle(module)) === '1'; } catch { return false; }
};

const MissionModule: React.FC<{ module: ModuleMission }> = ({ module }) => {
  const { t, i18n } = useTranslation();
  const [ferme, setFerme] = useState(() => lireFerme(module));
  if (ferme) return null;

  const texte = t(`mission.${module}`, TEXTES_PAR_DEFAUT[module]);
  const code = (i18n.language || 'fr').slice(0, 2);
  const langue = (['fr', 'ar', 'en'].includes(code) ? code : 'fr') as LangueLue;

  const fermer = () => {
    setFerme(true);
    try { localStorage.setItem(cle(module), '1'); } catch { /* stockage indisponible : rien à garder */ }
  };

  return (
    <aside className="relative mb-8 rounded-xl border border-primary/30 bg-primary/5 p-4 pe-12 text-start" aria-label={t('mission.titre', 'À quoi sert cette page ?')}>
      <p className="flex items-center gap-2 font-semibold mb-1">
        <Lightbulb className="h-4 w-4 text-primary" aria-hidden="true" />
        {t('mission.titre', 'À quoi sert cette page ?')}
      </p>
      <p className="text-sm text-muted-foreground">{texte}</p>
      <LireAVoixHaute className="mt-2 border-0 bg-transparent p-0" compact textes={{ [langue]: texte }} />
      <button type="button" onClick={fermer}
        className="absolute top-2 end-2 inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted"
        aria-label={t('mission.fermer', 'Fermer')}>
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </aside>
  );
};

export default MissionModule;
