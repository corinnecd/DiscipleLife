# 🔧 Instructions pour corriger l'erreur codes_invitation

## Erreur rencontrée
```
Could not find the 'lien_invitation' column of 'codes_invitation' in the schema cache
```

## Solution

### Étape 1 : Exécuter la migration SQL

1. Ouvrez **Supabase Dashboard** → **SQL Editor**
2. Ouvrez le fichier `sql/migrations/006_fix_codes_invitation_lien.sql`
3. Copiez tout le contenu du fichier
4. Collez-le dans l'éditeur SQL de Supabase
5. Cliquez sur **Run** ou appuyez sur `Ctrl+Enter` (ou `Cmd+Enter` sur Mac)

### Étape 2 : Vérification

Après l'exécution, vérifiez que :

1. ✅ La table `codes_invitation` existe
2. ✅ La colonne `lien_invitation` existe dans la table
3. ✅ Les politiques RLS sont activées
4. ✅ Les politiques RLS sont correctement configurées

### Vérification manuelle dans Supabase

1. Allez dans **Table Editor** → **codes_invitation**
2. Vérifiez que la colonne `lien_invitation` est présente
3. Allez dans **Authentication** → **Policies** → **codes_invitation**
4. Vérifiez que les 4 politiques suivantes existent :
   - "Users can view their own invitation codes"
   - "Users can insert their own invitation codes"
   - "Users can update their own invitation codes"
   - "Users can delete their own invitation codes"

### Étape 3 : Rafraîchir l'application

1. Rafraîchissez la page de l'application (Ctrl+Shift+R ou Cmd+Shift+R)
2. Allez dans l'onglet "Parrainage" de la page Évangélisation
3. L'erreur devrait être résolue

## Ce que fait cette migration

1. ✅ Crée la table `codes_invitation` si elle n'existe pas
2. ✅ Ajoute la colonne `lien_invitation` si elle n'existe pas
3. ✅ Met à jour les enregistrements existants avec un lien par défaut
4. ✅ Active RLS (Row Level Security)
5. ✅ Crée/recrée toutes les politiques RLS nécessaires
6. ✅ Crée les index pour améliorer les performances
7. ✅ Crée le trigger pour `updated_at`
8. ✅ Vérifie et crée la table `invitations_envoyees` si nécessaire

## En cas d'erreur

Si vous rencontrez des erreurs lors de l'exécution :

1. **Erreur "relation profils does not exist"** :
   - Vérifiez que la table `profils` existe
   - Si vous utilisez une autre table pour les utilisateurs, modifiez les références dans la migration

2. **Erreur "function auth.uid() does not exist"** :
   - Vérifiez que Supabase Auth est activé
   - Si vous n'utilisez pas Supabase Auth, vous devrez adapter les politiques RLS

3. **Erreur de permissions** :
   - Assurez-vous d'être connecté en tant qu'administrateur dans Supabase
   - Vérifiez que vous avez les droits nécessaires

## Note importante

Cette migration est **idempotente** : vous pouvez l'exécuter plusieurs fois sans problème. Elle vérifie l'existence des éléments avant de les créer.

