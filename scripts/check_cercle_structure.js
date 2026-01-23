/**
 * Script de vérification: Vérifier la structure de cercle_personnes
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ggrkwivcspuwxuyrjyem.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdncmt3aXZjc3B1d3h1eXJqeWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDMyODgsImV4cCI6MjA4MDUxOTI4OH0.JrKegasNO4JwEG6AAJ41DqZ-ahex7TBaHT77m4OKAT8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCercleStructure() {
  console.log('\n🔍 Vérification de la structure cercle_personnes...\n');

  // 1. Compter toutes les entrées
  const { count: totalCount, error: error1 } = await supabase
    .from('cercle_personnes')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total d'entrées dans cercle_personnes: ${totalCount || 0}`);

  // 2. Vérifier les entrées avec user_id
  const { data: withUserId, error: error2 } = await supabase
    .from('cercle_personnes')
    .select('id, name, first_name, last_name, user_id, parent_disciple_id, circle_type')
    .not('user_id', 'is', null)
    .limit(20);

  console.log(`\n📋 Entrées avec user_id (premiers 20): ${withUserId?.length || 0}`);
  if (withUserId && withUserId.length > 0) {
    console.log('\n   Exemples:');
    withUserId.slice(0, 5).forEach((entry, i) => {
      console.log(`   ${i + 1}. ${entry.name || `${entry.first_name} ${entry.last_name}`} (user_id: ${entry.user_id})`);
    });
  }

  // 3. Vérifier les entrées avec parent_disciple_id
  const { data: withParentId, error: error3 } = await supabase
    .from('cercle_personnes')
    .select('id, name, first_name, last_name, user_id, parent_disciple_id, circle_type')
    .not('parent_disciple_id', 'is', null)
    .limit(20);

  console.log(`\n📋 Entrées avec parent_disciple_id (premiers 20): ${withParentId?.length || 0}`);
  if (withParentId && withParentId.length > 0) {
    console.log('\n   Exemples:');
    withParentId.slice(0, 5).forEach((entry, i) => {
      console.log(`   ${i + 1}. ${entry.name || `${entry.first_name} ${entry.last_name}`} (parent_disciple_id: ${entry.parent_disciple_id})`);
    });
  }

  // 4. Vérifier les profils qui ont des entrées dans cercle_personnes
  const { data: allCercle, error: error4 } = await supabase
    .from('cercle_personnes')
    .select('user_id')
    .not('user_id', 'is', null);

  if (allCercle) {
    const uniqueUserIds = [...new Set(allCercle.map(c => c.user_id))];
    console.log(`\n👥 ${uniqueUserIds.length} profil(s) unique(s) avec des disciples dans cercle_personnes`);

    // Vérifier leurs rôles
    if (uniqueUserIds.length > 0) {
      const { data: profils, error: error5 } = await supabase
        .from('profils')
        .select('id, first_name, last_name, email, role')
        .in('id', uniqueUserIds.slice(0, 10));

      if (profils) {
        console.log('\n   Rôles de ces profils:');
        profils.forEach((p, i) => {
          const discipleCount = allCercle.filter(c => c.user_id === p.id).length;
          console.log(`   ${i + 1}. ${p.first_name} ${p.last_name} - Rôle: ${p.role} (${discipleCount} disciple(s))`);
        });
      }
    }
  }

  // 5. Chercher spécifiquement "Thomas MARTINEZ" ou similaire
  const { data: thomas, error: error6 } = await supabase
    .from('profils')
    .select('id, first_name, last_name, email, role')
    .or('first_name.ilike.%thomas%,last_name.ilike.%martinez%');

  if (thomas && thomas.length > 0) {
    console.log('\n🔍 Recherche "Thomas MARTINEZ":');
    thomas.forEach(t => {
      console.log(`   - ${t.first_name} ${t.last_name} (${t.email}) - Rôle: ${t.role}`);
      
      // Vérifier ses disciples
      supabase
        .from('cercle_personnes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', t.id)
        .then(({ count }) => {
          console.log(`     → ${count || 0} disciple(s) dans cercle_personnes`);
        });
    });
  }
}

checkCercleStructure().catch(console.error);
