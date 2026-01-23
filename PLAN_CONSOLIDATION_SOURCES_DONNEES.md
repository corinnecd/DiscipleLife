# 📋 PLAN DE CONSOLIDATION DES SOURCES DE DONNÉES

**Date:** 2025-01-XX  
**Objectif:** Consolider les sources de données pour avoir UNE SEULE source de vérité

---

## 🎯 OBJECTIF

Créer une source de vérité unique pour les relations disciple-mentor en utilisant **`cercle_personnes`** comme table principale.

---

## 📊 ÉTAT ACTUEL

### Problèmes identifiés:
1. ❌ `cercle_personnes` est vide (0 entrées)
2. ⚠️ `familles_disciples` a 26 familles mais elles ne sont pas liées aux profils
3. ❌ Les profils n'ont pas de `famille_id` assigné (0 profils avec `famille_id`)
4. ⚠️ Deux sources de données coexistent sans synchronisation

---

## 🔄 STRATÉGIE DE CONSOLIDATION

### Étape 1: Assigner les `famille_id` aux profils

**Objectif:** Lier les profils existants aux familles appropriées.

**Méthode:**
- Pour chaque superviseur, trouver ses familles dans `familles_disciples`
- Assigner le `famille_id` correspondant aux profils des superviseurs
- Pour les disciples, les assigner à la famille de leur superviseur

### Étape 2: Créer les entrées dans `cercle_personnes`

**Objectif:** Créer les relations disciple-mentor dans `cercle_personnes`.

**Méthode:**
- Pour chaque superviseur avec des familles:
  - Créer une entrée dans `cercle_personnes` pour le superviseur (mentor)
  - Pour chaque disciple de sa famille:
    - Créer une entrée dans `cercle_personnes` avec `user_id = superviseur.id`

### Étape 3: Gérer les hiérarchies (disciples de disciples)

**Objectif:** Créer les relations `parent_disciple_id` pour les hiérarchies.

**Méthode:**
- Identifier les disciples qui ont d'autres disciples dans leur famille
- Créer les relations via `parent_disciple_id`

---

## 📝 SCRIPTS DE MIGRATION

### Script 1: Assignation des `famille_id`

**Fichier:** `sql/migrations/077_assign_famille_id_to_profils.sql`

**Actions:**
1. Pour chaque famille dans `familles_disciples`:
   - Assigner `famille_id` au superviseur de la famille
   - Assigner `famille_id` à tous les disciples de cette famille (si identifiables)

### Script 2: Création des entrées `cercle_personnes`

**Fichier:** `sql/migrations/078_create_cercle_personnes_entries.sql`

**Actions:**
1. Pour chaque superviseur avec `famille_id`:
   - Créer une entrée dans `cercle_personnes` (si n'existe pas)
2. Pour chaque disciple avec `famille_id`:
   - Créer une entrée dans `cercle_personnes` avec `user_id = superviseur.id`

### Script 3: Création des hiérarchies

**Fichier:** `sql/migrations/079_create_disciple_hierarchies.sql`

**Actions:**
1. Identifier les disciples qui ont d'autres disciples
2. Créer les relations `parent_disciple_id`

---

## ⚠️ PRÉCAUTIONS

1. **Backup:** Créer un backup de la base avant migration
2. **Tests:** Tester sur un environnement de développement d'abord
3. **Validation:** Vérifier après chaque étape
4. **Rollback:** Prévoir un script de rollback

---

## ✅ VALIDATION

Après consolidation, vérifier:
- ✅ Tous les superviseurs ont un `famille_id`
- ✅ Tous les disciples ont un `famille_id`
- ✅ Des entrées existent dans `cercle_personnes` pour chaque relation
- ✅ Les hiérarchies sont correctement créées

---

## 🚀 ORDRE D'EXÉCUTION

1. **Étape 1:** Exécuter `077_assign_famille_id_to_profils.sql`
2. **Étape 2:** Vérifier les `famille_id` assignés
3. **Étape 3:** Exécuter `078_create_cercle_personnes_entries.sql`
4. **Étape 4:** Vérifier les entrées dans `cercle_personnes`
5. **Étape 5:** Exécuter `079_create_disciple_hierarchies.sql`
6. **Étape 6:** Validation finale

---

**Statut:** Plan créé - Prêt pour implémentation
