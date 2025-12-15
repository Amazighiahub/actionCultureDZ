// scripts/i18n/migrate-ui-single-file.js
import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import parser from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';

class I18nUIMigratorSingleFile {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.spinner = ora();
    this.translations = new Map();
    this.migratedFiles = [];
    this.errors = [];
    this.stats = {
      totalFiles: 0,
      migratedFiles: 0,
      skippedFiles: 0,
      totalTexts: 0,
      errors: 0
    };
  }

  async migrate() {
    console.log(chalk.blue.bold(`\n🔄 Migration i18n UI vers translation.json unique (${this.dryRun ? 'DRY RUN' : 'REAL'})\n`));
    
    // Charger le rapport d'analyse UI
    const reportPath = 'reports/i18n-ui-analysis.json';
    if (!await this.fileExists(reportPath)) {
      // Essayer avec le rapport standard
      const standardReportPath = 'reports/i18n-analysis.json';
      if (!await this.fileExists(standardReportPath)) {
        console.error(chalk.red('❌ Aucun rapport d\'analyse trouvé. Exécutez d\'abord: npm run i18n:analyze:ui'));
        return;
      }
      
      // Utiliser le rapport standard mais filtrer les fichiers UI
      const { details } = JSON.parse(await fs.readFile(standardReportPath, 'utf-8'));
      const uiFiles = details.filter(fileInfo => {
        const filePath = fileInfo.file.toLowerCase();
        return (
          (filePath.includes('/pages/') || filePath.includes('\\pages\\') ||
           (filePath.includes('/components/') && !filePath.includes('/components/UI/')) ||
           (filePath.includes('\\components\\') && !filePath.includes('\\components\\ui\\')))
          && (filePath.endsWith('.tsx') || filePath.endsWith('.jsx'))
          && fileInfo.texts.length > 0 
          && !fileInfo.hasUseTranslation
        );
      });
      
      this.stats.totalFiles = uiFiles.length;
      await this.processMigration(uiFiles);
    } else {
      const { details } = JSON.parse(await fs.readFile(reportPath, 'utf-8'));
      const filesToMigrate = details.filter(fileInfo => 
        fileInfo.texts.length > 0 && !fileInfo.hasUseTranslation
      );
      
      this.stats.totalFiles = filesToMigrate.length;
      await this.processMigration(filesToMigrate);
    }
  }

  async processMigration(filesToMigrate) {
    console.log(chalk.yellow(`📋 ${filesToMigrate.length} fichiers UI à migrer\n`));
    
    this.spinner.start(`Migration de ${filesToMigrate.length} fichiers UI...`);
    
    for (const fileInfo of filesToMigrate) {
      await this.migrateFile(fileInfo);
    }
    
    this.spinner.succeed(`Migration terminée!`);
    
    await this.generateTranslations();
    this.showSummary();
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async migrateFile(fileInfo) {
    const { file, texts, component } = fileInfo;
    
    try {
      const content = await fs.readFile(file, 'utf-8');
      
      const ast = parser.parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
        preserveComments: true
      });

      let hasChanges = false;
      let useTranslationAdded = false;
      const namespace = this.getNamespace(file);
      const fileTranslations = new Map();

      // Préparer les traductions pour ce fichier
      texts.forEach(textInfo => {
        const key = this.generateKey(textInfo.text, textInfo, namespace);
        fileTranslations.set(textInfo.text, key);
        
        // Stocker la traduction avec le namespace comme préfixe
        const fullKey = `${namespace}.${key}`;
        this.translations.set(fullKey, {
          text: textInfo.text,
          context: textInfo.context,
          type: textInfo.type,
          component: component || this.extractComponentName(file)
        });
      });

      const self = this;

      traverse.default(ast, {
        Program(path) {
          // Ajouter l'import useTranslation si nécessaire
          if (!useTranslationAdded && texts.length > 0) {
            self.addUseTranslationImport(path);
            useTranslationAdded = true;
            hasChanges = true;
          }
        },

        // Composants fonctionnels
        FunctionDeclaration(path) {
          if (self.isReactComponent(path) && texts.length > 0 && !self.hasUseTranslation(path)) {
            self.addUseTranslationHook(path);
            hasChanges = true;
          }
        },

        // Composants arrow function
        ArrowFunctionExpression(path) {
          const parent = path.parent;
          if (t.isVariableDeclarator(parent) && 
              t.isIdentifier(parent.id) && 
              self.isComponentName(parent.id.name) &&
              texts.length > 0 && 
              !self.hasUseTranslation(path)) {
            self.addUseTranslationHook(path);
            hasChanges = true;
          }
        },

        // Remplacer les textes JSX
        JSXText(path) {
          const text = path.node.value.trim();
          if (fileTranslations.has(text)) {
            const key = fileTranslations.get(text);
            const tCall = t.jsxExpressionContainer(
              t.callExpression(
                t.identifier('t'),
                [t.stringLiteral(`${namespace}.${key}`)]
              )
            );
            path.replaceWith(tCall);
            hasChanges = true;
          }
        },

        // Remplacer les attributs JSX
        JSXAttribute(path) {
          const value = path.node.value;
          if (t.isStringLiteral(value) && fileTranslations.has(value.value)) {
            const key = fileTranslations.get(value.value);
            const tCall = t.jsxExpressionContainer(
              t.callExpression(
                t.identifier('t'),
                [t.stringLiteral(`${namespace}.${key}`)]
              )
            );
            path.node.value = tCall;
            hasChanges = true;
          }
        },

        // Remplacer dans les propriétés d'objet
        ObjectProperty(path) {
          const value = path.node.value;
          const key = path.node.key;
          
          if (t.isStringLiteral(value) && 
              t.isIdentifier(key) && 
              self.isTextProperty(key.name) &&
              fileTranslations.has(value.value)) {
            const translationKey = fileTranslations.get(value.value);
            const tCall = t.callExpression(
              t.identifier('t'),
              [t.stringLiteral(`${namespace}.${translationKey}`)]
            );
            path.node.value = tCall;
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        const output = generate.default(ast, {
          retainLines: true,
          preserveComments: true,
          compact: false
        });

        if (!this.dryRun) {
          await fs.writeFile(file, output.code);
        }

        const componentName = component || this.extractComponentName(file);
        this.migratedFiles.push({
          file,
          textsCount: texts.length,
          namespace,
          component: componentName
        });

        this.stats.migratedFiles++;
        this.stats.totalTexts += texts.length;

        console.log(chalk.green(`✓ ${componentName} (${texts.length} textes)`));
      } else {
        this.stats.skippedFiles++;
      }

    } catch (error) {
      this.stats.errors++;
      this.errors.push({ file, error: error.message });
      console.error(chalk.red(`\n❌ Erreur: ${this.extractComponentName(file)}`), error.message);
    }
  }

  extractComponentName(filePath) {
    const parts = filePath.split(/[/\\]/);
    const fileName = parts[parts.length - 1];
    return fileName.replace(/\.(tsx?|jsx?)$/, '');
  }

  isReactComponent(path) {
    const node = path.node;
    return t.isIdentifier(node.id) && /^[A-Z]/.test(node.id.name);
  }

  isComponentName(name) {
    return /^[A-Z]/.test(name);
  }

  isTextProperty(name) {
    const textProperties = [
      'label', 'title', 'message', 'description', 'placeholder',
      'error', 'success', 'warning', 'info', 'tooltip',
      'heading', 'subheading', 'caption', 'text'
    ];
    return textProperties.includes(name);
  }

  addUseTranslationImport(programPath) {
    const importDeclaration = t.importDeclaration(
      [t.importSpecifier(t.identifier('useTranslation'), t.identifier('useTranslation'))],
      t.stringLiteral('react-i18next')
    );

    const body = programPath.node.body;
    let lastImportIndex = -1;
    
    body.forEach((node, index) => {
      if (t.isImportDeclaration(node)) {
        lastImportIndex = index;
      }
    });

    body.splice(lastImportIndex + 1, 0, importDeclaration);
  }

  hasUseTranslation(path) {
    let found = false;
    path.traverse({
      CallExpression(callPath) {
        if (t.isIdentifier(callPath.node.callee, { name: 'useTranslation' })) {
          found = true;
        }
      }
    });
    return found;
  }

  addUseTranslationHook(functionPath) {
    // Utiliser le namespace 'translation' pour correspondre à votre structure
    const hookCall = t.variableDeclaration('const', [
      t.variableDeclarator(
        t.objectPattern([
          t.objectProperty(t.identifier('t'), t.identifier('t'), false, true)
        ]),
        t.callExpression(
          t.identifier('useTranslation'),
          [] // Pas de namespace spécifique, utilise 'translation' par défaut
        )
      )
    ]);

    const body = functionPath.node.body;
    if (t.isBlockStatement(body)) {
      // Ajouter après les autres hooks
      let insertIndex = 0;
      body.body.forEach((statement, index) => {
        if (t.isVariableDeclaration(statement) || 
            t.isExpressionStatement(statement)) {
          const isHook = this.isHookCall(statement);
          if (isHook) {
            insertIndex = index + 1;
          }
        }
      });
      
      body.body.splice(insertIndex, 0, hookCall);
    }
  }

  isHookCall(statement) {
    if (t.isVariableDeclaration(statement)) {
      const declaration = statement.declarations[0];
      if (declaration && t.isCallExpression(declaration.init)) {
        const callee = declaration.init.callee;
        if (t.isIdentifier(callee) && callee.name.startsWith('use')) {
          return true;
        }
      }
    }
    return false;
  }

  getNamespace(filePath) {
    const relativePath = path.relative('src', filePath);
    const parts = relativePath.split(/[/\\]/);
    const fileName = parts[parts.length - 1].replace(/\.(tsx?|jsx?)$/, '');
    
    // Pour les pages
    if (parts[0] === 'pages') {
      if (parts.length > 2) {
        // Sous-dossier dans pages
        return `${parts[1]}_${fileName}`.toLowerCase().replace(/-/g, '_');
      }
      return fileName.toLowerCase().replace(/-/g, '_');
    }
    
    // Pour les composants
    if (parts[0] === 'components') {
      if (parts.length > 2) {
        // Sous-dossier dans components
        return `${parts[1]}_${fileName}`.toLowerCase().replace(/-/g, '_');
      }
      return `common_${fileName}`.toLowerCase().replace(/-/g, '_');
    }
    
    return fileName.toLowerCase().replace(/-/g, '_');
  }

  generateKey(text, textInfo, namespace) {
    // Générer une clé basée sur le contexte et le texte
    let prefix = '';
    
    // Ajouter un préfixe selon le type
    if (textInfo.type === 'JSXAttribute' && textInfo.attribute) {
      prefix = textInfo.attribute + '_';
    } else if (textInfo.type === 'ObjectProperty' && textInfo.property) {
      prefix = textInfo.property + '_';
    }
    
    // Extraire les mots significatifs
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 3);
    
    let baseKey = prefix + words.join('_');
    
    // Si pas de mots significatifs
    if (!baseKey || baseKey === prefix) {
      baseKey = prefix + text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 20);
    }
    
    // Limiter la longueur
    baseKey = baseKey.substring(0, 40);
    
    // S'assurer que la clé est unique
    let finalKey = baseKey || 'text';
    let counter = 1;
    
    while (this.translations.has(`${namespace}.${finalKey}`)) {
      finalKey = `${baseKey}_${counter}`;
      counter++;
    }
    
    return finalKey;
  }

  async generateTranslations() {
    if (this.translations.size === 0) return;

    // Chemin vers votre structure existante
    const translationsPath = 'i18n/locales/fr/translation.json';
    const translationsDir = path.dirname(translationsPath);
    
    await fs.mkdir(translationsDir, { recursive: true });

    // Charger les traductions existantes
    let existingTranslations = {};
    if (await this.fileExists(translationsPath)) {
      existingTranslations = JSON.parse(await fs.readFile(translationsPath, 'utf-8'));
    }

    // Créer la structure imbriquée
    const newTranslations = { ...existingTranslations };
    
    for (const [fullKey, data] of this.translations) {
      const parts = fullKey.split('.');
      let current = newTranslations;
      
      // Créer la structure imbriquée
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      
      // Ajouter la traduction finale
      current[parts[parts.length - 1]] = data.text;
    }
    
    if (!this.dryRun) {
      await fs.writeFile(
        translationsPath, 
        JSON.stringify(newTranslations, null, 2) + '\n'
      );
    }
    
    console.log(chalk.blue(`\n📄 Traductions ajoutées à: ${translationsPath}`));
    console.log(chalk.yellow(`   ${this.translations.size} nouvelles traductions`));

    // Afficher un aperçu de la structure
    const namespaces = new Set();
    for (const [fullKey] of this.translations) {
      const namespace = fullKey.split('.')[0];
      namespaces.add(namespace);
    }
    
    console.log(chalk.blue('\n📚 Namespaces ajoutés:'));
    Array.from(namespaces).sort().forEach(ns => {
      const count = Array.from(this.translations.keys()).filter(k => k.startsWith(ns + '.')).length;
      console.log(chalk.gray(`   - ${ns} (${count} traductions)`));
    });
  }

  showSummary() {
    console.log(chalk.green.bold('\n✅ Résumé de la migration UI:\n'));
    console.log(chalk.white(`📁 Fichiers à migrer: ${chalk.yellow(this.stats.totalFiles)}`));
    console.log(chalk.white(`✅ Fichiers migrés: ${chalk.green(this.stats.migratedFiles)}`));
    console.log(chalk.white(`⏭️  Fichiers ignorés: ${chalk.gray(this.stats.skippedFiles)}`));
    console.log(chalk.white(`📝 Textes traduits: ${chalk.yellow(this.stats.totalTexts)}`));
    
    if (this.stats.errors > 0) {
      console.log(chalk.red(`❌ Erreurs: ${this.stats.errors}`));
      console.log(chalk.red('\nFichiers avec erreurs:'));
      this.errors.forEach(({ file, error }) => {
        console.log(chalk.red(`  - ${file}: ${error}`));
      });
    }
    
    if (this.dryRun) {
      console.log(chalk.yellow('\n⚠️  Mode DRY RUN - Aucun fichier n\'a été modifié'));
      console.log(chalk.cyan('💡 Pour appliquer les changements: npm run i18n:migrate:ui:single'));
    } else {
      console.log(chalk.green('\n✨ Migration UI terminée avec succès!'));
      console.log(chalk.cyan('💡 N\'oubliez pas de:'));
      console.log(chalk.cyan('   1. Vérifier le fichier i18n/locales/fr/translation.json'));
      console.log(chalk.cyan('   2. Copier les nouvelles traductions vers les autres langues'));
      console.log(chalk.cyan('   3. Tester l\'application'));
    }
  }
}

// Gérer les arguments de ligne de commande
const isDryRun = process.argv.includes('--dry') || process.argv.includes('--dry-run');

const migrator = new I18nUIMigratorSingleFile({ dryRun: isDryRun });
migrator.migrate().catch(console.error);