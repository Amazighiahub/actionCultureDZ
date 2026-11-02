/**
 * Bas de la fiche d'un lieu : les œuvres que leur propriétaire a reliées à ce lieu, puis des personnes
 * de la même wilaya, avec un lien vers la page de la wilaya. Rien n'est affiché s'il n'y a rien à montrer.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Trash2, MapPin, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ConfirmDialog } from '@/components/shared';
import { ItemCard, ItemGrid } from '@/components/shared/ItemCard';
import { useToast } from '@/hooks/use-toast';
import { getAssetUrl } from '@/helpers/assetUrl';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { professionnelPath } from '@/utils/slug';
import { wilayaVitrineService, lienOeuvre, type OeuvreCarte } from '@/services/wilayaVitrine.service';

const NB_PERSONNES = 6;

export const OeuvresLieesLieu: React.FC<{ lieuId: number }> = ({ lieuId }) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cle = ['lieu-oeuvres-liees', lieuId];
  const { data: oeuvres = [] } = useQuery({ queryKey: cle, queryFn: () => wilayaVitrineService.oeuvresLiees(lieuId) });
  const [aRetirer, setARetirer] = useState<OeuvreCarte | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!oeuvres.length) return null;

  const retirer = async () => {
    if (!aRetirer?.id_lien) return;
    setEnCours(true);
    const res = await wilayaVitrineService.retirer(lieuId, aRetirer.id_lien);
    setEnCours(false);
    setARetirer(null);
    if (res.success) queryClient.invalidateQueries({ queryKey: cle });
    else toast({ title: t('common.error', 'Erreur'), description: res.error, variant: 'destructive' });
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-xl">{t('lieuOeuvres.titre', 'Œuvres liées à ce lieu')}</CardTitle></CardHeader>
      <CardContent>
        <ItemGrid>
          {oeuvres.map(o => (
            <div key={o.id_lien} className="relative">
              <ItemCard to={lienOeuvre(o)} title={getLocalizedText(o.titre as never, i18n.language)} image={o.image} />
              {o.peut_retirer && (
                <Button type="button" size="icon" variant="secondary" className="absolute top-2 end-2 h-11 w-11"
                  aria-label={t('lieuOeuvres.retirer', 'Retirer du lieu')} onClick={() => setARetirer(o)}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          ))}
        </ItemGrid>
      </CardContent>
      <ConfirmDialog
        open={aRetirer !== null}
        onOpenChange={(o) => { if (!o && !enCours) setARetirer(null); }}
        title={t('lieuOeuvres.retirerTitre', 'Retirer cette œuvre du lieu ?')}
        description={t('lieuOeuvres.retirerAide', 'L’œuvre reste publiée : seul le lien avec ce lieu disparaît.')}
        confirmLabel={t('lieuOeuvres.retirer', 'Retirer du lieu')}
        cancelLabel={t('common.cancel', 'Annuler')}
        variant="destructive"
        loading={enCours}
        onConfirm={retirer}
      />
    </Card>
  );
};

export const DeLaRegion: React.FC<{ idWilaya: number; nomWilaya: string }> = ({ idWilaya, nomWilaya }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { data } = useQuery({ queryKey: ['wilaya-vitrine', idWilaya], queryFn: () => wilayaVitrineService.vitrine(idWilaya) });
  if (!data) return null;
  const personnes = data.professionnels.liste.slice(0, NB_PERSONNES);
  const autres = data.oeuvres.total + data.artisanat.total + data.articles.total + data.organisations.total;
  if (!personnes.length && !autres) return null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-xl flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" aria-hidden="true" />{t('lieuOeuvres.region', 'De la même région')}</CardTitle></CardHeader>
      <CardContent>
        {personnes.length > 0 && (
          <ul className="grid sm:grid-cols-2 gap-2 mb-4">
            {personnes.map(p => {
              const prenom = getLocalizedText(p.prenom as never, lang);
              const nom = getLocalizedText(p.nom as never, lang);
              return (
                <li key={p.id_user}>
                  <Link to={professionnelPath(p.id_user, prenom, nom)} className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent transition-colors">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={p.photo_url ? getAssetUrl(p.photo_url, { width: 80 }) : undefined} alt="" />
                      <AvatarFallback>{(prenom || nom || '?').charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium min-w-0 break-words" dir="auto">{[prenom, nom].filter(Boolean).join(' ')}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <Link to={`/wilayas/${idWilaya}`} className="inline-flex items-center py-2 text-sm font-medium text-primary hover:underline">
          {t('lieuOeuvres.voirWilaya', 'Tout voir pour {{nom}}', { nom: nomWilaya })}<ChevronRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
};
