/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // Palette patrimoine algérien
        patrimoine: {
          // Couleurs principales inspirées de l'art et du patrimoine algérien
          'canard': '#2D5A5A', // Vert canard profond
          'canard-light': '#3D6A6A',
          'canard-dark': '#1D4A4A',
          
          'emeraude': '#16A085', // Vert émeraude
          'emeraude-light': '#26B095',
          'emeraude-dark': '#069075',
          
          'or': '#D4AF37', // Or antique
          'or-light': '#E4BF47',
          'or-dark': '#B4962A',
          
          'datte': '#B8860B', // Couleur datte
          'datte-light': '#C8961B',
          'datte-dark': '#987005',
          
          'creme': '#F5F5DC', // Crème
          'sombre': '#2C3E50', // Bleu sombre
        }
      },
      
      // Gradients personnalisés
      backgroundImage: {
        'gradient-patrimoine': 'linear-gradient(135deg, #16A085 0%, #2D5A5A 50%, #D4AF37 100%)',
        'gradient-patrimoine-light': 'linear-gradient(135deg, #26B095 0%, #3D6A6A 50%, #E4BF47 100%)',
        'gradient-patrimoine-dark': 'linear-gradient(135deg, #069075 0%, #1D4A4A 50%, #B4962A 100%)',
      },
      
      // Ombres personnalisées
      boxShadow: {
        'patrimoine': '0 4px 20px rgba(45, 90, 90, 0.15)',
        'patrimoine-lg': '0 10px 40px rgba(45, 90, 90, 0.2)',
        'patrimoine-xl': '0 20px 60px rgba(45, 90, 90, 0.25)',
      },
      
      // Ring personnalisé
      ringColor: {
        'patrimoine': '#16A085',
      },
      
      // Animation personnalisées
      animation: {
        'scale-in': 'scaleIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      
      keyframes: {
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      
      // Typographie personnalisée
      fontFamily: {
        'patrimoine': ['Inter', 'system-ui', 'sans-serif'],
      },
      
      // Espacement personnalisé
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      
      // Border radius personnalisé
      borderRadius: {
        'patrimoine': '0.75rem',
        'patrimoine-lg': '1rem',
        'patrimoine-xl': '1.5rem',
      },
      
      // Backdrop blur personnalisé
      backdropBlur: {
        'patrimoine': '8px',
      },
    },
  },
  
  plugins: [
    // Plugin pour les formulaires
    require('@tailwindcss/forms'),
    
    // Plugin pour la typographie
    require('@tailwindcss/typography'),
    
    // Plugin pour line-clamp
   
    
    // Plugin personnalisé pour les utilitaires patrimoine
    function({ addUtilities, theme }) {
      const patrimoineUtilities = {
        '.bg-pattern-patrimoine': {
          'background-image': `
            radial-gradient(circle at 1px 1px, ${theme('colors.patrimoine.canard')} 1px, transparent 0)
          `,
          'background-size': '20px 20px',
        },
        
        '.text-gradient-patrimoine': {
          'background': theme('backgroundImage.gradient-patrimoine'),
          '-webkit-background-clip': 'text',
          'background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
        },
        
        '.border-gradient-patrimoine': {
          'border': '2px solid transparent',
          'background': `linear-gradient(white, white) padding-box, ${theme('backgroundImage.gradient-patrimoine')} border-box`,
        },
        
        '.card-patrimoine': {
          'background': 'white',
          'border-radius': theme('borderRadius.patrimoine-lg'),
          'box-shadow': theme('boxShadow.patrimoine'),
          'border': `1px solid ${theme('colors.patrimoine.canard')}20`,
          'transition': 'all 0.2s ease-in-out',
          
          '&:hover': {
            'box-shadow': theme('boxShadow.patrimoine-lg'),
            'transform': 'translateY(-2px)',
          },
        },
        
        '.btn-patrimoine': {
          'padding': '0.75rem 1.5rem',
          'background': theme('backgroundImage.gradient-patrimoine'),
          'color': 'white',
          'border-radius': theme('borderRadius.patrimoine'),
          'font-weight': '500',
          'transition': 'all 0.2s ease-in-out',
          'border': 'none',
          'cursor': 'pointer',
          
          '&:hover': {
            'box-shadow': theme('boxShadow.patrimoine'),
            'transform': 'translateY(-1px)',
          },
          
          '&:active': {
            'transform': 'translateY(0)',
          },
          
          '&:disabled': {
            'opacity': '0.5',
            'cursor': 'not-allowed',
            'transform': 'none',
          },
        },
        
        '.input-patrimoine': {
          'padding': '0.75rem 1rem',
          'border': `1px solid ${theme('colors.patrimoine.canard')}30`,
          'border-radius': theme('borderRadius.patrimoine'),
          'background': `${theme('colors.patrimoine.creme')}20`,
          'transition': 'all 0.2s ease-in-out',
          
          '&:focus': {
            'outline': 'none',
            'border-color': theme('colors.patrimoine.emeraude'),
            'ring': `2px ${theme('colors.patrimoine.emeraude')}40`,
            'box-shadow': `0 0 0 2px ${theme('colors.patrimoine.emeraude')}40`,
          },
        },
      };
      
      addUtilities(patrimoineUtilities);
    },
  ],
  
  // Configuration pour la purge CSS
  safelist: [
    // Classes dynamiques pour les couleurs patrimoine
    'bg-patrimoine-canard',
    'bg-patrimoine-emeraude',
    'bg-patrimoine-or',
    'bg-patrimoine-datte',
    'bg-patrimoine-creme',
    'text-patrimoine-canard',
    'text-patrimoine-emeraude',
    'text-patrimoine-or',
    'text-patrimoine-datte',
    'text-patrimoine-sombre',
    'border-patrimoine-canard',
    'border-patrimoine-emeraude',
    'border-patrimoine-or',
    // Classes pour les variants
    {
      pattern: /bg-patrimoine-(canard|emeraude|or|datte|creme)-(light|dark)/,
    },
    {
      pattern: /text-patrimoine-(canard|emeraude|or|datte|sombre)-(light|dark)/,
    },
    {
      pattern: /border-patrimoine-(canard|emeraude|or)-(light|dark)/,
    },
    // Classes pour les opacités
    {
      pattern: /(bg|text|border)-patrimoine-\w+\/\d+/,
    },
  ],
};