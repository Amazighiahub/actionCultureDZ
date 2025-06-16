
import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BookOpen, Users, Globe, Mail, Send } from 'lucide-react';

const APropos = () => {
  const valeurs = [
    {
      icon: BookOpen,
      title: 'Transmission',
      description: 'Préserver et transmettre le riche patrimoine culturel algérien aux générations futures.',
      color: 'text-primary'
    },
    {
      icon: Users,
      title: 'Accessibilité',
      description: 'Rendre la culture accessible à tous, sans barrières géographiques ou économiques.',
      color: 'text-secondary'
    },
    {
      icon: Globe,
      title: 'Visibilité locale & internationale',
      description: 'Mettre en lumière la richesse culturelle algérienne sur la scène mondiale.',
      color: 'text-accent'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-12">
        {/* En-tête */}
        <div className="text-center space-y-4 mb-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-serif text-gradient">
            À propos de Culture Algérie
          </h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          {/* Mission */}
          <div className="space-y-6">
            <Card className="p-8">
              <h2 className="text-2xl font-semibold mb-6 font-serif">Notre Mission</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Culture Algérie est une initiative indépendante portée par des passionnés 
                  de patrimoine, de littérature, de cinéma et d'art algérien.
                </p>
                <p>
                  Notre mission : mettre en lumière la richesse culturelle de notre pays, 
                  faciliter l'accès aux œuvres, relier les acteurs et favoriser la transmission 
                  aux jeunes générations.
                </p>
              </div>
            </Card>

            {/* Valeurs */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold font-serif">Nos Valeurs</h2>
              {valeurs.map((valeur) => (
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
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-6">
            <Card className="p-8">
              <div className="flex items-center space-x-3 mb-6">
                <Mail className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-semibold font-serif">Nous Contacter</h2>
              </div>
              
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prenom">Prénom</Label>
                    <Input id="prenom" placeholder="Votre prénom" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom</Label>
                    <Input id="nom" placeholder="Votre nom" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="votre.email@exemple.com" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sujet">Sujet</Label>
                  <Input id="sujet" placeholder="Objet de votre message" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea 
                    id="message" 
                    placeholder="Votre message..."
                    className="min-h-[120px]"
                  />
                </div>
                
                <Button type="submit" className="w-full btn-hover">
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer le message
                </Button>
              </form>
            </Card>

            {/* Contact direct */}
            <Card className="p-6 bg-primary/5 border-primary/20">
              <h3 className="font-semibold mb-3">Contact direct</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Pour toute question ou collaboration :
              </p>
              <p className="text-primary font-medium">contact@culturealgerie.dz</p>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default APropos;
