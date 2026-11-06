/**
 * Bouton « Commander » d'un livre, d'une œuvre d'art ou d'un objet d'artisanat. L'acheteur choisit la
 * quantité et la livraison, puis paie directement le professionnel : Tala DZ n'encaisse rien.
 * Rien n'est affiché si l'œuvre ne se commande pas (pas de prix, pas de moyen de paiement…).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Loader2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import ListeMoyensPaiement from '@/components/paiement/ListeMoyensPaiement';
import { commandeService, type Commande, type ModeLivraison, type OffreOeuvre } from '@/services/commande.service';

const ORDRE: ModeLivraison[] = ['algerie', 'etranger', 'main_propre', 'a_convenir'];

interface Props {
  idOeuvre: number;
  /** Classe du bouton (taille, largeur) selon la page */
  className?: string;
  size?: 'default' | 'sm' | 'lg';
}

const CommanderOeuvre: React.FC<Props> = ({ idOeuvre, className, size = 'lg' }) => {
  const { t } = useTranslation();
  const { formatPrice } = useLocalizedNumber();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [offre, setOffre] = useState<OffreOeuvre | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [quantite, setQuantite] = useState(1);
  const [livraison, setLivraison] = useState<ModeLivraison | ''>('');
  const [adresse, setAdresse] = useState('');
  const [telephone, setTelephone] = useState('');
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [faite, setFaite] = useState<Commande | null>(null);

  useEffect(() => {
    let actif = true;
    // Réponse absente ou en erreur : pas de bouton (jamais une page cassée)
    commandeService.offre(idOeuvre).then((r) => { if (actif && r?.success && r.data) setOffre(r.data); }).catch(() => {});
    return () => { actif = false; };
  }, [idOeuvre]);

  const modes = useMemo(() => ORDRE.filter((m) => offre?.livraison && m in offre.livraison), [offre]);
  useEffect(() => { if (modes.length === 1) setLivraison(modes[0]); }, [modes]);

  if (!offre?.commandable || !offre.prix) {
    return offre?.raison === 'epuise'
      ? <p className="text-sm font-medium text-muted-foreground">{t('commande.epuise', 'Plus en stock pour le moment')}</p>
      : null;
  }
  // Son propre livre : pas de bouton
  if (user?.id_user && offre.vendeur?.id === user.id_user) return null;

  const frais = livraison ? offre.livraison?.[livraison] : undefined;
  const total = offre.prix * quantite + (typeof frais === 'number' ? frais : 0);
  const avecAdresse = livraison === 'algerie' || livraison === 'etranger';
  const maxQuantite = Math.min(20, offre.stock ?? 20);

  const libelleMode = (m: ModeLivraison) => {
    const f = offre.livraison?.[m];
    const nom = {
      algerie: t('commande.livraison.algerie', 'Envoi en Algérie'),
      etranger: t('commande.livraison.etranger', 'Envoi à l’étranger'),
      main_propre: t('commande.livraison.mainPropre', 'Remise en main propre'),
      a_convenir: t('commande.livraison.aConvenir', 'Livraison à convenir avec le vendeur'),
    }[m];
    if (m === 'a_convenir' || m === 'main_propre') return nom;
    return `${nom} · ${f ? formatPrice(f) : t('commande.livraison.gratuit', 'gratuit')}`;
  };

  const ouvrir = () => {
    if (!isAuthenticated) {
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setErreur(null);
    setOuvert(true);
  };

  const envoyer = async () => {
    if (!livraison) { setErreur(t('commande.choisirLivraison', 'Choisissez la livraison.')); return; }
    if (avecAdresse && !adresse.trim()) { setErreur(t('commande.adresseRequise', 'Indiquez l’adresse de livraison.')); return; }
    setEnvoi(true);
    setErreur(null);
    const r = await commandeService.commander({
      id_oeuvre: idOeuvre, quantite, livraison,
      adresse: avecAdresse ? adresse.trim() : undefined,
      telephone: telephone.trim() || undefined,
      message: message.trim() || undefined,
    }).catch(() => null);
    setEnvoi(false);
    if (!r?.success || !r.data) { setErreur(r?.error || t('common.error', 'Erreur')); return; }
    setFaite(r.data);
  };

  return (
    <>
      <Button size={size} className={className} onClick={ouvrir}>
        <ShoppingBag className="h-5 w-5 me-2" aria-hidden="true" />
        {t('commande.commander', 'Commander')}
      </Button>

      <Dialog open={ouvert} onOpenChange={(o) => { setOuvert(o); if (!o) setFaite(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" aria-hidden="true" />
              {faite ? t('commande.envoyee', 'Commande envoyée') : t('commande.titre', 'Commander « {{titre}} »', { titre: offre.titre })}
            </DialogTitle>
            <DialogDescription>
              {t('commande.mention', 'Vous payez directement {{nom}}. Tala DZ ne perçoit aucune somme.', { nom: offre.vendeur?.nom || t('commande.leVendeur', 'le vendeur') })}
            </DialogDescription>
          </DialogHeader>

          {faite ? (
            <div className="space-y-4 text-sm">
              <p className="flex items-center gap-2 font-semibold text-green-700">
                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                {t('commande.prevenu', '{{nom}} a été prévenu(e) de votre commande.', { nom: faite.vendeur.nom || t('commande.leVendeur', 'le vendeur') })}
              </p>
              <p className="font-semibold">
                {faite.prix_a_confirmer
                  ? t('commande.montantAConfirmer', 'Montant à confirmer par le vendeur (à partir de {{montant}})', { montant: formatPrice(faite.montant_total) })
                  : t('commande.aPayer', 'À payer : {{montant}}', { montant: formatPrice(faite.montant_total) })}
                {faite.frais_envoi === null && ` ${t('commande.plusFrais', '+ frais d’envoi à convenir')}`}
              </p>
              {faite.moyens && (
                <div className="space-y-2 rounded-lg border p-3">
                  <p>{t('commande.payez', 'Payez directement {{nom}} :', { nom: faite.vendeur.nom || t('commande.leVendeur', 'le vendeur') })}</p>
                  <ListeMoyensPaiement moyens={faite.moyens} />
                </div>
              )}
              <p className="text-muted-foreground">{t('commande.suite', 'Le vendeur confirmera la réception du paiement, puis l’envoi. Vous serez prévenu(e) à chaque étape.')}</p>
              <Button asChild variant="outline" className="w-full"><Link to="/mes-commandes">{t('commande.voirMesCommandes', 'Voir mes commandes')}</Link></Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm">
                {offre.prix_max
                  ? t('commande.prixFourchette', 'Prix : de {{min}} à {{max}} (le vendeur confirme le montant)', { min: formatPrice(offre.prix), max: formatPrice(offre.prix_max) })
                  : t('commande.prixUnitaire', 'Prix : {{prix}}', { prix: formatPrice(offre.prix) })}
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="cmd-quantite">{t('commande.quantite', 'Quantité')}</Label>
                <Input id="cmd-quantite" type="number" min={1} max={maxQuantite} value={quantite} className="w-28"
                  onChange={(e) => setQuantite(Math.max(1, Math.min(maxQuantite, Number(e.target.value) || 1)))} />
                {offre.stock !== null && offre.stock !== undefined && (
                  <p className="text-xs text-muted-foreground">{t('commande.stock', 'Il en reste {{n}}.', { n: offre.stock })}</p>
                )}
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{t('commande.livraisonTitre', 'Livraison')}</legend>
                {modes.map((m) => (
                  <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="cmd-livraison" value={m} checked={livraison === m} onChange={() => setLivraison(m)} />
                    {libelleMode(m)}
                  </label>
                ))}
              </fieldset>

              {avecAdresse && (
                <div className="space-y-1.5">
                  <Label htmlFor="cmd-adresse">{t('commande.adresse', 'Adresse de livraison')}</Label>
                  <Textarea id="cmd-adresse" dir="auto" rows={3} maxLength={500} value={adresse} onChange={(e) => setAdresse(e.target.value)}
                    placeholder={t('commande.adresseExemple', 'Nom, rue, ville, wilaya ou pays')} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="cmd-tel">{t('commande.telephone', 'Téléphone (facultatif)')}</Label>
                <Input id="cmd-tel" type="tel" inputMode="tel" maxLength={30} value={telephone} onChange={(e) => setTelephone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cmd-message">{t('commande.message', 'Message au vendeur (facultatif)')}</Label>
                <Textarea id="cmd-message" dir="auto" rows={2} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>

              <p className="font-semibold">
                {t('commande.total', 'Total : {{montant}}', { montant: formatPrice(total) })}
                {(livraison === 'a_convenir') && ` ${t('commande.plusFrais', '+ frais d’envoi à convenir')}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('commande.partage', 'Le vendeur verra votre nom, votre adresse e-mail et, si vous les indiquez, votre adresse de livraison et votre téléphone.')}
              </p>

              {erreur && <p role="alert" className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" aria-hidden="true" />{erreur}</p>}
              <Button className="w-full" onClick={envoyer} disabled={envoi}>
                {envoi && <Loader2 className="h-4 w-4 me-2 animate-spin" aria-hidden="true" />}
                {t('commande.valider', 'Envoyer la commande')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CommanderOeuvre;
