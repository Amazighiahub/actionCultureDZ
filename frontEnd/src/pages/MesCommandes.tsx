/**
 * « Mes commandes » : mes achats (comment payer, où en est la commande) et, pour un professionnel,
 * mes ventes (adresse de livraison, « Paiement reçu », « Envoyée », annuler, fixer le montant).
 * L'argent va directement de l'acheteur au vendeur : Tala DZ n'encaisse rien.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CheckCircle, Clock, Loader2, Package, ShoppingBag, Truck, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { useFormatDate } from '@/hooks/useFormatDate';
import ListeMoyensPaiement from '@/components/paiement/ListeMoyensPaiement';
import { commandeService, type Commande, type StatutCommande } from '@/services/commande.service';
import { oeuvrePath } from '@/utils/slug';
import { messageErreurServeur } from '@/utils/erreurServeur';

const STYLE: Record<StatutCommande, { icone: React.ElementType; classe: string }> = {
  en_attente: { icone: Clock, classe: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200' },
  payee: { icone: CheckCircle, classe: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' },
  envoyee: { icone: Truck, classe: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' },
  annulee: { icone: XCircle, classe: 'bg-muted text-muted-foreground' },
};

const CarteCommande: React.FC<{ c: Commande; onMaj: (c: Commande) => void }> = ({ c, onMaj }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { formatPrice } = useLocalizedNumber();
  const { formatDate } = useFormatDate();
  const [enCours, setEnCours] = useState(false);
  const [montant, setMontant] = useState('');
  const vendeur = c.role === 'vendeur';
  const S = STYLE[c.statut];

  const statutLibelle: Record<StatutCommande, string> = {
    en_attente: vendeur ? t('commande.statut.aPayerVendeur', 'En attente du paiement') : t('commande.statut.aPayer', 'À payer'),
    payee: vendeur ? t('commande.statut.aEnvoyer', 'Payée · à envoyer') : t('commande.statut.payee', 'Paiement reçu par le vendeur'),
    envoyee: c.livraison === 'main_propre' ? t('commande.statut.prete', 'Prête / remise') : t('commande.statut.envoyee', 'Envoyée'),
    annulee: t('commande.statut.annulee', 'Annulée'),
  };
  const livraisonLibelle = {
    algerie: t('commande.livraison.algerie', 'Envoi en Algérie'),
    etranger: t('commande.livraison.etranger', 'Envoi à l’étranger'),
    main_propre: t('commande.livraison.mainPropre', 'Remise en main propre'),
    a_convenir: t('commande.livraison.aConvenir', 'Livraison à convenir avec le vendeur'),
  }[c.livraison];

  const agir = async (d: { statut?: StatutCommande; montant_total?: number }, question?: string) => {
    if (question && !window.confirm(question)) return;
    setEnCours(true);
    const r = await commandeService.mettreAJour(c.id_commande, d).catch(() => null);
    setEnCours(false);
    if (r?.success && r.data) { onMaj(r.data); setMontant(''); }
    else toast({ title: t('common.error', 'Erreur'), description: messageErreurServeur(r, t('common.errorOccurred', 'Une erreur est survenue')), variant: 'destructive' });
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {c.id_oeuvre
              ? <Link to={oeuvrePath(c.id_oeuvre, c.titre)} className="font-semibold hover:underline underline-offset-4" dir="auto">{c.titre}</Link>
              : <span className="font-semibold" dir="auto">{c.titre}</span>}
            <p className="text-muted-foreground">
              {vendeur ? t('commande.par', 'Commandé par {{nom}}', { nom: c.acheteur.nom }) : t('commande.vendeurNom', 'Vendu par {{nom}}', { nom: c.vendeur.nom })}
              {' · '}{formatDate(c.date_creation, { dateStyle: 'medium' })}
            </p>
          </div>
          <Badge className={`gap-1 ${S.classe}`} variant="secondary"><S.icone className="h-3.5 w-3.5" aria-hidden="true" />{statutLibelle[c.statut]}</Badge>
        </div>

        <p>
          {c.quantite > 1 && `${c.quantite} × ${formatPrice(c.prix_unitaire)} · `}
          {livraisonLibelle}{c.frais_envoi ? ` (${formatPrice(c.frais_envoi)})` : ''}
          {' · '}<b>{c.prix_a_confirmer ? t('commande.aPartirDe', 'à partir de {{m}}', { m: formatPrice(c.montant_total) }) : formatPrice(c.montant_total)}</b>
          {c.frais_envoi === null && c.livraison === 'a_convenir' && ` ${t('commande.plusFrais', '+ frais d’envoi à convenir')}`}
        </p>

        {(c.adresse || c.telephone || (vendeur && c.acheteur.email)) && (
          <div className="rounded-md bg-muted/50 p-2 space-y-0.5">
            {c.adresse && <p dir="auto" className="whitespace-pre-line">{c.adresse}</p>}
            {c.telephone && <p><bdi>{c.telephone}</bdi></p>}
            {vendeur && c.acheteur.email && <p><a href={`mailto:${c.acheteur.email}`} className="text-primary hover:underline">{c.acheteur.email}</a></p>}
          </div>
        )}
        {c.message && <p dir="auto" className="whitespace-pre-line italic text-muted-foreground">« {c.message} »</p>}

        {/* Acheteur : comment payer, tant qu'il n'a pas payé */}
        {!vendeur && c.statut === 'en_attente' && c.vendeur_indisponible && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-destructive">
            {t('commande.vendeurIndisponible', 'Ce vendeur n’est plus disponible sur Tala DZ : ne le payez pas. Annulez cette commande.')}
          </p>
        )}
        {!vendeur && c.statut === 'en_attente' && c.moyens_modifies && (
          <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-2 text-amber-800 dark:text-amber-200">
            {t('commande.moyensModifies', 'Attention : le vendeur a changé ses coordonnées de paiement depuis votre commande. Vérifiez avec lui avant de payer.')}
          </p>
        )}
        {!vendeur && c.statut === 'en_attente' && c.moyens && (
          <div className="space-y-2 rounded-lg border p-3">
            <p>{t('commande.payez', 'Payez directement {{nom}} :', { nom: c.vendeur.nom || t('commande.leVendeur', 'le vendeur') })}</p>
            <ListeMoyensPaiement moyens={c.moyens} />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {vendeur && c.statut === 'en_attente' && (
            <>
              <Button size="sm" disabled={enCours} onClick={() => agir({ statut: 'payee' })}>
                <CheckCircle className="h-4 w-4 me-1" aria-hidden="true" />{t('commande.action.paiementRecu', 'Paiement reçu')}
              </Button>
              {c.montant_bornes && (
              <div className="flex items-center gap-1">
                <Input type="number" min={c.montant_bornes.min} max={c.montant_bornes.max} value={montant} onChange={(e) => setMontant(e.target.value)} className="h-9 w-28"
                  aria-label={t('commande.action.montant', 'Montant final (DA)')} placeholder={t('commande.action.montantCourt', 'Montant DA')} />
                <Button size="sm" variant="outline" disabled={enCours || !Number(montant)} onClick={() => agir({ montant_total: Number(montant) })}>
                  {t('commande.action.fixerMontant', 'Fixer le montant')}
                </Button>
                <span className="text-xs text-muted-foreground">{t('commande.action.bornes', 'de {{min}} à {{max}}', { min: formatPrice(c.montant_bornes.min), max: formatPrice(c.montant_bornes.max) })}</span>
              </div>
              )}
            </>
          )}
          {vendeur && c.statut === 'payee' && (
            <Button size="sm" disabled={enCours} onClick={() => agir({ statut: 'envoyee' })}>
              <Package className="h-4 w-4 me-1" aria-hidden="true" />
              {c.livraison === 'main_propre' ? t('commande.action.remise', 'Remise / prête') : t('commande.action.envoyee', 'Envoyée')}
            </Button>
          )}
          {((vendeur && (c.statut === 'en_attente' || c.statut === 'payee')) || (!vendeur && c.statut === 'en_attente')) && (
            <Button size="sm" variant="ghost" className="text-destructive" disabled={enCours}
              onClick={() => agir({ statut: 'annulee' }, t('commande.action.confirmerAnnulation', 'Annuler cette commande ?'))}>
              {t('commande.action.annuler', 'Annuler')}
            </Button>
          )}
          {enCours && <Loader2 className="h-4 w-4 animate-spin self-center" aria-hidden="true" />}
        </div>
      </CardContent>
    </Card>
  );
};

