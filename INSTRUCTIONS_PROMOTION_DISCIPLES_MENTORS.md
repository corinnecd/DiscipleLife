# Instructions : Promotion des Disciples au Statut de Mentor

## 📋 Description

Cette migration identifie automatiquement tous les disciples (hors pasteurs et superviseurs) qui ont des disciples et met à jour leur statut de `'disciple'` à `'mentor'`.

## 🎯 Objectif

Selon la logique métier : **"Quand un disciple a des disciples, il doit changer de statut et devenir mentor."**

## ⚠️ IMPORTANT : Méthode Recommandée

**Utilisez le script Node.js** (`scripts/promote_disciples_to_mentors.js`) qui est plus sûr et ne causera pas de lenteur.

## 📁 Fichiers

1. **`075_verify_disciples_with_disciples.sql`** - Script de vérification (à exécuter AVANT)
2. **`075_promote_disciples_to_mentors.sql`** - Script de migration (à exécuter APRÈS vérification)
3. **`076_trigger_auto_promote_disciple_to_mentor.sql`** - Trigger automatique (à exécuter APRÈS la migration)

## 🚀 Méthode 1 : Script Node.js (RECOMMANDÉ - Plus sûr)

### Étape 1 : Exécuter le script de diagnostic et promotion

```bash
node scripts/promote_disciples_to_mentors.js
```

Ce script :
- ✅ Fait un diagnostic complet avant toute modification
- ✅ Affiche la liste des disciples à promouvoir
- ✅ Attend 5 secondes pour confirmation
- ✅ Met à jour les rôles un par un avec gestion d'erreurs
- ✅ Affiche un rapport détaillé

**Avantages :**
- Pas de risque de casser le site
- Pas de lenteur (mises à jour séquentielles)
- Gestion d'erreurs robuste
- Rapport détaillé

---

## 📊 Méthode 2 : Scripts SQL (Alternative)

### Étape 1 : Vérification

Avant d'exécuter la migration, vérifiez combien de disciples seront affectés :

```sql
-- Exécuter le script de vérification SÉCURISÉ (ne modifie rien)
\i sql/migrations/075_test_promotion_safe.sql
```

Ce script affichera :
- La liste des disciples qui seront promus
- Le nombre de disciples qu'ils gèrent chacun
- Le total de disciples à promouvoir

## ⚙️ Étape 2 : Exécution de la Migration

Une fois la vérification effectuée, exécutez la migration :

```sql
-- Exécuter le script de migration
\i sql/migrations/075_promote_disciples_to_mentors.sql
```

## 🔄 Étape 3 : Installation du Trigger Automatique

Pour que la promotion se fasse automatiquement à l'avenir, installez le trigger :

```sql
-- Exécuter le script du trigger
\i sql/migrations/076_trigger_auto_promote_disciple_to_mentor.sql
```

Ce trigger promouvra automatiquement un disciple en mentor dès qu'il obtient son premier disciple dans `cercle_personnes`.

## 📊 Critères de Sélection

La migration identifie les profils qui :
- ✅ Ont `role = 'disciple'` dans la table `profils`
- ✅ Ont au moins un disciple dans `cercle_personnes` (où `user_id = profils.id`)
- ✅ Ne sont **PAS** pasteurs, superviseurs, admins ou super_admins

## 🔄 Résultat Attendu

Après l'exécution :
- Les disciples concernés auront `role = 'mentor'`
- Le champ `updated_at` sera mis à jour
- Un message de confirmation affichera le nombre de profils mis à jour

## ⚠️ Important

- Cette migration est **idempotente** : elle peut être exécutée plusieurs fois sans problème
- Seuls les profils avec `role = 'disciple'` seront mis à jour
- Les pasteurs et superviseurs sont **exclus** de cette promotion automatique

## 🧪 Vérification Post-Migration

Pour vérifier que la migration a bien fonctionné :

```sql
-- Voir tous les mentors (anciens disciples promus)
SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.role,
    COUNT(cp.id) AS nombre_disciples
FROM profils p
INNER JOIN cercle_personnes cp ON cp.user_id = p.id
WHERE p.role = 'mentor'
  AND p.role NOT IN ('pasteur', 'superviseur', 'admin', 'super_admin')
GROUP BY p.id, p.first_name, p.last_name, p.email, p.role
ORDER BY nombre_disciples DESC;
```
