# 🚀 Instructions d'Exécution - Migration 074

## ⚠️ IMPORTANT : La colonne `pasteur_id` n'existe pas encore

L'erreur SQL confirme que la migration `074_add_pasteur_id_to_reports.sql` **n'a pas été exécutée**.

## 📋 Étapes pour exécuter la migration

### Étape 1 : Ouvrir Supabase Dashboard

1. Connectez-vous à votre projet Supabase
2. Allez dans **SQL Editor** (dans le menu de gauche)

### Étape 2 : Exécuter la migration

1. **Ouvrez le fichier** : `sql/migrations/074_add_pasteur_id_to_reports.sql`
2. **Copiez tout le contenu** du fichier
3. **Collez dans le SQL Editor** de Supabase
4. **Cliquez sur "Run"** ou appuyez sur `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

### Étape 3 : Vérifier le succès

Vous devriez voir un message de succès. Ensuite, exécutez cette requête pour vérifier :

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'reports' 
AND column_name = 'pasteur_id';
```

**Résultat attendu :**
```
column_name | data_type | is_nullable
------------|-----------|-------------
pasteur_id  | uuid      | YES
```

## ✅ Contenu de la migration

La migration fait ceci :

1. ✅ Vérifie si la colonne existe déjà (sécurisé, peut être exécuté plusieurs fois)
2. ✅ Ajoute la colonne `pasteur_id` de type `UUID` à la table `reports`
3. ✅ Crée une référence (foreign key) vers la table `profils(id)`
4. ✅ Crée un index `idx_reports_pasteur_id` pour améliorer les performances
5. ✅ Ajoute un commentaire de documentation

## 🔍 Après l'exécution

Une fois la migration exécutée :

1. ✅ Les nouveaux rapports auront automatiquement le `pasteur_id` rempli
2. ✅ Les rapports existants auront `pasteur_id = NULL` (normal)
3. ✅ Le filtrage par pasteur dans `AdminReportsView` fonctionnera
4. ✅ Les notifications pour le pasteur seront créées

## ⚠️ Note importante

- La migration est **idempotente** : vous pouvez l'exécuter plusieurs fois sans problème
- Elle ne modifie **pas** les données existantes
- Elle ne supprime **rien**
- Elle est **100% sécurisée**

---

**Besoin d'aide ?** Si vous rencontrez une erreur lors de l'exécution, copiez le message d'erreur complet et je vous aiderai à le résoudre.
