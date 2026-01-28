# Consolidation bidirectionnelle cercle_personnes ↔ profils

## Règle

- **À chaque entrée dans `cercle_personnes`** → **`profils`** doit être mis à jour (création ou mise à jour du profil, sous contrainte auth).
- **À chaque entrée dans `profils`** (disciple avec mentor) → **`cercle_personnes`** doit être mis à jour (le disciple apparaît dans le cercle de son mentor).

## Implémentation actuelle

| Sens | Trigger | Fichier | Statut |
|------|---------|---------|--------|
| **cercle → profils** | `sync_cercle_vers_profils_trigger` (BEFORE INSERT OR UPDATE sur `cercle_personnes`) | 075 + 075_finaliser_backfill.sql | En place. Crée/met à jour le profil **uniquement si** l’email du cercle correspond à un utilisateur dans `auth.users`. |
| **profils → cercle** | `sync_profils_vers_cercle_trigger` (AFTER INSERT OR UPDATE sur `profils`, WHEN role = 'disciple' AND mentor_id IS NOT NULL) | **077_sync_profils_vers_cercle_personnes.sql** | À exécuter dans Supabase. |

## Exécuter la sync profils → cercle (077)

1. Ouvrir **Supabase** → **SQL Editor**.
2. Ouvrir **`sql/migrations/077_sync_profils_vers_cercle_personnes.sql`**.
3. Copier tout le contenu, coller dans l’éditeur, puis **Run**.

Après exécution, tout **INSERT** ou **UPDATE** d’un profil avec `role = 'disciple'` et `mentor_id` non null créera ou mettra à jour automatiquement la ligne correspondante dans `cercle_personnes` (cercle du mentor).

## Limites

- **cercle → profils** : un profil n’est créé que si l’email du cercle correspond à un compte **auth.users** (contrainte FK `profils.id` → `auth.users.id`). Les fiches cercle sans compte Auth restent avec `profil_id` NULL.
- **profils → cercle** : ne s’applique qu’aux profils **disciple** avec **mentor_id** renseigné. Les autres rôles (mentor, superviseur, pasteur) ne créent pas d’entrée dans `cercle_personnes` via ce trigger.

## Référence

- **MODELE_CIBLE_DONNEES.md** : schéma et règles détaillées.
