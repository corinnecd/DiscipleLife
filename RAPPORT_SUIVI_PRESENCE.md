# 📋 RAPPORT DÉTAILLÉ - PAGE SUIVI DE PRÉSENCE

**Date :** 17 janvier 2025  
**Page analysée :** `src/pages/AttendanceTracking.jsx`

---

## 🔍 ÉTAT ACTUEL DE LA PAGE

### Activités actuellement disponibles dans AttendanceTracking.jsx

1. **Culte Dimanche Matin** (`sunday_worship`)
   - Type : `sunday_worship`
   - Statut : ✅ Présent dans la page
   - Fonctionnalités : Enregistrement présence/absence, nom d'église

2. **Partage Dimanche (21H)** (`sunday_sharing`)
   - Type : `sunday_sharing`
   - Statut : ✅ Présent dans la page
   - Fonctionnalités : Enregistrement présence/absence, motif d'absence

3. **Prière Samedi (22H)** (`saturday_prayer`)
   - Type : `saturday_prayer`
   - Statut : ✅ Présent dans la page
   - Fonctionnalités : Enregistrement présence/absence, motif d'absence

---

## ❌ ACTIVITÉS MANQUANTES

### Comparaison avec SendReport.jsx

Dans la page `SendReport.jsx`, les activités suivantes sont suivies dans les rapports :

1. ✅ **Présence Culte Dimanche matin** (`sundayAttendanceCount`) → `sunday_worship`
2. ❌ **Présence Culte du samedi soir** (`saturdayEveningCount`) → **MANQUANT**
   - Actuellement mappé à `saturday_prayer` dans SendReport (provisoire)
   - Devrait être un type distinct : `saturday_evening_worship`
3. ❌ **Présence à l'After Culte** (`afterCulteCount`) → **MANQUANT**
   - Actuellement mappé à `sunday_sharing` dans SendReport (provisoire)
   - Devrait être un type distinct : `after_culte` ou `sunday_after_culte`
4. ✅ **Présences au Partage** (`sundaySharingCount`) → `sunday_sharing`
5. ✅ **Présences à la Prière** (`saturdayPrayerCount`) → `saturday_prayer`

---

## 📊 ACTIVITÉS DANS SENDREPORT QUI NE SONT PAS DE PRÉSENCE

Les activités suivantes dans SendReport sont des **statistiques/métriques** et non des activités de présence physique :

- Personnes Évangélisées
- Nouveaux Convertis
- Nouveaux Arrivants
- Sorties d'Évangélisation
- Vidéos Visionnées (modules)
- Taux de Complétion (%)
- Com Frat Disciples
- Veillée
- Méditation Bible

**Note :** Ces activités ne nécessitent pas de suivi de présence dans `AttendanceTracking.jsx` car elles sont des métriques/statistiques saisies manuellement.

---

## ✅ ACTIVITÉS À AJOUTER DANS ATTENDANCETRACKING.JSX

### 1. Culte du Samedi Soir
- **Type :** `saturday_evening_worship` (à créer)
- **Label :** "Culte du Samedi Soir"
- **Fonctionnalités :**
  - Enregistrement présence/absence
  - Nom de l'église visitée (si présent)
  - Motif d'absence (si absent)

### 2. After Culte du Dimanche
- **Type :** `after_culte` ou `sunday_after_culte` (à créer)
- **Label :** "After Culte du Dimanche"
- **Fonctionnalités :**
  - Enregistrement présence/absence
  - Motif d'absence (si absent)

---

## 🔧 ACTIONS À ENTREPRENDRE

### 1. Mise à jour de la base de données (si nécessaire)
- Vérifier si les types `saturday_evening_worship` et `after_culte` existent dans la table `attendance_tracking`
- Si non, créer une migration SQL pour ajouter le support de ces types
- Vérifier les contraintes de la colonne `attendance_type`

### 2. Mise à jour de AttendanceTracking.jsx
- Ajouter les deux nouveaux types dans la constante `TYPES`
- Ajouter deux nouveaux boutons dans la section de sélection d'activités
- Ajouter les cas dans la fonction `getTabTitle()`
- Mettre à jour la validation du formulaire si nécessaire

### 3. Mise à jour de SendReport.jsx
- Corriger le mapping des activités pour utiliser les nouveaux types :
  - `saturdayEveningCount` → `saturday_evening_worship` (au lieu de `saturday_prayer`)
  - `afterCulteCount` → `after_culte` ou `sunday_after_culte` (au lieu de `sunday_sharing`)

---

## 📝 RÉSUMÉ

**État actuel :** La page `AttendanceTracking.jsx` contient **3 activités** sur **5 activités de présence** mentionnées dans les rapports.

**Activités manquantes :**
1. ❌ Culte du Samedi Soir
2. ❌ After Culte du Dimanche

**Pourcentage de complétion :** 60% (3/5 activités)

---

**Prochaine étape :** Mettre à jour la page `AttendanceTracking.jsx` pour inclure toutes les activités de présence.
