# 📋 PLAN DE MIGRATION : "mentor" → "Mentor_pillier"

**Date:** 2025-01-XX  
**Objectif:** Modifier toutes les occurrences de "mentor" en "Mentor_pillier" dans la base de données et le code

---

## 🎯 OBJECTIF

Remplacer toutes les occurrences de `role = 'mentor'` par `role = 'Mentor_pillier'` dans :
1. La base de données (`profils` table)
2. Le code frontend (31+ fichiers JavaScript/JSX)
3. Les scripts SQL de migration

---

## 📊 ANALYSE PRÉLIMINAIRE

### Base de données
- **Table concernée:** `profils`
- **Colonne concernée:** `role`
- **Occurrences actuelles:** À vérifier (probablement 0 actuellement)

### Code frontend
- **Fichiers concernés:** 83+ fichiers trouvés avec grep
- **Types de modifications nécessaires:**
  - `role === 'mentor'` → `role === 'Mentor_pillier'`
  - `role = 'mentor'` → `role = 'Mentor_pillier'`
  - `role.eq('mentor')` → `role.eq('Mentor_pillier')`
  - `'mentor'` dans les tableaux/objets → `'Mentor_pillier'`
  - Routes `/space/mentor` → `/space/Mentor_pillier` (ou garder la route mais vérifier le rôle)

---

## 🔄 STRATÉGIE DE MIGRATION

### Phase 1: Analyse et préparation
1. ✅ Identifier toutes les occurrences dans la base de données
2. ✅ Identifier toutes les occurrences dans le code
3. ✅ Créer un script de migration SQL
4. ✅ Créer un plan de modification du code

### Phase 2: Migration base de données
1. Créer un backup
2. Exécuter le script SQL de migration
3. Vérifier les résultats

### Phase 3: Migration code frontend
1. Modifier les fichiers un par un
2. Tester après chaque modification importante
3. Vérifier que l'application fonctionne toujours

### Phase 4: Tests et validation
1. Tester toutes les routes protégées
2. Tester les dashboards
3. Tester la création de disciples
4. Vérifier l'affichage des rôles

---

## ⚠️ RISQUES IDENTIFIÉS

### Risques CRITIQUES
- ❌ Routes protégées ne fonctionneront plus si `role === 'mentor'` n'est pas remplacé
- ❌ Dashboards mentors ne s'afficheront plus
- ❌ Navigation `/space/mentor` ne fonctionnera plus

### Risques MOYENS
- ⚠️ Affichage des rôles dans l'interface (labels)
- ⚠️ Filtres et recherches par rôle

### Risques FAIBLES
- ℹ️ Commentaires et messages d'erreur
- ℹ️ Documentation

---

## 📝 SCRIPTS À CRÉER

1. **`sql/migrations/080_migrate_mentor_to_mentor_pillier.sql`**
   - Script SQL pour modifier la base de données

2. **`scripts/analyse_mentor_occurrences.js`**
   - Script pour analyser toutes les occurrences dans le code

3. **`scripts/verify_mentor_migration.js`**
   - Script pour vérifier la migration

---

## ✅ VALIDATION

Après migration, vérifier:
- ✅ Aucun profil avec `role = 'mentor'` dans la base
- ✅ Toutes les routes protégées fonctionnent
- ✅ Les dashboards s'affichent correctement
- ✅ La création de disciples fonctionne
- ✅ L'affichage des rôles est correct

---

**Statut:** Plan créé - Prêt pour implémentation
