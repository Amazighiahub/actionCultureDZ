// scripts/i18n/clean.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import ora from 'ora';
import { createInterface } from 'readline';

interface CleanupReport {
  removedKeys: Map<string, string[]>;
  totalRemoved: number;
  filesModified: string[];
}

class I18nCleaner {
  private spinner = ora();
  private report: CleanupReport = {
    removedKeys: new Map(),
    totalRemoved: 0,
    filesModified: []
  };
  
  async clean() {
    console.log(chalk.blue.bold('\n🧹 Nettoyage des clés i18n non utilisées...\n'));
    
    // Charger le rapport de validation
    let validationReport;
    try {
      const content = await fs.readFile('reports/i18n-validation.json', 'utf-8');
      validationReport = JSON.parse(content);
    } catch (error) {
      console.error(chalk.red('❌ Erreur: Rapport de validation introuvable.'));
      console.log(chalk.yellow('Exécutez d\'abord: npm run i18n:validate'));
      process.exit(1);
    }
    
    // Filtrer les clés non utilisées
    const unusedKeys = validationReport.warnings
      .filter((w: any) => w.type === 'unused_key')
      .map((w: any) => w.message.match(/"([^"]+)"/)?.[1])
      .filter(Boolean);
    
    if (unusedKeys.length === 0) {
      console.log(chalk.green('✅ Aucune clé non utilisée à nettoyer!'));
      return;
    }
    
    console.log(chalk.yellow(`🔍 ${unusedKeys.length} clés non utilisées trouvées`));
    
    // Demander confirmation
    const confirmed = await this.confirmCleanup(unusedKeys);
    if (!confirmed) {
      console.log(chalk.yellow('\n❌ Nettoyage annulé'));
      return;
    }
    
    // Nettoyer les fichiers
    await this.cleanTranslationFiles(unusedKeys);
    
    // Générer le rapport
    await this.generateReport();
  }
  
  private async confirmCleanup(keys: string[]): Promise<boolean> {
    console.log(chalk.yellow('\nClés à supprimer:'));
    keys.slice(0, 10).forEach(key => {
      console.log(chalk.gray(`  - ${key}`));
    });
    if (keys.length > 10) {
      console.log(chalk.gray(`  ... et ${keys.length - 10} autres`));
    }
    
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      rl.question(chalk.yellow('\n⚠️  Confirmer la suppression? (y/N) '), (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y');
      });
    });
  }
  
  private async cleanTranslationFiles(unusedKeys: string[]) {
    this.spinner.start('Nettoyage des fichiers...');
    
    const translationFiles = await glob('src/i18n/locales/**/*.json');
    
    for (const file of translationFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const translations = JSON.parse(content);
        
        const pathParts = file.split(path.sep);
        const namespace = path.basename(file, '.json');
        
        let modified = false;
        const removedFromFile: string[] = [];
        
        // Nettoyer les clés
        for (const key of unusedKeys) {
          if (key.startsWith(namespace + '.')) {
            const simpleKey = key.split('.').slice(1).join('.');
            if (this.deleteKey(translations, simpleKey.split('.'))) {
              removedFromFile.push(key);
              modified = true;
            }
          }
        }
        
        if (modified) {
          // Sauvegarder le fichier nettoyé
          await fs.writeFile(
            file,
            JSON.stringify(translations, null, 2)
          );
          
          this.report.filesModified.push(file);
          this.report.removedKeys.set(file, removedFromFile);
          this.report.totalRemoved += removedFromFile.length;
        }
        
      } catch (error) {
        console.error(chalk.red(`\nErreur lors du nettoyage de ${file}:`), error);
      }
    }
    
    this.spinner.succeed('Nettoyage terminé!');
  }
  
  private deleteKey(obj: any, keyPath: string[]): boolean {
    if (keyPath.length === 1) {
      if (keyPath[0] in obj) {
        delete obj[keyPath[0]];
        return true;
      }
      return false;
    }
    
    const [head, ...tail] = keyPath;
    if (typeof obj[head] === 'object' && obj[head] !== null) {
      const deleted = this.deleteKey(obj[head], tail);
      
      // Supprimer l'objet parent s'il est vide
      if (deleted && Object.keys(obj[head]).length === 0) {
        delete obj[head];
      }
      
      return deleted;
    }
    
    return false;
  }
  
  private async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRemoved: this.report.totalRemoved,
        filesModified: this.report.filesModified.length
      },
      details: Array.from(this.report.removedKeys.entries()).map(([file, keys]) => ({
        file,
        removedKeys: keys
      }))
    };
    
    // Sauvegarder le rapport
    await fs.writeFile(
      'reports/i18n-cleanup.json',
      JSON.stringify(report, null, 2)
    );
    
    // Afficher le résumé
    console.log(chalk.green.bold('\n✅ Nettoyage terminé!\n'));
    console.log(chalk.white(`🗑️  Clés supprimées: ${chalk.green(this.report.totalRemoved)}`));
    console.log(chalk.white(`📁 Fichiers modifiés: ${chalk.green(this.report.filesModified.length)}`));
    
    if (this.report.filesModified.length > 0) {
      console.log(chalk.cyan('\nFichiers nettoyés:'));
      this.report.filesModified.slice(0, 5).forEach(file => {
        const keys = this.report.removedKeys.get(file)!;
        console.log(chalk.gray(`  ✓ ${file} (${keys.length} clés)`));
      });
      if (this.report.filesModified.length > 5) {
        console.log(chalk.gray(`  ... et ${this.report.filesModified.length - 5} autres`));
      }
    }
    
    console.log(chalk.blue(`\n📊 Rapport complet: ${chalk.underline('reports/i18n-cleanup.json')}`));
    console.log(chalk.cyan('\n💡 Pour vérifier: npm run i18n:validate'));
  }
}

// Lancer le nettoyage
const cleaner = new I18nCleaner();
cleaner.clean().catch(console.error);