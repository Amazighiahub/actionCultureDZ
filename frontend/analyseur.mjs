#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ProjectAnalyzer {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.allFiles = new Set();
    this.usedFiles = new Set();
    this.entryPoints = new Set();
    this.imports = new Map(); // file -> Set of imported files
    this.missingImports = new Map(); // file -> Set of missing imports
    this.unusedDependencies = new Set();
    this.missingDependencies = new Set();
    
    // Extensions à analyser
    this.extensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs'];
    
    // Fichiers/dossiers à ignorer
    this.ignorePaths = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.next',
      '.cache',
      'public',
      'static'
    ];
    
    // Fichiers d'entrée typiques
    this.entryFiles = [
      'index.js',
      'index.jsx',
      'index.ts',
      'index.tsx',
      'app.js',
      'app.jsx',
      'app.ts',
      'app.tsx',
      'server.js',
      'server.ts',
      'main.js',
      'main.ts'
    ];
  }

  async analyze() {
    console.log('🔍 Analyse du projet en cours...\n');
    
    try {
      // 1. Scanner tous les fichiers
      await this.scanFiles(this.projectPath);
      
      // 2. Identifier les points d'entrée
      await this.findEntryPoints();
      
      // 3. Analyser les imports
      await this.analyzeImports();
      
      // 4. Analyser package.json
      await this.analyzePackageJson();
      
      // 5. Générer le rapport
      this.generateReport();
      
      // 6. Proposer les actions
      await this.proposeActions();
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'analyse:', error.message);
    }
  }

  async scanFiles(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(this.projectPath, fullPath);
      
      // Ignorer certains dossiers/fichiers
      if (this.shouldIgnore(relativePath)) continue;
      
      if (entry.isDirectory()) {
        await this.scanFiles(fullPath);
      } else if (this.isJavaScriptFile(entry.name)) {
        this.allFiles.add(relativePath);
      }
    }
  }

  shouldIgnore(filePath) {
    return this.ignorePaths.some(ignore => 
      filePath.includes(ignore) || filePath.startsWith(ignore)
    );
  }

  isJavaScriptFile(filename) {
    return this.extensions.some(ext => filename.endsWith(ext));
  }

  async findEntryPoints() {
    // Chercher dans package.json
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      
      // Main entry
      if (packageJson.main) {
        this.entryPoints.add(this.normalizeFilePath(packageJson.main));
      }
      
      // Scripts
      if (packageJson.scripts) {
        for (const script of Object.values(packageJson.scripts)) {
          const match = script.match(/node\s+([^\s]+)|tsx?\s+([^\s]+)/);
          if (match) {
            const file = match[1] || match[2];
            if (file && !file.startsWith('-')) {
              this.entryPoints.add(this.normalizeFilePath(file));
            }
          }
        }
      }
    } catch (e) {
      // Pas de package.json ou erreur de lecture
    }
    
    // Chercher les fichiers d'entrée typiques
    for (const file of this.allFiles) {
      const basename = path.basename(file);
      if (this.entryFiles.includes(basename)) {
        this.entryPoints.add(file);
      }
      
      // Fichiers de test
      if (file.includes('.test.') || file.includes('.spec.') || file.includes('__tests__')) {
        this.entryPoints.add(file);
      }
      
      // Pages (Next.js, etc.)
      if (file.includes('pages/') || file.includes('src/pages/')) {
        this.entryPoints.add(file);
      }
    }
    
    // S'assurer qu'on a au moins un point d'entrée
    if (this.entryPoints.size === 0 && this.allFiles.size > 0) {
      this.entryPoints.add(this.allFiles.values().next().value);
    }
  }

  normalizeFilePath(filePath) {
    // Enlever ./ du début si présent
    if (filePath.startsWith('./')) {
      filePath = filePath.slice(2);
    }
    
    // Si pas d'extension, essayer d'en trouver une
    if (!path.extname(filePath)) {
      for (const ext of this.extensions) {
        if (this.allFiles.has(filePath + ext)) {
          return filePath + ext;
        }
      }
      // Essayer aussi avec /index
      for (const ext of this.extensions) {
        const indexPath = path.join(filePath, `index${ext}`);
        if (this.allFiles.has(indexPath)) {
          return indexPath;
        }
      }
    }
    
    return filePath;
  }

  async analyzeImports() {
    const queue = [...this.entryPoints];
    const processed = new Set();
    
    while (queue.length > 0) {
      const file = queue.shift();
      if (processed.has(file)) continue;
      
      processed.add(file);
      this.usedFiles.add(file);
      
      const imports = await this.extractImports(file);
      this.imports.set(file, imports);
      
      for (const imp of imports) {
        if (!processed.has(imp) && this.allFiles.has(imp)) {
          queue.push(imp);
        }
      }
    }
  }

  async extractImports(filePath) {
    const imports = new Set();
    const fullPath = path.join(this.projectPath, filePath);
    
    try {
      const content = await fs.readFile(fullPath, 'utf8');
      const ast = parse(content, {
        sourceType: 'module',
        plugins: [
          'jsx',
          'typescript',
          'decorators-legacy',
          'dynamicImport',
          'importMeta'
        ],
        errorRecovery: true
      });
      
      traverse.default(ast, {
        ImportDeclaration: (nodePath) => {
          const importPath = nodePath.node.source.value;
          this.processImport(filePath, importPath, imports);
        },
        CallExpression: (nodePath) => {
          const { callee, arguments: args } = nodePath.node;
          
          // require()
          if (callee.name === 'require' && args.length > 0 && args[0].type === 'StringLiteral') {
            this.processImport(filePath, args[0].value, imports);
          }
          
          // import() dynamique
          if (callee.type === 'Import' && args.length > 0 && args[0].type === 'StringLiteral') {
            this.processImport(filePath, args[0].value, imports);
          }
        },
        ExportAllDeclaration: (nodePath) => {
          if (nodePath.node.source) {
            this.processImport(filePath, nodePath.node.source.value, imports);
          }
        },
        ExportNamedDeclaration: (nodePath) => {
          if (nodePath.node.source) {
            this.processImport(filePath, nodePath.node.source.value, imports);
          }
        }
      });
    } catch (error) {
      console.warn(`⚠️  Impossible d'analyser ${filePath}: ${error.message}`);
    }
    
    return imports;
  }

  processImport(fromFile, importPath, imports) {
    // Ignorer les imports de node_modules
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      return;
    }
    
    const dir = path.dirname(fromFile);
    let resolvedPath = path.join(dir, importPath);
    resolvedPath = path.normalize(resolvedPath);
    
    // Essayer de résoudre le fichier
    const normalized = this.normalizeFilePath(resolvedPath);
    
    if (this.allFiles.has(normalized)) {
      imports.add(normalized);
    } else {
      // Ajouter aux imports manquants
      if (!this.missingImports.has(fromFile)) {
        this.missingImports.set(fromFile, new Set());
      }
      this.missingImports.get(fromFile).add(importPath);
    }
  }

  async analyzePackageJson() {
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      
      // Vérifier quelles dépendances sont utilisées
      const usedDeps = new Set();
      
      for (const file of this.usedFiles) {
        const fullPath = path.join(this.projectPath, file);
        try {
          const content = await fs.readFile(fullPath, 'utf8');
          
          // Recherche simple des imports/require
          const importRegex = /(?:import|require)\s*\(?['"]([^'"]+)['"]\)?/g;
          let match;
          
          while ((match = importRegex.exec(content)) !== null) {
            const dep = match[1];
            
            // Si ce n'est pas un chemin relatif
            if (!dep.startsWith('.') && !dep.startsWith('/')) {
              const packageName = dep.startsWith('@') 
                ? dep.split('/').slice(0, 2).join('/')
                : dep.split('/')[0];
              
              if (allDeps[packageName]) {
                usedDeps.add(packageName);
              }
            }
          }
        } catch (e) {
          // Ignorer les erreurs de lecture
        }
      }
      
      // Dépendances non utilisées
      for (const dep of Object.keys(allDeps)) {
        if (!usedDeps.has(dep)) {
          this.unusedDependencies.add(dep);
        }
      }
      
    } catch (e) {
      console.log('ℹ️  Pas de package.json trouvé');
    }
  }

  generateReport() {
    console.log('📊 RAPPORT D\'ANALYSE\n');
    console.log('='.repeat(50) + '\n');
    
    // Statistiques générales
    console.log('📈 Statistiques:');
    console.log(`   • Fichiers totaux: ${this.allFiles.size}`);
    console.log(`   • Fichiers utilisés: ${this.usedFiles.size}`);
    console.log(`   • Fichiers non utilisés: ${this.allFiles.size - this.usedFiles.size}`);
    console.log(`   • Points d'entrée: ${this.entryPoints.size}\n`);
    
    // Fichiers non utilisés
    const unusedFiles = [...this.allFiles].filter(f => !this.usedFiles.has(f));
    if (unusedFiles.length > 0) {
      console.log('🗑️  Fichiers non utilisés:');
      unusedFiles.forEach(file => console.log(`   • ${file}`));
      console.log();
    }
    
    // Imports manquants
    if (this.missingImports.size > 0) {
      console.log('❌ Imports manquants:');
      for (const [file, imports] of this.missingImports) {
        console.log(`   Dans ${file}:`);
        for (const imp of imports) {
          console.log(`     • ${imp}`);
        }
      }
      console.log();
    }
    
    // Dépendances non utilisées
    if (this.unusedDependencies.size > 0) {
      console.log('📦 Dépendances non utilisées dans package.json:');
      for (const dep of this.unusedDependencies) {
        console.log(`   • ${dep}`);
      }
      console.log();
    }
    
    console.log('='.repeat(50) + '\n');
  }

  async proposeActions() {
    const unusedFiles = [...this.allFiles].filter(f => !this.usedFiles.has(f));
    
    if (unusedFiles.length === 0 && this.unusedDependencies.size === 0) {
      console.log('✅ Votre projet semble être propre!');
      return;
    }
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const question = (query) => new Promise(resolve => rl.question(query, resolve));
    
    // Proposer de supprimer les fichiers non utilisés
    if (unusedFiles.length > 0) {
      const response = await question(
        `\n🗑️  Voulez-vous supprimer les ${unusedFiles.length} fichiers non utilisés? (o/N) `
      );
      
      if (response.toLowerCase() === 'o') {
        for (const file of unusedFiles) {
          const fullPath = path.join(this.projectPath, file);
          try {
            await fs.unlink(fullPath);
            console.log(`   ✅ Supprimé: ${file}`);
          } catch (e) {
            console.log(`   ❌ Erreur lors de la suppression de ${file}: ${e.message}`);
          }
        }
      }
    }
    
    // Proposer de nettoyer package.json
    if (this.unusedDependencies.size > 0) {
      const response = await question(
        `\n📦 Voulez-vous retirer les ${this.unusedDependencies.size} dépendances non utilisées du package.json? (o/N) `
      );
      
      if (response.toLowerCase() === 'o') {
        console.log('\n💡 Pour retirer les dépendances non utilisées, exécutez:');
        console.log(`   npm uninstall ${[...this.unusedDependencies].join(' ')}`);
      }
    }
    
    rl.close();
  }
}

// Fonction principale
async function main() {
  const projectPath = process.argv[2] || process.cwd();
  
  console.log(`\n🚀 Analyse du projet: ${projectPath}\n`);
  
  const analyzer = new ProjectAnalyzer(projectPath);
  await analyzer.analyze();
}

// Lancer l'analyse
main().catch(console.error);