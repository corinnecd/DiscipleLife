/**
 * Script pour créer les comptes Auth des disciples de la famille "Les Déterminés"
 * (source unique : profils ; plus de lecture dans cercle_personnes).
 *
 * PRÉREQUIS:
 * 1. Fichier .env à la racine avec:
 *    - SUPABASE_URL=https://votre-projet.supabase.co
 *    - SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
 * 2. npm install @supabase/supabase-js dotenv (ou déjà installé)
 *
 * EXÉCUTION:
 * node scripts/create_comptes_disciples_les_determines.js
 *
 * OU: npx dotenv node scripts/create_comptes_disciples_les_determines.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Mot de passe temporaire (à communiquer aux disciples ou à réinitialiser)
const TEMPORARY_PASSWORD = 'DiscipleLife2026!';

function generateEmail(firstName, lastName, id) {
  const cleanFirst = (firstName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanLast = (lastName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const shortId = id.replace(/-/g, '').substring(0, 8);
  const base = cleanFirst && cleanLast ? `${cleanFirst}.${cleanLast}` : cleanFirst || cleanLast || 'disciple';
  return `${base}.${shortId}@disciplelife.local`;
}

async function getDisciplesSansCompteLesDetermines() {
  // 1. ID de la famille "Les Déterminés" (avec ou sans accent)
  let { data: familles, error: errFam } = await supabase
    .from('familles_disciples')
    .select('id')
    .ilike('nom', '%déterminé%')
    .limit(1);
  if (!errFam && familles?.length) {
    // ok
  } else {
    const res2 = await supabase
      .from('familles_disciples')
      .select('id')
      .ilike('nom', '%determine%')
      .limit(1);
    familles = res2.data;
    errFam = res2.error;
  }
  if (errFam || !familles?.length) {
    throw new Error('Famille "Les Déterminés" introuvable. Vérifiez la table familles_disciples.');
  }
  const familleId = familles[0].id;

  // 2. IDs des profils liés à cette famille : superviseur(s) + mentors (superviseur_id = ce superviseur)
  const { data: superviseurs, error: errSup } = await supabase
    .from('profils')
    .select('id')
    .eq('famille_id', familleId);

  if (errSup) throw errSup;
  const superviseurIds = (superviseurs || []).map((p) => p.id);
  if (superviseurIds.length === 0) {
    throw new Error('Aucun superviseur trouvé pour la famille Les Déterminés.');
  }

  const { data: mentors, error: errMentors } = await supabase
    .from('profils')
    .select('id')
    .in('superviseur_id', superviseurIds);

  if (errMentors) throw errMentors;
  const mentorIds = (mentors || []).map((p) => p.id);
  const allUserIds = [...new Set([...superviseurIds, ...mentorIds])];

  // 3. Disciples dans profils (source unique) : role=disciple, mentor ou superviseur de cette famille
  const { data: profilsDisciples, error: errP } = await supabase
    .from('profils')
    .select('id, first_name, last_name, email, mentor_id, famille_id')
    .eq('role', 'disciple')
    .in('mentor_id', allUserIds);

  if (errP) throw errP;

  // Filtrer ceux dont l'id n'est pas encore dans auth (sans compte)
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 10000 });
  const authIds = new Set((authUsers?.users || []).map((u) => u.id));
  return (profilsDisciples || []).filter((p) => !authIds.has(p.id));
}

async function createAccountForDisciple(disciple) {
  const email = disciple.email?.trim() || generateEmail(disciple.first_name, disciple.last_name, disciple.id);

  // Éviter doublon email dans auth
  const { data: existing } = await supabase.auth.admin.listUsers();
  const already = existing?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (already) {
    await supabase.from('profils').update({ email }).eq('id', disciple.id);
    return { success: true, userId: already.id, email, method: 'existing' };
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: TEMPORARY_PASSWORD,
    email_confirm: true,
    user_metadata: {
      first_name: disciple.first_name || '',
      last_name: disciple.last_name || '',
      role: 'disciple'
    }
  });

  if (authError) throw authError;
  if (!authData?.user) throw new Error('Utilisateur Auth non créé');

  // Source unique : profils. Le trigger handle_new_user crée une ligne profils (id = auth.uid()).
  // Copier mentor_id, famille_id du profil existant vers le nouveau profil puis supprimer l'ancien.
  const { error: updateNewErr } = await supabase
    .from('profils')
    .update({
      mentor_id: disciple.mentor_id ?? null,
      famille_id: disciple.famille_id ?? null
    })
    .eq('id', authData.user.id);
  if (updateNewErr) {
    console.warn('Mise à jour mentor_id/famille_id sur nouveau profil:', updateNewErr.message);
  }
  await supabase.from('profils').delete().eq('id', disciple.id);

  return { success: true, userId: authData.user.id, email, method: 'created' };
}

async function main() {
  console.log('🔍 Récupération des disciples sans compte (famille Les Déterminés)...\n');

  const disciples = await getDisciplesSansCompteLesDetermines();
  console.log(`📋 ${disciples.length} disciple(s) sans compte trouvé(s).\n`);

  if (disciples.length === 0) {
    console.log('Aucun compte à créer. Terminé.');
    return;
  }

  let ok = 0;
  let ko = 0;
  const errors = [];

  for (const d of disciples) {
    const name = [d.first_name, d.last_name].filter(Boolean).join(' ') || d.id;
    try {
      const result = await createAccountForDisciple(d);
      const method = result.method === 'existing' ? '(compte existant)' : '(créé)';
      console.log(`✅ ${name} – ${result.email} ${method}`);
      ok++;
    } catch (e) {
      console.error(`❌ ${name}: ${e.message}`);
      errors.push({ name, email: d.email, error: e.message });
      ko++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ');
  console.log('='.repeat(60));
  console.log(`✅ Créés ou déjà existants: ${ok}`);
  console.log(`❌ Erreurs: ${ko}`);
  console.log(`\n🔑 Mot de passe temporaire pour les nouveaux comptes: ${TEMPORARY_PASSWORD}`);
  console.log('   À communiquer aux disciples ou à réinitialiser depuis Supabase Auth.');
  if (errors.length) {
    console.log('\n📋 Erreurs détaillées:');
    errors.forEach(({ name, error }) => console.log(`   - ${name}: ${error}`));
  }
  console.log('='.repeat(60) + '\n');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('💥 Erreur fatale:', err);
    process.exit(1);
  });
