# Migrations 102 et 103 : nb_disciples dans profils + arbre 4 niveaux

## Objectifs

1. **Nombre de disciples dans `profils`**  
   Chaque profil dispose d’un champ **`nb_disciples`** (nombre de disciples directs : profils dont `mentor_id` = ce profil).  
   Ce champ est mis à jour automatiquement par un trigger à chaque ajout/modification/suppression de lien `mentor_id`.  
   **« Suivi par »** reste le nom du mentor (résolution de `mentor_id` vers `first_name` / `last_name`).

2. **Arbre généalogique à 4 niveaux de parenté**  
   - **Niveau 1 : Pasteur** (qui supervise)  
   - **Niveau 2 : Superviseur** (qui suit le mentor)  
   - **Niveau 3 : Mentor** (qui suit le disciple)  
   - **Niveau 4 : Disciple** (lié par `mentor_id`)

## Fichiers

- `sql/migrations/102_profils_nb_disciples_trigger.sql`  
  - Ajout de la colonne `profils.nb_disciples`  
  - Trigger de mise à jour (INSERT/UPDATE/DELETE sur `profils` quand `mentor_id` change)  
  - Synchronisation initiale : `nb_disciples = COUNT(profils WHERE mentor_id = id)`

- `sql/migrations/103_arbre_4_niveaux_rpc.sql`  
  - RPC **`get_arbre_4_niveaux(p_pasteur_id UUID DEFAULT NULL)`**  
  - Retourne les nœuds de l’arbre (niveau, id, nom, prénom, parent_id, nb_disciples, role_niveau, famille_nom).  
  - Si `p_pasteur_id` est fourni, limite l’arbre au périmètre de ce pasteur.

## Exécution (Supabase SQL Editor)

1. Exécuter dans l’ordre :
   - `sql/migrations/102_profils_nb_disciples_trigger.sql`
   - `sql/migrations/103_arbre_4_niveaux_rpc.sql`

2. Vérifications :
   - `SELECT id, first_name, last_name, mentor_id, nb_disciples FROM profils LIMIT 20;`  
     → `nb_disciples` doit être cohérent avec le nombre de profils ayant `mentor_id = id`.
   - `SELECT * FROM get_arbre_4_niveaux(NULL) LIMIT 50;`  
     → Vérifier les 4 niveaux (niveau 1 = Pasteur, 2 = Superviseur, 3 = Mentor, 4 = Disciple).

## Utilisation côté app

- **Tableau consolidé / fiches**  
  Vous pouvez utiliser `profils.nb_disciples` pour l’affichage (tableau, fiche détail) en plus ou à la place du comptage côté RPC.  
  « Suivi par » continue à être affiché via `mentor_id` → nom du mentor.

- **Arbre généalogique**  
  Appeler `get_arbre_4_niveaux(pasteur_id)` (ou `NULL` pour tout l’arbre) et construire l’arbre à partir des champs `niveau`, `id`, `parent_id`, `nom`, `prenom`, `nb_disciples`, `role_niveau`.
