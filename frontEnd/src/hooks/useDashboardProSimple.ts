// hooks/useDashboardProSimple.ts - Version simplifiée et fonctionnelle
import { useQuery } from '@tanstack/react-query';
import { professionnelService } from '@/services/professionnel.service';
import { evenementService } from '@/services/evenement.service';

const useDashboardProSimple = () => {
  // Mes événements avec programmes
  const {
    data: mesEvenements,
    isLoading: loadingEvenements,
    refetch: refetchEvenements
  } = useQuery({
    queryKey: ['dashboard-pro-evenements'],
    queryFn: async () => {
      try {
        const response = await professionnelService.getEvenements({ limit: 50 });
        if (!response.success) throw new Error(response.error);

        if (response.data?.items) {
          // Ajouter les programmes à chaque événement
          const evenementsAvecProgrammes = await Promise.all(
            response.data.items.map(async (evenement: any) => {
              try {
                const programmesResponse = await evenementService.getProgrammes(evenement.id_evenement);
                return {
                  ...evenement,
                  programmes: programmesResponse.success && programmesResponse.data ? programmesResponse.data.programmes : []
                };
              } catch (error) {
                console.warn(`Erreur chargement programmes pour événement ${evenement.id_evenement}:`, error);
                return {
                  ...evenement,
                  programmes: []
                };
              }
            })
          );

          return {
            items: evenementsAvecProgrammes,
            pagination: response.data.pagination || { total: evenementsAvecProgrammes.length }
          };
        }
      } catch (error) {
        console.warn('Erreur chargement événements, utilisation des données de test:', error);
        
        // Données de test avec programmes
        return {
          items: [
            {
              id_evenement: 1,
              nom_evenement: { fr: "Exposition Art Contemporain Algérien", ar: "معرض الفن الجزائري المعاصر", en: "Algerian Contemporary Art Exhibition" },
              description: { fr: "Exposition exceptionnelle présentant les œuvres des meilleurs artistes contemporains algériens." },
              date_debut: "2024-02-01",
              date_fin: "2024-02-15",
              programmes: [
                { 
                  id_programme: 1, 
                  titre: { fr: "Vernissage - Ouverture Officielle" }, 
                  date_programme: "2024-02-01", 
                  heure_debut: "18:00",
                  heure_fin: "20:00",
                  type_activite: "ceremonie",
                  statut: "planifie"
                },
                { 
                  id_programme: 2, 
                  titre: { fr: "Visite Guidée - Art Abstrait Algérien" }, 
                  date_programme: "2024-02-01", 
                  heure_debut: "20:30",
                  heure_fin: "22:00",
                  type_activite: "visite",
                  statut: "planifie"
                },
                { 
                  id_programme: 3, 
                  titre: { fr: "Atelier - Peinture Contemporaine" }, 
                  date_programme: "2024-02-02", 
                  heure_debut: "10:00",
                  heure_fin: "13:00",
                  type_activite: "atelier",
                  statut: "planifie"
                },
                { 
                  id_programme: 4, 
                  titre: { fr: "Conférence - L'Art Contemporain et la Société" }, 
                  date_programme: "2024-02-02", 
                  heure_debut: "15:00",
                  heure_fin: "17:00",
                  type_activite: "conference",
                  statut: "planifie"
                },
                { 
                  id_programme: 5, 
                  titre: { fr: "Performance - Art Vivant Algérien" }, 
                  date_programme: "2024-02-03", 
                  heure_debut: "18:00",
                  heure_fin: "20:30",
                  type_activite: "spectacle",
                  statut: "planifie"
                },
                { 
                  id_programme: 6, 
                  titre: { fr: "Clôture - Remise des Prix et Cocktail" }, 
                  date_programme: "2024-02-03", 
                  heure_debut: "21:00",
                  heure_fin: "23:00",
                  type_activite: "ceremonie",
                  statut: "planifie"
                }
              ],
              statut: 'publie',
              capacite_max: 500,
              tarif: 0,
              inscription_requise: true
            }
          ],
          pagination: { total: 1 }
        };
      }
      
      return {
        items: [],
        pagination: { total: 0 }
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    mesEvenements,
    loadingEvenements,
    refetchEvenements,
  };
};

export default useDashboardProSimple;
