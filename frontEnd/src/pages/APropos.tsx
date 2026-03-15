
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

const CONTACT_EMAIL = 'contact@culture-algerie.dz';

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
      const subject = encodeURIComponent(formData.sujet || 'Contact via Culture Algérie');
      const body = encodeURIComponent(`De: ${formData.prenom} ${formData.nom}\nEmail: ${formData.email}\n\n${formData.message}`);
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
      toast({ title: t('apropos.messagePret', 'Message prêt'), description: t('apropos.clientEmailOuvert', 'Votre client email va s\'ouvrir avec le message pré-rempli.') });
      setFormData({ prenom: '', nom: '', email: '', sujet: '', message: '' });
    } catch {
      toast({ title: t('common.error', 'Erreur'), description: t('apropos.erreurEnvoi', 'Impossible d\'ouvrir le client email.'), variant: 'destructive' });
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
        {/* Sections légales pour les ancres du footer */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <Card className="p-8" id="conditions">
            <h2 className="text-2xl font-semibold mb-4 font-serif">{t("apropos.conditions", "Conditions d'utilisation")}</h2>
            <div className="text-sm text-muted-foreground space-y-3">
              <p>{t("apropos.conditionsText", "En utilisant Culture Algérie, vous acceptez de respecter les présentes conditions. Le contenu publié doit respecter les lois en vigueur et les droits d'auteur. Nous nous réservons le droit de modérer ou supprimer tout contenu inapproprié.")}</p>
              <p>{t("apropos.conditionsUsage", "L'utilisation de la plateforme est gratuite pour les visiteurs. Les comptes professionnels sont soumis à validation par notre équipe.")}</p>
            </div>
          </Card>

          <Card className="p-8" id="confidentialite">
            <h2 className="text-2xl font-semibold mb-4 font-serif">{t("apropos.confidentialite", "Politique de confidentialité")}</h2>
            <div className="text-sm text-muted-foreground space-y-3">
              <p>{t("apropos.confidentialiteText", "Nous collectons uniquement les données nécessaires au fonctionnement de la plateforme. Vos informations personnelles ne sont jamais vendues à des tiers.")}</p>
              <p>{t("apropos.confidentialiteDroits", "Conformément à la législation, vous disposez d'un droit d'accès, de modification et de suppression de vos données personnelles.")}</p>
            </div>
          </Card>
        </div>

        <div id="ressources" className="mb-16">
          <Card className="p-8">
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