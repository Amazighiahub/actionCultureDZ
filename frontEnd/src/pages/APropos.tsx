
import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { Textarea } from '@/components/UI/textarea';
import { Label } from '@/components/UI/label';
import { BookOpen, Users, Globe, Mail, Send } from 'lucide-react';import { useTranslation } from "react-i18next";

const APropos = () => {const { t } = useTranslation();
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
              
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prenom">{t("apropos.prnom")}</Label>
                    <Input id="prenom" placeholder={t("apropos.placeholder_votre_prnom")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nom">{t("apropos.nom")}</Label>
                    <Input id="nom" placeholder={t("apropos.placeholder_votre_nom")} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">{t("apropos.email")}</Label>
                  <Input id="email" type="email" placeholder={t("apropos.placeholder_votreemailexemplecom")} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sujet">{t("apropos.sujet")}</Label>
                  <Input id="sujet" placeholder={t("apropos.placeholder_objet_votre_message")} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message">{t("apropos.message")}</Label>
                  <Textarea
                    id="message"
                    placeholder={t("apropos.placeholder_votre_message")}
                    className="min-h-[120px]" />

                </div>
                
                <Button type="submit" className="w-full btn-hover">
                  <Send className="h-4 w-4 mr-2" />{t("apropos.envoyer_message")}

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
      </main>

      <Footer />
    </div>);

};

export default APropos;