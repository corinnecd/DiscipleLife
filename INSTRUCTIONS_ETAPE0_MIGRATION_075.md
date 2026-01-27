# Étape 0 : Exécuter la migration 075 (modèle cible)

## À faire

1. Ouvrir **Supabase** → votre projet → **SQL Editor**.
2. Ouvrir le fichier **`sql/migrations/075_modele_cible_sync_cercle_vers_profils.sql`** dans le projet.
3. **Copier tout le contenu** du fichier (sans la section commentée « Backfill » en fin de fichier, sauf si vous voulez l’exécuter).
4. **Coller** dans l’éditeur SQL Supabase et cliquer sur **Run**.

## Vérification rapide

Après exécution, dans SQL Editor :

```sql
-- La colonne profil_id doit exister sur cercle_personnes
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'cercle_personnes' AND column_name = 'profil_id';

-- Le trigger doit exister
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_table = 'cercle_personnes' AND trigger_name = 'sync_cercle_vers_profils_trigger';
```

Vous devez voir une ligne pour `profil_id` et une pour `sync_cercle_vers_profils_trigger`.

## Ensuite

Passer à l’**Étape 1** : correction de la boucle infinie et de la logique « stats comparatives » dans SuperviseurDashboard.
