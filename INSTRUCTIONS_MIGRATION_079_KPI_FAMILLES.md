# Migration 079 – KPI familles pour pasteur (disciples + progression)

## Objectif

La section **« KPI des Familles de [nom pasteur] »** du dashboard pasteur affichait **0 disciples** et **0 % de progression** car les comptages sur `cercle_personnes` sont bloqués par la RLS (le pasteur ne voit que son propre cercle).

La migration **079** ajoute une fonction RPC **`get_kpi_familles_pour_pasteur(p_pasteur_id)`** en **SECURITY DEFINER** pour calculer côté serveur :
- `total_disciples` (somme des lignes `cercle_personnes` des superviseurs du pasteur)
- `total_familles`
- `objectif_total` (somme des objectifs des familles)
- `familles_objectif_atteint` (nombre de familles dont le nombre de disciples ≥ objectif)

## Exécution

1. Ouvrir le **SQL Editor** de votre projet Supabase.
2. Copier-coller le contenu de **`sql/migrations/079_rpc_kpi_familles_pour_pasteur.sql`**.
3. Exécuter le script.

Après exécution, le dashboard pasteur utilisera automatiquement cette RPC pour remplir les KPI **Disciples** et **Progression** (et le nombre de familles actives si besoin).
