/**
 * Exécute les migrations SQL 090 à 100 dans l'ordre (Supabase / PostgreSQL).
 *
 * Usage:
 *   npm install pg --save-dev
 *   Exportez DATABASE_URL (Supabase : Settings → Database → Connection string → URI)
 *   node scripts/run_migrations_090_100.js
 *
 * Si DATABASE_URL n'est pas défini, le script génère sql/RUN_MIGRATIONS_090_100.sql
 * à exécuter manuellement dans Supabase → SQL Editor.
 */

import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const migrationsDir = join(projectRoot, 'sql', 'migrations');

const MIGRATION_FILES = [
  '090_fix_les_glorieux_total_65.sql',
  '091_rpc_nombre_profils_hybride_max_profils_ou_cercle.sql',
  '092_add_date_entree_famille_profils.sql',
  '093_add_phone_ville_residence_profils.sql',
  '094_rpc_superviseur_dashboard_phase2.sql',
  '095_rpc_superviseur_dashboard_phase2_extra.sql',
  '096_rpc_effectifs_100_profils_sans_cercle.sql',
  '097_profils_circle_type_visible_to_others.sql',
  '098_rpc_superviseur_dashboard_100_profils.sql',
  '099_seed_5_mentors_les_glorieux.sql',
  '100_role_pilier_trigger_mentor_auto.sql',
];

dotenv.config({ path: join(projectRoot, '.env') });

async function loadMigrations() {
  const out = [];
  for (const name of MIGRATION_FILES) {
    const path = join(migrationsDir, name);
    try {
      const sql = await readFile(path, 'utf8');
      out.push({ name, sql });
    } catch (err) {
      throw new Error(`Impossible de lire ${name}: ${err.message}`);
    }
  }
  return out;
}

async function runWithPg(migrations) {
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    for (const { name, sql } of migrations) {
      console.log(`  Exécution : ${name} ...`);
      await client.query(sql);
      console.log(`  OK : ${name}`);
    }
    console.log('\n✅ Toutes les migrations 090–100 ont été exécutées avec succès.');
  } finally {
    await client.end();
  }
}

async function generateCombinedFile(migrations) {
  const outPath = join(projectRoot, 'sql', 'RUN_MIGRATIONS_090_100.sql');
  const lines = [
    '-- Fichier généré par scripts/run_migrations_090_100.js',
    '-- À exécuter dans Supabase → SQL Editor (tout en une fois ou par bloc).',
    '',
    ...migrations.flatMap(({ name, sql }) => [
      `-- ========== ${name} ==========`,
      sql,
      '',
    ]),
  ];
  const { writeFile } = await import('fs/promises');
  await writeFile(outPath, lines.join('\n'), 'utf8');
  console.log(`\n📄 Fichier généré : sql/RUN_MIGRATIONS_090_100.sql`);
  console.log('   Ouvrez Supabase → SQL Editor, collez le contenu (ou exécutez le fichier), puis exécutez.');
  return outPath;
}

async function main() {
  console.log('Chargement des migrations 090–100...');
  const migrations = await loadMigrations();
  console.log(`${migrations.length} fichier(s) chargé(s).\n`);

  if (process.env.DATABASE_URL) {
    try {
      await runWithPg(migrations);
    } catch (err) {
      console.error('\n❌ Erreur lors de l’exécution :', err.message);
      process.exit(1);
    }
  } else {
    console.log('DATABASE_URL non défini. Génération du fichier SQL combiné.');
    await generateCombinedFile(migrations);
    console.log('\nPour exécuter les migrations automatiquement, définissez DATABASE_URL (Supabase → Settings → Database → Connection string → URI).');
  }
}

main();
