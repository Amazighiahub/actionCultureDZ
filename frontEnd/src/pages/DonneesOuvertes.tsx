/**
 * Données ouvertes (/donnees-ouvertes), 2026-11-20 : textes et voix en tamazight partagés librement par leurs auteurs,
 * relus par la modération, sous licence CC BY-SA 4.0. Pour les universités, laboratoires et projets de traduction
 * ou de reconnaissance de la parole. Téléchargement en JSON (textes, traductions, audios) ou en CSV.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Database, Download, FileText, Languages, Mic, Scale } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { httpClient } from '@/services/httpClient';
import { API_BASE_URL } from '@/config/env';
import { LICENCE_URL } from '@/utils/tamazight';

interface Jeu { textes: unknown[]; voix: unknown[]; genere_le: string }

const DonneesOuvertes: React.FC = () => {
  const { t } = useTranslation();
  const [jeu, setJeu] = useState<Jeu | null>(null);
  const base = String(API_BASE_URL).replace(/\/$/, '');

  useEffect(() => {
    httpClient.get<Jeu>('/tamazight/donnees-ouvertes.json')
      .then((r) => { const d = (r as unknown as { textes?: unknown[] }).textes ? (r as unknown as Jeu) : r.data; if (d) setJeu(d); })
      .catch(() => {});
  }, []);

  const usages = [
    { icone: Languages, titre: t('donneesOuvertes.usages.traduction', 'Traduction'), texte: t('donneesOuvertes.usages.traductionTexte', 'Textes en tamazight avec leur traduction en arabe ou en français, écrite par des personnes.') },
    { icone: Mic, titre: t('donneesOuvertes.usages.parole', 'Reconnaissance de la parole'), texte: t('donneesOuvertes.usages.paroleTexte', 'Un texte et son enregistrement lu à voix haute, avec l’accord de la personne.') },
    { icone: FileText, titre: t('donneesOuvertes.usages.langue', 'Étude des parlers'), texte: t('donneesOuvertes.usages.langueTexte', 'Variante (kabyle, chaoui, mozabite…) et écriture (tifinagh ou latine) indiquées pour chaque texte.') },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={t('donneesOuvertes.titre', 'Données ouvertes : textes et voix en tamazight')}
        description={t('donneesOuvertes.description', 'Textes, traductions et enregistrements en tamazight partagés librement sous licence CC BY-SA 4.0, pour la recherche sur la traduction et la reconnaissance de la parole.')}
        type="website"
        keywords={['données ouvertes', 'open data', 'tamazight', 'corpus', 'CC BY-SA', 'traduction automatique', 'reconnaissance vocale']}
      />
      <Header />
      <main className="container max-w-5xl py-8">
        <div className="mb-8">
          <h1 className="mb-3 flex items-center gap-3 font-serif text-4xl font-bold"><Database className="h-9 w-9 text-primary" aria-hidden="true" />{t('donneesOuvertes.titre', 'Données ouvertes : textes et voix en tamazight')}</h1>
          <p className="text-lg text-muted-foreground">
            {t('donneesOuvertes.intro', 'Des auteurs et des locuteurs partagent librement leurs textes et leurs voix en tamazight, pour que chercheurs et universités puissent créer des outils qui font vivre la langue. Chaque texte est écrit par une personne et relu par un modérateur avant d’entrer ici.')}
          </p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {usages.map(({ icone: Icone, titre, texte }) => (
            <Card key={titre}><CardContent className="space-y-2 p-5"><Icone className="h-7 w-7 text-primary" aria-hidden="true" /><h2 className="font-semibold">{titre}</h2><p className="text-sm text-muted-foreground">{texte}</p></CardContent></Card>
          ))}
        </div>

        <Card className="mb-8">
          <CardContent className="space-y-4 p-6">
            <h2 className="text-xl font-semibold">{t('donneesOuvertes.telecharger', 'Télécharger')}</h2>
            {jeu && (
              <p className="text-sm text-muted-foreground">
                {t('donneesOuvertes.compte', { textes: jeu.textes.length, voix: jeu.voix.length, defaultValue: '{{textes}} texte(s) et {{voix}} enregistrement(s) de lieux, mis à jour automatiquement.' })}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button asChild><a href={`${base}/tamazight/donnees-ouvertes.json`} download="taladz-tamazight.json"><Download className="me-2 h-4 w-4" aria-hidden="true" />JSON</a></Button>
              <Button asChild variant="outline"><a href={`${base}/tamazight/donnees-ouvertes.csv`} download="taladz-tamazight.csv"><Download className="me-2 h-4 w-4" aria-hidden="true" />CSV</a></Button>
            </div>
            <p className="text-sm text-muted-foreground">{t('donneesOuvertes.contenu', 'Le JSON contient, pour chaque texte : titre, texte complet, traductions, variante, écriture, auteur, liens des enregistrements audio et page d’origine.')}</p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardContent className="space-y-3 p-6">
            <h2 className="flex items-center gap-2 text-xl font-semibold"><Scale className="h-5 w-5 text-primary" aria-hidden="true" />{t('donneesOuvertes.licenceTitre', 'Licence et citation')}</h2>
            <p className="text-sm">{t('donneesOuvertes.licence', 'Licence Creative Commons CC BY-SA 4.0 : vous pouvez copier, modifier et réutiliser ces données, y compris pour entraîner des outils, à condition de citer les auteurs et Tala DZ, et de partager vos données dérivées sous la même licence.')}</p>
            <p className="rounded-md bg-muted p-3 font-mono text-sm">{t('donneesOuvertes.citation', 'Tala DZ (taladz.com) et les auteurs cités, « Textes et voix en tamazight », licence CC BY-SA 4.0.')}</p>
            <a href={LICENCE_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">{t('donneesOuvertes.lireLicence', 'Lire la licence CC BY-SA 4.0')}</a>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-6">
            <h2 className="text-xl font-semibold">{t('donneesOuvertes.contribuer', 'Contribuer')}</h2>
            <p className="text-sm text-muted-foreground">{t('donneesOuvertes.contribuerTexte', 'Vous écrivez ou parlez tamazight ? Publiez vos textes en cochant le partage ouvert, ou enregistrez votre voix sur la page d’un lieu. Universités et associations : écrivez-nous pour devenir partenaires.')}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline"><Link to="/tamazight">{t('donneesOuvertes.voirSection', 'Voir la section Tamazight')}</Link></Button>
              <Button asChild variant="outline"><Link to="/a-propos#contact">{t('donneesOuvertes.ecrire', 'Nous écrire')}</Link></Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default DonneesOuvertes;
