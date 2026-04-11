
import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BookOpen, Users, Globe, Mail, Send, Loader2 } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { useToast } from '@/components/ui/use-toast';
import SEOHead from '@/components/SEOHead';

const CONTACT_EMAIL = 'contact@taladz.com';

const APropos = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({ prenom: '', nom: '', email: '', sujet: '', message: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.message) {
      toast({ title: t('apropos.champsRequis', 'Champs requis'), description: t('apropos.emailMessageRequis', 'L\'email et le message sont obligatoires.'), variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: t('apropos.messageEnvoye', 'Message envoyé'), description: t('apropos.messageEnvoyeDesc', 'Nous avons bien reçu votre message. Nous vous répondrons rapidement.') });
        setFormData({ prenom: '', nom: '', email: '', sujet: '', message: '' });
      } else {
        toast({ title: t('common.error', 'Erreur'), description: data.error || t('apropos.erreurEnvoi', 'Erreur lors de l\'envoi.'), variant: 'destructive' });
      }
    } catch {
      toast({ title: t('common.error', 'Erreur'), description: t('apropos.erreurEnvoi', 'Erreur lors de l\'envoi du message.'), variant: 'destructive' });
    } finally {
      setSending(false);
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
        title={t("apropos.propos_culture_algrie", "À propos de Culture Algérie")}
        description="Découvrez la mission de Culture Algérie : préserver, transmettre et rendre accessible le patrimoine culturel algérien à travers une plateforme numérique collaborative."
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
                  <div className="flex items-start space-x-4">
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
              <div className="flex items-center space-x-3 mb-6">
                <Mail className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-semibold font-serif">{t("apropos.nous_contacter")}</h2>
              </div>
              
              <form className="space-y-4" onSubmit={handleSubmit}>
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
                  <Label htmlFor="email">{t("apropos.email")}</Label>
                  <Input id="email" type="email" autoComplete="email" required maxLength={255} value={formData.email} onChange={handleChange} placeholder={t("apropos.placeholder_votreemailexemplecom")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sujet">{t("apropos.sujet")}</Label>
                  <Input id="sujet" maxLength={255} value={formData.sujet} onChange={handleChange} placeholder={t("apropos.placeholder_objet_votre_message")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">{t("apropos.message")}</Label>
                  <Textarea
                    id="message"
                    maxLength={5000}
                    required
                    value={formData.message}
                    onChange={handleChange}
                    placeholder={t("apropos.placeholder_votre_message")}
                    className="min-h-[120px]" />
                </div>

                <Button type="submit" className="w-full btn-hover" disabled={sending}>
                  {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  {t("apropos.envoyer_message")}
                </Button>
              </form>
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
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>{t("apropos.privacy.donneesIdentite", "Données d'identité : nom, prénom, adresse email (obligatoires à l'inscription)")}</li>
                  <li>{t("apropos.privacy.donneesOptionnelles", "Données optionnelles : date de naissance, sexe, téléphone, adresse, photo de profil, biographie")}</li>
                  <li>{t("apropos.privacy.donneesPro", "Données professionnelles (si applicable) : entreprise, spécialités, certifications, site web")}</li>
                  <li>{t("apropos.privacy.donneesNavigation", "Données de navigation : adresse IP (anonymisée), pages consultées, type d'appareil")}</li>
                </ul>
                <p className="mt-2 font-medium text-foreground">{t("apropos.privacy.pasDeVente", "Vos informations personnelles ne sont jamais vendues à des tiers.")}</p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">{t("apropos.privacy.finalites", "3. Finalités et base légale")}</h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>{t("apropos.privacy.finaliteCompte", "Gestion de votre compte et authentification — base légale : exécution du contrat (CGU)")}</li>
                  <li>{t("apropos.privacy.finaliteContenu", "Publication et affichage de vos contenus culturels — base légale : exécution du contrat")}</li>
                  <li>{t("apropos.privacy.finaliteStats", "Statistiques anonymisées de fréquentation — base légale : intérêt légitime")}</li>
                  <li>{t("apropos.privacy.finaliteNewsletter", "Envoi de la newsletter (uniquement si vous avez coché la case) — base légale : consentement")}</li>
                  <li>{t("apropos.privacy.finaliteSecurite", "Sécurité de la Plateforme (prévention des abus) — base légale : intérêt légitime")}</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">{t("apropos.privacy.conservation", "4. Durée de conservation")}</h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>{t("apropos.privacy.conservationCompte", "Données de compte : conservées tant que votre compte est actif")}</li>
                  <li>{t("apropos.privacy.conservationNotifs", "Notifications : supprimées automatiquement après 90 jours")}</li>
                  <li>{t("apropos.privacy.conservationLogs", "Journaux de connexion : 90 jours maximum")}</li>
                  <li>{t("apropos.privacy.conservationSuppression", "En cas de suppression de compte : vos données personnelles sont effacées, vos contributions publiques sont anonymisées")}</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">{t("apropos.privacy.droits", "5. Vos droits")}</h3>
                <p className="mb-2">{t("apropos.privacy.droitsIntro", "Conformément à la législation en vigueur et au RGPD, vous disposez des droits suivants :")}</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>{t("apropos.privacy.droitAcces", "Droit d'accès")}</strong> {t("apropos.privacy.droitAccesDesc", "— consulter et exporter toutes vos données depuis votre profil")}</li>
                  <li><strong>{t("apropos.privacy.droitRectification", "Droit de rectification")}</strong> {t("apropos.privacy.droitRectificationDesc", "— modifier vos informations personnelles à tout moment")}</li>
                  <li><strong>{t("apropos.privacy.droitSuppression", "Droit à l'effacement")}</strong> {t("apropos.privacy.droitSuppressionDesc", "— supprimer votre compte et toutes vos données personnelles")}</li>
                  <li><strong>{t("apropos.privacy.droitPortabilite", "Droit à la portabilité")}</strong> {t("apropos.privacy.droitPortabiliteDesc", "— exporter vos données dans un format lisible par machine (JSON)")}</li>
                  <li><strong>{t("apropos.privacy.droitOpposition", "Droit d'opposition")}</strong> {t("apropos.privacy.droitOppositionDesc", "— gérer vos préférences de notifications et de confidentialité")}</li>
                </ul>
                <p className="mt-2">{t("apropos.privacy.droitsExercice", "Pour exercer vos droits, rendez-vous dans les paramètres de votre profil ou contactez-nous à contact@taladz.com.")}</p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">{t("apropos.privacy.soustraitants", "6. Sous-traitants")}</h3>
                <p className="mb-2">{t("apropos.privacy.soustraitantsIntro", "Pour assurer le fonctionnement de la Plateforme, nous faisons appel aux services suivants :")}</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>{t("apropos.privacy.soustraitantCloudinary", "Cloudinary — hébergement des images et médias")}</li>
                  <li>{t("apropos.privacy.soustraitantBrevo", "Brevo (ex-Sendinblue) — envoi d'emails transactionnels et newsletters")}</li>
                  <li>{t("apropos.privacy.soustraitantOSM", "OpenStreetMap / Nominatim — géocodage d'adresses (données publiques, aucune donnée personnelle transmise)")}</li>
                </ul>
                <p className="mt-2">{t("apropos.privacy.soustraitantsPas", "Aucune donnée personnelle n'est vendue, louée ou cédée à des fins commerciales.")}</p>
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
              <p>{t("apropos.ressourcesText", "Culture Algérie met à disposition des ressources pour découvrir et promouvoir le patrimoine culturel algérien : événements, œuvres, artisanat, sites patrimoniaux et bien plus.")}</p>
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </div>);

};

export default APropos;