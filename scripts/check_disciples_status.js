/**
 * Script de vérification: Vérifier l'état actuel des disciples et mentors
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ggrkwivcspuwxuyrjyem.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdncmt3aXZjc3B1d3h1eXJqeWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDMyODgsImV4cCI6MjA4MDUxOTI4OH0.JrKegasNO4JwEG6AAJ41DqZ-ahex7TBaHT77m4OKAT8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
  console.log('\n🔍 Vérification de l\'état actuel...\n');

  // 1. Compter tous les profils par rôle
  const { data: allProfils, error: error1 } = await supabase
    .from('profils')
    .select('id, role');

  if (error1) {
    console.error('❌ Erreur:', error1);
    return;
  }

  const roleCounts = {};
  allProfils?.forEach(p => {
    roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;
  });

  console.log('📊 Répartition par rôle:');
  Object.entries(roleCounts).forEach(([role, count]) => {
    console.log(`   - ${role}: ${count}`);
  });

  // 2. Vérifier les disciples qui ont des entrées dans cercle_personnes
  const { data: disciples, error: error2 } = await supabase
    .from('profils')
    .select('id, first_name, last_name, email, role')
    .eq('role', 'disciple');

  if (error2) {
    console.error('❌ Erreur:', error2);
    return;
  }

  console.log(`\n📋 ${disciples?.length || 0} disciple(s) trouvé(s)`);

  // 3. Pour chaque disciple, vérifier s'il a des disciples
  let countWithDisciples = 0;
  for (const disciple of disciples || []) {
    // Vérifier via user_id
    const { count: count1 } = await supabase
      .from('cercle_personnes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', disciple.id);

    // Vérifier via parent_disciple_id
    const { data: cercleEntries } = await supabase
      .from('cercle_personnes')
      .select('id')
      .eq('user_id', disciple.id);

    let count2 = 0;
    if (cercleEntries && cercleEntries.length > 0) {
      const cercleIds = cercleEntries.map(e => e.id);
      const { count } = await supabase
        .from('cercle_personnes')
        .select('*', { count: 'exact', head: true })
        .in('parent_disciple_id', cercleIds);
      count2 = count || 0;
    }

    const total = (count1 || 0) + count2;
    if (total > 0) {
      countWithDisciples++;
      console.log(`\n   ✅ ${disciple.first_name} ${disciple.last_name} (${disciple.email})`);
      console.log(`      - Disciples via user_id: ${count1 || 0}`);
      console.log(`      - Disciples via parent_disciple_id: ${count2}`);
      console.log(`      - Total: ${total} disciple(s)`);
    }
  }

  // 4. Vérifier les mentors actuels
  const { data: mentors, error: error3 } = await supabase
    .from('profils')
    .select('id, first_name, last_name, email, role')
    .eq('role', 'mentor');

  console.log(`\n👥 ${mentors?.length || 0} mentor(s) actuel(s)`);
  if (mentors && mentors.length > 0) {
    console.log('\n   Liste des mentors:');
    mentors.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.first_name} ${m.last_name} (${m.email})`);
    });
  }

  console.log(`\n📊 Résumé:`);
  console.log(`   - Disciples avec des disciples: ${countWithDisciples}`);
  console.log(`   - Mentors actuels: ${mentors?.length || 0}`);
}

checkStatus().catch(console.error);
