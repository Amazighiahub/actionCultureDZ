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
import { paiementService, CLES_SENSIBLES, type MoyensPaiement as Moyens } from '@/services/paiement.service';

const VIDE: Moyens = { titulaire: '', baridimob_rip: '', ccp_numero: '', ccp_cle: '', especes: false, lien_url: '', lien_libelle: '', consignes: '', envoi_algerie: '', envoi_etranger: '', main_propre: false };
const CASES = ['especes', 'main_propre'];

const MoyensPaiement: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [ouvert, setOuvert] = useState(false);
  const [moyens, setMoyens] = useState<Moyens>(VIDE);
  // Valeurs enregistrées : changer une coordonnée de paiement demande le mot de passe
  const [initial, setInitial] = useState<Moyens>(VIDE);
  const [motDePasse, setMotDePasse] = useState('');
  const [renseigne, setRenseigne] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    paiementService.mesMoyens().then((r) => {
      if (r?.success && r.data) {
        const charge = { ...VIDE, ...Object.fromEntries(Object.entries(r.data).map(([k, v]) => [k, v ?? (CASES.includes(k) ? false : '')])) };
        setMoyens(charge);
        setInitial(charge);
        setRenseigne(true);
      }
      setChargement(false);
    }).catch(() => setChargement(false));
  }, []);

  const champ = (cle: keyof Moyens) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setMoyens((m) => ({ ...m, [cle]: e.target.value }));

  // Même comparaison que le serveur : chiffres sans espaces ni points pour le RIP et le CCP, texte tel quel sinon
  const CHIFFRES = ['baridimob_rip', 'ccp_numero', 'ccp_cle'];
  const vide = (k: string, v: unknown) => {
    const s = v === null || v === undefined || v === false ? '' : String(v).trim();
    return CHIFFRES.includes(k) ? s.replace(/[\s.-]/g, '') : s;
  };
  const [mdpDemande, setMdpDemande] = useState(false);
  const coordonneesChangees = mdpDemande || CLES_SENSIBLES.some((k) => vide(k, moyens[k]) !== vide(k, initial[k]));

  const enregistrer = async () => {
    if (coordonneesChangees && !motDePasse) {
      setErreur(t('paiement.moyens.motDePasseRequis', 'Confirmez avec votre mot de passe pour changer vos coordonnées de paiement.'));
      return;
    }
    setEnvoi(true);
    setErreur(null);
    const r = await paiementService.enregistrerMoyens(moyens, coordonneesChangees ? motDePasse : undefined);
    setEnvoi(false);
    if (!r?.success) {
      // Le serveur demande le mot de passe (cas non vu ici) : le champ apparaît
      if (r?.code === 'MOT_DE_PASSE_REQUIS' || r?.code === 'MOT_DE_PASSE_INCORRECT') setMdpDemande(true);
      setErreur(r?.error || t('common.error', 'Erreur'));
      return;
    }
    setRenseigne(!!r.data);
    setInitial(moyens);
    setMotDePasse('');
    setMdpDemande(false);
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
                {renseigne ? t('paiement.moyens.renseignes', '· renseignés') : t('paiement.moyens.aRenseignerVentes', '· à renseigner pour vos événements payants et vos ventes')}
              </span>
            )}
          </CardTitle>
          {ouvert ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
        </button>
      </CardHeader>
      {ouvert && (
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('paiement.moyens.aideVentes', 'Vos participants et vos acheteurs vous paient directement. Tala DZ ne perçoit aucune somme et ne prend aucune commission. Ces informations ne sont montrées qu’aux personnes inscrites à vos événements payants et à celles qui commandent vos œuvres.')}
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
              {/* Commandes de livres, d'œuvres d'art et d'artisanat */}
              <fieldset className="space-y-3 rounded-lg border p-3">
                <legend className="px-1 text-sm font-medium">{t('paiement.moyens.livraison', 'Vos ventes : livraison')}</legend>
                <p className="text-xs text-muted-foreground">{t('paiement.moyens.livraisonAide', 'Le bouton « Commander » apparaît sur vos livres, œuvres d’art et objets d’artisanat qui ont un prix. Laissez un champ vide si vous n’envoyez pas dans cette zone (0 = envoi gratuit).')}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="mp-envoi-dz">{t('paiement.moyens.envoiAlgerie', 'Frais d’envoi en Algérie (DA)')}</Label>
                    <Input id="mp-envoi-dz" type="number" min={0} inputMode="numeric" value={moyens.envoi_algerie ?? ''} onChange={champ('envoi_algerie')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mp-envoi-etr">{t('paiement.moyens.envoiEtranger', 'Frais d’envoi à l’étranger (DA)')}</Label>
                    <Input id="mp-envoi-etr" type="number" min={0} inputMode="numeric" value={moyens.envoi_etranger ?? ''} onChange={champ('envoi_etranger')} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="mp-main" checked={!!moyens.main_propre} onCheckedChange={(v) => setMoyens((m) => ({ ...m, main_propre: v === true }))} />
                  <Label htmlFor="mp-main">{t('paiement.moyens.mainPropre', 'Remise en main propre possible')}</Label>
                </div>
              </fieldset>
              {coordonneesChangees && (
                <div className="space-y-1.5 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3">
                  <Label htmlFor="mp-mdp">{t('paiement.moyens.motDePasse', 'Votre mot de passe (pour confirmer le changement de coordonnées)')}</Label>
                  <Input id="mp-mdp" type="password" autoComplete="current-password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
                  <p className="text-xs text-muted-foreground">{t('paiement.moyens.motDePasseAide', 'Vous recevrez un e-mail de confirmation. Ainsi, personne ne peut détourner vos paiements avec votre session.')}</p>
                </div>
              )}
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
