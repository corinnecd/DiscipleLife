# 📋 Instructions pour exécuter les migrations des pasteurs

## 🎯 Objectif

Configurer les 4 pasteurs de tutelle et lier les 26 superviseurs à leurs pasteurs respectifs.

## ✅ Prérequis

1. **Les comptes Auth des pasteurs sont créés** (via `node scripts/create_pasteurs.js`)
   - ✅ DR MODE (dr.mode@disciplelife.com)
   - ✅ PS JULIANA (ps.juliana@disciplelife.com)
   - ✅ PS PEGGY NN (ps.peggy.nn@disciplelife.com)
   - ✅ PS JESSY (ps.jessy@disciplelife.com)

## 📝 Ordre d'exécution des migrations SQL

### Option 1 : Migration complète (recommandée)

Exécutez **UNE SEULE** migration qui fait tout :

```sql
-- Fichier: sql/migrations/049_complete_pasteurs_setup.sql
```

Cette migration :
- ✅ Ajoute `identifiant_unique` à `profils`
- ✅ Met à jour les 4 profils de pasteurs
- ✅ Ajoute `pasteur_id` à `profils` et `familles_disciples`
- ✅ Lie les 26 superviseurs à leurs pasteurs
- ✅ Lie les familles aux pasteurs

### Option 2 : Migrations séparées (si vous préférez)

1. **Migration 047** : Ajouter identifiant_unique
   ```sql
   -- sql/migrations/047_add_identifiant_unique_to_profils.sql
   ```

2. **Migration 048** : Mettre à jour les profils pasteurs
   ```sql
   -- sql/migrations/048_mettre_a_jour_profils_pasteurs.sql
   ```

3. **Migration 046** : Créer les liaisons superviseurs
   ```sql
   -- sql/migrations/046_creer_pasteurs_et_liaisons.sql
   ```

## 🚀 Exécution dans Supabase

1. Allez sur votre [Dashboard Supabase](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Cliquez sur **SQL Editor** dans la barre latérale
4. Cliquez sur **New query**
5. Copiez-collez le contenu de `049_complete_pasteurs_setup.sql`
6. Cliquez sur **Run** (ou `Cmd+Enter` / `Ctrl+Enter`)

## ✅ Vérification

Après l'exécution, vous devriez voir :

```
✅ 4 pasteurs créés
✅ 26 superviseurs liés
✅ 26 familles liées
```

## 📊 Résultat attendu

### Pasteurs créés :

| Identifiant | Nom | Email | Superviseurs | Familles |
|-------------|-----|-------|--------------|----------|
| PASTEUR-001 | DR MODE | dr.mode@disciplelife.com | 12 | 12 |
| PASTEUR-002 | PS JULIANA | ps.juliana@disciplelife.com | 5 | 5 |
| PASTEUR-003 | PS PEGGY NN | ps.peggy.nn@disciplelife.com | 4 | 4 |
| PASTEUR-004 | PS JESSY | ps.jessy@disciplelife.com | 5 | 5 |

## 🔍 Vérification manuelle

Vous pouvez exécuter cette requête pour vérifier :

```sql
SELECT 
    p.identifiant_unique,
    p.first_name || ' ' || p.last_name AS pasteur,
    COUNT(DISTINCT s.id) AS nb_superviseurs,
    COUNT(DISTINCT f.id) AS nb_familles
FROM profils p
LEFT JOIN profils s ON s.pasteur_id = p.id AND s.role = 'superviseur'
LEFT JOIN familles_disciples f ON f.pasteur_id = p.id
WHERE p.role = 'pasteur' AND p.identifiant_unique LIKE 'PASTEUR-%'
GROUP BY p.id, p.identifiant_unique, p.first_name, p.last_name
ORDER BY p.identifiant_unique;
```

## ⚠️ En cas d'erreur

Si vous obtenez une erreur, vérifiez :
1. Les comptes Auth des pasteurs existent bien
2. Les emails correspondent exactement
3. La table `profils` existe
4. Les superviseurs existent dans `profils`
