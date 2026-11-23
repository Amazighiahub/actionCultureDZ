/**
 * Liens d'un professionnel : article de presse, YouTube, Instagram, TikTok, Facebook.
 * De simples liens qui ouvrent le site d'origine : aucune vidéo n'est intégrée.
 */
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Facebook, Instagram, Music2, Newspaper, Plus, Youtube, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { httpClient } from '@/services/httpClient';
import { safeExternalUrl } from '@/utils/safeUrl';
import { useFormatDate } from '@/hooks/useFormatDate';
import { evenementPath } from '@/utils/slug';

export type TypeLien = 'presse' | 'youtube' | 'instagram' | 'tiktok' | 'facebook';
export interface CibleLien { type: 'oeuvre' | 'article' | 'artisanat' | 'evenement'; id: number; titre: string }
export interface LienExterne {
  id_lien: number;
  type_lien: TypeLien;
  url: string;
  titre?: string | null;
  source?: string | null;
  date_publication?: string | null;
  id_oeuvre?: number | null;
  id_evenement?: number | null;
  cible?: CibleLien | null;
}

export const ICONES_LIEN: Record<TypeLien, LucideIcon> = {
  presse: Newspaper, youtube: Youtube, instagram: Instagram, tiktok: Music2, facebook: Facebook,
};

export const NOMS_LIEN: Record<TypeLien, string> = {
  presse: 'Article de presse', youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook',
};

/** Même règle que le serveur : le site du lien donne son type */
export function typeDepuisUrl(valeur: string): TypeLien | null {
  try {
    const hote = new URL(valeur.trim()).hostname.toLowerCase();
    const sur = (...domaines: string[]) => domaines.some((d) => hote === d || hote.endsWith(`.${d}`));
    if (sur('youtube.com', 'youtu.be')) return 'youtube';
    if (sur('instagram.com')) return 'instagram';
    if (sur('tiktok.com')) return 'tiktok';
    if (sur('facebook.com', 'fb.com', 'fb.watch')) return 'facebook';
    return 'presse';
  } catch {
    return null;
  }
}

export function cheminCible(cible: CibleLien): string {
  if (cible.type === 'evenement') return evenementPath(cible.id, cible.titre);
  if (cible.type === 'artisanat') return `/artisanat/${cible.id}`;
  return cible.type === 'article' ? `/articles/${cible.id}` : `/oeuvres/${cible.id}`;
}

export const nomDuSite = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

export function ListeLiens({ liens, avecCible = false }: { liens: LienExterne[]; avecCible?: boolean }) {
  const { t } = useTranslation();
  const { formatDate } = useFormatDate();
  return (
    <ul className="space-y-3">
      {liens.map((l) => {
        const Icone = ICONES_LIEN[l.type_lien] || Newspaper;
        const adresse = safeExternalUrl(l.url);
        if (!adresse) return null;
        return (
          <li key={l.id_lien} className="flex items-start gap-3">
            <Icone className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <a href={adresse} target="_blank" rel="noopener noreferrer nofollow ugc" className="font-medium text-primary hover:underline [overflow-wrap:anywhere]" dir="auto">
                {l.titre || nomDuSite(l.url)}
                <ExternalLink className="inline h-3 w-3 ms-1 align-baseline" aria-hidden="true" />
              </a>
              <p className="text-sm text-muted-foreground" dir="auto">
                {[
                  t(`liens.types.${l.type_lien}`, NOMS_LIEN[l.type_lien]),
                  l.source,
                  l.date_publication ? formatDate(l.date_publication, { dateStyle: 'long' }) : '',
                ].filter(Boolean).join(' · ')}
              </p>
              {avecCible && l.cible && (
                <p className="text-sm text-muted-foreground" dir="auto">
                  {t('liens.aPropos', 'À propos de :')}{' '}
                  <Link to={cheminCible(l.cible)} className="underline hover:text-primary">{l.cible.titre}</Link>
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Ses œuvres et événements (mêmes règles que le serveur : saisis par lui ou dont il est contributeur) */
interface MesContenusLiens { oeuvres: Array<{ id_oeuvre: number }>; evenements: Array<{ id_evenement: number }> }

/**
 * Partie d'une fiche publique : les articles de presse et liens rattachés à l'œuvre ou à l'événement.
 * Son auteur (professionnel) voit en plus « Ajouter un article de presse » (2026-11-23, conseil d'une
 * écrivaine : lier la presse aux œuvres), même tant qu'aucun lien n'y est rattaché.
 */
export function LiensDuContenu({ type, id, className }: { type: 'oeuvre' | 'evenement'; id: number; className?: string }) {
  const { t, i18n } = useTranslation();
  const { isProfessional } = useAuth();
  const { data } = useQuery({
    queryKey: ['liens', type, id, i18n.language],
    queryFn: async () => {
      const res = await httpClient.get<LienExterne[]>(`/liens/${type}/${id}`);
      return res.success && Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 60 * 1000,
    retry: false,
  });
  // Même clé que GestionLiens : une seule lecture
  const { data: contenus } = useQuery({
    queryKey: ['mes-contenus-liens', i18n.language],
    enabled: !!isProfessional,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => (await httpClient.get<MesContenusLiens>('/liens/mes-contenus')).data || { oeuvres: [], evenements: [] },
  });
  const estAuteur = type === 'oeuvre'
    ? !!contenus?.oeuvres?.some((o) => Number(o.id_oeuvre) === Number(id))
    : !!contenus?.evenements?.some((e) => Number(e.id_evenement) === Number(id));
  if (!data?.length && !estAuteur) return null;
  return (
    <section className={className} aria-labelledby={`liens-${type}-${id}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id={`liens-${type}-${id}`} className="text-2xl font-bold">{t('liens.titre', 'Dans la presse et en ligne')}</h2>
        {estAuteur && (
          <Button asChild variant="outline" size="sm">
            <Link to={`/dashboard-user?onglet=portfolio&lier=${type}:${id}`}>
              <Plus className="h-4 w-4 me-2" aria-hidden="true" />
              {type === 'oeuvre' ? t('liens.ajouterSurOeuvre', 'Ajouter un article de presse sur cette œuvre') : t('liens.ajouterSurEvenement', 'Ajouter un article de presse sur cet événement')}
            </Link>
          </Button>
        )}
      </div>
      {data?.length
        ? <ListeLiens liens={data} />
        : <p className="text-sm text-muted-foreground">{t('liens.aucunSurContenu', 'Aucun article pour l’instant. Ajoutez ce que la presse ou les réseaux disent de votre travail : les visiteurs le trouveront ici.')}</p>}
    </section>
  );
}
