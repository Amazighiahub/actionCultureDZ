// scripts/i18n/analyze-ui.js
import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import ora from 'ora';
import parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class I18nUIAnalyzer {
  constructor() {
    this.results = [];
    this.spinner = ora();
    this.stats = {
      totalFiles: 0,
      uiFiles: 0,
      skippedFiles: 0
    };
  }
  
  async analyze() {
    console.log(chalk.blue.bold('\n🔍 Analyse i18n des fichiers UI (Pages & Composants)...\n'));
    
    // Trouver uniquement les fichiers dans pages/ et components/
    const files = await glob('src/**/*.{tsx,jsx}', {
      ignore: [
        'node_modules/**',
        'dist/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/components/ui/**', // Exclure les composants UI de base
        '**/services/**',
        '**/utils/**',
        '**/types/**',
        '**/hooks/**',
        '**/config/**',
        '**/contexts/**',
        '**/providers/**',
        '**/store/**'
      ]
    });
    
    // Filtrer pour garder uniquement pages/ et components/
    const uiFiles = files.filter(file => {
      const normalizedPath = file.replace(/\\/g, '/');
      return (
        normalizedPath.includes('/pages/') || 
        (normalizedPath.includes('/components/') && !normalizedPath.includes('/components/ui/'))
      );
    });
    
    this.stats.totalFiles = files.length;
    this.stats.uiFiles = uiFiles.length;
    this.stats.skippedFiles = files.length - uiFiles.length;
    
    console.log(chalk.yellow(`📋 ${files.length} fichiers trouvés, ${uiFiles.length} fichiers UI à analyser\n`));
    
    this.spinner.start(`Analyse de ${uiFiles.length} fichiers UI...`);
    
    for (const file of uiFiles) {
      await this.analyzeFile(file);
    }
    
    this.spinner.succeed(`${uiFiles.length} fichiers UI analysés`);
    
    await this.generateReport();
  }
  
  async analyzeFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const result = {
      file: filePath,
      texts: [],
      hasUseTranslation: false,
      imports: [],
      component: this.extractComponentName(filePath)
    };
    
    try {
      const ast = parser.parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
      });
      
      const self = this;
      
      traverse.default(ast, {
        // Vérifier les imports i18n
        ImportDeclaration(path) {
          const source = path.node.source.value;
          if (source.includes('react-i18next') || source.includes('i18n')) {
            result.imports.push(source);
            if (path.node.specifiers.some(spec => 
              t.isImportSpecifier(spec) && 
              t.isIdentifier(spec.imported) && 
              spec.imported.name === 'useTranslation'
            )) {
              result.hasUseTranslation = true;
            }
          }
        },
        
        // Détecter les textes JSX
        JSXText(path) {
          const text = path.node.value.trim();
          if (text && !self.isIgnorable(text)) {
            result.texts.push({
              text,
              line: path.node.loc?.start.line || 0,
              column: path.node.loc?.start.column || 0,
              type: 'JSXText',
              context: self.getContext(path),
              component: result.component
            });
          }
        },
        
        // Détecter les attributs de texte
        JSXAttribute(path) {
          const attrName = path.node.name;
          if (t.isJSXIdentifier(attrName) && self.isTextAttribute(attrName.name)) {
            const value = path.node.value;
            if (t.isStringLiteral(value)) {
              const text = value.value.trim();
              if (text && !self.isIgnorable(text)) {
                result.texts.push({
                  text,
                  line: value.loc?.start.line || 0,
                  column: value.loc?.start.column || 0,
                  type: 'JSXAttribute',
                  attribute: attrName.name,
                  context: self.getContext(path),
                  component: result.component
                });
              }
            }
          }
        },
        
        // Détecter les propriétés d'objet avec du texte
        ObjectProperty(path) {
          const key = path.node.key;
          const value = path.node.value;
          
          if (t.isIdentifier(key) && self.isTextProperty(key.name) && t.isStringLiteral(value)) {
            const text = value.value.trim();
            if (text && !self.isIgnorable(text)) {
              result.texts.push({
                text,
                line: value.loc?.start.line || 0,
                column: value.loc?.start.column || 0,
                type: 'ObjectProperty',
                property: key.name,
                context: self.getContext(path),
                component: result.component
              });
            }
          }
        }
      });
      
    } catch (error) {
      console.error(chalk.red(`\n❌ Erreur lors de l'analyse de ${filePath}:`), error.message);
    }
    
    if (result.texts.length > 0 || result.hasUseTranslation) {
      this.results.push(result);
    }
  }
  
  extractComponentName(filePath) {
    const parts = filePath.split(/[/\\]/);
    const fileName = parts[parts.length - 1];
    return fileName.replace(/\.(tsx?|jsx?)$/, '');
  }
  
  isTextAttribute(name) {
    const textAttributes = [
      'title', 'placeholder', 'label', 'alt', 'aria-label',
      'aria-description', 'helperText', 'errorText', 'description',
      'tooltip', 'message', 'heading', 'subheading', 'caption'
    ];
    return textAttributes.includes(name);
  }
  
  isTextProperty(name) {
    const textProperties = [
      'label', 'title', 'message', 'description', 'placeholder',
      'error', 'success', 'warning', 'info', 'tooltip',
      'heading', 'subheading', 'caption', 'text'
    ];
    return textProperties.includes(name);
  }
  
  isIgnorable(text) {
    // Ignorer les textes trop courts ou qui ne sont que des espaces/symboles
    if (text.length < 2) return true;
    if (/^[\s\d\W]+$/.test(text)) return true;
    if (/^(true|false|null|undefined)$/.test(text)) return true;
    
    // Ignorer les chemins, URLs, IDs
    if (/^[/\\]/.test(text)) return true;
    if (text.startsWith('http://') || text.startsWith('https://')) return true;
    if (/^[a-z0-9\-_]+$/.test(text) && text.includes('-')) return true;
    
    // Ignorer les noms de classes CSS
    if (/^(w-|h-|p-|m-|text-|bg-|border-)/.test(text)) return true;
    
    return false;
  }
  
  getContext(path) {
    let current = path.parent;
    let depth = 0;
    const contextParts = [];
    
    while (current && depth < 3) {
      if (t.isJSXElement(current) && current.openingElement.name) {
        const name = current.openingElement.name;
        if (t.isJSXIdentifier(name)) {
          contextParts.unshift(name.name);
        }
      }
      
      current = current.parent;
      depth++;
    }
    
    return contextParts.length > 0 ? contextParts.join(' > ') : 'root';
  }
  
  async generateReport() {
    const report = {
      totalFilesScanned: this.stats.totalFiles,
      uiFilesAnalyzed: this.stats.uiFiles,
      filesSkipped: this.stats.skippedFiles,
      filesWithTexts: this.results.filter(r => r.texts.length > 0).length,
      totalTexts: this.results.reduce((sum, r) => sum + r.texts.length, 0),
      filesWithI18n: this.results.filter(r => r.hasUseTranslation).length,
      filesWithoutI18n: this.results.filter(r => !r.hasUseTranslation && r.texts.length > 0),
      timestamp: new Date().toISOString()
    };
    
    // Créer le dossier reports s'il n'existe pas
    await fs.mkdir('reports', { recursive: true });
    
    // Grouper par type de fichier
    const pageFiles = this.results.filter(r => r.file.includes('/pages/'));
    const componentFiles = this.results.filter(r => r.file.includes('/components/'));
    
    const detailedReport = {
      report,
      summary: {
        pages: {
          count: pageFiles.length,
          texts: pageFiles.reduce((sum, r) => sum + r.texts.length, 0)
        },
        components: {
          count: componentFiles.length,
          texts: componentFiles.reduce((sum, r) => sum + r.texts.length, 0)
        }
      },
      details: this.results
    };
    
    // Sauvegarder le rapport détaillé
    await fs.writeFile(
      'reports/i18n-ui-analysis.json',
      JSON.stringify(detailedReport, null, 2)
    );
    
    // Afficher le résumé
    console.log(chalk.green.bold('\n✅ Analyse UI terminée!\n'));
    console.log(chalk.white(`📊 Fichiers scannés: ${chalk.yellow(report.totalFilesScanned)}`));
    console.log(chalk.white(`🎯 Fichiers UI analysés: ${chalk.yellow(report.uiFilesAnalyzed)}`));
    console.log(chalk.white(`⏭️  Fichiers ignorés: ${chalk.gray(report.filesSkipped)}`));
    console.log(chalk.white(`📝 Textes à traduire: ${chalk.yellow(report.totalTexts)}`));
    console.log(chalk.white(`✅ Fichiers avec i18n: ${chalk.green(report.filesWithI18n)}`));
    console.log(chalk.white(`⚠️  Fichiers sans i18n: ${chalk.yellow(report.filesWithoutI18n.length)}`));
    
    // Détails par type
    console.log(chalk.blue('\n📂 Répartition:'));
    console.log(chalk.white(`  Pages: ${chalk.yellow(pageFiles.length)} fichiers, ${chalk.yellow(pageFiles.reduce((sum, r) => sum + r.texts.length, 0))} textes`));
    console.log(chalk.white(`  Composants: ${chalk.yellow(componentFiles.length)} fichiers, ${chalk.yellow(componentFiles.reduce((sum, r) => sum + r.texts.length, 0))} textes`));
    
    if (report.filesWithoutI18n.length > 0) {
      console.log(chalk.yellow('\n🔧 Top 10 fichiers à migrer:'));
      report.filesWithoutI18n
        .sort((a, b) => b.texts.length - a.texts.length)
        .slice(0, 10)
        .forEach(file => {
          const type = file.file.includes('/pages/') ? '📄' : '🧩';
          console.log(chalk.gray(`  ${type} ${file.file} (${file.texts.length} textes)`));
        });
    }
    
    console.log(chalk.blue(`\n📊 Rapport complet: ${chalk.underline('reports/i18n-ui-analysis.json')}`));
    console.log(chalk.cyan('\n💡 Prochaine étape: npm run i18n:migrate:ui:dry'));
  }
}

// Exécuter l'analyse
const analyzer = new I18nUIAnalyzer();
analyzer.analyze().catch(console.error);