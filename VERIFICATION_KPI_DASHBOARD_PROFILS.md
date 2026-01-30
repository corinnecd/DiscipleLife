# Vérification : les KPI du dashboard utilisent-ils bien les données des profils ?

**Date :** 30 janvier 2026  
**Objectif :** Vérifier précisément si les KPI affichés sur les pages dashboard (Pasteur, Superviseur) récupèrent les données depuis **profils** et non depuis **cercle_personnes**.

---

## 1. Résumé

| Page / section | Source actuelle des KPI | Condition pour 100 % profils |
|----------------|-------------------------|-----------------------------|
| **Dashboard Pasteur** (KPI familles, progression, disciples par pasteur, tableau mentors) | **Profils** | Migration **096** exécutée en base |
| **Dashboard Superviseur** (Liste des familles, Membres X/70, Progression, rapports, tableau mentors) | **Profils + cercles** | Migrations **096** et **098** exécutées |

- **096** : RPC Pasteur et effectifs familles = 100 % profils (déjà dans le fichier SQL).
- **098** : RPC Dashboard Superviseur = 100 % profils (fichier créé ci‑dessous ; à exécuter en base).

Sans exécuter **096** et **098** en base, les KPI Pasteur peuvent encore venir des anciennes RPC (cercles), et les KPI Superviseur viennent encore en partie de **cercle_personnes**.

---

## 2. Dashboard Pasteur (KPI des familles, progression, disciples par pasteur)

### RPC appelées par le frontend (`PasteurDashboard.jsx`)

| RPC | Fichier SQL qui définit la version « 100 % profils » | Utilise encore cercle_personnes ? |
|-----|------------------------------------------------------|-----------------------------------|
| `get_kpi_familles_pour_pasteur` | **096** | Non (096) |
| `get_progression_par_famille_pasteur` | **096** | Non (096) |
| `get_kpi_disciples_par_pasteur` | **096** | Non (096) |
| `get_nombre_profils_par_familles` | **096** | Non (096) |
| `get_mentors_avec_disciples_pour_pasteur` | **096** | Non (096) |

- Les **chiffres** affichés (Superviseurs, Familles, Disciples 641, Progression 76 %, Total Disciples par pasteur, barres de progression par famille, tableau « Mes Superviseurs et Familles ») viennent de ces RPC.
- **Conclusion :** dès que la migration **096** est exécutée en base, tous ces KPI Pasteur sont bien calculés **uniquement à partir de profils**.

---

## 3. Dashboard Superviseur (Liste des familles, Membres X/70, Progression)

### RPC appelées (`SuperviseurDashboard.jsx`)

| RPC | Fichier actuel | Utilise encore cercle_personnes ? |
|-----|----------------|-----------------------------------|
| `get_superviseur_dashboard_phase2` | **094** | **Oui** : membres (profils + cercle), nb disciples par membre (cercle), suivi_par (cercle) |
| `get_superviseur_dashboard_phase2_extra` | **095** | **Oui** : nombre_membres_par_superviseur = profils + cercle_personnes |

Détail dans le code actuel :

- **094**  
  - « Membres » = profils (famille_id) **UNION** cercle_personnes (user_id).  
  - « Nombre de disciples par membre » = COUNT sur **cercle_personnes** (user_id = membre).  
  - « Suivi par » = résolution via **cercle_personnes** (user_id, parent_disciple_id) + profils.

- **095**  
  - « Nombre de membres par superviseur » = COUNT(profils par famille) **+** COUNT(**cercle_personnes** par user_id).

Donc aujourd’hui, les KPI Superviseur (liste des familles, **Membres X/70**, **Progression**, etc.) **ne sont pas** à 100 % issus de profils tant que 094/095 ne sont pas remplacées.

---

## 4. Ce qui a été fait pour que tout vienne des profils

1. **Migration 096** (`sql/migrations/096_rpc_effectifs_100_profils_sans_cercle.sql`)  
   - Remplace les RPC Pasteur et effectifs par des versions qui ne lisent **que** `profils`.  
   - À exécuter dans Supabase si ce n’est pas déjà fait.

2. **Migration 098** (nouveau fichier)  
   - Remplace `get_superviseur_dashboard_phase2` et `get_superviseur_dashboard_phase2_extra` par des versions **100 % profils** :  
     - Membres = uniquement profils (famille_id).  
     - Nombre de disciples par membre = COUNT(profils WHERE mentor_id = membre).  
     - Suivi par = résolution via profils (mentor_id).  
     - Nombre de membres par superviseur = uniquement COUNT(profils) par famille.  
   - À exécuter en base après 096.

---

## 5. Actions à faire de votre côté

1. **Exécuter la migration 096** dans le projet Supabase (SQL Editor) si ce n’est pas déjà fait → tous les KPI **Pasteur** seront bien issus des **profils**.
2. **Exécuter la migration 098** (fichier fourni ci‑dessous) dans le même projet → tous les KPI **Superviseur** seront aussi issus des **profils** uniquement.

Après exécution de 096 et 098, vous pouvez considérer que **les KPI des pages dashboard récupèrent bien les données des profils** (plus de lecture cercle_personnes pour ces indicateurs).
