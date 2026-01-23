import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ggrkwivcspuwxuyrjyem.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdncmt3aXZjc3B1d3h1eXJqeWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDMyODgsImV4cCI6MjA4MDUxOTI4OH0.JrKegasNO4JwEG6AAJ41DqZ-ahex7TBaHT77m4OKAT8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStructure() {
    console.log('🔍 Vérification de la structure de la table profils...\n');
    
    // Essayer de lire un profil pour voir les colonnes disponibles
    const { data: profil, error: error1 } = await supabase
        .from('profils')
        .select('*')
        .limit(1)
        .single();
    
    if (error1) {
        console.error('❌ Erreur lors de la lecture:', error1.message);
    } else {
        console.log('✅ Colonnes disponibles dans profils:');
        console.log(Object.keys(profil));
        console.log('\nExemple de profil:');
        console.log(JSON.stringify(profil, null, 2));
    }
    
    // Essayer une mise à jour de test
    console.log('\n🧪 Test de mise à jour...');
    if (profil && profil.id) {
        const { data: updated, error: updateError } = await supabase
            .from('profils')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', profil.id)
            .select();
        
        if (updateError) {
            console.error('❌ Erreur lors de la mise à jour:', updateError.message);
            console.error('Détails:', updateError);
        } else {
            console.log('✅ Mise à jour réussie:', updated);
        }
    }
}

checkStructure();
