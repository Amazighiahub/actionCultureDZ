/**
 * MesSuivisCard — dans le profil : les professionnels suivis, pour les retrouver ou arrêter de les suivre.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { httpClient } from '@/services/httpClient';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { professionnelPath } from '@/utils/slug';

interface ProSuivi {
  id_user: number;
  nom: unknown;
  prenom: unknown;
}

export default function MesSuivisCard() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [suivis, setSuivis] = useState<ProSuivi[]>([]);

  useEffect(() => {
    httpClient.get<ProSuivi[]>('/users/mes-suivis')
      .then((res) => setSuivis(res.data ?? []))
      .catch(() => setSuivis([]));
  }, []);

  const texte = (v: unknown) => getLocalizedText(v as never, i18n.language) || '';

  const arreter = async (id: number) => {
    try {
      const res = await httpClient.delete<unknown>(`/users/professionals/${id}/suivi`);
      if (!res.success) throw new Error(res.error);
      setSuivis((liste) => liste.filter((p) => p.id_user !== id));
    } catch {
      toast({ title: t('suivi.echec', 'Cette action n’a pas abouti. Réessayez.'), variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" aria-hidden="true" />
          {t('suivi.mesSuivis', 'Les professionnels que je suis')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {suivis.length === 0
          ? <p className="text-sm text-muted-foreground">{t('suivi.aucun', 'Vous ne suivez encore personne. Touchez « Suivre » sur la page d’un professionnel.')}</p>
          : (
            <ul className="space-y-2">
              {suivis.map((p) => {
                const nom = `${texte(p.prenom)} ${texte(p.nom)}`.trim();
                return (
                  <li key={p.id_user} className="flex items-center justify-between gap-3">
                    <Link to={professionnelPath(p.id_user, p.prenom as never, p.nom as never)} className="hover:underline break-words">{nom}</Link>
                    <Button variant="outline" size="sm" onClick={() => arreter(p.id_user)}>{t('suivi.nePlusSuivre', 'Ne plus suivre')}</Button>
                  </li>
                );
              })}
            </ul>
          )}
      </CardContent>
    </Card>
  );
}
