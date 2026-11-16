/**
 * Bouton « Retirer » posé sur l'aperçu d'une photo avant l'envoi (2026-11-16, une seule version pour
 * tout le site). Avant : cinq copies, certaines visibles seulement au survol de la souris (donc
 * invisibles sur téléphone), d'autres de 20 px à peine, une sans nom pour les lecteurs d'écran.
 * Toujours visible, 28 px dessiné et une zone de toucher de 44 px, nom lisible.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

interface Props {
  onClick: () => void;
  /** Nom lu par les lecteurs d'écran (par défaut : « Retirer la photo ») */
  libelle?: string;
  /** « coin » : à cheval sur le coin de l'aperçu ; « dedans » : dans le coin, sur la photo */
  position?: 'coin' | 'dedans';
  disabled?: boolean;
}

const BoutonRetirerApercu: React.FC<Props> = ({ onClick, libelle, position = 'coin', disabled }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={libelle || t('common.retirerPhoto', 'Retirer la photo')}
      title={libelle || t('common.retirerPhoto', 'Retirer la photo')}
      className={`absolute z-10 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md
        transition-colors hover:bg-destructive/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring
        disabled:opacity-50 before:absolute before:-inset-2 before:content-['']
        ${position === 'coin' ? '-top-2 -end-2' : 'top-1.5 end-1.5'}`}
      data-testid="retirer-apercu"
    >
      <X className="h-4 w-4" aria-hidden="true" />
    </button>
  );
};

export default BoutonRetirerApercu;
