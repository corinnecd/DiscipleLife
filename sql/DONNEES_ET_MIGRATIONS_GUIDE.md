# Données & migrations – Guide d’exécution

Ce guide décrit l’ordre et le contenu des migrations « Données & migrations » du rapport (§ 8, § 9).

---

## Ordre recommandé

Exécuter dans l’ordre suivant dans le **SQL Editor** de Supabase (ou votre client PostgreSQL) :

| Étape | Fichier | Rôle |
|-------|---------|------|
| 1 | **092** | Colonne `date_entree_famille` sur `profils` (formulaire d’inscription). |
| 2 | **093** | Colonnes `phone` et `ville_residence` sur `profils` (formulaire). |
| 3 | **075** | Modèle cible : lien `cercle_personnes.profil_id` + trigger sync → profils. |
| 4 | **074** | **Ne pas exécuter** — Seed de données de test ; tous les tests se font avec les **vraies données** dans `profils`. |

**Option « tout en un » (étape 0) :** exécuter le script **`sql/run_migrations_092_093_075.sql`** — il enchaîne 092, 093 et 075 en une seule fois. Puis lancer **`sql/verification_migrations_092_093_075.sql`** pour contrôler le résultat.

**Pourquoi 092 et 093 avant 075 ?**  
075 touche à `cercle_personnes` et `profils`. 092/093 n’ajoutent que des colonnes sur `profils` avec `ADD COLUMN IF NOT EXISTS`, sans impact sur 075. Les faire en premier garantit que le formulaire et l’app ont bien `date_entree_famille`, `phone`, `ville_residence` avant toute évolution du modèle.

**Prérequis table `cercle_personnes` :** la migration 075 suppose que la table **`cercle_personnes`** existe déjà. Elle n’est **pas créée** par les migrations de ce dépôt (033, 076, 077, etc. la référencent mais aucune ne fait `CREATE TABLE cercle_personnes`). Si votre base n’a pas cette table, exécuter uniquement 092 et 093 ; la partie 075 échouera avec « relation cercle_personnes does not exist ».

---

## Détail par migration

### 1. Migration 092 – `date_entree_famille`

- **Fichier :** `sql/migrations/092_add_date_entree_famille_profils.sql`
- **Effet :** Ajoute sur `profils` la colonne `date_entree_famille` (type `DATE`) et un index partiel.
- **Idempotent :** Oui (`ADD COLUMN IF NOT EXISTS`).
- **Action :** Copier-coller le contenu du fichier dans le SQL Editor Supabase → Run.

---

### 2. Migration 093 – `phone` et `ville_residence`

- **Fichier :** `sql/migrations/093_add_phone_ville_residence_profils.sql`
- **Effet :** Ajoute sur `profils` les colonnes `phone` (TEXT) et `ville_residence` (TEXT), avec index partiels et commentaires.
- **Idempotent :** Oui (`ADD COLUMN IF NOT EXISTS`).
- **Action :** Copier-coller le contenu du fichier → Run.

---

### 3. Migration 075 – Modèle cible (sync cercle → profils)

- **Fichier :** `sql/migrations/075_modele_cible_sync_cercle_vers_profils.sql`
- **Effet :**
  - Ajoute `cercle_personnes.profil_id` (UUID, FK vers `profils.id`).
  - Crée la fonction `sync_cercle_personnes_vers_profils()` : à chaque INSERT/UPDATE sur `cercle_personnes`, création ou mise à jour d’un enregistrement dans `profils` et remplissage de `profil_id`.
  - Crée le trigger `sync_cercle_vers_profils_trigger` sur `cercle_personnes`.
- **Prérequis :** Tables `cercle_personnes` et `profils` existantes.
- **Idempotent :** Partiellement (DROP TRIGGER IF EXISTS + CREATE TRIGGER ; colonne en IF NOT EXISTS).
- **Backfill optionnel :** En fin de fichier, un bloc commenté décrit un backfill pour les lignes existantes sans `profil_id`. Pour un backfill propre, utiliser un script dédié ou les fichiers `075_verification_et_backfill.sql` / `075_finaliser_backfill.sql` s’ils existent.
- **Action :** Copier-coller le contenu du fichier → Run.

---

### 4. Seed 074 – Ne pas exécuter (tests sur vraies données)

