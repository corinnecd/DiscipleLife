/**
 * Script pour créer les 26 comptes superviseurs via l'API Supabase Admin
 * 
 * PRÉREQUIS:
 * 1. Installer les dépendances: npm install @supabase/supabase-js dotenv
 * 2. Créer un fichier .env à la racine avec:
 *    - SUPABASE_URL=https://votre-projet.supabase.co
 *    - SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
 * 
 * EXÉCUTION:
 * node scripts/create_superviseurs.js
 * 
 * OU avec dotenv-cli:
 * npx dotenv node scripts/create_superviseurs.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

// ⚠️ IMPORTANT: Utilisez la clé service_role, pas la clé anon
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Liste des 26 superviseurs
const superviseurs = [
  { familleId: 'FAM001', prenom: 'Alain', nom: 'SIL', email: 'alain.sil@example.com' },
  { familleId: 'FAM002', prenom: 'Andréa', nom: 'ERNEST', email: 'andrea.ernest@example.com' },
  { familleId: 'FAM003', prenom: 'Béraca', nom: 'KAZONGO', email: 'beraca.kazongo@example.com' },
  { familleId: 'FAM004', prenom: 'BETSALEEL', nom: 'BADILA', email: 'betsaleel.badila@example.com' },
  { familleId: 'FAM005', prenom: 'CARINE', nom: 'MATONDO', email: 'carine.matondo@example.com' },
  { familleId: 'FAM006', prenom: 'COCO', nom: 'OKANZI', email: 'coco.okanzi@example.com' },
  { familleId: 'FAM007', prenom: 'CYNTHIA', nom: 'ALLOH', email: 'cynthia.alloh@example.com' },
  { familleId: 'FAM008', prenom: 'ELISABETH', nom: 'AMECY', email: 'elisabeth.amecy@example.com' },
  { familleId: 'FAM009', prenom: 'Andréa', nom: 'Ernest', email: 'andrea.ernest2@example.com' },
  { familleId: 'FAM010', prenom: 'EPHREM', nom: 'MBA', email: 'ephrem.mba@example.com' },
  { familleId: 'FAM011', prenom: 'GERVAIS', nom: 'NKATOULOULOU', email: 'gervais.nkatouloulou@example.com' },
  { familleId: 'FAM012', prenom: 'Andréa', nom: 'Ernest', email: 'andrea.ernest3@example.com' },
  { familleId: 'FAM013', prenom: 'HÉLÈNE', nom: 'LAMAGO', email: 'helene.lamago@example.com' },
  { familleId: 'FAM014', prenom: 'JOCELYNE', nom: 'FORTUNE', email: 'jocelyne.fortune@example.com' },
  { familleId: 'FAM015', prenom: 'KARINE', nom: 'WILLIAM', email: 'karine.william@example.com' },
  { familleId: 'FAM016', prenom: 'KEVIN', nom: 'THÉA', email: 'kevin.thea@example.com' },
  { familleId: 'FAM017', prenom: 'LAETITIA', nom: 'OBAME', email: 'laetitia.obame@example.com' },
  { familleId: 'FAM018', prenom: 'MANICIA', nom: 'THÉA', email: 'manicia.thea@example.com' },
  { familleId: 'FAM019', prenom: 'NANCY', nom: 'NZI', email: 'nancy.nzi@example.com' },
  { familleId: 'FAM020', prenom: 'NASDÈNE', nom: 'KODIA', email: 'nasdene.kodia@example.com' },
  { familleId: 'FAM021', prenom: 'PATRICK', nom: 'BATSIAGA', email: 'patrick.batsiaga@example.com' },
  { familleId: 'FAM022', prenom: 'PROSPERE', nom: 'LEBA', email: 'prospere.leba@example.com' },
  { familleId: 'FAM023', prenom: 'ROCHELLE', nom: 'PASSI BEN', email: 'rochelle.passiben@example.com' },
  { familleId: 'FAM024', prenom: 'SERGE', nom: 'AMANY', email: 'serge.amany@example.com' },
  { familleId: 'FAM025', prenom: 'SNELLA', nom: 'MOUSSIO', email: 'snella.moussio@example.com' },
  { familleId: 'FAM026', prenom: 'YVAN', nom: 'DESSANDE', email: 'yvan.dessande@example.com' }
];

// Mot de passe temporaire (les utilisateurs devront le changer)
const TEMPORARY_PASSWORD = 'TempPassword123!';

async function createSuperviseurs() {
  console.log('🚀 Début de la création des 26 comptes superviseurs...\n');

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (const superviseur of superviseurs) {
    try {
      console.log(`📝 Création de ${superviseur.prenom} ${superviseur.nom} (${superviseur.email})...`);

      // 1. Créer le compte dans Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: superviseur.email,
        password: TEMPORARY_PASSWORD,
        email_confirm: true, // Confirmer l'email automatiquement
        user_metadata: {
          first_name: superviseur.prenom,
          last_name: superviseur.nom,
          role: 'superviseur'
        }
      });

      if (authError) {
        // Si l'utilisateur existe déjà, on continue
        if (authError.message.includes('already registered')) {
          console.log(`⚠️  L'utilisateur ${superviseur.email} existe déjà, récupération du compte...`);
          
          // Récupérer l'utilisateur existant
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const existingUser = existingUsers?.users?.find(u => u.email === superviseur.email);
          
          if (existingUser) {
            authData.user = existingUser;
          } else {
            throw new Error(`Utilisateur existant mais non trouvé: ${superviseur.email}`);
          }
        } else {
          throw authError;
        }
      }

      if (!authData?.user) {
        throw new Error('Impossible de créer ou récupérer l\'utilisateur');
      }

      const userId = authData.user.id;

      // 2. Créer ou mettre à jour le profil dans la table profils
      const { error: profileError } = await supabase
        .from('profils')
        .upsert({
          id: userId,
          first_name: superviseur.prenom,
          last_name: superviseur.nom,
          email: superviseur.email,
          role: 'superviseur'
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        throw profileError;
      }

      console.log(`✅ ${superviseur.prenom} ${superviseur.nom} créé avec succès (ID: ${userId.substring(0, 8)}...)\n`);
      successCount++;

    } catch (error) {
      console.error(`❌ Erreur pour ${superviseur.prenom} ${superviseur.nom}: ${error.message}\n`);
      errors.push({ superviseur, error: error.message });
      errorCount++;
    }
  }

  // Résumé
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ');
  console.log('='.repeat(60));
  console.log(`✅ Succès: ${successCount}/26`);
  console.log(`❌ Erreurs: ${errorCount}/26`);

  if (errors.length > 0) {
    console.log('\n📋 ERREURS DÉTAILLÉES:');
    errors.forEach(({ superviseur, error }) => {
      console.log(`  - ${superviseur.prenom} ${superviseur.nom} (${superviseur.email}): ${error}`);
    });
  }

  console.log('\n⚠️  IMPORTANT:');
  console.log(`   - Mot de passe temporaire pour tous: ${TEMPORARY_PASSWORD}`);
  console.log('   - Les superviseurs devront changer leur mot de passe à la première connexion');
  console.log('   - Exécutez maintenant le script 037_assigner_superviseurs.sql pour assigner les superviseurs aux familles');
  console.log('='.repeat(60) + '\n');
}

// Exécution
createSuperviseurs()
  .then(() => {
    console.log('✨ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });

