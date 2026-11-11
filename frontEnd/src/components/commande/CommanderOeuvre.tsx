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
import { detailsDesChamps, echecEnvoi } from '@/utils/erreurServeur';
import { SaisieConserveeAvis, useSaisieConservee } from '@/hooks/useSaisieConservee';

const ORDRE: ModeLivraison[] = ['algerie', 'etranger', 'main_propre', 'a_convenir'];

type ErreursCommande = Partial<Record<'livraison' | 'adresse' | 'telephone', string>>;

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
  // Texte en cours de saisie (avant : effacer puis taper « 3 » donnait « 13 »)
  const [saisieQuantite, setSaisieQuantite] = useState<string | null>(null);
  const [livraison, setLivraison] = useState<ModeLivraison | ''>('');
  const [adresse, setAdresse] = useState('');
  const [telephone, setTelephone] = useState('');
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [erreursChamps, setErreursChamps] = useState<ErreursCommande>({});
  const [faite, setFaite] = useState<Commande | null>(null);
  // Session expirée pendant la saisie : commande en cours conservée, fenêtre rouverte au retour (audit V11 FRM-23).
  // Avant le « return » anticipé plus bas (règle des hooks).
  const { restauree, oublier } = useSaisieConservee({
    cle: `commande-oeuvre:${idOeuvre}`,
    valeur: { quantite, livraison, adresse, telephone, message },
    restaurer: (v) => {
      setQuantite(v.quantite || 1);
      setLivraison(v.livraison || '');
      setAdresse(v.adresse || '');
      setTelephone(v.telephone || '');
      setMessage(v.message || '');
      setOuvert(true);
    },
    actif: ouvert && !faite,
  });

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

  // Erreur sous le champ concerné, le curseur y va (avant : en bas de la fenêtre, champ non marqué)
  const montrerErreursChamps = (erreurs: ErreursCommande) => {
    setErreursChamps(erreurs);
    const premier = (['livraison', 'adresse', 'telephone'] as const).find((c) => erreurs[c]);
    if (premier) requestAnimationFrame(() => document.getElementById(premier === 'livraison' ? 'cmd-livraison' : `cmd-${premier === 'adresse' ? 'adresse' : 'tel'}`)?.focus());
  };

  const envoyer = async () => {
    const erreurs: ErreursCommande = {};
    if (!livraison) erreurs.livraison = t('commande.choisirLivraison', 'Choisissez la livraison.');
    if (avecAdresse && !adresse.trim()) erreurs.adresse = t('commande.adresseRequise', 'Indiquez l’adresse de livraison.');
    // Même règle que le serveur
    if (telephone.trim() && !/^[+\d][\d\s.()-]{5,29}$/.test(telephone.trim())) erreurs.telephone = t('commande.telephoneInvalide', 'Numéro de téléphone invalide (chiffres, espaces, + au début).');
    setErreur(null);
    if (Object.keys(erreurs).length || !livraison) { montrerErreursChamps(erreurs); return; }
    setErreursChamps({});
    setEnvoi(true);
    try {
      const r = await commandeService.commander({
        id_oeuvre: idOeuvre, quantite, livraison,
        adresse: avecAdresse ? adresse.trim() : undefined,
        telephone: telephone.trim() || undefined,
        message: message.trim() || undefined,
      });
      if (!r?.success || !r.data) throw r;
      oublier();
      setFaite(r.data);
    } catch (err) {
      // Refus du serveur sur un champ : sous ce champ ; sinon un message qui dit si la commande est partie
      const parChamp: ErreursCommande = {};
      for (const d of detailsDesChamps(err)) {
        if ((d.field === 'adresse' || d.field === 'telephone' || d.field === 'livraison') && d.message) parChamp[d.field] = d.message;
      }
      if (Object.keys(parChamp).length) { montrerErreursChamps(parChamp); return; }
      setErreur(echecEnvoi(err, {
        defaut: t('commande.nonEnvoyee', 'La commande n’est pas partie. Vérifiez votre connexion puis appuyez de nouveau sur « Envoyer la commande ».'),
        nonParti: t('commande.nonEnvoyee', 'La commande n’est pas partie. Vérifiez votre connexion puis appuyez de nouveau sur « Envoyer la commande ».'),
        // Elle est peut-être enregistrée : vérifier avant de recommencer (pas de commande en double)
        reponseTarde: t('commande.reponseTarde', 'La réponse tarde. Ouvrez « Mes commandes » pour voir si elle est enregistrée avant de réessayer.'),
      }).erreur || null);
    } finally {
      setEnvoi(false);
    }
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
                <Input id="cmd-quantite" type="number" inputMode="numeric" min={1} max={maxQuantite} value={saisieQuantite ?? quantite} className="w-28"
                  onChange={(e) => {
                    setSaisieQuantite(e.target.value);
                    if (e.target.value !== '') setQuantite(Math.max(1, Math.min(maxQuantite, Number(e.target.value) || 1)));
                  }}
                  onBlur={() => setSaisieQuantite(null)} />
                {offre.unique && (
                  <p className="text-xs text-muted-foreground">{t('commande.unique', 'Œuvre unique : une seule pièce.')}</p>
                )}
                {!offre.unique && offre.stock !== null && offre.stock !== undefined && (
                  <p className="text-xs text-muted-foreground">{t('commande.stock', 'Il en reste {{n}}.', { n: offre.stock })}</p>
                )}
              </div>

              <fieldset className="space-y-2" aria-describedby={erreursChamps.livraison ? 'cmd-livraison-erreur' : undefined}>
                <legend className="text-sm font-medium">{t('commande.livraisonTitre', 'Livraison')}</legend>
                {modes.map((m, i) => (
                  <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="cmd-livraison" value={m} checked={livraison === m}
                      id={i === 0 ? 'cmd-livraison' : undefined} aria-invalid={!!erreursChamps.livraison || undefined}
                      onChange={() => { setLivraison(m); setErreursChamps((e) => ({ ...e, livraison: undefined })); }} />
                    {libelleMode(m)}
                  </label>
                ))}
                {erreursChamps.livraison && <p id="cmd-livraison-erreur" role="alert" className="text-sm text-destructive">{erreursChamps.livraison}</p>}
              </fieldset>

              {avecAdresse && (
                <div className="space-y-1.5">
                  <Label htmlFor="cmd-adresse">{t('commande.adresse', 'Adresse de livraison')} <span className="text-destructive" aria-hidden="true">*</span></Label>
                  <Textarea id="cmd-adresse" dir="auto" rows={3} maxLength={500} value={adresse}
                    onChange={(e) => { setAdresse(e.target.value); setErreursChamps((x) => ({ ...x, adresse: undefined })); }}
                    aria-invalid={!!erreursChamps.adresse || undefined}
                    aria-describedby={erreursChamps.adresse ? 'cmd-adresse-erreur' : undefined}
                    className={erreursChamps.adresse ? 'border-destructive' : ''}
                    placeholder={t('commande.adresseExemple', 'Nom, rue, ville, wilaya ou pays')} />
                  {erreursChamps.adresse && <p id="cmd-adresse-erreur" role="alert" className="text-sm text-destructive">{erreursChamps.adresse}</p>}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="cmd-tel">{t('commande.telephone', 'Téléphone (facultatif)')}</Label>
                <Input id="cmd-tel" type="tel" inputMode="tel" dir="ltr" maxLength={30} value={telephone}
                  onChange={(e) => { setTelephone(e.target.value); setErreursChamps((x) => ({ ...x, telephone: undefined })); }}
                  aria-invalid={!!erreursChamps.telephone || undefined}
                  aria-describedby={erreursChamps.telephone ? 'cmd-tel-erreur' : 'cmd-tel-aide'}
                  className={erreursChamps.telephone ? 'border-destructive' : ''} />
                <p id="cmd-tel-aide" className="text-xs text-muted-foreground">{t('common.phoneHelper')}</p>
                {erreursChamps.telephone && <p id="cmd-tel-erreur" role="alert" className="text-sm text-destructive">{erreursChamps.telephone}</p>}
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

              <SaisieConserveeAvis visible={restauree} />
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
