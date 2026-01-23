# 📋 INSTRUCTIONS DE CONSOLIDATION DES SOURCES DE DONNÉES

## 🎯 Objectif

Consolider les sources de données pour avoir **UNE SEULE source de vérité** en utilisant `cercle_personnes`.

---

## ⚠️ PRÉCAUTIONS AVANT DE COMMENCER

1. **✅ Backup de la base de données** - CRITIQUE
2. **✅ Tester sur un environnement de développement d'abord**
3. **✅ Vérifier que vous avez les droits d'administration**

---

## 📝 ÉTAPES D'EXÉCUTION

### Étape 1: Assigner les `famille_id` aux profils

**Script:** `sql/migrations/077_assign_famille_id_to_profils.sql`

**Commande:**
```sql
-- Dans Supabase SQL Editor, exécutez:
\i sql/migrations/077_assign_famille_id_to_profils.sql
```

**Ce que fait ce script:**
- Pour chaque famille dans `familles_disciples`:
  - Assigne le `famille_id` au superviseur de la famille
  - Met à jour le champ `updated_at`

**Vérification après exécution:**
```sql
-- Vérifier que les superviseurs ont un famille_id
SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.role,
    p.famille_id,
    f.identifiant_famille
FROM profils p
LEFT JOIN familles_disciples f ON f.id = p.famille_id
WHERE p.role = 'superviseur'
ORDER BY f.identifiant_famille;
```

---

### Étape 2: Créer les entrées dans `cercle_personnes`

**Script:** `sql/migrations/078_create_cercle_personnes_entries.sql`

**Commande:**
```sql
-- Dans Supabase SQL Editor, exécutez:
\i sql/migrations/078_create_cercle_personnes_entries.sql
```

**Ce que fait ce script:**
- Pour chaque famille avec un superviseur:
  - Crée une entrée dans `cercle_personnes` pour le superviseur (mentor)
  - Pour chaque disciple de la famille:
    - Crée une entrée dans `cercle_personnes` avec `user_id = superviseur.id`

**Vérification après exécution:**
```sql
-- Vérifier les entrées créées
SELECT 
    COUNT(*) AS total_entrees,
    COUNT(DISTINCT user_id) AS mentors_uniques
FROM cercle_personnes;
```

---

### Étape 3: Créer les hiérarchies (optionnel)

**Script:** `sql/migrations/079_create_disciple_hierarchies.sql`

**⚠️ NOTE:** Ce script nécessite une logique métier spécifique pour déterminer quels disciples sont parents d'autres disciples. Pour l'instant, il ne fait que préparer la structure.

**Commande:**
```sql
-- Dans Supabase SQL Editor, exécutez:
\i sql/migrations/079_create_disciple_hierarchies.sql
```

---

## ✅ VALIDATION FINALE

Après avoir exécuté toutes les migrations, vérifiez:

```sql
-- 1. Vérifier que les superviseurs ont un famille_id
SELECT 
    COUNT(*) AS superviseurs_avec_famille
FROM profils
WHERE role = 'superviseur' AND famille_id IS NOT NULL;

-- 2. Vérifier les entrées dans cercle_personnes
SELECT 
    COUNT(*) AS total_entrees,
    COUNT(DISTINCT user_id) AS mentors_uniques,
    COUNT(*) FILTER (WHERE circle_type = 'Superviseur') AS superviseurs,
    COUNT(*) FILTER (WHERE circle_type = 'Disciple') AS disciples
FROM cercle_personnes;

-- 3. Vérifier la cohérence
SELECT 
    f.identifiant_famille,
    f.nom,
    COUNT(DISTINCT cp.id) AS entrees_cercle,
    COUNT(DISTINCT p.id) AS profils_famille
FROM familles_disciples f
LEFT JOIN profils p ON p.famille_id = f.id
LEFT JOIN cercle_personnes cp ON cp.user_id = f.superviseur_id
GROUP BY f.id, f.identifiant_famille, f.nom
ORDER BY f.identifiant_famille;
```

---

## 🔄 ROLLBACK (En cas de problème)

Si vous devez annuler les changements:

```sql
-- 1. Supprimer les entrées cercle_personnes créées
DELETE FROM cercle_personnes WHERE created_at >= '2025-01-XX'; -- Remplacer par la date d'exécution

-- 2. Réinitialiser les famille_id
UPDATE profils SET famille_id = NULL WHERE updated_at >= '2025-01-XX'; -- Remplacer par la date d'exécution
```

---

## 📊 RÉSULTAT ATTENDU

Après consolidation:
- ✅ Tous les superviseurs ont un `famille_id`
- ✅ Des entrées existent dans `cercle_personnes` pour chaque relation disciple-mentor
- ✅ `cercle_personnes` devient la source de vérité unique
- ✅ Les familles restent pour l'organisation mais les relations sont dans `cercle_personnes`

---

## ⚠️ PROBLÈMES POTENTIELS

1. **Disciples sans famille:** Les disciples qui n'ont pas de `famille_id` ne seront pas migrés
   - **Solution:** Les assigner manuellement à une famille ou créer une famille par défaut

2. **Familles sans superviseur:** Les familles sans `superviseur_id` seront ignorées
   - **Solution:** Assigner un superviseur ou les traiter manuellement

3. **Doublons:** Si des entrées existent déjà dans `cercle_personnes`
   - **Solution:** Le script vérifie l'existence avant de créer

---

**Statut:** Instructions prêtes - À exécuter dans l'ordre
