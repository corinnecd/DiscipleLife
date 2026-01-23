import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ggrkwivcspuwxuyrjyem.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdncmt3aXZjc3B1d3h1eXJqeWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDMyODgsImV4cCI6MjA4MDUxOTI4OH0.JrKegasNO4JwEG6AAJ41DqZ-ahex7TBaHT77m4OKAT8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
    console.log('🔍 Vérification des entrées dans cercle_personnes...\n');
    
    // Statistiques générales
    const { data: stats, error: statsError } = await supabase
        .from('cercle_personnes')
        .select('id, user_id, parent_disciple_id, circle_type');
    
    if (statsError) {
        console.error('❌ Erreur:', statsError.message);
        return;
    }
    
    const total = stats.length;
    const mentorsUniques = new Set(stats.map(s => s.user_id)).size;
    const avecParent = stats.filter(s => s.parent_disciple_id !== null).length;
    const sansParent = stats.filter(s => s.parent_disciple_id === null).length;
    const superviseurs = stats.filter(s => s.circle_type === 'Superviseur').length;
    const disciples = stats.filter(s => s.circle_type === 'Disciple').length;
    
    console.log('📊 Statistiques:');
    console.log(`   - Total entrées: ${total}`);
    console.log(`   - Mentors uniques: ${mentorsUniques}`);
    console.log(`   - Avec parent_disciple_id: ${avecParent}`);
    console.log(`   - Sans parent_disciple_id: ${sansParent}`);
    console.log(`   - Superviseurs: ${superviseurs}`);
    console.log(`   - Disciples: ${disciples}`);
    
    // Vérifier quelques entrées
    console.log('\n📋 Exemples d\'entrées créées:');
    const { data: exemples, error: exemplesError } = await supabase
        .from('cercle_personnes')
        .select('id, name, first_name, last_name, circle_type, user_id')
        .limit(10)
        .order('created_at', { ascending: false });
    
    if (!exemplesError && exemples) {
        exemples.forEach((ex, idx) => {
            console.log(`   ${idx + 1}. ${ex.name || `${ex.first_name} ${ex.last_name}`} (${ex.circle_type}) - user_id: ${ex.user_id?.substring(0, 8)}...`);
        });
    }
    
    // Vérifier la cohérence avec les familles
    console.log('\n🔗 Vérification de la cohérence avec les familles...');
    const { data: familles, error: famillesError } = await supabase
        .from('familles_disciples')
        .select('id, identifiant_famille, nom, superviseur_id');
    
    if (!famillesError && familles) {
        let famillesAvecEntrees = 0;
        for (const famille of familles) {
            if (famille.superviseur_id) {
                const { data: entrees, error: entreesError } = await supabase
                    .from('cercle_personnes')
                    .select('id')
                    .eq('user_id', famille.superviseur_id)
                    .limit(1);
                
                if (!entreesError && entrees && entrees.length > 0) {
                    famillesAvecEntrees++;
                }
            }
        }
        console.log(`   - Familles avec entrées dans cercle_personnes: ${famillesAvecEntrees}/${familles.length}`);
    }
    
    console.log('\n✅ Vérification terminée');
}

verify();
