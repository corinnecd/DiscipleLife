# Exécuter les migrations 090 à 100

## Option A : Exécution automatique (recommandé si vous avez l’URL de la base)

1. **Récupérer l’URL de connexion Supabase**
   - Supabase Dashboard → **Settings** → **Database**
   - Section **Connection string** → **URI**
   - Copier l’URL (format : `postgresql://postgres.[ref]:[MOT_DE_PASSE]@...`)
   - Remplacer `[YOUR-PASSWORD]` par le mot de passe de la base (ou utiliser **Connection pooling** si vous préférez)

2. **Définir la variable d’environnement**
   - Dans le fichier `.env` à la racine du projet, ajouter :
   ```env
   DATABASE_URL=postgresql://postgres.xxxxx:VOTRE_MOT_DE_PASSE@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   ```
   - Ou exporter en ligne de commande avant d’exécuter le script :
   ```bash
   export DATABASE_URL="postgresql://..."
   ```

3. **Lancer le script**
   ```bash
   node scripts/run_migrations_090_100.js
   ```
   Les 11 migrations (090 à 100) seront exécutées dans l’ordre.

---

## Option B : Exécution manuelle dans Supabase (sans mot de passe en local)

1. Ouvrir **Supabase** → **SQL Editor**.
2. Ouvrir le fichier **`sql/RUN_MIGRATIONS_090_100.sql`** (généré par le script).
3. Copier tout le contenu et le coller dans l’éditeur SQL.
4. Cliquer sur **Run** (ou exécuter par blocs si Supabase le demande).

Le fichier `RUN_MIGRATIONS_090_100.sql` est recréé à chaque exécution de :
```bash
node scripts/run_migrations_090_100.js
```
lorsque `DATABASE_URL` n’est pas défini.

---

## Liste des migrations exécutées (ordre)

| # | Fichier | Description |
|---|---------|-------------|
| 1 | 090_fix_les_glorieux_total_65.sql | Correction effectifs Les Glorieux |
| 2 | 091_rpc_nombre_profils_hybride_max_profils_ou_cercle.sql | RPC effectifs hybride |
| 3 | 092_add_date_entree_famille_profils.sql | Colonne date_entree_famille |
| 4 | 093_add_phone_ville_residence_profils.sql | Colonnes phone, ville_residence |
| 5 | 094_rpc_superviseur_dashboard_phase2.sql | RPC dashboard superviseur phase 2 |
| 6 | 095_rpc_superviseur_dashboard_phase2_extra.sql | RPC phase 2 extra |
| 7 | 096_rpc_effectifs_100_profils_sans_cercle.sql | RPC effectifs 100 % profils |
| 8 | 097_profils_circle_type_visible_to_others.sql | Colonnes circle_type, visible_to_others |
| 9 | 098_rpc_superviseur_dashboard_100_profils.sql | RPC dashboard superviseur 100 % profils |
| 10 | 099_seed_5_mentors_les_glorieux.sql | Seed 5 mentors Les Glorieux (optionnel) |
| 11 | 100_role_pilier_trigger_mentor_auto.sql | Rôle pilier + trigger disciple → mentor |

---

## En cas d’erreur

- **« relation already exists » / « column already exists »** : certaines migrations sont idempotentes (`IF NOT EXISTS`). Vous pouvez ignorer ces messages ou exécuter uniquement les migrations qui ont échoué.
- **Migration 090** : nécessite que la famille « Les Glorieux » (FAM012) existe.
- **Migration 099** : crée des comptes dans `auth.users` ; à exécuter seulement si vous voulez les 5 mentors de test.
