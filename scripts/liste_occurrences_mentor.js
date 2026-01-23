/**
 * Script pour lister toutes les occurrences de "mentor" dans le code
 */

import { readFileSync } from 'fs';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const occurrences = {
  code: [],
  sql: []
};

// Chercher dans src/
const srcFiles = await glob('src/**/*.{js,jsx}', { cwd: join(__dirname, '..') });

for (const file of srcFiles) {
  try {
    const content = readFileSync(join(__dirname, '..', file), 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const lowerLine = line.toLowerCase();
      
      // Chercher les patterns
      if (lowerLine.includes('mentor')) {
        const patterns = [
          /['"]mentor['"]/g,
          /role\s*[=!]==?\s*['"]mentor['"]/g,
          /role\.eq\.mentor/g,
          /role\s*===\s*['"]mentor['"]/g,
          /role\s*==\s*['"]mentor['"]/g,
          /\.role\s*===\s*['"]mentor['"]/g,
          /role:\s*['"]mentor['"]/g,
          /'mentor'/g,
          /"mentor"/g,
          /mentor/g
        ];
        
        patterns.forEach(pattern => {
          if (pattern.test(line)) {
            occurrences.code.push({
              file,
              line: lineNum,
              content: line.trim(),
              pattern: pattern.toString()
            });
          }
        });
      }
    });
  } catch (error) {
    console.warn(`Erreur lecture ${file}:`, error.message);
  }
}

// Chercher dans sql/
const sqlFiles = await glob('sql/**/*.sql', { cwd: join(__dirname, '..') });

for (const file of sqlFiles) {
  try {
    const content = readFileSync(join(__dirname, '..', file), 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.includes('mentor')) {
        occurrences.sql.push({
          file,
          line: lineNum,
          content: line.trim()
        });
      }
    });
  } catch (error) {
    console.warn(`Erreur lecture ${file}:`, error.message);
  }
}

// Afficher le rapport
console.log('\n' + '='.repeat(80));
console.log('📋 RAPPORT DES OCCURRENCES DE "mentor"');
console.log('='.repeat(80) + '\n');

console.log(`📊 Total d'occurrences dans le code: ${occurrences.code.length}`);
console.log(`📊 Total d'occurrences dans SQL: ${occurrences.sql.length}\n`);

// Grouper par fichier
const parFichier = {};
occurrences.code.forEach(occ => {
  if (!parFichier[occ.file]) parFichier[occ.file] = [];
  parFichier[occ.file].push(occ);
});

console.log('📁 Fichiers JavaScript/JSX à modifier:\n');
Object.entries(parFichier).forEach(([file, occs]) => {
  console.log(`   ${file} (${occs.length} occurrence(s)):`);
  occs.slice(0, 5).forEach(occ => {
    console.log(`      Ligne ${occ.line}: ${occ.content.substring(0, 80)}...`);
  });
  if (occs.length > 5) {
    console.log(`      ... et ${occs.length - 5} autre(s) occurrence(s)`);
  }
  console.log('');
});

console.log('\n📁 Fichiers SQL à modifier:\n');
const parFichierSQL = {};
occurrences.sql.forEach(occ => {
  if (!parFichierSQL[occ.file]) parFichierSQL[occ.file] = [];
  parFichierSQL[occ.file].push(occ);
});

Object.entries(parFichierSQL).forEach(([file, occs]) => {
  console.log(`   ${file} (${occs.length} occurrence(s)):`);
  occs.slice(0, 3).forEach(occ => {
    console.log(`      Ligne ${occ.line}: ${occ.content.substring(0, 80)}...`);
  });
  if (occs.length > 3) {
    console.log(`      ... et ${occs.length - 3} autre(s) occurrence(s)`);
  }
  console.log('');
});

console.log('\n' + '='.repeat(80));
console.log('✅ ANALYSE TERMINÉE');
console.log('='.repeat(80) + '\n');
