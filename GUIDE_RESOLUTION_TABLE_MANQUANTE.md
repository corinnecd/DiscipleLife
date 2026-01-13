# 🔧 Guide de résolution : Table codes_invitation manquante

## Problème
La table `codes_invitation` n'existe pas dans Supabase, même après avoir exécuté les migrations.

## Solutions par ordre de priorité

### ✅ SOLUTION 1 : Migration simplifiée (RECOMMANDÉE)

**Fichier à utiliser** : `sql/migrations/008_verification_et_creation_codes_invitation.sql`

Cette migration est **plus simple et plus robuste**. Elle :
- Vérifie si la table existe avant de la créer
- Gère les erreurs gracieusement
- Ajoute la colonne `lien_invitation` si elle manque
- Affiche des messages clairs sur ce qui se passe

**Étapes** :
1. Ouvrez **Supabase Dashboard** → **SQL Editor**
2. Ouvrez le fichier `sql/migrations/008_verification_et_creation_codes_invitation.sql`
3. **Copiez TOUT le contenu**
4. Collez dans l'éditeur SQL de Supabase
5. Cliquez sur **"Run"**
6. Regardez les messages dans la console (vous devriez voir des ✅)

### ✅ SOLUTION 2 : Création manuelle via Table Editor

Si la migration SQL ne fonctionne pas, créez la table manuellement :

1. **Dans Supabase Dashboard** :
   - Allez dans **Table Editor**
   - Cliquez sur **"New table"**

2. **Nom de la table** : `codes_invitation`

3. **Ajoutez les colonnes suivantes** :
   - `id` : Type `uuid`, Primary key, Default: `uuid_generate_v4()`
   - `user_id` : Type `uuid`, Not null
   - `code` : Type `text`, Unique, Not null
   - `lien_invitation` : Type `text`, Not null
   - `nombre_invites` : Type `int4`, Default: `0`
   - `nombre_conversions` : Type `int4`, Default: `0`
   - `created_at` : Type `timestamptz`, Default: `now()`
   - `updated_at` : Type `timestamptz`, Default: `now()`

4. **Cliquez sur "Save"**

5. **Activer RLS** :
   - Allez dans **Authentication** → **Policies**
   - Sélectionnez la table `codes_invitation`
   - Cliquez sur **"Enable RLS"**

6. **Créer les politiques RLS** (voir section ci-dessous)

### ✅ SOLUTION 3 : Vérification des permissions

Si vous obtenez des erreurs de permissions :

1. **Vérifiez que vous êtes administrateur** :
   - Dans Supabase Dashboard, vérifiez votre rôle
   - Vous devez avoir les droits d'administration

2. **Vérifiez la connexion** :
   - Assurez-vous d'être bien connecté à Supabase
   - Vérifiez que vous êtes dans le bon projet

3. **Vérifiez les logs** :
   - Dans SQL Editor, regardez les messages d'erreur
   - Copiez les messages d'erreur pour diagnostic

## Création manuelle des politiques RLS

Si vous créez la table manuellement, vous devez créer ces politiques :

### 1. Politique SELECT
```sql
CREATE POLICY "Users can view their own invitation codes" ON codes_invitation
    FOR SELECT 
    USING (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM profils 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'mentor')
        )
    );
```

### 2. Politique INSERT
```sql
CREATE POLICY "Users can insert their own invitation codes" ON codes_invitation
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND user_id = auth.uid()
    );
```

### 3. Politique UPDATE
```sql
CREATE POLICY "Users can update their own invitation codes" ON codes_invitation
    FOR UPDATE 
    USING (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM profils 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    )
    WITH CHECK (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM profils 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );
```

### 4. Politique DELETE
```sql
CREATE POLICY "Users can delete their own invitation codes" ON codes_invitation
    FOR DELETE 
    USING (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM profils 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );
```

## Vérification après création

Après avoir créé la table, vérifiez :

1. **Dans Table Editor** :
   - La table `codes_invitation` apparaît dans la liste
   - Toutes les colonnes sont présentes (surtout `lien_invitation`)

2. **Dans Authentication → Policies** :
   - 4 politiques existent pour `codes_invitation`
   - RLS est activé

3. **Dans l'application** :
   - Rafraîchissez la page (`Ctrl+Shift+R` ou `Cmd+Shift+R`)
   - Le message d'erreur devrait disparaître
   - Vous pouvez accéder à l'onglet "Parrainage"

## Diagnostic des erreurs courantes

### Erreur : "permission denied"
**Cause** : Vous n'avez pas les droits d'administration
**Solution** : Connectez-vous avec un compte administrateur

### Erreur : "relation profils does not exist"
**Cause** : La table `profils` n'existe pas
**Solution** : Exécutez d'abord la migration `001_objectif1_evangelisation_tables.sql`

### Erreur : "duplicate key value"
**Cause** : La table existe déjà mais avec une structure différente
**Solution** : Utilisez la migration `008_verification_et_creation_codes_invitation.sql` qui gère ce cas

### La table n'apparaît toujours pas
**Vérifications** :
1. Êtes-vous dans le bon projet Supabase ?
2. Avez-vous rafraîchi la page Table Editor ?
3. Y a-t-il des messages d'erreur dans SQL Editor ?
4. La migration s'est-elle exécutée sans erreur ?

## Support supplémentaire

Si le problème persiste :
1. **Copiez les messages d'erreur** de SQL Editor
2. **Vérifiez les logs** dans Supabase Dashboard
3. **Vérifiez que toutes les migrations précédentes** ont été exécutées
4. **Testez avec un compte administrateur** différent

## Fichiers de migration disponibles

- `007_create_codes_invitation_complete.sql` : Migration complète
- `008_verification_et_creation_codes_invitation.sql` : **RECOMMANDÉ** - Version simplifiée et robuste
- `006_fix_codes_invitation_lien.sql` : Pour ajouter seulement la colonne `lien_invitation`



