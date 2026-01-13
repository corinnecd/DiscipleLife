# Instructions : Migration pour corriger la colonne date_entree

## Problème
La colonne `date_entree` n'existe pas dans la table `journal_transformation`, ce qui empêche la récupération des entrées de journal.

## Solution
Exécuter la migration `030_objectif3_fix_journal_date_column.sql` dans Supabase.

## Étapes

1. **Ouvrir Supabase Dashboard**
   - Aller sur https://supabase.com/dashboard
   - Sélectionner votre projet

2. **Ouvrir l'éditeur SQL**
   - Cliquer sur "SQL Editor" dans le menu de gauche
   - Cliquer sur "New query"

3. **Copier le contenu de la migration**
   - Ouvrir le fichier `sql/migrations/030_objectif3_fix_journal_date_column.sql`
   - Copier tout le contenu

4. **Exécuter la migration**
   - Coller le contenu dans l'éditeur SQL
   - Cliquer sur "Run" (ou appuyer sur Ctrl+Enter / Cmd+Enter)
   - Vérifier que le message indique que la colonne a été créée ou renommée

5. **Vérifier le résultat**
   - La migration devrait afficher un message de confirmation
   - Si des données existent avec `created_at`, elles seront préservées (la colonne sera renommée)
   - Si aucune colonne de date n'existe, `date_entree` sera créée avec `CURRENT_DATE` comme valeur par défaut

## Résultat attendu
Après l'exécution, la table `journal_transformation` devrait avoir la colonne `date_entree`, et l'erreur dans la console devrait disparaître.


