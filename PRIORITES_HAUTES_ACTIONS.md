# Priorités Hautes - Actions à Effectuer

## ✅ Corrections Effectuées

### 1. Correction du comptage des disciples dans le Dashboard Pasteur
**Fichier modifié:** `src/pages/dashboards/PasteurDashboard.jsx`

**Problème identifié:**
- Le code comptait `total_disciples = superviseurs + disciples` au lieu de compter uniquement les disciples
- Cela faisait que les KPI affichaient un nombre incorrect

**Correction appliquée:**
- Ligne 1012: Changé `total_disciples: totalMembres` en `total_disciples: totalDisciples`
- Les superviseurs ne sont plus comptés dans le total des disciples

**Amélioration de la logique:**
- Ajout d'une stratégie multi-méthodes pour compter les disciples:
  1. Méthode 1: Requête directe sur `cercle_personnes`
  2. Méthode 2: Fonction RPC `get_disciples_by_superviseurs` (fallback)
- Meilleure gestion des erreurs et logging

---

## 📋 Actions à Effectuer (Par Ordre de Priorité)

### ÉTAPE 1: Diagnostiquer la structure des données

**Script à exécuter:** `sql/diagnostics/diagnostic_structure_cercle_personnes.sql`

**Où l'exécuter:** Supabase SQL Editor

**Objectif:** Comprendre comment les disciples sont liés aux superviseurs dans `cercle_personnes`

**Ce que vous verrez:**
- Vue d'ensemble de la table `cercle_personnes`
- Relations via `user_id` (superviseur → disciple)
- Relations via `parent_disciple_id` (disciple → disciple)
- Comparaison des méthodes de comptage

**Action après exécution:**
- Analyser les résultats
- Identifier les incohérences
- Noter le nombre de disciples par pasteur selon chaque méthode

---

### ÉTAPE 2: Vérifier la consolidation des données

**Script à exécuter:** `sql/diagnostics/verifier_consolidation_donnees.sql`

**Où l'exécuter:** Supabase SQL Editor

**Objectif:** Vérifier la cohérence entre `cercle_personnes`, `familles_disciples` et `profils`

**Ce que vous verrez:**
- Superviseurs sans `famille_id` dans `profils`
- Superviseurs sans famille dans `familles_disciples`
- Disciples sans entrée dans `cercle_personnes`
- Comparaison des comptages par méthode
- Incohérences à corriger

**Action après exécution:**
- Identifier les données manquantes
- Noter les incohérences
- Préparer les corrections nécessaires

---

### ÉTAPE 3: Tester la promotion automatique

**Script à exécuter:** `sql/diagnostics/test_promotion_automatique.sql`

**Où l'exécuter:** Supabase SQL Editor

**Objectif:** Vérifier que le trigger de promotion automatique fonctionne

**Ce que vous verrez:**
- Disciples qui devraient être promus (ont des disciples mais sont encore "disciple")
- État du trigger et de la fonction
- Simulation de ce qui se passerait lors d'une promotion
- Promotions récentes (si le trigger a fonctionné)

**Action après exécution:**
- Vérifier que le trigger est actif
- Identifier les disciples à promouvoir manuellement si nécessaire
- Tester la promotion en créant une nouvelle relation (optionnel)

---

## 🔧 Corrections Supplémentaires Nécessaires

### Si les diagnostics révèlent des problèmes:

#### A. Si `cercle_personnes` est incomplet:
- Exécuter à nouveau: `sql/migrations/078_create_cercle_personnes_entries.sql`
- Vérifier que tous les disciples ont une entrée

#### B. Si des superviseurs n'ont pas de `famille_id`:
- Exécuter à nouveau: `sql/migrations/077_assign_famille_id_to_profils.sql`
- Vérifier que tous les superviseurs ont un `famille_id`

#### C. Si le trigger de promotion ne fonctionne pas:
- Vérifier que la fonction existe: `sql/migrations/076_trigger_auto_promote_disciple_to_mentor.sql`
- Vérifier les permissions RLS sur `cercle_personnes`

---

## 📊 Résultats Attendus

### Après toutes les corrections:

1. **Dashboard Pasteur:**
   - Les KPI affichent le bon nombre de disciples (sans compter les superviseurs)
   - Le comptage utilise la meilleure méthode disponible
   - Les logs montrent quelle méthode a été utilisée

2. **Consolidation des données:**
   - Tous les superviseurs ont un `famille_id` dans `profils`
   - Tous les superviseurs ont une famille dans `familles_disciples`
   - Tous les disciples ont une entrée dans `cercle_personnes`

3. **Promotion automatique:**
   - Le trigger est actif et fonctionne
   - Les disciples qui obtiennent des disciples sont automatiquement promus
   - Aucun disciple avec des disciples n'est resté au statut "disciple"

---

## 🚨 Points d'Attention

1. **RLS (Row Level Security):**
   - Les requêtes directes peuvent être bloquées par RLS
   - La fonction RPC `get_disciples_by_superviseurs` utilise `SECURITY DEFINER` pour contourner RLS
   - Vérifier que la fonction RPC est accessible

2. **Performance:**
   - Les requêtes peuvent être lentes avec beaucoup de données
   - Le cache est utilisé pour optimiser les performances
   - Considérer l'ajout d'index si nécessaire

3. **Cohérence des données:**
   - `cercle_personnes` doit être la source unique de vérité
   - Les autres tables (`profils`, `familles_disciples`) doivent être synchronisées
   - Vérifier régulièrement la cohérence

---

## 📝 Notes Importantes

- Tous les scripts de diagnostic sont en lecture seule (SELECT uniquement)
- Les scripts de migration modifient les données (faire un backup avant)
- Les logs dans la console du navigateur montrent le détail du comptage
- En cas de problème, vérifier d'abord les logs dans la console

---

## ✅ Checklist de Vérification

- [ ] Script `diagnostic_structure_cercle_personnes.sql` exécuté
- [ ] Script `verifier_consolidation_donnees.sql` exécuté
- [ ] Script `test_promotion_automatique.sql` exécuté
- [ ] Dashboard Pasteur affiche les bons nombres
- [ ] Tous les superviseurs ont un `famille_id`
- [ ] Tous les disciples ont une entrée dans `cercle_personnes`
- [ ] Le trigger de promotion fonctionne
- [ ] Aucune erreur dans la console du navigateur

---

**Date de création:** 2025-01-XX
**Dernière mise à jour:** 2025-01-XX
