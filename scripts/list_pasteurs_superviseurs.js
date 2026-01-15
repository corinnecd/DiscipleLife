/**
 * Script pour lister tous les Pasteurs et Superviseurs avec leurs informations
 * 
 * Usage: node scripts/list_pasteurs_superviseurs.js
 * 
 * Prérequis:
 * - Fichier .env avec SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Configuration dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

dotenv.config({ path: envPath, override: true });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erreur: SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans .env');
  process.exit(1);
}

// Client Supabase avec service_role (permissions admin)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Fonction pour formater un tableau
function formatTable(data, headers) {
  if (data.length === 0) {
    return 'Aucune donnée';
  }

  // Calculer la largeur de chaque colonne
  const colWidths = headers.map((header, index) => {
    const headerLength = header.length;
    const maxDataLength = Math.max(
      ...data.map(row => {
        const value = row[index] || '';
        return String(value).length;
      })
    );
    return Math.max(headerLength, maxDataLength, 10);
  });

  // Fonction pour créer une ligne
  const createRow = (values) => {
    return '| ' + values.map((value, i) => {
      const str = String(value || '');
      return str.padEnd(colWidths[i]);
    }).join(' | ') + ' |';
  };

  // Créer le séparateur
  const separator = '|' + colWidths.map(width => '-'.repeat(width + 2)).join('|') + '|';

  // Construire le tableau
  let table = createRow(headers) + '\n';
  table += separator + '\n';
  data.forEach(row => {
    table += createRow(row) + '\n';
  });

  return table;
}

async function listPasteursAndSuperviseurs() {
  try {
    console.log('📋 Récupération des Pasteurs et Superviseurs...\n');

    // 1. Récupérer tous les pasteurs
    const { data: pasteurs, error: pasteursError } = await supabase
      .from('profils')
      .select('id, first_name, last_name, email, identifiant_unique, role')
      .eq('role', 'pasteur')
      .order('identifiant_unique');

    if (pasteursError) {
      console.error('❌ Erreur lors de la récupération des pasteurs:', pasteursError);
      return;
    }

    // 2. Récupérer tous les superviseurs
    const { data: superviseurs, error: superviseursError } = await supabase
      .from('profils')
      .select('id, first_name, last_name, email, identifiant_unique, role, pasteur_id')
      .eq('role', 'superviseur')
      .order('last_name');

    if (superviseursError) {
      console.error('❌ Erreur lors de la récupération des superviseurs:', superviseursError);
      return;
    }

    // 3. Récupérer les emails depuis Supabase Auth (pour vérifier)
    // Note: Les mots de passe ne peuvent pas être récupérés car ils sont hashés
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.warn('⚠️  Impossible de récupérer les utilisateurs Auth:', authError.message);
    }

    // Créer un mapping email -> user pour récupérer les emails
    const emailMap = new Map();
    if (authUsers) {
      authUsers.forEach(user => {
        emailMap.set(user.id, user.email);
      });
    }

    // 4. Préparer les données pour les pasteurs
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 TABLEAU DES PASTEURS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (pasteurs && pasteurs.length > 0) {
      const pasteursData = pasteurs.map((pasteur, index) => {
        const authEmail = emailMap.get(pasteur.id) || pasteur.email || 'N/A';
        return [
          index + 1,
          pasteur.identifiant_unique || 'N/A',
          pasteur.first_name || '',
          pasteur.last_name || '',
          authEmail,
          '*** (hashé, non récupérable)'
        ];
      });

      const headers = ['#', 'Identifiant', 'Prénom', 'Nom', 'Email', 'Mot de passe'];
      console.log(formatTable(pasteursData, headers));
    } else {
      console.log('Aucun pasteur trouvé.\n');
    }

    // 5. Préparer les données pour les superviseurs
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 TABLEAU DES SUPERVISEURS (RÉFÉRENTS)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (superviseurs && superviseurs.length > 0) {
      // Récupérer les noms des pasteurs pour les superviseurs
      const pasteurMap = new Map();
      if (pasteurs) {
        pasteurs.forEach(p => {
          pasteurMap.set(p.id, `${p.first_name} ${p.last_name} (${p.identifiant_unique})`);
        });
      }

      const superviseursData = superviseurs.map((superviseur, index) => {
        const authEmail = emailMap.get(superviseur.id) || superviseur.email || 'N/A';
        const pasteurName = superviseur.pasteur_id ? pasteurMap.get(superviseur.pasteur_id) || 'N/A' : 'N/A';
        return [
          index + 1,
          superviseur.identifiant_unique || 'N/A',
          superviseur.first_name || '',
          superviseur.last_name || '',
          authEmail,
          '*** (hashé, non récupérable)',
          pasteurName
        ];
      });

      const headers = ['#', 'Identifiant', 'Prénom', 'Nom', 'Email', 'Mot de passe', 'Pasteur de tutelle'];
      console.log(formatTable(superviseursData, headers));
    } else {
      console.log('Aucun superviseur trouvé.\n');
    }

    // 6. Générer un fichier CSV pour export
    const fs = await import('fs');
    const csvPath = join(__dirname, '..', 'liste_pasteurs_superviseurs.csv');
    
    let csvContent = 'ROLE,Identifiant,Prénom,Nom,Email,Mot de passe,Pasteur de tutelle\n';
    
    // Ajouter les pasteurs
    if (pasteurs) {
      pasteurs.forEach(pasteur => {
        const authEmail = emailMap.get(pasteur.id) || pasteur.email || 'N/A';
        csvContent += `Pasteur,${pasteur.identifiant_unique || 'N/A'},${pasteur.first_name || ''},${pasteur.last_name || ''},${authEmail},*** (hashé),N/A\n`;
      });
    }
    
    // Ajouter les superviseurs
    if (superviseurs) {
      const pasteurMap = new Map();
      if (pasteurs) {
        pasteurs.forEach(p => {
          pasteurMap.set(p.id, `${p.first_name} ${p.last_name}`);
        });
      }
      
      superviseurs.forEach(superviseur => {
        const authEmail = emailMap.get(superviseur.id) || superviseur.email || 'N/A';
        const pasteurName = superviseur.pasteur_id ? pasteurMap.get(superviseur.pasteur_id) || 'N/A' : 'N/A';
        csvContent += `Superviseur,${superviseur.identifiant_unique || 'N/A'},${superviseur.first_name || ''},${superviseur.last_name || ''},${authEmail},*** (hashé),${pasteurName}\n`;
      });
    }
    
    fs.writeFileSync(csvPath, csvContent, 'utf8');
    console.log(`\n✅ Fichier CSV généré: ${csvPath}`);

    // 7. Résumé
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📈 RÉSUMÉ');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Total Pasteurs: ${pasteurs?.length || 0}`);
    console.log(`Total Superviseurs: ${superviseurs?.length || 0}`);
    console.log('\n⚠️  Note: Les mots de passe sont hashés dans Supabase Auth et ne peuvent pas être récupérés.');
    console.log('   Pour réinitialiser un mot de passe, utilisez la fonctionnalité "Mot de passe oublié" dans l\'application.\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Exécuter le script
listPasteursAndSuperviseurs();
