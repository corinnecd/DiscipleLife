/**
 * Script pour assigner famille_id au superviseur Laetitia Missatou
 * 
 * Ce script :
 * 1. Trouve le superviseur Laetitia Missatou
 * 2. Vérifie si une famille existe pour elle dans familles_disciples
 * 3. Si oui, assigne le famille_id
 * 4. Si non, crée une famille et assigne le famille_id
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuration Supabase (utiliser les variables d'environnement ou les valeurs directes)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function assignFamilleIdToLaetitiaMissatou() {
  try {
    console.log('🔍 Recherche du superviseur Laetitia Missatou...');

    // 1. Trouver le superviseur Laetitia Missatou
    const { data: superviseur, error: superviseurError } = await supabase
      .from('profils')
      .select('id, first_name, last_name, email, pasteur_id, famille_id')
      .eq('role', 'superviseur')
      .or('and(first_name.ilike.laetitia,last_name.ilike.missatou),and(first_name.ilike.laëtitia,last_name.ilike.missatou),email.eq.laetitia.missatou@example.com')
      .limit(1)
      .single();

    if (superviseurError || !superviseur) {
      console.error('❌ Erreur lors de la recherche du superviseur:', superviseurError);
      console.error('   Vérifiez que Laetitia Missatou existe dans la table profils');
      return;
    }

    console.log('✅ Superviseur trouvé:', superviseur.first_name, superviseur.last_name);
    console.log('   ID:', superviseur.id);
    console.log('   Email:', superviseur.email);
    console.log('   Pasteur ID:', superviseur.pasteur_id);
    console.log('   famille_id actuel:', superviseur.famille_id || 'NULL');

    // 2. Vérifier si une famille existe déjà pour ce superviseur
    let familleId = null;
    let familleNom = null;
    let familleIdentifiant = null;

    const { data: familleExistante, error: familleError } = await supabase
      .from('familles_disciples')
      .select('id, nom, identifiant_famille')
      .eq('superviseur_id', superviseur.id)
      .limit(1)
      .maybeSingle();

    if (familleError) {
      console.error('❌ Erreur lors de la recherche de la famille:', familleError);
      return;
    }

    if (familleExistante) {
      familleId = familleExistante.id;
      familleNom = familleExistante.nom;
      familleIdentifiant = familleExistante.identifiant_famille;
      console.log('✅ Famille existante trouvée:', familleNom, `(${familleIdentifiant})`);
    } else {
      // 3. Vérifier si FAM017 existe (selon les migrations précédentes)
      const { data: famille017, error: famille017Error } = await supabase
        .from('familles_disciples')
        .select('id, nom, identifiant_famille, superviseur_id')
        .eq('identifiant_famille', 'FAM017')
        .limit(1)
        .maybeSingle();

      if (famille017Error) {
        console.error('❌ Erreur lors de la recherche de FAM017:', famille017Error);
        return;
      }

      if (famille017) {
        // FAM017 existe, la lier à ce superviseur
        console.log('📋 FAM017 existe, liaison au superviseur...');
        const { error: updateError } = await supabase
          .from('familles_disciples')
          .update({
            superviseur_id: superviseur.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', famille017.id);

        if (updateError) {
          console.error('❌ Erreur lors de la liaison de FAM017:', updateError);
          return;
        }

        familleId = famille017.id;
        familleNom = famille017.nom;
        familleIdentifiant = famille017.identifiant_famille;
        console.log('✅ FAM017 liée au superviseur:', familleNom);
      } else {
        // Créer une nouvelle famille
        console.log('📝 Création d\'une nouvelle famille...');
        const nouvelleFamille = {
          nom: 'LES VICTORIEUX',
          identifiant_famille: 'FAM017',
          superviseur_id: superviseur.id,
          statut: 'actif',
          objectif_disciples: 70,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: nouvelleFamilleData, error: createError } = await supabase
          .from('familles_disciples')
          .insert(nouvelleFamille)
          .select()
          .single();

        if (createError) {
          console.error('❌ Erreur lors de la création de la famille:', createError);
          return;
        }

        familleId = nouvelleFamilleData.id;
        familleNom = nouvelleFamilleData.nom;
        familleIdentifiant = nouvelleFamilleData.identifiant_famille;
        console.log('✅ Nouvelle famille créée:', familleNom, `(${familleIdentifiant})`);
      }
    }

    // 4. Assigner le famille_id au superviseur
    if (superviseur.famille_id !== familleId) {
      console.log('📝 Assignation du famille_id au superviseur...');
      const { error: updateError } = await supabase
        .from('profils')
        .update({
          famille_id: familleId,
          updated_at: new Date().toISOString()
        })
        .eq('id', superviseur.id);

      if (updateError) {
        console.error('❌ Erreur lors de l\'assignation du famille_id:', updateError);
        return;
      }

      console.log('✅ famille_id assigné avec succès!');
      console.log('   famille_id:', familleId);
      console.log('   Famille:', familleNom, `(${familleIdentifiant})`);
    } else {
      console.log('ℹ️  famille_id déjà assigné correctement');
    }

    // 5. Vérification finale
    console.log('\n📊 Vérification finale:');
    const { data: verification, error: verifError } = await supabase
      .from('profils')
      .select(`
        id,
        first_name,
        last_name,
        email,
        role,
        pasteur_id,
        famille_id,
        familles_disciples (
          id,
          nom,
          identifiant_famille
        )
      `)
      .eq('id', superviseur.id)
      .single();

    if (verifError) {
      console.error('❌ Erreur lors de la vérification:', verifError);
      return;
    }

    console.log('✅ Résultat:');
    console.log('   Superviseur:', verification.first_name, verification.last_name);
    console.log('   famille_id:', verification.famille_id || 'NULL');
    if (verification.familles_disciples) {
      console.log('   Famille:', verification.familles_disciples.nom, `(${verification.familles_disciples.identifiant_famille})`);
    } else {
      console.log('   ⚠️  Aucune famille liée');
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter le script
assignFamilleIdToLaetitiaMissatou()
  .then(() => {
    console.log('\n✅ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
