// utils/keyboardHelper.ts
// Utilitaire pour détecter et guider l'installation des claviers tamazight

export const KeyboardHelper = {
  /**
   * Détecte si le clavier tamazight est disponible
   */
  detectTamazightKeyboard(): { tifinagh: boolean; latin: boolean; any: boolean } {
    // Vérifier si nous sommes dans un environnement navigateur
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return { tifinagh: false, latin: false, any: false };
    }
    
    // Caractères Tifinagh
    const tifinaghChars = ['ⴰ', 'ⴱ', 'ⴲ', 'ⴳ', 'ⴴ', 'ⴵ', 'ⴶ', 'ⴷ', 'ⴸ', 'ⴹ', 'ⵉ', 'ⵊ', 'ⵋ', 'ⵌ', 'ⵍ', 'ⵎ', 'ⵏ', 'ⵐ', 'ⵑ', 'ⵒ', 'ⵓ', 'ⵔ', 'ⵕ', 'ⵖ', 'ⵗ', 'ⵘ', 'ⵙ', 'ⵚ', 'ⵛ', 'ⵜ', 'ⵝ'];
    
    // Caractères Tamazight Latin (avec caractères spéciaux)
    const latinChars = ['ɣ', 'ʕ', 'ʔ', 'ṛ', 'ṣ', 'ṭ', 'ṯ', 'ʒ', 'ḥ', 'ḍ', 'ǧ', 'ǥ', 'č', 'ǧ', 'ǥ'];
    
    try {
      // Créer un champ de texte temporaire pour tester
      const testInput = document.createElement('input');
      testInput.type = 'text';
      testInput.style.position = 'absolute';
      testInput.style.left = '-9999px';
      testInput.style.opacity = '0';
      testInput.style.pointerEvents = 'none';
      
      // Vérifier si document.body est disponible
      if (!document.body) {
        return { tifinagh: false, latin: false, any: false };
      }
      
      document.body.appendChild(testInput);
      
      // Test simple : vérifier si les caractères peuvent être assignés
      let canTypeTifinagh = false;
      let canTypeLatin = false;
      
      try {
        // Tester Tifinagh avec le premier caractère
        testInput.value = tifinaghChars[0];
        canTypeTifinagh = testInput.value === tifinaghChars[0];
      } catch (e) {
        canTypeTifinagh = false;
      }
      
      try {
        // Tester Tamazight Latin avec le premier caractère
        testInput.value = latinChars[0];
        canTypeLatin = testInput.value === latinChars[0];
      } catch (e) {
        canTypeLatin = false;
      }
      
      // Nettoyer
      if (testInput.parentNode) {
        testInput.parentNode.removeChild(testInput);
      }
      
      // Tester si au moins un des deux fonctionne
      const canTypeAny = canTypeTifinagh || canTypeLatin;
      
      return {
        tifinagh: canTypeTifinagh,
        latin: canTypeLatin,
        any: canTypeAny
      };
    } catch (error) {
      console.error('Erreur dans detectTamazightKeyboard:', error);
      return { tifinagh: false, latin: false, any: false };
    }
  },

  /**
   * Guide d'installation des claviers tamazight
   */
  getInstallationGuide(): { platform: string; steps: string[] }[] {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ipod')) {
      return [
        {
          platform: 'iOS - Tifinagh',
          steps: [
            '1. Allez dans Réglages → Général → Clavier',
            '2. Tapez sur "Ajouter un clavier"',
            '3. Recherchez "Tifinagh" ou "Berbère"',
            '4. Sélectionnez et installez le clavier Tifinagh',
            '5. Activez "Autoriser laccès complet"',
            '6. Basculez vers le clavier Tifinagh avec le globe 🌐'
          ]
        },
        {
          platform: 'iOS - Tamazight Latin',
          steps: [
            '1. Allez dans Réglages → Général → Clavier',
            '2. Tapez sur "Ajouter un clavier"',
            '3. Recherchez "Tamazight Latin" ou "Berber Latin"',
            '4. Sélectionnez et installez le clavier',
            '5. Activez "Autoriser laccès complet"',
            '6. Basculez vers le clavier Tamazight avec le globe 🌐'
          ]
        }
      ];
    }
    
    if (userAgent.includes('android')) {
      return [
        {
          platform: 'Android - Tifinagh',
          steps: [
            '1. Allez dans Paramètres → Langue et saisie',
            '2. Tapez sur "Clavier virtuel" ou "Clavier à l\'écran"',
            '3. Ajoutez un nouveau clavier',
            '4. Recherchez "Tifinagh Keyboard" ou "Berber Tifinagh"',
            '5. Installez depuis Google Play ou F-Droid',
            '6. Activez le clavier dans les paramètres'
          ]
        },
        {
          platform: 'Android - Tamazight Latin',
          steps: [
            '1. Allez dans Paramètres → Langue et saisie',
            '2. Tapez sur "Clavier virtuel" ou "Clavier à l\'écran"',
            '3. Ajoutez un nouveau clavier',
            '4. Recherchez "Tamazight Latin Keyboard" ou "Berber Latin"',
            '5. Installez depuis Google Play ou F-Droid',
            '6. Activez le clavier dans les paramètres'
          ]
        }
      ];
    }
    
    if (userAgent.includes('win')) {
      return [
        {
          platform: 'Windows',
          steps: [
            '1. Téléchargez le clavier Tifinagh depuis le site IRCAM',
            '2. Allez dans Paramètres → Heure et langue → Langue',
            '3. Ajoutez une langue préférée',
            '4. Installez le pack linguistique Tamazight',
            '5. Configurez le clavier dans Options ergonomiques'
          ]
        }
      ];
    }
    
    if (userAgent.includes('mac')) {
      return [
        {
          platform: 'macOS',
          steps: [
            '1. Allez dans Préférences Système → Clavier',
            '2. Ajoutez une source de saisie',
            '3. Installez "Tifinagh Keyboard" depuis l\'App Store',
            '4. Activez le clavier dans les préférences',
            '5. Basculez avec le menu du clavier 🌐'
          ]
        }
      ];
    }
    
    return [
      {
        platform: 'Linux',
        steps: [
          '1. Installez IBus ou Fcitx',
          '2. Ajoutez le clavier Tifinagh',
          '3. Configurez les raccourcis clavier',
          '4. Redémarrez votre session'
        ]
      }
    ];
  },

  /**
   * Caractères tamazight les plus courants
   */
  getCommonTamazightChars(): { tifinagh: string[]; latin: string[] } {
    return {
      tifinagh: [
        // Voyelles Tifinagh
        'ⴰ', 'ⴱ', 'ⴲ', 'ⴳ', 'ⴴ', 'ⴵ', 'ⴶ', 'ⴷ', 'ⴸ', 'ⴹ', 'ⵉ', 'ⵊ', 'ⵋ', 'ⵌ', 'ⵍ', 'ⵎ', 'ⵏ', 'ⵐ', 'ⵑ', 'ⵒ', 'ⵓ', 'ⵔ', 'ⵕ', 'ⵖ', 'ⵗ', 'ⵘ', 'ⵙ', 'ⵚ', 'ⵛ', 'ⵜ', 'ⵝ',
        // Consonnes Tifinagh
        'ⴽ', 'ⴾ', 'ⴿ', 'ⵀ', 'ⵁ', 'ⵂ', 'ⵃ', 'ⵄ', 'ⵅ', 'ⵆ', 'ⵇ', 'ⵈ', 'ⵉ', 'ⵊ', 'ⵋ', 'ⵌ', 'ⵍ', 'ⵎ', 'ⵏ', 'ⵐ', 'ⵑ', 'ⵒ', 'ⵓ', 'ⵔ', 'ⵕ', 'ⵖ', 'ⵗ', 'ⵘ', 'ⵙ', 'ⵚ', 'ⵛ', 'ⵜ', 'ⵝ'
      ],
      latin: [
        // Voyelles Tamazight Latin
        'a', 'e', 'i', 'u', 'w', 'y',
        // Consonnes avec caractères spéciaux
        'ɣ', 'ʕ', 'ʔ', 'ṛ', 'ṣ', 'ṭ', 'ṯ', 'ʒ', 'ḥ', 'ḍ', 'ǧ', 'ǥ',
        // Consonnes standard
        'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'x', 'z',
        // Digraphes et trigraphes
        'ch', 'dh', 'gh', 'sh', 'th', 'zh'
      ]
    };
  },

  /**
   * Test si le navigateur supporte les caractères tamazight
   */
  testTamazightSupport(): { supported: boolean; message: string } {
    const testChars = ['ⴰ', 'ⴱ', 'ⴲ', 'ⴳ', 'ⴴ', 'ⵉ', 'ⵊ', 'ⵋ', 'ⵌ', 'ⵍ'];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return { supported: false, message: 'Canvas non supporté' };
    }
    
    // Tester si les caractères s'affichent correctement
    ctx.font = '20px Arial';
    const widths = testChars.map(char => ctx.measureText(char).width);
    const allHaveWidth = widths.every(width => width > 0);
    
    if (allHaveWidth) {
      return { supported: true, message: 'Support tamazight détecté' };
    } else {
      return { supported: false, message: 'Support tamazight limité' };
    }
  }
};
