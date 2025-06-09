// components/Carousel/MonumentCarousel.tsx
import React, { useState, useEffect } from 'react';
import { 
  HiChevronLeft, 
  HiChevronRight,
  HiMap,
  HiStar
} from 'react-icons/hi';

interface Monument {
  id: number;
  nom: string;
  description: string;
  wilaya: string;
  image_url: string;
  note_moyenne?: number;
}

const MonumentCarousel: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [monuments, setMonuments] = useState<Monument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Monuments par défaut (fallback si l'API ne répond pas)
  const defaultMonuments: Monument[] = [
    {
      id: 1,
      nom: "Casbah d'Alger",
      description: "Médina historique classée au patrimoine mondial de l'UNESCO",
      wilaya: "Alger",
      image_url: "https://images.unsplash.com/photo-1577719302656-3f8a033ea4d4?w=1200",
      note_moyenne: 4.8
    },
    {
      id: 2,
      nom: "Timgad",
      description: "Cité romaine antique parfaitement conservée",
      wilaya: "Batna",
      image_url: "https://images.unsplash.com/photo-1575995872537-3793d29d972c?w=1200",
      note_moyenne: 4.9
    },
    {
      id: 3,
      nom: "Djémila",
      description: "Ruines romaines dans un cadre montagneux spectaculaire",
      wilaya: "Sétif",
      image_url: "https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?w=1200",
      note_moyenne: 4.7
    },
    {
      id: 4,
      nom: "Pont de Constantine",
      description: "Ponts spectaculaires enjambant les gorges du Rhummel",
      wilaya: "Constantine",
      image_url: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200",
      note_moyenne: 4.6
    },
    {
      id: 5,
      nom: "Vallée du M'Zab",
      description: "Architecture berbère unique au cœur du Sahara",
      wilaya: "Ghardaïa",
      image_url: "https://images.unsplash.com/photo-1590077428593-a55bb07c4665?w=1200",
      note_moyenne: 4.8
    }
  ];

  // Charger les monuments depuis l'API
  useEffect(() => {
    const fetchMonuments = async () => {
      try {
        const response = await fetch('/api/lieux/populaires?limit=10');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.length > 0) {
            setMonuments(data.data);
          } else {
            setMonuments(defaultMonuments);
          }
        } else {
          setMonuments(defaultMonuments);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des monuments:', error);
        setMonuments(defaultMonuments);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonuments();
  }, []);

  // Auto-play du carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % monuments.length);
    }, 5000); // Change toutes les 5 secondes

    return () => clearInterval(timer);
  }, [monuments.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % monuments.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + monuments.length) % monuments.length);
  };

  if (isLoading) {
    return (
      <div className="h-[600px] bg-gradient-to-br from-green-800 to-green-900 animate-pulse">
        <div className="h-full flex items-center justify-center">
          <div className="text-white text-lg">Chargement des monuments...</div>
        </div>
      </div>
    );
  }

  const currentMonument = monuments[currentSlide];

  return (
    <div className="relative h-[600px] overflow-hidden">
      {/* Image de fond */}
      <div className="absolute inset-0">
        <img
          src={currentMonument.image_url}
          alt={currentMonument.nom}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200';
          }}
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
      </div>

      {/* Contenu */}
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-full flex items-end pb-20">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {currentMonument.nom}
            </h2>
            <p className="text-xl text-gray-200 mb-4">
              {currentMonument.description}
            </p>
            <div className="flex items-center space-x-6 text-white/90">
              <div className="flex items-center space-x-2">
                <HiMap className="h-5 w-5" />
                <span>{currentMonument.wilaya}</span>
              </div>
              {currentMonument.note_moyenne && (
                <div className="flex items-center space-x-2">
                  <HiStar className="h-5 w-5 text-yellow-400" />
                  <span>{currentMonument.note_moyenne}/5</span>
                </div>
              )}
            </div>
            <a
              href={`/patrimoine/${currentMonument.id}`}
              className="inline-flex items-center space-x-2 mt-6 px-6 py-3 bg-yellow-500 text-green-900 font-medium rounded-lg hover:bg-yellow-400 transition-all duration-200"
            >
              <span>Découvrir ce monument</span>
              <HiChevronRight className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>

      {/* Contrôles de navigation */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all duration-200"
        aria-label="Slide précédent"
      >
        <HiChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all duration-200"
        aria-label="Slide suivant"
      >
        <HiChevronRight className="h-6 w-6" />
      </button>

      {/* Indicateurs */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-2">
        {monuments.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              index === currentSlide
                ? 'bg-yellow-500 w-8'
                : 'bg-white/50 hover:bg-white/70'
            }`}
            aria-label={`Aller au slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default MonumentCarousel;