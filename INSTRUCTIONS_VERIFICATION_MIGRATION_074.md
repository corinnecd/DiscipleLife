# 🔍 Instructions de Vérification - Migration 074

## Vérifier si la migration `074_add_pasteur_id_to_reports.sql` a été exécutée

### Méthode 1 : Script de vérification SQL

1. **Ouvrez le script de vérification** : `sql/migrations/074_verify_pasteur_id_column.sql`
2. **Exécutez-le dans votre interface Supabase** (SQL Editor)
3. **Vérifiez les résultats** :
   - ✅ Si la colonne existe : "La colonne pasteur_id EXISTE"
   - ❌ Si la colonne n'existe pas : "La colonne pasteur_id N'EXISTE PAS"

### Méthode 2 : Vérification manuelle dans Supabase

1. **Connectez-vous à Supabase Dashboard**
2. **Allez dans Table Editor**
3. **Sélectionnez la table `reports`**
4. **Vérifiez les colonnes** :
   - Si vous voyez une colonne `pasteur_id` de type `uuid`, la migration a été exécutée ✅
   - Si la colonne n'existe pas, la migration n'a pas été exécutée ❌

### Méthode 3 : Exécuter la migration (si elle n'a pas été exécutée)

Si la colonne n'existe pas, exécutez la migration :

1. **Ouvrez** `sql/migrations/074_add_pasteur_id_to_reports.sql`
2. **Copiez tout le contenu**
3. **Collez dans le SQL Editor de Supabase**
4. **Exécutez la requête**

⚠️ **Note** : La migration est **idempotente** (sécurisée), elle peut être exécutée plusieurs fois sans problème. Elle vérifie automatiquement si la colonne existe avant de l'ajouter.

### Vérification rapide via requête SQL

Exécutez cette requête simple dans Supabase SQL Editor :

```sql
-- Vérifier si la colonne pasteur_id existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'reports' 
AND column_name = 'pasteur_id';
```

**Résultat attendu si la migration a été exécutée :**
```
column_name | data_type | is_nullable
------------|-----------|-------------
pasteur_id  | uuid      | YES
```

**Résultat si la migration n'a pas été exécutée :**
```
(0 rows)
```

---

## 🚀 Exécution de la migration

Si la colonne n'existe pas, suivez ces étapes :

1. **Ouvrez Supabase Dashboard**
2. **Allez dans SQL Editor**
3. **Ouvrez le fichier** `sql/migrations/074_add_pasteur_id_to_reports.sql`
4. **Copiez-collez le contenu dans l'éditeur SQL**
5. **Cliquez sur "Run"**

La migration va :
- ✅ Vérifier si la colonne existe
- ✅ Ajouter la colonne `pasteur_id` si elle n'existe pas
- ✅ Créer l'index `idx_reports_pasteur_id`
- ✅ Ajouter un commentaire de documentation

---

## ✅ Après l'exécution

Une fois la migration exécutée, vous pouvez vérifier que tout fonctionne :

1. **Envoyer un rapport** depuis un compte superviseur
2. **Vérifier dans la base de données** que le champ `pasteur_id` est rempli
3. **Vérifier dans AdminReportsView** que les rapports sont filtrés par pasteur

---

**Dernière mise à jour** : Après création de la migration 074
