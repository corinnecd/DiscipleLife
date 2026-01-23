/**
 * Analyse complète pour la consolidation des sources de données
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ggrkwivcspuwxuyrjyem.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdncmt3aXZjc3B1d3h1eXJqeWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDMyODgsImV4cCI6MjA4MDUxOTI4OH0.JrKegasNO4JwEG6AAJ41DqZ-ahex7TBaHT77m4OKAT8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyseComplete() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 ANALYSE COMPLÈTE POUR CONSOLIDATION DES SOURCES DE DONNÉES');
  console.log('='.repeat(80) + '\n');

  const rapport = {
    cercles: {},
    familles: {},
    profils: {},
    superviseurs: {},
    pasteurs: {}
  };

  // 1. ANALYSE cercle_personnes
  console.log('📊 1. ANALYSE cercle_personnes\n');
  const { count: countCercles } = await supabase
    .from('cercle_personnes')
    .select('*', { count: 'exact', head: true });
  rapport.cercles.total = countCercles || 0;
  console.log(`   Total: ${rapport.cercles.total} entrée(s)`);

  // 2. ANALYSE familles_disciples
  console.log('\n📊 2. ANALYSE familles_disciples\n');
  const { data: familles, error: errorFamilles } = await supabase
    .from('familles_disciples')
    .select('id, nom, identifiant_famille, superviseur_id, objectif_disciples, nombre_disciples_actuels, statut')
    .order('identifiant_famille');

  if (errorFamilles) {
    console.error('❌ Erreur:', errorFamilles);
    return;
  }

  rapport.familles.total = familles?.length || 0;
  rapport.familles.donnees = familles || [];
  console.log(`   Total: ${rapport.familles.total} famille(s)`);

  // Pour chaque famille, vérifier les membres
  const famillesAvecMembres = [];
  for (const famille of familles || []) {
    const { data: membres, error: errorMembres } = await supabase
      .from('profils')
      .select('id, first_name, last_name, email, role, famille_id')
      .eq('famille_id', famille.id);

    const membresList = membres || [];
    const disciples = membresList.filter(m => m.role === 'disciple');
    const superviseurs = membresList.filter(m => m.role === 'superviseur');

    if (membresList.length > 0) {
      famillesAvecMembres.push({
        famille: famille,
        total_membres: membresList.length,
        disciples: disciples.length,
        superviseurs: superviseurs.length
      });
    }
  }

  console.log(`   Familles avec membres: ${famillesAvecMembres.length}`);
  if (famillesAvecMembres.length > 0) {
    console.log(`\n   Détails:`);
    famillesAvecMembres.forEach(f => {
      console.log(`     - ${f.famille.nom || f.famille.identifiant_famille}: ${f.total_membres} membre(s) (${f.disciples} disciple(s), ${f.superviseurs} superviseur(s))`);
    });
  }

  // 3. ANALYSE profils
  console.log('\n📊 3. ANALYSE profils\n');
  const { data: allProfils, error: errorProfils } = await supabase
    .from('profils')
    .select('id, first_name, last_name, email, role, famille_id, superviseur_id, pasteur_id')
    .order('role');

  if (errorProfils) {
    console.error('❌ Erreur:', errorProfils);
    return;
  }

  rapport.profils.total = allProfils?.length || 0;
  rapport.profils.donnees = allProfils || [];

  const parRole = {};
  allProfils?.forEach(p => {
    if (!parRole[p.role]) parRole[p.role] = [];
    parRole[p.role].push(p);
  });

  console.log(`   Total: ${rapport.profils.total} profil(s)`);
  console.log(`\n   Répartition:`);
  Object.entries(parRole).forEach(([role, profils]) => {
    const avecFamille = profils.filter(p => p.famille_id).length;
    console.log(`     - ${role}: ${profils.length} (${avecFamille} avec famille_id)`);
  });

  // 4. ANALYSE superviseurs
  console.log('\n📊 4. ANALYSE superviseurs\n');
  const superviseurs = allProfils?.filter(p => p.role === 'superviseur') || [];
  rapport.superviseurs.total = superviseurs.length;

  const superviseursAvecFamilles = [];
  for (const sup of superviseurs) {
    const { data: famillesSup } = await supabase
      .from('familles_disciples')
      .select('id, nom, identifiant_famille')
      .eq('superviseur_id', sup.id);

    if (famillesSup && famillesSup.length > 0) {
      superviseursAvecFamilles.push({
        superviseur: sup,
        familles: famillesSup
      });
    }
  }

  console.log(`   Total: ${rapport.superviseurs.total} superviseur(s)`);
  console.log(`   Superviseurs avec familles: ${superviseursAvecFamilles.length}`);
  if (superviseursAvecFamilles.length > 0) {
    superviseursAvecFamilles.slice(0, 5).forEach(s => {
      console.log(`     - ${s.superviseur.first_name} ${s.superviseur.last_name}: ${s.familles.length} famille(s)`);
    });
  }

  // 5. ANALYSE pasteurs
  console.log('\n📊 5. ANALYSE pasteurs\n');
  const pasteurs = allProfils?.filter(p => p.role === 'pasteur') || [];
  rapport.pasteurs.total = pasteurs.length;
  console.log(`   Total: ${rapport.pasteurs.total} pasteur(s)`);

  // 6. RÉSUMÉ ET RECOMMANDATIONS
  console.log('\n' + '='.repeat(80));
  console.log('💡 RECOMMANDATIONS POUR CONSOLIDATION');
  console.log('='.repeat(80) + '\n');

  console.log('📋 État actuel:');
  console.log(`   - cercle_personnes: ${rapport.cercles.total} entrée(s)`);
  console.log(`   - familles_disciples: ${rapport.familles.total} famille(s), ${famillesAvecMembres.length} avec membres`);
  console.log(`   - profils: ${rapport.profils.total} profil(s), ${allProfils?.filter(p => p.famille_id).length || 0} avec famille_id`);
  console.log(`   - superviseurs: ${rapport.superviseurs.total}, ${superviseursAvecFamilles.length} avec familles assignées`);

  console.log('\n🎯 Plan de consolidation recommandé:\n');

  if (famillesAvecMembres.length === 0 && rapport.cercles.total === 0) {
    console.log('⚠️ SITUATION: Aucune donnée de relation trouvée');
    console.log('   → Les familles existent mais ne sont pas liées aux profils');
    console.log('   → cercle_personnes est vide');
    console.log('\n   💡 ACTION 1: Assigner les famille_id aux profils');
    console.log('   💡 ACTION 2: Créer les entrées dans cercle_personnes pour les relations');
  } else if (famillesAvecMembres.length > 0 && rapport.cercles.total === 0) {
    console.log('✅ SITUATION: Des familles ont des membres, mais cercle_personnes est vide');
    console.log('   → Migration nécessaire depuis familles_disciples vers cercle_personnes');
    console.log('\n   💡 ACTION: Créer les entrées cercle_personnes basées sur les familles');
  } else {
    console.log('⚠️ SITUATION: Données dans les deux sources');
    console.log('   → Nécessite consolidation et déduplication');
  }

  return rapport;
}

analyseComplete().catch(console.error);
