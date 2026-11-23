/**
 * Onglet « Mon portfolio » de l'espace personnel des professionnels (2026-11-23). Sur le conseil d'une
 * écrivaine : le profil (informations personnelles, métiers, biographie) et le portfolio sont séparés.
 * Ici : la page publique, les œuvres, le site web et les réseaux, les articles de presse et liens
 * (rattachés au portfolio ou à une œuvre précise).
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PagePubliqueCard from '@/components/user/PagePubliqueCard';
import SiteEtReseauxCard from '@/components/pro/SiteEtReseauxCard';
import GestionLiens from '@/components/pro/GestionLiens';
import { professionnelPath } from '@/utils/slug';
import { getLocalizedText } from '@/utils/getLocalizedText';

interface Props {
  user: { id_user: number; prenom?: unknown; nom?: unknown; email_public?: boolean; telephone_public?: boolean };
}

export default function OngletPortfolio({ user }: Props) {
  const { t } = useTranslation();
  const lienPublic = professionnelPath(user.id_user, getLocalizedText(user.prenom as never), getLocalizedText(user.nom as never));
  return (
    <Card className="p-8">
      <h2 className="text-2xl font-semibold mb-2 font-serif">{t('portfolio.onglet.titre', 'Mon portfolio')}</h2>
      <p className="text-sm text-muted-foreground mb-6">
        {t('portfolio.onglet.intro', 'Ce que le public voit de votre travail : vos œuvres, vos réseaux et ce que la presse dit de vous. Vos informations personnelles et votre biographie sont dans « Mon profil ».')}
      </p>

      <PagePubliqueCard user={user} />

      <section className="mt-8 pt-6 border-t" aria-labelledby="portfolio-oeuvres-titre">
        <h3 id="portfolio-oeuvres-titre" className="text-lg font-semibold mb-1">{t('portfolio.onglet.oeuvres', 'Mes œuvres')}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t('portfolio.onglet.oeuvresAide', 'Vos œuvres, articles, artisanat et événements publiés apparaissent sur votre portfolio. Vous les ajoutez et les modifiez depuis votre espace professionnel.')}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm"><Link to="/dashboard-pro"><BookOpen className="h-4 w-4 me-2" aria-hidden="true" />{t('portfolio.onglet.gerer', 'Gérer mes œuvres')}</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to={lienPublic}><ExternalLink className="h-4 w-4 me-2" aria-hidden="true" />{t('portfolio.onglet.voir', 'Voir mon portfolio public')}</Link></Button>
        </div>
      </section>

      <SiteEtReseauxCard />
      <GestionLiens />
    </Card>
  );
}
