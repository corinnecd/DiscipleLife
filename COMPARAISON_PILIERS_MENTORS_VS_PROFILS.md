# 📊 COMPARAISON : Table `piliers_mentors` vs Table `profils`

**Date:** 2025-01-XX  
**Objectif:** Comparer les colonnes des deux tables pour identifier les similitudes et différences

---

## 📋 TABLE `piliers_mentors` (13 colonnes)

| # | Colonne | Type | Nullable | Default | Description |
|---|---------|------|----------|---------|-------------|
| 1 | `id` | `uuid` | NOT NULL | `uuid_generate_v4()` | Identifiant unique (PK) |
| 2 | `famille_id` | `uuid` | NOT NULL | - | Référence à `familles_disciples.id` |
| 3 | `mentor_id` | `uuid` | NOT NULL | - | Référence à `profils.id` |
| 4 | `nom` | `text` | NULL | - | Nom du pilier |
| 5 | `prenom` | `text` | NULL | - | Prénom du pilier |
| 6 | `eglise` | `text` | NULL | - | Église du pilier |
| 7 | `nombre_disciples` | `integer` | NULL | `0` | Nombre total de disciples |
| 8 | `avancement_pourcentage` | `numeric(5, 2)` | NULL | `0` | Pourcentage d'avancement (0-100) |
| 9 | `nombre_disciples_presents` | `integer` | NULL | `0` | Nombre de disciples présents |
| 10 | `taux_participation_semaine` | `numeric(5, 2)` | NULL | `0` | Taux de participation hebdomadaire (%) |
| 11 | `observations` | `text` | NULL | - | Observations/notes |
| 12 | `created_at` | `timestamp` | NOT NULL | `now()` | Date de création |
| 13 | `updated_at` | `timestamp` | NOT NULL | `now()` | Date de mise à jour |

---

## 📋 TABLE `profils` (16 colonnes)

| # | Colonne | Type | Nullable | Default | Description |
|---|---------|------|----------|---------|-------------|
| 1 | `id` | `uuid` | NOT NULL | - | Identifiant unique (PK) |
| 2 | `first_name` | `text` | NULL | - | Prénom |
| 3 | `last_name` | `text` | NULL | - | Nom |
| 4 | `email` | `text` | NULL | - | Email |
| 5 | `avatar_url` | `text` | NULL | - | URL de l'avatar |
| 6 | `spiritual_stage` | `text` | NULL | - | Niveau spirituel |
| 7 | `created_at` | `timestamp` | NOT NULL | `now()` | Date de création |
| 8 | `updated_at` | `timestamp` | NOT NULL | `now()` | Date de mise à jour |
| 9 | `role` | `text` | NULL | - | Rôle (disciple, superviseur, pasteur, etc.) |
| 10 | `is_approved_as_disciple_maker` | `boolean` | NULL | - | Approuvé comme faiseur de disciples |
| 11 | `famille_id` | `uuid` | NULL | - | Référence à `familles_disciples.id` |
| 12 | `identifiant_disciple` | `text` | NULL | - | Identifiant du disciple |
| 13 | `superviseur_id` | `uuid` | NULL | - | Référence au superviseur |
| 14 | `mentor_id` | `uuid` | NULL | - | Référence au mentor |
| 15 | `identifiant_unique` | `text` | NULL | - | Identifiant unique |
| 16 | `pasteur_id` | `uuid` | NULL | - | Référence au pasteur |

---

## 🔍 ANALYSE COMPARATIVE

### ✅ Colonnes similaires (conceptuellement)

| `piliers_mentors` | `profils` | Relation |
|-------------------|-----------|----------|
| `id` | `id` | **Différent** : IDs différents (pas de relation directe) |
| `famille_id` | `famille_id` | **Similaire** : Même référence à `familles_disciples.id` |
| `mentor_id` | `id` | **Relation FK** : `piliers_mentors.mentor_id` → `profils.id` |
| `nom` | `last_name` | **Similaire** : Nom de famille |
| `prenom` | `first_name` | **Similaire** : Prénom |
| `created_at` | `created_at` | **Identique** : Date de création |
| `updated_at` | `updated_at` | **Identique** : Date de mise à jour |

### ❌ Colonnes uniques à `piliers_mentors`

