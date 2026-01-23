/**
 * Analyse approfondie des familles et des relations
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ggrkwivcspuwxuyrjyem.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdncmt3aXZjc3B1d3h1eXJqeWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDMyODgsImV4cCI6MjA4MDUxOTI4OH0.JrKegasNO4JwEG6AAJ41DqZ-ahex7TBaHT77m4OKAT8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyseProfonde() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 ANALYSE APPROFONDIE DES FAMILLES ET RELATIONS');
  console.log('='.repeat(80) + '\n');

  // 1. Récupérer toutes les familles avec leurs détails
  const { data: familles, error: error1 } = await supabase
    .from('familles_disciples')
    .select('id, nom_famille, superviseur_id, created_at')
    .order('nom_famille');

  if (error1) {
    console.error('Erreur:', error1);
    return;
  }

  console.log(`📊 ${familles?.length || 0} famille(s) trouvée(s)\n`);

  // 2. Pour chaque famille, analyser en détail
  const famillesDetaillees = [];

  for (const famille of familles || []) {
    // Récupérer tous les profils de cette famille
    const { data: membresFamille, error: error2 } = await supabase
      .from('profils')
      .select('id, first_name, last_name, email, role, famille_id')
      .eq('famille_id', famille.id);

    if (error2) {
      console.warn(`Erreur pour famille ${famille.id}:`, error2);
      continue;
    }

    const membres = membresFamille || [];
    const disciples = membres.filter(m => m.role === 'disciple');
    const superviseurs = membres.filter(m => m.role === 'superviseur');
    const autres = membres.filter(m => !['disciple', 'superviseur'].includes(m.role));

    famillesDetaillees.push({
      famille: famille,
      total_membres: membres.length,
      disciples: disciples,
      superviseurs: superviseurs,
      autres: autres
    });

    if (disciples.length > 0) {
      console.log(`\n🏠 Famille: ${famille.nom_famille || famille.id}`);
      console.log(`   - Total membres: ${membres.length}`);
      console.log(`   - Disciples: ${disciples.length}`);
      console.log(`   - Superviseurs: ${superviseurs.length}`);
      console.log(`   - Autres rôles: ${autres.length}`);

      if (disciples.length > 1) {
        console.log(`\n   👥 Liste des disciples:`);
        disciples.forEach((d, i) => {
          console.log(`      ${i + 1}. ${d.first_name} ${d.last_name} (${d.email})`);
        });
      }

      // Identifier si un disciple a d'autres disciples dans la même famille
      if (disciples.length > 1) {
        console.log(`\n   ⚠️ Cette famille a ${disciples.length} disciple(s) - certains pourraient être des mentors`);
      }
    }
  }

  // 3. Identifier les cas où un disciple devrait être mentor
  console.log('\n' + '='.repeat(80));
  console.log('📋 IDENTIFICATION DES DISCIPLES À PROMOUVOIR');
  console.log('='.repeat(80) + '\n');

  const disciplesAPromouvoir = [];

  for (const familleDetail of famillesDetaillees) {
    if (familleDetail.disciples.length > 1) {
      // Si une famille a plusieurs disciples, le premier ou le plus ancien pourrait être un mentor
      // Mais on ne peut pas le déterminer sans plus d'info sur la hiérarchie
      console.log(`⚠️ Famille "${familleDetail.famille.nom_famille || familleDetail.famille.id}" a ${familleDetail.disciples.length} disciple(s)`);
      console.log(`   → Nécessite une analyse manuelle pour déterminer la hiérarchie`);
    }
  }

  // 4. Vérifier tous les profils pour voir leur famille_id
  console.log('\n' + '='.repeat(80));
  console.log('📊 VÉRIFICATION DES PROFILS ET LEUR FAMILLE_ID');
  console.log('='.repeat(80) + '\n');

  const { data: allProfils, error: error3 } = await supabase
    .from('profils')
    .select('id, first_name, last_name, email, role, famille_id')
    .order('role');

  if (allProfils) {
    const avecFamille = allProfils.filter(p => p.famille_id);
    const sansFamille = allProfils.filter(p => !p.famille_id);

    console.log(`Total profils: ${allProfils.length}`);
    console.log(`- Avec famille_id: ${avecFamille.length}`);
    console.log(`- Sans famille_id: ${sansFamille.length}`);

    if (avecFamille.length > 0) {
      console.log(`\n📋 Profils avec famille_id:`);
      const parFamille = {};
      avecFamille.forEach(p => {
        if (!parFamille[p.famille_id]) parFamille[p.famille_id] = [];
        parFamille[p.famille_id].push(p);
      });

      Object.entries(parFamille).forEach(([familleId, membres]) => {
        const famille = familles?.find(f => f.id === familleId);
        console.log(`\n   Famille ${familleId} (${famille?.nom_famille || 'Sans nom'}): ${membres.length} membre(s)`);
        membres.forEach(m => {
          console.log(`     - ${m.first_name} ${m.last_name} (${m.role})`);
        });
      });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ ANALYSE TERMINÉE');
  console.log('='.repeat(80) + '\n');
}

analyseProfonde().catch(console.error);
