/**
 * Script d'analyse complète des sources de données
 * Analyse cercles, familles_disciples, profils sans modification
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ggrkwivcspuwxuyrjyem.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdncmt3aXZjc3B1d3h1eXJqeWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDMyODgsImV4cCI6MjA4MDUxOTI4OH0.JrKegasNO4JwEG6AAJ41DqZ-ahex7TBaHT77m4OKAT8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyseComplete() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 RAPPORT D\'ANALYSE COMPLÈTE DES SOURCES DE DONNÉES');
  console.log('='.repeat(80) + '\n');

  const rapport = {
    cercles: {},
    familles: {},
    profils: {},
    relations: {},
    recommandations: []
  };

  // ============================================
  // 1. ANALYSE DE LA TABLE cercle_personnes
  // ============================================
  console.log('🔍 1. ANALYSE DE LA TABLE cercle_personnes\n');

  const { count: totalCercles, error: errorCercles } = await supabase
    .from('cercle_personnes')
    .select('*', { count: 'exact', head: true });

  rapport.cercles.total = totalCercles || 0;
  console.log(`   📊 Total d'entrées: ${rapport.cercles.total}`);

  if (rapport.cercles.total > 0) {
    const { data: cerclesData, error: errorCerclesData } = await supabase
      .from('cercle_personnes')
      .select('id, name, first_name, last_name, user_id, parent_disciple_id, circle_type, created_at')
      .order('created_at', { ascending: false });

    if (cerclesData) {
      rapport.cercles.donnees = cerclesData;
      
      // Analyser les relations
      const avecUserId = cerclesData.filter(c => c.user_id).length;
      const avecParentId = cerclesData.filter(c => c.parent_disciple_id).length;
      
      console.log(`   - Entrées avec user_id: ${avecUserId}`);
      console.log(`   - Entrées avec parent_disciple_id: ${avecParentId}`);
      
      // Identifier les mentors (via user_id)
      const userIds = [...new Set(cerclesData.filter(c => c.user_id).map(c => c.user_id))];
      console.log(`   - Profils uniques avec des disciples (via user_id): ${userIds.length}`);
      
      if (userIds.length > 0) {
        const { data: mentorsCercles } = await supabase
          .from('profils')
          .select('id, first_name, last_name, email, role')
          .in('id', userIds);
        
        if (mentorsCercles) {
          console.log(`   - Rôles de ces profils:`);
          const rolesCount = {};
          mentorsCercles.forEach(m => {
            rolesCount[m.role] = (rolesCount[m.role] || 0) + 1;
          });
          Object.entries(rolesCount).forEach(([role, count]) => {
            console.log(`     * ${role}: ${count}`);
          });
        }
      }
    }
  } else {
    console.log('   ⚠️ Table vide - aucune donnée dans cercle_personnes');
  }

  // ============================================
  // 2. ANALYSE DE LA TABLE familles_disciples
  // ============================================
  console.log('\n🔍 2. ANALYSE DE LA TABLE familles_disciples\n');

  const { count: totalFamilles, error: errorFamilles } = await supabase
    .from('familles_disciples')
    .select('*', { count: 'exact', head: true });

  rapport.familles.total = totalFamilles || 0;
  console.log(`   📊 Total de familles: ${rapport.familles.total}`);

  if (rapport.familles.total > 0) {
    const { data: famillesData, error: errorFamillesData } = await supabase
      .from('familles_disciples')
      .select('id, nom_famille, superviseur_id, created_at')
      .order('created_at', { ascending: false });

    if (famillesData) {
      rapport.familles.donnees = famillesData;
      
      // Analyser les superviseurs
      const superviseurIds = [...new Set(famillesData.filter(f => f.superviseur_id).map(f => f.superviseur_id))];
      console.log(`   - Familles avec superviseur: ${famillesData.filter(f => f.superviseur_id).length}`);
      console.log(`   - Superviseurs uniques: ${superviseurIds.length}`);

      // Pour chaque famille, compter les disciples
      let totalDisciplesFamilles = 0;
      const famillesAvecDisciples = [];

      for (const famille of famillesData) {
        const { count: countDisciples } = await supabase
          .from('profils')
          .select('*', { count: 'exact', head: true })
          .eq('famille_id', famille.id)
          .eq('role', 'disciple');

        const count = countDisciples || 0;
        totalDisciplesFamilles += count;
        
        if (count > 0) {
          famillesAvecDisciples.push({
            famille_id: famille.id,
            nom: famille.nom_famille,
            superviseur_id: famille.superviseur_id,
            nombre_disciples: count
          });
        }
      }

      console.log(`   - Total de disciples dans toutes les familles: ${totalDisciplesFamilles}`);
      console.log(`   - Familles avec des disciples: ${famillesAvecDisciples.length}`);

      if (famillesAvecDisciples.length > 0) {
        console.log(`\n   📋 Top 10 familles avec le plus de disciples:`);
        famillesAvecDisciples
          .sort((a, b) => b.nombre_disciples - a.nombre_disciples)
          .slice(0, 10)
          .forEach((f, i) => {
            console.log(`     ${i + 1}. ${f.nom || f.famille_id}: ${f.nombre_disciples} disciple(s)`);
          });
      }
    }
  }

  // ============================================
  // 3. ANALYSE DE LA TABLE profils
  // ============================================
  console.log('\n🔍 3. ANALYSE DE LA TABLE profils\n');

  const { data: allProfils, error: errorProfils } = await supabase
    .from('profils')
    .select('id, first_name, last_name, email, role, famille_id, pasteur_id, superviseur_id');

  if (allProfils) {
    rapport.profils.total = allProfils.length;
    console.log(`   📊 Total de profils: ${rapport.profils.total}`);

    // Analyser par rôle
    const rolesCount = {};
    allProfils.forEach(p => {
      rolesCount[p.role] = (rolesCount[p.role] || 0) + 1;
    });

    console.log(`\n   📋 Répartition par rôle:`);
    Object.entries(rolesCount).forEach(([role, count]) => {
      console.log(`     - ${role}: ${count}`);
    });

    // Analyser les disciples
    const disciples = allProfils.filter(p => p.role === 'disciple');
    console.log(`\n   👥 Analyse des ${disciples.length} disciple(s):`);

    const disciplesAvecFamille = disciples.filter(d => d.famille_id).length;
    console.log(`     - Disciples avec famille_id: ${disciplesAvecFamille}`);

    // Identifier les disciples qui ont des disciples (via famille_id)
    let disciplesAvecDisciples = [];
    for (const disciple of disciples) {
      if (!disciple.famille_id) continue;

      // Compter les autres disciples dans la même famille
      const { count: autresDisciples } = await supabase
        .from('profils')
        .select('*', { count: 'exact', head: true })
        .eq('famille_id', disciple.famille_id)
        .eq('role', 'disciple')
        .neq('id', disciple.id);

      if (autresDisciples && autresDisciples > 0) {
        disciplesAvecDisciples.push({
          id: disciple.id,
          nom: `${disciple.first_name} ${disciple.last_name}`,
          email: disciple.email,
          famille_id: disciple.famille_id,
          nombre_autres_disciples: autresDisciples
        });
      }
    }

    console.log(`     - Disciples avec d'autres disciples dans leur famille: ${disciplesAvecDisciples.length}`);
    
    if (disciplesAvecDisciples.length > 0) {
      console.log(`\n     📋 Disciples qui ont des disciples (via famille):`);
      disciplesAvecDisciples.slice(0, 10).forEach((d, i) => {
        console.log(`       ${i + 1}. ${d.nom} (${d.email}) - ${d.nombre_autres_disciples} autre(s) disciple(s) dans famille ${d.famille_id}`);
      });
    }

    // Analyser les mentors
    const mentors = allProfils.filter(p => p.role === 'mentor');
    console.log(`\n   👨‍🏫 Analyse des ${mentors.length} mentor(s):`);
    
    if (mentors.length > 0) {
      console.log(`     📋 Liste des mentors:`);
      mentors.slice(0, 10).forEach((m, i) => {
        console.log(`       ${i + 1}. ${m.first_name} ${m.last_name} (${m.email})`);
      });
    }
  }

  // ============================================
  // 4. ANALYSE DES RELATIONS CROISÉES
  // ============================================
  console.log('\n🔍 4. ANALYSE DES RELATIONS CROISÉES\n');

  // Vérifier si des profils ont des entrées dans cercle_personnes ET une famille_id
  if (allProfils) {
    const profilsAvecFamille = allProfils.filter(p => p.famille_id);
    console.log(`   - Profils avec famille_id: ${profilsAvecFamille.length}`);

    if (rapport.cercles.total > 0 && cerclesData) {
      const profilsDansCercles = [...new Set(cerclesData.filter(c => c.user_id).map(c => c.user_id))];
      const profilsAvecFamilleEtCercle = profilsAvecFamille.filter(p => profilsDansCercles.includes(p.id));
      console.log(`   - Profils avec famille_id ET dans cercle_personnes: ${profilsAvecFamilleEtCercle.length}`);
    }
  }

  // ============================================
  // 5. RECOMMANDATIONS
  // ============================================
  console.log('\n' + '='.repeat(80));
  console.log('💡 RECOMMANDATIONS');
  console.log('='.repeat(80) + '\n');

  if (rapport.cercles.total === 0 && rapport.familles.total > 0) {
    console.log('⚠️ PROBLÈME IDENTIFIÉ:');
    console.log('   - La table cercle_personnes est vide');
    console.log('   - La table familles_disciples contient des données');
    console.log('   - Les relations disciple-mentor sont gérées via familles_disciples');
    console.log('\n   💡 RECOMMANDATION:');
    console.log('   Utiliser UNIQUEMENT familles_disciples comme source de vérité pour les relations.');
    rapport.recommandations.push('Utiliser uniquement familles_disciples comme source de vérité');
  }

  if (rapport.cercles.total > 0 && rapport.familles.total > 0) {
    console.log('⚠️ PROBLÈME IDENTIFIÉ:');
    console.log('   - Deux sources de données coexistent (cercles ET familles)');
    console.log('   - Risque de duplication et d\'incohérence');
    console.log('\n   💡 RECOMMANDATION:');
    console.log('   Choisir UNE source de vérité et migrer les données.');
    rapport.recommandations.push('Consolider les sources de données - choisir une seule source de vérité');
  }

  // Vérifier les disciples avec des disciples (déclaré plus haut)
  if (typeof disciplesAvecDisciples !== 'undefined' && disciplesAvecDisciples && disciplesAvecDisciples.length > 0) {
    console.log('\n⚠️ PROBLÈME IDENTIFIÉ:');
    console.log(`   - ${disciplesAvecDisciples.length} disciple(s) ont d'autres disciples dans leur famille`);
    console.log('   - Ces disciples devraient être promus au statut de mentor');
    console.log('\n   💡 RECOMMANDATION:');
    console.log('   Exécuter la promotion basée sur familles_disciples (pas cercle_personnes)');
    rapport.recommandations.push('Promouvoir les disciples qui ont des disciples via familles_disciples');
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ ANALYSE TERMINÉE');
  console.log('='.repeat(80) + '\n');

  return rapport;
}

analyseComplete().catch(console.error);
