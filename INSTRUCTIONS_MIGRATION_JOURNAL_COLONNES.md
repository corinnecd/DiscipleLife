# Instructions : Migration pour ajouter les colonnes manquantes à journal_transformation

## Problème
La table `journal_transformation` n'a pas toutes les colonnes nécessaires (par exemple : `actions_prises`, `revelations`, `gratitude`, `prieres`, `emotions`, `tags`, `date_entree`).

## Solution
Exécuter la migration `031_objectif3_fix_journal_columns.sql` dans Supabase.

## Étapes

1. **Ouvrir Supabase Dashboard**
   - Aller sur https://supabase.com/dashboard
   - Sélectionner votre projet

2. **Ouvrir l'éditeur SQL**
   - Cliquer sur "SQL Editor" dans le menu de gauche
   - Cliquer sur "New query"

3. **Copier le contenu de la migration**
   - Ouvrir le fichier `sql/migrations/031_objectif3_fix_journal_columns.sql`
   - Copier tout le contenu

4. **Exécuter la migration**
   - Coller le contenu dans l'éditeur SQL
   - Cliquer sur "Run" (ou appuyer sur Ctrl+Enter / Cmd+Enter)
   - Vérifier que les messages indiquent que les colonnes ont été ajoutées

5. **Vérifier le résultat**
   - La migration devrait afficher des messages de confirmation pour chaque colonne
   - Si une colonne existe déjà, elle sera ignorée (migration idempotente)

## Résultat attendu
Après l'exécution, toutes les colonnes nécessaires seront présentes dans `journal_transformation`, et l'erreur "Could not find the 'actions_prises' column" devrait disparaître.

## Alternative temporaire
Si vous ne pouvez pas exécuter la migration immédiatement, le code a été simplifié pour n'utiliser que les colonnes de base (`user_id`, `contenu`, `thematique`, `titre`). Vous pourrez créer des entrées de journal, mais les champs avancés ne seront pas sauvegardés jusqu'à l'exécution de la migration.