const ListeCommandes: React.FC<{ charger: () => Promise<{ success: boolean; data?: Commande[] }>; vide: string }> = ({ charger, vide }) => {
  const [lignes, setLignes] = useState<Commande[] | null>(null);
  const recharger = useCallback(() => {
    charger().then((r) => setLignes(r?.success && r.data ? r.data : [])).catch(() => setLignes([]));
  }, [charger]);
  useEffect(() => { recharger(); }, [recharger]);
  if (!lignes) return <Loader2 className="h-6 w-6 animate-spin mx-auto my-8" aria-hidden="true" />;
  if (!lignes.length) return <p className="text-center text-muted-foreground py-10">{vide}</p>;
  return (
    <div className="space-y-3">
      {lignes.map((c) => <CarteCommande key={c.id_commande} c={c} onMaj={(n) => setLignes((l) => (l || []).map((x) => (x.id_commande === n.id_commande ? n : x)))} />)}
    </div>
  );
};

const MesCommandes: React.FC = () => {
  const { t } = useTranslation();
  const { isProfessional } = useAuth();
  const [onglet, setOnglet] = useState(isProfessional ? 'ventes' : 'achats');
  const achats = useCallback(() => commandeService.mesAchats(), []);
  const ventes = useCallback(() => commandeService.mesVentes(), []);

  useEffect(() => { document.title = `${t('commande.mesCommandes', 'Mes commandes')} | Tala DZ`; }, [t]);

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-serif font-bold flex items-center gap-2 mb-2">
        <ShoppingBag className="h-6 w-6 text-primary" aria-hidden="true" />{t('commande.mesCommandes', 'Mes commandes')}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">{t('paiement.mentionCommandes', 'Les paiements se font directement entre l’acheteur et le vendeur. Tala DZ ne perçoit aucune somme et ne prend aucune commission.')}</p>
      <Tabs value={onglet} onValueChange={setOnglet}>
        <TabsList>
          {isProfessional && <TabsTrigger value="ventes">{t('commande.mesVentes', 'Mes ventes')}</TabsTrigger>}
          <TabsTrigger value="achats">{t('commande.mesAchats', 'Mes achats')}</TabsTrigger>
        </TabsList>
        {isProfessional && (
          <TabsContent value="ventes" className="mt-4">
            <ListeCommandes charger={ventes} vide={t('commande.aucuneVente', 'Aucune commande reçue pour l’instant. Indiquez vos moyens de paiement et vos frais d’envoi dans votre tableau de bord : le bouton « Commander » apparaîtra sur vos œuvres qui ont un prix.')} />
          </TabsContent>
        )}
        <TabsContent value="achats" className="mt-4">
          <ListeCommandes charger={achats} vide={t('commande.aucunAchat', 'Vous n’avez encore rien commandé.')} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MesCommandes;
