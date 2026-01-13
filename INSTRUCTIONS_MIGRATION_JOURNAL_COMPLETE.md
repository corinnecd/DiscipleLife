# Instructions : Migration complète pour journal_transformation

## Problème
La table `journal_transformation` n'existe pas ou est incomplète (colonnes manquantes comme `contenu`, `date_entree`, etc.).

## Solution
Exécuter la migration complète `032_objectif3_create_journal_table_complete.sql` dans Supabase.

## Étapes

1. **Ouvrir Supabase Dashboard**
   - Aller sur https://supabase.com/dashboard
   - Sélectionner votre projet

2. **Ouvrir l'éditeur SQL**
   - Cliquer sur "SQL Editor" dans le menu de gauche
   - Cliquer sur "New query"

3. **Copier le contenu de la migration**
   - Ouvrir le fichier `sql/migrations/032_objectif3_create_journal_table_complete.sql`
   - Copier tout le contenu

4. **Exécuter la migration**
   - Coller le contenu dans l'éditeur SQL
   - Cliquer sur "Run" (ou appuyer sur Ctrl+Enter / Cmd+Enter)
   - Vérifier que le message "✅ Migration complète terminée" apparaît

5. **Vérifier le résultat**
   - La migration devrait créer la table complète avec toutes les colonnes nécessaires
   - Les index et les politiques RLS seront également créés

## Résultat attendu
Après l'exécution :
- ✅ La table `journal_transformation` sera créée avec toutes les colonnes nécessaires
- ✅ Toutes les colonnes de base seront présentes (`user_id`, `contenu`, `thematique`, `titre`, `date_entree`)
- ✅ Les colonnes optionnelles seront également disponibles
- ✅ L'enregistrement des entrées de journal devrait fonctionner correctement

## Note importante
Cette migration est idempotente : elle peut être exécutée plusieurs fois sans problème. Si la table existe déjà, elle ajoutera uniquement les colonnes manquantes.


