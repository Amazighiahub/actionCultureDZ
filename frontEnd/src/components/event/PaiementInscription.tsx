/**
 * Après l'inscription à un événement payant : combien payer, à qui, comment, et si l'organisateur
 * a reçu le paiement. Le paiement se fait directement auprès de l'organisateur.
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Clock, ExternalLink, Wallet } from 'lucide-react';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { paiementService, ripLisible, type PaiementInscription as Paiement } from '@/services/paiement.service';

const PaiementInscription: React.FC<{ idEvenement: number }> = ({ idEvenement }) => {
  const { t } = useTranslation();
  const { formatPrice } = useLocalizedNumber();
  const [p, setP] = useState<Paiement | null>(null);

  useEffect(() => {
    let actif = true;
    // Réponse absente ou en erreur : rien n'est affiché (jamais une page cassée)
    paiementService.paiementEvenement(idEvenement).then((r) => { if (actif && r?.success && r.data) setP(r.data); }).catch(() => {});
    return () => { actif = false; };
  }, [idEvenement]);

  if (!p || p.montant === 0) return null;
  const m = p.moyens;

  return (
    <div className="w-full rounded-lg border p-4 text-sm space-y-3 text-start">
      <p className="flex items-center gap-2 font-semibold">
        <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
        {p.montant === null
          ? t('paiement.participant.aConvenir', 'Prix à convenir avec l’organisateur')
          : t('paiement.participant.aPayer', 'À payer : {{montant}}', { montant: formatPrice(p.montant) })}
      </p>

      {p.paye ? (
        <p className="flex items-center gap-2 text-green-700"><CheckCircle className="h-4 w-4" aria-hidden="true" />{t('paiement.participant.recu', 'L’organisateur a reçu votre paiement.')}</p>
      ) : (
        <>
          <p className="flex items-center gap-2 text-amber-700"><Clock className="h-4 w-4" aria-hidden="true" />{t('paiement.participant.enAttente', 'Paiement pas encore confirmé par l’organisateur.')}</p>
          {m ? (
            <div className="space-y-2">
              <p>{t('paiement.participant.payez', 'Payez directement {{nom}} :', { nom: p.organisateur?.nom || t('paiement.participant.organisateur', 'l’organisateur') })}</p>
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
                  </li>
                )}
              </ul>
              {m.consignes && <p dir="auto" className="whitespace-pre-line text-muted-foreground">{m.consignes}</p>}
            </div>
          ) : (
            <p className="text-muted-foreground">{t('paiement.participant.sansMoyen', 'L’organisateur vous indiquera comment le payer.')}</p>
          )}
        </>
      )}
      <p className="text-xs text-muted-foreground">{t('paiement.mention', 'Le paiement se fait directement auprès de l’organisateur. Tala DZ ne perçoit aucune somme.')}</p>
    </div>
  );
};

export default PaiementInscription;
