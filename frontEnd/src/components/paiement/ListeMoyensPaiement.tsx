/**
 * Coordonnées de paiement d'un professionnel (BaridiMob, CCP, espèces, lien, consignes), montrées à ses
 * participants et à ses acheteurs. Même affichage pour un événement et pour une commande.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { ripLisible, siteDuLien, type MoyensPaiement } from '@/services/paiement.service';

const ListeMoyensPaiement: React.FC<{ moyens: MoyensPaiement }> = ({ moyens: m }) => {
  const { t } = useTranslation();
  return (
    <>
      <ul className="space-y-1.5">
        {m.baridimob_rip && <li><b>BaridiMob</b> · RIP <bdi className="font-mono">{ripLisible(m.baridimob_rip)}</bdi></li>}
        {m.ccp_numero && <li><b>CCP</b> · <bdi className="font-mono">{m.ccp_numero}</bdi> {t('paiement.moyens.cle', 'Clé')} <bdi className="font-mono">{m.ccp_cle}</bdi></li>}
        {m.titulaire && (m.baridimob_rip || m.ccp_numero) && <li className="text-muted-foreground">{t('paiement.participant.titulaire', 'Titulaire : {{nom}}', { nom: m.titulaire })}</li>}
        {m.especes && <li>{t('paiement.participant.especes', 'Espèces : sur place ou à la remise')}</li>}
        {m.lien_url && (
          <li>
            <a href={m.lien_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 font-medium text-primary hover:underline underline-offset-4">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />{m.lien_libelle || t('paiement.participant.lien', 'Payer en ligne')}
            </a>
            {/* Le site réel du lien, toujours visible : l'acheteur sait où il paie */}
            {siteDuLien(m.lien_url) && <span className="text-muted-foreground"> (<bdi>{siteDuLien(m.lien_url)}</bdi>)</span>}
          </li>
        )}
      </ul>
      {m.consignes && <p dir="auto" className="whitespace-pre-line text-muted-foreground">{m.consignes}</p>}
      <p className="text-xs text-muted-foreground">{t('paiement.avertissement', 'Tala DZ ne vous demandera jamais de payer sur son site, ni vos codes bancaires.')}</p>
    </>
  );
};

export default ListeMoyensPaiement;