| Colonne | Description |
|---------|-------------|
| `eglise` | Église du pilier |
| `nombre_disciples` | Nombre total de disciples |
| `avancement_pourcentage` | Pourcentage d'avancement (0-100) |
| `nombre_disciples_presents` | Nombre de disciples présents |
| `taux_participation_semaine` | Taux de participation hebdomadaire (%) |
| `observations` | Observations/notes |

### ❌ Colonnes uniques à `profils`

| Colonne | Description |
|---------|-------------|
| `email` | Email de l'utilisateur |
| `avatar_url` | URL de l'avatar |
| `spiritual_stage` | Niveau spirituel |
| `role` | Rôle (disciple, superviseur, pasteur, etc.) |
| `is_approved_as_disciple_maker` | Approuvé comme faiseur de disciples |
| `identifiant_disciple` | Identifiant du disciple |
| `superviseur_id` | Référence au superviseur |
| `mentor_id` | Référence au mentor |
| `identifiant_unique` | Identifiant unique |
| `pasteur_id` | Référence au pasteur |

---

## 🔗 RELATIONS ENTRE LES TABLES

### Relation principale :
```
piliers_mentors.mentor_id → profils.id
```

**Signification :**
- Chaque entrée dans `piliers_mentors` est liée à un profil dans `profils`
- Le profil référencé devrait avoir `role = 'Mentor_pillier'` (ou similaire)
- Un profil peut être référencé plusieurs fois (si associé à plusieurs familles)

### Relation secondaire :
```
piliers_mentors.famille_id → familles_disciples.id
profils.famille_id → familles_disciples.id
```

**Signification :**
- Les deux tables peuvent être liées à la même famille
- `piliers_mentors` : association pilier-famille avec statistiques
- `profils` : appartenance du profil à une famille

---

## 📊 DONNÉES DUPLIQUÉES

### ⚠️ Données potentiellement redondantes :

1. **Nom et Prénom :**
   - `piliers_mentors.nom` / `piliers_mentors.prenom`
   - `profils.last_name` / `profils.first_name`
   - **Note :** Les données dans `piliers_mentors` peuvent être obsolètes si le profil est mis à jour

2. **Famille :**
   - `piliers_mentors.famille_id`
   - `profils.famille_id`
   - **Note :** Peuvent pointer vers la même famille ou des familles différentes

---

## 💡 RECOMMANDATIONS

### 1. **Synchronisation des données**

**Problème potentiel :**
- Si `profils.first_name` ou `profils.last_name` change, `piliers_mentors.nom` et `piliers_mentors.prenom` peuvent devenir obsolètes

**Solution recommandée :**
- Utiliser une vue ou une fonction pour récupérer les données à jour depuis `profils`
- Ou créer un trigger pour synchroniser automatiquement

### 2. **Cohérence des données**

**Vérification recommandée :**
```sql
-- Vérifier que tous les mentor_id dans piliers_mentors existent dans profils
SELECT pm.*
FROM piliers_mentors pm
LEFT JOIN profils p ON p.id = pm.mentor_id
WHERE p.id IS NULL;

-- Vérifier que les noms/prénoms sont synchronisés
SELECT 
    pm.id,
    pm.nom AS nom_piliers,
    pm.prenom AS prenom_piliers,
    p.last_name AS nom_profils,
    p.first_name AS prenom_profils
FROM piliers_mentors pm
INNER JOIN profils p ON p.id = pm.mentor_id
WHERE pm.nom != p.last_name OR pm.prenom != p.first_name;
```

### 3. **Utilisation recommandée**

**`piliers_mentors` :**
- Utiliser pour les **statistiques spécifiques** aux piliers (nombre de disciples, avancement, participation)
- Utiliser pour les **associations pilier-famille** avec métadonnées

**`profils` :**
- Utiliser pour les **données de base** du profil (nom, prénom, email, avatar, rôle)
- Utiliser pour les **relations hiérarchiques** (superviseur, mentor, pasteur)

---

## 📈 RÉSUMÉ

| Aspect | `piliers_mentors` | `profils` |
|--------|-------------------|-----------|
| **Nombre de colonnes** | 13 | 16 |
| **Colonnes communes** | 7 (id, famille_id, nom/prenom, created_at, updated_at) | 7 |
| **Colonnes uniques** | 6 (statistiques et métadonnées) | 9 (données utilisateur et relations) |
| **Relation** | `mentor_id` → `profils.id` | Référencé par `piliers_mentors` |
| **Usage principal** | Statistiques et métadonnées pilier-famille | Données de base du profil utilisateur |

---

**Documentation générée le:** 2025-01-XX
