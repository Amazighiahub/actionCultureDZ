// utils/translationHelper.ts
// Script pour identifier les textes non traduits dans vos composants
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'fs';
import * as path from 'path';

/**
 * Trouve tous les textes statiques non traduits dans un fichier TSX/JSX
 */
export function findUntranslatedText(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const untranslated: string[] = [];
  
  // Patterns pour détecter les textes non traduits
  const patterns = [
    // Texte dans les JSX elements: >Texte<
    />([^<>{}\n]+)</g,
    
    // Attributs title, placeholder, alt, aria-label
    /(?:title|placeholder|alt|aria-label)="([^"]+)"/g,
    
    // Toast messages
    /toast\({[^}]*(?:title|description):\s*["']([^"']+)["']/g,
    
    // Console.log (à vérifier si nécessaire)
    /console\.\w+\(["']([^"']+)["']/g,
    
    // Texte dans les variables
    /const\s+\w+\s*=\s*["']([^"']+)["']/g,
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const text = match[1].trim();
      
      // Ignorer certains cas
      if (
        !text || // Texte vide
        text.length < 2 || // Trop court
        /^[0-9\s\-+*/=.,;:!?@#$%^&*()_]+$/.test(text) || // Seulement des symboles
        text.startsWith('{') || // Expression JSX
        text.startsWith('t(') || // Déjà traduit
        text.includes('${') || // Template literal
        /^(true|false|null|undefined|NaN)$/.test(text) || // Valeurs JS
        /^(div|span|p|h[1-6]|button|input|form|section|article|nav|header|footer|main|aside)$/.test(text) // Tags HTML
      ) {
        continue;
      }
      
      // Ajouter si pas déjà dans la liste
      if (!untranslated.includes(text)) {
        untranslated.push(text);
      }
    }
  });
  
  return untranslated;
}

/**
 * Scanne tous les fichiers d'un dossier
 */
export function scanDirectory(dirPath: string, extensions = ['.tsx', '.jsx']): Map<string, string[]> {
  const results = new Map<string, string[]>();
  
  function scan(dir: string) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        scan(filePath);
      } else if (stat.isFile() && extensions.some(ext => file.endsWith(ext))) {
        const untranslated = findUntranslatedText(filePath);
        if (untranslated.length > 0) {
          results.set(filePath, untranslated);
        }
      }
    });
  }
  
  scan(dirPath);
  return results;
}

/**
 * Génère un rapport des textes non traduits
 */
export function generateReport(results: Map<string, string[]>): string {
  let report = '# Textes non traduits\n\n';
  let totalCount = 0;
  
  results.forEach((texts, filePath) => {
    report += `## ${filePath}\n\n`;
    texts.forEach(text => {
      report += `- "${text}"\n`;
      totalCount++;
    });
    report += '\n';
  });
  
  report = `Total: ${totalCount} textes non traduits dans ${results.size} fichiers\n\n` + report;
  
  return report;
}

/**
 * Génère un fichier JSON avec les clés de traduction suggérées
 */
export function generateTranslationKeys(results: Map<string, string[]>): Record<string, any> {
  const translations: Record<string, any> = {};
  
  results.forEach((texts, filePath) => {
    // Extraire le nom du composant du chemin
    const componentName = path.basename(filePath, path.extname(filePath)).toLowerCase();
    
    if (!translations[componentName]) {
      translations[componentName] = {};
    }
    
    texts.forEach(text => {
      // Générer une clé à partir du texte
      const key = text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 30);
      
      translations[componentName][key] = text;
    });
  });
  
  return translations;
}

// Utilisation du script
if (require.main === module) {
  const srcPath = path.join(__dirname, '../../src');
  const results = scanDirectory(srcPath);
  
  // Générer le rapport
  const report = generateReport(results);
  fs.writeFileSync('untranslated-texts.md', report);
  console.log('Rapport généré: untranslated-texts.md');
  
  // Générer les clés de traduction suggérées
  const keys = generateTranslationKeys(results);
  fs.writeFileSync('suggested-translations.json', JSON.stringify(keys, null, 2));
  console.log('Clés suggérées générées: suggested-translations.json');
}