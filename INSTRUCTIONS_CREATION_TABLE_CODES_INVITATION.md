# 🔧 Instructions pour créer la table codes_invitation

## Problème
La table `codes_invitation` n'existe pas dans Supabase, ce qui empêche le système de parrainage de fonctionner.

## Solution : Migration SQL complète

### Étape 1 : Exécuter la migration

1. **Ouvrez Supabase Dashboard**
   - Allez sur https://supabase.com/dashboard
   - Sélectionnez votre projet

2. **Ouvrez SQL Editor**
   - Cliquez sur "SQL Editor" dans le menu de gauche
   - Cliquez sur "New query"

3. **Ouvrez le fichier de migration**
   - Ouvrez le fichier : `sql/migrations/007_create_codes_invitation_complete.sql`
   - **Copiez TOUT le contenu** du fichier

4. **Collez et exécutez**
   - Collez le contenu dans l'éditeur SQL de Supabase
   - Cliquez sur **"Run"** (ou appuyez sur `Ctrl+Enter` / `Cmd+Enter`)

### Étape 2 : Vérifier la création

Après l'exécution, vous devriez voir des messages de succès dans la console SQL :
- ✅ `Table codes_invitation créée avec succès !`
- ✅ `Colonne lien_invitation présente !`

### Étape 3 : Vérification manuelle

1. **Dans Supabase Dashboard** :
   - Allez dans **Table Editor**
   - Vérifiez que la table `codes_invitation` apparaît dans la liste

2. **Vérifier les colonnes** :
   - Cliquez sur la table `codes_invitation`
   - Vérifiez que ces colonnes existent :
     - `id` (UUID)
     - `user_id` (UUID)
     - `code` (TEXT)
     - `lien_invitation` (TEXT) ⚠️ **IMPORTANT**
     - `nombre_invites` (INTEGER)
     - `nombre_conversions` (INTEGER)
     - `created_at` (TIMESTAMP)
     - `updated_at` (TIMESTAMP)

3. **Vérifier les politiques RLS** :
   - Allez dans **Authentication** → **Policies**
   - Sélectionnez la table `codes_invitation`
   - Vérifiez que 4 politiques existent :
     - "Users can view their own invitation codes"
     - "Users can insert their own invitation codes"
     - "Users can update their own invitation codes"
     - "Users can delete their own invitation codes"

### Étape 4 : Rafraîchir l'application

1. **Rafraîchissez la page** de l'application
   - Appuyez sur `Ctrl+Shift+R` (Windows/Linux) ou `Cmd+Shift+R` (Mac)
   - Ou fermez et rouvrez l'onglet

2. **Testez le système de parrainage** :
   - Allez dans **Évangélisation** → **Onglet "Parrainage"**
   - Le message d'erreur devrait disparaître
   - Vous devriez pouvoir voir/générer votre code d'invitation

## En cas d'erreur

### Erreur : "relation profils does not exist"
**Solution** : La table `profils` doit exister avant. Exécutez d'abord la migration `001_objectif1_evangelisation_tables.sql`

### Erreur : "permission denied"
**Solution** : 
- Assurez-vous d'être connecté en tant qu'administrateur dans Supabase
- Vérifiez que vous avez les droits nécessaires sur le projet

### Erreur : "duplicate key value"
**Solution** : 
- La table existe déjà mais avec une structure différente
- Vous pouvez soit :
  1. Supprimer la table existante (ATTENTION : perte de données)
  2. Ou utiliser la migration `006_fix_codes_invitation_lien.sql` qui ajoute seulement la colonne manquante

### La table n'apparaît toujours pas
**Solutions** :
1. Vérifiez les messages d'erreur dans la console SQL de Supabase
2. Vérifiez que vous êtes dans le bon projet Supabase
3. Essayez de rafraîchir la page Table Editor
4. Vérifiez que la migration s'est bien exécutée (regardez les messages dans SQL Editor)

## Fichier de migration

**Fichier à utiliser** : `sql/migrations/007_create_codes_invitation_complete.sql`

Cette migration est **idempotente** : vous pouvez l'exécuter plusieurs fois sans problème. Elle vérifie l'existence des éléments avant de les créer.

## Support

Si le problème persiste après avoir suivi ces instructions :
1. Vérifiez les logs dans Supabase SQL Editor
2. Vérifiez que toutes les migrations précédentes ont été exécutées
3. Vérifiez que la table `profils` existe et est accessible


