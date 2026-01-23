import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Patterns de remplacement (mêmes que dans le script de migration)
const replacements = [
    { pattern: /role\s*===\s*['"]mentor['"]/g, replacement: "role === 'Mentor_pillier'", name: "Comparaison role === 'mentor'" },
    { pattern: /role\s*!==\s*['"]mentor['"]/g, replacement: "role !== 'Mentor_pillier'", name: "Comparaison role !== 'mentor'" },
    { pattern: /role\s*=\s*['"]mentor['"]/g, replacement: "role = 'Mentor_pillier'", name: "Assignation role = 'mentor'" },
    { pattern: /role\.eq\(['"]mentor['"]\)/g, replacement: "role.eq('Mentor_pillier')", name: "Méthode role.eq('mentor')" },
    { pattern: /role\.neq\(['"]mentor['"]\)/g, replacement: "role.neq('Mentor_pillier')", name: "Méthode role.neq('mentor')" },
    { pattern: /role\s*===\s*`mentor`/g, replacement: "role === `Mentor_pillier`", name: "Comparaison role === `mentor`" },
    { pattern: /role\s*!==\s*`mentor`/g, replacement: "role !== `Mentor_pillier`", name: "Comparaison role !== `mentor`" },
    { pattern: /role\s*=\s*`mentor`/g, replacement: "role = `Mentor_pillier`", name: "Assignation role = `mentor`" },
    { pattern: /['"]mentor['"]\s*:/g, replacement: "'Mentor_pillier':", name: "Clé d'objet 'mentor':" },
    { pattern: /:\s*['"]mentor['"]/g, replacement: ": 'Mentor_pillier'", name: "Valeur d'objet : 'mentor'" },
    { pattern: /,\s*['"]mentor['"]/g, replacement: ", 'Mentor_pillier'", name: "Dans un tableau , 'mentor'" },
    { pattern: /\['"]mentor['"]/g, replacement: "['Mentor_pillier']", name: "Accès tableau ['mentor']" },
];

const excludeFiles = [
    '080_migrate_mentor_to_mentor_pillier.sql',
    'analyse_mentor_occurrences.js',
    'migrate_mentor_to_mentor_pillier.js',
    'preview_mentor_migration.js',
    'RAPPORT_ANALYSE_MENTOR.json'
];

function findFiles(dir, extensions, ignoreDirs = ['node_modules', '.git', 'dist', 'build']) {
    const files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        
        if (item.isDirectory() && !ignoreDirs.includes(item.name)) {
            files.push(...findFiles(fullPath, extensions, ignoreDirs));
        } else if (item.isFile()) {
            const ext = path.extname(item.name);
            if (extensions.includes(ext)) {
                const shouldExclude = excludeFiles.some(ex => item.name.includes(ex));
                if (!shouldExclude) {
                    files.push(fullPath);
                }
            }
        }
    }
    
    return files;
}

function previewFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const changes = [];
        
        lines.forEach((line, index) => {
            replacements.forEach(({ pattern, replacement, name }) => {
                if (pattern.test(line)) {
                    const newLine = line.replace(pattern, replacement);
                    if (newLine !== line) {
                        changes.push({
                            line: index + 1,
                            original: line.trim(),
                            modified: newLine.trim(),
                            pattern: name
                        });
                    }
                }
            });
        });
        
        return changes;
    } catch (error) {
        return { error: error.message };
    }
}

async function preview() {
    console.log('👁️  PRÉVISUALISATION: mentor → Mentor_pillier');
    console.log('='.repeat(60));
    
    const srcDir = path.join(__dirname, '..', 'src');
    const jsFiles = findFiles(srcDir, ['.js', '.jsx', '.ts', '.tsx']);
    
    // Analyser les 10 fichiers les plus importants
    const importantFiles = [
        'src/App.jsx',
        'src/context/RoleContext.jsx',
        'src/components/ProtectedRoute.jsx',
        'src/pages/dashboards/AdminDashboard.jsx',
        'src/pages/dashboards/MentorDashboard.jsx',
        'src/pages/Circles.jsx',
        'src/pages/Disciples.jsx',
        'src/lib/genealogicalUtils.js'
    ];
    
    console.log('\n📋 Exemples de modifications dans les fichiers clés:\n');
    
    let totalChanges = 0;
    let filesWithChanges = 0;
    
    for (const filePath of jsFiles) {
        const relativePath = path.relative(process.cwd(), filePath);
        
        // Afficher les fichiers importants ou les 5 premiers avec changements
        if (importantFiles.some(imp => relativePath.includes(imp)) || filesWithChanges < 5) {
            const changes = previewFile(filePath);
            
            if (changes.length > 0) {
                filesWithChanges++;
                totalChanges += changes.length;
                
                console.log(`\n📄 ${relativePath}`);
                console.log('─'.repeat(60));
                
                // Afficher les 5 premiers changements
                changes.slice(0, 5).forEach((change, idx) => {
                    console.log(`\n   Ligne ${change.line} (${change.pattern}):`);
                    console.log(`   ❌ Avant: ${change.original.substring(0, 80)}${change.original.length > 80 ? '...' : ''}`);
                    console.log(`   ✅ Après: ${change.modified.substring(0, 80)}${change.modified.length > 80 ? '...' : ''}`);
                });
                
                if (changes.length > 5) {
                    console.log(`\n   ... et ${changes.length - 5} autre(s) changement(s) dans ce fichier`);
                }
            }
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ DE LA PRÉVISUALISATION');
    console.log('='.repeat(60));
    console.log(`   - Fichiers analysés: ${jsFiles.length}`);
    console.log(`   - Fichiers avec changements: ${filesWithChanges} (exemples ci-dessus)`);
    console.log(`   - Total changements estimés: ${totalChanges}+`);
    
    console.log('\n💡 Types de modifications:');
    replacements.forEach(({ name }) => {
        console.log(`   - ${name}`);
    });
    
    console.log('\n⚠️  NOTE:');
    console.log('   - Les routes (/space/mentor, /signup/mentor) seront conservées');
    console.log('   - Seules les vérifications de rôle seront modifiées');
    console.log('   - Des backups seront créés avant chaque modification');
    
    console.log('\n✅ Pour exécuter la migration:');
    console.log('   node scripts/migrate_mentor_to_mentor_pillier.js');
}

preview();
