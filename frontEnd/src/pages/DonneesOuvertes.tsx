/**
 * Données ouvertes (audit V11 OUT-18, licence CC BY-SA 4.0 choisie par la responsable) : la liste
 * publique des lieux du patrimoine, à télécharger en GeoJSON (cartes, OpenStreetMap, SIG) ou en CSV
 * (tableur). Ni photos, ni voix, ni textes, ni rien sur les personnes.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Map as IconeCarte, Table, Scale } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getApiUrl } from '@/config/api';

const CHAMPS = ['id', 'nom_fr, nom_ar, nom_en, nom_tz_ltn, nom_tz_tfng', 'type', 'commune, wilaya, code_wilaya', 'latitude, longitude', 'site_parent', 'url', 'mis_a_jour'];

const DonneesOuvertes: React.FC = () => {
  const { t } = useTranslation();
  const titre = t('donneesOuvertes.titre', 'Données ouvertes');
  const description = t('donneesOuvertes.description', 'La liste des lieux du patrimoine de Tala DZ, libre de réutilisation sous licence CC BY-SA 4.0.');
  return (
    <>
      <SEOHead title={titre} description={description} />
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{titre}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>

        <Card>
          <CardHeader><CardTitle as="h2" className="text-xl">{t('donneesOuvertes.telecharger', 'Télécharger les lieux')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{t('donneesOuvertes.contenu', 'Tous les lieux publiés : leur nom dans chaque langue, leur type, leur commune et leur wilaya, leurs coordonnées et l’adresse de leur fiche. Mis à jour en continu.')}</p>
            <div className="flex flex-wrap gap-3">
              {/* Fichiers servis par l'API : liens classiques (téléchargement) */}
              <Button asChild>
                <a href={getApiUrl('/patrimoine/donnees-ouvertes.geojson')} download="taladz-lieux.geojson">
                  <IconeCarte className="h-4 w-4 me-2" aria-hidden="true" />GeoJSON
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={getApiUrl('/patrimoine/donnees-ouvertes.csv')} download="taladz-lieux.csv">
                  <Table className="h-4 w-4 me-2" aria-hidden="true" />CSV
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('donneesOuvertes.formats', 'GeoJSON : pour les cartes, OpenStreetMap et les logiciels de SIG. CSV : pour un tableur (LibreOffice, Excel).')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2 text-xl">
              <Scale className="h-5 w-5" aria-hidden="true" />{t('donneesOuvertes.licenceTitre', 'Licence : CC BY-SA 4.0')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{t('donneesOuvertes.licence1', 'Vous pouvez copier, modifier et republier ces données, même pour un usage commercial, à deux conditions :')}</p>
            <ul className="list-disc ps-5 space-y-1">
              <li>{t('donneesOuvertes.attribution', 'citer la source : « Tala DZ (taladz.com), contributeurs de Tala DZ » ;')}</li>
              <li>{t('donneesOuvertes.partage', 'partager vos données dérivées sous la même licence.')}</li>
            </ul>
            <p>
              <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                {t('donneesOuvertes.lireLicence', 'Lire la licence')}
              </a>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle as="h2" className="text-xl">{t('donneesOuvertes.champsTitre', 'Ce que contiennent les fichiers')}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="grid gap-1 sm:grid-cols-2 font-mono text-xs" dir="ltr">
              {CHAMPS.map((c) => <li key={c}>{c}</li>)}
            </ul>
            <p className="text-muted-foreground">
              {t('donneesOuvertes.exclus', 'Ne sont pas inclus : les photos, les voix enregistrées, les textes et articles (qui restent à leurs auteurs), et rien sur les personnes qui ont ajouté les lieux.')}
            </p>
          </CardContent>
        </Card>

        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Download className="h-4 w-4" aria-hidden="true" />
          {t('donneesOuvertes.contact', 'Une erreur dans les données, un projet de réutilisation ? Écrivez-nous à contact@taladz.com.')}
        </p>
      </main>
      <Footer />
    </>
  );
};

export default DonneesOuvertes;
