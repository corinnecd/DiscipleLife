# Migration 080 – Progression par famille (graphiques)

## Objectif

La page **« Progression Globale des Familles de [nom pasteur] »** affichait des barres vides car les comptages par famille (dans `cercle_personnes`) sont bloqués par la RLS.

La migration **080** ajoute la fonction **`get_progression_par_famille_pasteur(p_pasteur_id)`** (SECURITY DEFINER) qui retourne, pour chaque famille du pasteur :
- `superviseur_id`, `famille_id`, `nom_famille`
- `nb_disciples`, `objectif`, `progression_pct`

Le dashboard appelle cette RPC après le chargement des familles et met à jour les `stats` (nombreMembres, objectif, progression) pour afficher les barres de progression correctement.

## Exécution

1. Ouvrir le **SQL Editor** Supabase.
2. Copier-coller le contenu de **`sql/migrations/080_rpc_progression_par_famille_pasteur.sql`**.
3. Exécuter le script.

Après exécution, recharger le dashboard pasteur : les barres de la section « Progression Globale des Familles » doivent afficher les pourcentages réels.
