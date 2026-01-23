import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ggrkwivcspuwxuyrjyem.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdncmt3aXZjc3B1d3h1eXJqeWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDMyODgsImV4cCI6MjA4MDUxOTI4OH0.JrKegasNO4JwEG6AAJ41DqZ-ahex7TBaHT77m4OKAT8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
    console.log('🔍 Analyse des hiérarchies de disciples...\n');
    
    // Analyser les familles et leurs disciples
    const { data: familles, error: famillesError } = await supabase
        .from('familles_disciples')
        .select('id, identifiant_famille, nom, superviseur_id')
        .or('statut.eq.actif,statut.is.null')
        .order('identifiant_famille');
    
    if (famillesError) {
        console.error('❌ Erreur:', famillesError.message);
        return;
    }
    
    console.log(`📊 Analyse de ${familles.length} famille(s)...\n`);
    
    let famillesAvecPlusieursDisciples = 0;
    let totalDisciples = 0;
    
    for (const famille of familles) {
        const { data: disciples, error: disciplesError } = await supabase
            .from('profils')
            .select('id, first_name, last_name, role, created_at')
            .eq('famille_id', famille.id)
            .eq('role', 'disciple');
        
        if (!disciplesError && disciples) {
            const count = disciples.length;
            totalDisciples += count;
            
            if (count > 1) {
                famillesAvecPlusieursDisciples++;
                console.log(`📋 ${famille.identifiant_famille} (${famille.nom}): ${count} disciple(s)`);
                disciples.forEach((d, idx) => {
                    const date = d.created_at ? new Date(d.created_at).toLocaleDateString() : 'N/A';
                    console.log(`   ${idx + 1}. ${d.first_name || ''} ${d.last_name || ''} (créé: ${date})`);
                });
            } else if (count === 1) {
                console.log(`✓ ${famille.identifiant_famille} (${famille.nom}): 1 disciple`);
            } else {
                console.log(`⚠️  ${famille.identifiant_famille} (${famille.nom}): 0 disciple`);
            }
        }
    }
    
    console.log('\n📈 Statistiques:');
    console.log(`   - Familles analysées: ${familles.length}`);
    console.log(`   - Familles avec plusieurs disciples: ${famillesAvecPlusieursDisciples}`);
    console.log(`   - Total disciples: ${totalDisciples}`);
    
    // Vérifier les hiérarchies existantes dans cercle_personnes
    console.log('\n🔗 Vérification des hiérarchies dans cercle_personnes...');
    const { data: avecParent, error: avecParentError } = await supabase
        .from('cercle_personnes')
        .select('id, name, parent_disciple_id')
        .not('parent_disciple_id', 'is', null)
        .limit(10);
    
    if (!avecParentError && avecParent) {
        console.log(`   - Entrées avec parent_disciple_id: ${avecParent.length} (affichage limité à 10)`);
        avecParent.forEach((item, idx) => {
            console.log(`   ${idx + 1}. ${item.name} (parent_disciple_id: ${item.parent_disciple_id?.substring(0, 8)}...)`);
        });
    }
    
    console.log('\n💡 Note: Les hiérarchies parent_disciple_id nécessitent une logique métier spécifique.');
    console.log('   Options pour créer les hiérarchies:');
    console.log('   - Date de création (premier disciple = parent)');
    console.log('   - Règle métier spécifique');
    console.log('   - Assignation manuelle');
    
    console.log('\n✅ Analyse terminée');
}

verify();
