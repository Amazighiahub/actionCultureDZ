/**
 * FormPageHeader - En-tête commun des pages de formulaire (ajouter un événement, une œuvre,
 * un artisanat, un service, une organisation, un site…) : même retour, même titre, même rythme.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CircleHelp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import SEOHead from '@/components/SEOHead';

interface FormPageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Libellé du lien de retour (« Retour », « Retour au tableau de bord »…) */
  backLabel: string;
  /** Destination du retour ; sans elle, onBack est appelé */
  backTo?: string;
  onBack?: () => void;
  /** Contenu à droite du titre (ex. « Connecté en tant que … ») */
  aside?: React.ReactNode;
  /** Page du guide qui explique ce formulaire (utils/lienGuide.lienGuidePour) : bouton « Aide » */
  aide?: string;
  className?: string;
}

const FormPageHeader: React.FC<FormPageHeaderProps> = ({ title, subtitle, backLabel, backTo, onBack, aside, aide, className = '' }) => {
  const { t } = useTranslation();
  const contenuRetour = (
    <>
      <ArrowLeft className="h-4 w-4 me-2 rtl:-scale-x-100" aria-hidden="true" />
      {backLabel}
    </>
  );
  return (
    <div className={`mb-8 ${className}`}>
      {/* Titre de l'onglet traduit ; page privée, jamais indexée */}
      {typeof title === 'string' && <SEOHead title={title} noindex />}
      {backTo ? (
        <Button variant="ghost" size="sm" className="-ms-3 mb-3 text-muted-foreground hover:text-foreground" asChild>
          <Link to={backTo}>{contenuRetour}</Link>
        </Button>
      ) : (
        <Button type="button" variant="ghost" size="sm" className="-ms-3 mb-3 text-muted-foreground hover:text-foreground" onClick={onBack}>
          {contenuRetour}
        </Button>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl md:text-4xl font-bold font-serif tracking-tight mb-0">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        {(aside || aide) && (
          <div className="flex flex-wrap items-center gap-3">
            {aside}
            {aide && (
              // Page statique (public/guide) : lien classique, ouvert dans un nouvel onglet pour garder le formulaire
              <Button variant="outline" size="sm" asChild>
                <a href={aide} target="_blank" rel="noopener">
                  <CircleHelp className="h-4 w-4 me-2" aria-hidden="true" />
                  {t('common.aide', 'Aide')}
                  <span className="sr-only"> {t('common.nouvelOnglet', '(nouvel onglet)')}</span>
                </a>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FormPageHeader;
