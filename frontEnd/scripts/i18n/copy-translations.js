// scripts/i18n/copy-translations.js
import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';

async function copyTranslationKeys() {
  const languages = ['ar', 'en', 'tz-ltn', 'tz-tfng'];
  const basePath = 'i18n/locales';
  
  console.log(chalk.blue.bold('\n📋 Copie des clés de traduction vers les autres langues\n'));
  
  try {
    // Charger les traductions françaises (source)
    const frTranslations = JSON.parse(
      await fs.readFile(path.join(basePath, 'fr/translation.json'), 'utf-8')
    );
    
    for (const lang of languages) {
      const langPath = path.join(basePath, lang, 'translation.json');
      
      // Charger les traductions existantes
      let existingTranslations = {};
      try {
        existingTranslations = JSON.parse(await fs.readFile(langPath, 'utf-8'));
      } catch (error) {
        console.log(chalk.yellow(`⚠️  Fichier non trouvé pour ${lang}, création d'un nouveau fichier`));
      }
      
      // Fusionner récursivement en gardant les traductions existantes
      const merged = mergeTranslations(frTranslations, existingTranslations, lang);
      
      // Sauvegarder
      await fs.writeFile(langPath, JSON.stringify(merged, null, 2) + '\n');
      
      const stats = getStats(frTranslations, existingTranslations);
      console.log(chalk.green(`✓ ${lang}: ${stats.new} nouvelles clés ajoutées, ${stats.existing} déjà traduites`));
    }
    
    console.log(chalk.green.bold('\n✨ Copie terminée !'));
    console.log(chalk.cyan('\n💡 Les nouvelles clés ont été ajoutées avec le préfixe [TODO] pour les identifier facilement'));
    
  } catch (error) {
    console.error(chalk.red('❌ Erreur:'), error);
  }
}

function mergeTranslations(source, target, lang) {
  const result = {};
  
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      // Récursif pour les objets imbriqués
      result[key] = mergeTranslations(
        source[key], 
        target[key] || {}, 
        lang
      );
    } else {
      // Si la traduction existe déjà, la garder
      if (target[key]) {
        result[key] = target[key];
      } else {
        // Sinon, ajouter avec un marqueur TODO
        result[key] = `[TODO ${lang.toUpperCase()}] ${source[key]}`;
      }
    }
  }
  
  // Ajouter les clés qui existent dans target mais pas dans source
  for (const key in target) {
    if (!(key in result)) {
      result[key] = target[key];
    }
  }
  
  return result;
}

function getStats(source, target, path = '') {
  let stats = { new: 0, existing: 0 };
  
  for (const key in source) {
    const fullPath = path ? `${path}.${key}` : key;
    
    if (typeof source[key] === 'object' && source[key] !== null) {
      const subStats = getStats(source[key], target[key] || {}, fullPath);
      stats.new += subStats.new;
      stats.existing += subStats.existing;
    } else {
      if (target[key]) {
        stats.existing++;
      } else {
        stats.new++;
      }
    }
  }
  
  return stats;
}

// Exécuter le script
copyTranslationKeys().catch(console.error);