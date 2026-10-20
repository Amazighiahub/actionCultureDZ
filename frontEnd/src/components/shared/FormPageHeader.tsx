/**
 * FormPageHeader - En-tête commun des pages de formulaire (ajouter un événement, une œuvre,
 * un artisanat, un service, une organisation, un site…) : même retour, même titre, même rythme.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  className?: string;
}

const FormPageHeader: React.FC<FormPageHeaderProps> = ({ title, subtitle, backLabel, backTo, onBack, aside, className = '' }) => {
  const contenuRetour = (
    <>
      <ArrowLeft className="h-4 w-4 me-2 rtl:-scale-x-100" aria-hidden="true" />
      {backLabel}
    </>
  );
  return (
    <div className={`mb-8 ${className}`}>
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
        {aside}
      </div>
    </div>
  );
};

export default FormPageHeader;
