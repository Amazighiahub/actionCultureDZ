// scripts/i18n/extract.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import ora from 'ora';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

interface ExtractedText {
  text: string;
  key?: string;
  file: string;
  line: number;
  component: string;
  context: string;
}

class I18nExtractor {
  private texts: ExtractedText[] = [];
  private spinner = ora();
  
  async extract() {
    console.log(chalk.blue.bold('\n📤 Extraction des textes pour traduction...\n'));
    
    const files = await glob('src/**/*.{tsx,ts}', {
      ignore: ['node_modules/**', 'dist/**', '**/*.test.*', '**/*.spec.*']
    });
    
    this.spinner.start(`Extraction de ${files.length} fichiers...`);
    
    for (const file of files) {
      await this.extractFromFile(file);
    }
    
    this.spinner.succeed(`Extraction terminée!`);
    
    // Générer les fichiers d'export
    await this.generateExports();
  }
  
  private async extractFromFile(filePath: string) {
    const content = await fs.readFile(filePath, 'utf-8');
    const componentName = path.basename(filePath, path.extname(filePath));
    
    try {
      const ast = parser.parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
      });
      
      traverse(ast, {
        // Extraire les appels t()
        CallExpression(path) {
          if (t.isIdentifier(path.node.callee) && path.node.callee.name === 't') {
            const firstArg = path.node.arguments[0];
            if (t.isStringLiteral(firstArg)) {
              const key = firstArg.value;
              
              // Essayer de trouver le texte par défaut
              let defaultText = key;
              if (path.node.arguments[1] && t.isObjectExpression(path.node.arguments[1])) {
                const defaultProp = path.node.arguments[1].properties.find(
                  prop => t.isObjectProperty(prop) && 
                  t.isIdentifier(prop.key) && 
                  prop.key.name === 'defaultValue'
                );
                if (defaultProp && t.isObjectProperty(defaultProp) && t.isStringLiteral(defaultProp.value)) {
                  defaultText = defaultProp.value.value;
                }
              }
              
              this.texts.push({
                text: defaultText,
                key,
                file: filePath,
                line: firstArg.loc?.start.line || 0,
                component: componentName,
                context: 't() call'
              });
            }
          }
        },
        
        // Extraire les composants Trans
        JSXElement(path) {
          const opening = path.node.openingElement;
          if (t.isJSXIdentifier(opening.name) && opening.name.name === 'Trans') {
            const i18nKeyAttr = opening.attributes.find(attr => 
              t.isJSXAttribute(attr) && 
              t.isJSXIdentifier(attr.name) && 
              attr.name.name === 'i18nKey'
            );
            
            let key = '';
            if (i18nKeyAttr && t.isJSXAttribute(i18nKeyAttr) && t.isStringLiteral(i18nKeyAttr.value)) {
              key = i18nKeyAttr.value.value;
            }
            
            // Extraire le contenu du composant Trans
            const text = this.extractJSXText(path.node.children);
            
            if (text) {
              this.texts.push({
                text,
                key,
                file: filePath,
                line: opening.loc?.start.line || 0,
                component: componentName,
                context: '<Trans> component'
              });
            }
          }
        }
      });
      
    } catch (error) {
      console.error(chalk.red(`Erreur lors de l'extraction de ${filePath}:`), error);
    }
  }
  
  private extractJSXText(children: any[]): string {
    return children
      .map(child => {
        if (t.isJSXText(child)) {
          return child.value.trim();
        }
        if (t.isJSXExpressionContainer(child) && t.isStringLiteral(child.expression)) {
          return child.expression.value;
        }
        if (t.isJSXElement(child)) {
          return this.extractJSXText(child.children);
        }
        return '';
      })
      .filter(Boolean)
      .join(' ');
  }
  
  private async generateExports() {
    console.log(chalk.blue('\n📄 Génération des fichiers d\'export...'));
    
    await fs.mkdir('exports', { recursive: true });
    
    // 1. Export CSV pour traducteurs
    await this.generateCSV();
    
    // 2. Export JSON structuré
    await this.generateJSON();
    
    // 3. Export Excel (si xlsx est disponible)
    await this.generateExcel();
    
    // 4. Statistiques
    await this.generateStats();
  }
  
  private async generateCSV() {
    const headers = ['Key', 'Source Text', 'French', 'English', 'Arabic', 'Tamazight Latin', 'Tamazight Tifinagh', 'File', 'Line', 'Context'];
    const rows = [headers];
    
    // Charger les traductions existantes
    const translations = await this.loadExistingTranslations();
    
    for (const text of this.texts) {
      const key = text.key || this.generateKey(text.component, text.text);
      const row = [
        key,
        text.text,
        translations.fr[key] || text.text,
        translations.en[key] || '',
        translations.ar[key] || '',
        translations['tz-ltn'][key] || '',
        translations['tz-tfng'][key] || '',
        text.file,
        text.line.toString(),
        text.context
      ];
      rows.push(row);
    }
    
    const csv = rows.map(row => 
      row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    await fs.writeFile('exports/translations.csv', csv, 'utf-8');
    console.log(chalk.green('✓ CSV généré: exports/translations.csv'));
  }
  
  private async generateJSON() {
    const data = {
      metadata: {
        extracted: new Date().toISOString(),
        totalTexts: this.texts.length,
        files: new Set(this.texts.map(t => t.file)).size
      },
      texts: this.texts
    };
    
    await fs.writeFile(
      'exports/translations.json',
      JSON.stringify(data, null, 2)
    );
    
    console.log(chalk.green('✓ JSON généré: exports/translations.json'));
  }
  
  private async generateExcel() {
    try {
      // Vérifier si xlsx est disponible
      const XLSX = await import('xlsx').catch(() => null);
      if (!XLSX) {
        console.log(chalk.yellow('⚠️  xlsx non installé, export Excel ignoré'));
        return;
      }
      
      const translations = await this.loadExistingTranslations();
      
      const data = this.texts.map(text => {
        const key = text.key || this.generateKey(text.component, text.text);
        return {
          'Key': key,
          'Source Text': text.text,
          'French': translations.fr[key] || text.text,
          'English': translations.en[key] || '',
          'Arabic': translations.ar[key] || '',
          'Tamazight Latin': translations['tz-ltn'][key] || '',
          'Tamazight Tifinagh': translations['tz-tfng'][key] || '',
          'File': text.file,
          'Line': text.line,
          'Context': text.context
        };
      });
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Translations');
      
      // Ajuster les largeurs de colonnes
      ws['!cols'] = [
        { wch: 30 }, // Key
        { wch: 50 }, // Source Text
        { wch: 50 }, // French
        { wch: 50 }, // English
        { wch: 50 }, // Arabic
        { wch: 50 }, // Tamazight Latin
        { wch: 50 }, // Tamazight Tifinagh
        { wch: 40 }, // File
        { wch: 10 }, // Line
        { wch: 20 }  // Context
      ];
      
      XLSX.writeFile(wb, 'exports/translations.xlsx');
      console.log(chalk.green('✓ Excel généré: exports/translations.xlsx'));
      
    } catch (error) {
      console.log(chalk.yellow('⚠️  Erreur lors de la génération Excel:', error));
    }
  }
  
  private async generateStats() {
    const stats = {
      totalTexts: this.texts.length,
      uniqueKeys: new Set(this.texts.map(t => t.key || this.generateKey(t.component, t.text))).size,
      byComponent: {} as Record<string, number>,
      byContext: {} as Record<string, number>,
      files: new Set(this.texts.map(t => t.file)).size
    };
    
    this.texts.forEach(text => {
      stats.byComponent[text.component] = (stats.byComponent[text.component] || 0) + 1;
      stats.byContext[text.context] = (stats.byContext[text.context] || 0) + 1;
    });
    
    await fs.writeFile(
      'exports/translation-stats.json',
      JSON.stringify(stats, null, 2)
    );
    
    console.log(chalk.green('✓ Statistiques générées: exports/translation-stats.json'));
  }
  
  private async loadExistingTranslations() {
    const translations: Record<string, Record<string, string>> = {
      fr: {},
      en: {},
      ar: {},
      'tz-ltn': {},
      'tz-tfng': {}
    };
    
    for (const lang of Object.keys(translations)) {
      const files = await glob(`src/i18n/locales/${lang}/*.json`);
      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          const data = JSON.parse(content);
          const namespace = path.basename(file, '.json');
          
          this.flattenTranslations(data, namespace, translations[lang]);
        } catch {}
      }
    }
    
    return translations;
  }
  
  private flattenTranslations(obj: any, prefix: string, target: Record<string, string>) {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = `${prefix}.${key}`;
      if (typeof value === 'string') {
        target[fullKey] = value;
      } else if (typeof value === 'object' && value !== null) {
        this.flattenTranslations(value, fullKey, target);
      }
    }
  }
  
  private generateKey(component: string, text: string): string {
    const key = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .substring(0, 30);
    
    return `${component}.${key}`;
  }
}

// Lancer l'extraction
const extractor = new I18nExtractor();
extractor.extract().catch(console.error);