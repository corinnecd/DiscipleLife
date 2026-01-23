/**
 * Script pour promouvoir les disciples qui ont des disciples au statut de mentor
 * Exécution sécurisée avec vérifications préalables
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement (optionnel)
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Utiliser les credentials depuis customSupabaseClient.js ou les variables d'environnement
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ggrkwivcspuwxuyrjyem.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdncmt3aXZjc3B1d3h1eXJqeWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDMyODgsImV4cCI6MjA4MDUxOTI4OH0.JrKegasNO4JwEG6AAJ41DqZ-ahex7TBaHT77m4OKAT8';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('Assurez-vous que VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont définies');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Étape 1: Diagnostic - Identifier les disciples à promouvoir
 */
async function diagnostic() {
  console.log('\n🔍 ÉTAPE 1: Diagnostic des disciples à promouvoir...\n');

  try {
    // 1. Récupérer tous les disciples (exclure pasteurs, superviseurs, admins)
    const { data: disciples, error: disciplesError } = await supabase
      .from('profils')
      .select('id, first_name, last_name, email, role')
      .eq('role', 'disciple');

    if (disciplesError) {
      console.error('❌ Erreur lors de la récupération des disciples:', disciplesError);
      return null;
    }

    if (!disciples || disciples.length === 0) {
      console.log('✅ Aucun disciple trouvé.');
      return [];
    }

    console.log(`📋 ${disciples.length} disciple(s) trouvé(s). Vérification des disciples...\n`);

    // 2. Pour chaque disciple, vérifier s'il a des disciples
    const disciplesToPromote = [];

    for (const disciple of disciples) {
      // Compter les disciples via user_id (disciples directs)
      const { count: countViaUserId, error: error1 } = await supabase
        .from('cercle_personnes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', disciple.id);

      if (error1) {
        console.warn(`⚠️ Erreur pour ${disciple.first_name} ${disciple.last_name} (user_id):`, error1.message);
        continue;
      }

      // Compter les disciples via parent_disciple_id (disciples de disciples)
      // D'abord trouver les entrées cercle_personnes avec user_id = disciple.id
      const { data: cercleEntries, error: error2 } = await supabase
        .from('cercle_personnes')
        .select('id')
        .eq('user_id', disciple.id);

      let countViaParentId = 0;
      if (!error2 && cercleEntries && cercleEntries.length > 0) {
        const cercleIds = cercleEntries.map(e => e.id);
        const { count, error: error3 } = await supabase
          .from('cercle_personnes')
          .select('*', { count: 'exact', head: true })
          .in('parent_disciple_id', cercleIds);

        if (!error3) {
          countViaParentId = count || 0;
        }
      }

      const totalDisciples = (countViaUserId || 0) + countViaParentId;

      if (totalDisciples > 0) {
        disciplesToPromote.push({
          ...disciple,
          disciples_via_user_id: countViaUserId || 0,
          disciples_via_parent_id: countViaParentId,
          total_disciples: totalDisciples
        });
      }
    }

    if (disciplesToPromote.length === 0) {
      console.log('✅ Aucun disciple à promouvoir trouvé.');
      return [];
    }

    console.log(`📊 ${disciplesToPromote.length} disciple(s) trouvé(s) avec des disciples:\n`);
    disciplesToPromote.forEach((disciple, index) => {
      console.log(`${index + 1}. ${disciple.first_name} ${disciple.last_name} (${disciple.email})`);
      console.log(`   - Disciples via user_id: ${disciple.disciples_via_user_id || 0}`);
      console.log(`   - Disciples via parent_disciple_id: ${disciple.disciples_via_parent_id || 0}`);
      console.log(`   - Total: ${disciple.total_disciples} disciple(s)`);
      console.log(`   - ID: ${disciple.id}\n`);
    });

    return disciplesToPromote;
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
    return null;
  }
}

/**
 * Étape 2: Promotion des disciples en mentors
 */
async function promoteDisciples(disciplesToPromote) {
  if (!disciplesToPromote || disciplesToPromote.length === 0) {
    console.log('✅ Aucun disciple à promouvoir.');
    return { success: true, count: 0 };
  }

  console.log(`\n⚙️ ÉTAPE 2: Promotion de ${disciplesToPromote.length} disciple(s) au statut de mentor...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const disciple of disciplesToPromote) {
    try {
      const { data, error } = await supabase
        .from('profils')
        .update({ 
          role: 'mentor',
          updated_at: new Date().toISOString()
        })
        .eq('id', disciple.id)
        .eq('role', 'disciple') // Double vérification pour sécurité
        .select();

      if (error) {
        console.error(`❌ Erreur pour ${disciple.first_name} ${disciple.last_name}:`, error.message);
        errorCount++;
      } else if (data && data.length > 0) {
        console.log(`✅ ${disciple.first_name} ${disciple.last_name} promu au statut de mentor (${disciple.total_disciples} disciple(s))`);
        successCount++;
      } else {
        console.log(`⚠️ ${disciple.first_name} ${disciple.last_name} n'a pas pu être promu (rôle déjà modifié?)`);
      }
    } catch (error) {
      console.error(`❌ Erreur pour ${disciple.first_name} ${disciple.last_name}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Résultat: ${successCount} promu(s), ${errorCount} erreur(s)\n`);

  return { success: errorCount === 0, count: successCount, errors: errorCount };
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🚀 Démarrage de la promotion des disciples au statut de mentor\n');
  console.log('=' .repeat(60));

  // Étape 1: Diagnostic
  const disciplesToPromote = await diagnostic();

  if (disciplesToPromote === null) {
    console.error('❌ Le diagnostic a échoué. Arrêt du script.');
    process.exit(1);
  }

  if (disciplesToPromote.length === 0) {
    console.log('✅ Aucune action nécessaire.');
    process.exit(0);
  }

  // Demander confirmation
  console.log('\n⚠️ ATTENTION: Cette opération va modifier le rôle de', disciplesToPromote.length, 'profil(s)');
  console.log('Appuyez sur Ctrl+C pour annuler, ou attendez 5 secondes pour continuer...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Étape 2: Promotion
  const result = await promoteDisciples(disciplesToPromote);

  if (result.success) {
    console.log('✅ Migration terminée avec succès!');
  } else {
    console.log('⚠️ Migration terminée avec des erreurs. Vérifiez les logs ci-dessus.');
  }

  console.log('\n' + '='.repeat(60));
}

// Exécuter le script
main().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
