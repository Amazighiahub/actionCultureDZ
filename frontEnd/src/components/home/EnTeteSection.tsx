/**
 * EnTeteSection — en-tête des sections de la page d'accueil, style magazine :
 * surtitre en petites capitales, titre en Playfair, phrase d'accroche, lien « Tout voir » à droite.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface Props {
  surtitre: string;
  titre: string;
  accroche?: string;
  lien?: { to: string; libelle: string };
  /** id du titre, pour aria-labelledby de la section */
  id: string;
}

const EnTeteSection: React.FC<Props> = ({ surtitre, titre, accroche, lien, id }) => (
  <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 mb-8 pb-4 border-b">
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-2">{surtitre}</p>
      <h2 id={id} className="font-serif text-3xl lg:text-4xl font-bold tracking-tight">{titre}</h2>
      {accroche && <p className="mt-2 text-muted-foreground">{accroche}</p>}
    </div>
    {lien && (
      <Link to={lien.to} className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline underline-offset-4">
        {lien.libelle}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
      </Link>
    )}
  </div>
);

export default EnTeteSection;
