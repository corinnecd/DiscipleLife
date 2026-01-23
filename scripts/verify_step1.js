import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ggrkwivcspuwxuyrjyem.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdncmt3aXZjc3B1d3h1eXJqeWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDMyODgsImV4cCI6MjA4MDUxOTI4OH0.JrKegasNO4JwEG6AAJ41DqZ-ahex7TBaHT77m4OKAT8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
    console.log('🔍 Vérification des famille_id assignés...\n');
    
    // Vérifier les profils avec famille_id
    const { data: profilsAvecFamille, error: error1 } = await supabase
        .from('profils')
        .select('id, first_name, last_name, email, role, famille_id')
        .not('famille_id', 'is', null);
    
    if (error1) {
        console.error('❌ Erreur:', error1.message);
    } else {
        console.log(`✅ ${profilsAvecFamille.length} profil(s) avec famille_id:`);
        profilsAvecFamille.forEach(p => {
            console.log(`   - ${p.first_name} ${p.last_name} (${p.role}): famille_id = ${p.famille_id}`);
        });
    }
    
    // Vérifier les familles et leurs superviseurs
    console.log('\n📋 Vérification des familles et superviseurs...\n');
    const { data: familles, error: error2 } = await supabase
        .from('familles_disciples')
        .select('id, nom, identifiant_famille, superviseur_id')
        .order('identifiant_famille');
    
    if (error2) {
        console.error('❌ Erreur:', error2.message);
    } else {
        for (const famille of familles) {
            if (famille.superviseur_id) {
                const { data: superviseur, error: error3 } = await supabase
                    .from('profils')
                    .select('id, first_name, last_name, famille_id')
                    .eq('id', famille.superviseur_id)
                    .single();
                
                if (!error3 && superviseur) {
                    const status = superviseur.famille_id === famille.id ? '✅' : '❌';
                    console.log(`${status} ${famille.identifiant_famille} (${famille.nom}): Superviseur ${superviseur.first_name} ${superviseur.last_name} - famille_id = ${superviseur.famille_id} (attendu: ${famille.id})`);
                }
            }
        }
    }
    
    // Statistiques
    const { data: allProfils, error: error4 } = await supabase
        .from('profils')
        .select('id, famille_id');
    
    if (!error4 && allProfils) {
        const avecFamille = allProfils.filter(p => p.famille_id !== null).length;
        const sansFamille = allProfils.filter(p => p.famille_id === null).length;
        console.log('\n📈 Statistiques:');
        console.log(`   - Profils avec famille_id: ${avecFamille}`);
        console.log(`   - Profils sans famille_id: ${sansFamille}`);
        console.log(`   - Total: ${allProfils.length}`);
    }
}

verify();
