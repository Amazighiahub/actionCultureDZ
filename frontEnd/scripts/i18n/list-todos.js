// scripts/i18n/list-todos.js
import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';

async function listTodos() {
  const languages = ['ar', 'en', 'tz-ltn', 'tz-tfng'];
  const basePath = 'i18n/locales';
  
  console.log(chalk.blue.bold('\n📋 Analyse des traductions TODO\n'));
  
  const todosByLanguage = {};
  const todosByNamespace = {};
  
  for (const lang of languages) {
    const langPath = path.join(basePath, lang, 'translation.json');
    
    try {
      const translations = JSON.parse(await fs.readFile(langPath, 'utf-8'));
      const todos = findTodos(translations, lang);
      
      todosByLanguage[lang] = todos;
      
      // Grouper par namespace
      todos.forEach(({ path, value }) => {
        const namespace = path.split('.')[0];
        if (!todosByNamespace[namespace]) {
          todosByNamespace[namespace] = {};
        }
        if (!todosByNamespace[namespace][lang]) {
          todosByNamespace[namespace][lang] = 0;
        }
        todosByNamespace[namespace][lang]++;
      });
      
    } catch (error) {
      console.error(chalk.red(`❌ Erreur pour ${lang}:`), error.message);
    }
  }
  
  // Afficher les statistiques par langue
  console.log(chalk.yellow('📊 TODOs par langue:\n'));
  for (const [lang, todos] of Object.entries(todosByLanguage)) {
    console.log(chalk.white(`  ${lang}: ${chalk.yellow(todos.length)} traductions à faire`));
  }
  
  // Afficher les namespaces prioritaires
  console.log(chalk.yellow('\n🎯 Namespaces prioritaires (nombre de TODOs):\n'));
  const namespaces = Object.entries(todosByNamespace)
    .sort((a, b) => {
      const totalA = Object.values(a[1]).reduce((sum, n) => sum + n, 0);
      const totalB = Object.values(b[1]).reduce((sum, n) => sum + n, 0);
      return totalB - totalA;
    })
    .slice(0, 10);
  
  namespaces.forEach(([namespace, langs]) => {
    const total = Object.values(langs).reduce((sum, n) => sum + n, 0);
    console.log(chalk.white(`  ${namespace}: ${chalk.yellow(total)} TODOs`));
  });
  
  // Générer un rapport CSV
  await generateCSVReport(todosByLanguage);
  
  console.log(chalk.green('\n✅ Analyse terminée!'));
  console.log(chalk.cyan('📄 Rapport CSV généré: reports/translation-todos.csv'));
}

function findTodos(obj, lang, path = '') {
  let todos = [];
  
  for (const key in obj) {
    const fullPath = path ? `${path}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      todos = todos.concat(findTodos(obj[key], lang, fullPath));
    } else if (typeof obj[key] === 'string' && obj[key].startsWith(`[TODO ${lang.toUpperCase()}]`)) {
      todos.push({
        path: fullPath,
        value: obj[key],
        originalText: obj[key].replace(`[TODO ${lang.toUpperCase()}] `, '')
      });
    }
  }
  
  return todos;
}

async function generateCSVReport(todosByLanguage) {
  await fs.mkdir('reports', { recursive: true });
  
  let csv = 'Language,Key,Original Text (FR)\n';
  
  for (const [lang, todos] of Object.entries(todosByLanguage)) {
    todos.forEach(({ path, originalText }) => {
      csv += `"${lang}","${path}","${originalText.replace(/"/g, '""')}"\n`;
    });
  }
  
  await fs.writeFile('reports/translation-todos.csv', csv);
}

// Exécuter le script
listTodos().catch(console.error);