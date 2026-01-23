import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ggrkwivcspuwxuyrjyem.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdncmt3aXZjc3B1d3h1eXJqeWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDMyODgsImV4cCI6MjA4MDUxOTI4OH0.JrKegasNO4JwEG6AAJ41DqZ-ahex7TBaHT77m4OKAT8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function executeStep1RPC() {
    console.log('🚀 ÉTAPE 1: Assignation des famille_id aux profils (via RPC)');
    console.log('='.repeat(60));
    
    try {
        // Appeler la fonction RPC
        console.log('\n📋 Appel de la fonction RPC...');
        const { data, error } = await supabase.rpc('assign_famille_id_to_profils');
        
        if (error) {
            // Si la fonction n'existe pas, on doit d'abord la créer
            if (error.message.includes('function') || error.message.includes('does not exist')) {
                console.log('⚠️  La fonction RPC n\'existe pas encore.');
                console.log('📝 Veuillez d\'abord exécuter le script SQL suivant dans l\'éditeur SQL de Supabase:');
                console.log('   sql/migrations/077b_assign_famille_id_rpc.sql');
                console.log('\n💡 Instructions:');
                console.log('   1. Ouvrez Supabase Dashboard');
                console.log('   2. Allez dans SQL Editor');
                console.log('   3. Copiez-collez le contenu de sql/migrations/077b_assign_famille_id_rpc.sql');
                console.log('   4. Exécutez le script');
                console.log('   5. Relancez ce script');
                return;
            }
            throw error;
        }
        
        if (!data || data.length === 0) {
            console.log('⚠️  Aucune mise à jour effectuée (peut-être que tous les famille_id sont déjà assignés)');
        } else {
            console.log(`✅ ${data.length} profil(s) mis à jour:`);
            data.forEach(item => {
                if (item.updated) {
                    console.log(`   ✓ ${item.superviseur_nom} → ${item.famille_identifiant} (${item.famille_nom})`);
                }
            });
        }
        
        // Vérification
        console.log('\n📊 Vérification des résultats...');
        const { data: profilsAvecFamille, error: verifError } = await supabase
            .from('profils')
            .select('id, first_name, last_name, email, role, famille_id')
            .not('famille_id', 'is', null);
        
        if (verifError) {
            console.error(`❌ Erreur lors de la vérification: ${verifError.message}`);
        } else {
            console.log(`✅ ${profilsAvecFamille.length} profil(s) avec famille_id assigné`);
        }
        
        console.log('\n✅ ÉTAPE 1 TERMINÉE');
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('\n❌ ERREUR:');
        console.error(error.message);
        console.error('\n💡 Solution: Exécutez le script SQL directement dans l\'éditeur SQL de Supabase');
        console.error('   Fichier: sql/migrations/077_assign_famille_id_to_profils.sql');
    }
}

executeStep1RPC();
