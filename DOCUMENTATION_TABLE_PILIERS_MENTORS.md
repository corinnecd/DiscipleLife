# 📋 DOCUMENTATION : Table `piliers_mentors`

**Date:** 2025-01-XX  
**Description:** Table pour gérer les piliers (mentors) associés aux familles de disciples

---

## 📊 COLONNES DE LA TABLE

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| `id` | `uuid` | NOT NULL | `uuid_generate_v4()` | Identifiant unique (clé primaire) |
| `famille_id` | `uuid` | NOT NULL | - | Référence à la famille (`familles_disciples.id`) |
| `mentor_id` | `uuid` | NOT NULL | - | Référence au profil mentor (`profils.id`) |
| `nom` | `text` | NULL | - | Nom du pilier |
| `prenom` | `text` | NULL | - | Prénom du pilier |
| `eglise` | `text` | NULL | - | Église du pilier |
| `nombre_disciples` | `integer` | NULL | `0` | Nombre total de disciples |
| `avancement_pourcentage` | `numeric(5, 2)` | NULL | `0` | Pourcentage d'avancement (0-100) |
| `nombre_disciples_presents` | `integer` | NULL | `0` | Nombre de disciples présents |
| `taux_participation_semaine` | `numeric(5, 2)` | NULL | `0` | Taux de participation hebdomadaire (%) |
| `observations` | `text` | NULL | - | Observations/notes |
| `created_at` | `timestamp without time zone` | NOT NULL | `now()` | Date de création |
| `updated_at` | `timestamp without time zone` | NOT NULL | `now()` | Date de mise à jour |

---

## 🔑 CONTRAINTES

### Clé primaire
- **PK:** `piliers_mentors_pkey` sur `id`

### Clé unique
- **UK:** `piliers_mentors_famille_id_pilier_id_key` sur (`famille_id`, `pilier_id`)
  - Garantit qu'un pilier ne peut être associé qu'une seule fois à une famille

### Clés étrangères
- **FK:** `piliers_mentors_famille_id_fkey`
  - `famille_id` → `familles_disciples.id`
  - `ON DELETE CASCADE`
  
- **FK:** `piliers_mentors_mentor_id_fkey`
  - `mentor_id` → `profils.id`
  - `ON DELETE CASCADE`

---

## 📇 INDEX

1. **`idx_piliers_mentors_famille_id`**
   - Colonne: `famille_id`
   - Type: B-tree

2. **`idx_piliers_mentors_mentor_id`**
   - Colonne: `mentor_id`
   - Type: B-tree

3. **`idx_piliers_mentors_nombre_disciples`**
   - Colonne: `nombre_disciples`
   - Type: B-tree (DESC)
   - Pour trier par nombre de disciples décroissant

4. **`idx_piliers_mentors_avancement`**
   - Colonne: `avancement_pourcentage`
   - Type: B-tree (DESC)
   - Pour trier par avancement décroissant

---

## 🔄 TRIGGERS

### `update_piliers_mentors_updated_at`
- **Type:** BEFORE UPDATE
- **Fonction:** `update_updated_at_column()`
- **Action:** Met à jour automatiquement `updated_at` avant chaque modification

---

## 📝 NOTES IMPORTANTES

1. **Relation avec `profils`:**
   - `mentor_id` référence `profils.id`
   - Les profils avec `role = 'Mentor_pillier'` devraient être dans cette table

2. **Relation avec `familles_disciples`:**
   - `famille_id` référence `familles_disciples.id`
   - Un pilier peut être associé à une famille

3. **Contrainte unique:**
   - Un pilier ne peut être associé qu'une seule fois à une famille donnée
   - Mais un pilier peut être associé à plusieurs familles différentes

4. **Cascade delete:**
   - Si une famille est supprimée, les entrées associées sont supprimées
   - Si un profil est supprimé, les entrées associées sont supprimées

---

## 🔍 REQUÊTES UTILES

### Lister tous les piliers avec leurs familles
```sql
SELECT 
    pm.id,
    pm.nom,
    pm.prenom,
    pm.eglise,
    pm.nombre_disciples,
    pm.avancement_pourcentage,
    f.identifiant_famille,
    f.nom AS nom_famille,
    p.first_name,
    p.last_name,
    p.email
FROM piliers_mentors pm
INNER JOIN familles_disciples f ON f.id = pm.famille_id
INNER JOIN profils p ON p.id = pm.mentor_id
ORDER BY pm.nombre_disciples DESC;
```

### Compter les piliers par famille
```sql
SELECT 
    f.identifiant_famille,
    f.nom AS nom_famille,
    COUNT(pm.id) AS nombre_piliers,
    SUM(pm.nombre_disciples) AS total_disciples
FROM familles_disciples f
LEFT JOIN piliers_mentors pm ON pm.famille_id = f.id
GROUP BY f.id, f.identifiant_famille, f.nom
ORDER BY nombre_piliers DESC;
```

### Piliers avec le meilleur avancement
```sql
SELECT 
    pm.nom,
    pm.prenom,
    pm.avancement_pourcentage,
    pm.nombre_disciples,
    f.identifiant_famille,
    f.nom AS nom_famille
FROM piliers_mentors pm
INNER JOIN familles_disciples f ON f.id = pm.famille_id
ORDER BY pm.avancement_pourcentage DESC
LIMIT 10;
```

---

**Documentation générée le:** 2025-01-XX
