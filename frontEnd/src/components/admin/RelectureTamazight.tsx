/**
 * Modération (onglet Œuvres) : textes en tamazight dont l'auteur a accepté le partage ouvert, à relire avant leur
 * entrée dans les données ouvertes (2026-11-20). Rien ne s'affiche quand il n'y a rien à relire.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Database, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { httpClient } from '@/services/httpClient';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { messageErreurServeur } from '@/utils/erreurServeur';
import { oeuvrePath } from '@/utils/slug';
import { LIBELLE_VARIANTE, type Variante } from '@/utils/tamazight';

interface ARelire { id_oeuvre: number; titre: unknown; id_type_oeuvre: number; ecriture: 'latin' | 'tifinagh'; variante: Variante | null; auteur: string | null }

const RelectureTamazight: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [liste, setListe] = useState<ARelire[]>([]);
  const [envoi, setEnvoi] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(() => {
    // Promise.resolve : une panne, même immédiate, ne casse jamais l'onglet des œuvres
    Promise.resolve().then(() => httpClient.get<ARelire[]>('/tamazight/admin/a-relire'))
      .then((r) => { if (r.success && Array.isArray(r.data)) setListe(r.data); })
      .catch(() => {});
  }, []);
  useEffect(() => { charger(); }, [charger]);

  const valider = async (id: number) => {
    setEnvoi(id); setErreur(null);
    try {
      const r = await httpClient.patch(`/tamazight/admin/${id}`, { valide: true });
      if (!r.success) throw r;
      setListe((l) => l.filter((x) => x.id_oeuvre !== id));
    } catch (e) {
      setErreur(messageErreurServeur(e, t('common.errorOccurred', 'Une erreur est survenue')));
    } finally {
      setEnvoi(null);
    }
  };

  if (!liste.length) return null;
  return (
    <Card className="mb-6 border-primary/40">
      <CardContent className="space-y-3 p-4">
        <h3 className="flex items-center gap-2 font-semibold"><Database className="h-5 w-5 text-primary" aria-hidden="true" />
          {t('tamazight.admin.titre', { n: liste.length, defaultValue: 'Tamazight : {{n}} texte(s) à relire pour les données ouvertes' })}
        </h3>
        <p className="text-sm text-muted-foreground">{t('tamazight.admin.aide', 'Vérifiez que le texte est bien en tamazight, écrit par une personne, et que la variante est juste. Validé, il entre dans les données ouvertes (licence CC BY-SA 4.0).')}</p>
        {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
        <ul className="divide-y">
          {liste.map((o) => (
            <li key={o.id_oeuvre} className="flex flex-wrap items-center gap-3 py-2">
              <Link to={oeuvrePath(o.id_oeuvre, o.titre, o.id_type_oeuvre)} className="min-w-0 flex-1 font-medium text-primary hover:underline" dir="auto">
                {getLocalizedText(o.titre as never, i18n.language) || getLocalizedText(o.titre as never, 'tz-ltn')}
              </Link>
              {o.variante && <Badge variant="secondary">{t(`tamazight.variantes.${o.variante}`, LIBELLE_VARIANTE[o.variante])}</Badge>}
              <Badge variant="outline">{o.ecriture === 'tifinagh' ? t('tamazight.ecriture.tifinagh', 'Tifinagh') : t('tamazight.ecriture.latin', 'Lettres latines')}</Badge>
              {o.auteur && <span className="text-xs text-muted-foreground">{o.auteur}</span>}
              <Button size="sm" onClick={() => valider(o.id_oeuvre)} disabled={envoi === o.id_oeuvre}>
                {envoi === o.id_oeuvre && <Loader2 className="me-2 h-4 w-4 animate-spin" />}{t('tamazight.admin.valider', 'Ajouter aux données ouvertes')}
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default RelectureTamazight;
