/**
 * « Mes moyens de paiement » : comment le professionnel veut être payé par ses participants et ses
 * acheteurs. Tala DZ affiche ces moyens aux personnes inscrites, n'encaisse rien et ne prend aucune
 * commission.
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ChevronDown, ChevronUp, Loader2, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { paiementService, type MoyensPaiement as Moyens } from '@/services/paiement.service';

const VIDE: Moyens = { titulaire: '', baridimob_rip: '', ccp_numero: '', ccp_cle: '', especes: false, lien_url: '', lien_libelle: '', consignes: '' };

const MoyensPaiement: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [ouvert, setOuvert] = useState(false);
  const [moyens, setMoyens] = useState<Moyens>(VIDE);
  const [renseigne, setRenseigne] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    paiementService.mesMoyens().then((r) => {
      if (r?.success && r.data) {
        setMoyens({ ...VIDE, ...Object.fromEntries(Object.entries(r.data).map(([k, v]) => [k, v ?? (k === 'especes' ? false : '')])) });
        setRenseigne(true);
      }
      setChargement(false);
    }).catch(() => setChargement(false));
  }, []);

  const champ = (cle: keyof Moyens) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setMoyens((m) => ({ ...m, [cle]: e.target.value }));

  const enregistrer = async () => {
    setEnvoi(true);
    setErreur(null);
    const r = await paiementService.enregistrerMoyens(moyens);
    setEnvoi(false);
    if (!r?.success) { setErreur(r?.error || t('common.error', 'Erreur')); return; }
    setRenseigne(!!r.data);
    toast({ title: t('paiement.moyens.enregistres', 'Moyens de paiement enregistrés') });
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <button type="button" className="flex w-full items-center justify-between gap-3 text-start" onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert}>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-5 w-5 text-primary" aria-hidden="true" />
            {t('paiement.moyens.titre', 'Mes moyens de paiement')}
            {!chargement && (
              <span className={`text-xs font-normal ${renseigne ? 'text-green-700' : 'text-amber-700'}`}>
                {renseigne ? t('paiement.moyens.renseignes', '· renseignés') : t('paiement.moyens.aRenseigner', '· à renseigner pour vos événements payants')}
              </span>
            )}
          </CardTitle>
          {ouvert ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
        </button>
      </CardHeader>
      {ouvert && (
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('paiement.moyens.aide', 'Vos participants vous paient directement. Tala DZ ne perçoit aucune somme et ne prend aucune commission. Ces informations ne sont montrées qu’aux personnes inscrites à vos événements payants.')}
          </p>
          {chargement ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="mp-titulaire">{t('paiement.moyens.titulaire', 'Nom du titulaire du compte')}</Label>
                <Input id="mp-titulaire" value={moyens.titulaire || ''} onChange={champ('titulaire')} maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mp-rip">{t('paiement.moyens.rip', 'RIP BaridiMob (20 chiffres)')}</Label>
                <Input id="mp-rip" inputMode="numeric" value={moyens.baridimob_rip || ''} onChange={champ('baridimob_rip')} maxLength={30} placeholder="0079 9999 …" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="mp-ccp">{t('paiement.moyens.ccp', 'Numéro de CCP')}</Label>
                  <Input id="mp-ccp" inputMode="numeric" value={moyens.ccp_numero || ''} onChange={champ('ccp_numero')} maxLength={14} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mp-cle">{t('paiement.moyens.cle', 'Clé')}</Label>
                  <Input id="mp-cle" inputMode="numeric" value={moyens.ccp_cle || ''} onChange={champ('ccp_cle')} maxLength={2} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="mp-especes" checked={!!moyens.especes} onCheckedChange={(v) => setMoyens((m) => ({ ...m, especes: v === true }))} />
                <Label htmlFor="mp-especes">{t('paiement.moyens.especes', 'J’accepte les espèces (sur place ou à la livraison)')}</Label>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="mp-lien">{t('paiement.moyens.lien', 'Lien de paiement (facultatif)')}</Label>
                  <Input id="mp-lien" type="url" value={moyens.lien_url || ''} onChange={champ('lien_url')} maxLength={500} placeholder="https://…" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mp-lien-nom">{t('paiement.moyens.lienNom', 'Nom du lien')}</Label>
                  <Input id="mp-lien-nom" value={moyens.lien_libelle || ''} onChange={champ('lien_libelle')} maxLength={60} placeholder="Chargily, Wise…" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mp-consignes">{t('paiement.moyens.consignes', 'Consignes (facultatif)')}</Label>
                <Textarea id="mp-consignes" value={moyens.consignes || ''} onChange={champ('consignes')} maxLength={500}
                  placeholder={t('paiement.moyens.consignesExemple', 'Ex. : indiquez votre nom dans le motif du virement.')} />
              </div>
              {erreur && <p role="alert" className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" aria-hidden="true" />{erreur}</p>}
              <Button onClick={enregistrer} disabled={envoi}>
                {envoi && <Loader2 className="h-4 w-4 me-2 animate-spin" aria-hidden="true" />}
                {t('common.save', 'Enregistrer')}
              </Button>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default MoyensPaiement;
