
import { detailsDesChamps, messageErreurServeur, useDefilerVersErreur } from '@/utils/erreurServeur';
import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BookOpen, Users, Globe, Mail, Send, Loader2, CheckCircle } from 'lucide-react';
import { useTranslation } from "react-i18next";
import SEOHead from '@/components/SEOHead';
import { httpClient } from '@/services/httpClient';
import AntiRobot, { useAntiRobot } from '@/components/shared/AntiRobot';
import { emailValide } from '@/utils/validationChamps';

const CONTACT_EMAIL = 'contact@taladz.com';

const APropos = () => {
  const { t } = useTranslation();
  const [sending, setSending] = useState(false);
  const antiRobot = useAntiRobot();
  // Sujet prérempli depuis un lien (ex. « Proposition pour le lieu : … »)
  const [formData, setFormData] = useState(() => {
    let sujet = '';
    try { sujet = (new URLSearchParams(window.location.search).get('sujet') || '').slice(0, 200); } catch { /* adresse illisible */ }
    return { prenom: '', nom: '', email: '', sujet, message: '' };
  });

  // Messages sous les champs et encadré qui restent affichés (avant : bandeaux de 5 secondes, puis un
  // formulaire vidé sans trace après l'envoi, audit V11 FRM-9)
  const [erreurs, setErreurs] = useState<{ email?: string; message?: string }>({});
  const [erreurServeur, setErreurServeur] = useState<string | null>(null);
  const refErreurServeur = useDefilerVersErreur(erreurServeur);
  const [envoyeA, setEnvoyeA] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const champ = e.target.id;
    setFormData(prev => ({ ...prev, [champ]: e.target.value }));
    if (champ === 'email' || champ === 'message') setErreurs(prev => ({ ...prev, [champ]: undefined }));
  };

  const allerAuPremierChamp = () => requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>('#contact [aria-invalid="true"]');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.focus({ preventScroll: true });
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreurServeur(null);
    const nouvelles: { email?: string; message?: string } = {};
    // Format de l'adresse : contrôlé ici depuis noValidate (avant, seule la bulle du navigateur le faisait)
    if (!formData.email.trim()) nouvelles.email = t('auth.errors.emailRequired', 'L’email est requis');
    else if (!emailValide(formData.email)) nouvelles.email = t('auth.errors.emailInvalid', 'Email invalide');
    if (!formData.message.trim()) nouvelles.message = t('apropos.messageRequis', 'Écrivez votre message.');
    else if (formData.message.trim().length < 10) nouvelles.message = t('apropos.messageTropCourt', 'Le message doit faire au moins 10 caractères.');
    setErreurs(nouvelles);
    if (nouvelles.email || nouvelles.message) { allerAuPremierChamp(); return; }

    // Refus du serveur : sous le champ concerné si possible, sinon dans l'encadré au-dessus du bouton
    const montrerRefus = (source: unknown, defaut: string) => {
      const parChamp: { email?: string; message?: string } = {};
      for (const d of detailsDesChamps(source)) {
        if ((d.field === 'email' || d.field === 'message') && d.message && !parChamp[d.field]) parChamp[d.field] = d.message;
      }
      if (parChamp.email || parChamp.message) { setErreurs(parChamp); allerAuPremierChamp(); return; }
      setErreurServeur(messageErreurServeur(source, defaut));
    };

    setSending(true);
    try {
      // httpClient : jeton anti-CSRF exigé par l'API (un fetch direct était refusé : aucun message n'arrivait)
      const data = await httpClient.post('/contact', { ...formData, ...(antiRobot.lireJeton() ? { turnstile_token: antiRobot.lireJeton() } : {}) });
      if (data.success) {
        setEnvoyeA(formData.email.trim());
        setFormData({ prenom: '', nom: '', email: '', sujet: '', message: '' });
      } else {
        montrerRefus(data, t('apropos.erreurEnvoi', 'Erreur lors de l\'envoi.'));
      }
    } catch (err) {
      montrerRefus(err, t('apropos.erreurEnvoiMessage', 'Erreur lors de l\'envoi du message.'));
    } finally {
      setSending(false);
      // Un jeton ne sert qu'une fois
      antiRobot.reinitialiser();
    }
  };
  const valeurs = [
  {
    icon: BookOpen,
    title: t("apropos.title_transmission"),
    description: t("apropos.description_prserver_transmettre_riche"),
    color: 'text-primary'
  },
  {
    icon: Users,
    title: t("apropos.title_accessibilit"),
    description: t("apropos.description_rendre_culture_accessible"),
    color: 'text-secondary'
  },
  {
    icon: Globe,
    title: t("apropos.title_visibilit_locale_internationale"),
    description: t("apropos.description_mettre_lumire_richesse"),
    color: 'text-accent'
  }];


  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={t("apropos.titreCourt", "À propos")}
        description={t("seo.aproposDescription", "Découvrez la mission de Tala DZ : préserver, transmettre et rendre accessible le patrimoine culturel algérien à travers une plateforme numérique collaborative.")}
        keywords={['à propos', 'culture algérienne', 'mission', 'patrimoine', 'contact', 'équipe']}
        type="website"
      />
      <Header />

      <main className="container py-12">
        {/* En-tête */}
        <div className="text-center space-y-4 mb-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-serif text-gradient">{t("apropos.propos_culture_algrie")}

          </h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          {/* Mission */}
          <div className="space-y-6">
            <Card className="p-8">
              <h2 className="text-2xl font-semibold mb-6 font-serif">{t("apropos.notre_mission")}</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>{t("apropos.culture_algrie_est")}


                </p>
                <p>{t("apropos.notre_mission_mettre")}



                </p>
              </div>
            </Card>

            {/* Valeurs */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold font-serif">{t("apropos.nos_valeurs")}</h2>
              {valeurs.map((valeur) =>
              <Card key={valeur.title} className="p-6 hover-lift">
                  <div className="flex items-start space-x-4 rtl:space-x-reverse">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-current/10 ${valeur.color}`}>
                      <valeur.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">{valeur.title}</h3>
                      <p className="text-sm text-muted-foreground">{valeur.description}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-6">
            <Card className="p-8">
              <div className="flex items-center space-x-3 rtl:space-x-reverse mb-6">
                <Mail className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-semibold font-serif">{t("apropos.nous_contacter")}</h2>
              </div>
              
              {/* Message parti : un encadré reste à la place du formulaire (avant : 5 secondes puis plus rien) */}
              {envoyeA ? (
                <div id="contact" className="space-y-4 scroll-mt-24 rounded-lg border border-primary/30 bg-primary/5 p-4" role="status">
                  <p className="font-medium flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" aria-hidden="true" />
                    {t('apropos.merciEnvoye', 'Merci, votre message est bien parti.')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('apropos.reponseA', 'Nous vous répondrons à l’adresse {{email}}.', { email: `⁦${envoyeA}⁩` })}
                  </p>
                  <Button type="button" variant="outline" onClick={() => setEnvoyeA(null)}>
                    {t('apropos.autreMessage', 'Écrire un autre message')}
                  </Button>
                </div>
              ) : (
              /* noValidate : les messages du site, traduits, remplacent la bulle du navigateur */
              <form id="contact" className="space-y-4 scroll-mt-24" onSubmit={handleSubmit} noValidate>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prenom">{t("apropos.prnom")}</Label>
                    <Input id="prenom" maxLength={100} value={formData.prenom} onChange={handleChange} placeholder={t("apropos.placeholder_votre_prnom")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nom">{t("apropos.nom")}</Label>
                    <Input id="nom" maxLength={100} value={formData.nom} onChange={handleChange} placeholder={t("apropos.placeholder_votre_nom")} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t("apropos.email")} <span className="text-destructive" aria-hidden="true">*</span></Label>
                  <Input id="email" type="email" autoComplete="email" required maxLength={255} value={formData.email} onChange={handleChange} placeholder={t("apropos.placeholder_votreemailexemplecom")}
                    dir="ltr" aria-invalid={!!erreurs.email || undefined} aria-describedby={erreurs.email ? 'contact-email-erreur' : undefined} />
                  {erreurs.email && <p id="contact-email-erreur" role="alert" className="text-sm text-destructive">{erreurs.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sujet">{t("apropos.sujet")}</Label>
                  <Input id="sujet" maxLength={200} value={formData.sujet} onChange={handleChange} placeholder={t("apropos.placeholder_objet_votre_message")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">{t("apropos.message")} <span className="text-destructive" aria-hidden="true">*</span></Label>
                  <Textarea
                    id="message"
                    minLength={10}
                    maxLength={2000}
                    aria-describedby={erreurs.message ? 'contact-message-erreur message-compteur' : 'message-compteur'}
                    aria-invalid={!!erreurs.message || undefined}
                    required
                    value={formData.message}
                    onChange={handleChange}
                    placeholder={t("apropos.placeholder_votre_message")}
                    className="min-h-[120px]" />
                  {erreurs.message && <p id="contact-message-erreur" role="alert" className="text-sm text-destructive">{erreurs.message}</p>}
                  <p id="message-compteur" className="text-xs text-muted-foreground text-end">{formData.message.length} / 2000</p>
                </div>

                <AntiRobot ref={antiRobot.ref} action="contact" onJeton={antiRobot.setJeton} />

                {erreurServeur && (
                  <div ref={refErreurServeur} role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{erreurServeur}</div>
                )}

                <Button type="submit" className="w-full btn-hover" disabled={sending || antiRobot.manquant}>
                  {sending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Send className="h-4 w-4 me-2" />}
                  {t("apropos.envoyer_message")}
                </Button>
              </form>
              )}
            </Card>

            {/* Contact direct */}
            <Card className="p-6 bg-primary/5 border-primary/20">
              <h3 className="font-semibold mb-3">{t("apropos.contact_direct")}</h3>
              <p className="text-sm text-muted-foreground mb-2">{t("apropos.pour_toute_question")}

              </p>
              <p className="text-primary font-medium">{t("apropos.contactculturealgeriedz")}</p>
            </Card>
          </div>
        </div>
        {/* ═══════════════════════════════════════════════════════════
            SECTIONS LÉGALES (RGPD Art. 12-14)
            ═══════════════════════════════════════════════════════════ */}
        <div className="space-y-8 mb-16">

          {/* ── CONDITIONS D'UTILISATION ── */}
          <Card className="p-8" id="conditions">
            <h2 className="text-2xl font-semibold mb-6 font-serif">{t("apropos.conditions", "Conditions d'utilisation")}</h2>
            <div className="text-sm text-muted-foreground space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">{t("apropos.cgu.objet", "1. Objet")}</h3>
                <p>{t("apropos.cgu.objetText", "Les présentes conditions générales d'utilisation (CGU) régissent l'accès et l'utilisation de la plateforme Tala DZ (taladz.com), ci-après « la Plateforme ». En créant un compte ou en utilisant la Plateforme, vous acceptez sans réserve les présentes CGU ainsi que la Politique de confidentialité.")}</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">{t("apropos.cgu.acces", "2. Accès et inscription")}</h3>
                <p>{t("apropos.cgu.accesText", "L'accès à la Plateforme est gratuit pour les visiteurs. La création d'un compte est gratuite et ouverte aux personnes âgées d'au moins 13 ans. Les comptes professionnels sont soumis à validation par notre équipe de modération. Vous êtes responsable de la confidentialité de vos identifiants de connexion.")}</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">{t("apropos.cgu.contenu", "3. Contenu publié")}</h3>
                <p>{t("apropos.cgu.contenuText", "Vous conservez la propriété intellectuelle de vos contenus. En publiant sur la Plateforme, vous accordez à Tala DZ une licence non exclusive et gratuite pour afficher, distribuer et promouvoir vos contenus dans le cadre de la Plateforme. Le contenu publié doit respecter les lois en vigueur, les droits d'auteur et ne doit contenir aucun propos diffamatoire, discriminatoire ou illicite. Nous nous réservons le droit de modérer ou supprimer tout contenu inapproprié.")}</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">{t("apropos.cgu.responsabilite", "4. Responsabilité")}</h3>
                <p>{t("apropos.cgu.responsabiliteText", "Tala DZ met tout en œuvre pour assurer la disponibilité et la sécurité de la Plateforme, sans garantie d'un fonctionnement ininterrompu. Nous ne saurions être tenus responsables des contenus publiés par les utilisateurs. En cas de litige, le droit algérien est applicable.")}</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">{t("apropos.cgu.modification", "5. Modification des CGU")}</h3>
                <p>{t("apropos.cgu.modificationText", "Nous pouvons modifier les présentes CGU à tout moment. Les utilisateurs seront informés par notification sur la Plateforme. L'utilisation continue après modification vaut acceptation des nouvelles conditions.")}</p>
              </div>
            </div>
          </Card>

          {/* ── POLITIQUE DE CONFIDENTIALITÉ (RGPD Art. 13) ── */}
          <Card className="p-8" id="confidentialite">
            <h2 className="text-2xl font-semibold mb-6 font-serif">{t("apropos.confidentialite", "Politique de confidentialité")}</h2>
            <div className="text-sm text-muted-foreground space-y-4">

              <div>
                <h3 className="font-semibold text-foreground mb-2">{t("apropos.privacy.responsable", "1. Responsable du traitement")}</h3>
                <p>{t("apropos.privacy.responsableText", "Le responsable du traitement des données personnelles est Tala DZ, accessible à l'adresse taladz.com. Pour toute question relative à la protection de vos données, vous pouvez nous contacter à l'adresse : contact@taladz.com.")}</p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">{t("apropos.privacy.donnees", "2. Données collectées")}</h3>
                <p className="mb-2">{t("apropos.privacy.donneesIntro", "Nous collectons uniquement les données nécessaires au fonctionnement de la Plateforme :")}</p>
                <ul className="list-disc list-inside space-y-1 ms-2">
                  <li>{t("apropos.privacy.donneesIdentite", "Données d'identité : nom, prénom, adresse email (obligatoires à l'inscription)")}</li>
                  <li>{t("apropos.privacy.donneesOptionnelles", "Données optionnelles : date de naissance, sexe, téléphone, adresse, photo de profil, biographie")}</li>
                  <li>{t("apropos.privacy.donneesPro", "Données professionnelles (si applicable) : entreprise, spécialités, certifications, site web")}</li>
                  <li>{t("apropos.privacy.donneesNavigation", "Données de navigation : adresse IP (anonymisée), pages consultées, type d'appareil")}</li>
                </ul>
                <p className="mt-2 font-medium text-foreground">{t("apropos.privacy.pasDeVente", "Vos informations personnelles ne sont jamais vendues à des tiers.")}</p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">{t("apropos.privacy.finalites", "3. Finalités et base légale")}</h3>
                <ul className="list-disc list-inside space-y-1 ms-2">
                  <li>{t("apropos.privacy.finaliteCompte", "Gestion de votre compte et authentification — base légale : exécution du contrat (CGU)")}</li>
                  <li>{t("apropos.privacy.finaliteContenu", "Publication et affichage de vos contenus culturels — base légale : exécution du contrat")}</li>
                  <li>{t("apropos.privacy.finaliteStats", "Statistiques anonymisées de fréquentation — base légale : intérêt légitime")}</li>
                  <li>{t("apropos.privacy.finaliteNewsletter", "Envoi de la newsletter (uniquement si vous l'avez acceptée) — base légale : consentement, retirable à tout moment via le lien présent dans chaque email ou la section « Mes données »")}</li>
                  <li>{t("apropos.privacy.finaliteSecurite", "Sécurité de la Plateforme (prévention des abus) — base légale : intérêt légitime")}</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">{t("apropos.privacy.conservation", "4. Durée de conservation")}</h3>
                <ul className="list-disc list-inside space-y-1 ms-2">
                  <li>{t("apropos.privacy.conservationCompte", "Données de compte : conservées tant que votre compte est actif")}</li>
                  <li>{t("apropos.privacy.conservationNotifs", "Notifications : supprimées automatiquement après 90 jours")}</li>
                  <li>{t("apropos.privacy.conservationLogs", "Journaux de sécurité et de connexion : l'adresse IP et le navigateur sont effacés après 12 mois")}</li>
                  <li>{t("apropos.privacy.conservationSuppression", "En cas de suppression de compte : vos données personnelles sont effacées, vos contributions publiques sont anonymisées")}</li>
                  <li>{t("apropos.privacy.conservationSauvegardes", "Sauvegardes de sécurité : conservées 7 jours ; les données d'un compte supprimé en disparaissent dans ce délai")}</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">{t("apropos.privacy.droits", "5. Vos droits")}</h3>
                <p className="mb-2">{t("apropos.privacy.droitsIntro", "Conformément à la législation en vigueur et au RGPD, vous disposez des droits suivants :")}</p>
                <ul className="list-disc list-inside space-y-1 ms-2">
                  <li><strong>{t("apropos.privacy.droitAcces", "Droit d'accès")}</strong> {t("apropos.privacy.droitAccesDesc", "— consulter et exporter toutes vos données depuis votre profil")}</li>
                  <li><strong>{t("apropos.privacy.droitRectification", "Droit de rectification")}</strong> {t("apropos.privacy.droitRectificationDesc", "— modifier vos informations personnelles à tout moment")}</li>
                  <li><strong>{t("apropos.privacy.droitSuppression", "Droit à l'effacement")}</strong> {t("apropos.privacy.droitSuppressionDesc", "— supprimer votre compte et toutes vos données personnelles")}</li>
                  <li><strong>{t("apropos.privacy.droitPortabilite", "Droit à la portabilité")}</strong> {t("apropos.privacy.droitPortabiliteDesc", "— exporter vos données dans un format lisible par machine (JSON)")}</li>
                  <li><strong>{t("apropos.privacy.droitOpposition", "Droit d'opposition")}</strong> {t("apropos.privacy.droitOppositionDesc", "— gérer vos préférences de notifications et de confidentialité")}</li>
                </ul>
                <p className="mt-2">{t("apropos.privacy.droitsExercice", "Pour exercer vos droits, rendez-vous dans la section « Mes données » de votre profil (export, suppression du compte, newsletter) ou contactez-nous à contact@taladz.com.")}</p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">{t("apropos.privacy.soustraitants", "6. Sous-traitants")}</h3>
                <p className="mb-2">{t("apropos.privacy.soustraitantsIntro", "Pour assurer le fonctionnement de la Plateforme, nous faisons appel aux services suivants :")}</p>
                <ul className="list-disc list-inside space-y-1 ms-2">
                  <li>{t("apropos.privacy.soustraitantCloudinary", "Cloudinary — hébergement des images et médias que vous publiez (serveurs situés hors d'Algérie)")}</li>
                  <li>{t("apropos.privacy.soustraitantEmail", "Prestataire d'envoi d'emails (SMTP) — emails transactionnels et newsletter (votre adresse email)")}</li>
                  <li>{t('apropos.privacy.soustraitantPush')}</li>
                  <li>{t("apropos.privacy.soustraitantOSM", "OpenStreetMap / Nominatim — fonds de carte et géocodage : votre adresse IP est transmise à leurs serveurs lorsqu'une carte s'affiche")}</li>
                </ul>
                <p className="mt-2">{t("apropos.privacy.soustraitantsPas", "Aucune donnée personnelle n'est vendue, louée ou cédée à des fins commerciales. Les polices de caractères et icônes sont hébergées par la Plateforme elle-même.")}</p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">{t("apropos.privacy.cookies", "7. Cookies")}</h3>
                <p>{t("apropos.privacy.cookiesText", "La Plateforme utilise uniquement des cookies strictement nécessaires au fonctionnement (authentification, préférence de langue, sécurité CSRF). Aucun cookie publicitaire ou de traçage tiers n'est utilisé.")}</p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">{t("apropos.privacy.reclamation", "8. Droit de réclamation")}</h3>
                <p>{t("apropos.privacy.reclamationText", "Si vous estimez que le traitement de vos données ne respecte pas la réglementation, vous pouvez introduire une réclamation auprès de l'autorité de protection des données de votre pays (en France : CNIL — cnil.fr, en Algérie : ANPDP).")}</p>
              </div>
            </div>
          </Card>

          {/* ── MENTIONS LÉGALES ── */}
          <Card className="p-8" id="mentions-legales">
            <h2 className="text-2xl font-semibold mb-6 font-serif">{t("apropos.mentionsLegales", "Mentions légales")}</h2>
            <div className="text-sm text-muted-foreground space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">{t("apropos.mentions.editeur", "Éditeur de la Plateforme")}</h3>
                <p>{t("apropos.mentions.editeurText", "Tala DZ — Plateforme collaborative de valorisation du patrimoine culturel algérien.")}</p>
                <p>{t("apropos.mentions.editeurContact", "Contact : contact@taladz.com")}</p>
                <p>{t("apropos.mentions.editeurSite", "Site web : taladz.com")}</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">{t("apropos.mentions.hebergeur", "Hébergement")}</h3>
                <p>{t("apropos.mentions.hebergeurText", "La Plateforme est hébergée sur un serveur VPS dédié sécurisé (HTTPS, certificat Let's Encrypt).")}</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">{t("apropos.mentions.dpo", "Protection des données")}</h3>
                <p>{t("apropos.mentions.dpoText", "Pour toute question relative à la protection de vos données personnelles, vous pouvez contacter notre délégué à la protection des données à l'adresse : contact@taladz.com.")}</p>
              </div>
            </div>
          </Card>

          {/* ── RESSOURCES ── */}
          <Card className="p-8" id="ressources">
            <h2 className="text-2xl font-semibold mb-4 font-serif">{t("apropos.ressources", "Ressources")}</h2>
            <div className="text-sm text-muted-foreground space-y-3">
              <p>{t("apropos.ressourcesText", "Tala DZ met à disposition des ressources pour découvrir et promouvoir le patrimoine culturel algérien : événements, œuvres, artisanat, sites patrimoniaux et bien plus.")}</p>
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </div>);

};

export default APropos;