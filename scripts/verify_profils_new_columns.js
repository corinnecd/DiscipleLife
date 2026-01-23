import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ggrkwivcspuwxuyrjyem.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdncmt3aXZjc3B1d3h1eXJqeWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDMyODgsImV4cCI6MjA4MDUxOTI4OH0.JrKegasNO4JwEG6AAJ41DqZ-ahex7TBaHT77m4OKAT8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
    console.log('✅ Vérification des nouvelles colonnes dans profils...\n');
    
    // Vérifier la structure
    const { data: profil, error: error1 } = await supabase
        .from('profils')
        .select('id, first_name, last_name, eglise, nombre_disciples, avancement_pourcentage, nombre_disciples_presents, taux_participation_semaine, observations')
        .limit(1)
        .single();
    
    if (error1) {
        console.error('❌ Erreur:', error1.message);
        return;
    }
    
    console.log('✅ Colonnes disponibles:');
    console.log(Object.keys(profil));
    
    // Statistiques
    const { data: allProfils, error: error2 } = await supabase
        .from('profils')
        .select('id, eglise, nombre_disciples, avancement_pourcentage, nombre_disciples_presents, taux_participation_semaine, observations');
    
    if (!error2 && allProfils) {
        const total = allProfils.length;
        const avecEglise = allProfils.filter(p => p.eglise !== null && p.eglise !== '').length;
        const avecNombreDisciples = allProfils.filter(p => p.nombre_disciples !== null && p.nombre_disciples !== 0).length;
        const avecAvancement = allProfils.filter(p => p.avancement_pourcentage !== null && p.avancement_pourcentage !== 0).length;
        const avecObservations = allProfils.filter(p => p.observations !== null && p.observations !== '').length;
        
        console.log('\n📊 Statistiques:');
        console.log(`   - Total profils: ${total}`);
        console.log(`   - Avec eglise: ${avecEglise}`);
        console.log(`   - Avec nombre_disciples (non nul/non zéro): ${avecNombreDisciples}`);
        console.log(`   - Avec avancement (non nul/non zéro): ${avecAvancement}`);
        console.log(`   - Avec observations: ${avecObservations}`);
        
        // Vérifier les valeurs par défaut
        const avecDefaultDisciples = allProfils.filter(p => p.nombre_disciples === 0).length;
        const avecDefaultAvancement = allProfils.filter(p => p.avancement_pourcentage === 0).length;
        
        console.log('\n📋 Valeurs par défaut appliquées:');
        console.log(`   - nombre_disciples = 0: ${avecDefaultDisciples}/${total}`);
        console.log(`   - avancement_pourcentage = 0: ${avecDefaultAvancement}/${total}`);
    }
    
    console.log('\n✅ Migration réussie !');
}

verify();
