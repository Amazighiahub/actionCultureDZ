
import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Save, ArrowLeft, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

const AjouterEvenement = () => {
  const [gratuit, setGratuit] = useState(false);

  const typesEvenements = [
    'Exposition',
    'Concert',
    'Projection',
    'Conférence',
    'Atelier',
    'Festival',
    'Spectacle',
    'Rencontre littéraire'
  ];

  const villes = [
    'Alger',
    'Oran',
    'Constantine',
    'Annaba',
    'Tlemcen',
    'Sétif',
    'Béjaïa',
    'Biskra',
    'Ghardaïa',
    'Ouargla'
  ];

  const handleGratuitChange = (checked: boolean | "indeterminate") => {
    setGratuit(checked === true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-12">
        <div className="max-w-4xl mx-auto">
          {/* En-tête */}
          <div className="flex items-center space-x-4 mb-8">
            <Link to="/dashboard-pro">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour au dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold tracking-tight font-serif text-gradient">
                Créer un événement
              </h1>
              <p className="text-lg text-muted-foreground mt-2">
                Organisez un événement culturel
              </p>
            </div>
          </div>

          <form className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Informations générales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom de l'événement *</Label>
                  <Input id="nom" placeholder="Ex: Festival de Musique Andalouse de Tlemcen" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Décrivez votre événement, le programme, les intervenants..."
                    className="min-h-[120px]"
                  />
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type d'événement *</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un type" />
                      </SelectTrigger>
                      <SelectContent>
                        {typesEvenements.map((type) => (
                          <SelectItem key={type} value={type.toLowerCase()}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ville">Ville *</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez une ville" />
                      </SelectTrigger>
                      <SelectContent>
                        {villes.map((ville) => (
                          <SelectItem key={ville} value={ville.toLowerCase()}>
                            {ville}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lieu">Lieu précis *</Label>
                  <Input id="lieu" placeholder="Ex: Théâtre National d'Alger, Salle Ahmed Bey" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dates et horaires</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="date-debut">Date de début *</Label>
                    <Input id="date-debut" type="date" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="date-fin">Date de fin</Label>
                    <Input id="date-fin" type="date" />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="heure-debut">Heure de début</Label>
                    <Input id="heure-debut" type="time" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="heure-fin">Heure de fin</Label>
                    <Input id="heure-fin" type="time" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Participation et tarification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="max-participants">Nombre maximum de participants</Label>
                  <Input id="max-participants" type="number" placeholder="Ex: 100" />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="gratuit" 
                    checked={gratuit}
                    onCheckedChange={handleGratuitChange}
                  />
                  <Label htmlFor="gratuit">Événement gratuit</Label>
                </div>
                
                {!gratuit && (
                  <div className="space-y-2 ml-6">
                    <Label htmlFor="tarif">Tarif (en DA)</Label>
                    <Input id="tarif" type="number" placeholder="Ex: 500" />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Image et médias</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="affiche">Image ou affiche de l'événement *</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Glissez-déposez votre image ou cliquez pour sélectionner</p>
                    <p className="text-sm text-gray-400">PNG, JPG jusqu'à 5MB</p>
                    <Button variant="outline" className="mt-4">
                      Choisir un fichier
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="medias-post">Médias post-événement (facultatif)</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Photos, vidéos, compte-rendu</p>
                    <p className="text-xs text-gray-400">À ajouter après l'événement</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Choisir des fichiers
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-4">
              <Button variant="outline">
                Sauvegarder comme brouillon
              </Button>
              <Button className="btn-hover">
                <Calendar className="h-4 w-4 mr-2" />
                Publier l'événement
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AjouterEvenement;
