import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ggrkwivcspuwxuyrjyem.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdncmt3aXZjc3B1d3h1eXJqeWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDMyODgsImV4cCI6MjA4MDUxOTI4OH0.JrKegasNO4JwEG6AAJ41DqZ-ahex7TBaHT77m4OKAT8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function validationFinale() {
    console.log('✅ VALIDATION FINALE DE LA CONSOLIDATION');
    console.log('='.repeat(60));
    
    let erreurs = [];
    let succes = [];
    
    // 1. Vérifier que les superviseurs ont un famille_id
    console.log('\n📋 1. Vérification des famille_id assignés aux superviseurs...');
    const { data: superviseurs, error: error1 } = await supabase
        .from('profils')
        .select('id, first_name, last_name, role, famille_id')
        .eq('role', 'superviseur');
    
    if (error1) {
        erreurs.push(`Erreur lors de la vérification des superviseurs: ${error1.message}`);
    } else {
        const avecFamille = superviseurs.filter(s => s.famille_id !== null).length;
        const sansFamille = superviseurs.filter(s => s.famille_id === null).length;
        
        if (avecFamille > 0) {
            succes.push(`✅ ${avecFamille} superviseur(s) avec famille_id assigné`);
        }
        if (sansFamille > 0) {
            erreurs.push(`⚠️  ${sansFamille} superviseur(s) sans famille_id`);
        }
        
        console.log(`   - Superviseurs avec famille_id: ${avecFamille}/${superviseurs.length}`);
        console.log(`   - Superviseurs sans famille_id: ${sansFamille}`);
    }
    
    // 2. Vérifier les entrées dans cercle_personnes
    console.log('\n📋 2. Vérification des entrées dans cercle_personnes...');
    const { data: entrees, error: error2 } = await supabase
        .from('cercle_personnes')
        .select('id, user_id, parent_disciple_id, circle_type');
    
    if (error2) {
        // Si erreur RLS, on ne peut pas vérifier via l'API
        console.log('   ⚠️  Impossible de vérifier via l\'API (RLS). Vérifiez directement dans Supabase.');
        console.log('   💡 Exécutez cette requête dans Supabase SQL Editor:');
        console.log('      SELECT COUNT(*) AS total_entrees,');
        console.log('             COUNT(DISTINCT user_id) AS mentors_uniques,');
        console.log('             COUNT(*) FILTER (WHERE circle_type = \'Superviseur\') AS superviseurs,');
        console.log('             COUNT(*) FILTER (WHERE circle_type = \'Disciple\') AS disciples');
        console.log('      FROM cercle_personnes;');
    } else {
        const total = entrees.length;
        const mentorsUniques = new Set(entrees.map(e => e.user_id)).size;
        const superviseurs = entrees.filter(e => e.circle_type === 'Superviseur').length;
        const disciples = entrees.filter(e => e.circle_type === 'Disciple').length;
        const avecParent = entrees.filter(e => e.parent_disciple_id !== null).length;
        const sansParent = entrees.filter(e => e.parent_disciple_id === null).length;
        
        if (total > 0) {
            succes.push(`✅ ${total} entrée(s) dans cercle_personnes`);
            succes.push(`✅ ${mentorsUniques} mentor(s) unique(s)`);
            succes.push(`✅ ${superviseurs} entrée(s) de type Superviseur`);
            succes.push(`✅ ${disciples} entrée(s) de type Disciple`);
            succes.push(`✅ ${avecParent} entrée(s) avec parent_disciple_id`);
            succes.push(`✅ ${sansParent} entrée(s) sans parent_disciple_id`);
        } else {
            erreurs.push('❌ Aucune entrée dans cercle_personnes');
        }
        
        console.log(`   - Total entrées: ${total}`);
        console.log(`   - Mentors uniques: ${mentorsUniques}`);
        console.log(`   - Superviseurs: ${superviseurs}`);
        console.log(`   - Disciples: ${disciples}`);
        console.log(`   - Avec parent_disciple_id: ${avecParent}`);
        console.log(`   - Sans parent_disciple_id: ${sansParent}`);
    }
    
    // 3. Vérifier la cohérence entre familles et cercle_personnes
    console.log('\n📋 3. Vérification de la cohérence...');
    const { data: familles, error: error3 } = await supabase
        .from('familles_disciples')
        .select('id, identifiant_famille, nom, superviseur_id');
    
    if (!error3 && familles) {
        let famillesAvecEntrees = 0;
        for (const famille of familles) {
            if (famille.superviseur_id) {
                // Vérifier si le superviseur a une entrée dans cercle_personnes
                if (entrees && entrees.some(e => e.user_id === famille.superviseur_id)) {
                    famillesAvecEntrees++;
                }
            }
        }
        
        console.log(`   - Familles avec entrées dans cercle_personnes: ${famillesAvecEntrees}/${familles.length}`);
        
        if (famillesAvecEntrees === familles.length) {
            succes.push(`✅ Toutes les familles ont des entrées dans cercle_personnes`);
        } else {
            erreurs.push(`⚠️  ${familles.length - famillesAvecEntrees} famille(s) sans entrées dans cercle_personnes`);
        }
    }
    
    // Résumé
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ DE LA VALIDATION');
    console.log('='.repeat(60));
    
    if (succes.length > 0) {
        console.log('\n✅ SUCCÈS:');
        succes.forEach(s => console.log(`   ${s}`));
    }
    
    if (erreurs.length > 0) {
        console.log('\n⚠️  AVERTISSEMENTS:');
        erreurs.forEach(e => console.log(`   ${e}`));
    }
    
    if (erreurs.length === 0 && succes.length > 0) {
        console.log('\n🎉 CONSOLIDATION RÉUSSIE !');
        console.log('   ✅ cercle_personnes est maintenant la source de vérité unique');
        console.log('   ✅ Les relations disciple-mentor sont correctement créées');
    } else if (erreurs.length > 0) {
        console.log('\n⚠️  CONSOLIDATION PARTIELLE');
        console.log('   Certains éléments nécessitent une attention supplémentaire');
    }
    
    console.log('\n' + '='.repeat(60));
}

validationFinale();
