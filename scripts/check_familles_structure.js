/**
 * Script de vérification: Vérifier la structure familles_disciples
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ggrkwivcspuwxuyrjyem.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdncmt3aXZjc3B1d3h1eXJqeWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDMyODgsImV4cCI6MjA4MDUxOTI4OH0.JrKegasNO4JwEG6AAJ41DqZ-ahex7TBaHT77m4OKAT8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFamillesStructure() {
  console.log('\n🔍 Vérification de la structure familles_disciples...\n');

  // 1. Compter toutes les familles
  const { count: totalFamilles, error: error1 } = await supabase
    .from('familles_disciples')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total de familles: ${totalFamilles || 0}`);

  // 2. Vérifier les disciples par famille
  const { data: familles, error: error2 } = await supabase
    .from('familles_disciples')
    .select('id, nom_famille, superviseur_id')
    .limit(10);

  if (familles && familles.length > 0) {
    console.log(`\n📋 Premières familles:`);
    for (const famille of familles) {
      // Compter les disciples dans cette famille
      const { count: discipleCount, error: error3 } = await supabase
        .from('profils')
        .select('*', { count: 'exact', head: true })
        .eq('famille_id', famille.id)
        .eq('role', 'disciple');

      // Récupérer le superviseur
      let superviseurName = 'N/A';
      if (famille.superviseur_id) {
        const { data: sup } = await supabase
          .from('profils')
          .select('first_name, last_name, role')
          .eq('id', famille.superviseur_id)
          .maybeSingle();
        if (sup) {
          superviseurName = `${sup.first_name} ${sup.last_name} (${sup.role})`;
        }
      }

      console.log(`\n   Famille: ${famille.nom_famille || famille.id}`);
      console.log(`   - Superviseur: ${superviseurName}`);
      console.log(`   - Disciples: ${discipleCount || 0}`);
    }
  }

  // 3. Vérifier les disciples qui ont d'autres disciples dans leur famille
  const { data: allDisciples, error: error4 } = await supabase
    .from('profils')
    .select('id, first_name, last_name, email, role, famille_id')
    .eq('role', 'disciple');

  console.log(`\n📋 Vérification des ${allDisciples?.length || 0} disciple(s)...`);

  let disciplesWithDisciples = [];
  for (const disciple of allDisciples || []) {
    if (!disciple.famille_id) continue;

    // Compter les autres disciples dans la même famille
    const { count: otherDisciples, error: error5 } = await supabase
      .from('profils')
      .select('*', { count: 'exact', head: true })
      .eq('famille_id', disciple.famille_id)
      .eq('role', 'disciple')
      .neq('id', disciple.id);

    if (otherDisciples && otherDisciples > 0) {
      disciplesWithDisciples.push({
        ...disciple,
        otherDisciplesCount: otherDisciples
      });
    }
  }

  if (disciplesWithDisciples.length > 0) {
    console.log(`\n✅ ${disciplesWithDisciples.length} disciple(s) avec d'autres disciples dans leur famille:`);
    disciplesWithDisciples.forEach((d, i) => {
      console.log(`   ${i + 1}. ${d.first_name} ${d.last_name} (${d.email})`);
      console.log(`      - ${d.otherDisciplesCount} autre(s) disciple(s) dans la famille ${d.famille_id}`);
    });
  } else {
    console.log(`\n⚠️ Aucun disciple trouvé avec d'autres disciples dans sa famille.`);
  }

  // 4. Vérifier si les relations sont peut-être dans une autre structure
  console.log(`\n🔍 Recherche de "Thomas MARTINEZ"...`);
  const { data: thomas, error: error6 } = await supabase
    .from('profils')
    .select('id, first_name, last_name, email, role, famille_id')
    .or('first_name.ilike.%thomas%,last_name.ilike.%martinez%');

  if (thomas && thomas.length > 0) {
    thomas.forEach(t => {
      console.log(`\n   Trouvé: ${t.first_name} ${t.last_name} (${t.email})`);
      console.log(`   - Rôle: ${t.role}`);
      console.log(`   - Famille ID: ${t.famille_id || 'N/A'}`);
    });
  } else {
    console.log(`   Aucun résultat trouvé.`);
  }
}

checkFamillesStructure().catch(console.error);
