# Étape 0 : Exécuter la migration 075 (modèle cible)

**Objectif :** Mettre en place la synchronisation automatique `cercle_personnes` → `profils` (source de vérité).  
Toute entrée ou modification dans `cercle_personnes` créera ou mettra à jour un enregistrement dans `profils`.

Référence : **`MODELE_CIBLE_DONNEES.md`**.

---

## Prérequis

Avant d’exécuter la migration, vérifier que :

- La table **`cercle_personnes`** existe (colonnes utilisées : `user_id`, `first_name`, `last_name`, `email`, `created_at`).
- La table **`profils`** existe avec au moins : `id`, `email`, `first_name`, `last_name`, `role`, `famille_id`, `mentor_id`, `created_at`.

Dans Supabase → **SQL Editor**, exécuter :

```sql
-- Vérifier l'existence des tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('cercle_personnes', 'profils');
```

Vous devez voir deux lignes : `cercle_personnes` et `profils`.

---

## 1. Exécuter la migration

1. Ouvrir **Supabase** → votre projet → **SQL Editor**.
2. Ouvrir le fichier **`sql/migrations/075_modele_cible_sync_cercle_vers_profils.sql`**.
3. Copier **tout le contenu** du fichier **sans** la section commentée « Backfill » en fin de fichier (lignes 98–121).
4. Coller dans l’éditeur SQL Supabase et cliquer sur **Run**.

La migration :

- Ajoute la colonne `profil_id` sur `cercle_personnes` (si elle n’existe pas).
- Crée la fonction `sync_cercle_personnes_vers_profils` et le trigger `sync_cercle_vers_profils_trigger`.

---

## 2. Vérification rapide

Dans le SQL Editor, exécuter :

```sql
-- La colonne profil_id doit exister sur cercle_personnes
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'cercle_personnes' AND column_name = 'profil_id';

-- Le trigger doit exister
SELECT trigger_name, event_manipulation, action_timing 
FROM information_schema.triggers 
WHERE event_object_schema = 'public' 
  AND event_object_table = 'cercle_personnes' 
  AND trigger_name = 'sync_cercle_vers_profils_trigger';
```

Résultat attendu :

- Une ligne pour la colonne `profil_id` (type `uuid`).
- Une ligne pour le trigger `sync_cercle_vers_profils_trigger` sur `INSERT` et `UPDATE`, `BEFORE`.

Vous pouvez aussi utiliser le script complet : **`sql/migrations/075_verification_et_backfill.sql`** (voir section 4).

---

## 3. Finaliser la 075 (075b + backfill)

Si vous avez des lignes dans `cercle_personnes` sans `profil_id` (ex. 72), faire en **une seule fois** dans Supabase → SQL Editor :

1. Ouvrir le fichier **`sql/migrations/075_finaliser_backfill.sql`**.
2. Copier **tout le contenu** et le coller dans l’éditeur SQL Supabase.
3. Cliquer sur **Run**.

Ce script :

- **A.** Met à jour le trigger pour accepter un mentor absent de `profils` (`mentor_id` = NULL).
- **B.** Lance le backfill : chaque ligne sans `profil_id` reçoit un profil créé et son `profil_id` rempli.
- **C.** Affiche le résultat : « Lignes avec profil_id » et « Lignes sans profil_id ».

**Note :** `profils.id` doit exister dans `auth.users` (FK Supabase). Un profil n’est créé que si l’email du cercle correspond à un utilisateur Auth. Les fiches cercle sans compte Auth restent avec `profil_id` NULL ; c’est normal. Vous pouvez avoir par exemple 10 avec profil_id et 62 sans si seuls 10 disciples ont un compte.

Si aucune erreur ne s’affiche, la migration 075 est terminée.

---

## 4. Backfill manuel (si besoin)

Si vous préférez exécuter étape par étape :

1. Exécuter **`sql/migrations/075b_fix_trigger_mentor_optionnel.sql`**.
2. Puis exécuter :  
   `UPDATE cercle_personnes SET last_name = last_name WHERE profil_id IS NULL;`
3. Vérifier avec les requêtes de **`sql/migrations/075_verification_et_backfill.sql`**.

---

## 5. Script de vérification et backfill (détails)

Le fichier **`sql/migrations/075_verification_et_backfill.sql`** regroupe les vérifications détaillées (colonne, trigger, comptages) et un backfill ligne par ligne pour diagnostic en cas d’erreur.

---

## Ensuite

Passer à l’**Étape 1** : correction de la boucle infinie et de la logique « stats comparatives » dans SuperviseurDashboard (voir **`RAPPORT_TOUT_A_IMPLEMENTER.md`**, section 9.1).
