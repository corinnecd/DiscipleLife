# Migration 081 – Nombre de disciples par familles (page Familles de Disciples)

## Objectif

La page **« Familles de Disciples »** affichait des totaux et progressions sous-évalués (ex. 67 disciples, 3 % de progression) car les comptages sur `cercle_personnes` sont bloqués par la RLS pour les rôles admin/pasteur.

La migration **081** ajoute la fonction **`get_nombre_disciples_par_familles(p_famille_ids UUID[])`** (SECURITY DEFINER) qui retourne, pour chaque famille dont l’ID est dans la liste :
- `famille_id`
- `nb_disciples_cercle` (nombre de lignes dans `cercle_personnes` pour le superviseur de la famille)

Le front appelle cette RPC après le chargement des familles et fusionne le résultat avec le nombre de membres issus de `profils` (famille_id) pour afficher le bon total et la bonne progression par carte.

## Exécution

1. Ouvrir le **SQL Editor** Supabase.
2. Copier-coller le contenu de **`sql/migrations/081_rpc_nombre_disciples_par_familles.sql`**.
3. Exécuter le script.

Après exécution, recharger la page Familles de Disciples : les KPI (Total Disciples, Progression moyenne) et les progressions par famille doivent refléter les vrais comptages.
