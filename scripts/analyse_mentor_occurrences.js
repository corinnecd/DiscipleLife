import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://ggrkwivcspuwxuyrjyem.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdncmt3aXZjc3B1d3h1eXJqeWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDMyODgsImV4cCI6MjA4MDUxOTI4OH0.JrKegasNO4JwEG6AAJ41DqZ-ahex7TBaHT77m4OKAT8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function analyseMentorOccurrences() {
    console.log('🔍 ANALYSE DES OCCURRENCES DE "mentor"');
    console.log('='.repeat(60));
    
    // 1. Analyser la base de données
    console.log('\n📊 1. Analyse de la base de données...');
    const { data: profils, error: error1 } = await supabase
        .from('profils')
        .select('id, first_name, last_name, email, role')
        .in('role', ['mentor', 'Mentor_pillier']);
    
    if (error1) {
        console.error('❌ Erreur:', error1.message);
    } else {
        const mentors = profils.filter(p => p.role === 'mentor');
        const mentorsPilliers = profils.filter(p => p.role === 'Mentor_pillier');
        
        console.log(`   - Profils avec role='mentor': ${mentors.length}`);
        console.log(`   - Profils avec role='Mentor_pillier': ${mentorsPilliers.length}`);
        
        if (mentors.length > 0) {
            console.log('\n   Profils à migrer:');
            mentors.forEach(p => {
                console.log(`     - ${p.first_name} ${p.last_name} (${p.email})`);
            });
        }
    }
    
    // 2. Analyser le code
    console.log('\n📊 2. Analyse du code...');
    
    function findFiles(dir, extensions, ignoreDirs = ['node_modules', '.git']) {
        const files = [];
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            
            if (item.isDirectory() && !ignoreDirs.includes(item.name)) {
                files.push(...findFiles(fullPath, extensions, ignoreDirs));
            } else if (item.isFile()) {
                const ext = path.extname(item.name);
                if (extensions.includes(ext)) {
                    files.push(fullPath);
                }
            }
        }
        
        return files;
    }
    
    const srcDir = path.join(__dirname, '..', 'src');
    const sqlDir = path.join(__dirname, '..', 'sql');
    
    const jsFiles = findFiles(srcDir, ['.js', '.jsx', '.ts', '.tsx']);
    const sqlFiles = findFiles(sqlDir, ['.sql']);
    const allFiles = [...jsFiles, ...sqlFiles];
    
    const occurrences = [];
    
    for (const file of allFiles) {
        try {
            const content = fs.readFileSync(file, 'utf-8');
            const lines = content.split('\n');
            
            lines.forEach((line, index) => {
                // Rechercher les occurrences de 'mentor' (insensible à la casse)
                const regex = /\bmentor\b/gi;
                const matches = line.match(regex);
                
                if (matches) {
                    occurrences.push({
                        file: path.relative(process.cwd(), file),
                        line: index + 1,
                        content: line.trim(),
                        matches: matches.length
                    });
                }
            });
        } catch (error) {
            console.error(`Erreur lors de la lecture de ${file}:`, error.message);
        }
    }
    
    // Grouper par fichier
    const byFile = {};
    occurrences.forEach(occ => {
        if (!byFile[occ.file]) {
            byFile[occ.file] = [];
        }
        byFile[occ.file].push(occ);
    });
    
    console.log(`\n   - Fichiers avec occurrences: ${Object.keys(byFile).length}`);
    console.log(`   - Total occurrences: ${occurrences.length}`);
    
    // Afficher les fichiers les plus concernés
    const sortedFiles = Object.entries(byFile)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 10);
    
    console.log('\n   Top 10 fichiers avec le plus d\'occurrences:');
    sortedFiles.forEach(([file, occs], idx) => {
        console.log(`     ${idx + 1}. ${file} (${occs.length} occurrence(s))`);
    });
    
    // Sauvegarder le rapport
    const mentors = profils?.filter(p => p.role === 'mentor') || [];
    const mentorsPilliers = profils?.filter(p => p.role === 'Mentor_pillier') || [];
    
    const rapport = {
        date: new Date().toISOString(),
        baseDeDonnees: {
            mentors: mentors.length,
            mentorsPilliers: mentorsPilliers.length
        },
        code: {
            fichiers: Object.keys(byFile).length,
            occurrences: occurrences.length,
            details: byFile
        }
    };
    
    fs.writeFileSync(
        path.join(__dirname, '..', 'RAPPORT_ANALYSE_MENTOR.json'),
        JSON.stringify(rapport, null, 2)
    );
    
    console.log('\n✅ Analyse terminée');
    console.log('📄 Rapport sauvegardé dans: RAPPORT_ANALYSE_MENTOR.json');
    console.log('='.repeat(60));
}

analyseMentorOccurrences();
