/**
 * « Lieux liés à cette œuvre » : affiché sur la fiche d'une œuvre ou d'un produit d'artisanat.
 * Son propriétaire peut la relier à un lieu existant (le lieu n'est pas modifié) ou retirer ce lien.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MapPin, X, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LieuSelector } from '@/components/LieuSelector';
import { useToast } from '@/hooks/use-toast';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { wilayaVitrineService, type LieuDeOeuvre } from '@/services/wilayaVitrine.service';

const LieuxDeOeuvre: React.FC<{ oeuvreId: number }> = ({ oeuvreId }) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cle = ['oeuvre-lieux', oeuvreId];
  const { data } = useQuery({ queryKey: cle, queryFn: () => wilayaVitrineService.lieuxDeOeuvre(oeuvreId) });
  const [ajout, setAjout] = useState(false);
  const [idLieu, setIdLieu] = useState<number | undefined>();
  const [enCours, setEnCours] = useState(false);

  const lieux = data?.lieux || [];
  if (!data || (!lieux.length && !data.peut_relier)) return null;

  const erreur = (description?: string) => toast({ title: t('common.error', 'Erreur'), description, variant: 'destructive' });

  const rafraichir = () => {
    queryClient.invalidateQueries({ queryKey: cle });
    if (idLieu) queryClient.invalidateQueries({ queryKey: ['lieu-oeuvres-liees', idLieu] });
  };

  const relier = async () => {
    if (!idLieu) return;
    setEnCours(true);
    const res = await wilayaVitrineService.relier(idLieu, oeuvreId);
    setEnCours(false);
    if (!res.success) return erreur(res.error);
    rafraichir();
    setAjout(false);
    setIdLieu(undefined);
  };

  const retirer = async (lieu: LieuDeOeuvre) => {
    const res = await wilayaVitrineService.retirer(lieu.id_lieu, lieu.id_lien);
    if (!res.success) return erreur(res.error);
    queryClient.invalidateQueries({ queryKey: cle });
    queryClient.invalidateQueries({ queryKey: ['lieu-oeuvres-liees', lieu.id_lieu] });
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />{t('lieuOeuvres.lieuxTitre', 'Lieux liés à cette œuvre')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {lieux.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {lieux.map(l => {
              const nom = getLocalizedText(l.nom as never, i18n.language);
              return (
                <li key={l.id_lien} className="inline-flex items-center gap-1 rounded-full border ps-3">
                  <Link to={`/patrimoine/${l.id_lieu}`} className="py-2 text-sm font-medium hover:underline" dir="auto">{nom}</Link>
                  {l.peut_retirer ? (
                    <Button type="button" size="icon" variant="ghost" className="h-11 w-11 rounded-full"
                      aria-label={t('lieuOeuvres.retirerNom', 'Retirer le lien avec {{nom}}', { nom })} onClick={() => retirer(l)}>
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  ) : <span className="pe-3" />}
                </li>
              );
            })}
          </ul>
        )}
        {data.peut_relier && !ajout && (
          <Button type="button" variant="outline" onClick={() => setAjout(true)}>
            <Plus className="h-4 w-4 me-2" aria-hidden="true" />{t('lieuOeuvres.relier', 'Relier à un lieu')}
          </Button>
        )}
        {ajout && (
          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">{t('lieuOeuvres.relierAide', 'Choisissez un lieu existant que cette œuvre concerne : elle apparaîtra sur sa fiche.')}</p>
            <LieuSelector value={idLieu} onChange={(id) => setIdLieu(id)} />
            <div className="flex gap-2">
              <Button type="button" onClick={relier} disabled={!idLieu || enCours}>
                {enCours && <Loader2 className="h-4 w-4 me-2 animate-spin" aria-hidden="true" />}{t('lieuOeuvres.confirmer', 'Relier')}
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setAjout(false); setIdLieu(undefined); }}>{t('common.cancel', 'Annuler')}</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LieuxDeOeuvre;
