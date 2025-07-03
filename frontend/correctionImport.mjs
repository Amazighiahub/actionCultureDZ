import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtenir le répertoire actuel en ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Correction des imports mixtes dans votre projet EventCulture...\n');

// Chemin vers auth.service.ts
const authServicePath = path.join(__dirname, 'src/services/auth.service.ts');

if (!fs.existsSync(authServicePath)) {
    console.error('❌ Erreur: Fichier auth.service.ts non trouvé!');
    console.error('   Chemin recherché:', authServicePath);
    console.error('   Vérifiez que vous êtes bien dans le dossier frontend/');
    process.exit(1);
}

console.log('📄 Lecture du fichier auth.service.ts...');

// Lire le contenu du fichier
let content = fs.readFileSync(authServicePath, 'utf-8');
const originalContent = content;

// Créer une sauvegarde
const backupPath = authServicePath + '.backup';
fs.writeFileSync(backupPath, originalContent);
console.log(`✅ Sauvegarde créée: ${backupPath}\n`);

console.log('🔍 Analyse du contenu...\n');

let modified = false;

// Vérifier si les imports statiques existent déjà
const hasUploadImport = content.includes("import") && content.includes("UploadService") && content.includes("'./upload.service'");
const hasMediaImport = content.includes("import") && content.includes("MediaService") && content.includes("'./media.service'");

// Ajouter les imports statiques si nécessaire
let importsToAdd = [];

if (!hasUploadImport) {
    importsToAdd.push("import { UploadService } from './upload.service';");
}
if (!hasMediaImport) {
    importsToAdd.push("import { MediaService } from './media.service';");
}

// Ajouter les imports en haut du fichier
if (importsToAdd.length > 0) {
    console.log(`📝 Ajout de ${importsToAdd.length} import(s) statique(s)...`);
    
    // Trouver où insérer les imports
    const importMatches = content.match(/^import\s+.*$/gm);
    
    if (importMatches && importMatches.length > 0) {
        // Ajouter après le dernier import existant
        const lastImport = importMatches[importMatches.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const beforeImport = content.substring(0, lastImportIndex + lastImport.length);
        const afterImport = content.substring(lastImportIndex + lastImport.length);
        content = beforeImport + '\n' + importsToAdd.join('\n') + afterImport;
    } else {
        // Ajouter au début du fichier
        content = importsToAdd.join('\n') + '\n\n' + content;
    }
    modified = true;
}

// Remplacer les imports dynamiques
const patterns = [
    {
        name: 'upload.service',
        patterns: [
            /const\s+(\w+)\s*=\s*await\s+import\s*\(\s*['"`]\.\/upload\.service['"`]\s*\)/g,
            /\(await\s+import\s*\(\s*['"`]\.\/upload\.service['"`]\s*\)\)/g,
            /await\s+import\s*\(\s*['"`]\.\/upload\.service['"`]\s*\)/g
        ]
    },
    {
        name: 'media.service',
        patterns: [
            /const\s+(\w+)\s*=\s*await\s+import\s*\(\s*['"`]\.\/media\.service['"`]\s*\)/g,
            /\(await\s+import\s*\(\s*['"`]\.\/media\.service['"`]\s*\)\)/g,
            /await\s+import\s*\(\s*['"`]\.\/media\.service['"`]\s*\)/g
        ]
    }
];

console.log('🔄 Conversion des imports dynamiques...\n');

patterns.forEach(({ name, patterns: servicePatterns }) => {
    servicePatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
            console.log(`✓ Trouvé ${matches.length} import(s) dynamique(s) pour ${name}`);
            
            if (name === 'upload.service') {
                // Remplacer par une référence directe
                content = content.replace(pattern, (match) => {
                    // Si c'est une assignation, garder juste UploadService
                    if (match.includes('const')) {
                        const varName = match.match(/const\s+(\w+)/)?.[1];
                        return `const ${varName} = UploadService`;
                    }
                    // Sinon, remplacer par UploadService
                    return 'UploadService';
                });
            } else if (name === 'media.service') {
                content = content.replace(pattern, (match) => {
                    if (match.includes('const')) {
                        const varName = match.match(/const\s+(\w+)/)?.[1];
                        return `const ${varName} = MediaService`;
                    }
                    return 'MediaService';
                });
            }
            modified = true;
        }
    });
});

// Écrire le fichier modifié
if (modified) {
    fs.writeFileSync(authServicePath, content);
    console.log('\n✅ Succès! Fichier modifié');
    console.log('📁 Fichier: src/services/auth.service.ts');
    console.log('💾 Sauvegarde: src/services/auth.service.ts.backup');
    
    console.log('\n📋 Vérifications importantes:');
    console.log('1. Assurez-vous que UploadService et MediaService sont bien exportés');
    console.log('2. Exemple d\'export attendu dans upload.service.ts:');
    console.log('   export class UploadService { ... }');
    console.log('   ou');
    console.log('   export const UploadService = { ... }');
} else {
    console.log('\n⚠️ Aucune modification effectuée');
    console.log('   Les imports pourraient déjà être corrigés');
}

console.log('\n🚀 Lancez maintenant: npm run build');
console.log('💡 Pour restaurer: cp src/services/auth.service.ts.backup src/services/auth.service.ts');