/**
 * Crée les comptes Auth pour les entrées cercle_personnes qui n'ont pas encore
 * de profil_id (email sans compte Auth). Après exécution, relancer la migration
 * 108 pour créer les profils et lier cercle_personnes.profil_id.
 *
 * PRÉREQUIS:
 * 1. Fichier .env à la racine avec:
 *    - SUPABASE_URL=https://votre-projet.supabase.co
 *    - SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
 * 2. npm install @supabase/supabase-js dotenv (ou déjà installé)
 *
 * EXÉCUTION:
 * node scripts/create_comptes_cercles_sans_profil.js
 *
 * Puis dans Supabase → SQL Editor : exécuter 108_backfill_cercle_vers_profils.sql
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Mot de passe temporaire (à communiquer ou réinitialiser)
const TEMPORARY_PASSWORD = 'DiscipleLife2026!';

// Délai entre chaque création (ms) pour limiter la charge
const DELAY_MS = 200;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Récupère toutes les entrées cercle_personnes sans profil_id et avec email valide */
async function getCerclesSansProfil() {
  const { data, error } = await supabase
    .from('cercle_personnes')
    .select('id, user_id, first_name, last_name, email, circle_type, created_at')
    .is('profil_id', null)
    .not('email', 'is', null);

  if (error) throw error;

  return (data || []).filter((r) => r.email && String(r.email).trim() !== '');
}

/** Un email par personne : on garde la première occurrence (first_name, last_name) */
function dedupeByEmail(rows) {
  const byEmail = new Map();
  for (const r of rows) {
    const email = String(r.email).toLowerCase().trim();
    if (!byEmail.has(email)) {
      byEmail.set(email, { email: r.email.trim(), first_name: r.first_name, last_name: r.last_name });
    }
  }
  return Array.from(byEmail.entries()).map(([emailKey, v]) => ({ email: v.email, first_name: v.first_name, last_name: v.last_name }));
}

async function main() {
  console.log('🔍 Récupération des cercles sans profil (profil_id NULL, email renseigné)...\n');

  const cercles = await getCerclesSansProfil();
  console.log(`📋 ${cercles.length} entrée(s) cercle sans profil trouvée(s).\n`);

  if (cercles.length === 0) {
    console.log('Aucun compte à créer. Vous pouvez exécuter la migration 108 pour lier les profils existants.');
    return;
  }

  const toCreate = dedupeByEmail(cercles);
  console.log(`📧 ${toCreate.length} email(s) unique(s) à traiter.\n`);
  console.log('🔄 Création des comptes Auth (les emails déjà enregistrés seront ignorés)...\n');

  let ok = 0;
  let ko = 0;
  const errors = [];

  for (let i = 0; i < toCreate.length; i++) {
    const row = toCreate[i];
    const { email, first_name, last_name } = row;
    const name = [first_name, last_name].filter(Boolean).join(' ') || email;

    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: TEMPORARY_PASSWORD,
        email_confirm: true,
        user_metadata: {
          first_name: first_name || '',
          last_name: last_name || '',
          role: 'disciple'
        }
      });

      if (authError) {
        if (authError.message && /already registered|already exists|duplicate|user.*email.*registered/i.test(authError.message)) {
          console.log(`⏭️  [${i + 1}/${toCreate.length}] ${name} – ${email} (compte existant)`);
          ok++;
          continue;
        }
        throw authError;
      }
      if (!authData?.user) throw new Error('Utilisateur Auth non créé');

      console.log(`✅ [${i + 1}/${toCreate.length}] ${name} – ${email}`);
      ok++;

      if (i < toCreate.length - 1) await sleep(DELAY_MS);
    } catch (e) {
      const msg = e.message || String(e);
      console.error(`❌ [${i + 1}/${toCreate.length}] ${name} – ${email}: ${msg}`);
      errors.push({ name, email, error: msg });
      ko++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ');
  console.log('='.repeat(60));
  console.log(`✅ Comptes Auth créés: ${ok}`);
  console.log(`❌ Erreurs: ${ko}`);
  console.log(`\n🔑 Mot de passe temporaire: ${TEMPORARY_PASSWORD}`);
  console.log('   À communiquer aux utilisateurs ou à réinitialiser (Supabase Auth).');
  console.log('\n📌 ÉTAPE SUIVANTE : exécuter la migration 108 dans Supabase → SQL Editor');
  console.log('   (sql/migrations/108_backfill_cercle_vers_profils.sql)');
  console.log('   pour créer les profils et remplir cercle_personnes.profil_id.');
  if (errors.length) {
    console.log('\n📋 Erreurs détaillées:');
    errors.slice(0, 20).forEach(({ name, email, error }) => console.log(`   - ${name} (${email}): ${error}`));
    if (errors.length > 20) console.log(`   ... et ${errors.length - 20} autre(s).`);
  }
  console.log('='.repeat(60) + '\n');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('💥 Erreur fatale:', err);
    process.exit(1);
  });
