# 📋 GUIDE DE SYNCHRONISATION : `piliers_mentors` → `profils`

**Date:** 2025-01-XX  
**Script:** `083_sync_piliers_mentors_to_profils.sql`

---

## 🎯 OBJECTIF

Synchroniser les données de la table `piliers_mentors` vers les nouvelles colonnes de la table `profils`.

---

## 📊 DONNÉES SYNCHRONISÉES

Les 6 colonnes suivantes seront copiées de `piliers_mentors` vers `profils` :

1. **`eglise`** - Église du mentor
2. **`nombre_disciples`** - Nombre total de disciples
3. **`avancement_pourcentage`** - Pourcentage d'avancement (0-100)
4. **`nombre_disciples_presents`** - Nombre de disciples présents
5. **`taux_participation_semaine`** - Taux de participation hebdomadaire (%)
6. **`observations`** - Observations/notes

---

## 🔄 LOGIQUE DE SYNCHRONISATION

### Règle de mise à jour :
- **Si `piliers_mentors` a une valeur :** Elle est copiée vers `profils`
- **Si `piliers_mentors` est NULL :** La valeur existante dans `profils` est conservée
- **Si `profils` est vide :** La valeur par défaut (0 pour les nombres) est utilisée

### Relation :
```
piliers_mentors.mentor_id → profils.id
```

Chaque entrée dans `piliers_mentors` met à jour le profil correspondant dans `profils`.

---

## 📝 INSTRUCTIONS D'EXÉCUTION

### Étape 1 : Vérifier les données dans `piliers_mentors`

Avant de synchroniser, vérifiez qu'il y a des données à synchroniser :

```sql
SELECT COUNT(*) FROM piliers_mentors;
```

### Étape 2 : Exécuter le script de synchronisation

1. **Ouvrez Supabase Dashboard → SQL Editor**
2. **Créez une nouvelle requête**
3. **Copiez-collez le contenu de :** `sql/migrations/083_sync_piliers_mentors_to_profils.sql`
4. **Exécutez le script** (Run ou Ctrl+Enter)

### Étape 3 : Vérifier les résultats

Le script affichera :
- Le nombre de profils mis à jour
- Les statistiques après synchronisation
- Une comparaison entre `piliers_mentors` et `profils`

---

## ⚠️ PRÉCAUTIONS

### 1. **Backup recommandé**
- Créez un backup de la table `profils` avant d'exécuter
- Le script utilise `COALESCE` pour ne pas écraser les données existantes

### 2. **Données existantes**
- Si `profils` a déjà des données dans ces colonnes, elles seront **conservées** si `piliers_mentors` est NULL
- Si `piliers_mentors` a des données, elles **remplaceront** celles de `profils`

### 3. **Profils non trouvés**
- Si un `mentor_id` dans `piliers_mentors` n'existe pas dans `profils`, il sera ignoré
- Un message NOTICE sera affiché pour chaque profil non trouvé

---

## 🔍 VÉRIFICATIONS APRÈS SYNCHRONISATION

### Vérification 1 : Nombre de profils mis à jour
```sql
SELECT 
    COUNT(*) AS total_profils,
    COUNT(*) FILTER (WHERE eglise IS NOT NULL) AS avec_eglise,
    COUNT(*) FILTER (WHERE nombre_disciples > 0) AS avec_nombre_disciples,
    COUNT(*) FILTER (WHERE avancement_pourcentage > 0) AS avec_avancement
FROM profils;
```

### Vérification 2 : Comparaison piliers_mentors vs profils
```sql
SELECT 
    pm.mentor_id,
    pm.nombre_disciples AS nombre_piliers,
    p.nombre_disciples AS nombre_profils,
    CASE 
        WHEN pm.nombre_disciples = p.nombre_disciples THEN '✅ OK'
        ELSE '⚠️ Différence'
    END AS statut
FROM piliers_mentors pm
INNER JOIN profils p ON p.id = pm.mentor_id;
```

---

## 📊 RÉSULTAT ATTENDU

Après synchronisation :
- ✅ Les profils référencés dans `piliers_mentors` auront leurs données mises à jour
- ✅ Les statistiques (nombre_disciples, avancement, etc.) seront copiées
- ✅ Les métadonnées (eglise, observations) seront copiées

---

## 🔄 SYNCHRONISATION FUTURE

### Option 1 : Synchronisation manuelle
- Exécuter le script de synchronisation périodiquement
- Avantage : Contrôle total
- Inconvénient : Nécessite une action manuelle

### Option 2 : Trigger automatique
- Créer un trigger qui synchronise automatiquement quand `piliers_mentors` est mis à jour
- Avantage : Synchronisation automatique
- Inconvénient : Peut ralentir les mises à jour

### Option 3 : Vue ou fonction
- Créer une vue qui joint les deux tables
- Avantage : Données toujours à jour
- Inconvénient : Nécessite de modifier les requêtes existantes

---

## 💡 RECOMMANDATION

**Pour l'instant :** Utiliser la synchronisation manuelle (script SQL)

**Pour l'avenir :** Considérer un trigger automatique si les données changent fréquemment

---

**Documentation générée le:** 2025-01-XX
