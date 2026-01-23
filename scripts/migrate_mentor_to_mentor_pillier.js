import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Patterns de remplacement
const replacements = [
    // Patterns exacts pour les rôles
    { pattern: /role\s*===\s*['"]mentor['"]/g, replacement: "role === 'Mentor_pillier'" },
    { pattern: /role\s*!==\s*['"]mentor['"]/g, replacement: "role !== 'Mentor_pillier'" },
    { pattern: /role\s*=\s*['"]mentor['"]/g, replacement: "role = 'Mentor_pillier'" },
    { pattern: /role\.eq\(['"]mentor['"]\)/g, replacement: "role.eq('Mentor_pillier')" },
    { pattern: /role\.neq\(['"]mentor['"]\)/g, replacement: "role.neq('Mentor_pillier')" },
    { pattern: /role\s*===\s*`mentor`/g, replacement: "role === `Mentor_pillier`" },
    { pattern: /role\s*!==\s*`mentor`/g, replacement: "role !== `Mentor_pillier`" },
    { pattern: /role\s*=\s*`mentor`/g, replacement: "role = `Mentor_pillier`" },
    
    // Dans les tableaux/objets
    { pattern: /['"]mentor['"]\s*:/g, replacement: "'Mentor_pillier':" },
    { pattern: /:\s*['"]mentor['"]/g, replacement: ": 'Mentor_pillier'" },
    { pattern: /,\s*['"]mentor['"]/g, replacement: ", 'Mentor_pillier'" },
    { pattern: /\['"]mentor['"]/g, replacement: "['Mentor_pillier']" },
    
    // Dans les commentaires et strings (plus conservateur)
    { pattern: /role\s*===?\s*['"]mentor['"]/g, replacement: "role === 'Mentor_pillier'" },
    { pattern: /role\s*!==?\s*['"]mentor['"]/g, replacement: "role !== 'Mentor_pillier'" },
    
    // Routes (garder les routes mais mettre à jour les vérifications)
    // Note: On garde /space/mentor et /signup/mentor pour la compatibilité
];

// Fichiers à exclure (déjà migrés ou scripts de migration)
const excludeFiles = [
    '080_migrate_mentor_to_mentor_pillier.sql',
    'analyse_mentor_occurrences.js',
    'migrate_mentor_to_mentor_pillier.js',
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

function migrateFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        let newContent = content;
        let changes = 0;
        
        // Appliquer tous les remplacements
        replacements.forEach(({ pattern, replacement }) => {
            const matches = newContent.match(pattern);
            if (matches) {
                newContent = newContent.replace(pattern, replacement);
                changes += matches.length;
            }
        });
        
        // Vérifier s'il y a eu des changements
        if (newContent !== content) {
            // Créer un backup
            const backupPath = filePath + '.backup';
            fs.writeFileSync(backupPath, content);
            
            // Écrire le nouveau contenu
            fs.writeFileSync(filePath, newContent);
            
            return { changed: true, changes, backup: backupPath };
        }
        
        return { changed: false, changes: 0 };
    } catch (error) {
        console.error(`Erreur lors de la migration de ${filePath}:`, error.message);
        return { changed: false, error: error.message };
    }
}

async function migrate() {
    console.log('🔄 MIGRATION: mentor → Mentor_pillier');
    console.log('='.repeat(60));
    
    const srcDir = path.join(__dirname, '..', 'src');
    const jsFiles = findFiles(srcDir, ['.js', '.jsx', '.ts', '.tsx']);
    
    console.log(`\n📁 ${jsFiles.length} fichier(s) à analyser...\n`);
    
    const results = [];
    let totalChanges = 0;
    let filesChanged = 0;
    
    for (const file of jsFiles) {
        const result = migrateFile(file);
        const relativePath = path.relative(process.cwd(), file);
        
        if (result.changed) {
            filesChanged++;
            totalChanges += result.changes;
            console.log(`✅ ${relativePath} (${result.changes} changement(s))`);
            results.push({ file: relativePath, changes: result.changes, backup: result.backup });
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ');
    console.log('='.repeat(60));
    console.log(`   - Fichiers modifiés: ${filesChanged}/${jsFiles.length}`);
    console.log(`   - Total changements: ${totalChanges}`);
    
    if (filesChanged > 0) {
        console.log('\n💾 Backups créés:');
        results.forEach(r => {
            console.log(`   - ${r.backup}`);
        });
        
        console.log('\n⚠️  IMPORTANT:');
        console.log('   1. Vérifiez les fichiers modifiés');
        console.log('   2. Testez l\'application');
        console.log('   3. Si tout fonctionne, supprimez les fichiers .backup');
        console.log('   4. Si problème, restaurez depuis les backups');
    } else {
        console.log('\n✅ Aucun changement nécessaire');
    }
    
    // Sauvegarder le rapport
    const rapport = {
        date: new Date().toISOString(),
        fichiersModifies: filesChanged,
        totalChangements: totalChanges,
        details: results
    };
    
    fs.writeFileSync(
        path.join(__dirname, '..', 'RAPPORT_MIGRATION_MENTOR.json'),
        JSON.stringify(rapport, null, 2)
    );
    
    console.log('\n📄 Rapport sauvegardé dans: RAPPORT_MIGRATION_MENTOR.json');
}

migrate();
