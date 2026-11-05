/**
 * Tableau de bord du professionnel : « Votre fiche est complète à X % », avec ce qu'il reste à faire
 * pour être bien trouvé sur Google, Bing et ChatGPT. Calculé par le serveur sur les vraies données.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, ChevronDown, ChevronUp, Circle, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { httpClient } from '@/services/httpClient';

interface Point {
  cle: string;
  ok: boolean;
  nombre?: number;
  valeur?: number;
  minimum?: number;
  oeuvres?: { id: number; titre: string; type: number }[];
}

const lienModification = (o: { id: number; type: number }) => ([4, 5].includes(o.type) ? `/editer-article/${o.id}` : `/modifier-oeuvre/${o.id}`);

const VisibiliteFiche: React.FC = () => {
  const { t } = useTranslation();
  const [donnees, setDonnees] = useState<{ score: number; points: Point[] } | null>(null);
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    httpClient.get<{ score: number; points: Point[] }>('/paiement/visibilite')
      .then((r) => { if (r?.success && r.data) setDonnees(r.data); })
      .catch(() => {});
  }, []);

  if (!donnees) return null;

  const TEXTES: Record<string, { fait: string; afaire: string; lien?: string }> = {
    public: { fait: t('seo.visibilite.public', 'Votre profil est public'), afaire: t('seo.visibilite.publicAfaire', 'Votre profil est privé : les moteurs de recherche ne le voient pas'), lien: '/dashboard-user?onglet=profil' },
    photo: { fait: t('seo.visibilite.photo', 'Photo de profil'), afaire: t('seo.visibilite.photoAfaire', 'Ajoutez une photo de vous, nette et de face'), lien: '/dashboard-user?onglet=profil' },
    biographie: { fait: t('seo.visibilite.bio', 'Biographie complète'), afaire: t('seo.visibilite.bioAfaire', 'Biographie d’au moins {{min}} caractères (vous en avez {{n}}) : métier, ville, œuvres principales', { min: 300, n: donnees.points.find((p) => p.cle === 'biographie')?.valeur ?? 0 }), lien: '/dashboard-user?onglet=profil' },
    wilaya: { fait: t('seo.visibilite.wilaya', 'Wilaya indiquée'), afaire: t('seo.visibilite.wilayaAfaire', 'Indiquez votre wilaya : on vous trouve aussi par ville'), lien: '/dashboard-user?onglet=profil' },
    metiers: { fait: t('seo.visibilite.metiers', 'Métiers et compétences indiqués'), afaire: t('seo.visibilite.metiersAfaire', 'Indiquez vos métiers et compétences (artiste, poétesse…) : on vous trouve aussi par eux'), lien: '/dashboard-user?onglet=profil' },
    contenu: { fait: t('seo.visibilite.contenu', 'Au moins une œuvre ou un événement en ligne'), afaire: t('seo.visibilite.contenuAfaire', 'Publiez une première œuvre, un article ou un événement'), lien: '/ajouter-oeuvre' },
    liens: { fait: t('seo.visibilite.liens', 'Presse et réseaux ajoutés'), afaire: t('seo.visibilite.liensAfaire', 'Ajoutez un article de presse ou vos réseaux (YouTube, Instagram…)'), lien: '/dashboard-user?onglet=profil' },
    photos: { fait: t('seo.visibilite.photos', 'Toutes vos œuvres ont une photo'), afaire: t('seo.visibilite.photosAfaire', '{{n}} œuvre(s) sans photo', { n: donnees.points.find((p) => p.cle === 'photos')?.nombre ?? 0 }) },
    descriptions: { fait: t('seo.visibilite.descriptions', 'Toutes vos œuvres sont bien décrites'), afaire: t('seo.visibilite.descriptionsAfaire', '{{n}} œuvre(s) avec un résumé trop court (moins de {{min}} caractères)', { n: donnees.points.find((p) => p.cle === 'descriptions')?.nombre ?? 0, min: 150 }) },
  };
  const aFaire = donnees.points.filter((p) => !p.ok);

  return (
    <Card className="mb-6">
      <CardContent className="p-4 space-y-3">
        <button type="button" onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert} className="flex w-full items-center justify-between gap-3 text-start">
          <span className="flex items-center gap-2 font-semibold">
            <Search className="h-5 w-5 text-primary" aria-hidden="true" />
            {t('seo.visibilite.titre', 'Votre fiche est complète à {{score}} %', { score: donnees.score })}
          </span>
          {ouvert ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
        </button>
        <Progress value={donnees.score} aria-label={t('seo.visibilite.titre', 'Votre fiche est complète à {{score}} %', { score: donnees.score })} />
        {!ouvert && aFaire.length > 0 && (
          <p className="text-sm text-muted-foreground">{t('seo.visibilite.resume', 'Plus elle est complète, mieux on vous trouve sur Google, Bing et ChatGPT. Encore {{n}} point(s) à améliorer.', { n: aFaire.length })}</p>
        )}
        {ouvert && (
          <ul className="space-y-2 text-sm">
            {[...aFaire, ...donnees.points.filter((p) => p.ok)].map((p) => (
              <li key={p.cle} className="flex items-start gap-2">
                {p.ok ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden="true" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />}
                <div>
                  <span className={p.ok ? 'text-muted-foreground' : ''}>{p.ok ? TEXTES[p.cle]?.fait : TEXTES[p.cle]?.afaire}</span>
                  {!p.ok && TEXTES[p.cle]?.lien && <> · <Link className="text-primary hover:underline underline-offset-4" to={TEXTES[p.cle].lien!}>{t('seo.visibilite.corriger', 'Corriger')}</Link></>}
                  {!p.ok && p.oeuvres && p.oeuvres.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {p.oeuvres.map((o) => <li key={o.id}><Link className="text-primary hover:underline underline-offset-4" to={lienModification(o)}>{o.titre || `#${o.id}`}</Link></li>)}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default VisibiliteFiche;
