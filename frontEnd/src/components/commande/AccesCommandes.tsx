/**
 * Tableau de bord du professionnel : accès à « Mes commandes », avec le nombre de ventes à traiter
 * (paiement à confirmer ou envoi à faire).
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { commandeService } from '@/services/commande.service';

const AccesCommandes: React.FC = () => {
  const { t } = useTranslation();
  const [aTraiter, setATraiter] = useState(0);
  useEffect(() => {
    commandeService.ventesATraiter().then((r) => { if (r?.success && r.data) setATraiter(r.data.total); }).catch(() => {});
  }, []);
  return (
    <Button asChild variant={aTraiter ? 'default' : 'outline'} className="mb-6">
      <Link to="/mes-commandes">
        <ShoppingBag className="h-4 w-4 me-2" aria-hidden="true" />
        {t('commande.mesCommandes', 'Mes commandes')}
        {aTraiter > 0 && ` · ${t('commande.aTraiter', '{{count}} à traiter', { count: aTraiter })}`}
      </Link>
    </Button>
  );
};

export default AccesCommandes;
