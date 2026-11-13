/**
 * Carte chargée à la demande quand le téléphone économise ses données (audit V11 OUT-11) : mode
 * « économie de données » du navigateur, ou connexion très lente (2G). Une carte télécharge des
 * dizaines d'images de fond ; ici, un bouton « Afficher la carte » la remplace jusqu'au toucher.
 * Sans ces signaux, la carte s'affiche comme avant. Le code de la carte (Leaflet) n'est pas
 * téléchargé non plus tant qu'elle n'est pas demandée (les enfants ne sont pas rendus).
 */
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Map as IconeCarte } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Connexion = { saveData?: boolean; effectiveType?: string };

/** Vrai si le navigateur demande d'économiser les données ou si la connexion est en 2G */
export function economieDonneesActive(): boolean {
  if (typeof navigator === 'undefined') return false;
  const c = (navigator as Navigator & { connection?: Connexion }).connection;
  return !!c && (c.saveData === true || c.effectiveType === '2g' || c.effectiveType === 'slow-2g');
}

export default function CarteALaDemande({ children, hauteur = 'h-64' }: { children: ReactNode; hauteur?: string }) {
  const { t } = useTranslation();
  const [montrer, setMontrer] = useState(() => !economieDonneesActive());
  if (montrer) return <>{children}</>;
  return (
    <div className={`${hauteur} flex flex-col items-center justify-center gap-3 rounded-lg border bg-muted/40 p-4 text-center`}>
      <IconeCarte className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <p className="max-w-sm text-sm text-muted-foreground">
        {t('carte.economie', 'Votre téléphone économise ses données : la carte se charge seulement si vous la demandez.')}
      </p>
      <Button variant="outline" onClick={() => setMontrer(true)}>{t('carte.afficher', 'Afficher la carte')}</Button>
    </div>
  );
}
