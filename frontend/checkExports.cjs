const fs = require('fs');
const path = require('path');

console.log('🔍 Diagnostic des exports dans vos services...\n');

const services = [
    'src/services/upload.service.ts',
    'src/services/media.service.ts'
];

const authServicePath = 'src/services/auth.service.ts';

// Analyser chaque service
services.forEach(servicePath => {
    console.log(`📄 Analyse de ${servicePath}:`);
    
    if (!fs.existsSync(servicePath)) {
        console.log(`   ❌ Fichier non trouvé!\n`);
        return;
    }
    
    const content = fs.readFileSync(servicePath, 'utf-8');
    
    // Chercher les patterns d'export
    const exportPatterns = [
        /export\s+class\s+(\w+)/g,
        /export\s+const\s+(\w+)/g,
        /export\s+function\s+(\w+)/g,
        /export\s+{\s*([^}]+)\s*}/g,
        /export\s+default\s+(\w+)/g,
        /export\s+default\s+class\s+(\w+)/g,
        /export\s+default\s+{\s*([^}]+)\s*}/g
    ];
    
    let exports = [];
    let hasDefaultExport = false;
    
    exportPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            if (pattern.source.includes('default')) {
                hasDefaultExport = true;
                console.log(`   ✓ Export par défaut trouvé: ${match[1]}`);
            } else {
                const exportName = match[1].trim();
                if (exportName.includes(',')) {
                    // Multiple exports
                    exportName.split(',').forEach(exp => {
                        const cleaned = exp.trim();
                        if (cleaned) {
                            exports.push(cleaned);
                            console.log(`   ✓ Export nommé: ${cleaned}`);
                        }
                    });
                } else {
                    exports.push(exportName);
                    console.log(`   ✓ Export nommé: ${exportName}`);
                }
            }
        }
    });
    
    if (exports.length === 0 && !hasDefaultExport) {
        console.log('   ⚠️ Aucun export trouvé!');
    }
    
    console.log('');
});

// Analyser auth.service.ts
console.log('📄 Analyse de auth.service.ts:\n');

if (fs.existsSync(authServicePath)) {
    const authContent = fs.readFileSync(authServicePath, 'utf-8');
    
    // Chercher les imports problématiques
    const uploadImport = authContent.match(/import\s*{\s*UploadService\s*}\s*from\s*['"]\.\/upload\.service['"]/);
    const mediaImport = authContent.match(/import\s*{\s*MediaService\s*}\s*from\s*['"]\.\/media\.service['"]/);
    
    if (uploadImport) {
        console.log('   ⚠️ Import trouvé: { UploadService } from "./upload.service"');
        console.log('      → Vérifiez que UploadService est bien exporté avec ce nom exact');
    }
    
    if (mediaImport) {
        console.log('   ⚠️ Import trouvé: { MediaService } from "./media.service"');
        console.log('      → Vérifiez que MediaService est bien exporté avec ce nom exact');
    }
}

console.log('\n📋 Solutions possibles:\n');
console.log('1. Si les services utilisent un export par défaut:');
console.log('   Changez: import { UploadService } from "./upload.service"');
console.log('   En:      import UploadService from "./upload.service"\n');

console.log('2. Si les services exportent avec un nom différent:');
console.log('   Adaptez l\'import au nom réel exporté\n');

console.log('3. Si les services n\'ont pas d\'export:');
console.log('   Ajoutez dans upload.service.ts: export const UploadService = { ... }');
console.log('   ou: export class UploadService { ... }\n');

// Proposer une correction automatique
console.log('🔧 Tentative de correction automatique...\n');

const fixes = [];

// Vérifier upload.service.ts
if (fs.existsSync('src/services/upload.service.ts')) {
    const uploadContent = fs.readFileSync('src/services/upload.service.ts', 'utf-8');
    
    // Chercher un export par défaut
    if (uploadContent.match(/export\s+default/)) {
        fixes.push({
            file: authServicePath,
            find: /import\s*{\s*UploadService\s*}\s*from\s*['"]\.\/upload\.service['"]/g,
            replace: 'import UploadService from "./upload.service"'
        });
        console.log('✓ upload.service.ts utilise un export par défaut');
    }
    // Chercher si c'est exporté sous un autre nom
    else {
        const classMatch = uploadContent.match(/export\s+class\s+(\w+)/);
        const constMatch = uploadContent.match(/export\s+const\s+(\w+)/);
        
        if (classMatch && classMatch[1] !== 'UploadService') {
            fixes.push({
                file: authServicePath,
                find: /import\s*{\s*UploadService\s*}\s*from\s*['"]\.\/upload\.service['"]/g,
                replace: `import { ${classMatch[1]} as UploadService } from "./upload.service"`
            });
            console.log(`✓ La classe est exportée comme "${classMatch[1]}", pas "UploadService"`);
        } else if (constMatch && constMatch[1] !== 'UploadService') {
            fixes.push({
                file: authServicePath,
                find: /import\s*{\s*UploadService\s*}\s*from\s*['"]\.\/upload\.service['"]/g,
                replace: `import { ${constMatch[1]} as UploadService } from "./upload.service"`
            });
            console.log(`✓ La constante est exportée comme "${constMatch[1]}", pas "UploadService"`);
        }
    }
}

// Même chose pour media.service.ts
if (fs.existsSync('src/services/media.service.ts')) {
    const mediaContent = fs.readFileSync('src/services/media.service.ts', 'utf-8');
    
    if (mediaContent.match(/export\s+default/)) {
        fixes.push({
            file: authServicePath,
            find: /import\s*{\s*MediaService\s*}\s*from\s*['"]\.\/media\.service['"]/g,
            replace: 'import MediaService from "./media.service"'
        });
        console.log('✓ media.service.ts utilise un export par défaut');
    } else {
        const classMatch = mediaContent.match(/export\s+class\s+(\w+)/);
        const constMatch = mediaContent.match(/export\s+const\s+(\w+)/);
        
        if (classMatch && classMatch[1] !== 'MediaService') {
            fixes.push({
                file: authServicePath,
                find: /import\s*{\s*MediaService\s*}\s*from\s*['"]\.\/media\.service['"]/g,
                replace: `import { ${classMatch[1]} as MediaService } from "./media.service"`
            });
            console.log(`✓ La classe est exportée comme "${classMatch[1]}", pas "MediaService"`);
        } else if (constMatch && constMatch[1] !== 'MediaService') {
            fixes.push({
                file: authServicePath,
                find: /import\s*{\s*MediaService\s*}\s*from\s*['"]\.\/media\.service['"]/g,
                replace: `import { ${constMatch[1]} as MediaService } from "./media.service"`
            });
            console.log(`✓ La constante est exportée comme "${constMatch[1]}", pas "MediaService"`);
        }
    }
}

// Appliquer les corrections
if (fixes.length > 0 && fs.existsSync(authServicePath)) {
    console.log(`\n🔧 Application de ${fixes.length} correction(s)...`);
    
    let authContent = fs.readFileSync(authServicePath, 'utf-8');
    
    fixes.forEach(fix => {
        authContent = authContent.replace(fix.find, fix.replace);
    });
    
    fs.writeFileSync(authServicePath, authContent);
    console.log('✅ Corrections appliquées!');
} else if (fixes.length === 0) {
    console.log('\n⚠️ Impossible de déterminer automatiquement les corrections nécessaires.');
    console.log('   Veuillez vérifier manuellement les exports dans vos fichiers de service.');
}

console.log('\n🚀 Relancez "npm run build" pour vérifier');