- **Fichier :** `sql/migrations/074_seed_donnees_test_completes_kpi_presence.sql`
- **Effet :** Crée des profils de test (`@test.icc.ga`), supprime puis recrée des données de test pour KPI / présence.
- **Recommandation :** **Ne pas exécuter.** Tous les tests doivent être faits à partir des **vraies données** dans `profils`. Ce script est conservé uniquement pour référence ou environnements dédiés aux jeux de données factices.

---

## Checklist de vérification (092 / 093 / 075)

Un script SQL permet de vérifier que les trois migrations sont bien appliquées.

**Fichier à exécuter :** `sql/verification_migrations_092_093_075.sql`

**Comment faire :**
1. Ouvrir le **SQL Editor** Supabase.
2. Copier-coller **tout** le contenu de `verification_migrations_092_093_075.sql`.
3. Exécuter (Run). Plusieurs jeux de résultats s’affichent (un par requête).
4. Contrôler à l’aide du tableau ci-dessous.

| Migration | Vérification | Résultat attendu |
|------------|----------------|------------------|
| **092** | Colonne `date_entree_famille` sur `profils` | 1 ligne : `date_entree_famille`, type `date`. |
| **092** | Index | 1 ligne : `idx_profils_date_entree_famille`. |
| **093** | Colonnes `phone` et `ville_residence` sur `profils` | 2 lignes : `phone` et `ville_residence`, type `text`. |
| **093** | Index | 2 lignes : `idx_profils_phone`, `idx_profils_ville_residence`. |
| **075** | Colonne `profil_id` sur `cercle_personnes` | 1 ligne : `profil_id`, type `uuid`. |
| **075** | Index | 1 ligne : `idx_cercle_personnes_profil_id`. |
| **075** | Fonction trigger | 1 ligne : `sync_cercle_personnes_vers_profils`. |
| **075** | Trigger sur la table | 1 ligne : `sync_cercle_vers_profils_trigger`, timing BEFORE, events INSERT/UPDATE. |

Si un résultat est **vide** alors qu’une ligne est attendue, la migration correspondante n’est pas appliquée (ou partiellement) : exécuter le fichier de migration indiqué dans la section « Détail par migration » ci-dessus.

---

## Vérification manuelle (optionnelle)

- **092 / 093 :** Dans Supabase (Table Editor), table `profils` → vérifier la présence des colonnes `date_entree_famille`, `phone`, `ville_residence`.
- **075 :** Table `cercle_personnes` → colonne `profil_id` présente ; dans l’onglet Triggers, `sync_cercle_vers_profils_trigger` listé. Pour tester le comportement : faire un INSERT dans `cercle_personnes` (avec un `user_id` = id d’un profil existant ayant un `famille_id`) et vérifier qu’un nouveau profil est créé et que `profil_id` est rempli.
- **074 :** Ne pas exécuter ; les vérifications et tests se font sur les données réelles de `profils`.

---

## Fichiers connexes (075)

- `075_verification_et_backfill.sql` – Vérifications et éventuel backfill.
- `075_finaliser_backfill.sql` – Finalisation du backfill.
- `075b_fix_trigger_mentor_optionnel.sql` – Ajustement du trigger (mentor optionnel).

Exécuter ces fichiers seulement si vous en avez besoin (backfill ou correctif), après avoir appliqué `075_modele_cible_sync_cercle_vers_profils.sql`.

---

## Phase 3 CRUD – Lecture 100 % profils

Pour que les listes « Mes disciples » / « Membres famille » et les KPI pasteur/superviseur s’appuient **uniquement sur la table `profils`** (plus sur `cercle_personnes`), exécuter en base les migrations suivantes si ce n’est pas déjà fait :

| Fichier | Rôle |
|---------|------|
| **098** | `sql/migrations/098_rpc_superviseur_dashboard_100_profils.sql` — RPC dashboard superviseur (membres, stats, disciples count) 100 % profils. Remplace les versions qui lisaient `cercle_personnes`. |
| **096** | `sql/migrations/096_rpc_effectifs_100_profils_sans_cercle.sql` — RPC KPI pasteur (effectifs par famille, progression, mentors avec disciples, etc.) 100 % profils. |
| **087** | `sql/migrations/087_rpc_kpi_disciples_par_pasteur_profils.sql` — KPI disciples par pasteur basé sur profils. |

**Ordre :** 087, 096, 098 (ou selon dépendances existantes). Après exécution, le frontend (déjà branché sur ces RPC) utilisera uniquement `profils` pour les listes et tableaux de bord.
