/**
 * Script pour créer les comptes Pasteurs dans Supabase Auth
 * et leurs profils correspondants dans la table profils
 * 
 * Usage: node scripts/create_pasteurs.js
 * 
 * Prérequis:
 * - Fichier .env avec SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Configuration dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

// Charger le fichier .env avec le chemin absolu et override
const result = dotenv.config({ path: envPath, override: true });

// Debug: vérifier si les variables sont chargées
console.log('📁 Chemin .env:', envPath);
if (result.error) {
  console.error('❌ Erreur dotenv:', result.error);
} else {
  console.log('✅ Fichier .env chargé:', result.parsed ? Object.keys(result.parsed).length + ' variables' : '0 variables');
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Debug supplémentaire
console.log('🔍 SUPABASE_URL:', supabaseUrl ? '✅ Défini (' + supabaseUrl.substring(0, 30) + '...)' : '❌ Manquant');
console.log('🔍 SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Défini (' + supabaseServiceKey.substring(0, 30) + '...)' : '❌ Manquant');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erreur: SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans .env');
  process.exit(1);
}

// Client Supabase avec service_role (permissions admin)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Liste des 4 pasteurs avec leurs informations
const pasteurs = [
  {
    identifiant_unique: 'PASTEUR-001',
    first_name: 'DR',
    last_name: 'MODE',
    email: 'dr.mode@disciplelife.com',
    password: 'Pasteur001!2024',
    role: 'pasteur'
  },
  {
    identifiant_unique: 'PASTEUR-002',
    first_name: 'PS',
    last_name: 'JULIANA',
    email: 'ps.juliana@disciplelife.com',
    password: 'Pasteur002!2024',
    role: 'pasteur'
  },
  {
    identifiant_unique: 'PASTEUR-003',
    first_name: 'PS',
    last_name: 'PEGGY NN',
    email: 'ps.peggy.nn@disciplelife.com',
    password: 'Pasteur003!2024',
    role: 'pasteur'
  },
  {
    identifiant_unique: 'PASTEUR-004',
    first_name: 'PS',
    last_name: 'JESSY',
    email: 'ps.jessy@disciplelife.com',
    password: 'Pasteur004!2024',
    role: 'pasteur'
  }
];

async function createPasteur(pasteur) {
  try {
    console.log(`\n📝 Création du pasteur: ${pasteur.first_name} ${pasteur.last_name} (${pasteur.identifiant_unique})`);

    // 1. Créer le compte Auth dans Supabase
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: pasteur.email,
      password: pasteur.password,
      email_confirm: true, // Confirmer l'email automatiquement
      user_metadata: {
        first_name: pasteur.first_name,
        last_name: pasteur.last_name,
        role: pasteur.role,
        identifiant_unique: pasteur.identifiant_unique
      }
    });

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
        console.log(`⚠️  Compte Auth existe déjà pour ${pasteur.email}, récupération de l'utilisateur...`);
        // Récupérer l'utilisateur existant
        const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;
        const user = existingUsers.users.find(u => u.email === pasteur.email);
        if (user) {
          console.log(`✅ Utilisateur existant trouvé: ${user.id}`);
          const userId = user.id;
          
          // Mettre à jour les métadonnées de l'utilisateur
          await supabase.auth.admin.updateUserById(userId, {
            user_metadata: {
              first_name: pasteur.first_name,
              last_name: pasteur.last_name,
              role: pasteur.role,
              identifiant_unique: pasteur.identifiant_unique
            }
          });
          
          return { userId, email: pasteur.email, alreadyExists: true };
        } else {
          throw new Error(`Utilisateur avec email ${pasteur.email} non trouvé dans la liste`);
        }
      }
      throw authError;
    }

    const userId = authData.user.id;
    console.log(`✅ Compte Auth créé: ${userId}`);

    // 2. Créer ou mettre à jour le profil dans la table profils
    const { data: profilData, error: profilError } = await supabase
      .from('profils')
      .upsert({
        id: userId,
        first_name: pasteur.first_name,
        last_name: pasteur.last_name,
        email: pasteur.email,
        role: pasteur.role,
        identifiant_unique: pasteur.identifiant_unique,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (profilError) {
      console.error(`❌ Erreur lors de la création du profil:`, profilError);
      throw profilError;
    }

    console.log(`✅ Profil créé/mis à jour dans la table profils`);
    
    return {
      userId,
      email: pasteur.email,
      identifiant_unique: pasteur.identifiant_unique,
      alreadyExists: false
    };

  } catch (error) {
    console.error(`❌ Erreur pour ${pasteur.email}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Début de la création des comptes Pasteurs...\n');
  console.log(`📊 Nombre de pasteurs à créer: ${pasteurs.length}\n`);

  const results = {
    success: [],
    errors: []
  };

  for (const pasteur of pasteurs) {
    try {
      const result = await createPasteur(pasteur);
      results.success.push({
        ...result,
        nom: `${pasteur.first_name} ${pasteur.last_name}`,
        email: pasteur.email,
        password: pasteur.password
      });
    } catch (error) {
      results.errors.push({
        pasteur: `${pasteur.first_name} ${pasteur.last_name}`,
        email: pasteur.email,
        error: error.message
      });
    }
  }

  // Résumé
  console.log('\n' + '='.repeat(80));
  console.log('📊 RÉSUMÉ DE LA CRÉATION');
  console.log('='.repeat(80));

  if (results.success.length > 0) {
    console.log(`\n✅ ${results.success.length} pasteur(s) créé(s) avec succès:\n`);
    results.success.forEach((result, index) => {
      console.log(`${index + 1}. ${result.nom} (${result.identifiant_unique})`);
      console.log(`   Email: ${result.email}`);
      console.log(`   Mot de passe: ${result.password}`);
      if (result.alreadyExists) {
        console.log(`   ⚠️  Compte existant mis à jour`);
      }
      console.log('');
    });
  }

  if (results.errors.length > 0) {
    console.log(`\n❌ ${results.errors.length} erreur(s):\n`);
    results.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.pasteur} (${error.email})`);
      console.log(`   Erreur: ${error.error}\n`);
    });
  }

  console.log('='.repeat(80));
  console.log('\n📋 INFORMATIONS DE CONNEXION:');
  console.log('='.repeat(80));
  results.success.forEach((result) => {
    console.log(`\n${result.nom}:`);
    console.log(`  Email: ${result.email}`);
    console.log(`  Mot de passe: ${result.password}`);
  });
  console.log('\n' + '='.repeat(80));
}

main().catch(console.error);
