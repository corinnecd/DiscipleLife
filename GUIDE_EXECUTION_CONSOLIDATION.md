# 📋 GUIDE D'EXÉCUTION DE LA CONSOLIDATION DES SOURCES DE DONNÉES

## ⚠️ IMPORTANT

Les scripts de migration doivent être exécutés **directement dans l'éditeur SQL de Supabase** car les RLS (Row Level Security) bloquent les mises à jour via l'API avec la clé anon.

---

## 🚀 ÉTAPE 1: Assigner les `famille_id` aux profils

### Instructions:

1. **Ouvrez Supabase Dashboard**
   - Allez sur https://supabase.com/dashboard
   - Sélectionnez votre projet

2. **Ouvrez l'éditeur SQL**
   - Cliquez sur "SQL Editor" dans le menu de gauche
   - Cliquez sur "New query"

3. **Copiez-collez le script SQL**
   - Ouvrez le fichier: `sql/migrations/077_assign_famille_id_to_profils.sql`
   - Copiez tout le contenu
   - Collez-le dans l'éditeur SQL de Supabase

4. **Exécutez le script**
   - Cliquez sur "Run" ou appuyez sur `Ctrl+Enter` (ou `Cmd+Enter` sur Mac)
   - Attendez la fin de l'exécution

5. **Vérifiez les résultats**
   - Le script affichera les profils mis à jour
   - Vérifiez les statistiques à la fin

### Résultat attendu:
- ✅ 26 superviseurs devraient avoir un `famille_id` assigné
- ✅ Chaque famille devrait avoir son superviseur lié

---

## 🚀 ÉTAPE 2: Créer les entrées dans `cercle_personnes`

### Instructions:

1. **Dans l'éditeur SQL de Supabase**
   - Créez une nouvelle requête

2. **Copiez-collez le script SQL**
   - Ouvrez le fichier: `sql/migrations/078_create_cercle_personnes_entries.sql`
   - Copiez tout le contenu
   - Collez-le dans l'éditeur SQL

3. **Exécutez le script**
   - Cliquez sur "Run"

4. **Vérifiez les résultats**
   - Le script affichera les entrées créées
   - Vérifiez les statistiques

### Résultat attendu:
- ✅ Des entrées devraient être créées dans `cercle_personnes`
- ✅ Chaque superviseur devrait avoir une entrée
- ✅ Chaque disciple devrait avoir une entrée liée à son superviseur

---

## 🚀 ÉTAPE 3: Créer les hiérarchies (optionnel)

### Instructions:

1. **Dans l'éditeur SQL de Supabase**
   - Créez une nouvelle requête

2. **Copiez-collez le script SQL**
   - Ouvrez le fichier: `sql/migrations/079_create_disciple_hierarchies.sql`
   - Copiez tout le contenu
   - Collez-le dans l'éditeur SQL

3. **Exécutez le script**
   - Cliquez sur "Run"

### Note:
Ce script prépare la structure mais ne crée pas automatiquement les hiérarchies. Les hiérarchies nécessitent une logique métier spécifique.

---

## ✅ VALIDATION FINALE

Après avoir exécuté toutes les migrations, exécutez cette requête de validation:

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

**Note:** Les scripts SQL s'exécutent avec les permissions du service role, ce qui permet de contourner les restrictions RLS.
