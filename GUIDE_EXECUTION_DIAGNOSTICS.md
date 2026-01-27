# Guide d'Exécution des Scripts de Diagnostic

## 📋 Prérequis

1. Accéder à votre projet Supabase
2. Ouvrir le **SQL Editor** dans le tableau de bord Supabase
3. Avoir les permissions nécessaires pour exécuter des requêtes SELECT

---

## 🔄 Ordre d'Exécution Recommandé

### ÉTAPE 1 : Diagnostic de la Structure des Données

**Script:** `sql/diagnostics/diagnostic_structure_cercle_personnes.sql`

**Objectif:** Comprendre comment les disciples sont liés aux superviseurs dans `cercle_personnes`

**Instructions:**
1. Ouvrir le fichier `sql/diagnostics/diagnostic_structure_cercle_personnes.sql`
2. Copier tout le contenu
3. Coller dans le SQL Editor de Supabase
4. Cliquer sur **"Run"** ou appuyer sur `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
5. Analyser les résultats de chaque section

**Résultats attendus:**
- Vue d'ensemble de la table `cercle_personnes`
- Relations via `user_id` (superviseur → disciple)
- Relations via `parent_disciple_id` (disciple → disciple)
- Comparaison des méthodes de comptage par pasteur

**Temps estimé:** 2-3 minutes

---

### ÉTAPE 2 : Vérification de la Consolidation des Données

**Script:** `sql/diagnostics/verifier_consolidation_donnees.sql`

**Objectif:** Vérifier la cohérence entre `cercle_personnes`, `familles_disciples` et `profils`

**Instructions:**
1. Ouvrir le fichier `sql/diagnostics/verifier_consolidation_donnees.sql`
2. Copier tout le contenu
3. Coller dans le SQL Editor de Supabase
4. Cliquer sur **"Run"**
5. Analyser les incohérences identifiées

**Résultats attendus:**
- Superviseurs sans `famille_id` dans `profils`
- Superviseurs sans famille dans `familles_disciples`
- Disciples sans entrée dans `cercle_personnes`
- Comparaison des comptages par méthode
- Liste des incohérences à corriger

**Temps estimé:** 2-3 minutes

---

### ÉTAPE 3 : Test de la Promotion Automatique

**Script:** `sql/diagnostics/test_promotion_automatique.sql`

**Objectif:** Vérifier que le trigger de promotion automatique fonctionne

**Instructions:**
1. Ouvrir le fichier `sql/diagnostics/test_promotion_automatique.sql`
2. Copier tout le contenu
3. Coller dans le SQL Editor de Supabase
4. Cliquer sur **"Run"**
5. Analyser les résultats

**Résultats attendus:**
- Disciples qui devraient être promus (ont des disciples mais sont encore "disciple")
- État du trigger et de la fonction
- Simulation de ce qui se passerait lors d'une promotion
- Promotions récentes (si le trigger a fonctionné)

**Temps estimé:** 1-2 minutes

---

## 📊 Interprétation des Résultats

### Section 1 : Vue d'ensemble cercle_personnes
- **total_entrees** : Nombre total d'entrées dans `cercle_personnes`
- **nb_user_ids_uniques** : Nombre de superviseurs uniques
- **nb_parent_disciple_ids_uniques** : Nombre de parents disciples uniques
- **avec_user_id** : Entrées avec un superviseur (user_id)
- **avec_parent_disciple_id** : Entrées avec un parent disciple
- **avec_les_deux** : Entrées avec les deux types de relations

### Section 2 : Relations user_id
- Liste des superviseurs et le nombre de leurs disciples directs
- Permet d'identifier les superviseurs les plus actifs

### Section 3 : Relations parent_disciple_id
- Liste des disciples qui ont d'autres disciples sous leur responsabilité
- Permet d'identifier les hiérarchies multi-niveaux

### Section 4 : Superviseurs et leurs disciples
- Vue consolidée par superviseur
- Montre les disciples directs et indirects

### Section 5-6 : Comptage par pasteur
- **Méthode 1** : Via `cercle_personnes.user_id`
- **Méthode 2** : Via `profils.famille_id`
- Comparaison des deux méthodes pour identifier les écarts

### Section 7 : Comparaison des méthodes
- **difference** : Écart entre les deux méthodes
- **statut** : Indique si les méthodes sont cohérentes

---

## ⚠️ Points d'Attention

1. **RLS (Row Level Security):**
   - Certaines requêtes peuvent être limitées par RLS
   - Si vous obtenez 0 résultats, vérifiez les politiques RLS

2. **Performance:**
   - Les requêtes peuvent prendre quelques secondes avec beaucoup de données
   - Si une requête prend trop de temps, arrêtez-la et contactez le support

3. **Données sensibles:**
   - Les scripts n'affichent que des données agrégées ou des IDs
   - Aucune donnée personnelle sensible n'est exposée

---

## 🔧 Actions Correctives (Si Nécessaire)

### Si des superviseurs n'ont pas de `famille_id`:
```sql
-- Exécuter: sql/migrations/077_assign_famille_id_to_profils.sql
```

### Si `cercle_personnes` est incomplet:
```sql
-- Exécuter: sql/migrations/078_create_cercle_personnes_entries.sql
```

### Si le trigger de promotion ne fonctionne pas:
```sql
-- Exécuter: sql/migrations/076_trigger_auto_promote_disciple_to_mentor.sql
```

---

## 📝 Notes Importantes

- Tous les scripts sont en **lecture seule** (SELECT uniquement)
- Aucune modification de données n'est effectuée
- Vous pouvez exécuter les scripts plusieurs fois sans risque
- Les résultats peuvent varier selon l'état actuel de la base de données

---

## ✅ Checklist de Vérification

Après avoir exécuté tous les scripts, vérifiez:

- [ ] Script 1 exécuté sans erreur
- [ ] Script 2 exécuté sans erreur
- [ ] Script 3 exécuté sans erreur
- [ ] Résultats analysés et notés
- [ ] Incohérences identifiées
- [ ] Actions correctives planifiées (si nécessaire)

---

**Date de création:** 2025-01-XX
**Dernière mise à jour:** 2025-01-XX
