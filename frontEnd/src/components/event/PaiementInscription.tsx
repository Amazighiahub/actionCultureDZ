/**
 * Après l'inscription à un événement payant : combien payer, à qui, comment, et si l'organisateur
 * a reçu le paiement. Le paiement se fait directement auprès de l'organisateur.
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Clock, Wallet } from 'lucide-react';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { paiementService, type PaiementInscription as Paiement } from '@/services/paiement.service';
import ListeMoyensPaiement from '@/components/paiement/ListeMoyensPaiement';

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
              <ListeMoyensPaiement moyens={m} />
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
