/**
 * Scans du QR code d'un site (audit V11 OUT-12, accord de la responsable : sans adresse IP).
 *
 * Le QR imprimé mène à la fiche avec « ?src=qr ». La fiche signale le scan une seule fois, puis
 * retire le marqueur de l'adresse : un rechargement ou un partage du lien ne recompte pas.
 * Le créateur du site et la modération voient combien de fois le QR a été scanné.
 */
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { httpClient } from '@/services/httpClient';

/** Signale un scan quand la fiche est ouverte depuis le QR, puis retire « src=qr » de l'adresse */
export function useSignalerScanQr(idLieu: number | undefined) {
  const location = useLocation();
  const navigate = useNavigate();
  const envoye = useRef<number | null>(null);

  useEffect(() => {
    if (!idLieu) return;
    const params = new URLSearchParams(location.search);
    if (params.get('src') !== 'qr') return;
    if (envoye.current !== idLieu) {
      envoye.current = idLieu;
      // Sans attendre la réponse : un échec ne doit rien changer pour la personne qui visite
      httpClient.post(`/patrimoine/${idLieu}/scan-qr`, {}).catch(() => undefined);
    }
    params.delete('src');
    const reste = params.toString();
    navigate(`${location.pathname}${reste ? `?${reste}` : ''}${location.hash}`, { replace: true, state: location.state });
  }, [idLieu, location.search, location.pathname, location.hash, location.state, navigate]);
}

/** « Scanné N fois » : pour le créateur du site et la modération */
export default function CompteurScansQr({ idLieu }: { idLieu: number }) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<{ total: number; trente_jours: number } | null>(null);

  useEffect(() => {
    let actif = true;
    httpClient.get<{ total: number; trente_jours: number }>(`/patrimoine/${idLieu}/scans-qr`)
      .then((res) => { if (actif && res.success && res.data) setStats(res.data); })
      .catch(() => undefined);
    return () => { actif = false; };
  }, [idLieu]);

  if (!stats) return null;
  return (
    <p className="text-sm text-muted-foreground text-center px-6 pb-4" data-testid="compteur-scans-qr">
      {stats.total === 0
        ? t('patrimoine.scansQr.aucun', 'Ce QR code n’a pas encore été scanné.')
        : t('patrimoine.scansQr.total', 'Scanné {{count}} fois (30 derniers jours : {{mois}})', { count: stats.total, mois: stats.trente_jours })}
    </p>
  );
}
