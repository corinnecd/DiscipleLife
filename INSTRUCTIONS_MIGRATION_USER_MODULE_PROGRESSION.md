# Instructions : Migration pour la table user_module_progression

## Problème
L'erreur "Could not find the table 'public.user_module_progression'" indique que la table nécessaire n'existe pas encore dans votre base de données Supabase.

## Solution : Exécuter la migration SQL

### Étape 1 : Ouvrir Supabase SQL Editor
1. Connectez-vous à votre projet Supabase : https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **SQL Editor** (dans le menu de gauche)

### Étape 2 : Exécuter la migration
1. Cliquez sur **"New query"** (Nouvelle requête)
2. **IMPORTANT** : Utilisez le fichier `027_objectif3_user_module_progression_FIXED.sql` (version corrigée)
3. Copiez-collez le contenu complet du fichier
4. Cliquez sur **"Run"** (Exécuter) ou appuyez sur `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

### Étape 3 : Vérifier la création
Après l'exécution, vous devriez voir un message de succès. Pour vérifier que la table a été créée :

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'user_module_progression';
```

Si la requête retourne `user_module_progression`, la table a été créée avec succès ✅

## Contenu de la migration

La migration `027_objectif3_user_module_progression.sql` crée :
- ✅ La table `user_module_progression` pour suivre la progression de chaque module
- ✅ Les index pour améliorer les performances
- ✅ Les politiques RLS (Row Level Security) pour la sécurité
- ✅ Le trigger pour mettre à jour automatiquement `updated_at`

## Après l'exécution

Une fois la migration exécutée :
1. Rechargez votre application
2. Essayez de nouveau de marquer un module comme complété
3. Cela devrait fonctionner maintenant ! 🎉

## Note importante

Cette migration est **idempotente** (peut être exécutée plusieurs fois sans problème) grâce aux clauses `IF NOT EXISTS` et `DROP IF EXISTS`.

