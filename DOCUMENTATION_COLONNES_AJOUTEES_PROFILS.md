# 📋 DOCUMENTATION : Colonnes ajoutées à la table `profils`

**Date:** 2025-01-XX  
**Migration:** `082_add_piliers_mentors_columns_to_profils.sql`

---

## ✅ COLONNES AJOUTÉES (6 colonnes)

### 1. `eglise`
- **Type:** `text`
- **Nullable:** `NULL`
- **Default:** `NULL`
- **Description:** Église du mentor
- **Usage:** Stocker l'église d'appartenance du mentor

---

### 2. `nombre_disciples`
- **Type:** `integer`
- **Nullable:** `NULL`
- **Default:** `0`
- **Description:** Nombre total de disciples
- **Note:** Formation PCNC déjà réalisées : (, OO1, 101, 201, RTT, IEBI, PILLIERS)
- **Usage:** Compter le nombre total de disciples sous la responsabilité du mentor

---

### 3. `avancement_pourcentage`
- **Type:** `numeric(5, 2)`
- **Nullable:** `NULL`
- **Default:** `0`
- **Description:** Pourcentage d'avancement (0-100)
- **Usage:** Suivre le pourcentage d'avancement vers l'objectif (ex: 70 disciples)

---

### 4. `nombre_disciples_presents`
- **Type:** `integer`
- **Nullable:** `NULL`
- **Default:** `0`
- **Description:** Nombre de disciples présents
- **Usage:** Compter les disciples présents lors des réunions/activités

---

### 5. `taux_participation_semaine`
- **Type:** `numeric(5, 2)`
- **Nullable:** `NULL`
- **Default:** `0`
- **Description:** Taux de participation hebdomadaire (%)
- **Usage:** Calculer le pourcentage de participation des disciples sur une semaine

---

### 6. `observations`
- **Type:** `text`
- **Nullable:** `NULL`
- **Default:** `NULL`
- **Description:** Observations/notes
- **Usage:** Stocker des notes et observations sur le mentor et ses disciples

---

## 📊 STRUCTURE FINALE DE LA TABLE `profils`

Après cette migration, la table `profils` contiendra **22 colonnes** (16 existantes + 6 nouvelles) :

### Colonnes existantes (16) :
1. `id`
2. `first_name`
3. `last_name`
4. `email`
5. `avatar_url`
6. `spiritual_stage`
7. `created_at`
8. `updated_at`
9. `role`
10. `is_approved_as_disciple_maker`
11. `famille_id`
12. `identifiant_disciple`
13. `superviseur_id`
14. `mentor_id`
15. `identifiant_unique`
16. `pasteur_id`

### Nouvelles colonnes (7) :
17. `eglise`
18. `nombre_disciples`
19. `avancement_pourcentage`
20. `nombre_disciples_presents`
21. `taux_participation_semaine`
22. `observations`
23. `formations_pcnc_realisees` - Formations PCNC réalisées

---

## 🔄 IMPACT SUR `piliers_mentors`

### Avant cette migration :
- Les statistiques étaient stockées uniquement dans `piliers_mentors`
- Nécessité de joindre les deux tables pour avoir les statistiques complètes

### Après cette migration :
- Les statistiques sont également disponibles directement dans `profils`
- Possibilité de synchroniser les données entre les deux tables
- `piliers_mentors` peut continuer à exister pour les associations pilier-famille spécifiques

---

## 💡 RECOMMANDATIONS

### 1. Synchronisation des données

**Option A : Synchroniser depuis `piliers_mentors` vers `profils`**
```sql
UPDATE profils p
SET 
    eglise = pm.eglise,
    nombre_disciples = pm.nombre_disciples,
    avancement_pourcentage = pm.avancement_pourcentage,
    nombre_disciples_presents = pm.nombre_disciples_presents,
    taux_participation_semaine = pm.taux_participation_semaine,
    observations = pm.observations,
    updated_at = NOW()
FROM piliers_mentors pm
WHERE p.id = pm.mentor_id;
```

**Option B : Créer un trigger pour synchroniser automatiquement**
- Quand `piliers_mentors` est mis à jour, mettre à jour `profils` automatiquement

### 2. Migration des données existantes

Si des données existent dans `piliers_mentors`, les migrer vers `profils` :
```sql
-- Voir le script de synchronisation ci-dessus
```

### 3. Cohérence future

**Décision à prendre :**
- **Option 1 :** `profils` devient la source de vérité (mettre à jour `piliers_mentors` depuis `profils`)
- **Option 2 :** `piliers_mentors` reste la source de vérité (mettre à jour `profils` depuis `piliers_mentors`)
- **Option 3 :** Les deux tables sont synchronisées bidirectionnellement (via triggers)

---

## ⚠️ NOTES IMPORTANTES

1. **Valeurs par défaut :**
   - `nombre_disciples`, `avancement_pourcentage`, `nombre_disciples_presents`, `taux_participation_semaine` ont une valeur par défaut de `0`
   - `eglise` et `observations` sont `NULL` par défaut

2. **Compatibilité :**
   - Les colonnes sont `NULL`, donc compatibles avec les données existantes
   - Aucune donnée existante ne sera affectée

3. **Performance :**
   - Les nouvelles colonnes n'ont pas d'index par défaut
   - Considérer d'ajouter des index si nécessaire pour les requêtes fréquentes

---

**Documentation générée le:** 2025-01-XX
