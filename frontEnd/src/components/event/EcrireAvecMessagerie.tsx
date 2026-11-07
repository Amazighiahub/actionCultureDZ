/**
 * L'organisateur écrit à ses participants depuis SA messagerie (Gmail, Yahoo…) : les adresses sont
 * mises en copie cachée (Cci), personne ne voit celles des autres. Rien ne passe par l'envoi d'e-mails
 * du site : le quota du jour reste pour les e-mails importants (mot de passe oublié, vérification).
 * Seules les personnes inscrites sont concernées (pas les invitations qui n'ont pas encore accepté).
 */
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const STATUTS_CONCERNES = ['inscrit', 'confirme', 'present'];
/** Au-delà, certaines messageries tronquent le lien : on propose de copier les adresses */
const LONGUEUR_LIEN_MAX = 1800;

interface ParticipantMinimal {
  statut_participation: string;
  User?: { email?: string | null } | null;
}

interface Props {
  participants: ParticipantMinimal[];
  evenementNom: string;
}

const EcrireAvecMessagerie: React.FC<Props> = ({ participants, evenementNom }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [copie, setCopie] = useState(false);

  const adresses = useMemo(() => Array.from(new Set(participants
    .filter((p) => STATUTS_CONCERNES.includes(p.statut_participation))
    .map((p) => (p.User?.email || '').trim())
    .filter((e) => /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(e)))), [participants]);

  if (!adresses.length) return null;

  const sujet = encodeURIComponent(evenementNom || '');
  const lien = `mailto:?bcc=${adresses.map(encodeURIComponent).join(',')}&subject=${sujet}`;
  const lienTropLong = lien.length > LONGUEUR_LIEN_MAX;

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(adresses.join(', '));
      setCopie(true);
      setTimeout(() => setCopie(false), 3000);
      toast({
        title: t('pro.participants.messagerie.copiees', '{{count}} adresse(s) copiée(s)', { count: adresses.length }),
        description: t('pro.participants.messagerie.collez', 'Ouvrez votre messagerie et collez-les dans « Cci » (copie cachée), jamais dans « À » : chacun verrait les adresses des autres.'),
      });
    } catch {
      toast({ title: t('common.error', 'Erreur'), description: t('pro.participants.messagerie.copieImpossible', 'Copie impossible : sélectionnez les adresses à la main.'), variant: 'destructive' });
    }
  };

  return (
    <>
      {!lienTropLong && (
        <Button variant="outline" asChild>
          <a href={lien}>
            <Mail className="h-4 w-4 me-2" aria-hidden="true" />
            {t('pro.participants.messagerie.ouvrir', 'Écrire avec ma messagerie ({{count}})', { count: adresses.length })}
          </a>
        </Button>
      )}
      <Button variant="outline" onClick={copier}>
        {copie ? <Check className="h-4 w-4 me-2" aria-hidden="true" /> : <Copy className="h-4 w-4 me-2" aria-hidden="true" />}
        {t('pro.participants.messagerie.copier', 'Copier les adresses ({{count}})', { count: adresses.length })}
      </Button>
    </>
  );
};

export default EcrireAvecMessagerie;
